import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { PolyApi } from '../api';
import { useAuth } from '../../context/AuthContext.jsx';
import { useTranslation } from 'react-i18next';
import EditorActionBar from '../components/EditorActionBar.jsx';
import './PolygraphyPages.css';

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function applyPixelFilters(imageData, { brightness = 0, contrast = 0, saturation = 0, grayscale = false, sepia = false }) {
  const data = imageData.data;
  const b = clamp(Number(brightness) || 0, -100, 100) * 2.55;
  const c = clamp(Number(contrast) || 0, -100, 100);
  const cf = (259 * (c * 2.55 + 255)) / (255 * (259 - (c * 2.55)));
  const sat = clamp(Number(saturation) || 0, -100, 100) / 100;

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let bl = data[i + 2];

    r = clamp(cf * (r - 128) + 128, 0, 255);
    g = clamp(cf * (g - 128) + 128, 0, 255);
    bl = clamp(cf * (bl - 128) + 128, 0, 255);

    r = clamp(r + b, 0, 255);
    g = clamp(g + b, 0, 255);
    bl = clamp(bl + b, 0, 255);

    if (sat !== 0) {
      const gray = 0.2989 * r + 0.587 * g + 0.114 * bl;
      const k = 1 + sat;
      r = clamp(gray + (r - gray) * k, 0, 255);
      g = clamp(gray + (g - gray) * k, 0, 255);
      bl = clamp(gray + (bl - gray) * k, 0, 255);
    }

    if (sepia) {
      const nr = clamp(0.393 * r + 0.769 * g + 0.189 * bl, 0, 255);
      const ng = clamp(0.349 * r + 0.686 * g + 0.168 * bl, 0, 255);
      const nb = clamp(0.272 * r + 0.534 * g + 0.131 * bl, 0, 255);
      r = nr; g = ng; bl = nb;
    }

    if (grayscale) {
      const avg = (r + g + bl) / 3;
      r = g = bl = avg;
    }

    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = bl;
  }
  return imageData;
}

const isImageFile = (f) => {
  const name = String(f?.name || '').toLowerCase();
  return /\.(png|jpg|jpeg|webp|gif|bmp|tif|tiff|svg)$/i.test(name);
};

const downloadBlob = (blob, name) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

export default function ImageEditorPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { i18n } = useTranslation();
  const isRu = (i18n.language || 'ru').toLowerCase().startsWith('ru');

  const inputRef = useRef(null);
  const canvasRef = useRef(null);
  const originalImgRef = useRef(null);

  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [imgReady, setImgReady] = useState(false);

  const [rotate, setRotate] = useState(0);
  const [flipX, setFlipX] = useState(false);
  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(0);
  const [saturation, setSaturation] = useState(0);
  const [grayscale, setGrayscale] = useState(false);
  const [sepia, setSepia] = useState(false);
  const [overlayText, setOverlayText] = useState('');
  const [exportType, setExportType] = useState('png');
  const [exportQuality, setExportQuality] = useState(92);
  const [activeTool, setActiveTool] = useState('adjust'); 
  const [cropRect, setCropRect] = useState(null); 
  const [dragging, setDragging] = useState(false);
  const [resizeW, setResizeW] = useState('');
  const [resizeH, setResizeH] = useState('');
  const [keepAspect, setKeepAspect] = useState(true);
  const [history, setHistory] = useState([]); 
  const [historyIdx, setHistoryIdx] = useState(-1);

  const resetEdits = () => {
    setError('');
    setBusy(false);
    setRotate(0);
    setFlipX(false);
    setBrightness(0);
    setContrast(0);
    setSaturation(0);
    setGrayscale(false);
    setSepia(false);
    setOverlayText('');
    setExportType('png');
    setExportQuality(92);
    setActiveTool('adjust');
    setCropRect(null);
    setDragging(false);
    setResizeW('');
    setResizeH('');
    setKeepAspect(true);
  };

  const resetAll = () => {
    resetEdits();
    setImgReady(false);
    setFile(null);
    if (inputRef.current) inputRef.current.value = '';
    if (originalImgRef.current?.src?.startsWith('blob:')) {
      URL.revokeObjectURL(originalImgRef.current.src);
    }
    originalImgRef.current = null;
    setHistory([]);
    setHistoryIdx(-1);
  };

  const loadFile = async (f) => {
    resetAll();
    if (!f) return;
    if (!isImageFile(f)) {
      setError('Выбери изображение: JPG/PNG/WebP и т.д.');
      return;
    }
    const maxBytes = 16 * 1024 * 1024;
    if (f.size > maxBytes) {
      setError('Файл слишком большой для редактора (лимит 16MB).');
      return;
    }

    try {
      const url = URL.createObjectURL(f);
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = url;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = () => reject(new Error('Не удалось открыть изображение'));
      });
      originalImgRef.current = img;
      setFile(f);
      setImgReady(true);
      setResizeW(String(img.naturalWidth || img.width || ''));
      setResizeH(String(img.naturalHeight || img.height || ''));

      setHistory([f]);
      setHistoryIdx(0);
    } catch (e) {
      setError(e?.message || 'Не удалось открыть файл');
    }
  };

  const loadFromHistory = async (f) => {
    if (!f) return;
    setError('');
    try {
      const url = URL.createObjectURL(f);
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = url;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = () => reject(new Error('Не удалось открыть изображение'));
      });
      if (originalImgRef.current?.src?.startsWith('blob:')) {
        URL.revokeObjectURL(originalImgRef.current.src);
      }
      originalImgRef.current = img;
      setFile(f);
      setImgReady(true);
      setResizeW(String(img.naturalWidth || img.width || ''));
      setResizeH(String(img.naturalHeight || img.height || ''));
    } catch (e) {
      setError(e?.message || 'Не удалось открыть файл');
    }
  };

  const pushHistory = (f) => {
    setHistory((prev) => {
      const base = prev.slice(0, historyIdx + 1);
      const next = base.concat([f]).slice(-10);
      return next;
    });
    setHistoryIdx((prev) => Math.min(9, prev + 1));
  };

  const canUndo = historyIdx > 0;
  const canRedo = historyIdx >= 0 && historyIdx < history.length - 1;

  const undo = async () => {
    if (!canUndo) return;
    const nextIdx = historyIdx - 1;
    setHistoryIdx(nextIdx);
    await loadFromHistory(history[nextIdx]);
    toast.success('Undo');
  };

  const redo = async () => {
    if (!canRedo) return;
    const nextIdx = historyIdx + 1;
    setHistoryIdx(nextIdx);
    await loadFromHistory(history[nextIdx]);
    toast.success('Redo');
  };

  const draw = () => {
    const canvas = canvasRef.current;
    const img = originalImgRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rot = ((rotate % 360) + 360) % 360;
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    const swap = rot === 90 || rot === 270;
    const cw = swap ? h : w;
    const ch = swap ? w : h;

    canvas.width = cw;
    canvas.height = ch;

    ctx.clearRect(0, 0, cw, ch);
    ctx.save();
    ctx.translate(cw / 2, ch / 2);
    ctx.rotate((rot * Math.PI) / 180);
    ctx.scale(flipX ? -1 : 1, 1);
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
    ctx.restore();

    try {
      const imageData = ctx.getImageData(0, 0, cw, ch);
      const filtered = applyPixelFilters(imageData, { brightness, contrast, saturation, grayscale, sepia });
      ctx.putImageData(filtered, 0, 0);

      if (overlayText.trim()) {
        const fontSize = Math.max(20, Math.round(Math.min(cw, ch) * 0.045));
        ctx.font = `700 ${fontSize}px Inter, Arial, sans-serif`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'bottom';
        const pad = Math.max(16, Math.round(fontSize * 0.6));
        const metrics = ctx.measureText(overlayText.trim());
        const boxWidth = Math.min(cw - pad * 2, Math.ceil(metrics.width) + pad * 1.4);
        const boxHeight = Math.ceil(fontSize * 1.7);
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.fillRect(pad * 0.6, ch - boxHeight - pad * 0.6, boxWidth, boxHeight);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(overlayText.trim(), pad, ch - pad);
      }
    } catch {
    }
  };

  useEffect(() => {
    if (!file || !imgReady) return;
    draw();
  }, [file?.name, imgReady, rotate, flipX, brightness, contrast, saturation, grayscale, sepia, overlayText]);

  const buildOutputFile = async () => {
    const canvas = canvasRef.current;
    if (!canvas) throw new Error('Canvas не готов');
    const format = exportType === 'jpg' ? 'jpeg' : exportType;
    const mime = `image/${format}`;
    const quality = clamp(Number(exportQuality) || 92, 30, 100) / 100;
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, mime, quality));
    if (!blob) throw new Error('Не удалось сохранить изображение');

    const base = String(file?.name || 'image').replace(/\.[^.]+$/, '').trim();
    const outExt = exportType === 'jpg' ? 'jpg' : exportType;
    const outName = `${base || 'image'}_edited.${outExt}`;
    return { blob, outName, file: new File([blob], outName, { type: mime }) };
  };

  const onDownload = async () => {
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      const { blob, outName } = await buildOutputFile();
      downloadBlob(blob, outName);
      toast.success('Скачано');
    } catch (e) {
      setError(e?.message || 'Ошибка');
    } finally {
      setBusy(false);
    }
  };

  const applyCrop = async () => {
    if (!file || !cropRect) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const x = Math.max(0, Math.min(canvas.width - 1, Math.round(cropRect.x)));
    const y = Math.max(0, Math.min(canvas.height - 1, Math.round(cropRect.y)));
    const w = Math.max(1, Math.min(canvas.width - x, Math.round(cropRect.w)));
    const h = Math.max(1, Math.min(canvas.height - y, Math.round(cropRect.h)));
    if (w < 8 || h < 8) {
      toast.error('Слишком маленькая область');
      return;
    }

    setBusy(true);
    setError('');
    try {
      const tmp = document.createElement('canvas');
      tmp.width = w;
      tmp.height = h;
      const tctx = tmp.getContext('2d');
      if (!tctx) throw new Error('Canvas недоступен');
      tctx.drawImage(canvas, x, y, w, h, 0, 0, w, h);
      const blob = await new Promise((resolve) => tmp.toBlob(resolve, 'image/png', 0.98));
      if (!blob) throw new Error('Не удалось применить crop');
      const outFile = new File([blob], `crop_${String(file.name || 'image').replace(/\.[^.]+$/, '')}.png`, { type: 'image/png' });
      pushHistory(outFile);
      await loadFromHistory(outFile);
      setCropRect(null);
      setActiveTool('adjust');
      toast.success('Crop применён');
    } catch (e) {
      setError(e?.message || 'Ошибка');
    } finally {
      setBusy(false);
    }
  };

  const applyResize = async () => {
    if (!file) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const w = Math.max(8, Math.min(10000, parseInt(resizeW, 10) || 0));
    const h = Math.max(8, Math.min(10000, parseInt(resizeH, 10) || 0));
    if (!w || !h) {
      toast.error('Укажи ширину и высоту');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const tmp = document.createElement('canvas');
      tmp.width = w;
      tmp.height = h;
      const tctx = tmp.getContext('2d');
      if (!tctx) throw new Error('Canvas недоступен');
      tctx.imageSmoothingEnabled = true;
      tctx.imageSmoothingQuality = 'high';
      tctx.drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, w, h);
      const blob = await new Promise((resolve) => tmp.toBlob(resolve, 'image/png', 0.98));
      if (!blob) throw new Error('Не удалось применить resize');
      const outFile = new File([blob], `resize_${String(file.name || 'image').replace(/\.[^.]+$/, '')}.png`, { type: 'image/png' });
      pushHistory(outFile);
      await loadFromHistory(outFile);
      setActiveTool('adjust');
      toast.success('Размер изменён');
    } catch (e) {
      setError(e?.message || 'Ошибка');
    } finally {
      setBusy(false);
    }
  };

  const onSendToPrint = async () => {
    if (!file) return;
    if (!user) {
      toast.error('Нужно войти, чтобы отправить на печать');
      navigate('/login');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const { file: outFile } = await buildOutputFile();
      const uploaded = await PolyApi.uploadFiles('document-print', [outFile]);
      const saved = uploaded?.[0];
      if (!saved?._id) throw new Error('Не удалось загрузить файл на сервер');

      const draft = {
        options: { format: 'A4', color: 'color', sides: 'single', copies: 1 },
        fileIds: [saved._id],
        files: [saved],
      };
      navigate('/polygraphy/document-print', { state: { draft } });
    } catch (e) {
      setError(e?.message || 'Ошибка');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container poly-page">
      <div className="poly-topbar">
        <Link to="/polygraphy/editor" className="poly-back">← Назад</Link>
        <div className="poly-breadcrumb">Главная / Полиграфия / Редакторы / Изображения</div>
      </div>

      <div className="poly-service-head">
        <div>
          <h1 className="poly-title">Редактор изображений</h1>
          <p className="poly-subtitle">Быстрая правка изображения в браузере: фильтры, повороты, crop/resize, экспорт и «Печать в Jola».</p>
        </div>
        <div className="poly-service-tags" aria-hidden="true">
          <span className="poly-chip">JPG</span>
          <span className="poly-chip">PNG</span>
          <span className="poly-chip">WebP</span>
          <span className="poly-chip">Pro</span>
        </div>
      </div>

      <div className="poly-config" style={{ marginTop: '1rem' }}>
        <div className="poly-config-grid">
          <div className="poly-card panel">
            <div className="panel-head">
              <h2 className="panel-title">Файл</h2>
              <div className="panel-hint">Перетащи файл сюда или выбери вручную.</div>
            </div>

            <div
              className="dropzone"
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const f = e.dataTransfer?.files?.[0];
                if (f) loadFile(f);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
            >
              <div className="dropzone-inner">
                <div className="drop-icon" aria-hidden="true">⬆️</div>
                <div className="drop-title">Загрузить изображение</div>
                <div className="drop-sub">JPG/PNG/WebP/GIF/BMP/TIFF</div>
                <button className="btn primary" type="button" onClick={() => inputRef.current?.click()}>
                  Выбрать файл
                </button>
                <input
                  ref={inputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={(e) => loadFile(e.target.files?.[0] || null)}
                />
              </div>
            </div>

            {file ? (
              <div style={{ marginTop: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                  <span className="poly-chip">IMAGE</span>
                  <b style={{ color: 'var(--color-text)' }}>{file.name}</b>
                  <span style={{ color: 'var(--color-text-secondary)', fontWeight: 750 }}>
                    {(file.size / (1024 * 1024)).toFixed(2)} MB
                  </span>
                </div>

                <div style={{ marginTop: '0.8rem' }}>
                  <EditorActionBar
                    busy={busy}
                    onDownload={onDownload}
                    onPrintInJola={onSendToPrint}
                    onNew={resetAll}
                    downloadLabel={busy ? (isRu ? 'Подготовка…' : 'Preparing…') : (isRu ? 'Скачать' : 'Download')}
                    printLabel={isRu ? "Печать в Jola" : "Print in Jola"}
                    newLabel={isRu ? "Новый" : "New"}
                    extra={(
                      <>
                        <button type="button" className="ea-btn ea-btn--ghost" onClick={undo} disabled={!canUndo || busy}>
                          <span className="ea-ico" aria-hidden="true">↩️</span><span className="ea-text">{isRu ? "Отменить" : "Undo"}</span>
                        </button>
                        <button type="button" className="ea-btn ea-btn--ghost" onClick={redo} disabled={!canRedo || busy}>
                          <span className="ea-ico" aria-hidden="true">↪️</span><span className="ea-text">{isRu ? "Повторить" : "Redo"}</span>
                        </button>
                      </>
                    )}
                  />
                </div>

                {error ? <div className="poly-error" style={{ marginTop: '0.8rem' }}>{error}</div> : null}
              </div>
            ) : null}
          </div>

          <div className="poly-card panel">
            <div className="panel-head">
              <h2 className="panel-title">Редактор</h2>
              <div className="panel-hint">Правки применяются сразу (предпросмотр).</div>
            </div>

            {!file ? (
              <div className="poly-note-card" style={{ marginTop: '0.5rem' }}>
                Выбери изображение слева — и здесь появится предпросмотр.
              </div>
            ) : (
              <div>
                <div className="oe-canvasWrap" style={{ marginTop: '0.75rem' }}>
                  <div style={{ position: 'relative' }}>
                    <canvas
                      ref={canvasRef}
                      className="oe-canvas"
                      onMouseDown={(e) => {
                        if (activeTool !== 'crop') return;
                        const canvas = canvasRef.current;
                        if (!canvas) return;
                        const rect = canvas.getBoundingClientRect();
                        const sx = canvas.width / rect.width;
                        const sy = canvas.height / rect.height;
                        const x = (e.clientX - rect.left) * sx;
                        const y = (e.clientY - rect.top) * sy;
                        setCropRect({ x, y, w: 1, h: 1 });
                        setDragging(true);
                      }}
                      onMouseMove={(e) => {
                        if (activeTool !== 'crop' || !dragging) return;
                        const canvas = canvasRef.current;
                        if (!canvas) return;
                        const rect = canvas.getBoundingClientRect();
                        const sx = canvas.width / rect.width;
                        const sy = canvas.height / rect.height;
                        const x2 = (e.clientX - rect.left) * sx;
                        const y2 = (e.clientY - rect.top) * sy;
                        setCropRect((prev) => {
                          if (!prev) return null;
                          const x = Math.min(prev.x, x2);
                          const y = Math.min(prev.y, y2);
                          const w = Math.abs(x2 - prev.x);
                          const h = Math.abs(y2 - prev.y);
                          return { x, y, w, h };
                        });
                      }}
                      onMouseUp={() => {
                        if (activeTool !== 'crop') return;
                        setDragging(false);
                      }}
                      onMouseLeave={() => {
                        if (activeTool !== 'crop') return;
                        setDragging(false);
                      }}
                    />

                    {activeTool === 'crop' && cropRect ? (
                      (() => {
                        const canvas = canvasRef.current;
                        if (!canvas) return null;
                        const rect = canvas.getBoundingClientRect();
                        const sx = rect.width / canvas.width;
                        const sy = rect.height / canvas.height;
                        const left = cropRect.x * sx;
                        const top = cropRect.y * sy;
                        const width = cropRect.w * sx;
                        const height = cropRect.h * sy;
                        return (
                          <div
                            style={{
                              position: 'absolute',
                              left,
                              top,
                              width,
                              height,
                              border: '2px dashed rgba(0,184,255,0.95)',
                              background: 'rgba(0,184,255,0.10)',
                              borderRadius: 12,
                              pointerEvents: 'none',
                              boxShadow: '0 0 0 9999px rgba(0,0,0,0.35)',
                            }}
                          />
                        );
                      })()
                    ) : null}
                  </div>
                </div>

                <div className="oe-controls" style={{ marginTop: '0.8rem' }}>
                  <div className="oe-grid">
                    <button type="button" className={activeTool === 'adjust' ? 'oe-btn oe-btn--on' : 'oe-btn'} onClick={() => setActiveTool('adjust')}>🎛️ Adjust</button>
                    <button type="button" className={activeTool === 'crop' ? 'oe-btn oe-btn--on' : 'oe-btn'} onClick={() => { setActiveTool('crop'); setCropRect(null); }}>✂️ Crop</button>
                    <button type="button" className={activeTool === 'resize' ? 'oe-btn oe-btn--on' : 'oe-btn'} onClick={() => setActiveTool('resize')}>↔️ Resize</button>
                    <button type="button" className="oe-btn" onClick={undo} disabled={!canUndo || busy}>↩️ Undo</button>
                    <button type="button" className="oe-btn" onClick={redo} disabled={!canRedo || busy}>↪️ Redo</button>
                  </div>

                  {activeTool === 'crop' ? (
                    <div className="poly-note-card" style={{ marginTop: '0.8rem' }}>
                      Выдели область мышкой на изображении, затем нажми <b>Apply crop</b>.
                      <div style={{ marginTop: 10, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        <button type="button" className="btn primary" onClick={applyCrop} disabled={busy || !cropRect}>Apply crop</button>
                        <button type="button" className="btn ghost" onClick={() => { setCropRect(null); setActiveTool('adjust'); }} disabled={busy}>Cancel</button>
                      </div>
                    </div>
                  ) : null}

                  {activeTool === 'resize' ? (
                    <div className="poly-note-card" style={{ marginTop: '0.8rem' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        <label className="oe-slider">
                          <span>Width</span>
                          <input value={resizeW} onChange={(e) => {
                            const v = e.target.value;
                            setResizeW(v);
                            if (keepAspect) {
                              const img = originalImgRef.current;
                              if (img) {
                                const ratio = (img.naturalHeight || 1) / (img.naturalWidth || 1);
                                const nv = parseInt(v, 10);
                                if (nv) setResizeH(String(Math.round(nv * ratio)));
                              }
                            }
                          }} />
                        </label>
                        <label className="oe-slider">
                          <span>Height</span>
                          <input value={resizeH} onChange={(e) => {
                            const v = e.target.value;
                            setResizeH(v);
                            if (keepAspect) {
                              const img = originalImgRef.current;
                              if (img) {
                                const ratio = (img.naturalWidth || 1) / (img.naturalHeight || 1);
                                const nv = parseInt(v, 10);
                                if (nv) setResizeW(String(Math.round(nv * ratio)));
                              }
                            }
                          }} />
                        </label>
                      </div>
                      <label style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 10, color: 'var(--color-text-secondary)', fontWeight: 750 }}>
                        <input type="checkbox" checked={keepAspect} onChange={(e) => setKeepAspect(e.target.checked)} />
                        Keep aspect ratio
                      </label>
                      <div style={{ marginTop: 10, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        <button type="button" className="btn primary" onClick={applyResize} disabled={busy}>Apply resize</button>
                        <button type="button" className="btn ghost" onClick={() => setActiveTool('adjust')} disabled={busy}>Done</button>
                      </div>
                    </div>
                  ) : null}

                  <div className="oe-grid">
                    <button type="button" className="oe-btn" onClick={() => setRotate((v) => v - 90)}>⟲ Повернуть</button>
                    <button type="button" className="oe-btn" onClick={() => setRotate((v) => v + 90)}>⟳ Повернуть</button>
                    <button type="button" className={flipX ? 'oe-btn oe-btn--on' : 'oe-btn'} onClick={() => setFlipX((v) => !v)}>⇋ Отразить</button>
                    <button type="button" className={grayscale ? 'oe-btn oe-btn--on' : 'oe-btn'} onClick={() => setGrayscale((v) => !v)}>▦ Ч/Б</button>
                  </div>

                  <label className="oe-slider">
                    <span>Яркость</span>
                    <input type="range" min={-100} max={100} value={brightness} onChange={(e) => setBrightness(Number(e.target.value))} />
                  </label>
                  <label className="oe-slider">
                    <span>Контраст</span>
                    <input type="range" min={-100} max={100} value={contrast} onChange={(e) => setContrast(Number(e.target.value))} />
                  </label>
                  <label className="oe-slider">
                    <span>Насыщенность</span>
                    <input type="range" min={-100} max={100} value={saturation} onChange={(e) => setSaturation(Number(e.target.value))} />
                  </label>

                  <div className="oe-grid">
                    <button type="button" className={sepia ? 'oe-btn oe-btn--on' : 'oe-btn'} onClick={() => setSepia((v) => !v)}>Сепия</button>
                    <button type="button" className="oe-btn" onClick={() => { setBrightness(12); setContrast(10); setSaturation(8); setGrayscale(false); setSepia(false); }}>Авто</button>
                    <button type="button" className="oe-btn" onClick={() => { setBrightness(-4); setContrast(14); setSaturation(-10); setGrayscale(false); setSepia(false); }}>Кино</button>
                    <button type="button" className="oe-btn" onClick={() => { setBrightness(0); setContrast(12); setSaturation(-100); setGrayscale(true); setSepia(false); }}>Моно</button>
                  </div>

                  <label className="oe-slider">
                    <span>Текст поверх изображения</span>
                    <input type="text" value={overlayText} onChange={(e) => setOverlayText(e.target.value)} placeholder="Например: Jola" />
                  </label>

                  <div className="oe-grid">
                    <label className="oe-slider">
                      <span>Формат</span>
                      <select value={exportType} onChange={(e) => setExportType(e.target.value)}>
                        <option value="png">PNG</option>
                        <option value="jpg">JPG</option>
                        <option value="webp">WebP</option>
                      </select>
                    </label>
                    <label className="oe-slider" style={{ gridColumn: 'span 3' }}>
                      <span>Качество экспорта ({exportQuality}%)</span>
                      <input type="range" min={30} max={100} value={exportQuality} onChange={(e) => setExportQuality(Number(e.target.value))} />
                    </label>
                  </div>

                  <button
                    type="button"
                    className="oe-btn oe-btn--ghost"
                    onClick={() => {
                      setRotate(0);
                      setFlipX(false);
                      setBrightness(0);
                      setContrast(0);
                      setSaturation(0);
                      setGrayscale(false);
                      setSepia(false);
                      setOverlayText('');
                    }}
                  >
                    Сброс
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PolyApi } from '../api';
import './OnlineEditorModal.css';

const readAsTextSafe = async (url, maxBytes = 2_500_000) => {
  const res = await fetch(url);
  const buf = await res.arrayBuffer();
  if (buf.byteLength > maxBytes) throw new Error('Файл слишком большой для онлайн‑редактора');
  return new TextDecoder('utf-8').decode(buf);
};

const readAsArrayBufferSafe = async (url, maxBytes = 8_000_000) => {
  const res = await fetch(url);
  const buf = await res.arrayBuffer();
  if (buf.byteLength > maxBytes) throw new Error('Файл слишком большой для онлайн‑редактора');
  return buf;
};

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function applyPixelFilters(imageData, { brightness = 0, contrast = 0, grayscale = false }) {
  const data = imageData.data;

  
  const b = clamp(Number(brightness) || 0, -100, 100) * 2.55;
  
  const c = clamp(Number(contrast) || 0, -100, 100);
  const cf = (259 * (c * 2.55 + 255)) / (255 * (259 - (c * 2.55)));

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

export default function OnlineEditorModal({ open, serviceKey, file, onClose, onReplaced }) {
  const ext = String(file?.ext || '').toLowerCase();
  const mode = useMemo(() => {
    if (!file) return 'none';
    if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'tif', 'tiff', 'svg'].includes(ext)) return 'image';
    if (['txt', 'rtf', 'md', 'csv', 'tsv', 'json', 'xml', 'yml', 'yaml', 'html', 'css', 'js', 'ts', 'sql'].includes(ext)) return 'text';
    if (['docx'].includes(ext)) return 'docx';
    return 'unsupported';
  }, [ext, file]);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  
  const canvasRef = useRef(null);
  const originalImgRef = useRef(null);
  const [imgReady, setImgReady] = useState(false);
  const [rotate, setRotate] = useState(0);
  const [flipX, setFlipX] = useState(false);
  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(0);
  const [grayscale, setGrayscale] = useState(false);

  
  const [text, setText] = useState('');

  
  const [docxText, setDocxText] = useState('');

  useEffect(() => {
    if (!open) return;
    setError('');
    setBusy(false);

    
    setRotate(0);
    setFlipX(false);
    setBrightness(0);
    setContrast(0);
    setGrayscale(false);
    setImgReady(false);
    setText('');
    setDocxText('');

    (async () => {
      try {
        if (!file?.url) return;
        if (mode === 'image') {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.src = file.url;
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = () => reject(new Error('Не удалось загрузить изображение'));
          });
          originalImgRef.current = img;
          setImgReady(true);
        }
        if (mode === 'text') {
          const t = await readAsTextSafe(file.url);
          setText(t);
        }
        if (mode === 'docx') {
          const buf = await readAsArrayBufferSafe(file.url);
          
          const mammoth = await import('mammoth/mammoth.browser');
          const out = await mammoth.extractRawText({ arrayBuffer: buf });
          setDocxText(String(out?.value || '').trim());
        }
      } catch (e) {
        setError(e?.message || 'Ошибка загрузки файла');
      }
    })();
  }, [open, file?.url, mode]);

  const drawImage = () => {
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
      const filtered = applyPixelFilters(imageData, { brightness, contrast, grayscale });
      ctx.putImageData(filtered, 0, 0);
    } catch {
      
    }
  };

  useEffect(() => {
    if (!open || mode !== 'image' || !imgReady) return;
    drawImage();
    
  }, [open, mode, imgReady, rotate, flipX, brightness, contrast, grayscale]);

  const replaceWithUpload = async (newFile) => {
    if (!file?.fileId) throw new Error('Не найден id файла');
    const uploaded = await PolyApi.uploadFiles(serviceKey, [newFile]);
    if (!uploaded?.length) throw new Error('Загрузка не удалась');
    
    await PolyApi.deleteUpload(file.fileId).catch(() => {});
    const saved = uploaded[0];
    onReplaced?.(file.fileId, {
      fileId: saved._id,
      originalName: saved.originalName,
      url: saved.url,
      size: saved.size,
      ext: saved.ext,
      pages: saved.pages,
      width: saved.width,
      height: saved.height,
    });
  };

  const onSaveImage = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setBusy(true);
    setError('');
    try {
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png', 0.92));
      if (!blob) throw new Error('Не удалось сохранить изображение');
      const safeName = String(file.originalName || 'image')
        .replace(/\.[^.]+$/, '')
        .replace(/[^a-zA-Z0-9_\-а-яА-ЯёЁ ]/g, '')
        .trim();
      const outName = `${safeName || 'image'}_edited.png`;
      const f = new File([blob], outName, { type: 'image/png' });
      await replaceWithUpload(f);
      onClose?.();
    } catch (e) {
      setError(e?.message || 'Ошибка сохранения');
    } finally {
      setBusy(false);
    }
  };

  const onSaveText = async (payloadText, extOut = 'txt') => {
    setBusy(true);
    setError('');
    try {
      const safeName = String(file.originalName || 'document')
        .replace(/\.[^.]+$/, '')
        .replace(/[^a-zA-Z0-9_\-а-яА-ЯёЁ ]/g, '')
        .trim();
      const outName = `${safeName || 'document'}_edited.${extOut}`;
      const blob = new Blob([String(payloadText || '')], { type: 'text/plain;charset=utf-8' });
      const f = new File([blob], outName, { type: 'text/plain' });
      await replaceWithUpload(f);
      onClose?.();
    } catch (e) {
      setError(e?.message || 'Ошибка сохранения');
    } finally {
      setBusy(false);
    }
  };

  const onSaveDocx = async () => {
    setBusy(true);
    setError('');
    try {
      const { Document, Packer, Paragraph } = await import('docx');
      const lines = String(docxText || '').split(/\r?\n/);
      const doc = new Document({
        sections: [
          {
            children: lines.map((line) => new Paragraph(String(line || ''))),
          },
        ],
      });
      const blob = await Packer.toBlob(doc);
      const safeName = String(file.originalName || 'document')
        .replace(/\.[^.]+$/, '')
        .replace(/[^a-zA-Z0-9_\-а-яА-ЯёЁ ]/g, '')
        .trim();
      const outName = `${safeName || 'document'}_edited.docx`;
      const f = new File([blob], outName, {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });
      await replaceWithUpload(f);
      onClose?.();
    } catch (e) {
      setError(e?.message || 'Ошибка сохранения');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="oe-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose?.();
          }}
        >
          <motion.div
            className="oe-modal"
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.18 }}
          >
            <div className="oe-head">
              <div>
                <div className="oe-title">Онлайн‑редактор</div>
                <div className="oe-sub">
                  {file?.originalName} · {String(file?.ext || '').toUpperCase()}
                </div>
              </div>
              <button className="oe-close" type="button" onClick={onClose} aria-label="Закрыть">×</button>
            </div>

            {error ? <div className="oe-error">{error}</div> : null}

            {mode === 'image' && (
              <div className="oe-body">
                <div className="oe-canvasWrap">
                  <canvas ref={canvasRef} className="oe-canvas" />
                </div>
                <div className="oe-controls">
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

                  <button type="button" className="oe-btn oe-btn--ghost" onClick={() => { setRotate(0); setFlipX(false); setBrightness(0); setContrast(0); setGrayscale(false); }}>
                    Сброс
                  </button>
                </div>
              </div>
            )}

            {mode === 'text' && (
              <div className="oe-body">
                <textarea className="oe-textarea" value={text} onChange={(e) => setText(e.target.value)} />
                <div className="oe-note">
                  Поддерживается редактирование текста/кода: TXT/RTF/MD/CSV/TSV/JSON и др. (сохраняем с тем же расширением).
                </div>
              </div>
            )}

            {mode === 'docx' && (
              <div className="oe-body">
                <textarea className="oe-textarea" value={docxText} onChange={(e) => setDocxText(e.target.value)} placeholder="Текст документа…" />
                <div className="oe-note">
                  Это упрощённое редактирование DOCX: извлекаем текст и сохраняем обратно без сложного форматирования.
                </div>
              </div>
            )}

            {mode === 'unsupported' && (
              <div className="oe-body">
                <div className="oe-note">
                  Для формата <b>{String(file?.ext || '').toUpperCase()}</b> редактор пока недоступен.
                  Можно открыть файл для просмотра в новой вкладке.
                </div>
                {file?.url ? (
                  <a className="oe-btn" href={file.url} target="_blank" rel="noreferrer">Открыть файл</a>
                ) : null}
              </div>
            )}

            <div className="oe-foot">
              <button className="oe-btn oe-btn--ghost" type="button" onClick={onClose} disabled={busy}>
                Отмена
              </button>
              {mode === 'image' ? (
                <button className="oe-btn oe-btn--primary" type="button" onClick={onSaveImage} disabled={busy}>
                  {busy ? 'Сохраняем…' : 'Сохранить и заменить'}
                </button>
              ) : null}
              {mode === 'text' ? (
                <button
                  className="oe-btn oe-btn--primary"
                  type="button"
                  onClick={() => onSaveText(text, ext || 'txt')}
                  disabled={busy}
                >
                  {busy ? 'Сохраняем…' : 'Сохранить и заменить'}
                </button>
              ) : null}
              {mode === 'docx' ? (
                <button className="oe-btn oe-btn--primary" type="button" onClick={onSaveDocx} disabled={busy}>
                  {busy ? 'Сохраняем…' : 'Сохранить и заменить'}
                </button>
              ) : null}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

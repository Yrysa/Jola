import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { PDFDocument, StandardFonts, degrees, rgb } from 'pdf-lib';
import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist/build/pdf.mjs';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

import { PolyApi } from '../api';
import { useAuth } from '../../context/AuthContext.jsx';
import { useTranslation } from 'react-i18next';
import EditorActionBar from '../components/EditorActionBar.jsx';
import './PolygraphyPages.css';

GlobalWorkerOptions.workerSrc = pdfWorker;

const TOOL = {
  SELECT: 'select',
  REPLACE: 'replace',
  TEXT: 'text',
  WHITEOUT: 'whiteout',
  HIGHLIGHT: 'highlight',
  IMAGE: 'image',
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

const wrapLines = (font, text, fontSize, maxWidth) => {
  const paragraphs = String(text || '').replace(/\r/g, '').split('\n');
  const lines = [];

  paragraphs.forEach((part, pIdx) => {
    const words = part.split(/\s+/).filter(Boolean);
    if (!words.length) {
      lines.push('');
      return;
    }
    let current = '';
    words.forEach((word) => {
      const next = current ? `${current} ${word}` : word;
      const width = font.widthOfTextAtSize(next, fontSize);
      if (width <= maxWidth || !current) {
        current = next;
      } else {
        lines.push(current);
        current = word;
      }
    });
    if (current) lines.push(current);
    if (pIdx < paragraphs.length - 1) lines.push('');
  });

  return lines.length ? lines : [''];
};

const normalizeTextBlocks = (items, viewport, scale, currentPage) => {
  return (items || [])
    .filter((item) => String(item?.str || '').trim())
    .map((item, idx) => {
      const t = item.transform || [1, 0, 0, 1, 0, 0];
      const [vx, vy] = viewport.convertToViewportPoint(t[4], t[5]);
      const pdfH = Math.max(10, Number(item.height || Math.abs(t[0]) || Math.abs(t[3]) || 12));
      const sizePdf = Math.max(10, Math.min(28, pdfH));
      const canvasH = Math.max(14, sizePdf * scale * 1.1);
      const pdfW = Math.max(24, Number(item.width || Math.max(String(item.str || '').length * sizePdf * 0.45, 24)));
      const canvasW = Math.max(24, pdfW * scale);

      return {
        id: `tb-${currentPage}-${idx}`,
        page: currentPage,
        text: String(item.str || ''),
        x: Math.max(0, vx - 1),
        y: Math.max(0, vy - canvasH + 2),
        w: canvasW + 4,
        h: canvasH + 4,
        pdfX: Number(t[4] || 0),
        pdfY: Number(t[5] || 0),
        pdfW,
        pdfH: sizePdf,
        sizePdf,
      };
    });
};

export default function PdfEditorPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { i18n } = useTranslation();
  const isRu = (i18n.language || 'ru').toLowerCase().startsWith('ru');

  const docRef = useRef(null);
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const dragRef = useRef({ active: false, x: 0, y: 0 });

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [bytes, setBytes] = useState(null);
  const [fileName, setFileName] = useState('document.pdf');
  const [pageCount, setPageCount] = useState(0);
  const [page, setPage] = useState(1);
  const [tool, setTool] = useState(TOOL.REPLACE);
  const [layers, setLayers] = useState([]);
  const [textBlocks, setTextBlocks] = useState([]);
  const [selectedBlockId, setSelectedBlockId] = useState('');
  const [replacementDraft, setReplacementDraft] = useState('');
  const [canvasBox, setCanvasBox] = useState({ width: 0, height: 0 });
  const [noteText, setNoteText] = useState('');
  const [notePage, setNotePage] = useState(1);

  const [blockSearch, setBlockSearch] = useState('');
  const [replaceFont, setReplaceFont] = useState('Helvetica');
  const [replaceSizeBoost, setReplaceSizeBoost] = useState(0);
  const [stamp, setStamp] = useState(null); 
  const [zoom, setZoom] = useState(1);
  const [pageJump, setPageJump] = useState('1');

  const canWork = Boolean(bytes && pageCount > 0);
  const currentLayers = useMemo(() => layers.filter((l) => l.page === page), [layers, page]);
  const currentTextBlocks = useMemo(() => textBlocks.filter((b) => b.page === page), [textBlocks, page]);
  const filteredTextBlocks = useMemo(() => {
    const q = String(blockSearch || '').trim().toLowerCase();
    if (!q) return currentTextBlocks;
    return currentTextBlocks.filter((b) => String(b.text || '').toLowerCase().includes(q));
  }, [currentTextBlocks, blockSearch]);
  const selectedTextBlock = useMemo(
    () => currentTextBlocks.find((b) => b.id === selectedBlockId) || null,
    [currentTextBlocks, selectedBlockId]
  );

  const loadFiles = async (files) => {
    setError('');
    setBusy(true);
    try {
      const list = Array.from(files || []).filter(Boolean);
      if (!list.length) return;
      const onlyPdfs = list.filter((f) => /\.pdf$/i.test(String(f.name || '')));
      if (!onlyPdfs.length) throw new Error('Выбери PDF файл(ы).');

      if (onlyPdfs.length > 1) {
        const merged = await PDFDocument.create();
        for (const f of onlyPdfs) {
          const ab = await f.arrayBuffer();
          const d = await PDFDocument.load(ab, { ignoreEncryption: true });
          const copied = await merged.copyPages(d, d.getPageIndices());
          copied.forEach((p) => merged.addPage(p));
        }
        docRef.current = merged;
        const out = await merged.save();
        setBytes(out);
        setFileName('merged.pdf');
        setPageCount(merged.getPageCount());
      } else {
        const f = onlyPdfs[0];
        const ab = await f.arrayBuffer();
        const d = await PDFDocument.load(ab, { ignoreEncryption: true });
        docRef.current = d;
        const out = await d.save();
        setBytes(out);
        setFileName(f.name || 'document.pdf');
        setPageCount(d.getPageCount());
      }

      setPage(1);
      setNotePage(1);
      setLayers([]);
      setTextBlocks([]);
      setSelectedBlockId('');
      setReplacementDraft('');
      setTool(TOOL.REPLACE);
    } catch (e) {
      setError(e?.message || 'Ошибка');
    } finally {
      setBusy(false);
    }
  };

  const resetAll = () => {
    setError('');
    setBytes(null);
    setFileName('document.pdf');
    setPageCount(0);
    setPage(1);
    setTool(TOOL.REPLACE);
    setLayers([]);
    setTextBlocks([]);
    setSelectedBlockId('');
    setReplacementDraft('');
    setBlockSearch('');
    setStamp(null);
    docRef.current = null;
  };

  const applyAndSave = async (mutator) => {
    if (!docRef.current) return;
    setBusy(true);
    setError('');
    try {
      await mutator(docRef.current);
      const out = await docRef.current.save();
      setBytes(out);
      const total = docRef.current.getPageCount();
      setPageCount(total);
      setPage((prev) => Math.max(1, Math.min(prev, total)));
      setNotePage((prev) => Math.max(1, Math.min(prev, total)));
      setSelectedBlockId('');
      setReplacementDraft('');
    } catch (e) {
      setError(e?.message || 'Ошибка');
    } finally {
      setBusy(false);
    }
  };

  const rotateCurrent = (dir) => {
    if (!canWork) return;
    applyAndSave(async (doc) => {
      const idx = Math.max(0, Math.min(page - 1, doc.getPageCount() - 1));
      const current = doc.getPages()[idx].getRotation().angle || 0;
      const next = (current + (dir === 'left' ? -90 : 90) + 360) % 360;
      doc.getPages()[idx].setRotation(degrees(next));
    });
  };

  const rotateAll = (dir) => {
    if (!canWork) return;
    applyAndSave(async (doc) => {
      doc.getPages().forEach((p) => {
        const current = p.getRotation().angle || 0;
        const next = (current + (dir === 'left' ? -90 : 90) + 360) % 360;
        p.setRotation(degrees(next));
      });
    });
  };

  const deleteCurrentPage = () => {
    if (!canWork || pageCount <= 1) return;
    applyAndSave(async (doc) => {
      const idx = Math.max(0, Math.min(page - 1, doc.getPageCount() - 1));
      doc.removePage(idx);
      setLayers((prev) => prev
        .filter((l) => l.page !== page)
        .map((l) => ({ ...l, page: l.page > page ? l.page - 1 : l.page })));
    });
  };

  const addNote = () => {
    if (!canWork) return;
    const text = String(noteText || '').trim();
    if (!text) return;
    setLayers((prev) => prev.concat({
      id: crypto.randomUUID(),
      page: Math.max(1, Math.min(Number(notePage) || 1, pageCount)),
      kind: 'note',
      text,
    }));
    setNoteText('');
    toast.success('Заметка добавлена');
  };

  const applyReplacementFromSelection = () => {
    if (!selectedTextBlock) return;
    const text = String(replacementDraft || '').trim();
    setLayers((prev) => {
      const other = prev.filter((l) => !(l.kind === 'replaceText' && l.sourceId === selectedTextBlock.id));
      if (!text) return other;
      return other.concat({
        id: crypto.randomUUID(),
        sourceId: selectedTextBlock.id,
        page,
        kind: 'replaceText',
        text,
        pdfX: selectedTextBlock.pdfX,
        pdfY: selectedTextBlock.pdfY,
        pdfW: selectedTextBlock.pdfW,
        pdfH: selectedTextBlock.pdfH,
        sizePdf: selectedTextBlock.sizePdf,
        fontName: replaceFont,
        sizeBoost: replaceSizeBoost,
      });
    });
    toast.success(text ? 'Замена текста подготовлена' : 'Замена удалена');
  };

  const applyPreset = (preset) => {
    if (preset.search) setBlockSearch(preset.search);
    if (preset.tool) setTool(preset.tool);
    if (preset.note) setNoteText(preset.note);
    if (preset.page) setNotePage(preset.page);
    toast.success(preset.toast || (isRu ? 'Режим готов' : 'Preset ready'));
  };

  const removeLayer = (id) => setLayers((prev) => prev.filter((l) => l.id !== id));

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!bytes) {
        setTextBlocks([]);
        setCanvasBox({ width: 0, height: 0 });
        return;
      }
      setError('');

      try {
        const data = bytes instanceof Uint8Array ? bytes : bytes ? new Uint8Array(bytes) : null;
        if (!data || data.byteLength < 5) throw new Error('PDF is empty');
        const scanLen = Math.min(1024, data.byteLength);
        const scan = String.fromCharCode(...Array.from(data.slice(0, scanLen)));
        if (!scan.includes('%PDF')) throw new Error('No PDF header found');
        const loadingTask = getDocument({ data });
        const pdf = await loadingTask.promise;
        if (cancelled) return;
        const total = pdf.numPages;
        setPageCount(total);
        const safePage = Math.max(1, Math.min(page, total));
        const p = await pdf.getPage(safePage);

        const canvas = canvasRef.current;
        const wrap = wrapRef.current;
        if (!canvas || !wrap) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const wrapWidth = Math.max(640, wrap.clientWidth || 900);
        const baseViewport = p.getViewport({ scale: 1 });
        const fitScale = Math.min(1.7, Math.max(0.75, wrapWidth / baseViewport.width));
        const scale = Math.min(2.4, Math.max(0.55, fitScale * Number(zoom || 1)));
        const viewport = p.getViewport({ scale });

        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;
        canvas.dataset.scale = String(scale);
        setCanvasBox({ width: Math.floor(viewport.width), height: Math.floor(viewport.height) });

        await p.render({ canvasContext: ctx, viewport }).promise;

        const content = await p.getTextContent();
        const blocks = normalizeTextBlocks(content.items, viewport, scale, safePage);
        if (!cancelled) {
          setTextBlocks((prev) => {
            const otherPages = prev.filter((b) => b.page !== safePage);
            return otherPages.concat(blocks);
          });
          setError('');
        }
      } catch (e) {
        if (!cancelled) setError(e?.message || 'Не удалось отрендерить PDF');
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [bytes, page, zoom]);

  useEffect(() => {
    setPageJump(String(page || 1));
  }, [page]);

  const duplicateCurrentPage = () => {
    if (!canWork) return;
    applyAndSave(async (doc) => {
      const idx = Math.max(0, Math.min(page - 1, doc.getPageCount() - 1));
      const [copied] = await doc.copyPages(doc, [idx]);
      doc.insertPage(idx + 1, copied);
      setPage(idx + 2);
    });
  };

  const addBlankPage = () => {
    if (!canWork) return;
    applyAndSave(async (doc) => {
      const idx = Math.max(0, Math.min(page - 1, doc.getPageCount() - 1));
      const currentPage = doc.getPages()[idx];
      const { width, height } = currentPage.getSize();
      doc.insertPage(idx + 1, [width, height]);
      setPage(idx + 2);
    });
  };

  const onCanvasPointerDown = (e) => {
    if (!canWork) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (tool === TOOL.TEXT) {
      const value = window.prompt('Текст для вставки', replacementDraft || '');
      if (!value) return;
      setLayers((prev) => prev.concat({
        id: crypto.randomUUID(),
        page,
        kind: 'text',
        x,
        y,
        text: value,
        size: 14,
      }));
      return;
    }

    if (tool === TOOL.IMAGE) {
      if (!stamp?.dataUrl) {
        toast.error('Choose an image stamp first');
        return;
      }
      const size = Math.max(40, Math.min(420, Number(window.prompt('Stamp width (px)', '180') || 180)));
      setLayers((prev) => prev.concat({
        id: crypto.randomUUID(),
        page,
        kind: 'image',
        x,
        y,
        w: size,
        h: Math.round(size * 0.6),
        dataUrl: stamp.dataUrl,
        mime: stamp.type,
      }));
      toast.success('Stamp added');
      return;
    }

    if (tool === TOOL.WHITEOUT || tool === TOOL.HIGHLIGHT) {
      dragRef.current = { active: true, x, y };
    }
  };

  const onCanvasPointerUp = (e) => {
    if (!canWork) return;
    if (!dragRef.current.active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x2 = e.clientX - rect.left;
    const y2 = e.clientY - rect.top;
    const x1 = dragRef.current.x;
    const y1 = dragRef.current.y;
    dragRef.current.active = false;

    const left = Math.min(x1, x2);
    const top = Math.min(y1, y2);
    const w = Math.abs(x2 - x1);
    const h = Math.abs(y2 - y1);
    if (w < 6 || h < 6) return;

    setLayers((prev) => prev.concat({
      id: crypto.randomUUID(),
      page,
      kind: tool === TOOL.WHITEOUT ? 'whiteout' : 'highlight',
      x: left,
      y: top,
      w,
      h,
    }));
  };

  const applyLayersToPdf = async () => {
    if (!bytes) return null;
    const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
    const fonts = {
      Helvetica: await doc.embedFont(StandardFonts.Helvetica),
      TimesRoman: await doc.embedFont(StandardFonts.TimesRoman),
      Courier: await doc.embedFont(StandardFonts.Courier),
    };
    const fontDefault = fonts.Helvetica;
    const canvas = canvasRef.current;
    const scale = Number(canvas?.width) && Number(canvas?.dataset?.scale) ? Number(canvas.dataset.scale) : null;
    const effectiveScale = scale || 1;
    const pages = doc.getPages();

    for (const layer of layers) {
      const idx = layer.page - 1;
      if (idx < 0 || idx >= pages.length) continue;
      const p = pages[idx];
      const { width, height } = p.getSize();

      if (layer.kind === 'replaceText') {
        const f = fonts[layer.fontName] || fontDefault;
        const fontSize = Math.max(8, Math.min(38, (layer.sizePdf || 12) + (layer.sizeBoost || 0)));
        const maxWidth = Math.max(layer.pdfW || 80, 80);
        const lines = wrapLines(f, layer.text, fontSize, maxWidth);
        const lineHeight = Math.max(12, fontSize * 1.22);
        const widest = lines.reduce((m, line) => Math.max(m, f.widthOfTextAtSize(line || ' ', fontSize)), 0);
        const boxHeight = lineHeight * Math.max(lines.length, 1) + 6;
        const boxY = layer.pdfY - fontSize - lineHeight * (Math.max(lines.length, 1) - 1) - 4;

        p.drawRectangle({
          x: Math.max(0, layer.pdfX - 2),
          y: Math.max(0, boxY),
          width: Math.min(width - Math.max(0, layer.pdfX - 2), Math.max(maxWidth, widest + 8)),
          height: Math.min(height, boxHeight),
          color: rgb(1, 1, 1),
          opacity: 1,
        });

        lines.forEach((line, idxLine) => {
          p.drawText(line || ' ', {
            x: Math.max(4, layer.pdfX),
            y: Math.max(4, layer.pdfY - lineHeight * idxLine),
            size: fontSize,
            font: f,
            color: rgb(0.07, 0.09, 0.12),
            maxWidth,
          });
        });
      }

      if (layer.kind === 'text') {
        const xPdf = layer.x / effectiveScale;
        const yPdf = height - (layer.y / effectiveScale) - (layer.size || 14);
        p.drawText(String(layer.text || '').slice(0, 2000), {
          x: Math.max(6, Math.min(xPdf, width - 6)),
          y: Math.max(6, Math.min(yPdf, height - 6)),
          size: layer.size || 14,
          font: fontDefault,
          color: rgb(0.07, 0.09, 0.12),
        });
      }

      if (layer.kind === 'image') {
        try {
          const dataUrl = String(layer.dataUrl || '');
          const b64idx = dataUrl.indexOf('base64,');
          if (b64idx < 0) continue;
          const bin = atob(dataUrl.slice(b64idx + 7));
          const arr = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
          const isPng = String(layer.mime || '').includes('png') || dataUrl.startsWith('data:image/png');
          const img = isPng ? await doc.embedPng(arr) : await doc.embedJpg(arr);
          const xPdf = layer.x / effectiveScale;
          const yTop = layer.y / effectiveScale;
          const wPdf = layer.w / effectiveScale;
          const hPdf = layer.h / effectiveScale;
          const yPdf = height - yTop - hPdf;
          p.drawImage(img, { x: xPdf, y: yPdf, width: wPdf, height: hPdf, opacity: 0.98 });
        } catch {
        }
      }

      if (layer.kind === 'whiteout' || layer.kind === 'highlight') {
        const xPdf = layer.x / effectiveScale;
        const yTop = layer.y / effectiveScale;
        const wPdf = layer.w / effectiveScale;
        const hPdf = layer.h / effectiveScale;
        const yPdf = height - yTop - hPdf;
        const isHighlight = layer.kind === 'highlight';
        p.drawRectangle({
          x: xPdf,
          y: yPdf,
          width: wPdf,
          height: hPdf,
          color: isHighlight ? rgb(1, 1, 0.3) : rgb(1, 1, 1),
          opacity: isHighlight ? 0.35 : 1,
          borderWidth: isHighlight ? 0.5 : 0,
          borderColor: isHighlight ? rgb(0.25, 0.25, 0.25) : undefined,
        });
      }

      if (layer.kind === 'note') {
        const note = String(layer.text || '').slice(0, 160);
        p.drawRectangle({
          x: 18,
          y: height - 46,
          width: Math.min(420, width - 36),
          height: 28,
          color: rgb(1, 1, 0.6),
          opacity: 0.35,
          borderColor: rgb(0.2, 0.2, 0.2),
          borderWidth: 0.5,
        });
        p.drawText(note, {
          x: 22,
          y: height - 38,
          size: 12,
          font: fontDefault,
          color: rgb(0.08, 0.1, 0.12),
        });
      }
    }

    return doc.save();
  };

  const onDownload = async () => {
    try {
      const out = await applyLayersToPdf();
      if (!out) return;
      downloadBlob(new Blob([out], { type: 'application/pdf' }), fileName.replace(/\.pdf$/i, '') + '_edited.pdf');
      setError('');
      toast.success(isRu ? 'Файл скачан' : 'Downloaded');
    } catch (e) {
      setError(e?.message || 'Ошибка экспорта');
    }
  };

  const onSendToPrint = async () => {
    if (!user) {
      toast.error('Нужно войти, чтобы отправить на печать');
      navigate('/login');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const out = await applyLayersToPdf();
      if (!out) throw new Error('PDF не готов');
      const file = new File([out], fileName.replace(/\.pdf$/i, '') + '_edited.pdf', { type: 'application/pdf' });
      const uploaded = await PolyApi.uploadFiles('document-print', [file]);
      const saved = uploaded?.[0];
      if (!saved?._id) throw new Error('Не удалось загрузить файл на сервер');
      const draft = {
        options: { format: 'A4', color: 'bw', sides: 'single', copies: 1 },
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
        <div className="poly-breadcrumb">Главная / Полиграфия / Редакторы / PDF</div>
      </div>

      <div className="poly-hero poly-hero--premium poly-hero--compact">
        <div className="poly-hero-inner poly-hero-inner--stacked">
          <div>
            <span className="poly-badge poly-badge--soft">PDF WORKSPACE</span>
            <h1 className="poly-title">PDF-редактор Jola</h1>
            <p className="poly-subtitle">
              Нормальный PDF-workspace без Acrobat: объедини файлы, найди блок текста, замени реквизиты, поставь подпись или штамп, добавь заметки и сразу отправь в печать.
            </p>
          </div>
          <div className="poly-service-tags" aria-hidden="true">
            <span className="poly-chip">Replace text</span>
            <span className="poly-chip">Merge</span>
            <span className="poly-chip">Whiteout</span>
            <span className="poly-chip">Stamp / Note</span>
          </div>
        </div>
        <div className="poly-hero-stats poly-hero-stats--editor">
          <div className="poly-stat-card"><strong>{pageCount || 0}</strong><span>{isRu ? 'страниц' : 'pages'}</span></div>
          <div className="poly-stat-card"><strong>{currentTextBlocks.length}</strong><span>{isRu ? 'блоков текста' : 'text blocks'}</span></div>
          <div className="poly-stat-card"><strong>{currentLayers.length}</strong><span>{isRu ? 'изменений' : 'changes'}</span></div>
        </div>
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
          disabledDownload={!canWork}
          disabledPrintInJola={!canWork}
          extra={(
            <>
              <select
                className="ea-btn ea-btn--ghost"
                value={replaceFont}
                onChange={(e) => setReplaceFont(e.target.value)}
                disabled={busy}
                title={isRu ? 'Шрифт замены' : 'Replacement font'}
                style={{ paddingRight: 10 }}
              >
                <option value="Helvetica">Helvetica</option>
                <option value="TimesRoman">Times</option>
                <option value="Courier">Courier</option>
              </select>

              <select
                className="ea-btn ea-btn--ghost"
                value={String(replaceSizeBoost)}
                onChange={(e) => setReplaceSizeBoost(Number(e.target.value || 0))}
                disabled={busy}
                title={isRu ? 'Размер текста' : 'Text size'}
              >
                <option value="-2">A-</option>
                <option value="0">A</option>
                <option value="2">A+</option>
                <option value="4">A++</option>
              </select>

              <label className="ea-btn ea-btn--ghost" style={{ cursor: busy ? 'not-allowed' : 'pointer' }}>
                <span className="ea-ico" aria-hidden="true">🖋️</span>
                <span className="ea-text">{isRu ? "Штамп" : "Stamp"}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    const dataUrl = await new Promise((resolve, reject) => {
                      const r = new FileReader();
                      r.onload = () => resolve(String(r.result || ''));
                      r.onerror = () => reject(new Error(isRu ? 'Не удалось прочитать изображение' : 'Failed to read image'));
                      r.readAsDataURL(f);
                    });
                    setStamp({ dataUrl, type: f.type || 'image/png' });
                    setTool(TOOL.IMAGE);
                    toast.success(isRu ? 'Нажми на страницу, чтобы поставить штамп' : 'Click on the page to place stamp');
                  }}
                  disabled={busy}
                  style={{ display: 'none' }}
                />
              </label>
            </>
          )}
        />
      </div>

      {error ? <div className="poly-error">{error}</div> : null}

      <div className="poly-config" style={{ marginTop: '0.75rem' }}>
        <div className="pdf-preset-grid">
          {[
            { title: 'Договор / реквизиты', text: 'договор', tool: TOOL.REPLACE, search: 'дата', toast: 'Выбрали режим для реквизитов' },
            { title: 'Подготовить подпись', text: 'подпись', tool: TOOL.IMAGE, search: 'подп', toast: 'Режим штампа и подписи активирован' },
            { title: 'Скрыть чувствительные данные', text: 'замазка', tool: TOOL.WHITEOUT, toast: 'Замазка готова для конфиденциальных зон' },
          ].map((preset) => (
            <button key={preset.title} type="button" className="pdf-preset-card" onClick={() => applyPreset(preset)}>
              <strong>{preset.title}</strong>
              <span>{preset.text}</span>
            </button>
          ))}
        </div>
        <div className="poly-config-grid poly-config-grid--editor">
          <div className="poly-card panel">
            <div className="panel-head">
              <h2 className="panel-title">Файл и страницы</h2>
              <div className="panel-hint">Можно выбрать один PDF или несколько — они будут объединены.</div>
            </div>
            <input type="file" accept=".pdf" multiple onChange={(e) => loadFiles(e.target.files)} disabled={busy} />

            {canWork ? (
              <div style={{ marginTop: 12, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                <span className="poly-chip">PDF</span>
                <b>{fileName}</b>
                <span className="panel-hint">Страница {page}/{pageCount}</span>
              </div>
            ) : null}

            <div style={{ marginTop: 12, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button className="btn ghost" type="button" onClick={() => rotateCurrent('left')} disabled={!canWork || busy}>Повернуть стр. ⟲</button>
              <button className="btn ghost" type="button" onClick={() => rotateCurrent('right')} disabled={!canWork || busy}>Повернуть стр. ⟳</button>
              <button className="btn ghost" type="button" onClick={() => rotateAll('left')} disabled={!canWork || busy}>Повернуть всё ⟲</button>
              <button className="btn ghost" type="button" onClick={() => rotateAll('right')} disabled={!canWork || busy}>Повернуть всё ⟳</button>
              <button className="btn ghost" type="button" onClick={duplicateCurrentPage} disabled={!canWork || busy}>Дублировать стр.</button>
              <button className="btn ghost" type="button" onClick={addBlankPage} disabled={!canWork || busy}>Пустая стр.</button>
              <button className="btn danger" type="button" onClick={deleteCurrentPage} disabled={!canWork || busy || pageCount <= 1}>Удалить стр.</button>
            </div>

            <div className="poly-note-card" style={{ marginTop: 12 }}>
              <div className="poly-note-title">Заметка (аннотация)</div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 8 }}>
                <input
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Например: Проверить подпись на стр. 2"
                  style={{ flex: 1, minWidth: 240 }}
                />
                <input
                  value={notePage}
                  onChange={(e) => setNotePage(e.target.value)}
                  type="number"
                  min={1}
                  max={pageCount || 1}
                  style={{ width: 90 }}
                />
                <button className="btn primary" type="button" onClick={addNote} disabled={!canWork || busy}>Добавить</button>
              </div>
            </div>

            <div className="poly-note-card" style={{ marginTop: 12 }}>
              <div className="poly-note-title">{isRu ? 'Быстрый сценарий работы' : 'Recommended workflow'}</div>
              <div className="poly-note-text">
                {isRu ? '1) Загрузи PDF. 2) Выбери готовый пресет или режим “Изменить текст”. 3) Кликни по исходному блоку. 4) Примени замену. 5) При необходимости добавь пустую страницу, подпись или заметку.' : '1) Upload a PDF. 2) Pick a preset or the replace mode. 3) Click the original text block. 4) Apply the replacement. 5) Add a blank page, signature, or note if needed.'}
              </div>
            </div>
          </div>

          <div className="poly-card panel">
            <div className="panel-head">
              <h2 className="panel-title">Текст, подсветка и замазка</h2>
              <div className="panel-hint">Блоков на странице: <b>{currentTextBlocks.length}</b></div>
            </div>

            <input
              value={blockSearch}
              onChange={(e) => setBlockSearch(e.target.value)}
              placeholder="Поиск по текстовым блокам (например: договор, дата, подпись)"
              style={{ width: '100%', marginTop: 10 }}
              disabled={!canWork}
            />

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button className={`btn ${tool === TOOL.REPLACE ? 'primary' : 'ghost'}`} type="button" onClick={() => setTool(TOOL.REPLACE)} disabled={!canWork}>Изменить текст</button>
              <button className={`btn ${tool === TOOL.TEXT ? 'primary' : 'ghost'}`} type="button" onClick={() => setTool(TOOL.TEXT)} disabled={!canWork}>Добавить текст</button>
              <button className={`btn ${tool === TOOL.WHITEOUT ? 'primary' : 'ghost'}`} type="button" onClick={() => setTool(TOOL.WHITEOUT)} disabled={!canWork}>Замазка</button>
              <button className={`btn ${tool === TOOL.HIGHLIGHT ? 'primary' : 'ghost'}`} type="button" onClick={() => setTool(TOOL.HIGHLIGHT)} disabled={!canWork}>Подсветка</button>
              <button className={`btn ${tool === TOOL.IMAGE ? 'primary' : 'ghost'}`} type="button" onClick={() => setTool(TOOL.IMAGE)} disabled={!canWork || !stamp?.dataUrl}>Штамп</button>
              <button className={`btn ${tool === TOOL.SELECT ? 'primary' : 'ghost'}`} type="button" onClick={() => setTool(TOOL.SELECT)} disabled={!canWork}>Навигация</button>
            </div>

            <div className="poly-note-card" style={{ marginTop: 12 }}>
              <div className="poly-note-title">Как редактировать старый текст</div>
              <div className="poly-note-text">
                Выбери <b>Изменить текст</b>, затем кликни по подсвеченному блоку текста на странице. Справа появится текст — меняй его и нажимай <b>Применить замену</b>. Это самый надёжный браузерный способ редактирования PDF без Acrobat.
              </div>
            </div>

            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div className="panel-hint">Выбранный блок:</div>
              {selectedTextBlock ? (
                <>
                  <div style={{ border: '1px solid var(--color-border)', borderRadius: 12, padding: 10, background: 'var(--color-card-bg)' }}>
                    <div className="panel-hint" style={{ marginBottom: 6 }}>Исходный текст:</div>
                    <div style={{ color: 'var(--color-text)', fontWeight: 700 }}>{selectedTextBlock.text}</div>
                  </div>
                  <textarea
                    value={replacementDraft}
                    onChange={(e) => setReplacementDraft(e.target.value)}
                    rows={6}
                    style={{ width: '100%', resize: 'vertical' }}
                    placeholder="Новый текст для этого блока"
                  />
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button className="btn primary" type="button" onClick={applyReplacementFromSelection}>Применить замену</button>
                    <button className="btn ghost" type="button" onClick={() => { setSelectedBlockId(''); setReplacementDraft(''); }}>Снять выбор</button>
                  </div>
                </>
              ) : (
                <div className="panel-hint">Ничего не выбрано. Кликни по текстовому блоку на странице.</div>
              )}
            </div>

            <div style={{ marginTop: 12 }}>
              <div className="panel-hint" style={{ marginBottom: 8 }}>Слои и замены на этой странице:</div>
              {currentLayers.length ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {currentLayers.map((layer) => (
                    <div key={layer.id} style={{ display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'space-between', border: '1px solid var(--color-border)', borderRadius: 12, padding: '8px 10px', background: 'var(--color-card-bg)' }}>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <span className="poly-chip">{layer.kind}</span>
                        <span style={{ color: 'var(--color-text-secondary)', fontWeight: 800 }}>
                          {layer.kind === 'replaceText' || layer.kind === 'text' ? String(layer.text || '').slice(0, 46) : '—'}
                        </span>
                      </div>
                      <button className="btn danger" type="button" onClick={() => removeLayer(layer.id)}>Удалить</button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="panel-hint">Пока нет изменений на этой странице.</div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="poly-card panel poly-preview-panel" style={{ marginTop: 16 }}>
        <div className="panel-head" style={{ marginBottom: 10 }}>
          <h2 className="panel-title">Предпросмотр</h2>
          <div className="panel-hint">Стрелками листай страницы. При режиме «Изменить текст» кликни по нужной фразе.</div>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10, flexWrap: 'wrap' }}>
          <button className="btn ghost" type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={!canWork || page <= 1}>←</button>
          <button className="btn ghost" type="button" onClick={() => setPage((p) => Math.min(pageCount || 1, p + 1))} disabled={!canWork || page >= pageCount}>→</button>
          <b>Страница {page}/{pageCount || 0}</b>
          <input
            type="number"
            min={1}
            max={pageCount || 1}
            value={pageJump}
            onChange={(e) => setPageJump(e.target.value)}
            style={{ width: 86 }}
          />
          <button className="btn ghost" type="button" onClick={() => setPage(Math.max(1, Math.min(Number(pageJump) || 1, pageCount || 1)))} disabled={!canWork}>Перейти</button>
          <button className="btn ghost" type="button" onClick={() => setZoom((z) => Math.max(0.75, Math.round((z - 0.1) * 100) / 100))} disabled={!canWork}>−</button>
          <span className="poly-chip">Zoom {Math.round(zoom * 100)}%</span>
          <button className="btn ghost" type="button" onClick={() => setZoom((z) => Math.min(1.8, Math.round((z + 0.1) * 100) / 100))} disabled={!canWork}>+</button>
          <button className="btn ghost" type="button" onClick={() => setZoom(1)} disabled={!canWork}>Fit</button>
        </div>

        <div ref={wrapRef} style={{ width: '100%', overflow: 'auto', borderRadius: 16, border: '1px solid var(--color-border)', background: '#0b1220', padding: 12 }}>
          <div style={{ position: 'relative', width: canvasBox.width || '100%', height: canvasBox.height || 420, margin: '0 auto' }}>
            <canvas
              ref={canvasRef}
              onPointerDown={onCanvasPointerDown}
              onPointerUp={onCanvasPointerUp}
              style={{ display: 'block', background: '#fff', borderRadius: 10 }}
            />

            {canWork ? (
              <div style={{ position: 'absolute', inset: 0 }}>
                {tool === TOOL.REPLACE ? (blockSearch ? filteredTextBlocks : currentTextBlocks).map((block) => {
                  const active = selectedBlockId === block.id;
                  return (
                    <button
                      key={block.id}
                      type="button"
                      title={block.text}
                      onClick={() => {
                        setSelectedBlockId(block.id);
                        const existing = currentLayers.find((l) => l.kind === 'replaceText' && l.sourceId === block.id);
                        setReplacementDraft(existing?.text || block.text);
                      }}
                      style={{
                        position: 'absolute',
                        left: block.x,
                        top: block.y,
                        width: block.w,
                        height: block.h,
                        borderRadius: 4,
                        border: active ? '2px solid rgba(37,99,235,0.9)' : '1px dashed rgba(37,99,235,0.4)',
                        background: active ? 'rgba(37,99,235,0.18)' : 'rgba(37,99,235,0.06)',
                        cursor: 'pointer',
                        padding: 0,
                      }}
                    />
                  );
                }) : null}

                {currentLayers.filter((l) => l.kind === 'whiteout' || l.kind === 'highlight').map((layer) => (
                  <div
                    key={layer.id}
                    style={{
                      position: 'absolute',
                      left: layer.x,
                      top: layer.y,
                      width: layer.w,
                      height: layer.h,
                      background: layer.kind === 'highlight' ? 'rgba(250,204,21,0.25)' : 'rgba(255,255,255,0.85)',
                      border: layer.kind === 'highlight' ? '1px solid rgba(120,53,15,0.35)' : '1px dashed rgba(148,163,184,0.5)',
                      borderRadius: 4,
                      pointerEvents: 'none',
                    }}
                  />
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

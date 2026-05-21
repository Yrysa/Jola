import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import * as mammoth from 'mammoth/mammoth.browser';
import {
  AlignmentType,
  BorderStyle,
  Document as DocxDocument,
  HeadingLevel,
  ImageRun,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';
import ReactQuill from 'react-quill';
import DOMPurify from 'dompurify';
import 'react-quill/dist/quill.snow.css';

import { PolyApi } from '../api';
import { useAuth } from '../../context/AuthContext.jsx';
import { useTranslation } from 'react-i18next';
import EditorActionBar from '../components/EditorActionBar.jsx';
import './PolygraphyPages.css';
const LOCAL_DRAFT_PREFIX = 'jola-docx-draft:v2';
const DRAFT_TTL_MS = 5 * 60 * 1000;

const cssColorToDocx = (v) => {
  const s = String(v || '').trim();
  if (!s) return null;
  const m = s.match(/rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/i);
  if (m) {
    const r = Math.max(0, Math.min(255, Number(m[1] || 0)));
    const g = Math.max(0, Math.min(255, Number(m[2] || 0)));
    const b = Math.max(0, Math.min(255, Number(m[3] || 0)));
    return [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('').toUpperCase();
  }
  if (s.startsWith('#')) {
    const hex = s.slice(1);
    if (hex.length === 3) return hex.split('').map((c) => `${c}${c}`).join('').toUpperCase();
    if (hex.length === 6) return hex.toUpperCase();
  }
  return null;
};

const cssFontSizeToHalfPoints = (v) => {
  const s = String(v || '').trim().toLowerCase();
  if (!s) return null;
  const mPx = s.match(/(\d+(?:\.\d+)?)px/);
  if (mPx) {
    const px = Number(mPx[1]);
    const pt = px * 0.75;
    return Math.max(16, Math.min(72, Math.round(pt * 2)));
  }
  const mPt = s.match(/(\d+(?:\.\d+)?)pt/);
  if (mPt) {
    const pt = Number(mPt[1]);
    return Math.max(16, Math.min(72, Math.round(pt * 2)));
  }
  if (s === 'small') return 18;
  if (s === 'large') return 28;
  if (s === 'huge') return 40;
  return null;
};

const dataUrlToUint8 = (dataUrl) => {
  try {
    const s = String(dataUrl || '');
    const idx = s.indexOf('base64,');
    if (idx < 0) return null;
    const b64 = s.slice(idx + 7);
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  } catch {
    return null;
  }
};

const htmlToPlainText = (html) => {
  const tmp = document.createElement('div');
  tmp.innerHTML = String(html || '');
  return (tmp.textContent || tmp.innerText || '').replace(/\r\n/g, '\n');
};

const FORBIDDEN_EDITOR_TAGS = new Set(['script', 'style', 'iframe', 'frame', 'object', 'embed', 'link', 'meta', 'base', 'form', 'input', 'button', 'textarea', 'select']);
const ALLOWED_EDITOR_TAGS = new Set([
  'p', 'br', 'div', 'span', 'strong', 'b', 'em', 'i', 'u', 's', 'strike', 'del',
  'blockquote', 'pre', 'code', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li', 'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
  'a', 'img'
]);
const ALLOWED_EDITOR_CLASSES = new Set([
  'ql-align-center', 'ql-align-right', 'ql-align-justify',
  'ql-size-small', 'ql-size-large', 'ql-size-huge',
  'ql-direction-rtl', 'ql-font-monospace', 'ql-font-serif'
]);
const ALLOWED_STYLE_PROPS = new Set([
  'color', 'background-color', 'text-align', 'font-size', 'font-weight', 'font-style', 'text-decoration',
  'width', 'height', 'min-width', 'margin', 'padding', 'border', 'border-collapse', 'vertical-align'
]);

const isSafeLinkHref = (value) => {
  const s = String(value || '').trim();
  if (!s) return false;
  if (s.startsWith('#') || s.startsWith('/') || s.startsWith('?')) return true;
  return /^(https?:|mailto:|tel:)/i.test(s);
};

const isSafeImageSrc = (value) => {
  const s = String(value || '').trim();
  if (!s) return false;
  if (s.startsWith('/') || /^blob:/i.test(s) || /^https?:/i.test(s)) return true;
  return /^data:image\/(png|jpe?g|gif|webp|bmp|svg\+xml);base64,/i.test(s);
};

const sanitizeEditorClassName = (value) => String(value || '')
  .split(/\s+/)
  .map((token) => token.trim())
  .filter(Boolean)
  .filter((token) => ALLOWED_EDITOR_CLASSES.has(token))
  .join(' ');

const sanitizeInlineStyle = (value) => {
  const out = [];
  String(value || '')
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .forEach((part) => {
      const idx = part.indexOf(':');
      if (idx === -1) return;
      const prop = part.slice(0, idx).trim().toLowerCase();
      const rawValue = part.slice(idx + 1).trim();
      const normalizedValue = rawValue.toLowerCase();
      if (!ALLOWED_STYLE_PROPS.has(prop) || !rawValue) return;
      if (
        normalizedValue.includes('expression(') ||
        normalizedValue.includes('javascript:') ||
        normalizedValue.includes('url(') ||
        normalizedValue.includes('@import')
      ) return;
      out.push(`${prop}: ${rawValue}`);
    });
  return out.join('; ');
};

let domPurifyHooksBound = false;

const ensureDomPurifyHooks = () => {
  if (domPurifyHooksBound) return;

  DOMPurify.addHook('uponSanitizeAttribute', (node, data) => {
    const tag = String(node?.tagName || '').toLowerCase();
    const attrName = String(data?.attrName || '').toLowerCase();
    const attrValue = String(data?.attrValue || '');

    if (attrName.startsWith('on')) {
      data.keepAttr = false;
      return;
    }

    if (attrName === 'class') {
      const safeClassName = sanitizeEditorClassName(attrValue);
      if (safeClassName) {
        data.attrValue = safeClassName;
      } else {
        data.keepAttr = false;
      }
      return;
    }

    if (attrName === 'style') {
      const safeStyle = sanitizeInlineStyle(attrValue);
      if (safeStyle) {
        data.attrValue = safeStyle;
      } else {
        data.keepAttr = false;
      }
      return;
    }

    if (attrName === 'href' && tag === 'a' && !isSafeLinkHref(attrValue)) {
      data.keepAttr = false;
      return;
    }

    if (attrName === 'src' && tag === 'img' && !isSafeImageSrc(attrValue)) {
      data.keepAttr = false;
      return;
    }

    if ((attrName === 'width' || attrName === 'height') && tag === 'img') {
      const num = Math.max(1, Math.min(4000, Number(attrValue)));
      if (Number.isFinite(num)) {
        data.attrValue = String(Math.round(num));
      } else {
        data.keepAttr = false;
      }
      return;
    }

    if ((attrName === 'colspan' || attrName === 'rowspan') && ['td', 'th'].includes(tag)) {
      const span = Math.max(1, Math.min(20, Number(attrValue)));
      if (Number.isFinite(span)) {
        data.attrValue = String(Math.round(span));
      } else {
        data.keepAttr = false;
      }
    }
  });

  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (!node || node.nodeType !== Node.ELEMENT_NODE) return;
    const tag = String(node.tagName || '').toLowerCase();

    if (tag === 'a') {
      const href = node.getAttribute('href');
      if (!isSafeLinkHref(href)) {
        node.removeAttribute('href');
      }
      if (node.getAttribute('target') === '_blank') {
        node.setAttribute('rel', 'noopener noreferrer');
      }
    }

    if (tag === 'img') {
      const src = node.getAttribute('src');
      if (!isSafeImageSrc(src)) {
        node.remove();
      }
      const alt = String(node.getAttribute('alt') || '').slice(0, 300);
      if (alt) node.setAttribute('alt', alt);
      else node.removeAttribute('alt');
    }
  });

  domPurifyHooksBound = true;
};

const cloneSanitizedEditorNode = (node, doc) => {
  if (node.nodeType === Node.TEXT_NODE) {
    return doc.createTextNode(node.textContent || '');
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return null;

  const tag = String(node.tagName || '').toLowerCase();
  if (FORBIDDEN_EDITOR_TAGS.has(tag)) return null;

  const appendChildren = (parent) => {
    Array.from(node.childNodes || []).forEach((child) => {
      const safeChild = cloneSanitizedEditorNode(child, doc);
      if (safeChild) parent.appendChild(safeChild);
    });
  };

  if (!ALLOWED_EDITOR_TAGS.has(tag)) {
    const fragment = doc.createDocumentFragment();
    appendChildren(fragment);
    return fragment;
  }

  const el = doc.createElement(tag);

  Array.from(node.attributes || []).forEach((attr) => {
    const name = String(attr.name || '').toLowerCase();
    const value = String(attr.value || '').trim();

    if (!value || name.startsWith('on')) return;

    if (name === 'class') {
      const safeClassName = sanitizeEditorClassName(value);
      if (safeClassName) el.setAttribute('class', safeClassName);
      return;
    }

    if (name === 'style') {
      const safeStyle = sanitizeInlineStyle(value);
      if (safeStyle) el.setAttribute('style', safeStyle);
      return;
    }

    if (name === 'href' && tag === 'a' && isSafeLinkHref(value)) {
      el.setAttribute('href', value);
      if (node.getAttribute('target') === '_blank') {
        el.setAttribute('target', '_blank');
        el.setAttribute('rel', 'noopener noreferrer');
      }
      return;
    }

    if (name === 'src' && tag === 'img' && isSafeImageSrc(value)) {
      el.setAttribute('src', value);
      return;
    }

    if (name === 'alt' && tag === 'img') {
      el.setAttribute('alt', value.slice(0, 300));
      return;
    }

    if ((name === 'width' || name === 'height') && tag === 'img') {
      const num = Math.max(1, Math.min(4000, Number(value)));
      if (Number.isFinite(num)) el.setAttribute(name, String(Math.round(num)));
      return;
    }

    if ((name === 'colspan' || name === 'rowspan') && ['td', 'th'].includes(tag)) {
      const span = Math.max(1, Math.min(20, Number(value)));
      if (Number.isFinite(span)) el.setAttribute(name, String(Math.round(span)));
    }
  });

  appendChildren(el);
  return el;
};

const sanitizeEditorHtml = (input) => {
  ensureDomPurifyHooks();
  const cleaned = DOMPurify.sanitize(String(input || ''), {
    ALLOWED_TAGS: [...ALLOWED_EDITOR_TAGS],
    FORBID_TAGS: [...FORBIDDEN_EDITOR_TAGS],
    ALLOWED_ATTR: ['class', 'style', 'href', 'target', 'rel', 'src', 'alt', 'width', 'height', 'colspan', 'rowspan'],
    KEEP_CONTENT: true,
    RETURN_TRUSTED_TYPE: false,
  });
  const normalized = String(cleaned || '').trim();
  return normalized || '<p></p>';
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

const getAlignment = (element) => {
  const cls = String(element?.className || '');
  const style = String(element?.getAttribute?.('style') || '').toLowerCase();
  if (cls.includes('ql-align-center') || style.includes('text-align: center')) return AlignmentType.CENTER;
  if (cls.includes('ql-align-right') || style.includes('text-align: right')) return AlignmentType.RIGHT;
  if (cls.includes('ql-align-justify') || style.includes('text-align: justify')) return AlignmentType.JUSTIFIED;
  return AlignmentType.LEFT;
};

const inlineRunsFromNode = (node, style = {}) => {
  if (!node) return [];

  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent ?? '';
    if (!text) return [];
    return [new TextRun({
      text,
      bold: !!style.bold,
      italics: !!style.italics,
      underline: style.underline ? {} : undefined,
      strike: !!style.strike,
      color: style.color || undefined,
      highlight: style.highlight || undefined,
      size: style.size || undefined,
    })];
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return [];

  const tag = String(node.tagName || '').toLowerCase();
  if (tag === 'br') return [new TextRun({ break: 1 })];

  if (tag === 'img') {
    const src = node.getAttribute?.('src') || '';
    const data = dataUrlToUint8(src);
    if (!data) return [];
    const w = Math.max(160, Math.min(640, Number(node.getAttribute?.('width') || 420)));
    const h = Math.max(120, Math.min(520, Number(node.getAttribute?.('height') || 260)));
    return [new ImageRun({ data, transformation: { width: w, height: h } })];
  }

  const rawStyle = String(node.getAttribute?.('style') || '');
  const styleMap = rawStyle.split(';').map((p) => p.trim()).filter(Boolean)
    .reduce((acc, part) => {
      const [k, v] = part.split(':').map((x) => String(x || '').trim().toLowerCase());
      if (k) acc[k] = v;
      return acc;
    }, {});

  const nextStyle = {
    ...style,
    bold: style.bold || tag === 'strong' || tag === 'b',
    italics: style.italics || tag === 'em' || tag === 'i',
    underline: style.underline || tag === 'u',
    strike: style.strike || tag === 's' || tag === 'strike' || tag === 'del',
    color: style.color || cssColorToDocx(styleMap.color),
    highlight: style.highlight || null,
    size: style.size || cssFontSizeToHalfPoints(styleMap['font-size']),
  };

  return Array.from(node.childNodes || []).flatMap((child) => inlineRunsFromNode(child, nextStyle));
};

const paragraphFromElement = (el, extra = {}) => {
  const runs = Array.from(el.childNodes || []).flatMap((child) => inlineRunsFromNode(child));
  const children = runs.length ? runs : [new TextRun({ text: ' ' })];
  return new Paragraph({
    ...extra,
    alignment: extra.alignment || getAlignment(el),
    spacing: extra.spacing || { after: 160 },
    children,
  });
};

const buildDocxFromHtml = async (html) => {
  const parser = new DOMParser();
  const docDom = parser.parseFromString(`<div id="root">${String(html || '').trim() || '<p></p>'}</div>`, 'text/html');
  const root = docDom.getElementById('root') || docDom.body;

  const children = [];
  const numbering = {
    config: [
      {
        reference: 'jola-bullet',
        levels: [
          {
            level: 0,
            format: 'bullet',
            text: '•',
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 260 } } },
          },
        ],
      },
      {
        reference: 'jola-number',
        levels: [
          {
            level: 0,
            format: 'decimal',
            text: '%1.',
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 260 } } },
          },
        ],
      },
    ],
  };

  const pushList = (listEl, ordered) => {
    const items = Array.from(listEl.children || []).filter((child) => String(child.tagName || '').toLowerCase() === 'li');
    if (!items.length) return;
    items.forEach((li) => {
      const runs = Array.from(li.childNodes || []).flatMap((child) => inlineRunsFromNode(child));
      children.push(new Paragraph({
        children: runs.length ? runs : [new TextRun({ text: ' ' })],
        numbering: { reference: ordered ? 'jola-number' : 'jola-bullet', level: 0 },
        spacing: { after: 80 },
      }));
    });
  };

  Array.from(root.childNodes || []).forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = String(node.textContent || '').trim();
      if (text) children.push(new Paragraph({ children: [new TextRun(text)] }));
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const tag = String(node.tagName || '').toLowerCase();

    if (tag === 'h1' || tag === 'h2' || tag === 'h3') {
      const heading = tag === 'h1' ? HeadingLevel.HEADING_1 : tag === 'h2' ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_3;
      children.push(paragraphFromElement(node, { heading, spacing: { before: 120, after: 120 } }));
      return;
    }
    if (tag === 'ul' || tag === 'ol') {
      pushList(node, tag === 'ol');
      return;
    }
    if (tag === 'table') {
      const rows = Array.from(node.querySelectorAll('tr'));
      if (!rows.length) return;
      const tableRows = rows.map((tr) => {
        const cells = Array.from(tr.querySelectorAll('th,td'));
        const docCells = (cells.length ? cells : [tr]).map((td) => {
          const cellParas = [];
          const kids = Array.from(td.childNodes || []);
          if (!kids.length) {
            cellParas.push(new Paragraph({ children: [new TextRun(' ')] }));
          } else {
            kids.forEach((k) => {
              if (k.nodeType === Node.ELEMENT_NODE) {
                const t = String(k.tagName || '').toLowerCase();
                if (t === 'p' || t === 'div') cellParas.push(paragraphFromElement(k));
                else cellParas.push(paragraphFromElement(td));
              } else if (k.nodeType === Node.TEXT_NODE) {
                const text = String(k.textContent || '').trim();
                if (text) cellParas.push(new Paragraph({ children: [new TextRun(text)] }));
              }
            });
          }
          return new TableCell({
            width: { size: 100 / Math.max(1, cells.length || 1), type: WidthType.PERCENTAGE },
            children: cellParas,
          });
        });
        return new TableRow({ children: docCells });
      });

      children.push(new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: tableRows,
        borders: {
          top: { style: BorderStyle.SINGLE, size: 1, color: 'C9CED6' },
          bottom: { style: BorderStyle.SINGLE, size: 1, color: 'C9CED6' },
          left: { style: BorderStyle.SINGLE, size: 1, color: 'C9CED6' },
          right: { style: BorderStyle.SINGLE, size: 1, color: 'C9CED6' },
          insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: 'E3E7EE' },
          insideVertical: { style: BorderStyle.SINGLE, size: 1, color: 'E3E7EE' },
        },
      }));
      children.push(new Paragraph({ children: [new TextRun({ text: ' ' })] }));
      return;
    }
    if (tag === 'blockquote') {
      children.push(paragraphFromElement(node, { spacing: { after: 160 }, indent: { left: 420 } }));
      return;
    }
    if (tag === 'p' || tag === 'div') {
      children.push(paragraphFromElement(node));
    }
  });

  const doc = new DocxDocument({
    numbering,
    sections: [{ properties: {}, children: children.length ? children : [new Paragraph(' ')] }],
  });

  return Packer.toBlob(doc);
};

const quillModules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    [{ size: ['small', false, 'large', 'huge'] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ color: [] }, { background: [] }],
    [{ list: 'ordered' }, { list: 'bullet' }],
    [{ align: [] }],
    ['link', 'image'],
    ['clean'],
  ],
  history: { delay: 400, maxStack: 100, userOnly: true },
};

const quillFormats = [
  'header',
  'size',
  'bold', 'italic', 'underline', 'strike',
  'color', 'background',
  'list', 'bullet',
  'align',
  'link', 'image',
];

export default function OfficeEditorPage() {
  const { user } = useAuth();
  const { i18n } = useTranslation();
  const isRu = (i18n.language || 'ru').toLowerCase().startsWith('ru');
  const navigate = useNavigate();

  const quillRef = useRef(null);
  const ownerKey = String(user?.id || user?._id || user?.email || 'guest');
  const draftKey = `${LOCAL_DRAFT_PREFIX}:${ownerKey}`;

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fileName, setFileName] = useState('document.docx');
  const [html, setHtml] = useState('');
  const [dirty, setDirty] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState(null);

  const plainText = useMemo(() => htmlToPlainText(html), [html]);
  const wordCount = useMemo(() => String(plainText || '').trim().split(/\s+/).filter(Boolean).length, [plainText]);
  const charCount = useMemo(() => String(plainText || '').replace(/\s+/g, '').length, [plainText]);
  const readingMinutes = useMemo(() => Math.max(1, Math.ceil(wordCount / 180)), [wordCount]);

  useEffect(() => {
    if (!user) return;
    try {
      const now = Date.now();
      const staleKeys = [];
      for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i);
        if (!key || !key.startsWith(LOCAL_DRAFT_PREFIX)) continue;
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        try {
          const parsed = JSON.parse(raw);
          if (!parsed?.updatedAt || now - Number(parsed.updatedAt) > DRAFT_TTL_MS) {
            staleKeys.push(key);
          }
        } catch {
          staleKeys.push(key);
        }
      }
      staleKeys.forEach((key) => localStorage.removeItem(key));

      const saved = localStorage.getItem(draftKey);
      if (!saved) return;
      const parsed = JSON.parse(saved);
      if (!parsed?.html || !parsed?.updatedAt) {
        localStorage.removeItem(draftKey);
        return;
      }
      if (now - Number(parsed.updatedAt) > DRAFT_TTL_MS) {
        localStorage.removeItem(draftKey);
        return;
      }
      setHtml(sanitizeEditorHtml(parsed.html || '<p></p>'));
      setFileName(String(parsed.fileName || 'document.docx'));
      setDirty(true);
      setLastSavedAt(Number(parsed.updatedAt || Date.now()));
    } catch {
    }
  }, [draftKey, user]);

  const insertTable = () => {
    const q = quillRef.current?.getEditor?.();
    if (!q) return;
    const rows = Math.max(1, Math.min(12, Number(window.prompt('Rows (1-12)', '3') || 3)));
    const cols = Math.max(1, Math.min(8, Number(window.prompt('Cols (1-8)', '3') || 3)));
    const td = '<td style="border:1px solid #cfd6e1; padding:8px; min-width:60px">&nbsp;</td>';
    const tr = `<tr>${Array.from({ length: cols }).map(() => td).join('')}</tr>`;
    const tableHtml = `
      <table style="border-collapse:collapse; width:100%; margin:12px 0;">
        ${Array.from({ length: rows }).map(() => tr).join('')}
      </table>
      <p><br/></p>
    `;
    const range = q.getSelection(true);
    q.clipboard.dangerouslyPasteHTML(range ? range.index : q.getLength(), sanitizeEditorHtml(tableHtml));
    setDirty(true);
    toast.success('Table inserted');
  };

  const insertImage = async (file) => {
    try {
      const q = quillRef.current?.getEditor?.();
      if (!q || !file) return;
      if (!/^image\
      const dataUrl = await new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result || ''));
        r.onerror = () => reject(new Error('Failed to read image'));
        r.readAsDataURL(file);
      });
      const range = q.getSelection(true);
      q.insertEmbed(range ? range.index : q.getLength(), 'image', dataUrl, 'user');
      q.setSelection((range ? range.index : q.getLength()) + 1, 0);
      setDirty(true);
      toast.success('Image inserted');
    } catch (e) {
      toast.error(e?.message || 'Image error');
    }
  };

  useEffect(() => {
    if (!dirty || !user) return;
    const t = setTimeout(() => {
      try {
        const now = Date.now();
        localStorage.setItem(draftKey, JSON.stringify({
          ownerKey,
          fileName,
          html: html || '',
          updatedAt: now,
        }));
        setLastSavedAt(now);
      } catch {
      }
    }, 250);
    return () => clearTimeout(t);
  }, [dirty, draftKey, fileName, html, ownerKey, user]);

  useEffect(() => {
    if (!dirty || !user) return;
    const intervalId = window.setInterval(() => {
      try {
        const raw = localStorage.getItem(draftKey);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (!parsed?.updatedAt || Date.now() - Number(parsed.updatedAt) <= DRAFT_TTL_MS) return;
        localStorage.removeItem(draftKey);
        setHtml('<p></p>');
        setFileName('document.docx');
        setDirty(false);
    setLastSavedAt(null);
        toast.error(isRu ? 'Черновик удалён после 5 минут бездействия' : 'Draft was deleted after 5 minutes of inactivity');
      } catch {
      }
    }, 30000);
    return () => window.clearInterval(intervalId);
  }, [dirty, draftKey, isRu, user]);

  const onPickFile = async (file) => {
    setError('');
    if (!file) return;
    const name = String(file.name || 'document.docx');
    setFileName(name);

    try {
      const ab = await file.arrayBuffer();
      const out = await mammoth.convertToHtml({ arrayBuffer: ab });
      const nextHtml = sanitizeEditorHtml(String(out?.value || '').trim() || '<p></p>');
      setHtml(nextHtml);
      setDirty(true);
      toast.success('DOCX открыт в редакторе');
    } catch (e) {
      setError(e?.message || 'Не удалось открыть DOCX');
    }
  };

  const buildDocxFile = async () => {
    const blob = await buildDocxFromHtml(html || '<p></p>');
    const base = String(fileName || 'document.docx').replace(/\.[^.]+$/i, '');
    const outName = `${base}_edited.docx`;
    const outFile = new File([blob], outName, {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    return { blob, outFile, outName };
  };

  const onDownload = async () => {
    setBusy(true);
    setError('');
    try {
      const { blob, outName } = await buildDocxFile();
      downloadBlob(blob, outName);
      try {
        localStorage.removeItem(draftKey);
      } catch {
      }
      setDirty(false);
      setLastSavedAt(Date.now());
      toast.success('DOCX скачан');
    } catch (e) {
      setError(e?.message || 'Ошибка скачивания');
    } finally {
      setBusy(false);
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
      const { outFile } = await buildDocxFile();
      const uploaded = await PolyApi.uploadFiles('document-print', [outFile]);
      const saved = uploaded?.[0];
      if (!saved?._id) throw new Error('Не удалось загрузить файл на сервер');
      const draft = {
        options: { format: 'A4', color: 'bw', sides: 'single', copies: 1 },
        fileIds: [saved._id],
        files: [saved],
      };
      try {
        localStorage.removeItem(draftKey);
      } catch {
      }
      setDirty(false);
      setLastSavedAt(Date.now());
      navigate('/polygraphy/document-print', { state: { draft } });
    } catch (e) {
      setError(e?.message || 'Ошибка');
    } finally {
      setBusy(false);
    }
  };

  const insertSnippet = (snippetHtml) => {
    const chunk = String(snippetHtml || '').trim();
    if (!chunk) return;
    const editor = quillRef.current?.getEditor?.();
    if (editor) {
      const range = editor.getSelection(true);
      const index = typeof range?.index === 'number' ? range.index : editor.getLength();
      editor.clipboard.dangerouslyPasteHTML(index, sanitizeEditorHtml(chunk));
      editor.setSelection(index + 1, 0);
    } else {
      setHtml((prev) => sanitizeEditorHtml(`${String(prev || '<p></p>')}${chunk}`));
    }
    setDirty(true);
  };

  const draftStatusLabel = lastSavedAt
    ? (isRu ? `Черновик сохранён: ${new Date(lastSavedAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}` : `Draft saved: ${new Date(lastSavedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`)
    : (isRu ? 'Черновик ещё не сохранён' : 'Draft has not been saved yet');

  const DOCX_SNIPPETS = [
    {
      title: isRu ? 'Коммерческое предложение' : 'Commercial offer',
      html: '<h2>Коммерческое предложение</h2><p>Компания Jola предлагает поставку техники и печатных услуг на гибких условиях.</p><ul><li>Срок поставки: 1–3 дня</li><li>Оплата: безналичный расчёт / карта / Kaspi</li><li>Поддержка: WhatsApp / Telegram</li></ul>',
    },
    {
      title: isRu ? 'Счёт / инвойс' : 'Invoice block',
      html: '<h2>Счёт</h2><p>Поставщик: Jola Store &amp; Print</p><table><tr><th>Наименование</th><th>Кол-во</th><th>Цена</th></tr><tr><td>Товар / услуга</td><td>1</td><td>0 ₸</td></tr></table><p><strong>Итого:</strong> 0 ₸</p>',
    },
    {
      title: isRu ? 'Блок подписи' : 'Signature block',
      html: '<p><br/></p><p>______________________________</p><p>Подпись / Signature</p><p>Дата: _________________________</p>',
    },
    {
      title: isRu ? 'Договор / условия' : 'Agreement / terms',
      html: '<h2>Условия сотрудничества</h2><ol><li>Предмет поставки согласуется в счёте.</li><li>Срок исполнения: 1–3 рабочих дня.</li><li>Оплата: Freedom Pay / Kaspi / Stripe / PayPal.</li><li>Поддержка: Telegram, WhatsApp, Email.</li></ol>',
    },
    {
      title: isRu ? 'Чек-лист печати' : 'Print checklist',
      html: '<h2>Чек-лист перед печатью</h2><ul><li>Проверь ФИО и реквизиты</li><li>Убедись, что формат бумаги выбран верно</li><li>Проверь количество копий</li><li>Сохрани финальную версию документа</li></ul>',
    },
  ];

  const onNew = () => {
    setError('');
    setFileName('document.docx');
    setHtml('<p></p>');
    setDirty(false);
    try {
      localStorage.removeItem(draftKey);
    } catch {
    }
    toast.success('Новый документ');
  };

  return (
    <div className="container poly-page">
      <div className="poly-topbar">
        <Link to="/polygraphy/editor" className="poly-back">← Назад</Link>
        <div className="poly-breadcrumb">Главная / Полиграфия / Редакторы / DOCX</div>
      </div>

      <div className="poly-service-head">
        <div>
          <h1 className="poly-title">Офисный редактор Jola (DOCX)</h1>
          <p className="poly-subtitle">
            Полностью встроенный редактор: открой DOCX, отредактируй и скачай. Кнопка «Печать в Jola» отправит файл в конфигуратор печати.
          </p>
        </div>
        <div className="poly-service-tags" aria-hidden="true">
          <span className="poly-chip">DOCX</span>
          <span className="poly-chip">WYSIWYG</span>
          <span className="poly-chip">{isRu ? 'Скачать' : 'Download'}</span>
          <span className="poly-chip">{isRu ? 'Печать в Jola' : 'Print in Jola'}</span>
        </div>
      </div>

      {error ? <div className="poly-error">{error}</div> : null}

      <div style={{ marginTop: '0.8rem' }}>
        <EditorActionBar
          busy={busy}
          onDownload={onDownload}
          onPrintInJola={onSendToPrint}
          onNew={onNew}
          downloadLabel={busy ? (isRu ? 'Подготовка…' : 'Preparing…') : (isRu ? 'Скачать' : 'Download')}
          printLabel={isRu ? "Печать в Jola" : "Print in Jola"}
          newLabel={isRu ? "Новый" : "New"}
          extra={(
            <>
              <button
                type="button"
                className="ea-btn ea-btn--ghost"
                onClick={insertTable}
                disabled={busy}
                title={isRu ? 'Вставить таблицу' : 'Insert table'}
              >
                <span className="ea-ico" aria-hidden="true">▦</span>
                <span className="ea-text">{isRu ? "Таблица" : "Table"}</span>
              </button>

              <label className="ea-btn ea-btn--ghost" style={{ cursor: busy ? 'not-allowed' : 'pointer' }}>
                <span className="ea-ico" aria-hidden="true">🖼️</span>
                <span className="ea-text">{isRu ? "Изображение" : "Image"}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => insertImage(e.target.files?.[0] || null)}
                  disabled={busy}
                  style={{ display: 'none' }}
                />
              </label>

              <label className="ea-btn ea-btn--ghost" style={{ cursor: busy ? 'not-allowed' : 'pointer' }}>
                <span className="ea-ico" aria-hidden="true">📄</span>
                <span className="ea-text">Open DOCX</span>
                <input
                  type="file"
                  accept=".docx"
                  onChange={(e) => onPickFile(e.target.files?.[0] || null)}
                  disabled={busy}
                  style={{ display: 'none' }}
                />
              </label>
            </>
          )}
        />
      </div>

      <div className="poly-config" style={{ marginTop: 12 }}>
        <div className="poly-config-grid poly-config-grid--editor">
          <div className="poly-card panel">
            <div className="panel-head">
              <div>
                <h2 className="panel-title">{isRu ? 'Быстрые блоки DOCX' : 'DOCX quick blocks'}</h2>
                <div className="panel-hint">{isRu ? 'Шаблонные секции для предложений, счетов и документов.' : 'Template sections for offers, invoices, and internal docs.'}</div>
              </div>
              <span className="poly-chip">DOCX</span>
            </div>

            <div className="docx-snippet-grid">
              {DOCX_SNIPPETS.map((snippet) => (
                <button key={snippet.title} type="button" className="docx-snippet-card" onClick={() => insertSnippet(snippet.html)}>
                  <strong>{snippet.title}</strong>
                  <span>{isRu ? 'Вставить в документ' : 'Insert into document'}</span>
                </button>
              ))}
            </div>

            <div className="poly-note-card" style={{ marginTop: 12 }}>
              <div className="poly-note-title">{isRu ? 'Статус документа' : 'Document status'}</div>
              <div className="docx-stats-grid">
                <div className="docx-stat-box"><strong>{wordCount}</strong><span>{isRu ? 'слов' : 'words'}</span></div>
                <div className="docx-stat-box"><strong>{charCount}</strong><span>{isRu ? 'символов' : 'chars'}</span></div>
                <div className="docx-stat-box"><strong>{readingMinutes}</strong><span>{isRu ? 'мин чтения' : 'min read'}</span></div>
                <div className="docx-stat-box"><strong>{dirty ? (isRu ? 'Да' : 'Yes') : (isRu ? 'Нет' : 'No')}</strong><span>{isRu ? 'есть черновик' : 'draft'}</span></div>
                <div className="docx-stat-box docx-stat-box--file"><strong>{fileName}</strong><span>{isRu ? 'файл' : 'file'}</span></div>
              </div>
              <div className="panel-hint" style={{ marginTop: 10 }}>{draftStatusLabel}</div>
            </div>
          </div>

          <div className="poly-card panel" style={{ padding: 12 }}>
            <div className="panel-head" style={{ marginBottom: 10 }}>
              <h2 className="panel-title">Редактор</h2>
              <div className="panel-hint">Слова: <b>{wordCount}</b> • {isRu ? `чтение ~${readingMinutes} мин` : `~${readingMinutes} min read`} {dirty ? (isRu ? '• есть несохранённые изменения (черновик хранится локально 5 минут)' : '• unsaved changes (draft stored locally for 5 minutes)') : ''}</div>
            </div>

            <div className="docx-editor-shell">
              <ReactQuill
                ref={quillRef}
                theme="snow"
                value={html || '<p></p>'}
                onChange={(next) => {
                  setHtml(sanitizeEditorHtml(next));
                  setDirty(true);
                }}
                modules={quillModules}
                formats={quillFormats}
                style={{ height: '68vh' }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

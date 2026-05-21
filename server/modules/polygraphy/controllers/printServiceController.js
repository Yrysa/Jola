import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

import PrintService from '../models/PrintService.js';
import UploadFile from '../models/UploadFile.js';
import { createError } from '../../../middleware/errorHandler.js';
import { calcDocumentPrint } from '../pricing/documentPrint.js';
import { buildProtectedUploadUrl, deleteUploadRecordAndFile, resolveUploadAbsolutePath } from '../../../utils/orderLifecycle.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPLOADS_DIR = path.join(__dirname, '../../../uploads');
const TEMP_DIR = path.join(UPLOADS_DIR, 'temp');
const TEMP_SERVICES_DIR = path.join(TEMP_DIR, 'services');

const ensureDir = async (p) => {
  await fs.mkdir(p, { recursive: true }).catch(() => {});
};

const extOf = (filename = '') => {
  const x = path.extname(filename).toLowerCase();
  return x.startsWith('.') ? x.slice(1) : x;
};

const ALLOWED_EXTS = new Set([
  'pdf', 'docx', 'doc', 'xlsx', 'xls', 'pptx', 'txt', 'rtf',
  'jpg', 'jpeg', 'png', 'tiff', 'tif', 'bmp', 'gif',
  'psd', 'ai', 'eps', 'cdr', 'dwg', 'dxf',
]);

const ALLOWED_MIME_BY_EXT = {
  pdf: ['application/pdf'],
  docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/zip'],
  xlsx: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/zip'],
  pptx: ['application/vnd.openxmlformats-officedocument.presentationml.presentation', 'application/zip'],
  doc: ['application/msword', 'application/octet-stream'],
  xls: ['application/vnd.ms-excel', 'application/octet-stream'],
  rtf: ['application/rtf', 'text/rtf', 'application/octet-stream'],
  txt: ['text/plain', 'application/octet-stream'],
  jpg: ['image/jpeg'],
  jpeg: ['image/jpeg'],
  png: ['image/png'],
  gif: ['image/gif'],
  bmp: ['image/bmp'],
  tif: ['image/tiff'],
  tiff: ['image/tiff'],
  psd: ['image/vnd.adobe.photoshop', 'application/octet-stream'],
  ai: ['application/postscript', 'application/pdf', 'application/octet-stream'],
  eps: ['application/postscript', 'application/eps', 'application/octet-stream'],
  cdr: ['application/octet-stream'],
  dwg: ['application/acad', 'image/vnd.dwg', 'application/octet-stream'],
  dxf: ['image/vnd.dxf', 'application/dxf', 'application/octet-stream'],
};

const isImageExt = (ext) => new Set(['jpg', 'jpeg', 'png', 'gif', 'bmp', 'tif', 'tiff']).has(ext);
const ZIP_SIGNATURE = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
const OLE_SIGNATURE = Buffer.from([0xd0, 0xcf, 0x11, 0xe0]);

const loadPdfParse = async () => {
  const mod = await import('pdf-parse');
  return mod.default || mod;
};

const tryGetMeta = async ({ absPath, ext }) => {
  const meta = { pages: 1 };
  try {
    if (ext === 'pdf') {
      const pdfParse = await loadPdfParse();
      const stat = await fs.stat(absPath);
      if (stat.size <= 20 * 1024 * 1024) {
        const buf = await fs.readFile(absPath);
        const data = await pdfParse(buf);
        if (data?.numpages) meta.pages = Math.max(1, Number(data.numpages));
      }
    } else if (isImageExt(ext)) {
      const { default: sharp } = await import('sharp');
      const img = sharp(absPath);
      const info = await img.metadata();
      if (info?.width) meta.width = Number(info.width);
      if (info?.height) meta.height = Number(info.height);
      meta.pages = 1;
    }
  } catch {
  }
  return meta;
};

const matchesSignature = (buffer, expected) => buffer.subarray(0, expected.length).equals(expected);

const validateFileContent = async ({ absPath, ext, mimetype }) => {
  const header = await fs.readFile(absPath, { encoding: null }).then((buf) => buf.subarray(0, 16));
  const extMimeList = ALLOWED_MIME_BY_EXT[ext] || [];
  if (extMimeList.length && mimetype && !extMimeList.includes(mimetype)) {
    throw createError(`MIME-тип не совпадает с расширением файла: .${ext}`, 400);
  }

  if (ext === 'pdf') {
    if (header.subarray(0, 5).toString() !== '%PDF-') throw createError('Файл PDF повреждён или подменён', 400);
    return;
  }
  if (['png'].includes(ext)) {
    if (!matchesSignature(header, Buffer.from([0x89, 0x50, 0x4e, 0x47]))) throw createError('PNG-файл повреждён или подменён', 400);
    return;
  }
  if (['jpg', 'jpeg'].includes(ext)) {
    if (!matchesSignature(header, Buffer.from([0xff, 0xd8, 0xff]))) throw createError('JPEG-файл повреждён или подменён', 400);
    return;
  }
  if (ext === 'gif') {
    if (!header.subarray(0, 6).toString().startsWith('GIF8')) throw createError('GIF-файл повреждён или подменён', 400);
    return;
  }
  if (['tif', 'tiff'].includes(ext)) {
    const little = Buffer.from([0x49, 0x49, 0x2a, 0x00]);
    const big = Buffer.from([0x4d, 0x4d, 0x00, 0x2a]);
    if (!matchesSignature(header, little) && !matchesSignature(header, big)) throw createError('TIFF-файл повреждён или подменён', 400);
    return;
  }
  if (ext === 'bmp') {
    if (header.subarray(0, 2).toString() != 'BM') throw createError('BMP-файл повреждён или подменён', 400);
    return;
  }
  if (['docx', 'xlsx', 'pptx'].includes(ext)) {
    if (!matchesSignature(header, ZIP_SIGNATURE)) throw createError(`Файл .${ext} должен быть формата OpenXML`, 400);
    return;
  }
  if (['doc', 'xls'].includes(ext)) {
    if (!matchesSignature(header, OLE_SIGNATURE)) throw createError(`Файл .${ext} повреждён или подменён`, 400);
    return;
  }
  if (ext === 'psd') {
    if (header.subarray(0, 4).toString() !== '8BPS') throw createError('PSD-файл повреждён или подменён', 400);
    return;
  }
  if (ext === 'ai' || ext === 'eps') {
    const head = header.toString('latin1');
    if (!head.startsWith('%PDF-') && !head.startsWith('%!PS-Adobe')) {
      throw createError('AI/EPS-файл повреждён или подменён', 400);
    }
    return;
  }
};

const getTempUsageBytes = async (ownerId) => {
  const rows = await UploadFile.find({ owner: ownerId, scope: 'temp' }).select('size').lean();
  return rows.reduce((sum, row) => sum + Number(row.size || 0), 0);
};

export const listServices = async (req, res, next) => {
  try {
    const services = await PrintService.find({ isActive: true })
      .select('key title description group subgroup kind')
      .sort({ subgroup: 1, title: 1 })
      .lean();

    res.json({ status: 'success', data: { services } });
  } catch (e) {
    next(e);
  }
};

export const getServiceByKey = async (req, res, next) => {
  try {
    const key = String(req.params.key || '').trim();
    const service = await PrintService.findOne({ key, isActive: true })
      .select('key title description group subgroup kind pricing')
      .lean();
    if (!service) return next(createError('Услуга не найдена', 404));
    res.json({ status: 'success', data: { service } });
  } catch (e) {
    next(e);
  }
};

export const registerUploadedFiles = async (req, res, next) => {
  try {
    const files = Array.isArray(req.files) ? req.files : [];
    if (!files.length) return next(createError('Файлы не загружены', 400));

    const totalLimitMb = Number(process.env.SERVICE_UPLOAD_TOTAL_MAX_MB || 150);
    const existingUsage = await getTempUsageBytes(req.user._id);
    const incomingUsage = files.reduce((sum, file) => sum + Number(file.size || 0), 0);
    if (existingUsage + incomingUsage > totalLimitMb * 1024 * 1024) {
      for (const file of files) {
        await fs.unlink(file.path).catch(() => {});
      }
      return next(createError(`Превышен общий лимит временных файлов (${totalLimitMb} МБ)`, 413));
    }

    const saved = [];
    for (const file of files) {
      const originalName = file.originalname || 'file';
      const ext = extOf(originalName);
      if (!ALLOWED_EXTS.has(ext)) {
        await fs.unlink(file.path).catch(() => {});
        continue;
      }

      await validateFileContent({ absPath: file.path, ext, mimetype: file.mimetype || '' }).catch(async (error) => {
        await fs.unlink(file.path).catch(() => {});
        throw error;
      });

      const relPath = path.relative(UPLOADS_DIR, file.path).split(path.sep).join('/');
      const meta = await tryGetMeta({ absPath: file.path, ext });
      const doc = new UploadFile({
        owner: req.user._id,
        scope: 'temp',
        originalName,
        mimeType: file.mimetype || '',
        size: Number(file.size || 0),
        ext,
        relPath,
        url: '',
        pages: meta.pages || 1,
        width: meta.width,
        height: meta.height,
      });
      doc.url = buildProtectedUploadUrl(doc._id);
      await doc.save();
      saved.push(doc);
    }

    if (!saved.length) return next(createError('Ни один файл не подходит по формату', 400));

    return res.json({
      status: 'success',
      data: {
        files: saved.map((doc) => ({
          _id: doc._id,
          originalName: doc.originalName,
          url: doc.url,
          size: doc.size,
          ext: doc.ext,
          pages: doc.pages,
          width: doc.width,
          height: doc.height,
        })),
      },
    });
  } catch (e) {
    next(e);
  }
};

export const streamProtectedUpload = async (req, res, next) => {
  try {
    const id = String(req.params.id || '').trim();
    const file = await UploadFile.findById(id);
    if (!file) return next(createError('Файл не найден', 404));

    const isOwner = String(file.owner) === String(req.user._id);
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return next(createError('Нет доступа к файлу', 403));
    }

    const absPath = resolveUploadAbsolutePath(file);
    const stat = await fs.stat(absPath).catch(() => null);
    if (!stat?.isFile()) return next(createError('Файл отсутствует на диске', 404));

    res.setHeader('Content-Type', file.mimeType || 'application/octet-stream');
    res.setHeader('Content-Length', String(stat.size));
    res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(file.originalName || 'file')}`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, no-store, max-age=0');
    return res.sendFile(absPath);
  } catch (e) {
    next(e);
  }
};

export const deleteTempUpload = async (req, res, next) => {
  try {
    const id = String(req.params.id || '').trim();
    const file = await UploadFile.findOne({ _id: id, owner: req.user._id, scope: 'temp' });
    if (!file) return next(createError('Файл не найден', 404));
    await deleteUploadRecordAndFile(file);
    res.json({ status: 'success' });
  } catch (e) {
    next(e);
  }
};

export const calcService = async (req, res, next) => {
  try {
    const key = String(req.params.key || '').trim();
    const service = await PrintService.findOne({ key, isActive: true }).lean();
    if (!service) return next(createError('Услуга не найдена', 404));

    const fileIds = Array.isArray(req.body?.fileIds) ? req.body.fileIds.map(String) : [];
    const options = req.body?.options || {};
    if (!fileIds.length) return next(createError('Загрузите хотя бы один файл', 400));

    const files = await UploadFile.find({
      _id: { $in: fileIds },
      owner: req.user._id,
      scope: 'temp',
    })
      .select('originalName url size ext pages width height')
      .lean();

    if (files.length !== fileIds.length) {
      return next(createError('Часть файлов не найдена (или уже оформлена в заказ)', 400));
    }

    let result;
    if (service.kind === 'document_print') {
      result = calcDocumentPrint({ pricing: service.pricing, files, options });
    } else {
      return next(createError('Конфигуратор для этой услуги пока не готов', 400));
    }

    res.json({
      status: 'success',
      data: {
        service: { key: service.key, title: service.title, kind: service.kind },
        files,
        ...result,
      },
    });
  } catch (e) {
    next(e);
  }
};

export const getUploadLimits = async (req, res) => {
  res.json({
    status: 'success',
    data: {
      maxFileSizeMb: Number(process.env.SERVICE_UPLOAD_MAX_MB || 25),
      maxFiles: Number(process.env.SERVICE_UPLOAD_MAX_FILES || 5),
      maxTotalSizeMb: Number(process.env.SERVICE_UPLOAD_TOTAL_MAX_MB || 150),
      allowedExts: [...ALLOWED_EXTS],
    },
  });
};

export const polygraphyUploadConfig = {
  TEMP_SERVICES_DIR,
  ensureDir,
  ALLOWED_EXTS,
};

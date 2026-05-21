import express from 'express';
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';

import { protect } from '../../../middleware/authMiddleware.js';
import {
  listServices,
  getServiceByKey,
  registerUploadedFiles,
  streamProtectedUpload,
  deleteTempUpload,
  calcService,
  getUploadLimits,
  polygraphyUploadConfig,
} from '../controllers/printServiceController.js';

const router = express.Router();

const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      const uid = String(req.user?._id || 'anon');
      const dir = path.join(polygraphyUploadConfig.TEMP_SERVICES_DIR, uid);
      await polygraphyUploadConfig.ensureDir(dir);
      cb(null, dir);
    } catch (e) {
      cb(e);
    }
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const name = `${Date.now()}_${crypto.randomBytes(8).toString('hex')}${ext}`;
    cb(null, name);
  },
});

const maxMb = Number(process.env.SERVICE_UPLOAD_MAX_MB || 25);
const maxFiles = Number(process.env.SERVICE_UPLOAD_MAX_FILES || 5);

const upload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const clean = ext.startsWith('.') ? ext.slice(1) : ext;
    if (!clean || !polygraphyUploadConfig.ALLOWED_EXTS.has(clean)) {
      return cb(new Error('Недопустимый формат файла'));
    }
    return cb(null, true);
  },
  limits: { fileSize: maxMb * 1024 * 1024, files: maxFiles },
});

router.get('/limits', getUploadLimits);
router.get('/', listServices);
router.get('/:key', getServiceByKey);

router.get('/uploads/:id/content', protect, streamProtectedUpload);
router.post('/:key/upload', protect, upload.array('files', maxFiles), registerUploadedFiles);
router.delete('/uploads/:id', protect, deleteTempUpload);
router.post('/:key/calc', protect, calcService);

export default router;

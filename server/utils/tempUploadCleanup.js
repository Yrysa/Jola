


import fs from 'fs/promises';
import UploadFile from '../modules/polygraphy/models/UploadFile.js';
import { TEMP_UPLOAD_TTL_HOURS } from '../config/appConfig.js';
import { resolveUploadAbsolutePath } from './orderLifecycle.js';


const cleanupOnce = async () => {
  const ttlMs = TEMP_UPLOAD_TTL_HOURS * 60 * 60 * 1000;
  const cutoff = new Date(Date.now() - ttlMs);

  const stale = await UploadFile.find({ scope: 'temp', createdAt: { $lt: cutoff } })
    .select('_id relPath')
    .limit(500)
    .lean();

  if (!stale.length) return;

  await Promise.allSettled(
    stale.map(async (f) => {
      const abs = (() => {
        try {
          return resolveUploadAbsolutePath(f);
        } catch {
          return null;
        }
      })();
      if (abs) {
        await fs.unlink(abs).catch(() => {});
      }
      await UploadFile.deleteOne({ _id: f._id }).catch(() => {});
    })
  );

  console.log(`🧹 Temp uploads cleanup: removed ${stale.length} file(s)`);
};

export const startTempUploadsCleanup = () => {
  
  cleanupOnce().catch(() => {});

  
  const everyMs = 6 * 60 * 60 * 1000; 
  setInterval(() => cleanupOnce().catch(() => {}), everyMs).unref?.();
};

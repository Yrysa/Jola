import fs from 'fs';
import http from 'http';
import https from 'https';
import app from './app.js';
import connectDB from './config/db.js';
import { startTelegramBot } from './utils/telegramBot.js';
import { seedPolygraphyServices } from './modules/polygraphy/seed.js';
import { startTempUploadsCleanup } from './utils/tempUploadCleanup.js';

const PORT = process.env.PORT || 5000;

function createServer() {
  const keyPath = process.env.HTTPS_KEY_PATH;
  const certPath = process.env.HTTPS_CERT_PATH;
  const useHttps = process.env.SERVER_HTTPS === 'true' && keyPath && certPath;

  if (useHttps) {
    try {
      const key = fs.readFileSync(keyPath);
      const cert = fs.readFileSync(certPath);
      return {
        server: https.createServer({ key, cert }, app),
        protocol: 'https',
      };
    } catch (error) {
      console.warn('HTTPS disabled:', error?.message || error);
    }
  }

  return {
    server: http.createServer(app),
    protocol: 'http',
  };
}

const start = async () => {
  await connectDB();

  if (process.env.NODE_ENV !== 'test') {
    await seedPolygraphyServices();
    startTempUploadsCleanup();
  }

  const { server, protocol } = createServer();

  server.listen(PORT, () => {
    console.log(`🚀 Jola Server запущен на ${protocol}://localhost:${PORT} в режиме ${process.env.NODE_ENV}`);
    console.log(`🔗 Frontend: ${process.env.CLIENT_URL}`);

    if (process.env.NODE_ENV !== 'test') {
      const token = String(process.env.TELEGRAM_BOT_TOKEN || '').trim();
      const enabledRaw = String(process.env.TELEGRAM_BOT_ENABLED || '').trim().toLowerCase();
      const shouldStartTelegramBot = Boolean(token) && enabledRaw !== 'false';

      if (shouldStartTelegramBot) {
        try {
          startTelegramBot();
        } catch (error) {
          console.warn('⚠️ Telegram bot start failed:', error?.message || error);
        }
      } else {
        console.log('ℹ️ Telegram bot disabled (set TELEGRAM_BOT_TOKEN and keep TELEGRAM_BOT_ENABLED != false)');
      }
    }
  });
};

start();

process.on('unhandledRejection', (error) => {
  console.log('❌ Unhandled Rejection! Выключение сервера...');
  console.error(error);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.log('❌ Uncaught Exception! Выключение сервера...');
  console.error(error);
  process.exit(1);
});

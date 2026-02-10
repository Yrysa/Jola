import fs from 'fs';
import path from 'path';
import morgan from 'morgan';

const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const accessLogStream = fs.createWriteStream(path.join(logsDir, 'access.log'), { flags: 'a' });
const errorLogStream = fs.createWriteStream(path.join(logsDir, 'error.log'), { flags: 'a' });

export const requestLogger = morgan('combined', { stream: accessLogStream });
export const devLogger = morgan('dev');

export const logError = (payload) => {
  const line = `${new Date().toISOString()} ${JSON.stringify(payload)}\n`;
  errorLogStream.write(line);
  console.error('❌', payload);
};

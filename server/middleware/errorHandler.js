// Глобальный обработчик ошибок
export const createError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

export const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error
  console.error('❌ Ошибка:', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
  });

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = `Ресурс не найден. Неверный формат ID: ${err.value}`;
    error = createError(message, 404);
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const message = `Дубликат поля "${field}": ${err.keyValue[field]}`;
    error = createError(message, 400);
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message);
    error = createError(message.join(', '), 400);
  }

  res.status(error.statusCode || 500).json({
    status: 'error',
    message: error.message || 'Ошибка сервера',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};
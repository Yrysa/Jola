import { validationResult } from 'express-validator';
import { createError } from './errorHandler.js';

export const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const message = errors.array().map((err) => `${err.path}: ${err.msg}`).join(', ');
    return next(createError(message, 400));
  }

  next();
};

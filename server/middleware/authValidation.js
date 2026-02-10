import { body } from 'express-validator';

export const registerValidation = [
  body('name').trim().isLength({ min: 2, max: 50 }).withMessage('Имя должно быть от 2 до 50 символов'),
  body('email').trim().isEmail().withMessage('Введите корректный email').normalizeEmail(),
  body('password')
    .isLength({ min: 8, max: 64 })
    .withMessage('Пароль должен быть от 8 до 64 символов')
    .matches(/^(?=.*[A-Za-z])(?=.*\d).+$/)
    .withMessage('Пароль должен содержать минимум одну букву и одну цифру'),
];

export const loginValidation = [
  body('email').trim().isEmail().withMessage('Введите корректный email').normalizeEmail(),
  body('password').notEmpty().withMessage('Пароль обязателен'),
];

export const verifyEmailValidation = [
  body('email').trim().isEmail().withMessage('Введите корректный email').normalizeEmail(),
  body('token').isLength({ min: 32 }).withMessage('Невалидный токен подтверждения'),
];

// client/src/services/authService.js
import API from './api.js';

const getErrorMessage = (error, fallbackMessage) => {
  if (typeof error === 'string') return error;
  if (Array.isArray(error?.message)) return error.message.join(', ');
  return error?.message || fallbackMessage;
};

const unwrap = (res) => {
  if (!res?.data?.data) {
    throw new Error('Некорректный ответ сервера');
  }
  return res.data.data;
};

export const authService = {
  // Вход
  login: async (email, password) => {
    try {
      const res = await API.post('/auth/login', { email, password });
      return unwrap(res); // { user, token }
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Ошибка входа'));
    }
  },

  // Регистрация
  register: async (userData) => {
    try {
      const res = await API.post('/auth/register', userData);
      return unwrap(res); // { user, token }
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Ошибка регистрации'));
    }
  },

  // Текущий пользователь по токену
  getMe: async () => {
    try {
      const res = await API.get('/auth/me');
      return unwrap(res); // { user }
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Не удалось загрузить профиль'));
    }
  },

  // Обновление профиля
  updateProfile: async (userData) => {
    try {
      const res = await API.put('/users/profile', userData);
      return unwrap(res); // { user }
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Не удалось обновить профиль'));
    }
  },
};

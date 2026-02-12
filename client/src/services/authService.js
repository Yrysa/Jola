// client/src/services/authService.js
import API from './api.js';

export const authService = {
  // Вход
  login: async (email, password) => {
    // API уже возвращает { status, data: { user, token } }
    const res = await API.post('/auth/login', { email, password });
    // вернём только полезные данные
    return res.data.data; // { user, token }
  },

  // Регистрация
  register: async (userData) => {
    const res = await API.post('/auth/register', userData);
    return res.data.data; // { user, token }
  },

  // Текущий пользователь по токену
  getMe: async () => {
    const res = await API.get('/auth/me');
    return res.data.data; // { user }
  },

  // Обновление профиля
  updateProfile: async (userData) => {
    const res = await API.put('/users/profile', userData);
    return res.data.data; // { user }
  },
};

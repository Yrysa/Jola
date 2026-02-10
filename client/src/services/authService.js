import API from './api.js';

export const authService = {
  login: async (email, password) => {
    const res = await API.post('/auth/login', { email, password });
    return res.data.data; // { user, accessToken }
  },

  register: async (userData) => {
    const res = await API.post('/auth/register', userData);
    return res.data; // { status, message, data: { user, verificationToken } }
  },

  verifyEmail: async (email, token) => {
    const res = await API.post('/auth/verify-email', { email, token });
    return res.data;
  },

  logout: async () => {
    const res = await API.post('/auth/logout');
    return res.data;
  },

  getMe: async () => {
    const res = await API.get('/auth/me');
    return res.data.data;
  },

  updateProfile: async (userData) => {
    const res = await API.put('/users/profile', userData);
    return res.data.data;
  },
};

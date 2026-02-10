import API from './api.js';

export const authService = {
  login: async (email, password, twoFactorCode) => {
    const res = await API.post('/auth/login', { email, password, twoFactorCode });
    return res.data.data;
  },

  register: async (userData) => {
    const res = await API.post('/auth/register', userData);
    return res.data.data;
  },

  getMe: async () => {
    const res = await API.get('/auth/me');
    return res.data.data;
  },

  updateProfile: async (userData) => {
    const res = await API.put('/users/profile', userData);
    return res.data.data;
  },

  changePassword: async (currentPassword, newPassword) => {
    const res = await API.put('/users/change-password', { currentPassword, newPassword });
    return res.data;
  },

  toggleTwoFactor: async (enabled) => {
    const res = await API.patch('/users/2fa', { enabled });
    return res.data.data;
  },

  getLoginHistory: async () => {
    const res = await API.get('/users/login-history');
    return res.data.data;
  },

  forgotPassword: async (email) => {
    const res = await API.post('/auth/forgot-password', { email });
    return res.data.data;
  },

  resetPassword: async (token, password) => {
    const res = await API.post(`/auth/reset-password/${token}`, { password });
    return res.data.data;
  },
};

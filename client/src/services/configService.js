import API from './api.js';

export const configService = {
  async getConfig() {
    const res = await API.get('/config');
    return res.data.data; 
  },
};

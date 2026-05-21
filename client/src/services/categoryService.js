import api from './api.js';

export const categoryService = {
  async getCategories() {
    const res = await api.get('/categories');
    return res.data.data;
  },

  


  async createCategory(payload) {
    const body = typeof payload === 'string' ? { name: payload } : payload;
    const res = await api.post('/categories', body);
    return res.data.data;
  },

  async updateCategory(id, payload) {
    const body = typeof payload === 'string' ? { name: payload } : payload;
    const res = await api.put(`/categories/${id}`, body);
    return res.data.data;
  },

  async deleteCategory(id) {
    const res = await api.delete(`/categories/${id}`);
    return res.data;
  },
};

export default categoryService;

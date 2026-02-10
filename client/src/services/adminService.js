import api from './api.js';

const unwrap = (res) => res.data.data;

export const adminService = {
  async login(email, password) {
    const res = await api.post('/admin/login', { email, password });
    return unwrap(res);
  },

  async getProducts() {
    const res = await api.get('/admin/products');
    return unwrap(res).products ?? [];
  },

  async createProduct(payload) {
    const res = await api.post('/admin/products', payload);
    return unwrap(res).product;
  },

  async updateProduct(id, payload) {
    const res = await api.put(`/admin/products/${id}`, payload);
    return unwrap(res).product;
  },

  async hideProduct(id, isHidden) {
    const res = await api.patch(`/admin/products/${id}/hide`, { isHidden });
    return unwrap(res).product;
  },

  async getOrders() {
    const res = await api.get('/admin/orders');
    return unwrap(res).orders ?? [];
  },

  async updateOrderStatus(id, status) {
    const res = await api.patch(`/admin/orders/${id}/status`, { status });
    return unwrap(res).order;
  },

  async getUsers() {
    const res = await api.get('/admin/users');
    return unwrap(res).users ?? [];
  },

  async updateUser(id, payload) {
    const res = await api.patch(`/admin/users/${id}`, payload);
    return unwrap(res).user;
  },

  async getStats() {
    const res = await api.get('/admin/stats');
    return unwrap(res).sales;
  },
};

export default adminService;

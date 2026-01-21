// client/src/services/orderService.js
import api from './api.js';

export const orderService = {
  async createOrder(payload) {
    const response = await api.post('/orders', payload);
    return response.data.data;
  },

  async getMyOrders() {
    const response = await api.get('/orders/myorders');
    return response.data.data;
  },

  async getOrderById(id) {
    const response = await api.get(`/orders/${id}`);
    return response.data.data;
  },

  async getAllOrders() {
    const response = await api.get('/orders');
    return response.data.data;
  },

  async updateOrderStatus(id, body) {
    const response = await api.put(`/orders/${id}/status`, body);
    return response.data.data;
  },
};

export default orderService;

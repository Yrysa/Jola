// client/src/services/orderService.js
import api from './api.js';

function unwrapData(response) {
  return response.data?.data ?? response.data;
}

export const orderService = {
  async createOrder(payload) {
    const response = await api.post('/orders', payload);
    return unwrapData(response);
  },

  async getMyOrders() {
    const response = await api.get('/orders/myorders');
    return unwrapData(response);
  },

  async getOrderById(id) {
    const response = await api.get(`/orders/${id}`);
    return unwrapData(response);
  },

  async getAllOrders() {
    const response = await api.get('/orders');
    return unwrapData(response);
  },

  async updateOrderStatus(id, body) {
    const response = await api.put(`/orders/${id}/status`, body);
    return unwrapData(response);
  },
};

export default orderService;
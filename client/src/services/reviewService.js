import api from './api.js';

export const reviewService = {
  async getLatest(limit = 3) {
    const res = await api.get('/reviews/latest', { params: { limit } });
    return res.data.data;
  },

  async getByProduct(productId, { limit = 10, page = 1 } = {}) {
    const res = await api.get(`/reviews/product/${productId}`, { params: { limit, page } });
    return res.data.data;
  },

  async canReview(productId) {
    const res = await api.get(`/reviews/can-review/${productId}`);
    return res.data.data;
  },

  async createReview(payload) {
    const res = await api.post('/reviews', payload);
    return res.data.data.review;
  },
};

export default reviewService;

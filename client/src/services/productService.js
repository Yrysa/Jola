// client/src/services/productService.js
import api from './api.js';

function unwrapData(response) {
  return response.data.data;
}

export const productService = {
  // Товары на главную (featured)
  async getFeaturedProducts(limit = 8) {
    const response = await api.get('/products', {
      params: { featured: true, limit },
    });
    const data = unwrapData(response);
    // ожидаем, что там будет products
    return data.products ?? data;
  },

  // Список товаров с фильтрами
  async getProducts({
    category = '',
    search = '',
    minPrice = '',
    maxPrice = '',
    inStock = false,
    page = 1,
    limit = 20,
  } = {}) {
    const response = await api.get('/products', {
      params: {
        category,
        search,
        minPrice,
        maxPrice,
        inStock,
        page,
        limit,
      },
    });

    // здесь вернём целый объект, чтобы были и products, и pagination
    return unwrapData(response);
  },

  // Один товар по id
  async getProductById(id) {
    const response = await api.get(`/products/${id}`);
    const data = unwrapData(response);
    return data.product ?? data;
  },

  // Категории
  async getCategories() {
    const response = await api.get('/products/categories');
    const data = unwrapData(response);
    return data.categories ?? data;
  },

  // Создать товар (админ)
  // data — обычный объект: { name, price, category, brand, countInStock, description, image, ... }
  async createProduct(data) {
    const response = await api.post('/products', data);
    const res = unwrapData(response);
    return res.product ?? res;
  },

  // Обновить товар (админ)
  async updateProduct(id, data) {
    const response = await api.put(`/products/${id}`, data);
    const res = unwrapData(response);
    return res.product ?? res;
  },

  // Удалить товар (админ)
  async deleteProduct(id) {
    const response = await api.delete(`/products/${id}`);
    return response.data;
  },
};

export default productService;

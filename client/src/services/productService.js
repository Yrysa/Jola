import api from './api.js';

export const productService = {
  /**
   * Fetch products.
   * Supports both call styles:
   *   getProducts(pageNumber, filters)
   *   getProducts({ page, ...filters })
   */
  async getProducts(pageOrFilters = 1, filtersArg = {}) {
    let page = 1;
    let filters = {};

    if (typeof pageOrFilters === 'object' && pageOrFilters !== null) {
      filters = pageOrFilters;
      page = Number(filters.page) || 1;
    } else {
      page = Number(pageOrFilters) || 1;
      filters = filtersArg || {};
    }

    const params = {
      category: filters.category || '',
      search: filters.search || '',
      brand: filters.brand || '',
      minPrice: filters.minPrice || '',
      maxPrice: filters.maxPrice || '',
      inStock: filters.inStock || false,
      featured: filters.featured || false,
      page,
      limit: filters.limit || 8,
    };

    const response = await api.get('/products', { params });
    return response.data.data;
  },

  async getProduct(id) {
    const response = await api.get(`/products/${id}`);
    return response.data.data.product;
  },

  // Backward/forward compatible alias used by ProductDetailPage
  async getProductById(id) {
    return this.getProduct(id);
  },

  async createProduct(productData) {
    const response = await api.post('/products', productData);
    return response.data.data.product;
  },

  async updateProduct(id, productData) {
    const response = await api.patch(`/products/${id}`, productData);
    return response.data.data.product;
  },

  async deleteProduct(id) {
    await api.delete(`/products/${id}`);
  },

  async getCategories() {
    const response = await api.get('/products/categories');
    const data = response.data.data;
    return data.categories ?? data;
  },
};

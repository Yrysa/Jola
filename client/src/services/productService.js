import api from './api.js';


export const productService = {
  async getProducts(pageOrFilters = 1, filters = {}) {
    
    
    
    let page = 1;
    let f = {};

    if (typeof pageOrFilters === 'object' && pageOrFilters !== null) {
      f = pageOrFilters;
      page = Number(f.page || 1);
    } else {
      page = Number(pageOrFilters || 1);
      f = filters || {};
    }

    const toCsv = (v) => (Array.isArray(v) ? v.filter(Boolean).join(',') : (v || ''));

    const params = {
      category: toCsv(f.category),
      search: f.search || '',
      brand: toCsv(f.brand),
      minPrice: f.minPrice ?? '',
      maxPrice: f.maxPrice ?? '',
      inStock: f.inStock ? true : false,
      availability: f.availability || '',
      new: f.new ? true : false,
      featured: f.featured ? true : false,
      sort: f.sort || '',
      page,
      limit: Number(f.limit || 12),
    };

    const response = await api.get('/products', { params });
    
    return response.data.data;
  },

  async getProduct(id) {
    const response = await api.get(`/products/${id}`);
    
    return response.data.data.product;
  },

  async getProductById(id) {
    return this.getProduct(id);
  },

  async createProduct(productData) {
    const response = await api.post('/products', productData);
    return response.data.data.product;
  },

  async updateProduct(id, productData) {
    const response = await api.put(`/products/${id}`, productData);
    return response.data.data.product;
  },

  async deleteProduct(id) {
    await api.delete(`/products/${id}`);
  },

  async getCategories() {
    const response = await api.get('/products/categories');
    const data = response.data.data;
    return data.items ?? data.categories ?? data;
  },

  
  async getSuggest(q) {
    const query = String(q || '').trim();
    if (query.length < 2) return { brands: [], products: [] };
    const { data } = await api.get('/products/suggest', { params: { q: query } });
    return data.data;
  },

  async getFiltersMeta() {
    const response = await api.get('/products/filters-meta');
    return response.data.data;
  },

  async getByIds(ids = []) {
    const response = await api.post('/products/by-ids', { ids });
    return response.data.data.products;
  },
};

export default productService;

import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from 'react-query';
import ProductGrid from '../components/ProductGrid.jsx';
import { FiFilter, FiSearch, FiX } from 'react-icons/fi';
import { productService } from '../services/productService.js';
import './ProductsPage.css';
import { motion, AnimatePresence } from 'framer-motion';

export default function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);

  const { data: categoriesData } = useQuery('categories', productService.getCategories);
  const categories = useMemo(() => {
    const list = Array.isArray(categoriesData) ? categoriesData : [];
    return list.slice().sort((a, b) => String(a).localeCompare(String(b), 'ru'));
  }, [categoriesData]);

  const filters = {
    category: searchParams.get('category') || '',
    search: searchParams.get('search') || '',
    minPrice: searchParams.get('minPrice') || '',
    maxPrice: searchParams.get('maxPrice') || '',
    inStock: searchParams.get('inStock') === 'true',
  };

  const handleFilterChange = (key, value) => {
    if (value) {
      searchParams.set(key, value);
    } else {
      searchParams.delete(key);
    }
    setSearchParams(searchParams);
  };

  const clearFilters = () => {
    setSearchParams({});
  };

  const showCategorySelect = categories.length >= 2;

  return (
    <div className="products-page">
      <div className="container">
        <div className="products-header">
          <h1>Товары</h1>

          <div className="products-controls">
            <div className="search-box">
              <FiSearch className="search-icon" />
              <input
                type="text"
                placeholder="Поиск товаров..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
              />
            </div>

            {showCategorySelect && (
              <div className="category-select">
                <select
                  value={filters.category}
                  onChange={(e) => handleFilterChange('category', e.target.value)}
                  aria-label="Категория"
                >
                  <option value="">Все категории</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button className="btn-filter" onClick={() => setShowFilters(!showFilters)}>
              <FiFilter /> Фильтры
            </button>
          </div>
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div
              className="filters-panel"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
            >
              <div className="filters-grid">
                <div className="filter-group">
                  <label>Минимальная цена</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={filters.minPrice}
                    onChange={(e) => handleFilterChange('minPrice', e.target.value)}
                  />
                </div>

                <div className="filter-group">
                  <label>Максимальная цена</label>
                  <input
                    type="number"
                    placeholder="∞"
                    value={filters.maxPrice}
                    onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
                  />
                </div>

                <div className="filter-group filter-group--toggle">
                  <label className="toggle">
                    <input
                      type="checkbox"
                      checked={filters.inStock}
                      onChange={(e) =>
                        handleFilterChange('inStock', e.target.checked ? 'true' : '')
                      }
                    />
                    <span className="toggle-track" aria-hidden="true">
                      <span className="toggle-thumb" />
                    </span>
                    <span className="toggle-label">Только в наличии</span>
                  </label>
                </div>
              </div>

              <button className="btn-clear-filters" onClick={clearFilters} type="button">
                <FiX /> Очистить фильтры
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <ProductGrid filters={filters} />
      </div>
    </div>
  );
}

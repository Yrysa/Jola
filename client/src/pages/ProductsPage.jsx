import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import ProductGrid from '../components/ProductGrid.jsx';
import { FiFilter, FiSearch, FiX } from 'react-icons/fi';
import './ProductsPage.css';
import { motion, AnimatePresence } from 'framer-motion';

export default function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);
  
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

  return (
    <div className="products-page">
      <div className="container">
        <div className="products-header">
          <h1>Каталог товаров</h1>
          
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
            
            <button
              className="btn-filter"
              onClick={() => setShowFilters(!showFilters)}
            >
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
              transition={{ duration: 0.3 }}
            >
              <div className="filters-grid">
                <div className="filter-group">
                  <label>Категория</label>
                  <select
                    value={filters.category}
                    onChange={(e) => handleFilterChange('category', e.target.value)}
                  >
                    <option value="">Все категории</option>
                    <option value="electronics">Электроника</option>
                    <option value="clothing">Одежда</option>
                    <option value="books">Книги</option>
                    <option value="home">Дом</option>
                    <option value="sports">Спорт</option>
                  </select>
                </div>

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

                <div className="filter-group checkbox">
                  <label>
                    <input
                      type="checkbox"
                      checked={filters.inStock}
                      onChange={(e) => handleFilterChange('inStock', e.target.checked ? 'true' : '')}
                    />
                    Только в наличии
                  </label>
                </div>
              </div>

              <button className="btn-clear-filters" onClick={clearFilters}>
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
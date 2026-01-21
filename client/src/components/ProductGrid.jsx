import { useState } from 'react';
import { useQuery } from 'react-query';
import { motion, AnimatePresence } from 'framer-motion';
import ProductCard from './ProductCard.jsx';
import LoadingSpinner from './LoadingSpinner.jsx';
import { productService } from '../services/productService.js';

export default function ProductGrid({ filters = {} }) {
  const [page, setPage] = useState(1);
  
  const { data, isLoading, isError, error } = useQuery(
    ['products', { ...filters, page }],
    () => productService.getProducts({ ...filters, page }),
    {
      keepPreviousData: true,
    }
  );

  if (isLoading && page === 1) return <LoadingSpinner fullScreen />;
  if (isError) return <div className="error-message">Ошибка: {error.message}</div>;

  return (
    <div className="product-grid-container">
      <AnimatePresence>
        <motion.div
          className="product-grid"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {data?.products?.map((product) => (
            <ProductCard key={product._id} product={product} />
          ))}
        </motion.div>
      </AnimatePresence>

      {data?.pagination?.hasNext && (
        <div className="load-more">
          <button
            onClick={() => setPage(page + 1)}
            className="btn btn-secondary"
            disabled={isLoading}
          >
            {isLoading ? 'Загрузка...' : 'Загрузить еще'}
          </button>
        </div>
      )}
    </div>
  );
}
import { useMemo, useState } from 'react';
import { useQuery } from 'react-query';
import { productService } from '../services/productService.js';
import ProductCard from './ProductCard.jsx';
import SkeletonCard from './SkeletonCard.jsx';
import Pagination from './Pagination.jsx';

export default function ProductGrid({
  filters = {},
  page: controlledPage,
  onPageChange,
  showPagination = true,
  showCounts = true,
  emptyTitle,
  emptySubtitle,
  onEmptyAction,
  emptyActionLabel = 'Сбросить фильтры',
}) {
  const [internalPage, setInternalPage] = useState(1);
  const page = controlledPage ?? internalPage;

  const queryKey = useMemo(
    () => ['products', JSON.stringify({ ...filters, page })],
    [filters, page]
  );

  const { data, isLoading, isError, error, isFetching } = useQuery(
    queryKey,
    () => productService.getProducts({ ...filters, page }),
    { keepPreviousData: true, staleTime: 1000 * 20 }
  );

  const products = data?.products ?? [];
  const pagination = data?.pagination;

  const setPage = (p) => {
    const next = Math.max(1, p);
    if (controlledPage == null) setInternalPage(next);
    onPageChange?.(next);
  };

  return (
    <div className="product-grid-container">
      {showCounts && pagination && (
        <div className="products-count">
          <span>{pagination.from}–{pagination.to} из {pagination.total}</span>
          {isFetching && <span className="products-count__loading">• обновляю…</span>}
        </div>
      )}

      {isError && (
        <div className="error-message">Ошибка: {error.message}</div>
      )}

      <div className="product-grid">
        {isLoading
          ? Array.from({ length: Number(filters.limit || 12) }).map((_, i) => <SkeletonCard key={i} />)
          : products.map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
      </div>

      {!isLoading && products.length === 0 && (
        <div className="empty-state">
          <div className="empty-state__title">{emptyTitle || 'Товары не найдены'}</div>
          <div className="empty-state__subtitle">{emptySubtitle || 'Попробуйте изменить фильтры или сбросить их.'}</div>
          {onEmptyAction && (
            <button className="btn btn-secondary" onClick={onEmptyAction}>
              {emptyActionLabel}
            </button>
          )}
        </div>
      )}

      {showPagination && pagination && (
        <Pagination
          page={pagination.page}
          pages={pagination.pages}
          onChange={setPage}
        />
      )}
    </div>
  );
}

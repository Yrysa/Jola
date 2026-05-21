import { useEffect, useMemo, useState } from 'react';
import { useQuery } from 'react-query';
import { FiHeart, FiTrash2 } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import ProductCard from '../components/ProductCard.jsx';
import SkeletonCard from '../components/SkeletonCard.jsx';
import { productService } from '../services/productService.js';
import { clearWishlist, readWishlist, removeFromWishlist, subscribeWishlist } from '../utils/wishlist.js';
import './FavoritesPage.css';

function useWishlistIds() {
  const [ids, setIds] = useState(() => readWishlist());

  useEffect(() => {
    setIds(readWishlist());
    return subscribeWishlist(setIds);
  }, []);

  return ids;
}

export default function FavoritesPage() {
  const { i18n } = useTranslation();
  const isRu = (i18n.language || 'ru').toLowerCase().startsWith('ru');
  const ids = useWishlistIds();
  const labels = useMemo(
    () => (
      isRu
        ? {
            title: 'Избранное',
            subtitle: 'Сохраняй товары сердечком и возвращайся к ним в один клик.',
            clear: 'Очистить всё',
            browse: 'Открыть каталог',
            emptyTitle: 'В избранном пока пусто',
            emptySubtitle: 'Наведи на товар, нажми на сердце и он появится здесь.',
            count: `Товаров в избранном: ${ids.length}`,
          }
        : {
            title: 'Favorites',
            subtitle: 'Save products with the heart icon and return to them in one click.',
            clear: 'Clear all',
            browse: 'Open catalog',
            emptyTitle: 'Your favorites list is empty',
            emptySubtitle: 'Hover a product, tap the heart, and it will appear here.',
            count: `Favorites items: ${ids.length}`,
          }
    ),
    [ids.length, isRu]
  );

  const { data, isLoading } = useQuery(['wishlist-products', ids.join(',')], () => productService.getByIds(ids), {
    enabled: ids.length > 0,
    staleTime: 30_000,
  });

  const products = useMemo(() => {
    const map = new Map((data || []).map((item) => [item._id, item]));
    return ids.map((id) => map.get(id)).filter(Boolean);
  }, [data, ids]);

  return (
    <div className="favorites-page">
      <div className="container">
        <div className="favorites-hero">
          <div>
            <h1><FiHeart /> {labels.title}</h1>
            <p>{labels.subtitle}</p>
          </div>

          <div className="favorites-hero__actions">
            <Link to="/products" className="btn btn-secondary">{labels.browse}</Link>
            {ids.length > 0 ? (
              <button type="button" className="btn btn-primary" onClick={clearWishlist}>
                <FiTrash2 /> {labels.clear}
              </button>
            ) : null}
          </div>
        </div>

        {ids.length === 0 ? (
          <div className="empty-state favorites-empty">
            <div className="empty-state__title">{labels.emptyTitle}</div>
            <div className="empty-state__subtitle">{labels.emptySubtitle}</div>
            <Link to="/products" className="btn btn-primary">{labels.browse}</Link>
          </div>
        ) : (
          <>
            <div className="favorites-count">{labels.count}</div>
            <div className="favorites-grid">
              {isLoading
                ? Array.from({ length: Math.min(ids.length, 8) || 4 }).map((_, index) => <SkeletonCard key={index} />)
                : products.map((product) => (
                    <div key={product._id} className="favorites-grid__item">
                      <button
                        type="button"
                        className="favorites-remove"
                        onClick={() => removeFromWishlist(product._id)}
                        aria-label={isRu ? 'Убрать из избранного' : 'Remove from favorites'}
                        title={isRu ? 'Убрать из избранного' : 'Remove from favorites'}
                      >
                        <FiTrash2 />
                      </button>
                      <ProductCard product={product} />
                    </div>
                  ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

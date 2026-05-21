import { useMemo } from 'react';
import { useQuery } from 'react-query';
import { productService } from '../services/productService.js';
import ProductCard from './ProductCard.jsx';
import './RecentlyViewedStrip.css';

const KEY = 'jola_recently_viewed_v1';

function readIds() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export default function RecentlyViewedStrip({ title = 'Недавно просмотренные' }) {
  const ids = useMemo(() => readIds().slice(0, 10), []);

  const { data, isLoading } = useQuery(
    ['recentlyViewed', ids.join(',')],
    () => productService.getByIds(ids),
    { enabled: ids.length > 0, staleTime: 1000 * 60 }
  );

  const products = data || [];
  if (!ids.length) return null;

  return (
    <section className="rv">
      <h3 className="rv__title">{title}</h3>
      <div className="rv__row" aria-busy={isLoading ? 'true' : 'false'}>
        {products.map((p) => (
          <div key={p._id} className="rv__item">
            <ProductCard product={p} />
          </div>
        ))}
      </div>
    </section>
  );
}

import { Link } from 'react-router-dom';
import RecentlyViewedStrip from '../components/RecentlyViewedStrip.jsx';

export default function RecentlyViewedPage() {
  return (
    <div className="container" style={{ paddingTop: '1rem', paddingBottom: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '1rem' }}>
        <div>
          <div style={{ color: 'var(--color-text-secondary)', marginBottom: 6 }}>
            <Link to="/products" style={{ color: 'inherit' }}>Каталог</Link> / Недавно просмотренные
          </div>
          <h1 style={{ margin: 0 }}>Недавно просмотренные</h1>
          <p style={{ margin: '0.5rem 0 0', color: 'var(--color-text-secondary)' }}>
            Отдельная страница с товарами, которые ты открывал недавно.
          </p>
        </div>
        <Link className="btn ghost" to="/products">Вернуться в каталог</Link>
      </div>

      <RecentlyViewedStrip title="Твои недавние просмотры" />
    </div>
  );
}

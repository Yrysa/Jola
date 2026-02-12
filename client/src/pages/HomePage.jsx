import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import ProductGrid from '../components/ProductGrid.jsx';
import './HomePage.css';

export default function HomePage() {
  return (
    <div className="home-page">
      <div className="container">
        <div className="home-topbar">
          <div className="home-title">
            <h1>Хиты продаж</h1>
            <p className="home-subtitle">
              Подборка популярных товаров — обновляется автоматически.
            </p>
          </div>

          <Link className="btn btn-primary home-cta" to="/products">
            Открыть каталог
          </Link>
        </div>

        <motion.section
          className="featured-section"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.35 }}
        >
          <ProductGrid filters={{ featured: true, limit: 8 }} />
        </motion.section>
      </div>
    </div>
  );
}

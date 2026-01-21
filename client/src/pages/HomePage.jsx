// placeholderimport { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useQuery } from 'react-query';
import ProductGrid from '../components/ProductGrid.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import { productService } from '../services/productService.js';
import './HomePage.css';
import { motion, AnimatePresence } from 'framer-motion';

export default function HomePage() {
  const { data: featuredData, isLoading: featuredLoading } = useQuery(
    'featured-products',
    () => productService.getProducts({ featured: true, limit: 8 })
  );

  const { data: categoriesData } = useQuery(
    'categories',
    productService.getCategories
  );

  if (featuredLoading) return <LoadingSpinner fullScreen />;

  return (
    <div className="home-page">
      {/* Hero Section */}
      <motion.section
        className="hero-section"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
      >
        <div className="hero-content">
          <motion.h1
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.8 }}
          >
            Добро пожаловать в ProckX
          </motion.h1>
          
          <motion.p
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.8 }}
          >
            Мощный, быстрый и безопасный магазин будущего
          </motion.p>
          
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.7, duration: 0.8 }}
          >
            <Link to="/products" className="btn btn-primary btn-large">
              Начать покупки
            </Link>
          </motion.div>
        </div>
        
        <div className="hero-visual">
          <div className="floating-shapes">
            <div className="shape shape-1"></div>
            <div className="shape shape-2"></div>
            <div className="shape shape-3"></div>
          </div>
        </div>
      </motion.section>

      {/* Categories Section */}
      <section className="categories-section">
        <div className="container">
          <h2>Категории</h2>
          <div className="categories-grid">
            {categoriesData?.categories?.map((category) => (
              <Link
                key={category}
                to={`/products?category=${category}`}
                className="category-card"
              >
                <h3>{category}</h3>
              </Link>
            )) || <LoadingSpinner />}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="featured-section">
        <div className="container">
          <h2>Хиты продаж</h2>
          <ProductGrid filters={{ featured: true, limit: 8 }} />
        </div>
      </section>
    </div>
  );
}
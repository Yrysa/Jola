import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiShoppingCart } from 'react-icons/fi';
import { useCart } from '../context/CartContext.jsx';
import { formatPrice } from '../utils/formatPrice.js';

export default function ProductCard({ product }) {
  const { addItem } = useCart();
  const discountedPrice = product.discount > 0
    ? product.price * (1 - product.discount / 100)
    : product.price;

  const handleAddToCart = (e) => {
    e.preventDefault();
    addItem({
      product: product._id,
      name: product.name,
      price: discountedPrice,
      image: product.images[0],
      quantity: 1,
    });
  };

  return (
    <motion.div
      className="product-card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ y: -5 }}
    >
      <Link to={`/products/${product._id}`}>
        <div className="product-image">
          <img src={product.images[0]} alt={product.name} loading="lazy" />
          {product.discount > 0 && (
            <span className="discount-badge">-{product.discount}%</span>
          )}
          {product.isFeatured && (
            <span className="featured-badge">Хит</span>
          )}
        </div>
        
        <div className="product-info">
          <h3 className="product-name">{product.name}</h3>
          <p className="product-brand">{product.brand}</p>
          
          <div className="product-price">
            {product.discount > 0 ? (
              <>
                <span className="original-price">{formatPrice(product.price)}</span>
                <span className="discounted-price">{formatPrice(discountedPrice)}</span>
              </>
            ) : (
              <span className="price">{formatPrice(product.price)}</span>
            )}
          </div>
          
          <div className="product-rating">
            {Array.from({ length: 5 }).map((_, i) => (
              <span key={i} className={i < Math.floor(product.rating) ? 'star filled' : 'star'}>
                ★
              </span>
            ))}
            <span className="reviews-count">({product.numReviews})</span>
          </div>
          
          <button
            onClick={handleAddToCart}
            className="btn-add-to-cart"
            disabled={product.stock === 0}
          >
            <FiShoppingCart />
            {product.stock > 0 ? 'В корзину' : 'Нет в наличии'}
          </button>
        </div>
      </Link>
    </motion.div>
  );
}

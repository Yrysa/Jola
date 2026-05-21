import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiEye, FiHeart, FiShoppingCart } from 'react-icons/fi';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCart } from '../context/CartContext.jsx';
import { useUiSettings } from '../context/UiSettingsContext.jsx';
import { formatPrice } from '../utils/formatPrice.js';
import { readWishlist, subscribeWishlist, toggleWishlist } from '../utils/wishlist.js';

const GHOST_KEY = 'jola-ghost-products';

const readGhostMap = () => {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(window.localStorage.getItem(GHOST_KEY) || '{}');
  } catch {
    return {};
  }
};

const writeGhostMap = (value) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(GHOST_KEY, JSON.stringify(value));
  } catch {
  }
};

const getGhostScore = (value) => {
  if (typeof value === 'object' && value) return Number(value.score || 0);
  return Number(value || 0);
};

export default function ProductCard({ product, onQuickView, onCardClick }) {
  const { addItem } = useCart();
  const { settings } = useUiSettings();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const isRu = (i18n.language || 'ru').toLowerCase().startsWith('ru');
  const img = product?.images?.[0] || '/placeholder-product.svg';
  const discountedPrice = product.discount > 0 ? product.price * (1 - product.discount / 100) : product.price;
  const [wished, setWished] = useState(() => readWishlist().includes(product._id));
  const [ghostScore, setGhostScore] = useState(() => getGhostScore(readGhostMap()?.[product._id]));
  const [isSwiped, setIsSwiped] = useState(false);
  const ghostTimerRef = useRef(null);
  const swipeStartXRef = useRef(0);
  const swipeStartYRef = useRef(0);

  useEffect(() => subscribeWishlist((ids) => setWished(ids.includes(product._id))), [product._id]);

  useEffect(() => () => {
    if (typeof window !== 'undefined') {
      window.clearTimeout(ghostTimerRef.current);
    }
  }, []);

  const isNew = useMemo(() => {
    const created = product?.createdAt ? new Date(product.createdAt).getTime() : 0;
    return created ? Date.now() - created < 30 * 24 * 60 * 60 * 1000 : false;
  }, [product?.createdAt]);

  const availabilityLabel = product.stock > 0
    ? (isRu ? 'В наличии' : 'In stock')
    : (isRu ? 'Под заказ' : 'Pre-order');

  const deliveryLabel = product.stock > 0
    ? (isRu ? 'Быстрая доставка' : 'Fast delivery')
    : (isRu ? 'Срок уточняется' : 'Lead time on request');

  const handleWishlist = (event) => {
    event.preventDefault();
    event.stopPropagation();
    const next = toggleWishlist(product._id);
    setWished(next.includes(product._id));
  };

  const handleAddToCart = (event) => {
    event.preventDefault();
    event.stopPropagation();
    addItem({
      product: product._id,
      name: product.name,
      price: discountedPrice,
      image: img,
      quantity: 1,
      stock: product.stock,
    });
  };

  const handleQuickView = (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (onQuickView) {
      onQuickView(product);
      return;
    }
    navigate(`/products/${product._id}`);
  };

  const handleCardClick = (event) => {
    if (!onCardClick) return;
    event.preventDefault();
    onCardClick(product);
  };

  const commitGhostTrack = () => {
    if (!settings.ghostSession || typeof window === 'undefined') return;
    const current = readGhostMap();
    const nextScore = Math.min(9, getGhostScore(current?.[product._id]) + 1);
    current[product._id] = {
      score: nextScore,
      updatedAt: Date.now(),
    };
    writeGhostMap(current);
    setGhostScore(nextScore);
  };

  const handleGhostTrackStart = () => {
    if (!settings.ghostSession || typeof window === 'undefined') return;
    window.clearTimeout(ghostTimerRef.current);
    ghostTimerRef.current = window.setTimeout(commitGhostTrack, 1200);
  };

  const handleGhostTrackEnd = () => {
    if (typeof window === 'undefined') return;
    window.clearTimeout(ghostTimerRef.current);
  };

  const handleTouchStart = (event) => {
    const touch = event.touches?.[0];
    if (!touch) return;
    swipeStartXRef.current = touch.clientX;
    swipeStartYRef.current = touch.clientY;
  };

  const handleTouchEnd = (event) => {
    const touch = event.changedTouches?.[0];
    if (!touch) return;
    const deltaX = touch.clientX - swipeStartXRef.current;
    const deltaY = touch.clientY - swipeStartYRef.current;
    if (Math.abs(deltaX) < 26 || Math.abs(deltaY) > 22) return;
    if (deltaX < 0) setIsSwiped(true);
    if (deltaX > 0) setIsSwiped(false);
  };

  const cardClasses = [
    'product-card',
    'product-card--market',
    settings.tactileHover ? 'product-card--tactile' : '',
    settings.ghostSession && ghostScore > 0 ? 'product-card--ghost' : '',
    isSwiped ? 'product-card--swiped' : '',
  ].filter(Boolean).join(' ');

  return (
    <motion.div
      className={cardClasses}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      whileHover={{ y: -5 }}
      onMouseEnter={handleGhostTrackStart}
      onMouseLeave={handleGhostTrackEnd}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <Link to={`/products/${product._id}`} className="product-card__link" onClick={handleCardClick}>
        <div className="product-image">
          <img src={img} alt={product.name} loading="lazy" />

          <div className="product-card__badges">
            {product.discount > 0 && <span className="discount-badge">-{product.discount}%</span>}
            {product.isFeatured && <span className="featured-badge">{t('product.featured')}</span>}
            {isNew && <span className="new-badge">{isRu ? 'Новинка' : 'New'}</span>}
            {settings.ghostSession && ghostScore > 1 ? (
              <span className="ghost-badge">{isRu ? 'Ты тут был' : 'Seen before'}</span>
            ) : null}
          </div>

          <div className="product-card__floating-actions">
            <button
              type="button"
              className={wished ? 'pc-icon-btn pc-icon-btn--active' : 'pc-icon-btn'}
              onClick={handleWishlist}
              aria-label={isRu ? 'Добавить в избранное' : 'Add to favorites'}
              title={isRu ? 'Избранное' : 'Favorites'}
            >
              <FiHeart />
            </button>

            <button
              type="button"
              className="pc-icon-btn"
              onClick={handleQuickView}
              aria-label={isRu ? 'Быстрый просмотр' : 'Quick view'}
              title={isRu ? 'Быстрый просмотр' : 'Quick view'}
            >
              <FiEye />
            </button>
          </div>

          <div className="product-card__swipe-hint">{isRu ? 'Свайп влево' : 'Swipe left'}</div>
        </div>

        <div className="product-info">
          <div className="product-card__meta">
            <span className={product.stock > 0 ? 'product-pill product-pill--ok' : 'product-pill'}>{availabilityLabel}</span>
            <span className="product-meta-text">{deliveryLabel}</span>
          </div>

          <h3 className="product-name">{product.brand} {product.name}</h3>

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
            <span className="stars">
              {Array.from({ length: 5 }).map((_, index) => (
                <span key={index} className={index < Math.floor(product.rating) ? 'star filled' : 'star'}>★</span>
              ))}
            </span>
            <span className="reviews-count">({product.numReviews})</span>
          </div>

          <button type="button" onClick={handleAddToCart} className="btn btn-primary btn-add-to-cart" disabled={product.stock === 0}>
            <FiShoppingCart />
            {product.stock > 0 ? t('product.addToCart') : t('product.outOfStock')}
          </button>
        </div>
      </Link>
    </motion.div>
  );
}

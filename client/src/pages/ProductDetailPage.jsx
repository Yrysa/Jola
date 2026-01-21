import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import { motion } from 'framer-motion';
import { FiShoppingCart, FiArrowLeft, FiStar, FiMinus, FiPlus } from 'react-icons/fi';
import { useState } from 'react';
import { useCart } from '../context/CartContext.jsx';
import { productService } from '../services/productService.js';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import toast from 'react-hot-toast';
import { formatPrice } from '../utils/formatPrice.js';
import './ProductDetailPage.css';

export default function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);

  const { data, isLoading, isError, error } = useQuery(
    ['product', id],
    () => productService.getProductById(id), // ИСПРАВЛЕНО: getProduct → getProductById
    {
      cacheTime: 1000 * 60 * 30,
    }
  );

  if (isLoading) return <LoadingSpinner fullScreen />;
  if (isError) return <div className="error-page">Ошибка: {error.message}</div>;

  const product = data; // ИСПРАВЛЕНО: data.product → data (getProductById возвращает сам продукт)
  const discountedPrice = product.discount > 0
    ? product.price * (1 - product.discount / 100)
    : product.price;

  const handleAddToCart = () => {
    addItem({
      product: product._id,
      name: product.name,
      price: discountedPrice,
      image: product.images[0],
      quantity,
    });
    toast.success(`${product.name} добавлен в корзину!`);
  };

  const handleBuyNow = () => {
    addItem({
      product: product._id,
      name: product.name,
      price: discountedPrice,
      image: product.images[0],
      quantity,
    });
    navigate('/checkout');
  };

  return (
    <div className="product-detail-page">
      <div className="container">
        <button className="btn-back" onClick={() => navigate(-1)}>
          <FiArrowLeft /> Назад
        </button>

        <motion.div
          className="product-detail"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="product-images">
            <div className="main-image">
              <img
                src={product.images[selectedImage]}
                alt={product.name}
                loading="lazy"
              />
            </div>
            
            <div className="thumbnail-images">
              {product.images.map((image, index) => (
                <img
                  key={index}
                  src={image}
                  alt={`${product.name} ${index + 1}`}
                  className={selectedImage === index ? 'active' : ''}
                  onClick={() => setSelectedImage(index)}
                  loading="lazy"
                />
              ))}
            </div>
          </div>

          <div className="product-info">
            <h1 className="product-title">{product.name}</h1>
            <p className="product-brand">Бренд: {product.brand}</p>
            
            <div className="product-rating">
              <div className="stars">
                {Array.from({ length: 5 }).map((_, i) => (
                  <FiStar key={i} className={i < Math.floor(product.rating) ? 'filled' : ''} />
                ))}
              </div>
              <span className="rating-value">{product.rating}</span>
              <span className="reviews-count">({product.numReviews} отзывов)</span>
            </div>

            <div className="product-price-section">
              {product.discount > 0 ? (
                <>
                  <span className="original-price">{formatPrice(product.price)}</span>
                  <span className="discounted-price">{formatPrice(discountedPrice)}</span>
                  <span className="discount-badge">-{product.discount}%</span>
                </>
              ) : (
                <span className="price">{formatPrice(product.price)}</span>
              )}
            </div>

            <div className="product-stock">
              {product.stock > 0 ? (
                <span className="in-stock">В наличии: {product.stock} шт.</span>
              ) : (
                <span className="out-of-stock">Нет в наличии</span>
              )}
            </div>

            <div className="product-description">
              <h3>Описание</h3>
              <p>{product.description}</p>
            </div>

            <div className="product-tags">
              {product.tags.map((tag, index) => (
                <span key={index} className="tag">{tag}</span>
              ))}
            </div>

            <div className="product-actions">
              <div className="quantity-selector">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                >
                  <FiMinus />
                </button>
                <span className="quantity">{quantity}</span>
                <button
                  onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                  disabled={quantity >= product.stock}
                >
                  <FiPlus />
                </button>
              </div>

              <div className="action-buttons">
                <button
                  onClick={handleAddToCart}
                  className="btn btn-primary btn-cart"
                  disabled={product.stock === 0}
                >
                  <FiShoppingCart /> В корзину
                </button>
                
                <button
                  onClick={handleBuyNow}
                  className="btn btn-secondary btn-buy"
                  disabled={product.stock === 0}
                >
                  Купить сейчас
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

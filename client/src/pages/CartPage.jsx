import { motion } from 'framer-motion';
import { useCart } from '../context/CartContext.jsx';
import Cart from '../components/Cart.jsx';
import { FiShoppingCart } from 'react-icons/fi';
import { Link, useNavigate } from 'react-router-dom';
import { formatPrice } from '../utils/formatPrice.js';
import './CartPage.css';

export default function CartPage() {
  const { items, getTotalPrice } = useCart();
  const navigate = useNavigate();
  const total = getTotalPrice();

  const handleCheckout = () => {
    navigate('/checkout');
  };

  return (
    <div className="cart-page">
      <div className="container">
        <motion.div
          className="cart-header"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1>
            <FiShoppingCart /> Корзина
          </h1>
          <p>
            {items.length} товар{items.length !== 1 ? 'а' : ''} на сумму {formatPrice(total)}
          </p>
        </motion.div>

        <motion.div
          className="cart-content"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Cart />

          {items.length > 0 && (
            <div className="cart-summary">
              <div className="total-section">
                <h2>Итого: {formatPrice(total)}</h2>
                <p>Без учета доставки и налогов</p>
              </div>

              <div className="cart-actions">
                <Link to="/products" className="btn btn-secondary">
                  Продолжить покупки
                </Link>
                
                <button
                  onClick={handleCheckout}
                  className="btn btn-primary btn-large"
                >
                  Перейти к оформлению
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

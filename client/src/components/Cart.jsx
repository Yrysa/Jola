import { motion, AnimatePresence } from 'framer-motion';
import { FiTrash2, FiPlus, FiMinus } from 'react-icons/fi';
import { useCart } from '../context/CartContext.jsx';
import { Link } from 'react-router-dom';
import { formatPrice } from '../utils/formatPrice.js';

export default function Cart({ mini = false }) {
  const { items, removeItem, updateQuantity, getTotalPrice } = useCart();

  if (items.length === 0) {
    return (
      <div className="empty-cart">
        <p>Корзина пуста</p>
        <Link to="/products" className="btn btn-primary">
          Перейти к покупкам
        </Link>
      </div>
    );
  }

  return (
    <div className={`cart ${mini ? 'cart-mini' : ''}`}>
      <AnimatePresence>
        {items.map((item) => (
          <motion.div
            key={item.product}
            className="cart-item"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
          >
            <img src={item.image} alt={item.name} className="item-image" />
            
            <div className="item-details">
              <h4 className="item-name">{item.name}</h4>
              <p className="item-price">{formatPrice(item.price)}</p>
            </div>

            <div className="item-controls">
              <button
                onClick={() => updateQuantity(item.product, Math.max(1, item.quantity - 1))}
                className="btn-quantity"
              >
                <FiMinus />
              </button>
              
              <span className="quantity">{item.quantity}</span>
              
              <button
                onClick={() => updateQuantity(item.product, item.quantity + 1)}
                className="btn-quantity"
              >
                <FiPlus />
              </button>
            </div>

            <button
              onClick={() => removeItem(item.product)}
              className="btn-remove"
            >
              <FiTrash2 />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>

      <div className="cart-total">
        <h3>Итого: {formatPrice(getTotalPrice())}</h3>
        {!mini && (
          <Link to="/checkout" className="btn btn-primary btn-block">
            Оформить заказ
          </Link>
        )}
      </div>
    </div>
  );
}

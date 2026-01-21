// client/src/components/Header.jsx
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import { FiShoppingCart, FiUser, FiLogOut, FiLogIn } from 'react-icons/fi';
import { motion } from 'framer-motion';

export default function Header() {
  const { user, logout } = useAuth();
  const { getTotalItems } = useCart();
  const navigate = useNavigate();
  const totalItems = getTotalItems();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="header">
      <div className="container">
        <div className="header-content">
          <Link to="/" className="logo">
            <motion.span
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              ProckX
            </motion.span>
          </Link>

          <nav className="nav-menu">
            <Link to="/products">Товары</Link>
            {user?.role === 'admin' && (
              <Link to="/admin" className="admin-link">
                Админка
              </Link>
            )}
          </nav>

          <div className="header-actions">
            <Link to="/cart" className="cart-icon">
              <FiShoppingCart size={24} />
              {totalItems > 0 && (
                <span className="cart-badge">{totalItems}</span>
              )}
            </Link>

            {user ? (
              <div className="user-menu">
                <Link to="/profile" className="user-link">
                  <FiUser size={24} />
                  <span>{user.name}</span>
                </Link>
                <button onClick={handleLogout} className="logout-btn">
                  <FiLogOut size={20} />
                </button>
              </div>
            ) : (
              <Link to="/login" className="login-btn">
                <FiLogIn size={20} />
                <span>Войти</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

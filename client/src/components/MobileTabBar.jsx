import { NavLink, useLocation } from 'react-router-dom';
import { FiGrid, FiHome, FiPackage, FiShoppingCart, FiTool, FiUser } from 'react-icons/fi';
import { useCart } from '../context/CartContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useTranslation } from 'react-i18next';

const HIDDEN_PREFIXES = ['/login', '/register', '/404'];

function isHidden(pathname) {
  return HIDDEN_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export default function MobileTabBar() {
  const { pathname } = useLocation();
  const { getTotalItems } = useCart();
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const totalItems = getTotalItems();
  const isRu = (i18n.language || 'ru').toLowerCase().startsWith('ru');

  if (isHidden(pathname)) return null;

  const items = user?.role === 'admin'
    ? [
        { to: '/', icon: <FiHome aria-hidden="true" />, label: t('nav.home') },
        { to: '/admin', icon: <FiTool aria-hidden="true" />, label: t('nav.admin', { defaultValue: isRu ? 'Админка' : 'Admin' }) },
        { to: '/orders', icon: <FiPackage aria-hidden="true" />, label: isRu ? 'Заказы' : 'Orders', emphasis: true },
        { to: '/cart', icon: <FiShoppingCart aria-hidden="true" />, label: t('nav.cart'), badge: totalItems },
        { to: '/profile', icon: <FiUser aria-hidden="true" />, label: t('nav.profile') },
      ]
    : [
        { to: '/', icon: <FiHome aria-hidden="true" />, label: t('nav.home') },
        { to: '/products', icon: <FiGrid aria-hidden="true" />, label: t('nav.products') },
        { to: '/cart', icon: <FiShoppingCart aria-hidden="true" />, label: t('nav.cart'), badge: totalItems, emphasis: totalItems > 0 },
        { to: '/orders', icon: <FiPackage aria-hidden="true" />, label: isRu ? 'Заказы' : 'Orders', emphasis: true },
        { to: '/profile', icon: <FiUser aria-hidden="true" />, label: t('nav.profile') },
      ];

  return (
    <nav className="mobile-tabbar mobile-tabbar--dock" aria-label={t('nav.mobileNav', { defaultValue: 'Навигация' })}>
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) => `tab-item${isActive ? ' is-active' : ''}${item.emphasis ? ' tab-item--emphasis' : ''}`}
        >
          <span className="tab-icon">
            {item.icon}
            {item.badge > 0 && <span className="tab-badge">{item.badge}</span>}
          </span>
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import {
  FiChevronRight,
  FiHeart,
  FiLogIn,
  FiLogOut,
  FiMenu,
  FiShoppingCart,
  FiUser,
  FiX,
  FiZap,
} from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import ThemeToggle from './ThemeToggle.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import { readWishlist, subscribeWishlist } from '../utils/wishlist.js';

function HeaderNavLink({ to, children, onClick }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) => (isActive ? 'header-link is-active' : 'header-link')}
    >
      {children}
    </NavLink>
  );
}

export default function Header() {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const { getTotalItems } = useCart();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [favoritesCount, setFavoritesCount] = useState(() => readWishlist().length);
  const totalItems = getTotalItems();
  const isRu = (i18n.language || 'ru').toLowerCase().startsWith('ru');

  useEffect(() => subscribeWishlist((ids) => setFavoritesCount(ids.length)), []);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 980) setMobileMenuOpen(false);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const labels = useMemo(
    () => ({
      contacts: isRu ? 'Контакты' : 'Contacts',
      favorites: isRu ? 'Избранное' : 'Favorites',
      profile: t('nav.profile', { defaultValue: isRu ? 'Профиль' : 'Profile' }),
      login: t('nav.login'),
      logout: t('nav.logout'),
      language: isRu ? 'Язык' : 'Language',
    }),
    [isRu, t]
  );

  const closeMobileMenu = () => setMobileMenuOpen(false);

  const handleLogout = () => {
    logout();
    closeMobileMenu();
    navigate('/');
  };

  const currentLng = isRu ? 'ru' : 'en';
  const userName = String(user?.name || '').trim();
  const userInitial = userName ? userName.charAt(0).toUpperCase() : 'J';
  const logoTarget = '/';
  const homeTarget = '/';
  const avatarUrl = String(user?.avatarUrl || user?.avatar || '').trim();
  const mobileProfileAria = user ? labels.profile : labels.login;

  return (
    <header className="header header--jola">
      <div className="container">
        <div className="header-shell">
          <div className="header-main">
            <div className="header-branding">
              <button
                type="button"
                className="mobile-menu-btn"
                onClick={() => setMobileMenuOpen((value) => !value)}
                aria-label={mobileMenuOpen ? t('nav.closeMenu') : t('nav.openMenu')}
                aria-expanded={mobileMenuOpen}
              >
                {mobileMenuOpen ? <FiX size={22} /> : <FiMenu size={22} />}
              </button>

              <Link to={logoTarget} className="logo" aria-label="Jola" onClick={closeMobileMenu}>
                <span className="logo-mark">
                  <FiZap aria-hidden="true" />
                </span>
                <span className="logo-copy">
                  <span className="logo-text">Jola</span>
                  <span className="logo-subtext">Store &amp; Print</span>
                </span>
              </Link>
            </div>

            <nav className="header-links" aria-label={isRu ? 'Основная навигация' : 'Main navigation'}>
              <HeaderNavLink to={homeTarget} onClick={closeMobileMenu}>{t('nav.home')}</HeaderNavLink>
              <HeaderNavLink to="/products" onClick={closeMobileMenu}>{t('nav.products')}</HeaderNavLink>
              <HeaderNavLink to="/polygraphy" onClick={closeMobileMenu}>{t('nav.polygraphy')}</HeaderNavLink>
              {user ? <HeaderNavLink to="/orders" onClick={closeMobileMenu}>{isRu ? 'Заказы' : 'Orders'}</HeaderNavLink> : null}
              <HeaderNavLink to="/contacts" onClick={closeMobileMenu}>{labels.contacts}</HeaderNavLink>
              {user?.role === 'admin' ? <HeaderNavLink to="/admin" onClick={closeMobileMenu}>{t('nav.admin')}</HeaderNavLink> : null}
            </nav>

            <div className="mobile-quick-actions" aria-label={isRu ? 'Быстрые действия' : 'Quick actions'}>
              <Link to="/favorites" className="mobile-quick-btn" onClick={closeMobileMenu} aria-label={labels.favorites}>
                <FiHeart size={18} />
                {favoritesCount > 0 ? <span className="action-badge action-badge--mobile">{favoritesCount}</span> : null}
              </Link>
              <Link to="/cart" className="mobile-quick-btn" onClick={closeMobileMenu} aria-label={t('nav.cart')}>
                <FiShoppingCart size={18} />
                {totalItems > 0 ? <span className="action-badge action-badge--mobile">{totalItems}</span> : null}
              </Link>
              <Link
                to={user ? '/profile' : '/login'}
                className={user ? 'mobile-quick-btn mobile-quick-btn--avatar' : 'mobile-quick-btn mobile-quick-btn--login'}
                onClick={closeMobileMenu}
                aria-label={mobileProfileAria}
              >
                {user ? (
                  avatarUrl ? (
                    <img src={avatarUrl} alt={user.name} className="mobile-profile-chip__avatar mobile-profile-chip__avatar--image" />
                  ) : (
                    <span className="mobile-profile-chip__avatar">{userInitial}</span>
                  )
                ) : (
                  <FiUser size={18} />
                )}
              </Link>
            </div>

            <div className="header-actions header-actions--desktop">
              <div className="header-inline-settings">
                <ThemeToggle />
                <div className="lang-toggle" role="group" aria-label={labels.language}>
                  <button type="button" className={currentLng === 'ru' ? 'active' : ''} onClick={() => i18n.changeLanguage('ru')}>
                    RU
                  </button>
                  <button type="button" className={currentLng === 'en' ? 'active' : ''} onClick={() => i18n.changeLanguage('en')}>
                    EN
                  </button>
                </div>
              </div>

              <Link to="/favorites" className="header-action-btn" aria-label={labels.favorites} title={labels.favorites}>
                <FiHeart size={19} />
                <span>{labels.favorites}</span>
                {favoritesCount > 0 ? <span className="action-badge">{favoritesCount}</span> : null}
              </Link>

              <Link to="/cart" className="header-action-btn" aria-label={t('nav.cart')} title={t('nav.cart')}>
                <FiShoppingCart size={19} />
                <span>{t('nav.cart')}</span>
                {totalItems > 0 ? <span className="action-badge">{totalItems}</span> : null}
              </Link>

              {user ? (
                <div className="user-menu">
                  <Link to="/profile" className="user-link" onClick={closeMobileMenu}>
                    {avatarUrl ? (
                      <img src={avatarUrl} alt={user.name} className="user-avatar-mini user-avatar-mini--image" />
                    ) : (
                      <span className="user-avatar-mini">{userInitial}</span>
                    )}
                    <span className="user-link__meta">
                      <strong>{user.name}</strong>
                      <small>{labels.profile}</small>
                    </span>
                    <FiChevronRight />
                  </Link>
                  <button type="button" onClick={handleLogout} className="logout-btn" aria-label={labels.logout} title={labels.logout}>
                    <FiLogOut size={18} />
                  </button>
                </div>
              ) : (
                <Link to="/login" className="login-btn" onClick={closeMobileMenu}>
                  <FiLogIn size={18} />
                  <span>{labels.login}</span>
                </Link>
              )}
            </div>
          </div>

          <nav className={mobileMenuOpen ? 'header-mobile is-open' : 'header-mobile'}>
            <div className="header-mobile__panel">
              <div className="header-mobile__settings">
                <ThemeToggle />
                <div className="lang-toggle" role="group" aria-label={labels.language}>
                  <button type="button" className={currentLng === 'ru' ? 'active' : ''} onClick={() => i18n.changeLanguage('ru')}>
                    RU
                  </button>
                  <button type="button" className={currentLng === 'en' ? 'active' : ''} onClick={() => i18n.changeLanguage('en')}>
                    EN
                  </button>
                </div>
              </div>

              <div className="header-mobile__links">
                <HeaderNavLink to={homeTarget} onClick={closeMobileMenu}>{t('nav.home')}</HeaderNavLink>
                <HeaderNavLink to="/products" onClick={closeMobileMenu}>{t('nav.products')}</HeaderNavLink>
                <HeaderNavLink to="/polygraphy" onClick={closeMobileMenu}>{t('nav.polygraphy')}</HeaderNavLink>
                {user ? <HeaderNavLink to="/orders" onClick={closeMobileMenu}>{isRu ? 'Заказы' : 'Orders'}</HeaderNavLink> : null}
                <HeaderNavLink to="/contacts" onClick={closeMobileMenu}>{labels.contacts}</HeaderNavLink>
                <HeaderNavLink to="/favorites" onClick={closeMobileMenu}>{labels.favorites}</HeaderNavLink>
                {user?.role === 'admin' ? <HeaderNavLink to="/admin" onClick={closeMobileMenu}>{t('nav.admin')}</HeaderNavLink> : null}
              </div>

              <div className="header-mobile__actions">
                <Link to="/cart" className="header-action-btn" onClick={closeMobileMenu}>
                  <FiShoppingCart />
                  <span>{t('nav.cart')}</span>
                  {totalItems > 0 ? <span className="action-badge">{totalItems}</span> : null}
                </Link>
                {user ? (
                  <>
                    <Link to="/profile" className="header-action-btn header-action-btn--profile-mobile" onClick={closeMobileMenu}>
                      {avatarUrl ? <img src={avatarUrl} alt={user.name} className="header-action-btn__avatar" /> : <FiUser />}
                      <span>{labels.profile}</span>
                    </Link>
                    <button type="button" className="header-action-btn" onClick={handleLogout}>
                      <FiLogOut />
                      <span>{labels.logout}</span>
                    </button>
                  </>
                ) : (
                  <Link to="/login" className="header-action-btn" onClick={closeMobileMenu}>
                    <FiLogIn />
                    <span>{labels.login}</span>
                  </Link>
                )}
              </div>
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}

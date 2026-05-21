import { Link } from 'react-router-dom';
import { FiHeart, FiMail, FiPhone, FiSend, FiShield } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';

export default function Footer() {
  const { i18n } = useTranslation();
  const isRu = (i18n.language || 'ru').toLowerCase().startsWith('ru');

  return (
    <footer className="site-footer">
      <div className="container site-footer__grid">
        <div className="site-footer__brand">
          <div className="site-footer__logo">Jola</div>
          <div className="site-footer__desc">
            {isRu
              ? 'Магазин техники и полиграфии с удобным каталогом, избранным и отправкой файлов на печать.'
              : 'A tech and print store with a convenient catalog, favorites, and file submission for printing.'}
          </div>
          <div className="site-footer__security">
            <FiShield aria-hidden="true" />
            <span>{isRu ? 'HTTPS, безопасные платежи и защита данных' : 'HTTPS, secure payments, and data protection'}</span>
          </div>
        </div>

        <div className="site-footer__col">
          <div className="site-footer__title">{isRu ? 'Навигация' : 'Navigation'}</div>
          <Link to="/">{isRu ? 'Главная' : 'Home'}</Link>
          <Link to="/products">{isRu ? 'Каталог' : 'Catalog'}</Link>
          <Link to="/polygraphy">{isRu ? 'Полиграфия' : 'Print services'}</Link>
          <Link to="/favorites">{isRu ? 'Избранное' : 'Favorites'}</Link>
        </div>

        <div className="site-footer__col">
          <div className="site-footer__title">{isRu ? 'Помощь' : 'Help'}</div>
          <Link to="/shipping">{isRu ? 'Доставка и оплата' : 'Shipping & payment'}</Link>
          <Link to="/contacts">{isRu ? 'Контакты' : 'Contacts'}</Link>
          <Link to="/privacy">{isRu ? 'Конфиденциальность' : 'Privacy'}</Link>
        </div>

        <div className="site-footer__col">
          <div className="site-footer__title">{isRu ? 'Связаться' : 'Get in touch'}</div>
          <a href="tel:+77761739039" className="site-footer__item"><FiPhone /> +7 776 173 9039</a>
          <a href="mailto:support@jola.store" className="site-footer__item"><FiMail /> support@jola.store</a>
          <div className="site-footer__social">
            <a href="https://t.me/Yrysyessey" target="_blank" rel="noreferrer" aria-label="Telegram" className="social-btn"><FiSend /></a>
            <a href="/favorites" aria-label={isRu ? 'Избранное' : 'Favorites'} className="social-btn"><FiHeart /></a>
          </div>
        </div>
      </div>

      <div className="site-footer__bottom">
        <div className="container site-footer__bottom-inner">
          <span>© {new Date().getFullYear()} Jola</span>
          <span className="muted">{isRu ? 'Каталог, заказы, оплата и печатные услуги в одном сервисе.' : 'Catalog, orders, payments, and print services in one place.'}</span>
        </div>
      </div>
    </footer>
  );
}

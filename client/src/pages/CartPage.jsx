import { motion } from 'framer-motion';
import { FiArrowRight, FiCheckCircle, FiHeart, FiPackage, FiShoppingCart, FiSmartphone } from 'react-icons/fi';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useCart } from '../context/CartContext.jsx';
import Cart from '../components/Cart.jsx';
import { formatPrice } from '../utils/formatPrice.js';
import './CartPage.css';

export default function CartPage() {
  const { items, getTotalPrice } = useCart();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const total = getTotalPrice();
  const isRu = (i18n.language || 'ru').toLowerCase().startsWith('ru');
  const totalItems = items.reduce((sum, item) => sum + Number(item?.quantity || 1), 0);

  const highlights = isRu
    ? ['Редактируй позиции перед оплатой', 'На телефоне переход в checkout в один тап', 'После оплаты возврат на текущее устройство']
    : ['Edit items before checkout', 'One-tap move into checkout on mobile', 'Returns to the current device after payment'];

  return (
    <div className="cart-page cart-page--modern">
      <div className="container">
        <motion.div
          className="cart-header cart-header--modern"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          <div className="cart-header__main">
            <span className="cart-header__pill"><FiShoppingCart /> {t('cart.title')}</span>
            <h1>{isRu ? 'Корзина, готовая к быстрому mobile checkout' : 'A cart ready for fast mobile checkout'}</h1>
            <p>
              {items.length > 0
                ? t('cart.itemsOnSum', { count: items.length, sum: formatPrice(total) })
                : t('cart.empty')}
            </p>
            <div className="cart-header__chips">
              {highlights.map((item) => <span key={item}>{item}</span>)}
            </div>
          </div>

          <div className="cart-header__summary-card">
            <div className="cart-header__summary-label">{isRu ? 'Сейчас в корзине' : 'Currently in cart'}</div>
            <strong>{totalItems} {isRu ? 'товаров / услуг' : 'items / services'}</strong>
            <p>{isRu ? 'Проверь состав и переходи к оплате, не теряя текущий экран.' : 'Review your mix and jump into checkout without losing your current screen.'}</p>
          </div>
        </motion.div>

        <motion.div
          className="cart-content"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.45, delay: 0.1 }}
        >
          <Cart />

          {items.length > 0 ? (
            <div className="cart-summary cart-summary--modern">
              <div className="total-section total-section--modern">
                <div className="total-section__eyebrow">{isRu ? 'Сумма заказа' : 'Order total'}</div>
                <h2>{formatPrice(total)}</h2>
                <p>{t('cart.noDeliveryTax')}</p>
              </div>

              <div className="cart-summary__list">
                <div><FiPackage /><span>{isRu ? 'Проверь состав заказа и файлы перед оплатой.' : 'Review order lines and uploaded files before payment.'}</span></div>
                <div><FiCheckCircle /><span>{isRu ? 'История заказов обновится сразу после подтверждения.' : 'Order history updates as soon as confirmation lands.'}</span></div>
                <div><FiSmartphone /><span>{isRu ? 'На телефоне checkout и возврат после оплаты теперь идут по текущему адресу.' : 'On mobile, checkout and payment return now stay on the current address.'}</span></div>
              </div>

              <div className="cart-actions">
                <Link to="/products" className="btn btn-secondary">
                  {t('cart.continue')}
                </Link>
                <Link to="/favorites" className="btn btn-secondary">
                  <FiHeart /> {isRu ? 'Избранное' : 'Favorites'}
                </Link>
                <button onClick={() => navigate('/checkout')} className="btn btn-primary btn-large">
                  {t('cart.toCheckout')} <FiArrowRight />
                </button>
              </div>
            </div>
          ) : (
            <div className="cart-empty-card">
              <div className="cart-empty-card__title">{t('cart.empty')}</div>
              <div className="cart-empty-card__text">
                {isRu ? 'Сохраняй товары в избранное или переходи в каталог, чтобы собрать заказ.' : 'Save products to favorites or open the catalog to start your order.'}
              </div>
              <div className="cart-actions cart-actions--empty">
                <Link to="/products" className="btn btn-primary">{t('cart.goShopping')}</Link>
                <Link to="/favorites" className="btn btn-secondary"><FiHeart /> {isRu ? 'Избранное' : 'Favorites'}</Link>
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {items.length > 0 ? (
        <div className="cart-mobile-hud">
          <div className="cart-mobile-hud__summary">
            <span>{isRu ? 'Итого' : 'Total'}</span>
            <strong>{formatPrice(total)}</strong>
            <small>{totalItems} {isRu ? 'позиции готовы' : 'items ready'}</small>
          </div>
          <button onClick={() => navigate('/checkout')} className="btn btn-primary cart-mobile-hud__button">
            {isRu ? 'К оплате' : 'Checkout'}
          </button>
        </div>
      ) : null}
    </div>
  );
}

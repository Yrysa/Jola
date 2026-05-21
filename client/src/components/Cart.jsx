import { motion, AnimatePresence } from 'framer-motion';
import { FiTrash2 } from 'react-icons/fi';
import { useCart } from '../context/CartContext.jsx';
import { Link } from 'react-router-dom';
import { formatPrice } from '../utils/formatPrice.js';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import QuantityStepper from './QuantityStepper.jsx';
import './Cart.css';

export default function Cart({ mini = false }) {
  const { items, removeItem, updateQuantity, getTotalPrice } = useCart();
  const { t } = useTranslation();

  const persistServiceDraft = (serviceItem) => {
    try {
      const payload = {
        id: serviceItem.id,
        options: serviceItem.options || {},
        fileIds: Array.isArray(serviceItem.fileIds) ? serviceItem.fileIds : (serviceItem.files || []).map((f) => f.fileId),
        files: serviceItem.files || [],
      };
      localStorage.setItem('polygraphy_edit_draft', JSON.stringify(payload));
    } catch {}
  };

  if (items.length === 0) {
    return (
      <div className="empty-cart">
        <p>{t('cart.empty')}</p>
        <Link to="/products" className="btn btn-primary">
          {t('cart.goShopping')}
        </Link>
      </div>
    );
  }

  return (
    <div className={`cart ${mini ? 'cart-mini' : ''}`}>
      <AnimatePresence>
        {items.map((item) => (
          <motion.div
            key={item.id}
            className="cart-item"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
          >
            {item.type === 'product' ? (
              <>
                <img src={item.image} alt={item.name} className="item-image" />

                <div className="item-details">
                  <h4 className="item-name">{item.name}</h4>
                  <div className="item-prices">
                    <p className="item-price">{formatPrice(item.price)}</p>
                    <p className="item-subtotal">{formatPrice(Number(item.price) * Number(item.quantity || 0))}</p>
                  </div>
                </div>

                <div className="item-controls">
                  <QuantityStepper
                    value={item.quantity}
                    min={1}
                    max={item.stock != null ? Math.max(1, Number(item.stock || 1)) : 99}
                    onChange={(n) => {
                      const max = item.stock != null ? Number(item.stock) : null;
                      if (max != null && Number.isFinite(max) && max > 0 && n > max) {
                        toast.error(t('cart.stockLimit', { max }));
                        return;
                      }
                      updateQuantity(item.id, n);
                    }}
                  />
                  {!mini && (
                    <span className="item-stock" title="Остаток на складе">
                      {item.stock != null ? `Ост.: ${item.stock}` : ''}
                    </span>
                  )}
                </div>

                <button onClick={() => removeItem(item.id)} className="btn-remove">
                  <FiTrash2 />
                </button>
              </>
            ) : (
              <>
                <div className="item-image" style={{ display: 'grid', placeItems: 'center' }} aria-hidden="true">🖨️</div>

                <div className="item-details">
                  <h4 className="item-name">{item.serviceTitle}</h4>
                  <div className="item-prices">
                    <p className="item-price">{formatPrice(item.price)}</p>
                    <p className="item-subtotal">{formatPrice(Number(item.price) || 0)}</p>
                  </div>
                  {!mini && (
                    <div className="item-meta" style={{ marginTop: 6, color: 'var(--color-text-secondary)', fontSize: 13 }}>
                      <div>
                        {t('polygraphy.files')}: {Array.isArray(item.files) ? item.files.length : 0} · {t('polygraphy.copies')}: {Number(item?.options?.copies || 1) || 1}
                      </div>
                      <div>
                        {t('polygraphy.format')}: {String(item?.options?.format || 'A4')} · {t('polygraphy.color')}: {item?.options?.color === 'color' ? t('polygraphy.colorful') : t('polygraphy.bw')}
                      </div>
                    </div>
                  )}
                </div>

                <div className="item-controls" style={{ gap: 8 }}>
                  {!mini && (
                    <Link
                      to={`/polygraphy/${item.serviceKey}?edit=${item.id}`}
                      className="btn btn-secondary"
                      onClick={() => persistServiceDraft(item)}
                    >
                      {t('common.edit')}
                    </Link>
                  )}
                </div>

                <button onClick={() => removeItem(item.id)} className="btn-remove">
                  <FiTrash2 />
                </button>
              </>
            )}
          </motion.div>
        ))}
      </AnimatePresence>

      <div className="cart-total">
        <h3>{t('cart.total')}: {formatPrice(getTotalPrice())}</h3>
        {!mini && (
          <Link to="/checkout" className="btn btn-primary btn-block">
            {t('cart.checkout')}
          </Link>
        )}
      </div>
    </div>
  );
}

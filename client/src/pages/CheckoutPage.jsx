import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import {
  FiAlertCircle,
  FiCheckCircle,
  FiClock,
  FiCreditCard,
  FiMapPin,
  FiMessageSquare,
  FiShield,
  FiSmartphone,
  FiTruck,
} from "react-icons/fi";

import { useCart } from "../context/CartContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { orderService } from "../services/orderService.js";
import toast from "react-hot-toast";
import { formatPrice } from "../utils/formatPrice.js";
import { useAppConfig } from "../context/AppConfigContext.jsx";

import "./CheckoutPage.css";
import { useTranslation } from 'react-i18next';

export default function CheckoutPage() {
  const { items, getTotalPrice, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("stripe_card");
  const [deliveryKey, setDeliveryKey] = useState('standard');
  const [policyAccepted, setPolicyAccepted] = useState(false);
  const { taxRate, freeShippingThreshold, shippingFee } = useAppConfig();
  const isRu = (i18n.language || 'ru').toLowerCase().startsWith('ru');
  const currentHost = typeof window !== 'undefined' ? window.location.host : '';

  const PAYMENT_OPTIONS = [
    { key: 'stripe_card', title: isRu ? 'Карта (Stripe)' : 'Card (Stripe)', hint: isRu ? 'Онлайн-оплата Visa / Mastercard через защищённый checkout.' : 'Secure Visa / Mastercard online checkout.', icon: FiCreditCard },
    { key: 'cash', title: isRu ? 'Наличными' : 'Cash', hint: isRu ? 'Оплата при получении после подтверждения заказа.' : 'Pay on delivery after order confirmation.', icon: FiTruck },
  ];

  const DELIVERY_OPTIONS = {
    standard: {
      days: 2,
      labelRu: '1–2 дня',
      labelEn: '1–2 days',
      descriptionRu: 'Оптимальный баланс по скорости и цене.',
      descriptionEn: 'Balanced speed and shipping cost.',
      icon: FiTruck,
    },
    economy: {
      days: 5,
      labelRu: '3–5 дней',
      labelEn: '3–5 days',
      descriptionRu: 'Более спокойная доставка для несрочных заказов.',
      descriptionEn: 'Lower-priority shipping for non-urgent orders.',
      icon: FiClock,
    },
    today: {
      days: 0,
      labelRu: 'Сегодня до 18:00',
      labelEn: 'Today until 18:00',
      descriptionRu: 'Для срочных заказов, если всё уже готово.',
      descriptionEn: 'For urgent orders that are ready right away.',
      icon: FiSmartphone,
    },
  };

  const deliveryLabel = (opt) => (isRu ? opt.labelRu : opt.labelEn);
  const deliveryDescription = (opt) => (isRu ? opt.descriptionRu : opt.descriptionEn);

  const [formData, setFormData] = useState({
    street: user?.address?.street || "",
    city: user?.address?.city || "",
    zipCode: user?.address?.zipCode || "",
    country: user?.address?.country || "",
    customerNote: "",
  });

  const subtotal = getTotalPrice();
  const shipping = subtotal > Number(freeShippingThreshold) ? 0 : Number(shippingFee);
  const tax = subtotal * Number(taxRate);
  const total = subtotal + shipping + tax;
  const totalCount = items.reduce((sum, item) => sum + Number(item?.quantity || 1), 0);

  const providerHighlights = isRu
    ? ['Stripe для онлайн-оплаты', 'Наличные при получении', 'Подтверждение заказа в истории', 'Без скрытых способов оплаты']
    : ['Stripe online checkout', 'Cash on delivery', 'Order confirmation in history', 'No hidden payment methods'];

  const selectedPayment = useMemo(
    () => PAYMENT_OPTIONS.find((option) => option.key === paymentMethod) || PAYMENT_OPTIONS[0],
    [paymentMethod, isRu],
  );
  const SelectedPaymentIcon = selectedPayment.icon;

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!items.length) {
      toast.error(t('checkout.emptyTitle'));
      return;
    }

    if (!policyAccepted) {
      toast.error(isRu ? 'Подтвердите согласие с политикой и условиями покупки.' : 'Please accept the policy and purchase terms.');
      return;
    }

    setLoading(true);

    try {
      const productItems = items.filter((x) => x.type === 'product');
      const serviceItems = items.filter((x) => x.type === 'service');

      const cashConfirmationNote = paymentMethod === 'cash'
        ? (isRu
          ? 'Оплата наличными: клиент должен подтвердить заказ через WhatsApp или Telegram.'
          : 'Cash payment: the customer must confirm the order via WhatsApp or Telegram.')
        : '';

      const orderData = {
        orderItems: productItems.map((item) => ({
          product: item.product?._id || item.product,
          quantity: item.quantity,
        })),
        serviceItems: serviceItems.map((s) => ({
          serviceKey: s.serviceKey,
          fileIds: Array.isArray(s.fileIds)
            ? s.fileIds
            : Array.isArray(s.files)
              ? s.files.map((f) => f.fileId)
              : [],
          options: s.options || {},
        })),
        shippingAddress: {
          street: formData.street,
          city: formData.city,
          zipCode: formData.zipCode,
          country: formData.country,
        },
        paymentMethod,
        deliveryWindow: deliveryLabel(DELIVERY_OPTIONS[deliveryKey] || DELIVERY_OPTIONS.standard),
        deliveryDays: (DELIVERY_OPTIONS[deliveryKey] || DELIVERY_OPTIONS.standard).days,
        customerNote: [formData.customerNote, cashConfirmationNote].filter(Boolean).join('\n'),
      };

      const { order, paymentSession } = await orderService.createOrder(orderData);

      if (paymentSession?.url) {
        window.location.href = paymentSession.url;
        return;
      }

      if (paymentSession?.message) {
        toast.success(paymentSession.message);
      } else {
        toast.success(t('checkout.success'));
      }
      clearCart();
      navigate(`/orders/${order._id}`);
    } catch (err) {
      console.error("Ошибка оформления заказа:", err);
      toast.error(err.message || t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  if (!items.length) {
    return (
      <div className="checkout-page empty">
        <div className="container">
          <div className="checkout-empty-state">
            <h1>{t('checkout.emptyTitle')}</h1>
            <p>{t('checkout.emptySubtitle')}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="checkout-page checkout-page--modern">
      <div className="container checkout-container-modern">
        <motion.section
          className="checkout-hero"
          initial={{ opacity: 0, y: -18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="checkout-hero__copy">
            <span className="checkout-hero__eyebrow">{isRu ? 'Оформление заказа' : 'Checkout'}</span>
            <h1>{isRu ? 'Проверьте заказ и выберите оплату' : 'Review your order and choose payment'}</h1>
            <p>
              {isRu
                ? 'Доступны безопасная онлайн-оплата Stripe и оплата наличными при получении после подтверждения заказа.'
                : 'Choose secure Stripe online payment or cash on delivery after order confirmation.'}
            </p>
            <div className="checkout-hero__chips">
              {providerHighlights.map((item) => (
                <span key={item} className="checkout-hero__chip">{item}</span>
              ))}
            </div>
          </div>
          <div className="checkout-hero__status">
            <div className="checkout-hero__panel">
              <div className="checkout-hero__panel-label">{isRu ? 'Текущее устройство' : 'Current device'}</div>
              <strong>{currentHost || (isRu ? 'Определим автоматически' : 'Detected automatically')}</strong>
              <p>{isRu ? 'После онлайн-оплаты checkout вернёт вас на этот сайт.' : 'After online payment, checkout returns you to this site.'}</p>
            </div>
            <div className="checkout-steps">
              <div className="checkout-step is-active"><span>1</span><small>{isRu ? 'Адрес' : 'Address'}</small></div>
              <div className="checkout-step is-active"><span>2</span><small>{isRu ? 'Оплата' : 'Payment'}</small></div>
              <div className="checkout-step"><span>3</span><small>{isRu ? 'Подтверждение' : 'Confirm'}</small></div>
            </div>
          </div>
        </motion.section>

        <div className="checkout-layout">
          <motion.form
            onSubmit={handleSubmit}
            className="checkout-main"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.05 }}
          >
            <section className="checkout-section-card">
              <div className="checkout-section-head">
                <div>
                  <span>{isRu ? 'Доставка' : 'Delivery'}</span>
                  <h2>{t('checkout.address')}</h2>
                </div>
                <div className="checkout-section-icon"><FiMapPin /></div>
              </div>

              <div className="checkout-form-grid">
                <label className="checkout-field checkout-field--wide">
                  <span>{t('checkout.street')}</span>
                  <input id="street" name="street" type="text" value={formData.street} onChange={handleChange} required />
                </label>

                <label className="checkout-field">
                  <span>{t('checkout.city')}</span>
                  <input id="city" name="city" type="text" value={formData.city} onChange={handleChange} required />
                </label>

                <label className="checkout-field">
                  <span>{t('checkout.zip')}</span>
                  <input id="zipCode" name="zipCode" type="text" value={formData.zipCode} onChange={handleChange} required />
                </label>

                <label className="checkout-field checkout-field--wide">
                  <span>{t('checkout.country')}</span>
                  <input id="country" name="country" type="text" value={formData.country} onChange={handleChange} required />
                </label>
              </div>
            </section>

            <section className="checkout-section-card">
              <div className="checkout-section-head">
                <div>
                  <span>{isRu ? 'Скорость' : 'Speed'}</span>
                  <h2>{t('checkout.deliveryTitle')}</h2>
                </div>
                <div className="checkout-section-icon"><FiTruck /></div>
              </div>
              <div className="delivery-option-grid">
                {Object.entries(DELIVERY_OPTIONS).map(([key, option]) => {
                  const Icon = option.icon;
                  return (
                    <button
                      key={key}
                      type="button"
                      className={`delivery-option-card ${deliveryKey === key ? 'is-active' : ''}`}
                      onClick={() => setDeliveryKey(key)}
                    >
                      <span className="delivery-option-card__icon"><Icon /></span>
                      <strong>{deliveryLabel(option)}</strong>
                      <small>{deliveryDescription(option)}</small>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="checkout-section-card">
              <div className="checkout-section-head">
                <div>
                  <span>{isRu ? 'Оплата' : 'Payment'}</span>
                  <h2>{t('checkout.paymentTitle')}</h2>
                </div>
                <div className="checkout-section-icon"><SelectedPaymentIcon /></div>
              </div>

              <div className="payment-kz-stack checkout-kz-stack">
                <div>
                  <strong>{isRu ? 'Доступные способы оплаты' : 'Available payment methods'}</strong>
                  <p>{isRu ? 'Сейчас активны только Stripe и наличные. Остальные способы будут подключаться отдельно после настройки.' : 'Only Stripe and cash are active now. Other methods can be connected later after configuration.'}</p>
                </div>
                <div className="payment-kz-stack__chips">
                  {providerHighlights.map((item) => (
                    <span key={item} className="payment-kz-chip">{item}</span>
                  ))}
                </div>
              </div>

              <div className="payment-methods payment-methods--grid payment-methods--mobile-strong">
                {PAYMENT_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  return (
                    <button
                      key={option.key}
                      type="button"
                      className={`payment-method ${paymentMethod === option.key ? "active" : ""}`}
                      onClick={() => setPaymentMethod(option.key)}
                    >
                      <span className="payment-method__icon"><Icon /></span>
                      <div>
                        <div>{option.title}</div>
                        <small>{option.hint}</small>
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="payment-help payment-help--accent">
                {paymentMethod === 'stripe_card' ? (isRu ? 'Stripe откроет защищённую страницу оплаты и вернёт вас обратно после завершения.' : 'Stripe opens a secure payment page and returns you after completion.') : null}
                {paymentMethod === 'cash' ? (isRu ? 'При оплате наличными заказ нужно подтвердить через WhatsApp или Telegram до обработки.' : 'For cash payment, the order must be confirmed via WhatsApp or Telegram before processing.') : null}
              </div>
              {paymentMethod === 'cash' ? (
                <div className="cash-confirmation-alert">
                  <FiAlertCircle />
                  <span>{isRu ? 'После оформления свяжитесь с магазином в WhatsApp или Telegram, чтобы подтвердить заказ.' : 'After placing the order, contact the store on WhatsApp or Telegram to confirm it.'}</span>
                </div>
              ) : null}
            </section>

            <section className="checkout-section-card">
              <div className="checkout-section-head">
                <div>
                  <span>{isRu ? 'Комментарий' : 'Comment'}</span>
                  <h2>{t('checkout.customerNote')}</h2>
                </div>
                <div className="checkout-section-icon"><FiMessageSquare /></div>
              </div>
              <label className="checkout-field checkout-field--wide">
                <span>{t('checkout.customerNote')}</span>
                <textarea
                  id="customerNote"
                  name="customerNote"
                  value={formData.customerNote}
                  onChange={handleChange}
                  placeholder={t('checkout.customerNotePlaceholder')}
                  rows={4}
                />
                <small>{t('checkout.customerNoteHint')}</small>
              </label>
            </section>

            <section className="checkout-section-card checkout-policy-card">
              <label className="checkout-policy-check">
                <input
                  type="checkbox"
                  checked={policyAccepted}
                  onChange={(event) => setPolicyAccepted(event.target.checked)}
                  required
                />
                <span>
                  {isRu ? 'Я согласен с ' : 'I agree with the '}
                  <Link to="/privacy" target="_blank" rel="noreferrer">
                    {isRu ? 'политикой конфиденциальности' : 'privacy policy'}
                  </Link>
                  {isRu ? ' и условиями оформления заказа.' : ' and order terms.'}
                </span>
              </label>
            </section>

            <div className="checkout-submit-row checkout-submit-row--desktop">
              <button type="submit" className="btn btn-primary btn-checkout-large" disabled={loading || !policyAccepted}>
                {loading ? t('checkout.placing') : t('checkout.placeOrder', { sum: formatPrice(total) })}
              </button>
              <p>{isRu ? 'Заказ будет создан после подтверждения данных и выбранного способа оплаты.' : 'The order will be created after confirming your details and payment method.'}</p>
            </div>
          </motion.form>

          <motion.aside
            className="checkout-sidebar"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.1 }}
          >
            <div className="checkout-summary-card checkout-summary-card--sticky">
              <div className="checkout-summary-card__head">
                <div>
                  <span>{isRu ? 'Ваш заказ' : 'Your order'}</span>
                  <h2>{t('checkout.yourOrder')}</h2>
                </div>
                <div className="checkout-summary-card__badge">{totalCount} {isRu ? 'шт.' : 'items'}</div>
              </div>

              <div className="order-items order-items--compact">
                {items.map((item) => (
                  <div key={item.id} className="order-item order-item--modern">
                    <div className="order-item-left">
                      <div className="order-item-image-wrapper">
                        {item.type === 'product' ? (
                          <img src={item.image} alt={item.name} className="order-item-image" />
                        ) : (
                          <div className="order-item-image order-item-image--service" aria-hidden="true">🖨️</div>
                        )}
                      </div>
                      <div className="order-item-info">
                        <h3>{item.type === 'product' ? item.name : item.serviceTitle}</h3>
                        {item.type === 'product' ? (
                          <p>{item.quantity} × {formatPrice(item.price)}</p>
                        ) : (
                          <p>
                            {Array.isArray(item.files) ? item.files.length : 0} {t('polygraphy.files').toLowerCase()} · {t('polygraphy.copies').toLowerCase()}: {Number(item?.options?.copies || 1) || 1}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="item-total">
                      {item.type === 'product' ? formatPrice(item.quantity * item.price) : formatPrice(Number(item.price) || 0)}
                    </div>
                  </div>
                ))}
              </div>

              <div className="order-totals order-totals--modern">
                <div className="total-row"><span>{t('checkout.subtotal')}</span><span>{formatPrice(subtotal)}</span></div>
                <div className="total-row"><span>{t('checkout.shipping')}</span><span>{formatPrice(shipping)}</span></div>
                <div className="total-row"><span>{t('checkout.tax')}</span><span>{formatPrice(tax)}</span></div>
                <div className="total-row total-row-final"><span>{t('checkout.total')}</span><span>{formatPrice(total)}</span></div>
              </div>

              <div className="checkout-security checkout-security--stacked">
                <div><FiShield /><span>{t('checkout.secure')}</span></div>
                <div><FiCheckCircle /><span>{isRu ? 'Stripe или наличные' : 'Stripe or cash'}</span></div>
              </div>
            </div>
          </motion.aside>
        </div>
      </div>

      <div className="checkout-mobile-hud">
        <div className="checkout-mobile-hud__summary">
          <span>{isRu ? 'К оплате' : 'Pay now'}</span>
          <strong>{formatPrice(total)}</strong>
          <small>{currentHost || (isRu ? 'Определим адрес' : 'Address auto-detected')}</small>
        </div>
        <button type="button" className="btn btn-primary checkout-mobile-hud__button" disabled={loading || !policyAccepted} onClick={handleSubmit}>
          {loading ? t('checkout.placing') : (isRu ? 'Оплатить / оформить' : 'Pay / place order')}
        </button>
      </div>
    </div>
  );
}

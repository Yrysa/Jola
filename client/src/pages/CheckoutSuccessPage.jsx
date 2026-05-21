import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FiAlertCircle, FiArrowRight, FiCheckCircle, FiClock, FiPackage } from 'react-icons/fi';
import api from '../services/api.js';
import { useCart } from '../context/CartContext.jsx';
import './CheckoutPage.css';

export default function CheckoutSuccessPage() {
  const [searchParams] = useSearchParams();
  const [state, setState] = useState('loading');
  const [orderId, setOrderId] = useState('');
  const { clearCart } = useCart();

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    const queryOrderId = searchParams.get('orderId');

    const verify = async () => {
      if (!sessionId) {
        setState('error');
        return;
      }

      try {
        let data = null;
        for (let attempt = 0; attempt < 3; attempt += 1) {
          const response = await api.post('/payments/stripe/verify', {
            session_id: sessionId,
            orderId: queryOrderId,
          });
          data = response?.data?.data;
          if (data?.paid) break;
          if (attempt < 2) {
            await new Promise((resolve) => window.setTimeout(resolve, 1500));
          }
        }

        if (data?.paid) {
          setOrderId(data.orderId || queryOrderId || '');
          clearCart();
          localStorage.removeItem('cart');
          localStorage.removeItem('cartItems');
          localStorage.removeItem('checkout_cart');
          window.dispatchEvent(new CustomEvent('cart-updated'));
          setState('success');
          return;
        }

        setState('pending');
      } catch (error) {
        console.error('Stripe verify error:', error);
        setState('error');
      }
    };

    verify();
  }, [searchParams, clearCart]);

  const view = useMemo(() => {
    if (state === 'success') {
      return {
        icon: <FiCheckCircle />,
        title: 'Оплата прошла успешно',
        text: 'Заказ подтверждён и добавлен в историю. Можно сразу открыть детали заказа.',
        tone: 'success',
      };
    }
    if (state === 'pending') {
      return {
        icon: <FiClock />,
        title: 'Платёж ещё обрабатывается',
        text: 'Подожди ещё немного или открой раздел заказов — обновление может прилететь чуть позже.',
        tone: 'pending',
      };
    }
    if (state === 'error') {
      return {
        icon: <FiAlertCircle />,
        title: 'Не удалось проверить оплату',
        text: 'Если деньги уже списаны, webhook всё равно должен отметить заказ как оплаченный.',
        tone: 'error',
      };
    }
    return {
      icon: <FiPackage />,
      title: 'Проверяем оплату...',
      text: 'Пара секунд — сверяем сессию оплаты и статус заказа.',
      tone: 'loading',
    };
  }, [state]);

  return (
    <section className="checkout-page checkout-page--modern">
      <div className="container checkout-container-modern">
        <div className="checkout-hero checkout-hero--success-single">
          <div className="checkout-hero__copy">
            <span className="checkout-hero__eyebrow">Payment result</span>
            <h1>{view.title}</h1>
            <p>{view.text}</p>
          </div>
          <div className={`checkout-success-card checkout-success-card--${view.tone}`}>
            <div className="checkout-success-card__icon">{view.icon}</div>
            <strong>{orderId ? `#${orderId}` : 'Stripe checkout'}</strong>
            <p>{state === 'loading' ? 'Связываем оплату с заказом' : 'Результат уже синхронизирован с текущим устройством'}</p>
          </div>
        </div>

        <div className="checkout-success-actions">
          <Link className="btn btn-primary btn-checkout-large" to={orderId ? `/orders/${orderId}` : '/orders'}>
            <FiPackage />
            <span>{orderId ? 'Открыть заказ' : 'Мои заказы'}</span>
          </Link>
          <Link className="btn btn-secondary btn-checkout-large" to="/products">
            <span>Вернуться в каталог</span>
            <FiArrowRight />
          </Link>
        </div>
      </div>
    </section>
  );
}

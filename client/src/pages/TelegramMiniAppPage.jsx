import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import {
  FiArrowRight,
  FiCheckCircle,
  FiClock,
  FiCreditCard,
  FiExternalLink,
  FiFileText,
  FiFilter,
  FiGrid,
  FiHome,
  FiMapPin,
  FiPackage,
  FiPhone,
  FiSearch,
  FiSettings,
  FiShoppingBag,
  FiTruck,
  FiUser,
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { orderService } from '../services/orderService.js';
import { formatPrice } from '../utils/formatPrice.js';
import './TelegramMiniAppPage.css';

const STATUS_LABELS = {
  pending: 'Ожидает',
  confirmed: 'Подтверждён',
  processing: 'В обработке',
  shipped: 'Отправлен',
  delivered: 'Доставлен',
  cancelled: 'Отменён',
};

const STATUS_TONE = {
  pending: 'warn',
  confirmed: 'info',
  processing: 'info',
  shipped: 'info',
  delivered: 'ok',
  cancelled: 'danger',
};

const STATUS_ACTIONS = ['confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
const ACTIVE_STATUSES = new Set(['pending', 'confirmed', 'processing', 'shipped']);

const safeDate = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString();
};

const orderSearchHaystack = (order) => [
  order?._id,
  order?.user?.name,
  order?.user?.email,
  order?.customerNote,
  order?.adminNote,
  order?.shippingAddress?.city,
  order?.shippingAddress?.street,
  ...(order?.orderItems || []).map((item) => item?.name),
  ...(order?.serviceItems || []).map((item) => item?.serviceTitle),
]
  .map((value) => String(value || '').toLowerCase())
  .join(' ');

function StatusPill({ status, extra = '' }) {
  return <span className={`tgapp-status tgapp-status--${STATUS_TONE[status] || 'muted'} ${extra}`}>{STATUS_LABELS[status] || status || '—'}</span>;
}

function PaymentPill({ order }) {
  return <span className={`tgapp-status ${order?.isPaid ? 'tgapp-status--ok' : 'tgapp-status--warn'}`}>{order?.isPaid ? 'Оплачен' : 'Не оплачен'}</span>;
}

function SummaryCard({ icon: Icon, label, value, hint }) {
  return (
    <article className="tgapp-summary-card">
      <div className="tgapp-summary-card__icon"><Icon /></div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        {hint ? <small>{hint}</small> : null}
      </div>
    </article>
  );
}

function OrderFiles({ order }) {
  const files = (order?.serviceItems || []).flatMap((service) => (service?.files || []).map((file) => ({
    ...file,
    serviceTitle: service?.serviceTitle,
  })));

  if (!files.length) return <div className="tgapp-empty-inline">Файлы не прикреплены</div>;

  return (
    <div className="tgapp-file-grid">
      {files.map((file, index) => (
        <a
          key={`${file.fileId || file.url || index}`}
          className="tgapp-file-card"
          href={file.url || '#'}
          target="_blank"
          rel="noreferrer"
        >
          <div className="tgapp-file-card__head">
            <FiFileText />
            <span>{file.originalName || `Файл ${index + 1}`}</span>
          </div>
          <small>{file.serviceTitle || 'Услуга печати'}</small>
          <strong>{file.pages ? `${file.pages} стр.` : (file.ext || 'Открыть файл')}</strong>
        </a>
      ))}
    </div>
  );
}

function OrderTimeline({ order }) {
  const history = Array.isArray(order?.statusHistory) ? order.statusHistory : [];
  if (!history.length) return <div className="tgapp-empty-inline">История статусов пока пуста</div>;
  return (
    <div className="tgapp-timeline">
      {history.slice().reverse().map((entry, index) => (
        <div className="tgapp-timeline__item" key={`${entry.at || index}-${entry.status || index}`}>
          <span className="tgapp-timeline__dot" />
          <div>
            <div className="tgapp-timeline__top">
              <StatusPill status={entry.status} extra="tgapp-status--compact" />
              <small>{safeDate(entry.at)}</small>
            </div>
            {(entry.note || entry.actor || entry.source) ? (
              <p>{[entry.note, entry.actor, entry.source].filter(Boolean).join(' · ')}</p>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}

function OrderDetailPanel({ order, isAdmin = false, onStatusChange, statusBusy }) {
  if (!order) {
    return (
      <section className="tgapp-order-detail tgapp-order-detail--empty">
        <FiPackage />
        <strong>Выберите заказ</strong>
        <p>Откройте карточку слева, чтобы увидеть полный состав, клиента, оплату, файлы и историю.</p>
      </section>
    );
  }

  return (
    <section className="tgapp-order-detail">
      <div className="tgapp-order-detail__hero">
        <div>
          <small>Заказ #{String(order._id || '').slice(-6)}</small>
          <h2>{order.orderItems?.[0]?.name || order.serviceItems?.[0]?.serviceTitle || 'Заказ клиента'}</h2>
          <div className="tgapp-order-detail__meta">
            <StatusPill status={order.status} />
            <PaymentPill order={order} />
            <span className="tgapp-meta-chip"><FiClock /> {safeDate(order.createdAt)}</span>
          </div>
        </div>
        <div className="tgapp-order-detail__cta">
          <Link className="btn btn-secondary" to={`/orders/${order._id}?telegram=1`}>Открыть страницу</Link>
        </div>
      </div>

      {isAdmin ? (
        <div className="tgapp-admin-actions">
          {STATUS_ACTIONS.map((status) => (
            <button
              key={status}
              type="button"
              className={`tgapp-action-pill ${order.status === status ? 'is-active' : ''}`}
              disabled={statusBusy || order.status === status}
              onClick={() => onStatusChange?.(status)}
            >
              {STATUS_LABELS[status]}
            </button>
          ))}
        </div>
      ) : null}

      <div className="tgapp-detail-grid">
        <article className="tgapp-detail-card">
          <div className="tgapp-detail-card__head"><FiUser /><span>{isAdmin ? 'Клиент и заказ' : 'Заказ и доставка'}</span></div>
          <ul className="tgapp-detail-list">
            {isAdmin ? (
              <>
                <li><strong>Клиент</strong><span>{order.user?.name || '—'}</span></li>
                <li><strong>Email</strong><span>{order.user?.email || '—'}</span></li>
                <li><strong>Телефон</strong><span>{order.user?.phone || '—'}</span></li>
              </>
            ) : null}
            <li><strong>Оплата</strong><span>{order.paymentMethod || '—'} · {order.isPaid ? 'подтверждена' : 'ожидается'}</span></li>
            <li><strong>Доставка</strong><span>{order.deliveryWindow || 'Срок уточняется'}</span></li>
            <li><strong>Адрес</strong><span>{[order.shippingAddress?.city, order.shippingAddress?.street, order.shippingAddress?.zipCode].filter(Boolean).join(', ') || '—'}</span></li>
            <li><strong>Сумма</strong><span>{formatPrice(order.totalPrice || 0)}</span></li>
          </ul>
        </article>

        <article className="tgapp-detail-card">
          <div className="tgapp-detail-card__head"><FiShoppingBag /><span>Состав заказа</span></div>
          <div className="tgapp-line-items">
            {(order.orderItems || []).map((item, index) => (
              <div className="tgapp-line-item" key={`${item.product || item.name || index}`}>
                <div>
                  <strong>{item.name}</strong>
                  <span>{item.quantity} × {formatPrice(item.price || 0)}</span>
                </div>
                <em>{formatPrice((Number(item.quantity) || 0) * (Number(item.price) || 0))}</em>
              </div>
            ))}
            {(order.serviceItems || []).map((service, index) => (
              <div className="tgapp-line-item" key={`${service.serviceKey || service.serviceTitle || index}`}>
                <div>
                  <strong>{service.serviceTitle}</strong>
                  <span>{(service.files || []).length} файл(ов) · {service.options?.copies ? `${service.options.copies} копий` : 'Без доп. параметров'}</span>
                </div>
                <em>{formatPrice(service.price || 0)}</em>
              </div>
            ))}
            {(!order.orderItems?.length && !order.serviceItems?.length) ? <div className="tgapp-empty-inline">Состав заказа пуст</div> : null}
          </div>
        </article>

        <article className="tgapp-detail-card tgapp-detail-card--wide">
          <div className="tgapp-detail-card__head"><FiFileText /><span>Файлы и история</span></div>
          <OrderFiles order={order} />
          <div className="tgapp-divider" />
          <OrderTimeline order={order} />
        </article>

        {(order.customerNote || order.adminNote) ? (
          <article className="tgapp-detail-card tgapp-detail-card--wide">
            <div className="tgapp-detail-card__head"><FiMessageSquarePlaceholder /><span>Заметки</span></div>
            {order.customerNote ? <div className="tgapp-note-box"><strong>Комментарий клиента</strong><p>{order.customerNote}</p></div> : null}
            {order.adminNote ? <div className="tgapp-note-box"><strong>Заметка админа</strong><p>{order.adminNote}</p></div> : null}
          </article>
        ) : null}
      </div>
    </section>
  );
}

function FiMessageSquarePlaceholder() {
  return <FiFileText />;
}

export default function TelegramMiniAppPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const isAdmin = user?.role === 'admin';
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const initialView = searchParams.get('view') || (isAdmin ? 'admin' : 'orders');
  const [view, setView] = useState(initialView);
  const [selectedOrderId, setSelectedOrderId] = useState(searchParams.get('order') || '');

  useEffect(() => {
    const tg = window?.Telegram?.WebApp;
    if (!tg) return;
    try {
      tg.ready();
      tg.expand();
      tg.setHeaderColor?.('#0f172a');
      tg.setBackgroundColor?.('#09111f');
    } catch {
      
    }
  }, []);

  useEffect(() => {
    if (!isAdmin && view === 'admin') setView('orders');
  }, [isAdmin, view]);

  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    next.set('telegram', '1');
    next.set('view', view);
    if (selectedOrderId) next.set('order', selectedOrderId);
    else next.delete('order');
    setSearchParams(next, { replace: true });
    
  }, [view, selectedOrderId]);

  const ordersQuery = useQuery(
    ['telegram-mini-app-orders', isAdmin],
    () => (isAdmin ? orderService.getAllOrders() : orderService.getMyOrders()),
    { refetchInterval: 10000 }
  );

  const updateStatusMutation = useMutation(
    ({ id, body }) => orderService.updateOrderStatus(id, body),
    {
      onSuccess: () => {
        toast.success('Статус заказа обновлён');
        queryClient.invalidateQueries(['telegram-mini-app-orders']);
        queryClient.invalidateQueries(['admin-orders']);
        queryClient.invalidateQueries(['my-orders']);
      },
      onError: (error) => toast.error(error.message || 'Не удалось обновить заказ'),
    }
  );

  const orders = useMemo(() => {
    const list = ordersQuery.data?.orders || [];
    const query = String(search || '').trim().toLowerCase();
    return list.filter((order) => {
      const statusOk = statusFilter === 'all' ? true : String(order.status) === statusFilter;
      const paymentOk = paymentFilter === 'all' ? true : paymentFilter === 'paid' ? Boolean(order.isPaid) : !order.isPaid;
      const searchOk = !query ? true : orderSearchHaystack(order).includes(query);
      return statusOk && paymentOk && searchOk;
    });
  }, [ordersQuery.data?.orders, paymentFilter, search, statusFilter]);

  const selectedOrder = useMemo(() => {
    if (!orders.length) return null;
    return orders.find((order) => String(order._id) === String(selectedOrderId)) || orders[0] || null;
  }, [orders, selectedOrderId]);

  useEffect(() => {
    if (!orders.length) return;
    if (!selectedOrderId) {
      setSelectedOrderId(String(orders[0]._id));
      return;
    }
    if (!orders.some((order) => String(order._id) === String(selectedOrderId))) {
      setSelectedOrderId(String(orders[0]._id));
    }
  }, [orders, selectedOrderId]);

  const summary = useMemo(() => {
    const base = ordersQuery.data?.orders || [];
    return {
      total: base.length,
      active: base.filter((order) => ACTIVE_STATUSES.has(String(order.status))).length,
      paid: base.filter((order) => Boolean(order.isPaid)).length,
      unpaid: base.filter((order) => !order.isPaid).length,
      revenue: base.reduce((sum, order) => sum + Number(order.totalPrice || 0), 0),
    };
  }, [ordersQuery.data?.orders]);

  const handleStatusChange = (nextStatus) => {
    if (!selectedOrder?._id) return;
    updateStatusMutation.mutate({
      id: selectedOrder._id,
      body: { status: nextStatus, note: 'Из Telegram Mini App' },
    });
  };

  if (ordersQuery.isLoading) return <LoadingSpinner fullScreen />;

  return (
    <div className="tgapp-shell">
      <div className="tgapp-frame">
        <header className="tgapp-hero">
          <div>
            <span className="tgapp-kicker">Telegram Mini App</span>
            <h1>tg Jola</h1>
            <p>
              {isAdmin
                ? 'Админский режим: управление заказами, оплатами, статусами и полными деталями прямо внутри Telegram.'
                : 'Ваши заказы, файлы, статусы и быстрый вход в ключевые разделы сайта прямо из Telegram.'}
            </p>
          </div>
          <div className="tgapp-hero__controls">
            <button type="button" className={`tgapp-view-switch ${view === 'orders' ? 'is-active' : ''}`} onClick={() => setView('orders')}>
              <FiPackage /> Заказы
            </button>
            {isAdmin ? (
              <button type="button" className={`tgapp-view-switch ${view === 'admin' ? 'is-active' : ''}`} onClick={() => setView('admin')}>
                <FiSettings /> Админка
              </button>
            ) : null}
          </div>
        </header>

        <section className="tgapp-shortcuts">
          <Link to="/?telegram=1" className="tgapp-shortcut"><FiHome /><span>Сайт</span></Link>
          <Link to="/products?telegram=1" className="tgapp-shortcut"><FiGrid /><span>Каталог</span></Link>
          <Link to="/profile?telegram=1" className="tgapp-shortcut"><FiUser /><span>Профиль</span></Link>
          <Link to={isAdmin ? '/admin?telegram=1' : '/orders?telegram=1'} className="tgapp-shortcut"><FiExternalLink /><span>{isAdmin ? 'Полная админка' : 'Мои заказы'}</span></Link>
        </section>

        <section className="tgapp-summary-grid">
          <SummaryCard icon={FiShoppingBag} label="Всего заказов" value={summary.total} hint={isAdmin ? 'Из базы сайта' : 'Ваш поток'} />
          <SummaryCard icon={FiTruck} label="Активные" value={summary.active} hint="В работе и доставке" />
          <SummaryCard icon={FiCheckCircle} label="Оплаченные" value={summary.paid} hint={`Не оплачено: ${summary.unpaid}`} />
          <SummaryCard icon={FiCreditCard} label="Сумма" value={formatPrice(summary.revenue)} hint={isAdmin ? 'Оборот по заказам' : 'Ваш общий чек'} />
        </section>

        <section className="tgapp-toolbar">
          <label className="tgapp-search">
            <FiSearch />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={isAdmin ? 'Найти заказ, клиента, email, адрес' : 'Найти заказ, услугу, адрес'} />
          </label>
          <div className="tgapp-filters">
            <label>
              <FiFilter />
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="all">Все статусы</option>
                {Object.keys(STATUS_LABELS).map((status) => <option key={status} value={status}>{STATUS_LABELS[status]}</option>)}
              </select>
            </label>
            <label>
              <FiCreditCard />
              <select value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)}>
                <option value="all">Все оплаты</option>
                <option value="paid">Только оплаченные</option>
                <option value="unpaid">Только не оплаченные</option>
              </select>
            </label>
          </div>
        </section>

        <section className="tgapp-content-grid">
          <aside className="tgapp-order-stream">
            {orders.length ? orders.map((order) => (
              <button
                type="button"
                key={order._id}
                className={`tgapp-order-card ${String(order._id) === String(selectedOrder?._id) ? 'is-selected' : ''}`}
                onClick={() => setSelectedOrderId(String(order._id))}
              >
                <div className="tgapp-order-card__top">
                  <strong>#{String(order._id || '').slice(-6)}</strong>
                  <StatusPill status={order.status} />
                </div>
                <div className="tgapp-order-card__body">
                  <span>{isAdmin ? (order.user?.name || 'Клиент') : (order.orderItems?.[0]?.name || order.serviceItems?.[0]?.serviceTitle || 'Заказ')}</span>
                  <p>{[order.shippingAddress?.city, order.deliveryWindow].filter(Boolean).join(' · ') || 'Без адреса'}</p>
                </div>
                <div className="tgapp-order-card__meta">
                  <PaymentPill order={order} />
                  <em>{formatPrice(order.totalPrice || 0)}</em>
                </div>
                {isAdmin ? (
                  <div className="tgapp-order-card__admin">
                    <span><FiUser /> {order.user?.email || order.user?.phone || 'Без контактов'}</span>
                    <span><FiPhone /> {order.user?.phone || '—'}</span>
                  </div>
                ) : null}
                <div className="tgapp-order-card__foot">
                  <small>{safeDate(order.createdAt)}</small>
                  <span><FiArrowRight /></span>
                </div>
              </button>
            )) : <div className="tgapp-empty-stream">Заказы не найдены по текущим фильтрам.</div>}
          </aside>

          <OrderDetailPanel
            order={selectedOrder}
            isAdmin={view === 'admin' && isAdmin}
            onStatusChange={handleStatusChange}
            statusBusy={updateStatusMutation.isLoading}
          />
        </section>
      </div>
    </div>
  );
}

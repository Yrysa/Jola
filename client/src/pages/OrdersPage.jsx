import { useMemo, useState } from 'react';
import { useQuery } from 'react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { FiArrowRight, FiClock, FiDownload, FiFilter, FiPackage, FiSearch, FiTruck } from 'react-icons/fi';
import { orderService } from '../services/orderService.js';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import { formatPrice } from '../utils/formatPrice.js';
import './OrdersPage.css';
import { useTranslation } from 'react-i18next';

const STATUS_META = {
  pending: { tone: 'warn', progress: 10 },
  confirmed: { tone: 'info', progress: 28 },
  processing: { tone: 'info', progress: 55 },
  shipped: { tone: 'info', progress: 80 },
  delivered: { tone: 'ok', progress: 100 },
  cancelled: { tone: 'danger', progress: 100 },
};

const FLOW = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];

export default function OrdersPage() {
  const { data, isLoading, error } = useQuery('my-orders', orderService.getMyOrders, {
    refetchInterval: 5000,
  });
  const { t, i18n } = useTranslation();
  const isRu = (i18n.language || 'ru').toLowerCase().startsWith('ru');
  const [searchParams] = useSearchParams();
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const statusLabel = (s) => t(`orderStatuses.${s}`, s);
  const orders = data?.orders || [];

  const summary = useMemo(() => ({
    total: orders.length,
    active: orders.filter((order) => ['pending', 'confirmed', 'processing', 'shipped'].includes(order.status)).length,
    delivered: orders.filter((order) => order.status === 'delivered' || order.isDelivered).length,
    spent: orders.reduce((acc, order) => acc + Number(order.totalPrice || 0), 0),
  }), [orders]);

  const filteredOrders = useMemo(() => {
    const query = String(search || '').trim().toLowerCase();
    return orders.filter((order) => {
      if (filter === 'active' && !['pending', 'confirmed', 'processing', 'shipped'].includes(order.status)) return false;
      if (filter === 'done' && order.status !== 'delivered') return false;
      if (filter === 'cancelled' && order.status !== 'cancelled') return false;
      if (!query) return true;
      const haystack = [
        order._id,
        order.customerNote,
        order.adminNote,
        order.shippingAddress?.city,
        order.shippingAddress?.street,
        ...(order.orderItems || []).map((item) => item?.name),
        ...(order.serviceItems || []).map((item) => item?.serviceTitle),
      ].map((value) => String(value || '').toLowerCase()).join(' ');
      return haystack.includes(query);
    });
  }, [filter, orders, search]);

  const nextIncoming = useMemo(() => {
    return [...orders]
      .filter((order) => ['pending', 'confirmed', 'processing', 'shipped'].includes(String(order.status || 'pending')))
      .sort((a, b) => new Date(a.expectedDeliveryDate || a.createdAt) - new Date(b.expectedDeliveryDate || b.createdAt))[0] || null;
  }, [orders]);

  if (isLoading) return <LoadingSpinner fullScreen />;
  if (error) {
    return (
      <div className="orders-page orders-page--v3">
        <div className="orders-shell container">
          <div className="orders-empty-state">{t('orders.loadError')}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="orders-page orders-page--v3">
      <div className="orders-shell container">
        <section className="orders-hero-card orders-hero-card--v3">
          <div className="orders-hero-card__main">
            <div className="orders-kicker">Jola Orders</div>
            <h1>{t('orders.my')}</h1>
            <p>{isRu ? 'Удобная лента ваших заказов: статус, файлы, этапы производства, сроки и быстрый переход в детали.' : 'A clearer stream of your orders with status, files, production stage, ETA, and a faster route into details.'}</p>
            <div className="orders-hero-actions">
              <Link to="/profile" className="btn btn-secondary">{isRu ? 'Кабинет' : 'Profile'}</Link>
              <Link to="/products" className="btn btn-primary">{isRu ? 'В каталог' : 'Browse catalog'}</Link>
            </div>
          </div>
          <div className="orders-hero-card__spotlight">
            <small>{isRu ? 'Ближайший активный заказ' : 'Nearest active order'}</small>
            {nextIncoming ? (
              <>
                <strong>#{String(nextIncoming._id || '').slice(-6)}</strong>
                <span>{statusLabel(nextIncoming.status)}</span>
                <p>{nextIncoming.expectedDeliveryDate ? new Date(nextIncoming.expectedDeliveryDate).toLocaleString() : (nextIncoming.deliveryWindow || (isRu ? 'Срок уточняется' : 'ETA pending'))}</p>
              </>
            ) : (
              <>
                <strong>{isRu ? 'Нет активных заказов' : 'No active orders'}</strong>
                <p>{isRu ? 'Как только вы оформите новый заказ, он появится здесь.' : 'Your next live order will appear here as soon as you place one.'}</p>
              </>
            )}
          </div>
          {searchParams.get('telegram') ? (
            <div className="orders-telegram-banner orders-telegram-banner--v3">
              <FiTruck />
              <div>
                <strong>{isRu ? 'Вы вошли из Telegram' : 'You opened this from Telegram'}</strong>
                <span>{isRu ? 'Здесь уже показаны только ваши заказы. Откройте карточку ниже, чтобы увидеть историю, файлы и детали.' : 'Only your own orders are shown here. Open any card below to view history, files, and full details.'}</span>
              </div>
            </div>
          ) : null}
        </section>

        <section className="orders-summary-grid orders-summary-grid--v3">
          <article className="orders-summary-card"><span><FiPackage /></span><div><strong>{summary.total}</strong><small>{isRu ? 'Всего заказов' : 'Total orders'}</small></div></article>
          <article className="orders-summary-card"><span><FiClock /></span><div><strong>{summary.active}</strong><small>{isRu ? 'Сейчас в работе' : 'In progress'}</small></div></article>
          <article className="orders-summary-card"><span><FiTruck /></span><div><strong>{summary.delivered}</strong><small>{isRu ? 'Завершено' : 'Delivered'}</small></div></article>
          <article className="orders-summary-card"><span>₸</span><div><strong>{formatPrice(summary.spent)}</strong><small>{isRu ? 'Потрачено всего' : 'Lifetime spend'}</small></div></article>
        </section>

        <section className="orders-layout-v3">
          <aside className="orders-sidebar-v3">
            <article className="orders-toolbar orders-toolbar--stack">
              <div className="orders-toolbar__title"><FiFilter /> <span>{isRu ? 'Фильтры и поиск' : 'Filters & search'}</span></div>
              <label className="orders-search-field">
                <FiSearch />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={isRu ? 'Номер заказа, адрес, товар или заметка' : 'Order ID, address, item, or note'}
                />
              </label>
              <div className="orders-filter-row orders-filter-row--stack">
                {[
                  ['all', isRu ? 'Все' : 'All'],
                  ['active', isRu ? 'Активные' : 'Active'],
                  ['done', isRu ? 'Доставленные' : 'Delivered'],
                  ['cancelled', isRu ? 'Отменённые' : 'Cancelled'],
                ].map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    className={filter === key ? 'orders-filter is-active' : 'orders-filter'}
                    onClick={() => setFilter(key)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </article>

            <article className="orders-side-note">
              <strong>{isRu ? 'Что здесь нового' : 'What changed here'}</strong>
              <ul>
                <li>{isRu ? 'Карточки заказов показывают этапы, файлы и сроки без открытия деталей.' : 'Each card now shows stage, files, and timing before you open details.'}</li>
                <li>{isRu ? 'На телефоне список остаётся в виде удобных карточек без таблиц и горизонтального скролла.' : 'On phones the list stays card-based with no table overflow or horizontal scroll.'}</li>
                <li>{isRu ? 'Если вы пришли из Telegram, нужный режим уже включён и подсвечен.' : 'If you came from Telegram, the correct mode is already enabled and highlighted.'}</li>
              </ul>
            </article>
          </aside>

          <div className="orders-main-v3">
            {filteredOrders.length === 0 ? (
              <div className="orders-empty-state">{orders.length ? (isRu ? 'По выбранным фильтрам ничего не найдено.' : 'Nothing matches the current filters.') : t('orders.empty')}</div>
            ) : (
              <div className="orders-grid orders-grid--v3">
                {filteredOrders.map((order) => {
                  const meta = STATUS_META[order.status] || STATUS_META.pending;
                  const itemsCount = (order.orderItems?.length || 0) + (order.serviceItems?.length || 0);
                  const fileCount = (order.serviceItems || []).reduce((acc, item) => acc + (item.files?.length || 0), 0);
                  const shortId = String(order._id || '').slice(-6);
                  const stageIndex = FLOW.indexOf(String(order.status || 'pending'));
                  const orderPath = `/orders/${order._id}${searchParams.get('telegram') ? '?telegram=1' : ''}`;
                  return (
                    <article key={order._id} className="order-card-modern order-card-modern--v3">
                      <div className="order-card-modern__head order-card-modern__head--v3">
                        <div>
                          <span className="order-card-modern__eyebrow">{isRu ? 'Заказ' : 'Order'} #{shortId}</span>
                          <h3>{order.orderItems?.[0]?.name || order.serviceItems?.[0]?.serviceTitle || (isRu ? 'Смешанный заказ' : 'Mixed order')}</h3>
                          <p className="order-card-modern__subline">{new Date(order.createdAt).toLocaleString()} · {order.shippingAddress?.city || (isRu ? 'Город не указан' : 'City not specified')}</p>
                        </div>
                        <div className="order-card-modern__status-wrap">
                          <span className={`order-status-badge tone-${meta.tone}`}>{statusLabel(order.status)}</span>
                          <strong>{formatPrice(order.totalPrice)}</strong>
                        </div>
                      </div>

                      <div className="order-card-modern__stage-row">
                        {FLOW.map((stage, index) => {
                          const isCancelled = order.status === 'cancelled';
                          const isDone = !isCancelled && stageIndex >= index;
                          const isCurrent = !isCancelled && stageIndex === index;
                          return (
                            <div key={stage} className={`order-stage-chip${isDone ? ' is-done' : ''}${isCurrent ? ' is-current' : ''}${isCancelled ? ' is-cancelled' : ''}`}>
                              <span />
                              <small>{statusLabel(stage)}</small>
                            </div>
                          );
                        })}
                      </div>

                      <div className="order-card-modern__meta-grid order-card-modern__meta-grid--v3">
                        <div><span>{t('order.items')}</span><strong>{itemsCount}</strong></div>
                        <div><span>{isRu ? 'Файлы' : 'Files'}</span><strong>{fileCount}</strong></div>
                        <div><span>{t('order.payment')}</span><strong>{order.isPaid ? t('order.paidYes') : t('order.paidNo')}</strong></div>
                        <div><span>{isRu ? 'ETA' : 'ETA'}</span><strong>{order.expectedDeliveryDate ? new Date(order.expectedDeliveryDate).toLocaleDateString() : (order.deliveryWindow || '—')}</strong></div>
                      </div>

                      {(order.customerNote || order.adminNote) ? (
                        <div className="order-card-modern__note">
                          {order.customerNote || order.adminNote}
                        </div>
                      ) : null}

                      <div className="order-card-modern__footer order-card-modern__footer--v3">
                        <div className="order-card-modern__footer-copy">
                          <FiDownload />
                          <span>{fileCount > 0 ? (isRu ? 'Файлы готовы для просмотра в деталях' : 'Files are ready to open in details') : (isRu ? 'Файлы не приложены' : 'No files attached')}</span>
                        </div>
                        <Link to={orderPath} className="order-card-modern__cta order-card-modern__cta--btn">
                          {isRu ? 'Открыть детали' : 'Open details'} <FiArrowRight />
                        </Link>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

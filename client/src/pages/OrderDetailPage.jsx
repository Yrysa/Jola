import { useMemo } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { useQuery } from 'react-query';
import { FiArrowLeft, FiClock, FiDownload, FiMapPin, FiPackage, FiShield, FiTruck } from 'react-icons/fi';
import { orderService } from '../services/orderService.js';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import { formatPrice } from '../utils/formatPrice.js';
import './OrderDetailPage.css';
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

export default function OrderDetailPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const { t, i18n } = useTranslation();
  const isRu = (i18n.language || 'ru').toLowerCase().startsWith('ru');
  const statusLabel = (s) => t(`orderStatuses.${s}`, s);

  const { data, isLoading, error } = useQuery(
    ['order', id],
    () => orderService.getOrderById(id),
    { refetchInterval: 5000 }
  );

  const order = data?.order;
  const statusMeta = STATUS_META[order?.status] || STATUS_META.pending;
  const fileCount = useMemo(() => ((order?.serviceItems || []).reduce((acc, service) => acc + (service.files?.length || 0), 0)), [order?.serviceItems]);
  const itemsCount = (order?.orderItems?.length || 0) + (order?.serviceItems?.length || 0);
  const stageIndex = FLOW.indexOf(String(order?.status || 'pending'));

  if (isLoading) return <LoadingSpinner fullScreen />;
  if (error) return <div className="order-page order-page--v3"><div className="order-shell container"><div className="order-empty-state">{t('order.loadError')}</div></div></div>;
  if (!order) return <div className="order-page order-page--v3"><div className="order-shell container"><div className="order-empty-state">{t('order.notFound')}</div></div></div>;

  return (
    <div className="order-page order-page--v3">
      <div className="order-shell container">
        <div className="order-headbar order-headbar--v3">
          <Link to={`/orders${searchParams.get('telegram') ? '?telegram=1' : ''}`} className="btn btn-secondary btn-back">
            <FiArrowLeft /> {t('order.back')}
          </Link>
          {searchParams.get('telegram') ? (
            <div className="order-telegram-chip order-telegram-chip--v3">
              <FiTruck />
              <span>{isRu ? 'Открыто из Telegram' : 'Opened from Telegram'}</span>
            </div>
          ) : null}
        </div>

        <section className="order-hero-card order-hero-card--v3">
          <div className="order-hero-card__content">
            <div className="order-hero-card__eyebrow">{isRu ? 'Заказ' : 'Order'} #{String(order._id || '').slice(-6)}</div>
            <h1>{isRu ? 'Полная карточка заказа' : 'Full order card'}</h1>
            <p>{isRu ? 'Здесь собраны этапы, оплата, доставка, позиции, печатные файлы и заметки по заказу.' : 'This view combines stage tracking, payment, delivery, line items, print files, and notes in one place.'}</p>
          </div>
          <div className="order-hero-card__meta">
            <span className={`order-status-badge tone-${statusMeta.tone}`}>{statusLabel(order.status)}</span>
            <strong>{formatPrice(order.totalPrice)}</strong>
            <small>{new Date(order.createdAt).toLocaleString()}</small>
          </div>
        </section>

        <section className="order-summary-grid-modern order-summary-grid-modern--v3">
          <article className="order-summary-card-modern"><span><FiPackage /></span><div><small>{t('order.items')}</small><strong>{itemsCount}</strong></div></article>
          <article className="order-summary-card-modern"><span><FiDownload /></span><div><small>{isRu ? 'Файлы' : 'Files'}</small><strong>{fileCount}</strong></div></article>
          <article className="order-summary-card-modern"><span><FiClock /></span><div><small>{t('order.created')}</small><strong>{new Date(order.createdAt).toLocaleDateString()}</strong></div></article>
          <article className="order-summary-card-modern"><span><FiTruck /></span><div><small>{isRu ? 'Доставка' : 'Delivery'}</small><strong>{order.deliveryWindow || '—'}</strong></div></article>
        </section>

        <section className="order-stage-rail">
          {FLOW.map((stage, index) => {
            const cancelled = order.status === 'cancelled';
            const complete = !cancelled && stageIndex >= index;
            const current = !cancelled && stageIndex === index;
            return (
              <div key={stage} className={`order-stage-rail__item${complete ? ' is-complete' : ''}${current ? ' is-current' : ''}${cancelled ? ' is-cancelled' : ''}`}>
                <span className="order-stage-rail__dot" />
                <strong>{statusLabel(stage)}</strong>
              </div>
            );
          })}
        </section>

        <section className="order-layout-modern order-layout-modern--v3">
          <div className="order-main-column">
            <article className="order-panel-modern order-panel-modern--hero-list">
              <div className="order-panel-modern__head"><h2>{t('order.status')}</h2><span className={`order-status-badge tone-${statusMeta.tone}`}>{statusLabel(order.status)}</span></div>
              <div className="order-progress-modern"><div style={{ width: `${statusMeta.progress}%` }} /></div>
              <div className="order-timeline-modern order-timeline-modern--dense">
                {(order.statusHistory || []).length ? (
                  (order.statusHistory || []).slice().reverse().map((entry, idx) => (
                    <div key={`${entry.status}-${entry.at}-${idx}`} className="order-timeline-modern__item">
                      <span className={`order-timeline-modern__dot tone-${STATUS_META[entry.status]?.tone || 'warn'}`} />
                      <div>
                        <strong>{statusLabel(entry.status)}</strong>
                        <p>{entry.note || (isRu ? 'Статус обновлён' : 'Status updated')}</p>
                        <small>{entry.at ? new Date(entry.at).toLocaleString() : '—'}</small>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="order-empty-inline">{isRu ? 'История статусов пока пуста.' : 'No status history yet.'}</div>
                )}
              </div>
            </article>

            <article className="order-panel-modern">
              <div className="order-panel-modern__head"><h2>{t('order.products')}</h2><span>{order.orderItems?.length || 0}</span></div>
              <div className="order-item-list-modern order-item-list-modern--v3">
                {(order.orderItems || []).length ? (order.orderItems || []).map((item) => (
                  <div className="order-item-modern" key={item._id || `${item.name}-${item.quantity}`}>
                    <img src={item.image || item.product?.images?.[0]} alt={item.name} className="order-item-modern__image" />
                    <div className="order-item-modern__info"><strong>{item.name}</strong><span>{formatPrice(item.price)} × {item.quantity}</span></div>
                    <div className="order-item-modern__price">{formatPrice(item.price * item.quantity)}</div>
                  </div>
                )) : <div className="order-empty-inline">{isRu ? 'Товарных позиций нет.' : 'No physical products in this order.'}</div>}
              </div>
            </article>

            {Array.isArray(order.serviceItems) && order.serviceItems.length > 0 ? (
              <article className="order-panel-modern">
                <div className="order-panel-modern__head"><h2>{t('order.services')}</h2><span>{order.serviceItems.length}</span></div>
                <div className="order-service-list-modern order-service-list-modern--v3">
                  {order.serviceItems.map((service, idx) => (
                    <div className="order-service-card-modern" key={`${service.serviceKey}-${idx}`}>
                      <div className="order-service-card-modern__head"><strong>{service.serviceTitle}</strong><span>{formatPrice(service.price)}</span></div>
                      <div className="order-service-card-modern__chips">
                        <span>{t('polygraphy.format')}: {String(service?.options?.format || 'A4')}</span>
                        <span>{t('polygraphy.copies')}: {Number(service?.options?.copies || 1) || 1}</span>
                        <span>{t('polygraphy.color')}: {service?.options?.color === 'color' ? t('polygraphy.colorful') : t('polygraphy.bw')}</span>
                      </div>
                      {Array.isArray(service.files) && service.files.length > 0 ? (
                        <ul className="order-files-list-modern order-files-list-modern--v3">
                          {service.files.map((file) => (
                            <li key={String(file.fileId || file.url || file.originalName)}>
                              {file.url ? (
                                <a href={file.url} target="_blank" rel="noreferrer"><FiDownload /> {file.originalName}</a>
                              ) : (<span>{file.originalName}</span>)}
                              {typeof file.pages === 'number' ? <small>{file.pages} {t('polygraphy.pagesShort')}</small> : null}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  ))}
                </div>
              </article>
            ) : null}
          </div>

          <aside className="order-side-column">
            <article className="order-panel-modern order-panel-modern--sticky">
              <div className="order-panel-modern__head"><h2>{t('order.summary')}</h2><span>{isRu ? 'Оплата и доставка' : 'Payment & delivery'}</span></div>
              <div className="order-summary-stack order-summary-stack--v3">
                <div><span>{t('order.items')}</span><strong>{formatPrice(order.itemsPrice)}</strong></div>
                <div><span>{t('order.shipping')}</span><strong>{formatPrice(order.shippingPrice)}</strong></div>
                <div><span>{t('order.tax')}</span><strong>{formatPrice(order.taxPrice)}</strong></div>
                <div><span>{t('order.payment')}</span><strong>{order.isPaid ? t('order.paidYes') : t('order.paidNo')}</strong></div>
                <div><span>{t('order.delivery')}</span><strong>{order.expectedDeliveryDate ? new Date(order.expectedDeliveryDate).toLocaleString() : (order.deliveryWindow || '—')}</strong></div>
                <div className="order-summary-stack__total"><span>{t('order.total')}</span><strong>{formatPrice(order.totalPrice)}</strong></div>
              </div>
            </article>

            <article className="order-panel-modern order-panel-modern--sticky-secondary">
              <div className="order-panel-modern__head"><h2>{isRu ? 'Маршрут заказа' : 'Order route'}</h2><span>{isRu ? 'Клиенту видно' : 'Customer facing'}</span></div>
              <div className="order-quickfacts">
                <div><FiMapPin /><span>{order.shippingAddress?.city || '—'}{order.shippingAddress?.street ? ` · ${order.shippingAddress.street}` : ''}</span></div>
                <div><FiShield /><span>{order.isPaid ? (isRu ? 'Оплата подтверждена' : 'Payment confirmed') : (isRu ? 'Ожидается оплата' : 'Awaiting payment')}</span></div>
                <div><FiTruck /><span>{order.deliveryWindow || (isRu ? 'Срок уточняется' : 'ETA pending')}</span></div>
              </div>
            </article>

            {(order.adminNote || order.customerNote) ? (
              <article className="order-panel-modern order-panel-modern--sticky-secondary">
                <div className="order-panel-modern__head"><h2>{isRu ? 'Заметки' : 'Notes'}</h2><span>{isRu ? 'Что важно по заказу' : 'Important order context'}</span></div>
                {order.customerNote ? <div className="order-note-card"><strong>{t('order.customerNote')}</strong><p>{order.customerNote}</p></div> : null}
                {order.adminNote ? <div className="order-note-card"><strong>{t('order.adminNote')}</strong><p>{order.adminNote}</p></div> : null}
              </article>
            ) : null}
          </aside>
        </section>
      </div>
    </div>
  );
}

import { useParams, Link } from 'react-router-dom';
import { useQuery } from 'react-query';
import { orderService } from '../services/orderService.js';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import './OrderDetailPage.css';

export default function OrderDetailPage() {
  const { id } = useParams();

  const { data, isLoading, error } = useQuery(
    ['order', id],
    () => orderService.getOrderById(id) // ИСПРАВЛЕНО: getOrder → getOrderById
  );

  // data -> { status, data: { order } } (или просто order после unwrap)
  const order = data; // ИСПРАВЛЕНО: data?.order → data

  if (isLoading) return <LoadingSpinner fullScreen />;
  if (error) return <div className="order-page"><p>Ошибка загрузки заказа</p></div>;
  if (!order) return <div className="order-page"><p>Заказ не найден</p></div>;

  return (
    <div className="order-page">
      <div className="order-container">
        <Link to="/orders" className="btn btn-secondary btn-back">
          ← Мои заказы
        </Link>

        <h1>Заказ #{order._id.slice(-6)}</h1>
        <p>Статус: <b>{order.status}</b></p>
        <p>Создан: {new Date(order.createdAt).toLocaleString()}</p>

        <h2>Товары</h2>
        <div className="order-items">
          {order.orderItems.map((item) => (
            <div className="order-item" key={item._id}>
              <img
                src={item.image || item.product?.images?.[0]}
                alt={item.name}
                className="order-item-image"
              />
              <div className="order-item-info">
                <p className="name">{item.name}</p>
                <p>Цена: {item.price} ₽</p>
                <p>Кол-во: {item.quantity}</p>
                <p>Сумма: {item.price * item.quantity} ₽</p>
              </div>
            </div>
          ))}
        </div>

        <h2>Итого</h2>
        <div className="order-summary">
          <p>Товары: {order.itemsPrice} ₽</p>
          <p>Доставка: {order.shippingPrice} ₽</p>
          <p>Налог: {order.taxPrice} ₽</p>
          <p className="total">Итого: {order.totalPrice} ₽</p>
        </div>
      </div>
    </div>
  );
}
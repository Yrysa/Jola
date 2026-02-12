import { useQuery } from 'react-query';
import { orderService } from '../services/orderService.js';
import { Link } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import { formatPrice } from '../utils/formatPrice.js';
import './OrdersPage.css';

export default function OrdersPage() {
  const { data, isLoading, error } = useQuery('my-orders', orderService.getMyOrders);

  const orders = data?.orders || [];

  if (isLoading) return <LoadingSpinner fullScreen />;
  if (error) return (
    <div className="orders-page">
      <p>Ошибка загрузки заказов</p>
    </div>
  );

  return (
    <div className="orders-page">
      <div className="orders-container">
        <h1>Мои заказы</h1>

        {orders.length === 0 ? (
          <p>У тебя пока нет заказов.</p>
        ) : (
          <div className="orders-list">
            {orders.map((order) => (
              <Link
                key={order._id}
                to={`/orders/${order._id}`}
                className="order-card"
              >
                <div className="order-card-header">
                  <span className="order-id">Заказ #{order._id.slice(-6)}</span>
                  <span className="order-status">{order.status}</span>
                </div>
                <div className="order-card-body">
                  <p>
                    Товаров: <b>{order.orderItems?.length || 0}</b>
                  </p>
                  <p>
                    Сумма: <b>{formatPrice(order.totalPrice)}</b>
                  </p>
                  <p className="order-date">
                    {new Date(order.createdAt).toLocaleString()}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

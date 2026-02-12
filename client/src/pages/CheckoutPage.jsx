import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { FiCreditCard, FiTruck, FiShield } from "react-icons/fi";

import { useCart } from "../context/CartContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { orderService } from "../services/orderService.js";
import toast from "react-hot-toast";
import { formatPrice } from "../utils/formatPrice.js";

import "./CheckoutPage.css";

export default function CheckoutPage() {
  const { items, getTotalPrice, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("card");

  const [formData, setFormData] = useState({
    street: user?.address?.street || "",
    city: user?.address?.city || "",
    zipCode: user?.address?.zipCode || "",
    country: user?.address?.country || "",
  });

  const subtotal = getTotalPrice();
  const shipping = subtotal > 5000 ? 0 : 300;
  const tax = subtotal * 0.08;
  const total = subtotal + shipping + tax;

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!items.length) {
      toast.error("Корзина пуста");
      return;
    }

    setLoading(true);

    try {
      const orderData = {
        orderItems: items.map((item) => ({
          product: item.product,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          image: item.image,
        })),
        shippingAddress: {
          street: formData.street,
          city: formData.city,
          zipCode: formData.zipCode,
          country: formData.country,
        },
        paymentMethod,
        taxPrice: tax,
        shippingPrice: shipping,
        totalPrice: total,
      };

      const { order, paymentSession } = await orderService.createOrder(orderData);

      if (paymentMethod === "card" && paymentSession?.url) {
        // Stripe – редирект на оплату
        window.location.href = paymentSession.url;
        return;
      }

      toast.success("Заказ оформлен успешно!");
      clearCart();
      navigate(`/orders/${order._id}`);
    } catch (err) {
      console.error("Ошибка оформления заказа:", err);
      toast.error("Ошибка оформления заказа");
    } finally {
      setLoading(false);
    }
  };

  if (!items.length) {
    return (
      <div className="checkout-page empty">
        <div className="container">
          <h1>Корзина пуста</h1>
          <p>Добавьте товары, чтобы оформить заказ</p>
        </div>
      </div>
    );
  }

  return (
    <div className="checkout-page">
      <div className="container">
        <motion.div
          className="checkout-header"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1>Оформление заказа</h1>
          <p>Проверьте заказ и заполните адрес доставки</p>
        </motion.div>

        <div className="checkout-grid">
          {/* Левая колонка — заказ */}
          <motion.div
            className="checkout-summary-card"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <h2>Ваш заказ</h2>

            <div className="order-items">
              {items.map((item) => (
                <div key={item.product} className="order-item">
                  <div className="order-item-left">
                    <div className="order-item-image-wrapper">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="order-item-image"
                      />
                    </div>
                    <div className="order-item-info">
                      <h3>{item.name}</h3>
                      <p>
                        {item.quantity} × {formatPrice(item.price)}
                      </p>
                    </div>
                  </div>
                  <div className="item-total">
                    {formatPrice(item.quantity * item.price)}
                  </div>
                </div>
              ))}
            </div>

            <div className="order-totals">
              <div className="total-row">
                <span>Подытог:</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              <div className="total-row">
                <span>Доставка:</span>
                <span>{formatPrice(shipping)}</span>
              </div>
              <div className="total-row">
                <span>Налог (8%):</span>
                <span>{formatPrice(tax)}</span>
              </div>
              <div className="total-row total-row-final">
                <span>Итого:</span>
                <span>{formatPrice(total)}</span>
              </div>
            </div>

            <div className="checkout-security">
              <FiShield />
              <span>Ваши данные защищены SSL-шифрованием</span>
            </div>
          </motion.div>

          {/* Правая колонка — форма */}
          <motion.div
            className="checkout-form-card"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
          >
            <form onSubmit={handleSubmit} className="checkout-form">
              <h2>Адрес доставки</h2>

              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="street">Улица и дом</label>
                  <input
                    id="street"
                    name="street"
                    type="text"
                    value={formData.street}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="city">Город</label>
                  <input
                    id="city"
                    name="city"
                    type="text"
                    value={formData.city}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="zipCode">Индекс</label>
                  <input
                    id="zipCode"
                    name="zipCode"
                    type="text"
                    value={formData.zipCode}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="country">Страна</label>
                  <input
                    id="country"
                    name="country"
                    type="text"
                    value={formData.country}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="form-section">
                <h3>Способ оплаты</h3>

                <div className="payment-methods">
                  <button
                    type="button"
                    className={`payment-method ${
                      paymentMethod === "card" ? "active" : ""
                    }`}
                    onClick={() => setPaymentMethod("card")}
                  >
                    <FiCreditCard />
                    <div>
                      <div>Карта (Stripe)</div>
                      <small>Оплата онлайн через защищённый сервис</small>
                    </div>
                  </button>

                  <button
                    type="button"
                    className={`payment-method ${
                      paymentMethod === "cash" ? "active" : ""
                    }`}
                    onClick={() => setPaymentMethod("cash")}
                  >
                    <FiTruck />
                    <div>
                      <div>Наличными при доставке</div>
                      <small>Оплата при получении заказа</small>
                    </div>
                  </button>
                </div>
              </div>

              <motion.button
                type="submit"
                className="btn btn-primary btn-block btn-checkout"
                disabled={loading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {loading
                  ? "Оформление..."
                  : `Оформить заказ на ${formatPrice(total)}`}
              </motion.button>
            </form>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

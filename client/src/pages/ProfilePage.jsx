import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext.jsx';
import { authService } from '../services/authService.js';
import { FiUser, FiMail, FiMapPin, FiPhone, FiSave } from 'react-icons/fi';
import toast from 'react-hot-toast';
import './ProfilePage.css';

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    address: {
      street: user?.address?.street || '',
      city: user?.address?.city || '',
      zipCode: user?.address?.zipCode || '',
      country: user?.address?.country || '',
    },
    phone: user?.phone || '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith('address.')) {
      const addressField = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        address: {
          ...prev.address,
          [addressField]: value,
        },
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await authService.updateProfile(formData);
      toast.success('Профиль обновлен!');
    } catch (error) {
      toast.error(error.message || 'Ошибка обновления');
    }
  };

  return (
    <div className="profile-page">
      <motion.div
        className="profile-container"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="profile-header">
          <img src={user?.avatar} alt={user?.name} className="avatar" />
          <h2>{user?.name}</h2>
          <p className="role">{user?.role === 'admin' ? 'Администратор' : 'Пользователь'}</p>
        </div>

        <form onSubmit={handleSubmit} className="profile-form">
          <div className="form-section">
            <h3>Основная информация</h3>
            
            <div className="form-group">
              <label htmlFor="name">
                <FiUser /> Имя
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">
                <FiMail /> Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                disabled
              />
            </div>

            <div className="form-group">
              <label htmlFor="phone">
                <FiPhone /> Телефон
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+1234567890"
              />
            </div>
          </div>

          <div className="form-section">
            <h3>Адрес доставки</h3>
            
            <div className="form-group">
              <label htmlFor="street">Улица</label>
              <input
                type="text"
                id="street"
                name="address.street"
                value={formData.address.street}
                onChange={handleChange}
              />
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="city">Город</label>
                <input
                  type="text"
                  id="city"
                  name="address.city"
                  value={formData.address.city}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label htmlFor="zipCode">Индекс</label>
                <input
                  type="text"
                  id="zipCode"
                  name="address.zipCode"
                  value={formData.address.zipCode}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="country">Страна</label>
              <input
                type="text"
                id="country"
                name="address.country"
                value={formData.address.country}
                onChange={handleChange}
              />
            </div>
          </div>

          <motion.button
            type="submit"
            className="btn btn-primary btn-save"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <FiSave /> Сохранить изменения
          </motion.button>
        </form>

        <div className="profile-actions">
          <button
            onClick={() => navigate('/orders')}
            className="btn btn-primary"
          >
            Мои заказы
          </button>

          <button onClick={logout} className="btn btn-secondary">
            Выйти из аккаунта
          </button>
        </div>

      </motion.div>
    </div>
  );
}
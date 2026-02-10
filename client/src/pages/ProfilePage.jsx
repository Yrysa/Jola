import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext.jsx';
import { authService } from '../services/authService.js';
import { FiCamera, FiMail, FiPhone, FiSave, FiUser } from 'react-icons/fi';
import toast from 'react-hot-toast';
import UserPreferences from '../components/UserPreferences.jsx';
import './ProfilePage.css';

export default function ProfilePage() {
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: user?.name || '',
    surname: user?.surname || '',
    email: user?.email || '',
    secondaryEmail: user?.secondaryEmail || '',
    backupEmail: user?.backupEmail || '',
    avatarUrl: user?.avatarUrl || user?.avatar || '',
    address: {
      street: user?.address?.street || '',
      city: user?.address?.city || '',
      zipCode: user?.address?.zipCode || '',
      country: user?.address?.country || '',
    },
    phone: user?.phone || '',
    notificationPreferences: {
      emailNewsletter: user?.notificationPreferences?.emailNewsletter ?? true,
      smsNotifications: user?.notificationPreferences?.smsNotifications ?? false,
      notificationFrequency: user?.notificationPreferences?.notificationFrequency || 'instant',
    },
  });
  const [securityData, setSecurityData] = useState({ currentPassword: '', newPassword: '' });
  const [loginHistory, setLoginHistory] = useState([]);

  useEffect(() => {
    if (!user) return;
    setFormData({
      name: user.name || '',
      surname: user.surname || '',
      email: user.email || '',
      secondaryEmail: user.secondaryEmail || '',
      backupEmail: user.backupEmail || '',
      avatarUrl: user.avatarUrl || user.avatar || '',
      address: {
        street: user.address?.street || '',
        city: user.address?.city || '',
        zipCode: user.address?.zipCode || '',
        country: user.address?.country || '',
      },
      phone: user.phone || '',
      notificationPreferences: {
        emailNewsletter: user.notificationPreferences?.emailNewsletter ?? true,
        smsNotifications: user.notificationPreferences?.smsNotifications ?? false,
        notificationFrequency: user.notificationPreferences?.notificationFrequency || 'instant',
      },
    });
  }, [user]);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const data = await authService.getLoginHistory();
        setLoginHistory(data.loginHistory || []);
      } catch {
        setLoginHistory([]);
      }
    };

    if (user) {
      loadHistory();
    }
  }, [user]);

  const avatarPreview = formData.avatarUrl || user?.avatarUrl || user?.avatar;

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
    } else if (name.startsWith('notificationPreferences.')) {
      const preferenceField = name.split('.')[1];
      const valueToSet = e.target.type === 'checkbox' ? e.target.checked : value;
      setFormData(prev => ({
        ...prev,
        notificationPreferences: {
          ...prev.notificationPreferences,
          [preferenceField]: valueToSet,
        },
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSecurityChange = (e) => {
    const { name, value } = e.target;
    setSecurityData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmedName = formData.name.trim();
    const trimmedEmail = formData.email.trim();
    const trimmedPhone = formData.phone.trim();
    const trimmedAvatarUrl = formData.avatarUrl.trim();
    const trimmedAddress = {
      street: formData.address.street.trim(),
      city: formData.address.city.trim(),
      zipCode: formData.address.zipCode.trim(),
      country: formData.address.country.trim(),
    };

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;

    if (
      !trimmedName ||
      !trimmedEmail ||
      !trimmedPhone ||
      !trimmedAvatarUrl ||
      !trimmedAddress.street ||
      !trimmedAddress.city ||
      !trimmedAddress.zipCode ||
      !trimmedAddress.country
    ) {
      toast.error('Заполните все поля профиля.');
      return;
    }

    if (!emailRegex.test(trimmedEmail)) {
      toast.error('Укажите корректный email.');
      return;
    }

    if (!phoneRegex.test(trimmedPhone)) {
      toast.error('Телефон должен быть в формате +79991234567.');
      return;
    }

    try {
      new URL(trimmedAvatarUrl);
    } catch (error) {
      toast.error('Ссылка на аватар должна быть корректным URL.');
      return;
    }

    try {
      const updated = await authService.updateProfile({
        ...formData,
        name: trimmedName,
        email: trimmedEmail,
        phone: trimmedPhone,
        avatarUrl: trimmedAvatarUrl,
        address: trimmedAddress,
      });
      updateUser(updated.user);
      setFormData({
        name: updated.user.name,
        surname: updated.user.surname || '',
        email: updated.user.email,
        secondaryEmail: updated.user.secondaryEmail || '',
        backupEmail: updated.user.backupEmail || '',
        avatarUrl: updated.user.avatarUrl,
        address: updated.user.address || trimmedAddress,
        phone: updated.user.phone,
        notificationPreferences: updated.user.notificationPreferences,
      });
      toast.success('Профиль обновлен!');
    } catch (error) {
      toast.error(error.message || 'Ошибка обновления');
    }
  };

  const handleChangePassword = async () => {
    if (!securityData.currentPassword || !securityData.newPassword) {
      toast.error('Заполните оба поля пароля.');
      return;
    }

    try {
      await authService.changePassword(securityData.currentPassword, securityData.newPassword);
      setSecurityData({ currentPassword: '', newPassword: '' });
      toast.success('Пароль успешно изменён.');
    } catch (error) {
      toast.error(error.message || 'Не удалось изменить пароль.');
    }
  };

  const handleToggleTwoFactor = async () => {
    try {
      const data = await authService.toggleTwoFactor(!user?.twoFactorEnabled);
      updateUser({ ...user, twoFactorEnabled: data.twoFactorEnabled });
      toast.success(data.twoFactorEnabled ? '2FA включена.' : '2FA отключена.');
    } catch (error) {
      toast.error(error.message || 'Не удалось обновить 2FA.');
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
          <img src={avatarPreview} alt={user?.name} className="avatar" />
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
              <label htmlFor="surname">Фамилия</label>
              <input type="text" id="surname" name="surname" value={formData.surname} onChange={handleChange} />
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
              />
            </div>

            <div className="form-group">
              <label htmlFor="secondaryEmail">Доп. email</label>
              <input
                type="email"
                id="secondaryEmail"
                name="secondaryEmail"
                value={formData.secondaryEmail}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="backupEmail">Резервный email</label>
              <input type="email" id="backupEmail" name="backupEmail" value={formData.backupEmail} onChange={handleChange} />
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
                required
                pattern="\\+?[1-9]\\d{1,14}"
                title="Телефон в формате +79991234567"
              />
            </div>

            <div className="form-group">
              <label htmlFor="avatarUrl">
                <FiCamera /> Ссылка на аватар
              </label>
              <input
                type="url"
                id="avatarUrl"
                name="avatarUrl"
                value={formData.avatarUrl}
                onChange={handleChange}
                placeholder="https://example.com/avatar.jpg"
                required
              />
            </div>
          </div>

          <div className="form-section">
            <h3>Уведомления</h3>
            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  name="notificationPreferences.emailNewsletter"
                  checked={formData.notificationPreferences.emailNewsletter}
                  onChange={handleChange}
                />
                Email-рассылка
              </label>
            </div>
            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  name="notificationPreferences.smsNotifications"
                  checked={formData.notificationPreferences.smsNotifications}
                  onChange={handleChange}
                />
                SMS-уведомления
              </label>
            </div>
            <div className="form-group">
              <label htmlFor="notificationFrequency">Частота</label>
              <select
                id="notificationFrequency"
                name="notificationPreferences.notificationFrequency"
                value={formData.notificationPreferences.notificationFrequency}
                onChange={handleChange}
              >
                <option value="instant">Сразу</option>
                <option value="daily">Раз в день</option>
                <option value="weekly">Раз в неделю</option>
              </select>
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
                required
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
                  required
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
                  required
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
                required
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

        <div className="form-section">
          <h3>Безопасность</h3>
          <div className="form-group">
            <label htmlFor="currentPassword">Текущий пароль</label>
            <input
              type="password"
              id="currentPassword"
              name="currentPassword"
              value={securityData.currentPassword}
              onChange={handleSecurityChange}
            />
          </div>
          <div className="form-group">
            <label htmlFor="newPassword">Новый пароль</label>
            <input
              type="password"
              id="newPassword"
              name="newPassword"
              value={securityData.newPassword}
              onChange={handleSecurityChange}
            />
          </div>
          <div className="profile-actions">
            <button type="button" className="btn btn-primary" onClick={handleChangePassword}>
              Сменить пароль
            </button>
            <button type="button" className="btn btn-secondary" onClick={handleToggleTwoFactor}>
              {user?.twoFactorEnabled ? 'Отключить 2FA' : 'Включить 2FA'}
            </button>
          </div>
          <h4>История входов</h4>
          {loginHistory.slice(0, 5).map((entry, idx) => (
            <p key={`${entry.loggedAt}-${idx}`}>
              {new Date(entry.loggedAt).toLocaleString()} — {entry.ip} — {entry.device}
            </p>
          ))}
        </div>

        <UserPreferences />

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

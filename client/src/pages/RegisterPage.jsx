import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext.jsx';
import { FiUser, FiMail, FiLock, FiEye, FiEyeOff, FiInfo } from 'react-icons/fi';
import toast from 'react-hot-toast';
import './AuthPage.css';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { register, error, clearError } = useAuth();
  const navigate = useNavigate();

  const validation = useMemo(() => {
    const name = formData.name.trim();
    const email = formData.email.trim();
    const password = formData.password;
    const confirmPassword = formData.confirmPassword;

    return {
      name: !name
        ? 'Введите имя'
        : name.length < 2
        ? 'Имя должно содержать минимум 2 символа'
        : '',
      email: !email
        ? 'Введите email'
        : !emailRegex.test(email)
        ? 'Введите корректный email'
        : '',
      password: !password
        ? 'Введите пароль'
        : password.length < 6
        ? 'Пароль должен содержать минимум 6 символов'
        : '',
      confirmPassword: !confirmPassword
        ? 'Подтвердите пароль'
        : password !== confirmPassword
        ? 'Пароли не совпадают'
        : '',
    };
  }, [formData]);

  const hasErrors = Boolean(
    validation.name || validation.email || validation.password || validation.confirmPassword
  );

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) clearError();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitted(true);

    if (hasErrors) {
      toast.error('Проверьте поля формы перед регистрацией');
      return;
    }

    try {
      await register({
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password,
      });
      toast.success('Регистрация успешна!');
      navigate('/');
    } catch (err) {
      toast.error(err.message || 'Ошибка регистрации');
    }
  };

  return (
    <div className="auth-page">
      <motion.div
        className="auth-container"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="auth-header">
          <h2>Регистрация в ProckX</h2>
          <p>Создайте свой аккаунт</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          <div className="form-group">
            <label htmlFor="name">Имя</label>
            <div className="input-wrapper">
              <FiUser className="input-icon" />
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Ваше имя"
                required
                minLength="2"
                autoComplete="name"
                aria-invalid={submitted && Boolean(validation.name)}
              />
            </div>
            {submitted && validation.name ? (
              <span className="field-hint field-hint-error">{validation.name}</span>
            ) : (
              <span className="field-hint">Укажите имя, которое будет видно в профиле.</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <div className="input-wrapper">
              <FiMail className="input-icon" />
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Ваш email"
                required
                autoComplete="email"
                aria-invalid={submitted && Boolean(validation.email)}
              />
            </div>
            {submitted && validation.email ? (
              <span className="field-hint field-hint-error">{validation.email}</span>
            ) : (
              <span className="field-hint">Используйте реальный email для входа в будущем.</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="password">Пароль</label>
            <div className="input-wrapper">
              <FiLock className="input-icon" />
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Минимум 6 символов"
                required
                minLength="6"
                autoComplete="new-password"
                aria-invalid={submitted && Boolean(validation.password)}
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
              >
                {showPassword ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>
            {submitted && validation.password ? (
              <span className="field-hint field-hint-error">{validation.password}</span>
            ) : (
              <span className="field-hint">Рекомендуется использовать буквы, цифры и спецсимволы.</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Подтверждение пароля</label>
            <div className="input-wrapper">
              <FiLock className="input-icon" />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Повторите пароль"
                required
                minLength="6"
                autoComplete="new-password"
                aria-invalid={submitted && Boolean(validation.confirmPassword)}
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={showConfirmPassword ? 'Скрыть подтверждение пароля' : 'Показать подтверждение пароля'}
              >
                {showConfirmPassword ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>
            {submitted && validation.confirmPassword ? (
              <span className="field-hint field-hint-error">{validation.confirmPassword}</span>
            ) : (
              <span className="field-hint">Поле должно полностью совпадать с паролем выше.</span>
            )}
          </div>

          <div className="auth-tip" role="note">
            <FiInfo />
            <span>После регистрации вы будете автоматически авторизованы и перенаправлены на главную.</span>
          </div>

          {error && <div className="error-alert">{error}</div>}

          <motion.button
            type="submit"
            className="btn btn-primary btn-block"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Зарегистрироваться
          </motion.button>
        </form>

        <div className="auth-footer">
          <p>
            Уже есть аккаунт?{' '}
            <Link to="/login" className="link">
              Войти
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}

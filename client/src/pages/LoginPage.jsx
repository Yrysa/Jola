import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext.jsx';
import { FiMail, FiLock, FiEye, FiEyeOff, FiInfo } from 'react-icons/fi';
import toast from 'react-hot-toast';
import './AuthPage.css';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginPage() {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { login, error, clearError } = useAuth();
  const navigate = useNavigate();

  const validation = useMemo(() => {
    const email = formData.email.trim();
    const password = formData.password;

    return {
      email: !email
        ? 'Введите email'
        : !emailRegex.test(email)
        ? 'Введите корректный email'
        : '',
      password: !password
        ? 'Введите пароль'
        : password.length < 6
        ? 'Пароль должен быть не короче 6 символов'
        : '',
    };
  }, [formData]);

  const hasErrors = Boolean(validation.email || validation.password);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) clearError();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitted(true);

    if (hasErrors) {
      toast.error('Проверьте корректность данных перед входом');
      return;
    }

    try {
      await login(formData.email.trim(), formData.password);
      toast.success('Успешный вход!');
      navigate('/');
    } catch (err) {
      toast.error(err.message || 'Ошибка входа');
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
          <h2>Вход в ProckX</h2>
          <p>Добро пожаловать обратно!</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form" noValidate>
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
              <span className="field-hint">Используйте email, указанный при регистрации.</span>
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
                placeholder="Ваш пароль"
                required
                autoComplete="current-password"
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
              <span className="field-hint">Минимум 6 символов.</span>
            )}
          </div>

          <div className="auth-tip" role="note">
            <FiInfo />
            <span>Если забыли пароль — пока используйте регистрацию нового аккаунта с другим email.</span>
          </div>

          {error && <div className="error-alert">{error}</div>}

          <motion.button
            type="submit"
            className="btn btn-primary btn-block"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Войти
          </motion.button>
        </form>

        <div className="auth-footer">
          <p>
            Нет аккаунта?{' '}
            <Link to="/register" className="link">
              Зарегистрироваться
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}

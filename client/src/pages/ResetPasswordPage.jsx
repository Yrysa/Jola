import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import { authService } from '../services/authService.js';
import './AuthPage.css';

export default function ResetPasswordPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { token } = useParams();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);

  const canSubmit = useMemo(() => {
    if (!password || password.length < 6) return false;
    if (password !== confirm) return false;
    return true;
  }, [password, confirm]);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error(t('auth.passTooShort'));
      return;
    }
    if (password !== confirm) {
      toast.error(t('auth.passMismatch'));
      return;
    }

    try {
      const data = await authService.resetPassword(token, password);
      toast.success(data?.message || t('auth.resetPassword'));
      navigate('/login');
    } catch (err) {
      toast.error(err.message || t('common.error'));
    }
  };

  return (
    <div className="auth-page">
      <motion.div
        className="auth-container"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35 }}
      >
        <div className="auth-header">
          <h2>{t('auth.resetTitle')}</h2>
          <p>{t('auth.resetSubtitle')}</p>
        </div>

        <form onSubmit={onSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="password">{t('auth.newPassword')}</label>
            <div className="input-wrapper">
              <input
                type={show ? 'text' : 'password'}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('auth.min6')}
                required
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShow((v) => !v)}
                aria-label={show ? t('auth.hidePassword') : t('auth.showPassword')}
              >
                {show ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="confirm">{t('auth.confirmNewPassword')}</label>
            <div className="input-wrapper">
              <input
                type={show ? 'text' : 'password'}
                id="confirm"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder={t('auth.repeatPassword')}
                required
              />
            </div>
          </div>

          <motion.button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={!canSubmit}
            whileHover={{ scale: canSubmit ? 1.02 : 1 }}
            whileTap={{ scale: canSubmit ? 0.98 : 1 }}
            style={{ opacity: canSubmit ? 1 : 0.7 }}
          >
            {t('auth.resetPassword')}
          </motion.button>
        </form>

        <div className="auth-footer">
          <p>
            <Link to="/login" className="link">{t('auth.backToLogin')}</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}

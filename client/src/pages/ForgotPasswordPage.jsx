import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { authService } from '../services/authService.js';
import './AuthPage.css';

export default function ForgotPasswordPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [devLink, setDevLink] = useState('');

  const onSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = await authService.forgotPassword(email);
      toast.success(data?.message || t('auth.sendResetLink'));
      setDevLink(data?.resetUrl || '');
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
          <h2>{t('auth.forgotTitle')}</h2>
          <p>{t('auth.forgotSubtitle')}</p>
        </div>

        <form onSubmit={onSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">{t('auth.email')}</label>
            <div className="input-wrapper">
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('auth.yourEmail')}
                required
              />
            </div>
          </div>

          {devLink ? (
            <div style={{
              border: '1px solid var(--color-border)',
              borderRadius: 12,
              padding: '0.9rem',
              background: 'var(--color-input-bg)',
              fontWeight: 700,
              lineHeight: 1.35,
              wordBreak: 'break-all',
            }}>
              <div style={{ color: 'var(--color-text-secondary)', fontWeight: 800, marginBottom: 6 }}>
                {t('auth.devLink')} (только dev)
              </div>
              <a href={devLink} className="link">{devLink}</a>
            </div>
          ) : null}

          <motion.button
            type="submit"
            className="btn btn-primary btn-block"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {t('auth.sendResetLink')}
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

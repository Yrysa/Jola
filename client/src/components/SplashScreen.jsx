import { motion } from 'framer-motion';
import { useEffect } from 'react';
import './SplashScreen.css';

export default function SplashScreen({ onDone }) {
  useEffect(() => {
    
    
    const t = setTimeout(() => {
      onDone?.();
    }, 1700);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div
      className="splash"
      role="status"
      aria-live="polite"
      aria-label="Загрузка"
      onClick={() => onDone?.()}
      title="Нажмите, чтобы пропустить"
    >
      <div className="splash-noise" aria-hidden="true" />
      <div className="splash-grid" aria-hidden="true" />

      <motion.div
        className="splash-card"
        initial={{ opacity: 0, scale: 0.97, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.38, ease: 'easeOut' }}
      >
        <motion.div
          className="splash-logo"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.05 }}
        >
          Jola
        </motion.div>

        <motion.div
          className="splash-text"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.12 }}
        >
          Добро пожаловать в <span className="splash-text__brand">Jola</span>
        </motion.div>

        <motion.div
          className="splash-sub"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.18 }}
        >
          Подготавливаем витрину…
        </motion.div>

        <div className="splash-dots" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>

        <div className="splash-bar" aria-hidden="true">
          <motion.div
            className="splash-bar__fill"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 1.25, ease: 'easeInOut' }}
            style={{ transformOrigin: 'left center' }}
          />
        </div>
      </motion.div>
    </div>
  );
}

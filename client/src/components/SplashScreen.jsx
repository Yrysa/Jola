import { motion } from 'framer-motion';
import './SplashScreen.css';

export default function SplashScreen() {
  return (
    <div className="splash" role="status" aria-live="polite">
      <motion.div
        className="splash-card"
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
      >
        <div className="splash-logo">Jola</div>
        <div className="splash-text">Добро пожаловать</div>
        <div className="splash-bar">
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

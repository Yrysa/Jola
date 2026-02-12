import { motion } from 'framer-motion';
import './LoadingSpinner.css';

export default function LoadingSpinner({ fullScreen = false, size = 'medium' }) {
  return (
    <div className={`loading-spinner ${fullScreen ? 'fullscreen' : ''} ${size}`}>
      <motion.div
        className="spinner"
        animate={{ rotate: 360 }}
        transition={{
          duration: 1,
          repeat: Infinity,
          ease: 'linear',
        }}
      >
        <div className="spinner-ring"></div>
        <div className="spinner-ring"></div>
        <div className="spinner-ring"></div>
      </motion.div>
    </div>
  );
}
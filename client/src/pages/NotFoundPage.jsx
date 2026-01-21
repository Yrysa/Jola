import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import './NotFoundPage.css';

export default function NotFoundPage() {
  return (
    <div className="not-found-page">
      <motion.div
        className="not-found-content"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div
          className="error-code"
          initial={{ y: -50 }}
          animate={{ y: 0 }}
          transition={{ type: 'spring', stiffness: 100 }}
        >
          404
        </motion.div>
        
        <h1>Страница не найдена</h1>
        <p>Кажется, вы потерялись в цифровом пространстве</p>
        
        <Link to="/" className="btn btn-primary btn-large">
          Вернуться на главную
        </Link>
      </motion.div>
    </div>
  );
}
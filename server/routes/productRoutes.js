// server/routes/productRoutes.js
import express from 'express';
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getCategories,
} from '../controllers/productController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Публичные маршруты
router.get('/', getProducts);              // список товаров (с фильтрами)
router.get('/categories', getCategories);  // список категорий
router.get('/:id', getProductById);        // один товар

// Админские маршруты
router.post('/', protect, admin, createProduct);    // создать товар
router.put('/:id', protect, admin, updateProduct);  // обновить товар
router.delete('/:id', protect, admin, deleteProduct); // удалить товар

export default router;

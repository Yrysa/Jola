
import express from 'express';
import {
  getProducts,
  suggestProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getCategories,
  getFiltersMeta,
  getProductsByIds,
  getStockLogsByProduct,
} from '../controllers/productController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();


router.get('/suggest', suggestProducts);  
router.get('/', getProducts);              
router.get('/categories', getCategories);  
router.get('/filters-meta', getFiltersMeta); 
router.post('/by-ids', getProductsByIds);    
router.get('/:id/stock-logs', protect, admin, getStockLogsByProduct);
router.get('/:id', getProductById);        


router.post('/', protect, admin, createProduct);    
router.put('/:id', protect, admin, updateProduct);  
router.patch('/:id', protect, admin, updateProduct); 
router.delete('/:id', protect, admin, deleteProduct); 

export default router;

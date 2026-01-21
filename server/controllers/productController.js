import Product from '../models/Product.js';
import { createError } from '../middleware/errorHandler.js';

// @desc    Получить все товары (с пагинацией и фильтрами)
// @route   GET /api/products
// @access  Public
export const getProducts = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;
    
    const filter = {};
    
    // Фильтрация по категории
    if (req.query.category) {
      filter.category = req.query.category;
    }
    
    // Фильтрация по бренду
    if (req.query.brand) {
      filter.brand = { $regex: req.query.brand, $options: 'i' };
    }
    
    // Поиск
    if (req.query.search) {
      filter.$text = { $search: req.query.search };
    }
    
    // Ценовой диапазон
    if (req.query.minPrice || req.query.maxPrice) {
      filter.price = {};
      if (req.query.minPrice) filter.price.$gte = parseFloat(req.query.minPrice);
      if (req.query.maxPrice) filter.price.$lte = parseFloat(req.query.maxPrice);
    }
    
    // В наличии
    if (req.query.inStock === 'true') {
      filter.stock = { $gt: 0 };
    }
    
    // Featured товары
    if (req.query.featured === 'true') {
      filter.isFeatured = true;
    }

    const products = await Product.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Product.countDocuments(filter);

    res.json({
      status: 'success',
      data: {
        products,
        pagination: {
          page,
          pages: Math.ceil(total / limit),
          total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Получить товар по ID
// @route   GET /api/products/:id
// @access  Public
export const getProductById = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id).lean();
    
    if (!product) {
      return next(createError('Товар не найден', 404));
    }
    
    res.json({
      status: 'success',
      data: { product },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Создать товар
// @route   POST /api/products
// @access  Private/Admin
export const createProduct = async (req, res, next) => {
  try {
    const product = await Product.create(req.body);
    
    res.status(201).json({
      status: 'success',
      data: { product },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Обновить товар
// @route   PUT /api/products/:id
// @access  Private/Admin
export const updateProduct = async (req, res, next) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!product) {
      return next(createError('Товар не найден', 404));
    }
    
    res.json({
      status: 'success',
      data: { product },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Удалить товар
// @route   DELETE /api/products/:id
// @access  Private/Admin
export const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return next(createError('Товар не найден', 404));
    }

    await product.deleteOne();

    res.json({
      status: 'success',
      message: 'Товар удалён',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Получить категории
// @route   GET /api/products/categories
// @access  Public
export const getCategories = async (req, res, next) => {
  try {
    const categories = await Product.distinct('category');
    
    res.json({
      status: 'success',
      data: { categories },
    });
  } catch (error) {
    next(error);
  }
};
import Review from '../models/Review.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import { createError } from '../middleware/errorHandler.js';

const hasPurchased = async ({ userId, productId }) => {
  
  const doc = await Order.findOne({
    user: userId,
    isPaid: true,
    'orderItems.product': productId,
  })
    .select('_id')
    .lean();
  return Boolean(doc);
};


export const getLatestReviews = async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit || 3), 12);

    const docs = await Review.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('product', 'name brand images')
      .lean();

    const items = (docs || [])
      .filter((r) => r.product)
      .map((r) => ({
        _id: r._id,
        name: r.name,
        city: r.city || '',
        rating: r.rating,
        text: r.text,
        avatarUrl: r.avatarUrl || '',
        createdAt: r.createdAt,
        product: {
          _id: r.product._id,
          name: r.product.name,
          brand: r.product.brand,
          image: r.product.images?.[0] || '',
        },
      }));

    res.json({ status: 'success', data: { items } });
  } catch (e) {
    next(e);
  }
};


export const getProductReviews = async (req, res, next) => {
  try {
    const productId = String(req.params.productId || '').trim();
    if (!productId) return next(createError('productId обязателен', 400));

    const limit = Math.min(Math.max(Number(req.query.limit || 10), 1), 50);
    const page = Math.max(Number(req.query.page || 1), 1);
    const skip = (page - 1) * limit;

    const [total, docs] = await Promise.all([
      Review.countDocuments({ product: productId }),
      Review.find({ product: productId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    res.json({
      status: 'success',
      data: {
        items: (docs || []).map((r) => ({
          _id: r._id,
          name: r.name,
          city: r.city || '',
          rating: r.rating,
          text: r.text,
          avatarUrl: r.avatarUrl || '',
          createdAt: r.createdAt,
          user: r.user,
        })),
        total,
        page,
        pages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (e) {
    next(e);
  }
};


export const canReviewProduct = async (req, res, next) => {
  try {
    const productId = String(req.params.productId || '').trim();
    if (!productId) return next(createError('productId обязателен', 400));

    const product = await Product.findById(productId).select('_id').lean();
    if (!product) return next(createError('Товар не найден', 404));

    const existing = await Review.findOne({ product: productId, user: req.user._id }).select('_id').lean();
    if (existing) {
      return res.json({ status: 'success', data: { canReview: false, reason: 'already_reviewed' } });
    }

    const purchased = await hasPurchased({ userId: req.user._id, productId });
    if (!purchased) {
      return res.json({ status: 'success', data: { canReview: false, reason: 'not_purchased' } });
    }

    return res.json({ status: 'success', data: { canReview: true, reason: 'ok' } });
  } catch (e) {
    next(e);
  }
};


export const createReview = async (req, res, next) => {
  try {
    const { productId, rating, text, city } = req.body || {};
    const r = Number(rating);

    if (!productId) return next(createError('productId обязателен', 400));
    if (!text || String(text).trim().length < 5) return next(createError('Текст отзыва слишком короткий', 400));
    if (!Number.isFinite(r) || r < 1 || r > 5) return next(createError('Рейтинг должен быть от 1 до 5', 400));

    const product = await Product.findById(productId);
    if (!product) return next(createError('Товар не найден', 404));

    
    const existing = await Review.findOne({ product: productId, user: req.user._id }).lean();
    if (existing) return next(createError('Вы уже оставляли отзыв на этот товар', 400));

    
    const purchased = await hasPurchased({ userId: req.user._id, productId });
    if (!purchased) return next(createError('Оставлять отзывы могут только покупатели этого товара', 403));

    const doc = await Review.create({
      product: productId,
      user: req.user._id,
      name: req.user.name,
      city: String(city || '').trim(),
      rating: r,
      text: String(text).trim(),
      avatarUrl: req.user.avatarUrl || '',
    });

    
    const stats = await Review.aggregate([
      { $match: { product: product._id } },
      { $group: { _id: '$product', avgRating: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]);

    const avg = Number(stats?.[0]?.avgRating ?? 0);
    const count = Number(stats?.[0]?.count ?? 0);

    product.rating = Math.round(avg * 10) / 10;
    product.numReviews = count;
    await product.save({ validateBeforeSave: false });

    res.status(201).json({
      status: 'success',
      data: { review: doc },
    });
  } catch (e) {
    next(e);
  }
};

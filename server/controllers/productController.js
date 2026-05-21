import Product from '../models/Product.js';
import Category from '../models/Category.js';
import StockLog from '../models/StockLog.js';
import Review from '../models/Review.js';
import { createError } from '../middleware/errorHandler.js';


const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const parseBooleanInput = (value) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
    if (['false', '0', 'no', 'off', ''].includes(normalized)) return false;
  }
  return Boolean(value);
};

const hasOwn = (obj, key) => Object.prototype.hasOwnProperty.call(obj || {}, key);

const normalizeProductPayload = (body = {}, { partial = false } = {}) => {
  const payload = {};
  const hasImageField = hasOwn(body, 'images') || hasOwn(body, 'imageUrls') || hasOwn(body, 'imageUrl');

  if (!partial || hasImageField) {
    const rawImages = body.images ?? body.imageUrls ?? body.imageUrl ?? '';
    let images = [];
    if (Array.isArray(rawImages)) {
      images = rawImages;
    } else if (typeof rawImages === 'string') {
      images = rawImages
        .split(/\r?\n|,|;/)
        .map((item) => String(item || '').trim())
        .filter(Boolean);
    }

    payload.images = images
      .map((item) => String(item || '').trim())
      .filter(Boolean)
      .slice(0, 12);
  }

  if (!partial || hasOwn(body, 'tags')) {
    payload.tags = Array.isArray(body.tags)
      ? body.tags
      : String(body.tags || '')
          .split(',')
          .map((item) => String(item || '').trim())
          .filter(Boolean);
  }

  if (!partial || hasOwn(body, 'name')) payload.name = String(body.name || '').trim();
  if (!partial || hasOwn(body, 'description')) payload.description = String(body.description || '').trim();
  if (!partial || hasOwn(body, 'price')) payload.price = Number(body.price || 0);
  if (!partial || hasOwn(body, 'category')) payload.category = String(body.category || '').trim().toLowerCase();
  if (!partial || hasOwn(body, 'brand')) payload.brand = String(body.brand || '').trim();
  if (!partial || hasOwn(body, 'videoUrl')) payload.videoUrl = String(body.videoUrl || '').trim();
  if (!partial || hasOwn(body, 'stock')) payload.stock = Number(body.stock ?? 0);
  if (!partial || hasOwn(body, 'discount')) payload.discount = Number(body.discount ?? 0);
  if (!partial || hasOwn(body, 'isFeatured')) payload.isFeatured = parseBooleanInput(body.isFeatured);

  return payload;
};


export const getProducts = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 12, 1), 60);
    const skip = (page - 1) * limit;

    const filter = {};

    
    if (req.query.category) {
      const raw = String(req.query.category);
      const parts = raw.split(',').map((v) => v.trim()).filter(Boolean);
      const regs = parts.map((p) => new RegExp(`^${escapeRegex(p)}$`, 'i'));
      filter.category = regs.length === 1 ? regs[0] : { $in: regs };
    }

    
    if (req.query.brand) {
      const raw = String(req.query.brand);
      const parts = raw.split(',').map((v) => v.trim()).filter(Boolean);
      const regs = parts.map((p) => new RegExp(escapeRegex(p), 'i'));
      filter.brand = regs.length === 1 ? { $regex: regs[0] } : { $in: regs };
      
      if (regs.length === 1) filter.brand = { $regex: regs[0] };
    }

    
    if (req.query.search) {
      filter.$text = { $search: String(req.query.search) };
    }

    
    if (req.query.minPrice || req.query.maxPrice) {
      filter.price = {};
      if (req.query.minPrice !== undefined && req.query.minPrice !== '') {
        filter.price.$gte = parseFloat(req.query.minPrice);
      }
      if (req.query.maxPrice !== undefined && req.query.maxPrice !== '') {
        filter.price.$lte = parseFloat(req.query.maxPrice);
      }
    }

    
    const availability = String(req.query.availability || '').toLowerCase();
    if (availability === 'preorder') {
      filter.stock = 0;
    } else if (availability === 'instock' || req.query.inStock === 'true') {
      filter.stock = { $gt: 0 };
    }

    
    if (req.query.new === 'true') {
      const d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      filter.createdAt = { ...(filter.createdAt || {}), $gte: d };
    }

    
    if (req.query.featured === 'true') {
      filter.isFeatured = true;
    }

    
    let sort = { createdAt: -1 };
    const sortKey = String(req.query.sort || '').toLowerCase();
    if (sortKey === 'price_asc') sort = { price: 1 };
    if (sortKey === 'price_desc') sort = { price: -1 };
    if (sortKey === 'newest') sort = { createdAt: -1 };
    if (sortKey === 'discount_desc') sort = { discount: -1, createdAt: -1 };
    if (sortKey === 'popular') sort = { numReviews: -1, rating: -1, createdAt: -1 };

    
    const hasText = Boolean(filter.$text);
    const query = hasText
      ? Product.find(filter, { score: { $meta: 'textScore' } })
      : Product.find(filter);

    const products = await query
      .sort(hasText ? { score: { $meta: 'textScore' }, ...sort } : sort)
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Product.countDocuments(filter);
    const pages = Math.max(Math.ceil(total / limit), 1);

    const from = total === 0 ? 0 : skip + 1;
    const to = total === 0 ? 0 : skip + products.length;

    res.json({
      status: 'success',
      data: {
        products,
        pagination: {
          page,
          pages,
          total,
          limit,
          from,
          to,
          hasNext: page < pages,
          hasPrev: page > 1,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};


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


export const createProduct = async (req, res, next) => {
  try {
    
    
    const categoryKey = String(req.body?.category || '').trim().toLowerCase();
    if (categoryKey) {
      await Category.findOneAndUpdate(
        { key: categoryKey },
        {
          $setOnInsert: {
            key: categoryKey,
            nameRu: req.body?.categoryNameRu ? String(req.body.categoryNameRu).trim() : categoryKey,
            nameEn: req.body?.categoryNameEn ? String(req.body.categoryNameEn).trim() : categoryKey,
            name: categoryKey,
            createdBy: req.user?._id,
          },
        },
        { upsert: true, new: true, runValidators: true }
      );
      
      req.body.category = categoryKey;
    }

    const payload = normalizeProductPayload(req.body);
    const product = await Product.create(payload);
    
    res.status(201).json({
      status: 'success',
      data: { product },
    });
  } catch (error) {
    next(error);
  }
};


export const updateProduct = async (req, res, next) => {
  try {
    const before = await Product.findById(req.params.id).select('stock').lean();
    if (!before) {
      return next(createError('Товар не найден', 404));
    }

    const isPatch = String(req.method || '').toUpperCase() === 'PATCH';

    
    const categoryKey = String(req.body?.category || '').trim().toLowerCase();
    if (categoryKey) {
      await Category.findOneAndUpdate(
        { key: categoryKey },
        {
          $setOnInsert: {
            key: categoryKey,
            nameRu: req.body?.categoryNameRu ? String(req.body.categoryNameRu).trim() : categoryKey,
            nameEn: req.body?.categoryNameEn ? String(req.body.categoryNameEn).trim() : categoryKey,
            name: categoryKey,
            createdBy: req.user?._id,
          },
        },
        { upsert: true, new: true, runValidators: true }
      );
      req.body.category = categoryKey;
    }

    const payload = normalizeProductPayload(req.body, { partial: isPatch });
    const product = await Product.findByIdAndUpdate(req.params.id, { $set: payload }, {
      new: true,
      runValidators: true,
    });

    if (!product) {
      return next(createError('Товар не найден', 404));
    }

    
    try {
      if (before && Object.prototype.hasOwnProperty.call(req.body || {}, 'stock')) {
        const prevStock = Number(before.stock || 0);
        const nextStock = Number(product.stock || 0);
        if (prevStock !== nextStock) {
          await StockLog.create({
            product: product._id,
            changedBy: req.user?._id,
            delta: nextStock - prevStock,
            before: prevStock,
            after: nextStock,
            reason: 'admin',
            note: String(req.body?.stockNote || '').slice(0, 300),
          });
        }
      }
    } catch (e) {
      console.warn('⚠️ StockLog (admin) failed:', e?.message || e);
    }

    res.json({
      status: 'success',
      data: { product },
    });
  } catch (error) {
    next(error);
  }
};


export const getStockLogsByProduct = async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit || 30), 100);
    const logs = await StockLog.find({ product: req.params.id })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('changedBy', 'name email')
      .lean();

    res.json({
      status: 'success',
      data: { logs },
    });
  } catch (e) {
    next(e);
  }
};


export const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return next(createError('Товар не найден', 404));
    }

    await Review.deleteMany({ product: product._id });
    await StockLog.deleteMany({ product: product._id });
    await product.deleteOne();

    res.json({
      status: 'success',
      message: 'Товар удалён',
    });
  } catch (error) {
    next(error);
  }
};


export const getFiltersMeta = async (req, res, next) => {
  try {
    const [brandsRaw, priceAgg] = await Promise.all([
      Product.distinct('brand'),
      Product.aggregate([
        { $group: { _id: null, minPrice: { $min: '$price' }, maxPrice: { $max: '$price' } } },
      ]),
    ]);

    const brands = (brandsRaw || [])
      .filter(Boolean)
      .map((b) => String(b).trim())
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }));

    const minPrice = Number(priceAgg?.[0]?.minPrice ?? 0);
    const maxPrice = Number(priceAgg?.[0]?.maxPrice ?? 0);

    res.json({
      status: 'success',
      data: { brands, minPrice, maxPrice },
    });
  } catch (e) {
    next(e);
  }
};


export const suggestProducts = async (req, res, next) => {
  try {
    const q = String(req.query.q || req.query.query || '').trim();
    if (q.length < 2) {
      return res.json({ status: 'success', data: { brands: [], products: [] } });
    }

    const prefixRe = new RegExp('^' + escapeRegex(q), 'i');
    const anyRe = new RegExp(escapeRegex(q), 'i');

    const brandsAgg = await Product.aggregate([
      { $match: { brand: { $regex: prefixRe } } },
      { $group: { _id: { $toLower: '$brand' }, brand: { $first: '$brand' }, count: { $sum: 1 } } },
      { $sort: { count: -1, brand: 1 } },
      { $limit: 7 },
      { $project: { _id: 0, brand: 1 } },
    ]);

    const brands = (brandsAgg || []).map((x) => x.brand).filter(Boolean);

    const products = await Product.find(
      { $or: [{ name: { $regex: anyRe } }, { brand: { $regex: anyRe } }] },
      'name brand category price discount images rating numReviews stock isFeatured createdAt'
    )
      .sort({ numReviews: -1, rating: -1, createdAt: -1 })
      .limit(6)
      .lean();

    res.json({
      status: 'success',
      data: { brands, products },
    });
  } catch (e) {
    next(e);
  }
};


export const getProductsByIds = async (req, res, next) => {
  try {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids.slice(0, 30) : [];
    const normalized = ids.map((id) => String(id)).filter(Boolean);

    if (normalized.length === 0) {
      return res.json({ status: 'success', data: { products: [] } });
    }

    const products = await Product.find({ _id: { $in: normalized } }).lean();
    const map = new Map(products.map((p) => [String(p._id), p]));
    const ordered = normalized.map((id) => map.get(id)).filter(Boolean);

    res.json({
      status: 'success',
      data: { products: ordered },
    });
  } catch (e) {
    next(e);
  }
};


export const getCategories = async (req, res, next) => {
  try {
    
    
    const [fromCatalog, fromProducts] = await Promise.all([
      Category.find().select('key name nameRu nameEn -_id').lean(),
      Product.distinct('category'),
    ]);

    const labelFromKey = (k) => {
      const s = String(k || '').trim();
      if (!s) return '';
      const spaced = s.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ');
      return spaced.charAt(0).toUpperCase() + spaced.slice(1);
    };

    const map = new Map(); 

    for (const c of fromCatalog || []) {
      const key = (c.key || c.name || c.nameEn || c.nameRu || '').toString().trim().toLowerCase();
      if (!key) continue;
      map.set(key, {
        key,
        nameRu: c.nameRu ? String(c.nameRu).trim() : labelFromKey(key),
        nameEn: c.nameEn ? String(c.nameEn).trim() : labelFromKey(key),
      });
    }

    for (const raw of fromProducts || []) {
      const key = String(raw || '').trim().toLowerCase();
      if (!key) continue;
      if (!map.has(key)) {
        map.set(key, { key, nameRu: labelFromKey(key), nameEn: labelFromKey(key) });
      }
    }

    const items = [...map.values()].sort((a, b) => a.key.localeCompare(b.key, 'en'));
    const categories = items.map((x) => x.key);

    res.json({
      status: 'success',
      data: { categories, items },
    });
  } catch (error) {
    next(error);
  }
};
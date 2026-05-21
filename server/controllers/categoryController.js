import Category from '../models/Category.js';
import { createError } from '../middleware/errorHandler.js';

const slugify = (str) => {
  const s = String(str || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return s;
};


export const listCategories = async (req, res, next) => {
  try {
    const raw = await Category.find().sort({ nameRu: 1, nameEn: 1, key: 1 }).lean();

    
    const categories = raw.map((c) => {
      const legacy = c.name || '';
      const key = c.key || slugify(legacy) || String(legacy).toLowerCase();
      return {
        ...c,
        key,
        nameRu: c.nameRu || legacy || key,
        nameEn: c.nameEn || legacy || key,
      };
    });

    res.json({
      status: 'success',
      data: { categories },
    });
  } catch (e) {
    next(e);
  }
};


export const createCategory = async (req, res, next) => {
  try {
    
    
    const legacyName = String(req.body?.name || '').trim();
    const key = String(req.body?.key || '').trim().toLowerCase() || slugify(req.body?.nameEn) || slugify(req.body?.nameRu) || slugify(legacyName);
    const nameRu = String(req.body?.nameRu || legacyName || '').trim();
    const nameEn = String(req.body?.nameEn || legacyName || '').trim();

    if (!key) return next(createError('Ключ категории обязателен', 400));
    if (!nameRu) return next(createError('Название (RU) обязательно', 400));
    if (!nameEn) return next(createError('Название (EN) обязательно', 400));

    const category = await Category.findOneAndUpdate(
      { key },
      {
        $set: {
          key,
          nameRu,
          nameEn,
          
          name: legacyName || nameRu,
        },
        $setOnInsert: { createdBy: req.user?._id },
      },
      { new: true, upsert: true, runValidators: true }
    ).lean();

    res.status(201).json({
      status: 'success',
      data: { category },
    });
  } catch (e) {
    next(e);
  }
};


export const updateCategory = async (req, res, next) => {
  try {
    const legacyName = String(req.body?.name || '').trim();
    const key = String(req.body?.key || '').trim().toLowerCase();
    const nameRu = String(req.body?.nameRu || '').trim();
    const nameEn = String(req.body?.nameEn || '').trim();

    const patch = {};
    if (key) patch.key = key;
    if (nameRu) patch.nameRu = nameRu;
    if (nameEn) patch.nameEn = nameEn;
    if (legacyName) patch.name = legacyName;
    if (!Object.keys(patch).length) return next(createError('Нет данных для обновления', 400));

    const category = await Category.findByIdAndUpdate(req.params.id, patch, {
      new: true,
      runValidators: true,
    });

    if (!category) return next(createError('Категория не найдена', 404));

    res.json({
      status: 'success',
      data: { category },
    });
  } catch (e) {
    next(e);
  }
};


export const deleteCategory = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return next(createError('Категория не найдена', 404));

    
    try {
      const Product = (await import('../models/Product.js')).default;
      const key = category.key || slugify(category.name) || category.name;
      const used = await Product.countDocuments({ category: key });
      if (used > 0) {
        return next(createError('Нельзя удалить категорию: она используется в товарах', 400));
      }
    } catch {
      
    }
    await category.deleteOne();

    res.json({
      status: 'success',
      message: 'Категория удалена',
    });
  } catch (e) {
    next(e);
  }
};

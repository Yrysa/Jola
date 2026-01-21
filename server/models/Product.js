import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Название товара обязательно'],
    trim: true,
    maxlength: [100, 'Название не может быть длиннее 100 символов'],
  },
  description: {
    type: String,
    required: [true, 'Описание обязательно'],
    maxlength: [2000, 'Описание не может быть длиннее 2000 символов'],
  },
  price: {
    type: Number,
    required: [true, 'Цена обязательна'],
    min: [0, 'Цена не может быть отрицательной'],
  },
  category: {
    type: String,
    required: [true, 'Категория обязательна'],
    enum: ['electronics', 'clothing', 'books', 'home', 'sports', 'other'],
  },
  brand: {
    type: String,
    required: [true, 'Бренд обязателен'],
  },
  images: [{
    type: String,
    required: true,
  }],
  stock: {
    type: Number,
    required: [true, 'Количество на складе обязательно'],
    min: [0, 'Количество не может быть отрицательным'],
    default: 0,
  },
  rating: {
    type: Number,
    min: 0,
    max: 5,
    default: 0,
  },
  numReviews: {
    type: Number,
    default: 0,
  },
  tags: [{
    type: String,
    trim: true,
  }],
  isFeatured: {
    type: Boolean,
    default: false,
  },
  discount: {
    type: Number,
    min: 0,
    max: 100,
    default: 0,
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Виртуальное поле для цены со скидкой
productSchema.virtual('discountedPrice').get(function() {
  return this.price * (1 - this.discount / 100);
});

// Индексы для производительности
productSchema.index({ category: 1, price: 1 });
productSchema.index({ name: 'text', description: 'text' });

export default mongoose.model('Product', productSchema);
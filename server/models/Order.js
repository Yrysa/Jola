import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    unique: true,
    index: true,
    trim: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  orderItems: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    name: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true },
    image: { type: String, default: '' },
  }],
  serviceItems: [
    {
      serviceKey: { type: String, required: true },
      serviceTitle: { type: String, required: true },
      kind: { type: String, default: 'document_print' },
      options: { type: mongoose.Schema.Types.Mixed, default: {} },
      files: [
        {
          fileId: { type: mongoose.Schema.Types.ObjectId },
          originalName: { type: String, default: '' },
          url: { type: String, default: '' },
          size: { type: Number, default: 0 },
          ext: { type: String, default: '' },
          pages: { type: Number, default: 1 },
        },
      ],
      price: { type: Number, required: true, default: 0 },
      breakdown: { type: mongoose.Schema.Types.Mixed, default: {} },
    },
  ],
  shippingAddress: {
    street: { type: String, required: true },
    city: { type: String, required: true },
    zipCode: { type: String, required: true },
    country: { type: String, required: true },
  },
  paymentMethod: {
    type: String,
    enum: ['card', 'stripe_card', 'cash'],
    default: 'stripe_card',
  },
  paymentResult: {
    id: String,
    status: String,
    update_time: String,
    email_address: String,
  },
  itemsPrice: {
    type: Number,
    required: true,
    default: 0.0,
  },
  taxPrice: {
    type: Number,
    required: true,
    default: 0.0,
  },
  shippingPrice: {
    type: Number,
    required: true,
    default: 0.0,
  },
  totalPrice: {
    type: Number,
    required: true,
    default: 0.0,
  },
  promoDiscount: {
    type: Number,
    default: 0,
    min: 0,
  },
  promo: {
    code: { type: String, default: '' },
    title: { type: String, default: '' },
    type: { type: String, default: '' },
    value: { type: Number, default: 0 },
  },
  inventoryApplied: {
    type: Boolean,
    default: false,
  },
  isPaid: {
    type: Boolean,
    required: true,
    default: false,
  },
  paidAt: {
    type: Date,
  },
  isDelivered: {
    type: Boolean,
    required: true,
    default: false,
  },
  deliveredAt: {
    type: Date,
  },
  deliveryWindow: {
    type: String,
    default: '1–2 дня',
  },
  deliveryDays: {
    type: Number,
    min: 0,
    default: 2,
  },
  expectedDeliveryDate: {
    type: Date,
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'],
    default: 'pending',
  },
  adminNote: {
    type: String,
    default: '',
    maxlength: [500, 'Комментарий админа не может быть длиннее 500 символов'],
  },
  customerNote: {
    type: String,
    default: '',
    maxlength: [500, 'Комментарий клиента не может быть длиннее 500 символов'],
  },
  statusHistory: [
    {
      status: {
        type: String,
        enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'],
        required: true,
      },
      source: {
        type: String,
        default: 'system',
        maxlength: 40,
      },
      actor: {
        type: String,
        default: '',
        maxlength: 120,
      },
      note: {
        type: String,
        default: '',
        maxlength: 500,
      },
      at: {
        type: Date,
        default: Date.now,
      },
    },
  ],
}, {
  timestamps: true,
});

orderSchema.pre('validate', function assignOrderNumber(next) {
  if (!this.orderNumber) {
    const year = new Date(this.createdAt || Date.now()).getFullYear();
    const suffix = String(this._id || '').slice(-8).toUpperCase();
    this.orderNumber = `JOLA-${year}-${suffix}`;
  }
  next();
});

orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ status: 1 });
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ 'serviceItems.serviceKey': 1 });

export default mongoose.model('Order', orderSchema);
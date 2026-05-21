import mongoose from 'mongoose';

const stockLogSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    
    delta: {
      type: Number,
      required: true,
    },
    before: {
      type: Number,
      required: true,
    },
    after: {
      type: Number,
      required: true,
    },
    reason: {
      type: String,
      default: 'other',
      maxlength: 60,
    },
    note: {
      type: String,
      default: '',
      maxlength: 300,
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: false,
    },
  },
  { timestamps: true }
);

stockLogSchema.index({ product: 1, createdAt: -1 });

export default mongoose.model('StockLog', stockLogSchema);

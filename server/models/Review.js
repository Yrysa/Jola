import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    city: {
      type: String,
      default: '',
      trim: true,
      maxlength: 80,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1200,
    },
    avatarUrl: {
      type: String,
      default: '',
      trim: true,
    },
  },
  { timestamps: true }
);

reviewSchema.index({ createdAt: -1 });

export default mongoose.model('Review', reviewSchema);

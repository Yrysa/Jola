import mongoose from 'mongoose';

const uploadFileSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    
    scope: { type: String, enum: ['temp', 'order'], default: 'temp', index: true },
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },

    originalName: { type: String, required: true },
    mimeType: { type: String, default: '' },
    size: { type: Number, default: 0 },
    ext: { type: String, default: '' },

    
    relPath: { type: String, required: true },
    url: { type: String, required: true },

    
    pages: { type: Number, default: 1, min: 1 },
    width: { type: Number },
    height: { type: Number },
  },
  { timestamps: true }
);

uploadFileSchema.index({ owner: 1, scope: 1, createdAt: -1 });

export default mongoose.model('UploadFile', uploadFileSchema);

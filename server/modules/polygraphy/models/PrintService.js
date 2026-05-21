import mongoose from 'mongoose';


const printServiceSchema = new mongoose.Schema(
  {
    
    key: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },

    
    group: { type: String, default: 'Полиграфия' },
    subgroup: { type: String, default: '' },

    
    kind: {
      type: String,
      enum: ['document_print', 'photo_print', 'business_cards', 'wide_format', 'scan_copy', 'binding'],
      default: 'document_print',
      index: true,
    },

    isActive: { type: Boolean, default: true, index: true },

    
    pricing: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

export default mongoose.model('PrintService', printServiceSchema);

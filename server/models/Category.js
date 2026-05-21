import mongoose from 'mongoose';


const categorySchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: [true, 'Ключ категории обязателен'],
      trim: true,
      lowercase: true,
      minlength: [1, 'Ключ категории не может быть пустым'],
      maxlength: [64, 'Ключ категории не может быть длиннее 64 символов'],
      unique: true,
    },
    nameRu: {
      type: String,
      required: [true, 'Название (RU) обязательно'],
      trim: true,
      maxlength: [60, 'Название категории не может быть длиннее 60 символов'],
    },
    nameEn: {
      type: String,
      required: [true, 'Название (EN) обязательно'],
      trim: true,
      maxlength: [60, 'Название категории не может быть длиннее 60 символов'],
    },
    
    name: {
      type: String,
      trim: true,
      maxlength: [60, 'Название категории не может быть длиннее 60 символов'],
      required: false,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
  },
  { timestamps: true }
);


categorySchema.pre('validate', function (next) {
  if (!this.key) {
    const fallback = (this.nameEn || this.nameRu || this.name || '').trim().toLowerCase();
    if (fallback) this.key = fallback;
  }
  if (!this.nameRu) this.nameRu = (this.name || this.nameEn || this.key || '').trim();
  if (!this.nameEn) this.nameEn = (this.name || this.nameRu || this.key || '').trim();
  next();
});

export default mongoose.model('Category', categorySchema);

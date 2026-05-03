import mongoose from 'mongoose';

const columnSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Column name is required'],
    trim: true,
    maxlength: [50, 'Column name cannot exceed 50 characters'],
  },
  board: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Board',
    required: true,
  },
  order: {
    type: Number,
    required: true,
  },
  color: {
    type: String,
    default: '#e2e8f0',
  },
  isDefault: {
    type: Boolean,
    default: false,
  },
}, { timestamps: true });

columnSchema.index({ board: 1 });
columnSchema.index({ board: 1, order: 1 });

const Column = mongoose.model('Column', columnSchema);
export default Column;
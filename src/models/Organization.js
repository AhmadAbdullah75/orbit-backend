import mongoose from 'mongoose';

const organizationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Organization name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters'],
    maxlength: [50, 'Name cannot exceed 50 characters'],
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true,
    trim: true,
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  description: {
    type: String,
    default: '',
    maxlength: [200, 'Description cannot exceed 200 characters'],
  },
  avatar: {
    type: String,
    default: '',
  },
}, { timestamps: true });

organizationSchema.pre('save', function() {
  if (this.isModified('name')) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') +
      '-' + Date.now().toString().slice(-4);
  }
});

organizationSchema.index({ owner: 1 });

const Organization = mongoose.model('Organization', organizationSchema);
export default Organization;
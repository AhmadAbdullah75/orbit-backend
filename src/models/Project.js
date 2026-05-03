import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Project name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters'],
    maxlength: [100, 'Name cannot exceed 100 characters'],
  },
  description: {
    type: String,
    default: '',
    maxlength: [500, 'Description cannot exceed 500 characters'],
  },
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  visibility: {
    type: String,
    enum: ['private', 'public'],
    default: 'public',
  },
  status: {
    type: String,
    enum: ['active', 'archived'],
    default: 'active',
  },
  color: {
    type: String,
    default: '#6366f1',
  },
}, { timestamps: true });

projectSchema.index({ organization: 1 });
projectSchema.index({ owner: 1 });

const Project = mongoose.model('Project', projectSchema);
export default Project;
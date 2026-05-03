import mongoose from 'mongoose';

const activitySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  action: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
}, { _id: false });

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Task title is required'],
    trim: true,
    minlength: [2, 'Title must be at least 2 characters'],
    maxlength: [200, 'Title cannot exceed 200 characters'],
  },
  description: {
    type: String,
    default: '',
    maxlength: [2000, 'Description cannot exceed 2000 characters'],
  },
  column: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Column',
    required: true,
  },
  board: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Board',
    required: true,
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
  },
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  assignees: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
  },
  status: {
    type: String,
    enum: ['todo', 'in_progress', 'review', 'done'],
    default: 'todo',
  },
  dueDate: {
    type: Date,
  },
  order: {
    type: Number,
    required: true,
  },
  labels: [{
    type: String,
  }],
  attachments: [{
    name: String,
    url: String,
    size: Number,
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  }],
  subtasks: [
    {
      _id: {
        type: mongoose.Schema.Types.ObjectId,
        default: () => new mongoose.Types.ObjectId(),
      },
      title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200,
      },
      completed: {
        type: Boolean,
        default: false,
      },
      assignee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
      },
      startDate: {
        type: Date,
        default: null,
      },
      dueDate: {
        type: Date,
        default: null,
      },
      priority: {
        type: String,
        enum: ['urgent', 'high', 'medium', 'low'],
        default: 'medium',
      },
      createdAt: {
        type: Date,
        default: Date.now,
      },
    }
  ],
  activity: [activitySchema],
}, { timestamps: true });

taskSchema.index({ column: 1 });
taskSchema.index({ board: 1 });
taskSchema.index({ project: 1 });
taskSchema.index({ column: 1, order: 1 });
taskSchema.index({ title: 'text', description: 'text' });


const Task = mongoose.model('Task', taskSchema);
export default Task;
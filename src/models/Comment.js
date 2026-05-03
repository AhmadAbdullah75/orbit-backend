import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema({
  content: {
    type: String,
    required: [true, 'Comment content is required'],
    trim: true,
    minlength: [1, 'Comment must not be empty'],
    maxlength: [2000, 'Comment cannot exceed 2000 characters'],
  },
  task: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    required: true,
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  isEdited: {
    type: Boolean,
    default: false,
  },
}, { timestamps: true });

commentSchema.index({ task: 1 });
commentSchema.index({ author: 1 });

const Comment = mongoose.model('Comment', commentSchema);
export default Comment;
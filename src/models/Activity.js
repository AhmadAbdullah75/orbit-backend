import mongoose from 'mongoose';

const activitySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
  },
  entity: {
    type: String,
    enum: ['task', 'project', 'column', 'comment', 'member'],
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
  },
  action: {
    type: String,
    required: true,
  },
  metadata: {
    type: Object,
    default: {},
  },
}, { timestamps: true });

activitySchema.index({ organization: 1 });
activitySchema.index({ project: 1 });
activitySchema.index({ user: 1 });
activitySchema.index({ createdAt: -1 });

const Activity = mongoose.model('Activity', activitySchema);
export default Activity;
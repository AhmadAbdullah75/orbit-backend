import mongoose from 'mongoose';

const ROLES = ['owner', 'admin', 'member'];

const membershipSchema = new mongoose.Schema({
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
  role: {
    type: String,
    enum: ['owner', 'admin', 'member'],
    default: 'member',
  },
  invitedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, { timestamps: true });

membershipSchema.index({ user: 1, organization: 1 }, { unique: true });
membershipSchema.index({ organization: 1 });
membershipSchema.index({ user: 1 });

export const MEMBERSHIP_ROLES = ROLES;
const Membership = mongoose.model('Membership', membershipSchema);
export default Membership;
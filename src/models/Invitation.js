import mongoose from 'mongoose';
import crypto from 'crypto';

const invitationSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
  },
  invitedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  role: {
    type: String,
    enum: ['admin', 'member'],
    default: 'member',
  },
  token: {
    type: String,
    required: true,
    unique: true,
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'expired', 'revoked'],
    default: 'pending',
  },
  expiresAt: {
    type: Date,
    required: true,
    default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  },
}, { timestamps: true });

invitationSchema.index({ organization: 1 });
invitationSchema.index({ email: 1, organization: 1 });
invitationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

invitationSchema.statics.generateToken = function() {
  return crypto.randomBytes(32).toString('hex');
};

const Invitation = mongoose.model('Invitation', invitationSchema);
export default Invitation;

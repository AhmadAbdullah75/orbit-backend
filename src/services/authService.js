import crypto from 'crypto';
import User from '../models/User.js';
import AppError from '../utils/AppError.js';
import sendEmail from '../utils/sendEmail.js';

const sendTokens = async (user, res) => {
  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();

  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  return accessToken;
};

export const registerUser = async ({ name, email, password }, req) => {
  const existingUser = await User.findOne({ email });
  if (existingUser) throw new AppError('Email already in use', 400);

  const user = await User.create({ 
    name, 
    email, 
    password,
    isVerified: true 
  });

  return { message: 'Registration successful. You can now log in.' };
};

export const verifyEmail = async (token) => {
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  const user = await User.findOne({
    verificationToken: hashedToken,
    verificationTokenExpiry: { $gt: Date.now() },
  });

  if (!user) throw new AppError('Invalid or expired verification token', 400);

  user.isVerified = true;
  user.verificationToken = undefined;
  user.verificationTokenExpiry = undefined;
  await user.save({ validateBeforeSave: false });

  return { message: 'Email verified successfully. You can now log in.' };
};

export const loginUser = async ({ email, password }, res) => {
  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    throw new AppError('Invalid email or password', 401);
  }

  if (!user.isVerified) {
    throw new AppError('Please verify your email before logging in', 401);
  }

  const accessToken = await sendTokens(user, res);
  
  // Re-fetch user with organization populated
  const fullUser = await User.findById(user._id)
    .select('-password -refreshToken -verificationToken -resetPasswordToken')
    .populate('organization', '_id name description avatar slug');

  return {
    accessToken,
    user: fullUser,
  };
};

export const refreshAccessToken = async (token) => {
  if (!token) throw new AppError('No refresh token provided', 401);

  const user = await User.findOne({ refreshToken: token }).select('+refreshToken');
  if (!user) throw new AppError('Invalid refresh token', 401);

  const accessToken = user.generateAccessToken();
  return { accessToken };
};

export const forgotPassword = async (email, req) => {
  const user = await User.findOne({ email });
  if (!user) throw new AppError('No user found with that email', 404);

  const token = crypto.randomBytes(32).toString('hex');
  const hashed = crypto.createHash('sha256').update(token).digest('hex');

  user.resetPasswordToken = hashed;
  user.resetPasswordExpiry = Date.now() + 60 * 60 * 1000;
  await user.save({ validateBeforeSave: false });

  const resetURL = `${process.env.CLIENT_URL}/reset-password/${token}`;

  // Log reset token for dev environment
  if (process.env.NODE_ENV === 'development') {
    console.log('\n[DEV] Password reset token for', email + ':')
    console.log('[DEV] Reset URL:', `${process.env.CLIENT_URL}/reset-password/${token}`)
    console.log('[DEV] Token:', token, '\n')
  }

  try {
    await sendEmail({
      to: user.email,
      subject: 'Password Reset Request',
      html: `<h2>Password Reset</h2>
             <p>Click the link below to reset your password:</p>
             <a href="${resetURL}">Reset Password</a>
             <p>This link expires in 1 hour.</p>
             <p>If you did not request this, please ignore this email.</p>`,
    });
  } catch (emailErr) {
    if (process.env.NODE_ENV === 'development') {
      console.log('[DEV] Email send skipped or failed - use console token above')
    } else {
      throw emailErr
    }
  }

  return { message: 'Password reset link sent to your email.' };
};

export const resetPassword = async (token, newPassword) => {
  const hashed = crypto.createHash('sha256').update(token).digest('hex');

  const user = await User.findOne({
    resetPasswordToken: hashed,
    resetPasswordExpiry: { $gt: Date.now() },
  });

  if (!user) throw new AppError('Invalid or expired reset token', 400);

  user.password = newPassword;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpiry = undefined;
  await user.save();

  return { message: 'Password reset successful. You can now log in.' };
};

export const logoutUser = async (token, res) => {
  if (token) {
    await User.findOneAndUpdate(
      { refreshToken: token },
      { refreshToken: undefined },
      { new: true }
    );
  }

  res.clearCookie('refreshToken');
  return { message: 'Logged out successfully.' };
};

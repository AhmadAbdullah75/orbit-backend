import catchAsync from '../utils/catchAsync.js';
import * as authService from '../services/authService.js';
import User from '../models/User.js';
import AppError from '../utils/AppError.js';
import crypto from 'crypto';
import {
  sendPasswordResetEmail
} from '../utils/sendEmail.js';


export const register = catchAsync(async (req, res, next) => {
  const { name, email, password } = req.body;
  const result = await authService.registerUser({ name, email, password }, req);
  res.status(201).json({ status: 'success', ...result });
});

export const verifyEmail = catchAsync(async (req, res, next) => {
  const { token } = req.params;
  const result = await authService.verifyEmail(token);
  res.status(200).json({ status: 'success', ...result });
});

export const login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  const result = await authService.loginUser({ email, password }, res);
  res.status(200).json({ status: 'success', ...result });
});

export const refreshToken = catchAsync(async (req, res, next) => {
  const token = req.cookies.refreshToken;
  const result = await authService.refreshAccessToken(token);
  res.status(200).json({ status: 'success', ...result });
});

export const forgotPassword = catchAsync(async (req, res, next) => {
  const { email } = req.body;
  
  const user = await User.findOne({ email });
  if (!user) {
    return next(new AppError('No user found with that email', 404));
  }

  // Generate token
  const resetToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

  user.resetPasswordToken = hashedToken;
  user.resetPasswordExpiry = Date.now() + 30 * 60 * 1000; // 30 minutes per prompt
  await user.save({ validateBeforeSave: false });

  const resetUrl =
    `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`

  // Send real email
  const emailSent = await sendPasswordResetEmail({
    toEmail: user.email,
    userName: user.name,
    resetUrl,
  })

  // Always log as fallback in dev
  console.log(`[DEV] Reset URL: ${resetUrl}`)

  res.status(200).json({
    status: 'success',
    message: emailSent
      ? `Password reset link sent to ${user.email}`
      : 'Reset link logged to console (email unavailable)',
  })
});

export const resetPassword = catchAsync(async (req, res, next) => {
  const { token, password } = req.body;

  if (!token || !password) {
    return next(new AppError('Token and password are required', 400));
  }

  const result = await authService.resetPassword(token, password);
  res.status(200).json({ status: 'success', ...result });
});

export const logout = catchAsync(async (req, res, next) => {
  const token = req.cookies.refreshToken;
  const result = await authService.logoutUser(token, res);
  res.status(200).json({ status: 'success', ...result });
});

export const getMe = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id)
    .select('-password -refreshToken -verificationToken -resetPasswordToken')
    .populate('organization', '_id name description avatar slug');

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  res.status(200).json({
    status: 'success',
    user,
  });
});
  export const updateProfile = catchAsync(
    async (req, res, next) => {
      const { name } = req.body

      if (!name?.trim()) {
        return next(
          new AppError('Name is required', 400)
        )
      }
      const trimmed = name.trim()
      if (trimmed.length < 2 ||
          trimmed.length > 50) {
        return next(
          new AppError(
            'Name must be 2-50 characters', 400
          )
        )
      }

      // Use findById + save to avoid validator issues
      const user = await User.findById(req.user._id)
      if (!user) {
        return next(new AppError('User not found', 404))
      }

      user.name = trimmed
      await user.save({ validateBeforeSave: false })

      const userObj = user.toObject()
      delete userObj.password

      res.status(200).json({
        status: 'success',
        data: { user: userObj }
      })
    }
  )


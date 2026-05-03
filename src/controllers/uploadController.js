import fs from 'fs';
import Task from '../models/Task.js';
import AppError from '../utils/AppError.js';
import catchAsync from '../utils/catchAsync.js';

export const uploadFile = catchAsync(async (req, res, next) => {
  if (!req.file) return next(new AppError('No file uploaded', 400));

  // Generate a relative URL for static serving
  const url = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;

  res.status(200).json({
    status: 'success',
    data: {
      url,
      name: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
    },
  });
});

export const attachFileToTask = catchAsync(async (req, res, next) => {
  const { taskId } = req.params;
  const { url, name, size } = req.body;

  if (!url) return next(new AppError('File URL is required', 400));

  const task = await Task.findById(taskId);
  if (!task) return next(new AppError('Task not found', 404));

  // Push new industrial attachment structure
  task.attachments.push({
    name: name || 'Attachment',
    url,
    size: size || 0,
    uploadedAt: new Date()
  });
  
  await task.save();

  res.status(200).json({
    status: 'success',
    data: { attachments: task.attachments },
  });
});

export const removeAttachment = catchAsync(async (req, res, next) => {
  const { taskId, attachmentId } = req.params;

  const task = await Task.findById(taskId);
  if (!task) return next(new AppError('Task not found', 404));

  const attachment = task.attachments.id(attachmentId);
  if (!attachment) return next(new AppError('Attachment not found', 404));

  // 1. Try to delete local file from disk if it's a local upload
  if (attachment.url.includes(req.get('host'))) {
    try {
      const fileName = attachment.url.split('/').pop();
      const filePath = `uploads/${fileName}`;
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (err) {
      console.error('File deletion error:', err);
      // Don't fail the request if file deletion fails, just log it
    }
  }

  // 2. Remove from DB
  task.attachments.pull(attachmentId);
  await task.save();

  res.status(200).json({
    status: 'success',
    data: { attachments: task.attachments },
  });
});

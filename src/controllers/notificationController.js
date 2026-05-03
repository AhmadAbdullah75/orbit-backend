import catchAsync from '../utils/catchAsync.js';
import Notification from '../models/Notification.js';

export const getMyNotifications = catchAsync(async (req, res, next) => {
  const userId = req.user._id;
  const notifications = await Notification
    .find({ recipient: userId })
    .populate('sender', 'name avatar')
    .sort({ createdAt: -1 })
    .limit(20);

  const unreadCount = await Notification.countDocuments({
    recipient: userId,
    isRead: false,
  });

  res.status(200).json({
    status: 'success',
    data: { notifications, unreadCount },
  });
});

export const markAsRead = catchAsync(async (req, res, next) => {
  const { notificationId } = req.params;
  if (notificationId === 'all') {
    await Notification.updateMany(
      { recipient: req.user._id },
      { isRead: true }
    );
  } else {
    await Notification.findByIdAndUpdate(
      notificationId,
      { isRead: true }
    );
  }
  res.status(200).json({ status: 'success' });
});

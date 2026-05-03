import Notification from '../models/Notification.js';

const createNotification = async ({
  recipientId,
  senderId,
  orgId,
  type,
  message,
  link = '',
}) => {
  try {
    // Don't notify yourself
    if (recipientId?.toString() === senderId?.toString()) {
      return;
    }
    await Notification.create({
      recipient: recipientId,
      sender: senderId,
      organization: orgId,
      type,
      message,
      link,
    });
  } catch (err) {
    console.error('Notification error:', err.message);
  }
};

export default createNotification;

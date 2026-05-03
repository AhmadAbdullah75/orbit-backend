import express from 'express';
import {
  getMyNotifications,
  markAsRead,
} from '../controllers/notificationController.js';
import { protect } from '../middlewares/protect.js';

const router = express.Router();
router.use(protect);

router.get('/', getMyNotifications);
router.patch('/:notificationId/read', markAsRead);

export default router;

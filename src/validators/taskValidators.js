import { body } from 'express-validator';

export const createTaskValidator = [
  body('title').notEmpty().withMessage('Task title is required'),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']).withMessage('Invalid priority level'),
];

export const updateTaskValidator = [
  body('title').optional().notEmpty().withMessage('Title cannot be empty'),
  body('status').optional().notEmpty().withMessage('Status cannot be empty'),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']).withMessage('Invalid priority level'),
];

export const commentValidator = [
  body('content').notEmpty().withMessage('Comment content is required'),
];

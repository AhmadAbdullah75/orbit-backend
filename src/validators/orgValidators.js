import { body } from 'express-validator';
import Membership from '../models/Membership.js';

export const createOrgValidator = [
  body('name').notEmpty().withMessage('Organization name is required'),
];

export const inviteValidator = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Valid email required'),
  body('role')
    .optional()
    .isIn(['admin', 'member'])
    .withMessage(
      'Role must be admin or member'
    ),
]

export const changeRoleValidator = [
  body('role')
    .notEmpty()
    .withMessage('Role is required')
    .isIn(['admin', 'member'])
    .withMessage(
      'Role must be admin or member'
    ),
]

// Alias for backward compatibility if needed, though instructions say REPLACE
export const inviteMemberValidator = inviteValidator


import express from 'express';
import {
  createOrganization,
  getMyOrganizations,
  getOrganizationById,
  getOrganizationMembers,
  inviteMember,
  changeMemberRole,
  removeMember,
  deleteOrganization,
  acceptInvitation,
  getOrgInvitations,
  revokeInvitation,
} from '../controllers/organizationController.js';
import { getOrgActivity } from '../controllers/activityController.js';
import { protect } from '../middlewares/protect.js';
import { checkRole } from '../middlewares/checkRole.js';
import validate from '../middlewares/validate.js';
import {
  createOrgValidator,
  inviteMemberValidator,
} from '../validators/orgValidators.js';

const router = express.Router();

// Accept invitation (must be public for email links)
router.post('/invite/accept', acceptInvitation);

router.use(protect);

/**
 * @swagger
 * /organizations:
 *   post:
 *     summary: Create a new organization
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Organization created successfully
 */
router.post('/', createOrgValidator, validate, createOrganization);
/**
 * @swagger
 * /organizations:
 *   get:
 *     summary: Get all organizations for current user
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of organizations
 */
router.get('/', getMyOrganizations);
router.get('/:id', getOrganizationById);
/**
 * @swagger
 * /organizations/{id}/invite:
 *   post:
 *     summary: Invite member to organization
 *     tags: [Organizations]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [admin, member]
 *     responses:
 *       200:
 *         description: Invitation sent
 */
router.post('/:id/invite', checkRole('admin', 'owner'), inviteMemberValidator, validate, inviteMember);
/**
 * @swagger
 * /organizations/{id}/members:
 *   patch:
 *     summary: Change member role
 *     tags: [Organizations]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [admin, member]
 *     responses:
 *       200:
 *         description: Role changed
 */
router.patch('/:id/members', checkRole('admin', 'owner'), changeMemberRole);
router.delete('/:id/members/:userId', checkRole('admin', 'owner'), removeMember);
router.delete('/:id', checkRole('owner'), deleteOrganization);
router.get('/:id/members', getOrganizationMembers);
router.get('/:id/invitations', getOrgInvitations);
router.delete(
  '/:id/invitations/:invitationId',
  revokeInvitation
);
router.get('/:id/activity', getOrgActivity);

export default router;
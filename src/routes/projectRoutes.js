import express from 'express';
import {
  createProject,
  getProjectsByOrg,
  getProjectById,
  updateProject,
  addProjectMember,
  removeProjectMember,
  deleteProject,
  getProjectMembers,
  getProjectStats,
} from '../controllers/projectController.js';
import { protect } from '../middlewares/protect.js';

const router = express.Router({ mergeParams: true });

router.use(protect);

router.post('/', createProject);
router.get('/', getProjectsByOrg);
router.get('/batch/stats', getProjectStats); // Reuse controller logic but handle all projects
router.get('/:id', getProjectById);
router.patch('/:id', updateProject);
router.post('/:id/members', addProjectMember);
router.delete('/:id/members/:userId', removeProjectMember);
router.delete('/:id', deleteProject);
router.get('/:id/members', getProjectMembers);
router.get('/:id/stats', getProjectStats);

export default router;
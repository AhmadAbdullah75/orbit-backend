import express from 'express';
import {
  createTask,
  getTasksByColumn,
  getTaskById,
  updateTask,
  moveTask,
  assignTask,
  unassignTask,
  deleteTask,
  addComment,
  getComments,
  updateComment,
  deleteComment,
  getTasksByBoard,
  searchTasks,
  addSubtask,
  toggleSubtask,
  deleteSubtask,
} from '../controllers/taskController.js';
import { protect } from '../middlewares/protect.js';
import validate from '../middlewares/validate.js';
import {
  createTaskValidator,
  updateTaskValidator,
  commentValidator,
} from '../validators/taskValidators.js';

const columnTaskRouter = express.Router({ mergeParams: true });
const taskRouter = express.Router();

columnTaskRouter.use(protect);
taskRouter.use(protect);

columnTaskRouter.post('/', createTaskValidator, validate, createTask);
columnTaskRouter.get('/', getTasksByColumn);

/**
 * @swagger
 * /tasks:
 *   get:
 *     summary: Get all tasks for a board
 *     tags: [Tasks]
 *     parameters:
 *       - in: query
 *         name: boardId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of tasks
 */
taskRouter.get('/search', searchTasks);
taskRouter.get('/', getTasksByBoard);
/**
 * @swagger
 * /tasks/{id}:
 *   patch:
 *     summary: Update a task
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               priority:
 *                 type: string
 *                 enum:
 *                   [urgent, high, medium, low]
 *               dueDate:
 *                 type: string
 *                 format: date
 *     responses:
 *       200:
 *         description: Task updated
 *   delete:
 *     summary: Delete a task
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Task deleted
 */
taskRouter.get('/:id', getTaskById);
taskRouter.patch('/:id', updateTaskValidator, validate, updateTask);
taskRouter.patch('/:id/move', moveTask);
taskRouter.post('/:id/assign', assignTask);
taskRouter.delete('/:id/assign/:assigneeId', unassignTask);
taskRouter.delete('/:id', deleteTask);

/**
 * @swagger
 * /tasks/{id}/comments:
 *   get:
 *     summary: Get comments for a task
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of comments
 *   post:
 *     summary: Add comment to a task
 *     tags: [Tasks]
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
 *               content:
 *                 type: string
 *     responses:
 *       201:
 *         description: Comment added
 */
taskRouter.post('/:id/comments', commentValidator, validate, addComment);
taskRouter.get('/:id/comments', getComments);
taskRouter.patch('/:id/comments/:commentId', updateComment);
taskRouter.delete('/:id/comments/:commentId', deleteComment);

// Subtasks
taskRouter.post('/:id/subtasks', addSubtask);
taskRouter.patch('/:id/subtasks/:subtaskId', toggleSubtask);
taskRouter.delete('/:id/subtasks/:subtaskId', deleteSubtask);

export { columnTaskRouter, taskRouter };
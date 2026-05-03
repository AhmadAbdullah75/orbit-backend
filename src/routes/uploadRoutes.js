import express from 'express';
import { uploadFile, attachFileToTask, removeAttachment } from '../controllers/uploadController.js';
import { protect } from '../middlewares/protect.js';
import upload from '../middlewares/upload.js';

const router = express.Router();

router.use(protect);

/**
 * @swagger
 * /upload:
 *   post:
 *     summary: Upload a file to local storage
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: File uploaded successfully, returns URL
 *       400:
 *         description: No file uploaded or invalid file type
 */
router.post('/', upload.single('file'), uploadFile);

/**
 * @swagger
 * /upload/task/{taskId}/attach:
 *   post:
 *     summary: Attach uploaded file metadata to a task
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [url]
 *             properties:
 *               url:
 *                 type: string
 *               name:
 *                 type: string
 *               size:
 *                 type: number
 *     responses:
 *       200:
 *         description: File attached to task successfully
 */
router.post('/task/:taskId/attach', attachFileToTask);

/**
 * @swagger
 * /upload/task/{taskId}/attachments/{attachmentId}:
 *   delete:
 *     summary: Remove a file attachment from a task
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *       - in: path
 *         name: attachmentId
 *         required: true
 *     responses:
 *       200:
 *         description: Attachment removed
 */
router.delete('/task/:taskId/attachments/:attachmentId', removeAttachment);

export default router;

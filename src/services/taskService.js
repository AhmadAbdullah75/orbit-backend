import Task from '../models/Task.js';
import Comment from '../models/Comment.js';
import Column from '../models/Column.js';
import Board from '../models/Board.js';
import AppError from '../utils/AppError.js';
import logActivity from '../utils/logActivity.js';
import Activity from '../models/Activity.js';
import Project from '../models/Project.js';
import { 
  emitTaskMoved, 
  emitTaskCreated,
  emitTaskUpdated,
  emitTaskDeleted
} from '../socket/socketHandler.js';
import createNotification from '../utils/createNotification.js';
import User from '../models/User.js';

const logTaskActivity = async ({
  userId, orgId, projectId, boardId,
  taskId, action, metadata = {}
}) => {
  try {
    let effectiveOrgId = orgId;
    if (!effectiveOrgId && projectId) {
      const proj = await Project.findById(projectId);
      effectiveOrgId = proj?.organization;
    }
    if (!effectiveOrgId) return;

    await Activity.create({
      user: userId,
      organization: effectiveOrgId,
      project: projectId || undefined,
      entity: 'task',
      entityId: taskId,
      action,
      metadata,
    });
  } catch (err) {
    console.error('Task activity log error:', err.message);
  }
};

export const createTask = async ({ title, description, priority, dueDate, labels }, columnId, boardId, projectId, orgId, userId) => {
  // Look up projectId and orgId from board if not provided
  if (!projectId || !orgId) {
    const board = await Board.findById(boardId);
    if (!board) throw new AppError('Board not found', 404);
    projectId = board.project;
    orgId = board.organization;
  }

  // Fix 5: Duplicate name check (Backend)
  const existingTask = await Task.findOne({
    board: boardId,
    title: { $regex: new RegExp(`^${title.trim()}$`, 'i') }
  })
  if (existingTask) {
    throw new AppError('A task with this title already exists on this board', 400)
  }

  const lastTask = await Task.findOne({ column: columnId }).sort({ order: -1 });
  const nextOrder = lastTask ? lastTask.order + 1 : 0;

  const task = await Task.create({
    title,
    description,
    column: columnId,
    board: boardId,
    project: projectId,
    organization: orgId,
    creator: userId,
    order: nextOrder,
    priority: priority || 'medium',
    status: 'todo',
    dueDate,
    labels: labels || [],
    activity: [{ user: userId, action: 'created this task' }],
  });

  const project = await Project.findById(projectId);

  await logTaskActivity({
    userId,
    orgId: task.organization,
    projectId: task.project,
    taskId: task._id,
    action: `created task ${task.title}`,
    metadata: {
      taskTitle: task.title,
      projectName: project?.name || '',
      priority: task.priority,
    },
  });

  emitTaskCreated(boardId, { task, columnId });

  return task;
};

export const getTasksByColumn = async (columnId, userId) => {
  const tasks = await Task.find({ column: columnId })
    .populate('assignees', 'name email')
    .populate('creator', 'name email')
    .sort({ order: 1 });
  return tasks;
};

export const getTaskById = async (taskId, userId) => {
  const task = await Task.findById(taskId)
    .populate('assignees', 'name email')
    .populate('creator', 'name email')
    .populate('activity.user', 'name');

  if (!task) throw new AppError('Task not found', 404);
  return task;
};

export const updateTask = async (taskId, updates, userId) => {
  const task = await Task.findById(taskId);
  if (!task) throw new AppError('Task not found', 404);

  const allowedUpdates = ['title', 'description', 'priority', 'dueDate', 'labels', 'status'];
  const activityLogs = [];

  allowedUpdates.forEach((field) => {
    if (updates[field] !== undefined && updates[field] !== task[field]) {
      let action = `updated ${field}`;
      if (field === 'priority' && updates[field] === 'high') action = `escalated priority`;
      if (field === 'description') action = `refined description`;
      if (field === 'dueDate') action = `adjusted deadline`;
      activityLogs.push({ user: userId, action });
      task[field] = updates[field];
    }
  });

  if (activityLogs.length > 0) {
    task.activity.push(...activityLogs);
    await logTaskActivity({
      userId,
      orgId: task.organization,
      projectId: task.project,
      taskId: task._id,
      action: `updated task ${task.title}`,
      metadata: {
        taskTitle: task.title,
        fields: activityLogs.map(l => l.action.replace('updated ', '')),
      },
    });
  }

  await task.save();
  emitTaskUpdated(task.board.toString(), { task });
  return task;
};

export const moveTask = async (taskId, { newColumnId, newOrder }, userId) => {
  const task = await Task.findById(taskId);
  if (!task) throw new AppError('Task not found', 404);

  const oldColumnId = task.column;

  const oldColumn = await Column.findById(task.column);
  const newColumn = await Column.findById(newColumnId);

  if (!newColumn) throw new AppError('Target column not found', 404);

  await Task.updateMany(
    { column: newColumnId, order: { $gte: newOrder } },
    { $inc: { order: 1 } }
  );

  const oldColName = oldColumn ? oldColumn.name : 'Unknown';
  const newColName = newColumn.name;

  task.column = newColumnId;
  task.order = newOrder;
  task.activity.push({ user: userId, action: `moved task from ${oldColName} to ${newColName}` });

  await task.save();

  await logTaskActivity({
    userId,
    orgId: task.organization,
    projectId: task.project,
    taskId: task._id,
    action: `moved task from ${oldColName.toLowerCase()} to ${newColName.toLowerCase()}`,
    metadata: {
      taskTitle: task.title,
      from: oldColName,
      to: newColName,
    },
  });
  emitTaskMoved(task.board.toString(), {
    taskId: task._id,
    newColumnId,
    newOrder,
    oldColumnId: oldColumn?._id
  });

  return task;
};

export const assignTask = async (taskId, assigneeId, userId) => {
  const task = await Task.findById(taskId);
  if (!task) throw new AppError('Task not found', 404);

  if (task.assignees.includes(assigneeId)) {
    throw new AppError('User is already assigned', 400);
  }

  task.assignees.push(assigneeId);
  task.activity.push({ user: userId, action: 'delegated task to a team member' });

  await logTaskActivity({
    userId,
    orgId: task.organization,
    projectId: task.project,
    taskId: task._id,
    action: `assigned task ${task.title}`,
    metadata: { taskTitle: task.title, assigneeId }
  });

  await task.save();

  // Notify assignee
  await createNotification({
    recipientId: assigneeId,
    senderId: userId,
    orgId: task.organization,
    type: 'task_assigned',
    message: `You were assigned to task: ${task.title}`,
    link: `/org/${task.organization}/projects/${task.project}/board`,
  });

  return task;
};

export const unassignTask = async (taskId, assigneeId, userId) => {
  const task = await Task.findById(taskId);
  if (!task) throw new AppError('Task not found', 404);

  task.assignees = task.assignees.filter((id) => id.toString() !== assigneeId.toString());
  task.activity.push({ user: userId, action: 'unassigned a member' });

  await task.save();
  return task;
};

export const deleteTask = async (taskId, userId) => {
  const task = await Task.findById(taskId);
  if (!task) throw new AppError('Task not found', 404);

  const taskToDelete = await Task.findById(taskId)
    .populate('project');
  if (taskToDelete) {
    await logTaskActivity({
      userId,
      orgId: taskToDelete.project?.organization,
      projectId: taskToDelete.project?._id,
      taskId,
      action: `deleted task ${taskToDelete.title}`,
      metadata: {
        taskTitle: taskToDelete.title,
        projectName: taskToDelete.project?.name || '',
      },
    });
  }

  await Task.findByIdAndDelete(taskId);
  await Comment.deleteMany({ task: taskId });

  emitTaskDeleted(task.board.toString(), {
    taskId,
    columnId: task.column,
    boardId: task.board
  });

  return { message: 'Task deleted successfully.' };
};

export const addComment = async (taskId, content, userId) => {
  const task = await Task.findById(taskId);
  if (!task) throw new AppError('Task not found', 404);

  const comment = await Comment.create({
    content,
    task: taskId,
    author: userId,
  });

  task.activity.push({ user: userId, action: 'added a comment' });
  await task.save();

  await logTaskActivity({
    userId,
    orgId: task.organization,
    projectId: task.project,
    taskId: task._id,
    action: `commented on task ${task.title}`,
    metadata: {
      taskTitle: task.title,
      comment: content?.substring(0, 80),
    },
  });

  // Notify creator and assignees
  const recipients = new Set([task.creator.toString(), ...task.assignees.map(a => a.toString())]);
  recipients.delete(userId.toString()); // Don't notify self

  for (const recipientId of recipients) {
    await createNotification({
      recipientId,
      senderId: userId,
      orgId: task.organization,
      type: 'task_commented',
      message: `New comment on task: ${task.title}`,
      link: `/org/${task.organization}/projects/${task.project}/board`,
    });
  }

  return await Comment.findById(comment._id).populate('author', 'name email');
};

export const getComments = async (taskId) => {
  const comments = await Comment.find({ task: taskId })
    .sort({ createdAt: 1 })
    .populate('author', 'name email');
  return comments;
};

export const updateComment = async (commentId, content, userId) => {
  const comment = await Comment.findById(commentId);
  if (!comment) throw new AppError('Comment not found', 404);

  if (comment.author.toString() !== userId.toString()) {
    throw new AppError('Only the author can edit this comment', 403);
  }

  comment.content = content;
  comment.isEdited = true;
  await comment.save();

  return comment;
};

export const deleteComment = async (commentId, userId) => {
  const comment = await Comment.findById(commentId);
  if (!comment) throw new AppError('Comment not found', 404);

  if (comment.author.toString() !== userId.toString()) {
    throw new AppError('Only the author can delete this comment', 403);
  }

  await Comment.findByIdAndDelete(commentId);
  return { message: 'Comment deleted successfully.' };
};
export const getTasksByBoard = async (boardId, userId) => {
  const tasks = await Task.find({ board: boardId })
    .populate({
      path: 'assignees',
      select: 'name email avatar',
    })
    .populate('column', 'name')
    .sort({ order: 1, createdAt: 1 });
  return tasks;
};

export const searchTasks = async ({ q, assignee, priority, boardId }, userId) => {
  const query = {};

  if (q) query.$text = { $search: q };
  if (assignee) query.assignees = assignee;
  if (priority) query.priority = priority;
  if (boardId) query.board = boardId;

  const tasks = await Task.find(query)
    .populate('assignees', 'name email')
    .populate('creator', 'name email')
    .sort({ createdAt: -1 });

  return tasks;
};
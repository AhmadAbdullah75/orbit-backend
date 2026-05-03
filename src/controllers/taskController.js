import catchAsync from '../utils/catchAsync.js';
import * as taskService from '../services/taskService.js';
import Task from '../models/Task.js';
import AppError from '../utils/AppError.js';

export const createTask = catchAsync(async (req, res, next) => {
  const { title, description, priority, dueDate, labels } = req.body;
  const { columnId, boardId, projectId, orgId } = req.params;
  const task = await taskService.createTask(
    { title, description, priority, dueDate, labels },
    columnId,
    boardId,
    projectId,
    orgId,
    req.user._id
  );
  res.status(201).json({ status: 'success', data: { task } });
});

export const getTasksByColumn = catchAsync(async (req, res, next) => {
  const tasks = await taskService.getTasksByColumn(req.params.columnId, req.user._id);
  res.status(200).json({
    status: 'success',
    count: tasks.length,
    data: { tasks },
  });
});

export const getTaskById = catchAsync(async (req, res, next) => {
  const task = await taskService.getTaskById(req.params.id, req.user._id);
  res.status(200).json({ status: 'success', data: { task } });
});

export const updateTask = catchAsync(async (req, res, next) => {
  const task = await taskService.updateTask(req.params.id, req.body, req.user._id);
  res.status(200).json({ status: 'success', data: { task } });
});

export const moveTask = catchAsync(async (req, res, next) => {
  const { newColumnId, newOrder } = req.body;
  const task = await taskService.moveTask(req.params.id, { newColumnId, newOrder }, req.user._id);
  res.status(200).json({ status: 'success', data: { task } });
});

export const assignTask = catchAsync(async (req, res, next) => {
  const { assigneeId } = req.body;
  const task = await taskService.assignTask(req.params.id, assigneeId, req.user._id);
  res.status(200).json({ status: 'success', data: { task } });
});

export const unassignTask = catchAsync(async (req, res, next) => {
  const { assigneeId } = req.params;
  const task = await taskService.unassignTask(req.params.id, assigneeId, req.user._id);
  res.status(200).json({ status: 'success', data: { task } });
});

export const deleteTask = catchAsync(async (req, res, next) => {
  const result = await taskService.deleteTask(req.params.id, req.user._id);
  res.status(200).json({ status: 'success', ...result });
});

export const addComment = catchAsync(async (req, res, next) => {
  const { content } = req.body;
  const comment = await taskService.addComment(req.params.id, content, req.user._id);
  res.status(201).json({ status: 'success', data: { comment } });
});

export const getComments = catchAsync(async (req, res, next) => {
  const comments = await taskService.getComments(req.params.id);
  res.status(200).json({
    status: 'success',
    count: comments.length,
    data: { comments },
  });
});

export const updateComment = catchAsync(async (req, res, next) => {
  const { content } = req.body;
  const comment = await taskService.updateComment(req.params.commentId, content, req.user._id);
  res.status(200).json({ status: 'success', data: { comment } });
});

export const deleteComment = catchAsync(async (req, res, next) => {
  const result = await taskService.deleteComment(req.params.commentId, req.user._id);
  res.status(200).json({ status: 'success', ...result });
});
export const getTasksByBoard = catchAsync(async (req, res, next) => {
  const { boardId } = req.query;
  const tasks = await taskService.getTasksByBoard(boardId, req.user._id);
  res.status(200).json({
    status: 'success',
    count: tasks.length,
    data: { tasks },
  });
});

export const searchTasks = catchAsync(async (req, res, next) => {
  const { q, assignee, priority, boardId } = req.query;
  const tasks = await taskService.searchTasks(
    { q, assignee, priority, boardId },
    req.user._id
  );
  res.status(200).json({
    status: 'success',
    count: tasks.length,
    data: { tasks },
  });
});

export const addSubtask = catchAsync(
  async (req, res, next) => {
    const {
      title, assignee, startDate,
      dueDate, priority
    } = req.body

    if (!title?.trim()) {
      return next(
        new AppError('Subtask title is required', 400)
      )
    }

    // Validate dates within parent task deadline
    const parentTask = await Task.findById(
      req.params.id
    )
    if (!parentTask) {
      return next(new AppError('Task not found', 404))
    }

    if (dueDate && parentTask.dueDate) {
      if (new Date(dueDate) >
          new Date(parentTask.dueDate)) {
        return next(new AppError(
          'Subtask due date cannot exceed ' +
          'parent task due date', 400
        ))
      }
    }

    if (startDate && dueDate) {
      if (new Date(startDate) > new Date(dueDate)) {
        return next(new AppError(
          'Start date must be before due date', 400
        ))
      }
    }

    const task = await Task.findByIdAndUpdate(
      req.params.id,
      {
        $push: {
          subtasks: {
            title: title.trim(),
            assignee: assignee || null,
            startDate: startDate || null,
            dueDate: dueDate || null,
            priority: priority || 'medium',
            completed: false,
          }
        }
      },
      { new: true }
    ).populate('assignees', 'name email avatar')
     .populate('subtasks.assignee', 'name avatar')

    res.status(201).json({
      status: 'success',
      data: { task }
    })
  }
)

export const toggleSubtask = catchAsync(
  async (req, res, next) => {
    const task = await Task.findById(req.params.id)
    if (!task) return next(
      new AppError('Task not found', 404)
    )
    const sub = task.subtasks.id(req.params.subtaskId)
    if (!sub) return next(
      new AppError('Subtask not found', 404)
    )
    sub.completed = !sub.completed
    await task.save()
    res.status(200).json({
      status: 'success',
      data: { task }
    })
  }
)

export const deleteSubtask = catchAsync(
  async (req, res, next) => {
    const task = await Task.findByIdAndUpdate(
      req.params.id,
      {
        $pull: {
          subtasks: { _id: req.params.subtaskId }
        }
      },
      { new: true }
    )
    if (!task) return next(
      new AppError('Task not found', 404)
    )
    res.status(200).json({
      status: 'success',
      data: { task }
    })
  }
)
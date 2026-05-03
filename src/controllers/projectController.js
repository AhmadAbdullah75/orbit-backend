import catchAsync from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';
import Project from '../models/Project.js';
import Organization from '../models/Organization.js';
import Board from '../models/Board.js';
import Column from '../models/Column.js';
import Task from '../models/Task.js';
import Membership from '../models/Membership.js';
import * as projectService from '../services/projectService.js';

export const createProject = catchAsync(async (req, res, next) => {
  const { name, description, visibility, color, members } = req.body;
  const result = await projectService.createProject(
    { name, description, visibility, color, members },
    req.params.orgId,
    req.user._id
  );
  res.status(201).json({ status: 'success', data: result });
});

export const getProjectsByOrg = async (req, res, next) => {
  try {
    const projects = await projectService.getProjectsByOrg(
      req.params.orgId,
      req.user._id
    );
    res.status(200).json({
      status: 'success',
      count: projects.length,
      data: { projects },
    });
  } catch (err) {
    console.error('=== getProjectsByOrg ERROR ===');
    console.error('Message:', err.message);
    console.error('Stack:', err.stack);
    console.error('==============================');
    res.status(500).json({
      status: 'error',
      message: err.message,
    });
  }
};

export const getProjectById = catchAsync(async (req, res, next) => {
  const project = await projectService.getProjectById(
    req.params.id,
    req.user._id
  );
  res.status(200).json({ status: 'success', data: { project } });
});

export const updateProject = catchAsync(async (req, res, next) => {
  const project = await projectService.updateProject(
    req.params.id,
    req.body,
    req.user._id
  );
  res.status(200).json({ status: 'success', data: { project } });
});

export const addProjectMember = catchAsync(async (req, res, next) => {
  const { email } = req.body;
  const result = await projectService.addProjectMember(
    req.params.id,
    email,
    req.user._id
  );
  res.status(200).json({ status: 'success', ...result });
});

export const removeProjectMember = catchAsync(async (req, res, next) => {
  const result = await projectService.removeProjectMember(
    req.params.id,
    req.params.userId,
    req.user._id
  );
  res.status(200).json({ status: 'success', ...result });
});

export const deleteProject = catchAsync(async (req, res, next) => {
  const result = await projectService.deleteProject(
    req.params.id,
    req.user._id
  );
  res.status(200).json({ status: 'success', ...result });
});

export const getProjectMembers = catchAsync(async (req, res, next) => {
  const project = await Project.findById(req.params.id).populate(
    'members',
    'name email avatar'
  );

  if (!project) {
    return next(new AppError('Project not found', 404));
  }

  const membership = await Membership.findOne({
    user: req.user._id,
    organization: project.organization,
  });
  if (!membership) {
    return next(new AppError('Access denied', 403));
  }

  // Ensure owner is included in the list for task assignment
  const org = await Organization.findById(project.organization).populate(
    'owner',
    'name email avatar'
  );

  let allMembers = [...project.members];
  const owner = org?.owner;

  if (owner) {
    const isOwnerInList = allMembers.some(
      (m) => m._id.toString() === owner._id.toString()
    );
    if (!isOwnerInList) {
      allMembers.unshift(owner);
    }
  }

  res.status(200).json({
    status: 'success',
    count: allMembers.length,
    data: { members: allMembers },
  });
});

export const getProjectStats = catchAsync(
  async (req, res, next) => {
    const { id, orgId } = req.params;

    try {
      // BATCH CASE: If no project id, fetch for ALL projects in org
      if (!id && orgId) {
        const projects = await Project.find({ organization: orgId });
        const statsMap = {};

        await Promise.all(
          projects.map(async (p) => {
            const board = await Board.findOne({ project: p._id });
            if (!board) {
              statsMap[p._id] = { total: 0, done: 0, active: 0, productivity: 0 };
              return;
            }

            const allTasks = await Task.find({ board: board._id });
            const doneColumn = await Column.findOne({
              board: board._id,
              name: { $regex: /^done$/i },
            });

            const doneCount = doneColumn
              ? allTasks.filter(t => t.column?.toString() === doneColumn._id.toString()).length
              : 0;

            statsMap[p._id] = {
              total: allTasks.length,
              done: doneCount,
              active: allTasks.length - doneCount,
              productivity: allTasks.length > 0 ? Math.round((doneCount / allTasks.length) * 100) : 0,
            };
          })
        );

        return res.status(200).json({
          status: 'success',
          data: statsMap,
        });
      }

      // SINGLE CASE: If project id exists
      const board = await Board.findOne({
        project: id
      });

      if (!board) {
        return res.status(200).json({
          status: 'success',
          data: { total: 0, done: 0,
                  active: 0, productivity: 0 }
        });
      }

      // Get ALL tasks for this board
      const allTasks = await Task.find({
        board: board._id
      });
      const total = allTasks.length;

      // Find done column specifically
      const doneColumn = await Column.findOne({
        board: board._id,
        name: { $regex: /^done$/i }
      });

      const doneTaskIds = doneColumn
        ? allTasks.filter(t =>
            t.column?.toString() ===
            doneColumn._id.toString()
          ).length
        : 0;

      const active = total - doneTaskIds;
      const productivity = total > 0
        ? Math.round((doneTaskIds / total) * 100)
        : 0;

      res.status(200).json({
        status: 'success',
        data: {
          total,
          done: doneTaskIds,
          active,
          productivity
        }
      });
    } catch (err) {
      console.error('getProjectStats error:', err);
      res.status(200).json({
        status: 'success',
        data: id ? { total: 0, done: 0, active: 0, productivity: 0 } : {}
      });
    }
  }
);
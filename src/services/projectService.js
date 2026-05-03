import Project from '../models/Project.js';
import Board from '../models/Board.js';
import Column from '../models/Column.js';
import Membership from '../models/Membership.js';
import AppError from '../utils/AppError.js';
import logActivity from '../utils/logActivity.js';
import createNotification from '../utils/createNotification.js';
import User from '../models/User.js';

const DEFAULT_COLUMNS = [
  { name: 'To Do', order: 0, color: '#e2e8f0', isDefault: true },
  { name: 'In Progress', order: 1, color: '#bfdbfe', isDefault: true },
  { name: 'Review', order: 2, color: '#fde68a', isDefault: true },
  { name: 'Done', order: 3, color: '#bbf7d0', isDefault: true },
];

export const createProject = async ({ name, description, visibility, color, members: initialMembers }, orgId, userId) => {
  
  
const membership = await Membership.findOne(
  { user: userId, organization: orgId });
  
  if (!membership) throw new AppError('You are not a member of this organization', 403);

  const project = await Project.create({
    name,
    description,
    organization: orgId,
    owner: userId,
    members: initialMembers && initialMembers.length > 0
      ? Array.from(new Set([userId, ...initialMembers]))
      : [userId],
    visibility: visibility || 'public',
    color: color || '#6366f1',
  });

  const board = await Board.create({
    name: 'Main Board',
    project: project._id,
    organization: orgId,
  });

  const columnDocs = DEFAULT_COLUMNS.map((col) => ({
    ...col,
    board: board._id,
  }));
  await Column.insertMany(columnDocs);

  await logActivity({
    userId,
    orgId,
    projectId: project._id,
    entity: 'project',
    entityId: project._id,
    action: `created project ${project.name}`,
    metadata: { projectName: project.name },
  });

  // Auto-add creator as project member
  if (!project.members.includes(userId)) {
    await Project.findByIdAndUpdate(
      project._id,
      { $addToSet: { members: userId } }
    );
  }

  return { project, board };
};

export const getProjectsByOrg = async (orgId, userId) => {
  const membership = await Membership.findOne({
    user: userId,
    organization: orgId,
  });
  if (!membership) {
    throw new AppError(
      'You are not a member of this organization', 403
    );
  }

  const projects = await Project.find({
    organization: orgId,
  })
    .populate('owner', 'name email avatar')
    .sort({ createdAt: -1 });

  return projects;
};

export const getProjectById = async (projectId, userId) => {
  const project = await Project.findById(projectId)
    .populate('owner', 'name email')
    .populate('members', 'name email');

  if (!project) throw new AppError('Project not found', 404);

  const membership = await Membership.findOne({
    user: userId,
    organization: project.organization,
  });
  if (!membership) throw new AppError('You do not have access to this project', 403);

  const board = await Board.findOne({ project: projectId });
  const columns = await Column.find({ board: board._id }).sort({ order: 1 });

  return { ...project.toObject(), board: { ...board.toObject(), columns } };
};

export const updateProject = async (projectId, updates, userId) => {
  const project = await Project.findById(projectId);
  if (!project) throw new AppError('Project not found', 404);

  const membership = await Membership.findOne({
    user: userId,
    organization: project.organization,
  });
  if (!membership) throw new AppError('You do not have access', 403);

  const allowedUpdates = ['name', 'description', 'visibility', 'color'];
  allowedUpdates.forEach((field) => {
    if (updates[field] !== undefined) project[field] = updates[field];
  });

  await project.save();

  await logActivity({
    userId,
    orgId: project.organization,
    projectId: project._id,
    entity: 'project',
    entityId: project._id,
    action: `updated project ${project.name}`,
    metadata: { updates: Object.keys(updates) },
  });

  return project;
};

export const addProjectMember = async (projectId, memberEmail, userId) => {
  const project = await Project.findById(projectId);
  if (!project) throw new AppError('Project not found', 404);

  const userToAdd = await User.findOne({ email: memberEmail });
  if (!userToAdd) throw new AppError('User not found', 404);

  const orgMembership = await Membership.findOne({
    user: userToAdd._id,
    organization: project.organization,
  });
  if (!orgMembership) throw new AppError('User is not a member of the organization', 400);

  if (project.members.includes(userToAdd._id)) {
    throw new AppError('User is already a project member', 400);
  }

  project.members.push(userToAdd._id);
  await project.save();

  await logActivity({
    userId,
    orgId: project.organization,
    projectId: project._id,
    entity: 'member',
    entityId: userToAdd._id,
    action: `added ${userToAdd.name} to project ${project.name}`,
    metadata: { memberEmail, projectName: project.name }
  });

  // Notify member
  await createNotification({
    recipientId: userToAdd._id,
    senderId: userId,
    orgId: project.organization,
    type: 'project_added',
    message: `You were added to project: ${project.name}`,
    link: `/org/${project.organization}/projects/${projectId}/board`,
  });

  return { message: 'Member added to project successfully.' };
};

export const removeProjectMember = async (projectId, memberId, userId) => {
  const project = await Project.findById(projectId);
  if (!project) throw new AppError('Project not found', 404);

  if (project.owner.toString() === memberId) {
    throw new AppError('Cannot remove the project owner', 400);
  }

  project.members = project.members.filter(
    (m) => m.toString() !== memberId
  );
  await project.save();

  return { message: 'Member removed from project successfully.' };
};

export const deleteProject = async (projectId, userId) => {
  const project = await Project.findById(projectId);
  if (!project) throw new AppError('Project not found', 404);

  if (project.owner.toString() !== userId.toString()) {
    throw new AppError('Only the project owner can delete it', 403);
  }

  await logActivity({
    userId,
    orgId: project.organization,
    entity: 'project',
    entityId: project._id,
    action: `deleted project ${project.name}`,
    metadata: { projectName: project.name },
  });

  const board = await Board.findOne({ project: projectId });
  if (board) {
    await Column.deleteMany({ board: board._id });
    await Board.findByIdAndDelete(board._id);
  }

  await Project.findByIdAndDelete(projectId);
  return { message: 'Project deleted successfully.' };
};
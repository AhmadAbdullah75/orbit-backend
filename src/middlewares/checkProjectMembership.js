import Project from '../models/Project.js';
import Membership from '../models/Membership.js';
import AppError from '../utils/AppError.js';

export const checkProjectMembership = async (req, res, next) => {
  try {
    const projectId = req.params.id || req.params.projectId;
    const userId = req.user._id;

    const project = await Project.findById(projectId);
    if (!project) return next(new AppError('Project not found', 404));

    // Check org membership
    const orgMembership = await Membership.findOne({
      user: userId,
      organization: project.organization,
    });
    if (!orgMembership) {
      return next(new AppError('You are not a member of this organization', 403));
    }

    // Check project membership
    const isProjectMember = project.members.some(
      (m) => m.toString() === userId.toString()
    );

    // Org owners and admins can access all projects
    const isOrgAdmin = ['owner', 'admin'].includes(orgMembership.role);

    if (!isProjectMember && !isOrgAdmin) {
      return next(new AppError('You are not a member of this project', 403));
    }

    req.project = project;
    req.orgMembership = orgMembership;
    next();
  } catch (error) {
    next(error);
  }
};
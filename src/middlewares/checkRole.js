import Membership from '../models/Membership.js';
import AppError from '../utils/AppError.js';

const ROLE_HIERARCHY = {
  owner: 4,
  admin: 3,
  manager: 2,
  developer: 1,
};

export const checkRole = (...allowedRoles) => {
  return async (req, res, next) => {
    try {
      const orgId = req.params.id;
      const userId = req.user._id;

      const membership = await Membership.findOne({
        user: userId,
        organization: orgId,
      });

      if (!membership) {
        return next(
          new AppError('You are not a member of this organization', 403)
        );
      }

      const userRoleLevel = ROLE_HIERARCHY[membership.role];
      const hasPermission = allowedRoles.some(
        (role) => userRoleLevel >= ROLE_HIERARCHY[role]
      );

      if (!hasPermission) {
        return next(
          new AppError('You do not have permission to perform this action', 403)
        );
      }

      req.membership = membership;
      next();
    } catch (error) {
      next(error);
    }
  };
};
import Activity from '../models/Activity.js';

const logActivity = async ({
  userId,
  orgId,
  projectId,
  entity,
  entityId,
  action,
  metadata = {},
}) => {
  try {
    await Activity.create({
      user: userId,
      organization: orgId,
      project: projectId,
      entity,
      entityId,
      action,
      metadata,
    });
  } catch (err) {
    console.error('Activity log error:', err.message);
  }
};

export default logActivity;
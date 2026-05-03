import catchAsync from '../utils/catchAsync.js';
import Activity from '../models/Activity.js';

export const getProjectActivity = catchAsync(
  async (req, res, next) => {
    const { id: projectId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const activities = await Activity
      .find({ project: projectId })
      .populate('user', 'name email avatar')
      .sort({ createdAt: -1 })
      .skip(skip).limit(limit);
    const total = await Activity.countDocuments(
      { project: projectId }
    );
    res.status(200).json({
      status: 'success',
      data: { activities,
        pagination: { page, limit, total,
          pages: Math.ceil(total / limit) } },
    });
  }
);

export const getOrgActivity = catchAsync(
  async (req, res, next) => {
    const orgId = req.params.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const entity = req.query.entity;
    const action = req.query.action;

    const query = { organization: orgId };

    if (entity && entity !== 'all') {
      query.entity = entity;
    }
    if (action && action.trim()) {
      query.action = {
        $regex: action.trim(),
        $options: 'i'
      };
    }

    const activities = await Activity
      .find(query)
      .populate('user', 'name email avatar')
      .populate('project', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Activity.countDocuments(query);

    res.status(200).json({
      status: 'success',
      data: {
        activities,
        pagination: {
          page, limit, total,
          pages: Math.ceil(total / limit)
        }
      },
    });
  }
);
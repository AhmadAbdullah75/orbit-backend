import catchAsync from '../utils/catchAsync.js';
import * as orgService from '../services/organizationService.js';
import Membership from '../models/Membership.js';
import User from '../models/User.js';
import Organization from '../models/Organization.js';
import Invitation from '../models/Invitation.js';
import Activity from '../models/Activity.js';
import AppError from '../utils/AppError.js';

export const createOrganization = catchAsync(async (req, res, next) => {
  const { name, description } = req.body;
  const org = await orgService.createOrganization(
    { name, description },
    req.user._id
  );
  res.status(201).json({ status: 'success', data: { organization: org } });
});

export const getMyOrganizations = catchAsync(async (req, res, next) => {
  const orgs = await orgService.getMyOrganizations(req.user._id);
  res.status(200).json({
    status: 'success',
    count: orgs.length,
    data: { organizations: orgs },
  });
});

export const getOrganizationById = catchAsync(async (req, res, next) => {
  const org = await orgService.getOrganizationById(
    req.params.id,
    req.user._id
  );
  res.status(200).json({ status: 'success', data: { organization: org } });
});

export const inviteMember = catchAsync(async (req, res, next) => {
  const { email, role } = req.body;
  const result = await orgService.inviteMember(
    req.params.id,
    email,
    role,
    req.user._id
  );
  res.status(200).json({ status: 'success', ...result });
});

export const changeMemberRole = catchAsync(async (req, res, next) => {
  const { userId, role } = req.body;

  // Prevent assigning owner role
  if (role === 'owner') {
    return next(new AppError('Cannot assign owner role', 400));
  }

  const result = await orgService.changeMemberRole(
    { userId, role },
    req.params.id
  );
  res.status(200).json({ status: 'success', ...result });
});

export const removeMember = catchAsync(async (req, res, next) => {
  const result = await orgService.removeMember(
    req.params.userId,
    req.params.id
  );
  res.status(200).json({ status: 'success', ...result });
});

export const deleteOrganization = catchAsync(async (req, res, next) => {
  const result = await orgService.deleteOrganization(
    req.params.id,
    req.user._id
  );
  res.status(200).json({ status: 'success', ...result });
});

export const getOrganizationMembers = catchAsync(async (req, res, next) => {
  const orgId = req.params.id;
  const userId = req.user._id;

  const userMembership = await Membership.findOne({
    user: userId,
    organization: orgId,
  });

  if (!userMembership) {
    return next(new AppError('You are not a member of this organization', 403));
  }

  const members = await Membership.find({ organization: orgId })
    .populate('user', 'name email avatar isVerified createdAt')
    .populate('invitedBy', 'name email')
    .sort({ createdAt: 1 });

  res.status(200).json({
    status: 'success',
    count: members.length,
    data: { members },
  });
});

export const acceptInvitation = catchAsync(
  async (req, res, next) => {
    const { token } = req.body

    if (!token) {
      return next(new AppError('Token required', 400))
    }

    const invitation = await Invitation.findOne({
      token: token,        // plain comparison
      status: 'pending',
      expiresAt: { $gt: Date.now() },
    })

    if (!invitation) {
      // Debug: check if token exists at all
      const anyInvite = await Invitation.findOne({
        token: token
      })
      console.log('[DEBUG] Token lookup result:',
        anyInvite ? `Found but status=${anyInvite.status}` : 'Not found at all'
      )
      return next(
        new AppError(
          'Invitation is invalid or has expired.',
          400
        )
      )
    }

    // Find or create user
    let user = await User.findOne(
      { email: invitation.email }
    )

    if (!user) {
      // New user — need registration info
      // Frontend will redirect to register page
      return res.status(200).json({
        status: 'needs_registration',
        data: {
          email: invitation.email,
          role: invitation.role,
          orgName: (
            await Organization.findById(
              invitation.organization
            ).select('name')
          )?.name,
          token,
        }
      })
    }

    // Existing user — add to org as member
    await Membership.create({
      user: user._id,
      organization: invitation.organization,
      role: invitation.role,
      joinedAt: new Date(),
    })

    // Mark invitation accepted
    invitation.status = 'accepted'
    await invitation.save()



    res.status(200).json({
      status: 'success',
      message: 'Successfully joined organization!',
      data: { orgId: invitation.organization }
    })
  }
)

export const getOrgInvitations = catchAsync(async (req, res, next) => {
  const invitations = await orgService.getOrgInvitations(
    req.params.id, req.user._id
  );
  res.status(200).json({
    status: 'success',
    count: invitations.length,
    data: { invitations },
  });
});

export const revokeInvitation = catchAsync(
  async (req, res, next) => {
    const result = await orgService.revokeInvitation(
      req.params.invitationId,
      req.user._id,
      req.params.id
    );
    res.status(200).json({ status: 'success', ...result });
  }
);
import Organization from '../models/Organization.js';
import Membership from '../models/Membership.js';
import User from '../models/User.js';
import Invitation from '../models/Invitation.js';
import AppError from '../utils/AppError.js';
import sendEmail, {
  sendInvitationEmail
} from '../utils/sendEmail.js';
import logActivity from '../utils/logActivity.js';
import createNotification from '../utils/createNotification.js';
import crypto from 'crypto';

export const createOrganization = async ({ name, description }, userId) => {
  const org = await Organization.create({
    name,
    description,
    owner: userId,
  });

  await Membership.create({
    user: userId,
    organization: org._id,
    role: 'owner',
  });

  await logActivity({
    userId,
    orgId: org._id,
    entity: 'member',
    entityId: userId,
    action: 'created organization',
    metadata: { orgName: org.name },
  });

  await User.findByIdAndUpdate(
    userId,
    { organization: org._id },
    { new: true }
  );

  return org;
};

export const getMyOrganizations = async (userId) => {
  const memberships = await Membership.find({ user: userId })
    .populate('organization')
    .sort({ createdAt: -1 });

  return memberships.map((m) => ({
    ...m.organization.toObject(),
    role: m.role,
  }));
};

export const getOrganizationById = async (orgId, userId) => {
  const org = await Organization.findById(orgId).populate('owner', 'name email');
  if (!org) throw new AppError('Organization not found', 404);

  const membership = await Membership.findOne({
    user: userId,
    organization: orgId,
  });
  if (!membership) throw new AppError('You are not a member of this organization', 403);

  const members = await Membership.find({ organization: orgId })
    .populate('user', 'name email')
    .populate('invitedBy', 'name email');

  return { ...org.toObject(), members, userRole: membership.role };
};

export const inviteMember = async (
  orgId, email, role, inviterId
) => {
  // Check org exists
  const org = await Organization.findById(orgId)
  if (!org) throw new AppError('Org not found', 404)

  const normalizedEmail = email.toLowerCase().trim()
  const allowedRoles = ['admin', 'member']
  const assignedRole =
    allowedRoles.includes(role) ? role : 'member'

  // Check if already an active member
  const existingUser = await User.findOne(
    { email: normalizedEmail }
  )
  if (existingUser) {
    const alreadyMember = await Membership.findOne({
      organization: orgId,
      user: existingUser._id,
    })
    if (alreadyMember) {
      throw new AppError(
        'This person is already a member.', 400
      )
    }
  }

  // Check for pending invitation
  const existingInvite = await Invitation.findOne({
    organization: orgId,
    email: normalizedEmail,
    status: 'pending',
  })
  if (existingInvite) {
    throw new AppError(
      'An invitation is already pending for this email.',
      400
    )
  }

  // Fetch inviter name
  const inviter = await User.findById(inviterId)
    .select('name')

  // Generate plain token — store as-is
  const token = crypto.randomBytes(32)
    .toString('hex')

  await Invitation.create({
    organization: orgId,
    email: normalizedEmail,
    role: assignedRole,
    token: token,  // store PLAIN text
    invitedBy: inviterId,
    status: 'pending',
    expiresAt: new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000
    ),
  })

  // After Invitation.create(...)
  const invitedExistingUser = await User.findOne({
    email: normalizedEmail
  })

  if (invitedExistingUser) {
    try {
      await createNotification({
        recipientId: invitedExistingUser._id,
        senderId: inviterId,
        orgId: orgId,
        type: 'invitation',
        message: `invited you to join ${org.name}`,
      })
    } catch (notifErr) {
      console.error(
        'Notification error:', notifErr.message
      )
    }
  }

  const acceptUrl =
    `${process.env.CLIENT_URL}/invite/accept?token=${token}`

  // Send real email
  const emailSent = await sendInvitationEmail({
    toEmail: normalizedEmail,
    orgName: org.name,
    inviterName: inviter?.name || 'A team member',
    role: assignedRole,
    acceptUrl,
  })

  // Fallback: always log in dev mode
  console.log(`[DEV] Invite URL: ${acceptUrl}`)
  if (!emailSent) {
    console.log(
      '[DEV] Email failed — use URL above to accept'
    )
  }

  // Log activity
  await logActivity({
    userId: inviterId,
    orgId: org._id,
    entity: 'member',
    entityId: inviterId, // Use inviter Id or null for target since they aren't created yet
    action: `invited ${normalizedEmail} to the organization`,
    metadata: { email: normalizedEmail, role: assignedRole }
  });

  return { message: 'Invitation sent successfully' }
}


export const acceptInvitation = async (token, userId) => {
  const invitation = await Invitation.findOne({ token });

  if (!invitation) {
    throw new AppError('Invalid invitation token', 400);
  }
  if (invitation.status === 'accepted') {
    throw new AppError('Invitation already accepted', 400);
  }
  if (invitation.status === 'revoked') {
    throw new AppError('This invitation has been revoked', 400);
  }
  if (invitation.expiresAt < new Date()) {
    invitation.status = 'expired';
    await invitation.save();
    throw new AppError('This invitation has expired', 400);
  }

  const user = await User.findById(userId);
  if (!user) throw new AppError('User not found', 404);

  if (user.email !== invitation.email) {
    throw new AppError(
      'This invitation was sent to a different email address', 403
    );
  }

  const existingMembership = await Membership.findOne({
    user: userId,
    organization: invitation.organization,
  });
  if (existingMembership) {
    throw new AppError('You are already a member', 400);
  }

  await Membership.create({
    user: userId,
    organization: invitation.organization,
    role: invitation.role,
    invitedBy: invitation.invitedBy,
  });

  invitation.status = 'accepted';
  await invitation.save();

  await logActivity({
    userId: userId,
    orgId: invitation.organization,
    entity: 'member',
    entityId: userId,
    action: `joined the organization`,
  });

  const org = await Organization.findById(invitation.organization);

  return {
    message: `You have joined ${org?.name || 'the organization'}`,
    organization: org,
  };
};

export const getOrgInvitations = async (orgId, userId) => {
  const membership = await Membership.findOne({
    user: userId, organization: orgId
  });
  if (!membership) {
    throw new AppError('Not a member', 403);
  }

  const invitations = await Invitation.find({
    organization: orgId,
    status: 'pending',
  })
  .populate('invitedBy', 'name email')
  .sort({ createdAt: -1 });

  return invitations;
};

export const changeMemberRole = async ({ userId, role }, orgId) => {
  const org = await Organization.findById(orgId);
  if (!org) throw new AppError('Organization not found', 404);

  if (org.owner.toString() === userId) {
    throw new AppError('Cannot change the role of the organization owner', 400);
  }

  const membership = await Membership.findOne({
    user: userId,
    organization: orgId,
  });
  if (!membership) throw new AppError('User is not a member', 404);

  const validRoles = ['admin', 'member']
  if (!validRoles.includes(role)) {
    throw new AppError(
      'Role must be admin or member', 400
    )
  }

  membership.role = role;
  await membership.save();

  const member = await User.findById(userId);
  await logActivity({
    userId: org.owner, // Authenticated user should be the one logging, but usually it's the target user? Actually userId here is the TARGET user.
    orgId,
    entity: 'member',
    entityId: userId,
    action: `changed role of ${member?.name || 'a member'} to ${role}`,
    metadata: { role }
  });

  return { message: 'Member role updated successfully.' };
};

export const removeMember = async (userId, orgId) => {
  const org = await Organization.findById(orgId);
  if (!org) throw new AppError('Organization not found', 404);

  if (org.owner.toString() === userId) {
    throw new AppError('Cannot remove the owner from the organization', 400);
  }

  const membership = await Membership.findOneAndDelete({
    user: userId,
    organization: orgId,
  });
  if (!membership) throw new AppError('User is not a member', 404);

  const member = await User.findById(membership.user);
  await logActivity({
    userId: org.owner, // Usually the one doing the action, but orgId owner is a safe fallback if we don't pass req.user.id to service
    orgId,
    entity: 'member',
    entityId: membership.user,
    action: `removed ${member?.name || 'a member'} from the organization`,
    metadata: { removedBy: userId },
  });

  await createNotification({
    recipientId: membership.user,
    senderId: userId,
    orgId,
    type: 'member_removed',
    message: `You were removed from ${org.name}`,
    link: '/',
  });

  return { message: 'Member removed successfully.' };
};

export const deleteOrganization = async (orgId, userId) => {
  const org = await Organization.findById(orgId);
  if (!org) throw new AppError('Organization not found', 404);

  if (org.owner.toString() !== userId.toString()) {
    throw new AppError('Only the owner can delete the organization', 403);
  }

  await Membership.deleteMany({ organization: orgId });
  await Organization.findByIdAndDelete(orgId);

  return { message: 'Organization deleted successfully.' };
};

export const revokeInvitation = async (
  invitationId, userId, orgId
) => {
  const membership = await Membership.findOne({
    user: userId,
    organization: orgId,
  });
  if (!membership ||
      !['owner', 'admin'].includes(membership.role)) {
    throw new AppError(
      'Only admins can revoke invitations', 403
    );
  }

  const invitation = await Invitation.findById(invitationId);
  if (!invitation) {
    throw new AppError('Invitation not found', 404);
  }
  if (invitation.organization.toString() !== orgId) {
    throw new AppError('Access denied', 403);
  }

  invitation.status = 'revoked';
  await invitation.save();

  return { message: 'Invitation revoked successfully' };
};
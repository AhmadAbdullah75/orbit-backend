import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export const sendInvitationEmail = async ({
  toEmail, orgName, inviterName,
  role, acceptUrl
}) => {
  try {
    await resend.emails.send({
      from: process.env.FROM_EMAIL ||
        'onboarding@resend.dev',
      to: toEmail,
      subject: `You've been invited to join ${orgName} on Orbit`,
      html: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: -apple-system,
          BlinkMacSystemFont, 'Segoe UI', sans-serif;
          background: #f8fafc; padding: 40px 20px;
          margin: 0;">
          <div style="max-width: 480px; margin: 0 auto;
            background: white; border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 4px 24px rgba(0,0,0,0.08);">

            <!-- Header -->
            <div style="background: #6366f1;
              padding: 32px; text-align: center;">
              <h1 style="color: white; margin: 0;
                font-size: 28px; font-weight: 800;
                letter-spacing: -0.5px;">
                🚀 Orbit
              </h1>
              <p style="color: rgba(255,255,255,0.8);
                margin: 8px 0 0; font-size: 14px;">
                Project Management Platform
              </p>
            </div>

            <!-- Body -->
            <div style="padding: 32px;">
              <h2 style="font-size: 20px;
                font-weight: 700; color: #1e293b;
                margin: 0 0 12px;">
                You've been invited!
              </h2>
              <p style="color: #64748b;
                font-size: 15px; line-height: 1.6;
                margin: 0 0 20px;">
                <strong style="color: #1e293b;">
                  ${inviterName}
                </strong>
                has invited you to join
                <strong style="color: #6366f1;">
                  ${orgName}
                </strong>
                as a
                <strong style="color: #1e293b;
                  text-transform: capitalize;">
                  ${role}
                </strong>.
              </p>

              <!-- Role badge -->
              <div style="background: #f1f5f9;
                border-radius: 10px; padding: 14px 16px;
                margin-bottom: 24px;
                display: inline-block;">
                <span style="font-size: 13px;
                  color: #64748b;">
                  Your role:
                </span>
                <span style="font-size: 13px;
                  font-weight: 700; color: #6366f1;
                  text-transform: capitalize;
                  margin-left: 6px;">
                  ${role}
                </span>
              </div>

              <!-- CTA Button -->
              <div style="text-align: center;
                margin: 24px 0;">
                <a href="${acceptUrl}"
                  style="display: inline-block;
                  background: #6366f1; color: white;
                  text-decoration: none;
                  padding: 14px 32px;
                  border-radius: 10px;
                  font-size: 15px;
                  font-weight: 700;
                  letter-spacing: 0.2px;">
                  Accept Invitation →
                </a>
              </div>

              <p style="color: #94a3b8;
                font-size: 12px;
                text-align: center;
                margin: 16px 0 0;
                line-height: 1.5;">
                This invitation expires in 7 days.<br>
                If you didn't expect this, ignore it.
              </p>
            </div>

            <!-- Footer -->
            <div style="background: #f8fafc;
              padding: 20px 32px;
              border-top: 1px solid #f1f5f9;
              text-align: center;">
              <p style="color: #cbd5e1;
                font-size: 11px; margin: 0;">
                Orbit — Project Management Platform
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    })
    return true
  } catch (err) {
    console.error('Email send error:', err)
    // Don't throw — log token as fallback
    return false
  }
}

export const sendPasswordResetEmail = async ({
  toEmail, userName, resetUrl
}) => {
  try {
    await resend.emails.send({
      from: process.env.FROM_EMAIL ||
        'onboarding@resend.dev',
      to: toEmail,
      subject: 'Reset your Orbit password',
      html: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: -apple-system,
          BlinkMacSystemFont, 'Segoe UI', sans-serif;
          background: #f8fafc; padding: 40px 20px;
          margin: 0;">
          <div style="max-width: 480px; margin: 0 auto;
            background: white; border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 4px 24px rgba(0,0,0,0.08);">

            <div style="background: #6366f1;
              padding: 32px; text-align: center;">
              <h1 style="color: white; margin: 0;
                font-size: 28px; font-weight: 800;">
                🚀 Orbit
              </h1>
            </div>

            <div style="padding: 32px;">
              <h2 style="font-size: 20px;
                font-weight: 700; color: #1e293b;
                margin: 0 0 12px;">
                Reset your password
              </h2>
              <p style="color: #64748b;
                font-size: 15px; line-height: 1.6;
                margin: 0 0 24px;">
                Hi ${userName || 'there'},<br><br>
                We received a request to reset your
                Orbit password. Click the button
                below to create a new password.
              </p>

              <div style="text-align: center;
                margin: 24px 0;">
                <a href="${resetUrl}"
                  style="display: inline-block;
                  background: #6366f1; color: white;
                  text-decoration: none;
                  padding: 14px 32px;
                  border-radius: 10px;
                  font-size: 15px; font-weight: 700;">
                  Reset Password →
                </a>
              </div>

              <p style="color: #94a3b8; font-size: 12px;
                text-align: center; margin: 16px 0 0;
                line-height: 1.5;">
                This link expires in 30 minutes.<br>
                If you didn't request this,
                ignore this email.
              </p>
            </div>

            <div style="background: #f8fafc;
              padding: 20px 32px;
              border-top: 1px solid #f1f5f9;
              text-align: center;">
              <p style="color: #cbd5e1; font-size: 11px;
                margin: 0;">
                Orbit — Project Management Platform
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    })
    return true
  } catch (err) {
    console.error('Password reset email error:', err)
    return false
  }
}

// Default export for backward compatibility
// with authService.js import
const sendEmail = async ({ to, subject, text, html }) => {
  const { Resend } = await import('resend')
  const resend = new Resend(
    process.env.RESEND_API_KEY
  )
  try {
    await resend.emails.send({
      from: process.env.FROM_EMAIL ||
        'onboarding@resend.dev',
      to,
      subject,
      html: html || `<p>${text}</p>`,
    })
    return true
  } catch (err) {
    console.error('sendEmail error:', err)
    return false
  }
}

export default sendEmail

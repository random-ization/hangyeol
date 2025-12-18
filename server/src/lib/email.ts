import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = '"KoreanStudy Support" <support@mail.koreanstudy.me>';
const REPLY_TO = 'support@koreanstudy.me';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

/**
 * Send email verification link to new user
 */
export const sendVerificationEmail = async (email: string, token: string): Promise<void> => {
    const verifyUrl = `${FRONTEND_URL}/verify-email?token=${token}`;

    await resend.emails.send({
        from: FROM_EMAIL,
        to: email,
        replyTo: REPLY_TO,
        subject: 'Verify your email - KoreanStudy',
        html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #4F46E5; text-align: center;">Welcome to KoreanStudy! 🇰🇷</h1>
        <p style="font-size: 16px; color: #333;">Thank you for registering. Please click the button below to verify your email address:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verifyUrl}" style="background-color: #4F46E5; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
            Verify Email
          </a>
        </div>
        <p style="font-size: 14px; color: #666;">Or copy and paste this link into your browser:</p>
        <p style="font-size: 12px; color: #999; word-break: break-all;">${verifyUrl}</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
        <p style="font-size: 12px; color: #999; text-align: center;">
          If you didn't create an account, you can safely ignore this email.
        </p>
      </div>
    `,
    });
};

/**
 * Send password reset link to user
 */
export const sendPasswordResetEmail = async (email: string, token: string): Promise<void> => {
    const resetUrl = `${FRONTEND_URL}/reset-password?token=${token}`;

    await resend.emails.send({
        from: FROM_EMAIL,
        to: email,
        replyTo: REPLY_TO,
        subject: 'Reset your password - KoreanStudy',
        html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #4F46E5; text-align: center;">Password Reset Request</h1>
        <p style="font-size: 16px; color: #333;">We received a request to reset your password. Click the button below to set a new password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #4F46E5; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
            Reset Password
          </a>
        </div>
        <p style="font-size: 14px; color: #666;">Or copy and paste this link into your browser:</p>
        <p style="font-size: 12px; color: #999; word-break: break-all;">${resetUrl}</p>
        <p style="font-size: 14px; color: #dc2626; margin-top: 20px;">⚠️ This link will expire in 1 hour.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
        <p style="font-size: 12px; color: #999; text-align: center;">
          If you didn't request a password reset, you can safely ignore this email.
        </p>
      </div>
    `,
    });
};

import { Resend } from 'resend';
import { APP_NAME } from 'code-dojo-shared/constants';
import env from '../config/env.js';

const resend = new Resend(env.resendApiKey);

export async function sendVerificationEmail(to, code) {
  await resend.emails.send({
    from: env.emailFrom,
    to,
    subject: `Verify your email — ${APP_NAME}`,
    html: `
      <h2>Verify your email</h2>
      <p>Enter this code to verify your account:</p>
      <h1 style="letter-spacing:8px;font-size:36px;font-family:monospace">${code}</h1>
      <p>This code expires in 10 minutes.</p>
    `,
  });
}

export async function sendPasswordResetEmail(to, code) {
  await resend.emails.send({
    from: env.emailFrom,
    to,
    subject: `Reset your password — ${APP_NAME}`,
    html: `
      <h2>Reset your password</h2>
      <p>Enter this code to reset your password:</p>
      <h1 style="letter-spacing:8px;font-size:36px;font-family:monospace">${code}</h1>
      <p>This code expires in 10 minutes.</p>
    `,
  });
}

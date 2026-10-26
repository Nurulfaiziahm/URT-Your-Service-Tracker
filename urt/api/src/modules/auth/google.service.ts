import { OAuth2Client } from 'google-auth-library';
import { AppError } from '../../middleware/error-handler.js';
import { config } from '../../core/config/index.js';

interface GoogleProfile {
  googleId: string;
  email: string;
  firstName: string;
  lastName: string;
  isEmailVerified: boolean;
}

const client = new OAuth2Client({
  transporterOptions: { timeout: 5000, retryConfig: { retry: 0 } },
});

export const verifyGoogleIdToken = async (idToken: string): Promise<GoogleProfile> => {
  const ticket = await client
    .verifyIdToken({ idToken, audience: config.google.clientId })
    .catch((_error) => {
      throw new AppError('Failed to verify Google ID token', 401, 'GOOGLE_TOKEN_INVALID');
    });

  const payload = ticket.getPayload();

  if (!payload || !payload.sub || !payload.email) {
    throw new AppError('Invalid Google ID token', 401, 'GOOGLE_TOKEN_INVALID');
  }

  const email = payload.email?.trim().toLowerCase();

  return {
    googleId: payload.sub,
    email,
    firstName: (payload.given_name?.trim() || payload.name?.trim() || 'User').slice(0, 50),
    lastName: (payload.family_name?.trim() || '').slice(0, 50),
    isEmailVerified: email.endsWith('@gmail.com') || Boolean(payload.hd?.trim()),
  };
};

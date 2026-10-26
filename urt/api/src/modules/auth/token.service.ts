import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { config } from '../../core/config/index.js';
import { AppError } from '../../middleware/error-handler.js';
import { AuthSessionRecord, RefreshGeneration } from '../../lib/redis/auth-session.store.js';
import { TokenPayload } from './auth.types.js';

export class TokenService {
  static hash(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private static sign(
    type: 'access' | 'refresh',
    userId: string,
    session: AuthSessionRecord,
    generation: RefreshGeneration,
  ): string {
    const keys = type === 'access' ? config.auth.accessKeys : config.auth.refreshKeys;
    const key = keys.find((entry) => entry.id === generation.kid);
    const version = config.auth.versions.find((entry) => entry.id === generation.signingVersion);
    const now = Math.floor(Date.now() / 1000);
    if (
      !key ||
      !version ||
      (key.acceptUntil && key.acceptUntil <= now) ||
      generation.iat < key.activatedAt ||
      (key.lastIssuedAt && generation.iat > key.lastIssuedAt)
    ) {
      throw new AppError('Signing configuration unavailable', 503, 'AUTH_UNAVAILABLE');
    }
    // v1 canonical order is immutable. Retained versions must keep this serialization.
    return jwt.sign(
      {
        sub: userId,
        deviceId: session.deviceId,
        sid: session.sid,
        jti: generation.jti,
        type,
        iss: version.issuer,
        aud: version.audience,
        sv: version.id,
        iat: generation.iat,
        exp: generation.exp,
      },
      key.secret,
      { algorithm: 'HS256', keyid: key.id },
    );
  }

  static createGeneration(
    type: 'access' | 'refresh',
    absoluteExpiresAt: number,
  ): RefreshGeneration {
    const iat = Math.floor(Date.now() / 1000);
    return {
      hash: '',
      jti: crypto.randomUUID(),
      iat,
      exp: Math.min(
        iat + (type === 'access' ? config.auth.accessTTL : config.auth.refreshTTL),
        absoluteExpiresAt,
      ),
      kid: (type === 'access' ? config.auth.accessKeys : config.auth.refreshKeys)[0].id,
      signingVersion: config.auth.signingVersion,
    };
  }

  static refresh(userId: string, session: AuthSessionRecord): string {
    const token = this.sign('refresh', userId, session, session.currentRefresh);
    if (this.hash(token) !== session.currentRefresh.hash) {
      throw new AppError('Refresh reconstruction failed', 503, 'AUTH_UNAVAILABLE');
    }
    return token;
  }

  static issueRefresh(userId: string, session: AuthSessionRecord): void {
    session.currentRefresh = this.createGeneration('refresh', session.absoluteExpiresAt);
    session.currentRefresh.hash = this.hash(
      this.sign('refresh', userId, session, session.currentRefresh),
    );
    session.expiresAt = session.currentRefresh.exp;
  }

  static access(userId: string, session: AuthSessionRecord): string {
    const generation = this.createGeneration(
      'access',
      Math.min(session.absoluteExpiresAt, session.expiresAt),
    );
    return this.sign('access', userId, session, generation);
  }

  static verify(token: string, type: 'access' | 'refresh'): TokenPayload {
    try {
      if (typeof token !== 'string' || token.length > 8192) {
        throw new Error();
      }
      const decoded = jwt.decode(token, { complete: true });
      if (
        !decoded ||
        decoded.header.alg !== 'HS256' ||
        decoded.header.typ !== 'JWT' ||
        !decoded.header.kid ||
        Object.keys(decoded.header).some((key) => !['alg', 'typ', 'kid'].includes(key))
      ) {
        throw new Error();
      }
      const keys = type === 'access' ? config.auth.accessKeys : config.auth.refreshKeys;
      const key = keys.find((entry) => entry.id === decoded.header.kid);
      const now = Math.floor(Date.now() / 1000);
      if (!key || (key.acceptUntil && key.acceptUntil <= now)) {
        throw new Error();
      }
      const payload = jwt.verify(token, key.secret, {
        algorithms: ['HS256'],
        clockTolerance: config.auth.clockSkew,
      }) as TokenPayload;
      const version = config.auth.versions.find((entry) => entry.id === payload.sv);
      if (
        !version ||
        payload.type !== type ||
        payload.iss !== version.issuer ||
        payload.aud !== version.audience ||
        typeof payload.sub !== 'string' ||
        !/^[a-f0-9]{24}$/.test(payload.sub) ||
        typeof payload.deviceId !== 'string' ||
        !/^[a-zA-Z0-9_-]{8,128}$/.test(payload.deviceId) ||
        typeof payload.sid !== 'string' ||
        !/^[a-f0-9-]{36}$/.test(payload.sid) ||
        typeof payload.jti !== 'string' ||
        !/^[a-f0-9-]{36}$/.test(payload.jti) ||
        !Number.isSafeInteger(payload.iat) ||
        !Number.isSafeInteger(payload.exp) ||
        payload.exp <= payload.iat ||
        payload.iat > now + config.auth.clockSkew ||
        payload.exp - payload.iat >
          (type === 'access' ? config.auth.accessTTL : config.auth.refreshTTL) ||
        payload.iat < key.activatedAt ||
        (key.lastIssuedAt && payload.iat > key.lastIssuedAt)
      ) {
        throw new Error();
      }
      return payload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError && type === 'access') {
        throw new AppError('Access token has expired', 401, 'ACCESS_TOKEN_EXPIRED');
      }
      throw new AppError('Invalid token', 401, 'INVALID_TOKEN');
    }
  }
}

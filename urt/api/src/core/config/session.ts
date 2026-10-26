import session from 'express-session';
import { RequestHandler } from 'express';
import RedisStore from 'connect-redis';
import redisClient from '../../lib/redis/client.js';
import { config } from './index.js';
import { AppError } from '../../middleware/error-handler.js';

export const sessionConfig: session.SessionOptions = {
  store: new RedisStore({
    client: redisClient,
    prefix: config.auth.csrfNamespace,
    ttl: config.auth.csrfTTL,
    disableTouch: true,
  }),
  secret: config.auth.sessionKeys
    .filter((key) => !key.acceptUntil || key.acceptUntil > Date.now() / 1000)
    .map((key) => key.secret),
  name: config.cookies.sessionName,
  resave: false,
  saveUninitialized: false,
  cookie: { ...config.cookies.options, maxAge: config.auth.csrfTTL * 1000 },
};

const middleware = session(sessionConfig);
const sessionMiddleware: RequestHandler = (req, res, next) => {
  // express-session retains this array. Drop expired verification secrets without reinitializing it.
  const secrets = sessionConfig.secret as string[];
  secrets.splice(
    0,
    secrets.length,
    ...config.auth.sessionKeys
      .filter((key) => !key.acceptUntil || key.acceptUntil > Date.now() / 1000)
      .map((key) => key.secret),
  );
  middleware(req, res, (err) => {
    if (err) {
      return next(new AppError('Authentication unavailable', 503, 'AUTH_UNAVAILABLE'));
    }
    next();
  });
};

export default sessionMiddleware;

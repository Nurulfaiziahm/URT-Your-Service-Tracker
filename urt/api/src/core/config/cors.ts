import cors from 'cors';
import { config } from './index.js';
import { AppError } from '../../middleware/error-handler.js';

export default cors({
  origin: (origin, callback) => {
    if (!origin || config.allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new AppError('Origin is not allowed', 403, 'ORIGIN_NOT_ALLOWED'));
    }
  },
  credentials: true,
});

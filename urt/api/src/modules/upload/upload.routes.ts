import { Router } from 'express';
import { protect } from '../../middleware/auth.guard.js';
import { validate } from '../../middleware/validation.js';
import { createUpload, readUpload, removeUpload } from './upload.controller.js';
import { parseUpload, requireMultipart, uploadErrorHandler } from './upload.middleware.js';
import { uploadParamsSchema } from './upload.schema.js';

const router = Router();
router.use((_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});
router.use(protect);
router.post('/', requireMultipart, parseUpload, uploadErrorHandler, createUpload);
router.get('/:key', validate(uploadParamsSchema), readUpload);
router.delete('/:key', validate(uploadParamsSchema), removeUpload);

export default router;

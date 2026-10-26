import express from 'express';
import {
  createService,
  getServices,
  getServiceById,
  updateService,
} from './service.controller.js';
import { validate } from '../../middleware/validation.js';
import { protect } from '../../middleware/auth.guard.js';
import {
  requireBusinessAccess,
  attachBusinessContext,
} from '../business/business.access.js';
import {
  createServiceSchema,
  updateServiceSchema,
  serviceQuerySchema,
} from './service.schema.js';

const router = express.Router({ mergeParams: true });

router.use((_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});

// Require user to be authenticated
router.use(protect);
router.use(attachBusinessContext);

// Read services: available to authorized users in the business
router.get('/', validate(serviceQuerySchema), getServices);
router.get('/:serviceId', getServiceById);

// Owner-only modifications
router.post('/', requireBusinessAccess('owner'), validate(createServiceSchema), createService);
router.put('/:serviceId', requireBusinessAccess('owner'), validate(updateServiceSchema), updateService);

export default router;

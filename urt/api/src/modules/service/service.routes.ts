import express from 'express';
import {
  createService,
  getServices,
  getServiceById,
  updateService,
  deleteService,
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
router.use(requireBusinessAccess('owner', 'technician', 'customer'));

// Read services: available to authorized users in the business
router.get('/', validate(serviceQuerySchema), getServices);
router.get('/:serviceId', getServiceById);

// Technicians can add missing items; tariff levels and edits remain owner-managed.
router.post('/', requireBusinessAccess('owner', 'technician'), validate(createServiceSchema), createService);
router.put('/:serviceId', requireBusinessAccess('owner'), validate(updateServiceSchema), updateService);
router.delete('/:serviceId', requireBusinessAccess('owner'), deleteService);

export default router;

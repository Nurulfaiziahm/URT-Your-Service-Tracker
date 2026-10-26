import express from 'express';
import { getProfile, getUsers, updateProfile } from './user.controller.js';
import { validate } from '../../middleware/validation.js';
import { authorize, protect } from '../../middleware/auth.guard.js';
import { getUsersSchema, updateUserSchema } from './user.schema.js';

const router = express.Router();

router.route('/').get(protect, authorize('admin'), validate(getUsersSchema), getUsers);

router
  .route('/profile')
  .get(protect, getProfile)
  .put(protect, validate(updateUserSchema), updateProfile);

export default router;

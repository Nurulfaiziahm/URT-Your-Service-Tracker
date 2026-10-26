import { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/async-handler.js';
import { getAuthUser } from '../../middleware/auth.guard.js';
import { ResponseHandler } from '../../utils/index.js';
import { UserService } from './user.service.js';
import { formatUserResponse } from '../../types/common.js';
import { UpdateUserInput } from './user.schema.js';

/**
 * @route   GET /api/v1/users/profile
 * @desc    Get current user profile (compatibility path — delegates to same service as /auth/profile)
 * @access  Private
 */
export const getProfile = asyncHandler(async (req: Request, res: Response) => {
  const { id: userId } = getAuthUser(req);
  const user = await UserService.getProfile(userId);

  ResponseHandler.success(res, { user: formatUserResponse(user, true) }, 'Profile fetched');
});

/**
 * @route   PUT /api/v1/users/profile
 * @desc    Update current user profile (compatibility path)
 * @access  Private
 */
export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  const { id: userId } = getAuthUser(req);
  const input = req.body as UpdateUserInput;
  const user = await UserService.updateProfile(userId, input);

  ResponseHandler.success(res, { user: formatUserResponse(user, true) }, 'Profile updated');
});

export const getUsers = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string, 10) || 1;
  const limit = Math.min(parseInt(req.query.limit as string, 10) || 10, 100);
  const q = (req.query.q as string) || undefined;
  const role = (req.query.role as 'user' | 'admin') || undefined;

  const { users, totalItems } = await UserService.getUsers(page, limit, q, role);

  ResponseHandler.paginated(
    res,
    users.map((u) => formatUserResponse(u)),
    page,
    limit,
    totalItems,
    'Users fetched successfully',
  );
});

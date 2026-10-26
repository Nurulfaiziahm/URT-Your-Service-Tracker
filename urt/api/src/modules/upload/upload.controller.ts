import { asyncHandler } from '../../middleware/async-handler.js';
import { getAuthUser } from '../../middleware/auth.guard.js';
import { AppError } from '../../middleware/error-handler.js';
import { ResponseHandler } from '../../utils/response.js';
import { deleteUpload, getUpload, uploadFile } from './upload.service.js';

export const createUpload = asyncHandler(async (req, res) => {
  const user = getAuthUser(req);
  if (!req.file) throw new AppError('Send exactly one file using the file field', 400, 'INVALID_UPLOAD');
  ResponseHandler.created(res, await uploadFile(req.file, user.id), 'File uploaded successfully');
});

export const readUpload = asyncHandler(async (req, res) => {
  const user = getAuthUser(req);
  ResponseHandler.success(res, await getUpload(req.params.key, user.id, user.role === 'admin'), 'File retrieved successfully');
});

export const removeUpload = asyncHandler(async (req, res) => {
  const user = getAuthUser(req);
  await deleteUpload(req.params.key, user.id, user.role === 'admin');
  ResponseHandler.success(res, null, 'File deleted successfully');
});

import { asyncHandler } from '../../middleware/async-handler.js';
import { ResponseHandler } from '../../utils/response.js';
import { createServiceRequest } from './service-request.service.js';

export const submitServiceRequest = asyncHandler(async (req, res) => {
  const receipt = await createServiceRequest(req.params.slug, req.body, req.user?.id);
  ResponseHandler.created(res, receipt, 'Tiket berhasil dibuat');
});

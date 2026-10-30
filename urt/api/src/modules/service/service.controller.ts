import { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/async-handler.js';
import { ResponseHandler } from '../../utils/response.js';
import { ServiceService } from './service.service.js';
import { CreateServiceInput, UpdateServiceInput, ServiceQueryParams } from './service.schema.js';
import { AppError } from '../../middleware/error-handler.js';

export const createService = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.params.businessId;
  const input = req.body as CreateServiceInput;
  if (input.entryType === 'difficulty' && !req.businessContext?.isOwner) throw new AppError('Tarif tingkat kesulitan hanya dapat ditetapkan owner.', 403, 'FORBIDDEN');
  const service = await ServiceService.createService(businessId, input);

  ResponseHandler.created(res, { service }, 'Service created successfully');
});

export const getServices = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.params.businessId;
  const isOwner = Boolean(req.businessContext?.isOwner);
  const query = req.query as unknown as ServiceQueryParams;

  const result = await ServiceService.getServices(businessId, isOwner, query);

  ResponseHandler.paginated(
    res,
    result.services,
    result.page,
    result.limit,
    result.total,
    'Services retrieved successfully',
  );
});

export const getServiceById = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.params.businessId;
  const serviceId = req.params.serviceId;
  const isOwner = Boolean(req.businessContext?.isOwner);

  const service = await ServiceService.getServiceById(businessId, serviceId, isOwner);

  ResponseHandler.success(res, { service }, 'Service retrieved successfully');
});

export const updateService = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.params.businessId;
  const serviceId = req.params.serviceId;
  const input = req.body as UpdateServiceInput;

  const service = await ServiceService.updateService(businessId, serviceId, input);

  ResponseHandler.success(res, { service }, 'Service updated successfully');
});

export const deleteService = asyncHandler(async (req: Request, res: Response) => {
  await ServiceService.deleteService(req.params.businessId, req.params.serviceId);
  ResponseHandler.success(res, null, 'Item katalog berhasil dihapus.');
});

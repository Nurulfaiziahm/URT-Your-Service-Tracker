import { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/async-handler.js';
import { ResponseHandler } from '../../utils/response.js';
import { CheckoutSchema, PaymentsSchema } from './subscription.schema.js';
import { SubscriptionService } from './subscription.service.js';

export const getPayment = asyncHandler(async (req: Request, res: Response) => {
  ResponseHandler.success(res, await SubscriptionService.getPayment(req.params.businessId, req.params.paymentId));
});

export const confirmDemoPayment = asyncHandler(async (req: Request, res: Response) => {
  ResponseHandler.success(res, await SubscriptionService.confirmDemoPayment(req.params.businessId, req.params.paymentId), 'Demo payment confirmed');
});

export const getPackages = asyncHandler(async (_req: Request, res: Response) => {
  const packages = await SubscriptionService.getPackages();
  ResponseHandler.success(res, { packages });
});

export const getSubscription = asyncHandler(async (req: Request, res: Response) => {
  const subscription = await SubscriptionService.getSubscription(req.params.businessId);
  ResponseHandler.success(res, { subscription });
});

export const checkout = asyncHandler(async (req: Request, res: Response) => {
  const { packageCode } = req.body as CheckoutSchema['body'];
  const result = await SubscriptionService.checkout(req.params.businessId, packageCode);
  ResponseHandler.created(res, result);
});

export const getPayments = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit } = req.query as unknown as PaymentsSchema['query'];
  const { payments, total } = await SubscriptionService.getPayments(
    req.params.businessId,
    page,
    limit,
  );

  ResponseHandler.paginated(res, payments, page, limit, total);
});

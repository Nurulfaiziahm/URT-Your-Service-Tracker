import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../../middleware/validation.js';
import { asyncHandler } from '../../middleware/async-handler.js';
import { trackingLimiter } from '../../core/security/rate-limiter.js';
import { ResponseHandler } from '../../utils/response.js';
import { TicketService } from './ticket.service.js';

const token = z.string().regex(/^[a-f0-9]{64}$/i);
export const publicApprovalRouter = Router();
publicApprovalRouter.use(trackingLimiter, (_req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });
publicApprovalRouter.post('/inspect', validate(z.object({ body: z.object({ token }).strict() })), asyncHandler(async (req, res) => {
  ResponseHandler.success(res, await TicketService.inspectCustomerApproval(req.body.token));
}));
publicApprovalRouter.post('/respond', validate(z.object({ body: z.object({ token, expectedRevision: z.number().int().min(1), decision: z.enum(['approved', 'rejected']), reason: z.string().trim().max(500).optional() }).strict() })), asyncHandler(async (req, res) => {
  const { token: proof, ...input } = req.body;
  ResponseHandler.success(res, await TicketService.respondToCustomerApproval(proof, input));
}));

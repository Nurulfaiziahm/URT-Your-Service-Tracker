import { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/async-handler.js';
import { ResponseHandler } from '../../utils/response.js';
import { getAuthUser } from '../../middleware/auth.guard.js';
import { ReportService } from './report.service.js';
import { ReportOverviewQueryParams } from './report.schema.js';

export const getDashboard = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.params.businessId;
  const user = getAuthUser(req);
  const roles = req.businessContext?.roles || [];
  const requestedRole = req.query.role as string | undefined;

  const dashboardData = await ReportService.getDashboard(
    businessId,
    user.id,
    roles,
    requestedRole,
  );

  ResponseHandler.success(res, dashboardData, 'Dashboard data retrieved successfully');
});

export const getReportOverview = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.params.businessId;
  const user = getAuthUser(req);
  const query = req.query as ReportOverviewQueryParams;

  const report = await ReportService.getReportOverview(businessId, user.id, query);
  ResponseHandler.success(res, report, 'Report overview retrieved successfully');
});

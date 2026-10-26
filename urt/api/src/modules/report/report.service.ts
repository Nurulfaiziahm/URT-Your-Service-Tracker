import mongoose from 'mongoose';
import { ServiceTicket } from '../../models/ServiceTicket.model.js';
import { Customer } from '../../models/Customer.model.js';
import { Technician } from '../../models/Technician.model.js';
import { Business } from '../../models/Business.model.js';
import { ServiceInvoice } from '../../models/ServiceInvoice.model.js';
import { AppError } from '../../middleware/error-handler.js';
import { validateObjectId } from '../business/business.access.js';
import { serializeTicket } from '../ticket/ticket.serializer.js';
import { ReportOverviewQueryParams } from './report.schema.js';
import { SubscriptionService } from '../subscription/subscription.service.js';

export class ReportService {
  /**
   * Get role-specific dashboard metrics and recent tickets
   */
  static async getDashboard(
    businessId: string,
    callerUserId: string,
    roles: string[],
    requestedRole?: string,
  ) {
    validateObjectId(businessId, 'Business');

    const business = await Business.findById(businessId);
    if (!business || !business.isActive) {
      throw new AppError('Business not found or inactive', 404);
    }

    const businessObjectId = new mongoose.Types.ObjectId(businessId);
    const callerObjectId = new mongoose.Types.ObjectId(callerUserId);

    // Determine which view to render based on available permissions and optional requestedRole
    let activeRole: 'owner' | 'technician' | 'customer';
    if (requestedRole && roles.includes(requestedRole)) {
      activeRole = requestedRole as 'owner' | 'technician' | 'customer';
    } else if (roles.includes('owner')) {
      activeRole = 'owner';
    } else if (roles.includes('technician')) {
      activeRole = 'technician';
    } else if (roles.includes('customer')) {
      activeRole = 'customer';
    } else {
      throw new AppError('No authorized portal access for this business', 403, 'FORBIDDEN');
    }

    // 1. OWNER DASHBOARD
    if (activeRole === 'owner') {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

      const [
        activeTickets,
        awaitingApproval,
        inRepair,
        readyForPickup,
        completedTotal,
        rejectedCount,
        totalCustomers,
        activeTechnicians,
        recentDocs,
        revenueAgg,
        unpaidInvoices,
        completedTicketsInMonth,
      ] = await Promise.all([
        ServiceTicket.countDocuments({
          businessId: businessObjectId,
          status: { $nin: ['completed', 'cancelled'] },
        }),
        ServiceTicket.countDocuments({
          businessId: businessObjectId,
          status: 'awaiting_approval',
        }),
        ServiceTicket.countDocuments({
          businessId: businessObjectId,
          status: 'repairing',
        }),
        ServiceTicket.countDocuments({
          businessId: businessObjectId,
          status: 'completed',
          $or: [{ handedOverAt: { $exists: false } }, { handedOverAt: null }],
        }),
        ServiceTicket.countDocuments({
          businessId: businessObjectId,
          status: 'completed',
        }),
        ServiceTicket.countDocuments({
          businessId: businessObjectId,
          status: 'rejected',
        }),
        Customer.countDocuments({
          businessId: businessObjectId,
          status: 'active',
        }),
        Technician.countDocuments({
          businessId: businessObjectId,
          status: 'active',
        }),
        ServiceTicket.find({ businessId: businessObjectId })
          .sort({ createdAt: -1 })
          .limit(5)
          .populate([
            { path: 'customerId', select: 'name email phone' },
            { path: 'assignedTechnicianId', select: 'name email phone specializations' },
            { path: 'requestedServiceId', select: 'name category basePrice estimatedDuration' },
          ]),
        // Revenue this month: sum payments where paidAt is this month
        ServiceInvoice.aggregate([
          { $match: { businessId: businessObjectId } },
          { $unwind: '$payments' },
          { $match: { 'payments.paidAt': { $gte: startOfMonth, $lte: endOfMonth } } },
          { $group: { _id: null, totalRevenue: { $sum: '$payments.amount' }, paymentCount: { $sum: 1 } } },
        ]),
        // Unpaid or partially paid invoices
        ServiceInvoice.find({
          businessId: businessObjectId,
          status: { $in: ['issued', 'partially_paid'] },
        }),
        // Completed in current month for MTD SLA
        ServiceTicket.find({
          businessId: businessObjectId,
          status: 'completed',
          readyAt: { $gte: startOfMonth, $lte: endOfMonth },
        }),
      ]);

      const recentTickets = recentDocs.map((ticket) => serializeTicket(ticket, 'owner'));
      const revenueThisMonth = revenueAgg[0]?.totalRevenue || 0;
      const unpaidInvoicesCount = unpaidInvoices.length;
      const unpaidInvoicesBalance = unpaidInvoices.reduce((sum, inv) => sum + inv.balance, 0);

      // SLA Month-to-date calculation:
      const eligibleSlaTickets = completedTicketsInMonth.filter(
        (t) => t.approvedEstimate?.targetCompletionDate,
      );
      const metSlaTickets = eligibleSlaTickets.filter(
        (t) => t.readyAt && t.readyAt <= t.approvedEstimate!.targetCompletionDate!,
      );
      const slaPercentage =
        eligibleSlaTickets.length > 0
          ? Math.round((metSlaTickets.length / eligibleSlaTickets.length) * 100)
          : null;

      return {
        role: 'owner',
        business: {
          id: business._id.toString(),
          name: business.name,
          slug: business.slug,
          timezone: business.timezone,
        },
        stats: {
          activeTickets,
          awaitingApproval,
          inRepair,
          readyForPickup,
          completedTotal,
          rejectedCount,
          totalCustomers,
          activeTechnicians,
        },
        financial: {
          revenueThisMonth,
          unpaidInvoicesCount,
          unpaidInvoicesBalance,
          slaPercentage,
        },
        subscription: await SubscriptionService.getSubscription(businessId),
        recentTickets,
      };
    }

    // 2. TECHNICIAN DASHBOARD
    if (activeRole === 'technician') {
      const technician = await Technician.findOne({
        businessId: businessObjectId,
        userId: callerObjectId,
        status: 'active',
      });

      if (!technician) {
        throw new AppError('Technician profile not found or inactive', 403, 'FORBIDDEN');
      }

      const [
        myActiveTickets,
        waitingDiagnosis,
        diagnosing,
        awaitingApproval,
        repairing,
        qualityCheck,
        completed,
        recentDocs,
      ] = await Promise.all([
        ServiceTicket.countDocuments({
          businessId: businessObjectId,
          assignedTechnicianId: technician._id,
          status: { $nin: ['completed', 'cancelled'] },
        }),
        ServiceTicket.countDocuments({
          businessId: businessObjectId,
          assignedTechnicianId: technician._id,
          status: { $in: ['submitted', 'waiting_diagnosis'] },
        }),
        ServiceTicket.countDocuments({
          businessId: businessObjectId,
          assignedTechnicianId: technician._id,
          status: 'diagnosing',
        }),
        ServiceTicket.countDocuments({
          businessId: businessObjectId,
          assignedTechnicianId: technician._id,
          status: 'awaiting_approval',
        }),
        ServiceTicket.countDocuments({
          businessId: businessObjectId,
          assignedTechnicianId: technician._id,
          status: 'repairing',
        }),
        ServiceTicket.countDocuments({
          businessId: businessObjectId,
          assignedTechnicianId: technician._id,
          status: 'quality_check',
        }),
        ServiceTicket.countDocuments({
          businessId: businessObjectId,
          assignedTechnicianId: technician._id,
          status: 'completed',
        }),
        ServiceTicket.find({
          businessId: businessObjectId,
          assignedTechnicianId: technician._id,
        })
          .sort({ createdAt: -1 })
          .limit(5)
          .populate([
            { path: 'customerId', select: 'name email phone' },
            { path: 'assignedTechnicianId', select: 'name email phone specializations' },
            { path: 'requestedServiceId', select: 'name category basePrice estimatedDuration' },
          ]),
      ]);

      const recentTickets = recentDocs.map((ticket) =>
        serializeTicket(ticket, 'technician', true),
      );

      return {
        role: 'technician',
        technicianId: technician._id.toString(),
        business: {
          id: business._id.toString(),
          name: business.name,
          slug: business.slug,
        },
        stats: {
          myActiveTickets,
          waitingDiagnosis,
          diagnosing,
          awaitingApproval,
          repairing,
          qualityCheck,
          completed,
        },
        recentTickets,
      };
    }

    // 3. CUSTOMER DASHBOARD
    const customer = await Customer.findOne({
      businessId: businessObjectId,
      userId: callerObjectId,
      status: 'active',
    });

    if (!customer) {
      throw new AppError('Customer profile not found or inactive', 403, 'FORBIDDEN');
    }

    const [
      activeTickets,
      awaitingApproval,
      readyForPickup,
      completedTickets,
      recentDocs,
    ] = await Promise.all([
      ServiceTicket.countDocuments({
        businessId: businessObjectId,
        customerId: customer._id,
        status: { $nin: ['completed', 'cancelled'] },
      }),
      ServiceTicket.countDocuments({
        businessId: businessObjectId,
        customerId: customer._id,
        status: 'awaiting_approval',
      }),
      ServiceTicket.countDocuments({
        businessId: businessObjectId,
        customerId: customer._id,
        status: 'completed',
        $or: [{ handedOverAt: { $exists: false } }, { handedOverAt: null }],
      }),
      ServiceTicket.countDocuments({
        businessId: businessObjectId,
        customerId: customer._id,
        status: { $in: ['completed', 'cancelled'] },
      }),
      ServiceTicket.find({
        businessId: businessObjectId,
        customerId: customer._id,
      })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate([
          { path: 'customerId', select: 'name email phone' },
          { path: 'assignedTechnicianId', select: 'name email phone specializations' },
          { path: 'requestedServiceId', select: 'name category basePrice estimatedDuration' },
        ]),
    ]);

    const recentTickets = recentDocs.map((ticket) => serializeTicket(ticket, 'customer'));

    return {
      role: 'customer',
      customerId: customer._id.toString(),
      business: {
        id: business._id.toString(),
        name: business.name,
        slug: business.slug,
      },
      stats: {
        activeTickets,
        awaitingApproval,
        readyForPickup,
        completedTickets,
      },
      recentTickets,
    };
  }

  /**
   * Get bounded, timezone-aware reports overview (Owner only)
   */
  static async getReportOverview(
    businessId: string,
    _callerUserId: string,
    query?: ReportOverviewQueryParams,
  ) {
    validateObjectId(businessId, 'Business');

    const business = await Business.findById(businessId);
    if (!business || !business.isActive) {
      throw new AppError('Business not found or inactive', 404);
    }

    const businessObjectId = new mongoose.Types.ObjectId(businessId);

    // Date range parsing & bounding
    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    if (query?.startDate) {
      startDate = new Date(query.startDate);
    } else {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    }

    if (query?.endDate) {
      endDate = new Date(query.endDate);
    } else {
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    }

    if (startDate > endDate) {
      throw new AppError('startDate cannot be after endDate', 400, 'INVALID_DATE_RANGE');
    }

    const diffDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays > 366) {
      throw new AppError('Date range cannot exceed 366 days', 400, 'DATE_RANGE_TOO_LARGE');
    }

    // Parallel aggregations
    const [
      revenueByMethodAgg,
      totalRevenueAgg,
      completedTicketsInPeriod,
      incomingTicketsCount,
      statusCountsAgg,
      technicians,
      unpaidInvoices,
      issuedInPeriodAgg,
    ] = await Promise.all([
      // 1. Payments broken down by paymentMethod
      ServiceInvoice.aggregate([
        { $match: { businessId: businessObjectId } },
        { $unwind: '$payments' },
        { $match: { 'payments.paidAt': { $gte: startDate, $lte: endDate } } },
        {
          $group: {
            _id: '$payments.paymentMethod',
            total: { $sum: '$payments.amount' },
            count: { $sum: 1 },
          },
        },
      ]),
      // 2. Total revenue in period
      ServiceInvoice.aggregate([
        { $match: { businessId: businessObjectId } },
        { $unwind: '$payments' },
        { $match: { 'payments.paidAt': { $gte: startDate, $lte: endDate } } },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$payments.amount' },
            paymentCount: { $sum: 1 },
          },
        },
      ]),
      // 3. Completed tickets in period (for volume and SLA)
      ServiceTicket.find({
        businessId: businessObjectId,
        status: 'completed',
        readyAt: { $gte: startDate, $lte: endDate },
      }),
      // 4. Incoming tickets in period
      ServiceTicket.countDocuments({
        businessId: businessObjectId,
        createdAt: { $gte: startDate, $lte: endDate },
      }),
      // 5. Status distribution across all business tickets
      ServiceTicket.aggregate([
        { $match: { businessId: businessObjectId } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      // 6. Active technicians
      Technician.find({ businessId: businessObjectId, status: 'active' }),
      // 7. Unpaid invoices balance
      ServiceInvoice.find({
        businessId: businessObjectId,
        status: { $in: ['issued', 'partially_paid'] },
      }),
      // 8. Invoices issued in period
      ServiceInvoice.aggregate([
        {
          $match: {
            businessId: businessObjectId,
            issuedAt: { $gte: startDate, $lte: endDate },
          },
        },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            totalAmount: { $sum: '$totalAmount' },
          },
        },
      ]),
    ]);

    // Format revenue data
    const totalRevenue = totalRevenueAgg[0]?.totalRevenue || 0;
    const paymentCount = totalRevenueAgg[0]?.paymentCount || 0;
    const revenueByMethod: Record<string, number> = {};
    for (const item of revenueByMethodAgg) {
      revenueByMethod[item._id] = item.total;
    }

    // Format status distribution
    const statusDistribution: Record<string, number> = {
      submitted: 0,
      waiting_diagnosis: 0,
      diagnosing: 0,
      awaiting_approval: 0,
      approved: 0,
      rejected: 0,
      repairing: 0,
      quality_check: 0,
      completed: 0,
      cancelled: 0,
    };
    for (const item of statusCountsAgg) {
      if (statusDistribution[item._id] !== undefined) {
        statusDistribution[item._id] = item.count;
      }
    }

    // Overall SLA in period
    const eligibleSlaTickets = completedTicketsInPeriod.filter(
      (t) => t.approvedEstimate?.targetCompletionDate,
    );
    const metSlaTickets = eligibleSlaTickets.filter(
      (t) => t.readyAt && t.readyAt <= t.approvedEstimate!.targetCompletionDate!,
    );
    const slaPercentage =
      eligibleSlaTickets.length > 0
        ? Math.round((metSlaTickets.length / eligibleSlaTickets.length) * 100)
        : null;

    // Technician performance breakdown
    const technicianPerformance = await Promise.all(
      technicians.map(async (tech) => {
        const [activeCount, techCompletedDocs] = await Promise.all([
          ServiceTicket.countDocuments({
            businessId: businessObjectId,
            assignedTechnicianId: tech._id,
            status: { $nin: ['completed', 'cancelled'] },
          }),
          ServiceTicket.find({
            businessId: businessObjectId,
            assignedTechnicianId: tech._id,
            status: 'completed',
            readyAt: { $gte: startDate, $lte: endDate },
          }),
        ]);

        const techEligible = techCompletedDocs.filter(
          (t) => t.approvedEstimate?.targetCompletionDate,
        );
        const techMet = techEligible.filter(
          (t) => t.readyAt && t.readyAt <= t.approvedEstimate!.targetCompletionDate!,
        );
        const techSla =
          techEligible.length > 0
            ? Math.round((techMet.length / techEligible.length) * 100)
            : null;

        // Average completion days
        let avgDays: number | null = null;
        if (techCompletedDocs.length > 0) {
          const totalDurationMs = techCompletedDocs.reduce((acc, t) => {
            const startT = t.repairStartedAt || t.createdAt;
            const endT = t.readyAt || now;
            return acc + (endT.getTime() - startT.getTime());
          }, 0);
          avgDays = parseFloat((totalDurationMs / (techCompletedDocs.length * 86400000)).toFixed(1));
        }

        return {
          technicianId: tech._id.toString(),
          name: tech.name,
          email: tech.email,
          specializations: tech.specializations || [],
          activeTickets: activeCount,
          completedInPeriod: techCompletedDocs.length,
          slaPercentage: techSla,
          avgCompletionDays: avgDays,
        };
      }),
    );

    const unpaidInvoicesBalance = unpaidInvoices.reduce((acc, inv) => acc + inv.balance, 0);

    return {
      period: {
        startDate,
        endDate,
        days: diffDays,
        timezone: business.timezone || 'Asia/Jakarta',
      },
      revenue: {
        totalRevenue,
        paymentCount,
        byMethod: revenueByMethod,
      },
      volume: {
        ticketsCompleted: completedTicketsInPeriod.length,
        ticketsReceived: incomingTicketsCount,
      },
      sla: {
        eligibleTickets: eligibleSlaTickets.length,
        metTickets: metSlaTickets.length,
        percentage: slaPercentage,
      },
      statusDistribution,
      invoices: {
        issuedInPeriodCount: issuedInPeriodAgg[0]?.count || 0,
        issuedInPeriodTotal: issuedInPeriodAgg[0]?.totalAmount || 0,
        unpaidInvoicesCount: unpaidInvoices.length,
        unpaidInvoicesBalance,
      },
      technicians: technicianPerformance,
    };
  }
}

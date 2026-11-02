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

function businessDateBoundary(dateInput: string, timezone: string, endOfDay = false): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) return new Date(dateInput);

  const [year, month, day] = dateInput.split('-').map(Number);
  const dayStartUtc = Date.UTC(year, month - 1, day + (endOfDay ? 1 : 0));
  let boundary = dayStartUtc;
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });

  // Convert local midnight to UTC by correcting the timezone offset.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = Object.fromEntries(formatter.formatToParts(new Date(boundary)).map(({ type, value }) => [type, value]));
    const localAsUtc = Date.UTC(
      Number(parts.year), Number(parts.month) - 1, Number(parts.day),
      Number(parts.hour), Number(parts.minute), Number(parts.second),
    );
    const correctedBoundary = dayStartUtc - (localAsUtc - boundary);
    if (correctedBoundary === boundary) break;
    boundary = correctedBoundary;
  }

  return new Date(boundary - (endOfDay ? 1 : 0));
}

function currentBusinessDate(now: Date, timezone: string): string {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now).map(({ type, value }) => [type, value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function businessMonthKey(date: Date, timezone: string): string {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(date).map(({ type, value }) => [type, value]));
  return `${parts.year}-${parts.month}`;
}

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
        unpaidInvoices,
        completedTicketsInMonth,
      ] = await Promise.all([
        ServiceTicket.countDocuments({ deletedAt: { $exists: false },
          businessId: businessObjectId,
          status: { $nin: ['completed', 'cancelled'] },
        }),
        ServiceTicket.countDocuments({ deletedAt: { $exists: false },
          businessId: businessObjectId,
          status: 'awaiting_approval',
        }),
        ServiceTicket.countDocuments({ deletedAt: { $exists: false },
          businessId: businessObjectId,
          status: 'repairing',
        }),
        ServiceTicket.countDocuments({ deletedAt: { $exists: false },
          businessId: businessObjectId,
          status: 'completed',
          $or: [{ handedOverAt: { $exists: false } }, { handedOverAt: null }],
        }),
        ServiceTicket.countDocuments({ deletedAt: { $exists: false },
          businessId: businessObjectId,
          status: 'completed',
        }),
        ServiceTicket.countDocuments({ deletedAt: { $exists: false },
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
        ServiceTicket.find({ deletedAt: { $exists: false }, businessId: businessObjectId })
          .sort({ createdAt: -1 })
          .limit(5)
          .populate([
            { path: 'customerId', select: 'name email phone userId' },
            { path: 'assignedTechnicianId', select: 'name email phone specializations' },
            { path: 'requestedServiceId', select: 'name category basePrice estimatedDuration' },
          ]),
        // Unpaid or partially paid invoices
        ServiceInvoice.find({
          businessId: businessObjectId,
          status: { $in: ['issued', 'partially_paid'] },
        }),
        // Completed in current month for MTD SLA
        ServiceTicket.find({ deletedAt: { $exists: false },
          businessId: businessObjectId,
          status: 'completed',
          readyAt: { $gte: startOfMonth, $lte: endOfMonth },
        }),
      ]);

      const recentTickets = recentDocs.map((ticket) => serializeTicket(ticket, 'owner'));
      const revenueThisMonth = completedTicketsInMonth.reduce((sum, ticket) => (
        ticket.approvedEstimate?.status === 'approved'
          ? sum + ticket.approvedEstimate.totalAmount
          : sum
      ), 0);
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
        deadlineDocs,
        urgentCount,
      ] = await Promise.all([
        ServiceTicket.countDocuments({ deletedAt: { $exists: false },
          businessId: businessObjectId,
          assignedTechnicianId: technician._id,
          status: { $nin: ['completed', 'cancelled'] },
        }),
        ServiceTicket.countDocuments({ deletedAt: { $exists: false },
          businessId: businessObjectId,
          assignedTechnicianId: technician._id,
          status: { $in: ['submitted', 'waiting_diagnosis'] },
        }),
        ServiceTicket.countDocuments({ deletedAt: { $exists: false },
          businessId: businessObjectId,
          assignedTechnicianId: technician._id,
          status: 'diagnosing',
        }),
        ServiceTicket.countDocuments({ deletedAt: { $exists: false },
          businessId: businessObjectId,
          assignedTechnicianId: technician._id,
          status: 'awaiting_approval',
        }),
        ServiceTicket.countDocuments({ deletedAt: { $exists: false },
          businessId: businessObjectId,
          assignedTechnicianId: technician._id,
          status: 'repairing',
        }),
        ServiceTicket.countDocuments({ deletedAt: { $exists: false },
          businessId: businessObjectId,
          assignedTechnicianId: technician._id,
          status: 'quality_check',
        }),
        ServiceTicket.countDocuments({ deletedAt: { $exists: false },
          businessId: businessObjectId,
          assignedTechnicianId: technician._id,
          status: 'completed',
        }),
        ServiceTicket.find({ deletedAt: { $exists: false },
          businessId: businessObjectId,
          assignedTechnicianId: technician._id,
        })
          .sort({ createdAt: -1 })
          .limit(5)
          .populate([
            { path: 'customerId', select: 'name email phone userId' },
            { path: 'assignedTechnicianId', select: 'name email phone specializations' },
            { path: 'requestedServiceId', select: 'name category basePrice estimatedDuration' },
          ]),
        ServiceTicket.find({ deletedAt: { $exists: false }, businessId: businessObjectId, assignedTechnicianId: technician._id,
          status: { $nin: ['completed', 'cancelled', 'rejected'] }, nextDeadlineAt: { $lte: new Date(Date.now() + 86400000) } })
          .sort({ nextDeadlineAt: 1, _id: 1 }).limit(20).populate('customerId', 'name email phone userId'),
        ServiceTicket.countDocuments({ deletedAt: { $exists: false }, businessId: businessObjectId, assignedTechnicianId: technician._id,
          status: { $nin: ['completed', 'cancelled', 'rejected'] }, nextDeadlineAt: { $lte: new Date(Date.now() + 86400000) } }),
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
          urgentCount,
        },
        deadlineTickets: deadlineDocs.map((ticket) => serializeTicket(ticket, 'technician', true)),
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
      ServiceTicket.countDocuments({ deletedAt: { $exists: false },
        businessId: businessObjectId,
        customerId: customer._id,
        status: { $nin: ['completed', 'cancelled'] },
      }),
      ServiceTicket.countDocuments({ deletedAt: { $exists: false },
        businessId: businessObjectId,
        customerId: customer._id,
        status: 'awaiting_approval',
      }),
      ServiceTicket.countDocuments({ deletedAt: { $exists: false },
        businessId: businessObjectId,
        customerId: customer._id,
        status: 'completed',
        $or: [{ handedOverAt: { $exists: false } }, { handedOverAt: null }],
      }),
      ServiceTicket.countDocuments({ deletedAt: { $exists: false },
        businessId: businessObjectId,
        customerId: customer._id,
        status: { $in: ['completed', 'cancelled'] },
      }),
      ServiceTicket.find({ deletedAt: { $exists: false },
        businessId: businessObjectId,
        customerId: customer._id,
      })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate([
          { path: 'customerId', select: 'name email phone userId' },
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
    const timezone = business.timezone || 'Asia/Jakarta';
    const businessToday = currentBusinessDate(now, timezone);
    let startDate: Date;
    let endDate: Date;

    const startInput = query?.startDate || `${businessToday.slice(0, 7)}-01`;
    const endInput = query?.endDate || businessToday;
    startDate = businessDateBoundary(startInput, timezone);
    endDate = businessDateBoundary(endInput, timezone, true);

    if (startDate > endDate) {
      throw new AppError('startDate cannot be after endDate', 400, 'INVALID_DATE_RANGE');
    }

    const diffDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays > 366) {
      throw new AppError('Date range cannot exceed 366 days', 400, 'DATE_RANGE_TOO_LARGE');
    }

    // Parallel aggregations
    const [
      completedTicketsInPeriod,
      incomingTicketsCount,
      statusCountsAgg,
      technicians,
      unpaidInvoices,
      issuedInPeriodAgg,
    ] = await Promise.all([
      // 1. Completed tickets in period (for revenue, volume, and SLA)
      ServiceTicket.find({ deletedAt: { $exists: false },
        businessId: businessObjectId,
        status: 'completed',
        readyAt: { $gte: startDate, $lte: endDate },
      }),
      // 2. Incoming tickets in period
      ServiceTicket.countDocuments({ deletedAt: { $exists: false },
        businessId: businessObjectId,
        createdAt: { $gte: startDate, $lte: endDate },
      }),
      // 3. Status distribution across all business tickets
      ServiceTicket.aggregate([
        { $match: { deletedAt: { $exists: false }, businessId: businessObjectId } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      // 4. Active technicians
      Technician.find({ businessId: businessObjectId, status: 'active' }),
      // 5. Unpaid invoices balance
      ServiceInvoice.find({
        businessId: businessObjectId,
        status: { $in: ['issued', 'partially_paid'] },
      }),
      // 6. Invoices issued in period
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

    // Offline service transactions are not recorded as app payments. Count the
    // approved estimate only after the ticket is completed; rejected estimates
    // and tickets without an approved estimate do not contribute revenue.
    const revenueTickets = completedTicketsInPeriod.filter(
      (ticket) => ticket.status === 'completed' && ticket.approvedEstimate?.status === 'approved',
    );
    const totalRevenue = revenueTickets.reduce(
      (sum, ticket) => sum + (ticket.approvedEstimate?.totalAmount || 0),
      0,
    );
    const monthlyRevenue = new Map<string, { totalRevenue: number; serviceCount: number }>();
    for (const ticket of revenueTickets) {
      if (!ticket.readyAt) continue;
      const month = businessMonthKey(ticket.readyAt, timezone);
      const current = monthlyRevenue.get(month) || { totalRevenue: 0, serviceCount: 0 };
      current.totalRevenue += ticket.approvedEstimate?.totalAmount || 0;
      current.serviceCount += 1;
      monthlyRevenue.set(month, current);
    }

    const [startYear, startMonth] = businessMonthKey(startDate, timezone).split('-').map(Number);
    const [endYear, endMonth] = businessMonthKey(endDate, timezone).split('-').map(Number);
    const monthlyRevenueSeries: { month: string; label: string; totalRevenue: number; serviceCount: number }[] = [];
    let monthCursor = new Date(Date.UTC(startYear, startMonth - 1, 1));
    const lastMonth = new Date(Date.UTC(endYear, endMonth - 1, 1));
    while (monthCursor <= lastMonth) {
      const year = monthCursor.getUTCFullYear();
      const monthNumber = monthCursor.getUTCMonth() + 1;
      const month = `${year}-${String(monthNumber).padStart(2, '0')}`;
      const label = new Intl.DateTimeFormat('id-ID', {
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC',
      }).format(new Date(Date.UTC(year, monthNumber - 1, 15)));
      const totals = monthlyRevenue.get(month) || { totalRevenue: 0, serviceCount: 0 };
      monthlyRevenueSeries.push({ month, label, ...totals });
      monthCursor = new Date(Date.UTC(year, monthNumber, 1));
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
          ServiceTicket.countDocuments({ deletedAt: { $exists: false },
            businessId: businessObjectId,
            assignedTechnicianId: tech._id,
            status: { $nin: ['completed', 'cancelled'] },
          }),
          ServiceTicket.find({ deletedAt: { $exists: false },
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
        timezone,
      },
      revenue: {
        totalRevenue,
        serviceCount: revenueTickets.length,
        byMonth: monthlyRevenueSeries,
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

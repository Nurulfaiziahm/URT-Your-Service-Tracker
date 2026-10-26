import type { TicketStatus } from '../tickets/status';

export interface TechnicianPerformance {
  technicianId: string;
  name: string;
  email: string;
  specializations: string[];
  activeTickets: number;
  completedInPeriod: number;
  slaPercentage: number | null;
  avgCompletionDays: number | null;
}

export interface ReportOverviewData {
  period: {
    startDate: string;
    endDate: string;
    days: number;
    timezone: string;
  };
  revenue: {
    totalRevenue: number;
    paymentCount: number;
    byMethod: Record<string, number>;
  };
  volume: {
    ticketsCompleted: number;
    ticketsReceived: number;
  };
  sla: {
    eligibleTickets: number;
    metTickets: number;
    percentage: number | null;
  };
  statusDistribution: Record<TicketStatus, number>;
  invoices: {
    issuedInPeriodCount: number;
    issuedInPeriodTotal: number;
    unpaidInvoicesCount: number;
    unpaidInvoicesBalance: number;
  };
  technicians: TechnicianPerformance[];
}

export interface ReportOverviewQueryParams {
  startDate?: string;
  endDate?: string;
}

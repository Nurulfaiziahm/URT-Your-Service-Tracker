import type { ServiceTicket } from '../tickets/types';

export interface OwnerDashboardStats {
  activeTickets: number;
  awaitingApproval: number;
  inRepair: number;
  readyForPickup: number;
  completedTotal: number;
  rejectedCount: number;
  totalCustomers: number;
  activeTechnicians: number;
}

export interface OwnerDashboardData {
  role: 'owner';
  business: {
    id: string;
    name: string;
    slug: string;
    timezone: string;
  };
  stats: OwnerDashboardStats;
  financial?: {
    revenueThisMonth: number;
    unpaidInvoicesCount: number;
    unpaidInvoicesBalance: number;
    slaPercentage: number | null;
  };
  subscription?: {
    planName: string | null;
    currentPeriodStart?: string | null;
    currentPeriodEnd?: string | null;
    status: string;
    daysRemaining: number;
  };
  recentTickets: ServiceTicket[];
}

export interface TechnicianDashboardStats {
  urgentCount: number;
  myActiveTickets: number;
  waitingDiagnosis: number;
  diagnosing: number;
  awaitingApproval: number;
  repairing: number;
  qualityCheck: number;
  completed: number;
}

export interface TechnicianDashboardData {
  deadlineTickets: ServiceTicket[];
  role: 'technician';
  technicianId: string;
  business: {
    id: string;
    name: string;
    slug: string;
  };
  stats: TechnicianDashboardStats;
  recentTickets: ServiceTicket[];
}

export interface CustomerDashboardStats {
  activeTickets: number;
  awaitingApproval: number;
  readyForPickup: number;
  completedTickets: number;
}

export interface CustomerDashboardData {
  role: 'customer';
  customerId: string;
  business: {
    id: string;
    name: string;
    slug: string;
  };
  stats: CustomerDashboardStats;
  recentTickets: ServiceTicket[];
}

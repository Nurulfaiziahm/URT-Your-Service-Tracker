import type { TicketStatus } from './status';

export interface DeviceInfo {
  category: string;
  brand?: string;
  model: string;
  serialNumber?: string;
  accessories?: string[];
  condition?: string;
}

export interface TimelineEvent {
  id?: string;
  status: TicketStatus;
  action: string;
  actorId?: string;
  actorRole: 'owner' | 'technician' | 'customer' | 'system';
  actorName: string;
  note?: string;
  isPublic: boolean;
  timestamp: string;
}

export interface SerializedAttachment {
  id?: string;
  key: string;
  originalName: string;
  mimeType: string;
  size: number;
  visibility: 'customer' | 'staff';
  uploadedBy: string;
  uploadedByName: string;
  uploadedAt: string;
}

export interface EstimateLine {
  id?: string;
  description: string;
  type: 'part' | 'labor';
  quantity: number;
  unitPrice: number;
  subtotal?: number;
}

export interface EstimateRevision {
  version: number;
  lines: EstimateLine[];
  currency: string;
  totalAmount: number;
  customerExplanation?: string;
  targetCompletionDate?: string;
  submittedAt: string;
  submittedBy?: string;
  status: 'pending' | 'approved' | 'rejected' | 'superseded';
  decision?: {
    decision: 'approved' | 'rejected';
    reason?: string;
    decidedAt: string;
  };
}

export interface ServiceTicket {
  id: string;
  businessId: string;
  ticketCode: string;
  customerId: string;
  customer?: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
  };
  assignedTechnicianId?: string;
  technician?: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    specializations: string[];
  };
  requestedServiceId?: string;
  service?: {
    id: string;
    name: string;
    category: string;
    basePrice: number;
    estimatedDuration?: string;
  };
  device: DeviceInfo;
  complaint: string;
  intakeMethod: 'walk_in' | 'online';
  status: TicketStatus;
  revision: number;
  intakeReceivedAt?: string;
  readyAt?: string;
  handedOverAt?: string;
  cancellationReason?: string;
  diagnosis?: {
    staffFindings?: string;
    customerExplanation?: string;
    diagnosedAt?: string;
  };
  estimateDraft?: {
    lines: EstimateLine[];
    currency: string;
    totalAmount: number;
    targetCompletionDate?: string;
    notes?: string;
    updatedAt?: string;
  };
  estimateRevisions?: EstimateRevision[];
  approvedEstimate?: EstimateRevision;
  workSummary?: string;
  repairStartedAt?: string;
  repairCompletedAt?: string;
  qualityCheck?: {
    passed: boolean;
    notes?: string;
    checkedAt?: string;
    checkedBy?: string;
  };
  warranty?: {
    days: number;
    terms?: string;
    expiresAt?: string;
  };
  handover?: {
    handedOverTo: string;
    notes?: string;
    handedOverAt: string;
    handedOverBy?: string;
  };
  attachments?: SerializedAttachment[];
  timeline: TimelineEvent[];
  allowedActions: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateTicketInput {
  customerId?: string;
  device: DeviceInfo;
  complaint: string;
  requestedServiceId?: string;
  assignedTechnicianId?: string;
  intakeMethod?: 'walk_in' | 'online';
}

export interface AssignTechnicianInput {
  expectedRevision: number;
  assignedTechnicianId: string;
  reason?: string;
}

export interface UpdateIntakeInput {
  expectedRevision: number;
  device?: Partial<DeviceInfo>;
  complaint?: string;
  requestedServiceId?: string;
}

export interface DiagnosisInput {
  expectedRevision: number;
  staffFindings?: string;
  customerExplanation: string;
}

export interface EstimateDraftInput {
  expectedRevision: number;
  lines: EstimateLine[];
  targetCompletionDate?: string;
  notes?: string;
}

export interface SubmitEstimateInput {
  expectedRevision: number;
  customerExplanation?: string;
  lines?: EstimateLine[];
  targetCompletionDate?: string;
}

export interface ApprovalInput {
  expectedRevision: number;
  estimateVersion: number;
  decision: 'approved' | 'rejected';
  reason?: string;
}

export interface TransitionTicketInput {
  expectedRevision: number;
  targetStatus:
    | 'waiting_diagnosis'
    | 'diagnosing'
    | 'repairing'
    | 'quality_check'
    | 'completed'
    | 'cancelled';
  reason?: string;
  workSummary?: string;
  qcPassed?: boolean;
  qcNotes?: string;
  warrantyDays?: number;
  warrantyTerms?: string;
}

export interface HandoverInput {
  expectedRevision: number;
  handedOverTo: string;
  notes?: string;
}

export interface TicketQueryParams {
  page?: number;
  limit?: number;
  q?: string;
  status?: TicketStatus;
  customerId?: string;
  technicianId?: string;
}

export interface PublicTrackingInput {
  businessSlug: string;
  ticketCode: string;
  trackingSecret: string;
}

export interface PublicTrackingResult {
  ticketCode: string;
  status: TicketStatus;
  statusLabel: string;
  currentStep: number;
  device: {
    category: string;
    brand?: string;
    model: string;
  };
  complaint: string;
  business: {
    name: string;
    slug: string;
    phone?: string;
  };
  receivedAt: string;
  readyAt?: string;
  handedOverAt?: string;
  timeline: {
    status: TicketStatus;
    action: string;
    actorRole: string;
    note?: string;
    timestamp: string;
  }[];
}

export interface TrackingAccessResponse {
  ticketCode: string;
  trackingSecret: string;
  revision: number;
}

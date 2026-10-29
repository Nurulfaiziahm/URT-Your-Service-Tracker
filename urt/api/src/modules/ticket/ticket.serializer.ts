import {
  IServiceTicket,
  TimelineActorRole,
  TicketStatus,
  IEstimateLine,
  IEstimateRevision,
  IWarranty,
  IHandover,
  AttachmentVisibility,
} from '../../models/ServiceTicket.model.js';

export interface SerializedAttachment {
  id?: string;
  key: string;
  originalName: string;
  mimeType: string;
  size: number;
  visibility: AttachmentVisibility;
  uploadedBy: string;
  uploadedByName: string;
  uploadedAt: Date;
}

export interface SerializedTimelineEvent {
  id?: string;
  status: TicketStatus;
  action: string;
  actorId?: string;
  actorRole: TimelineActorRole;
  actorName: string;
  note?: string;
  isPublic: boolean;
  timestamp: Date;
}

export interface SerializedTicket {
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
  device: {
    category: string;
    brand?: string;
    model: string;
    serialNumber?: string;
    accessories: string[];
    condition?: string;
  };
  complaint: string;
  intakeMethod: 'walk_in' | 'online';
  status: TicketStatus;
  revision: number;
  intakeReceivedAt?: Date;
  readyAt?: Date;
  handedOverAt?: Date;
  cancellationReason?: string;
  diagnosis?: {
    staffFindings?: string;
    customerExplanation?: string;
    diagnosedAt?: Date;
  };
  estimateDraft?: {
    lines: IEstimateLine[];
    currency: string;
    totalAmount: number;
    targetCompletionDate?: Date;
    notes?: string;
    updatedAt?: Date;
  };
  estimateRevisions: IEstimateRevision[];
  approvedEstimate?: IEstimateRevision;
  workSummary?: string;
  repairStartedAt?: Date;
  repairCompletedAt?: Date;
  qualityCheck?: {
    passed: boolean;
    notes?: string;
    checkedAt?: Date;
  };
  warranty?: IWarranty;
  handover?: IHandover;
  attachments: SerializedAttachment[];
  timeline: SerializedTimelineEvent[];
  allowedActions: string[];
  createdAt: Date;
  updatedAt: Date;
}

export const computeAllowedActions = (
  ticket: IServiceTicket,
  callerRole: 'owner' | 'technician' | 'customer',
  isAssignedTechnician = false,
): string[] => {
  const actions: string[] = [];

  if (callerRole === 'owner') {
    switch (ticket.status) {
      case 'submitted':
        actions.push('accept_intake', 'assign_technician', 'correct_intake', 'cancel');
        break;
      case 'waiting_diagnosis':
        actions.push('assign_technician', 'correct_intake', 'cancel', 'start_diagnosis');
        break;
      case 'rejected':
        actions.push('cancel', 'reopen_diagnosis', 'reassign_technician');
        break;
      case 'diagnosing':
      case 'awaiting_approval':
      case 'approved':
      case 'repairing':
      case 'quality_check':
        actions.push('reassign_technician');
        break;
      case 'completed':
        if (!ticket.handover?.handedOverAt) {
          actions.push('handover');
        }
        actions.push('issue_invoice');
        break;
      default:
        break;
    }
  } else if (callerRole === 'technician') {
    if (isAssignedTechnician) {
      switch (ticket.status) {
        case 'waiting_diagnosis':
          actions.push('start_diagnosis');
          break;
        case 'diagnosing':
          actions.push('save_diagnosis', 'save_estimate_draft', 'submit_estimate');
          break;
        case 'approved':
          actions.push('start_repair', 'revise_estimate');
          break;
        case 'repairing':
          actions.push('submit_qc', 'revise_estimate');
          break;
        case 'quality_check':
          actions.push('pass_qc', 'fail_qc');
          break;
        case 'rejected':
          actions.push('reopen_diagnosis');
          break;
        default:
          break;
      }
    }
  } else if (callerRole === 'customer') {
    switch (ticket.status) {
      case 'submitted':
      case 'waiting_diagnosis':
        actions.push('cancel');
        break;
      case 'awaiting_approval':
        actions.push('approve_estimate', 'reject_estimate');
        break;
      default:
        break;
    }
  }

  return actions;
};

export const serializeTicket = (
  ticket: IServiceTicket & {
    customerId?: any;
    assignedTechnicianId?: any;
    requestedServiceId?: any;
  },
  callerRole: 'owner' | 'technician' | 'customer',
  isAssignedTechnician = false,
): SerializedTicket => {
  const isCustomer = callerRole === 'customer';

  // Exclude internal staff notes from customer responses
  const timeline: SerializedTimelineEvent[] = (ticket.timeline || [])
    .filter((event) => !isCustomer || event.isPublic)
    .map((event) => ({
      id: event._id?.toString(),
      status: event.status,
      action: event.action,
      actorId: event.actorId?.toString(),
      actorRole: event.actorRole,
      actorName: event.actorName,
      note: event.note,
      isPublic: event.isPublic,
      timestamp: event.timestamp,
    }));

  const customerPopulated =
    ticket.customerId && typeof ticket.customerId === 'object' && 'name' in ticket.customerId;
  const technicianPopulated =
    ticket.assignedTechnicianId &&
    typeof ticket.assignedTechnicianId === 'object' &&
    'name' in ticket.assignedTechnicianId;
  const servicePopulated =
    ticket.requestedServiceId &&
    typeof ticket.requestedServiceId === 'object' &&
    'name' in ticket.requestedServiceId;

  // Diagnosis view: hide internal findings from customer
  let diagnosisData: SerializedTicket['diagnosis'] = undefined;
  if (ticket.diagnosis) {
    diagnosisData = {
      customerExplanation: ticket.diagnosis.customerExplanation,
      diagnosedAt: ticket.diagnosis.diagnosedAt,
      ...(isCustomer ? {} : { staffFindings: ticket.diagnosis.staffFindings }),
    };
  }

  // Estimate draft: hidden from customer (customer only sees submitted revisions)
  const estimateDraftData =
    isCustomer || !ticket.estimateDraft
      ? undefined
      : {
          lines: ticket.estimateDraft.lines,
          currency: ticket.estimateDraft.currency,
          totalAmount: ticket.estimateDraft.totalAmount,
          targetCompletionDate: ticket.estimateDraft.targetCompletionDate,
          notes: ticket.estimateDraft.notes,
          updatedAt: ticket.estimateDraft.updatedAt,
        };

  return {
    id: ticket._id.toString(),
    businessId: ticket.businessId.toString(),
    ticketCode: ticket.ticketCode,
    customerId: customerPopulated ? ticket.customerId._id.toString() : ticket.customerId.toString(),
    ...(customerPopulated && {
      customer: {
        id: ticket.customerId._id.toString(),
        name: ticket.customerId.name,
        email: ticket.customerId.email,
        phone: ticket.customerId.phone,
      },
    }),
    assignedTechnicianId: ticket.assignedTechnicianId
      ? technicianPopulated
        ? ticket.assignedTechnicianId._id.toString()
        : ticket.assignedTechnicianId.toString()
      : undefined,
    ...(technicianPopulated && {
      technician: {
        id: ticket.assignedTechnicianId._id.toString(),
        name: ticket.assignedTechnicianId.name,
        email: ticket.assignedTechnicianId.email,
        phone: ticket.assignedTechnicianId.phone,
        specializations: ticket.assignedTechnicianId.specializations || [],
      },
    }),
    requestedServiceId: ticket.requestedServiceId
      ? servicePopulated
        ? ticket.requestedServiceId._id.toString()
        : ticket.requestedServiceId.toString()
      : undefined,
    ...(servicePopulated && {
      service: {
        id: ticket.requestedServiceId._id.toString(),
        name: ticket.requestedServiceId.name,
        category: ticket.requestedServiceId.category,
        basePrice: ticket.requestedServiceId.basePrice,
        estimatedDuration: ticket.requestedServiceId.estimatedDuration,
      },
    }),
    device: {
      category: ticket.device.category,
      brand: ticket.device.brand,
      model: ticket.device.model,
      serialNumber: ticket.device.serialNumber,
      accessories: ticket.device.accessories || [],
      condition: ticket.device.condition,
    },
    complaint: ticket.complaint,
    intakeMethod: ticket.intakeMethod,
    status: ticket.status,
    revision: ticket.revision,
    intakeReceivedAt: ticket.intakeReceivedAt,
    readyAt: ticket.readyAt,
    handedOverAt: ticket.handedOverAt,
    cancellationReason: ticket.cancellationReason,
    diagnosis: diagnosisData,
    estimateDraft: estimateDraftData,
    estimateRevisions: ticket.estimateRevisions || [],
    approvedEstimate: ticket.approvedEstimate,
    workSummary: ticket.workSummary,
    repairStartedAt: ticket.repairStartedAt,
    repairCompletedAt: ticket.repairCompletedAt,
    qualityCheck: ticket.qualityCheck
      ? {
          passed: ticket.qualityCheck.passed,
          notes: isCustomer ? undefined : ticket.qualityCheck.notes,
          checkedAt: ticket.qualityCheck.checkedAt,
        }
      : undefined,
    warranty: ticket.warranty,
    handover: ticket.handover,
    attachments: (ticket.attachments || [])
      .filter((att) => (isCustomer ? att.visibility === 'customer' : true))
      .map((att) => ({
        id: att._id?.toString(),
        key: att.key,
        originalName: att.originalName,
        mimeType: att.mimeType,
        size: att.size,
        visibility: att.visibility,
        uploadedBy: att.uploadedBy.toString(),
        uploadedByName: att.uploadedByName,
        uploadedAt: att.uploadedAt,
      })),
    timeline,
    allowedActions: computeAllowedActions(ticket, callerRole, isAssignedTechnician),
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt,
  };
};

import mongoose from 'mongoose';
import crypto from 'crypto';
import {
  ServiceTicket,
  IServiceTicket,
  IEstimateLine,
  IEstimateRevision,
} from '../../models/ServiceTicket.model.js';
import { Customer } from '../../models/Customer.model.js';
import { Technician } from '../../models/Technician.model.js';
import { Service } from '../../models/Service.model.js';
import { Business } from '../../models/Business.model.js';
import { File } from '../../models/File.model.js';
import { AppError } from '../../middleware/error-handler.js';
import { validateObjectId } from '../business/business.access.js';
import { signDownload } from '../../lib/storage/r2.js';
import { mailService } from '../../lib/mail/index.js';
import { logger } from '../../utils/logger.js';
import {
  CreateTicketInput,
  UpdateIntakeInput,
  AssignTechnicianInput,
  DiagnosisInput,
  EstimateDraftInput,
  SubmitEstimateInput,
  ApprovalInput,
  HandoverInput,
  TicketQueryParams,
  TicketTransitionInput,
  PublicTrackingInput,
  AddAttachmentInput,
} from './ticket.schema.js';

export class TicketService {
  /**
   * Generate a readable random ticket code: URT-YYYY-XXXX (e.g. URT-2026-X8F2)
   */
  private static async generateUniqueTicketCode(
    businessId: mongoose.Types.ObjectId,
  ): Promise<string> {
    const year = new Date().getFullYear();
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

    for (let attempt = 0; attempt < 5; attempt++) {
      let randomSuffix = '';
      const randomBytes = crypto.randomBytes(4);
      for (let i = 0; i < 4; i++) {
        randomSuffix += chars[randomBytes[i] % chars.length];
      }
      const ticketCode = `URT-${year}-${randomSuffix}`;

      const exists = await ServiceTicket.exists({ businessId, ticketCode });
      if (!exists) {
        return ticketCode;
      }
    }

    return `URT-${year}-${Date.now().toString(36).toUpperCase()}`;
  }

  /**
   * Helper to verify that caller is the active assigned technician for this ticket
   */
  private static async verifyAssignedTechnician(
    businessId: mongoose.Types.ObjectId,
    ticket: IServiceTicket,
    callerUserId: string,
  ): Promise<any> {
    const technician = await Technician.findOne({
      businessId,
      userId: new mongoose.Types.ObjectId(callerUserId),
      status: 'active',
    });

    if (!technician || !ticket.assignedTechnicianId || ticket.assignedTechnicianId.toString() !== technician._id.toString()) {
      throw new AppError('Only the assigned technician can perform this action', 403, 'FORBIDDEN');
    }

    return technician;
  }

  /**
   * Create a service ticket (Customer self-submission or Owner walk-in intake)
   */
  static async createTicket(
    businessId: string,
    callerUser: {
      id?: string;
      email?: string;
      firstName?: string;
      lastName?: string;
      phone?: string;
      address?: string;
    },
    isOwner: boolean,
    input: CreateTicketInput,
    selfService?: { trackingSecret: string },
  ): Promise<IServiceTicket> {
    validateObjectId(businessId, 'Business');

    const business = await Business.findById(businessId);
    if (!business || !business.isActive) {
      throw new AppError('Business not found or inactive', 404);
    }

    const businessObjectId = new mongoose.Types.ObjectId(businessId);
    const callerObjectId = callerUser.id ? new mongoose.Types.ObjectId(callerUser.id) : undefined;

    let customerId: mongoose.Types.ObjectId;
    let customerName = `${callerUser.firstName || ''} ${callerUser.lastName || ''}`.trim() || callerUser.email || 'Pelanggan';
    let assignedTechObjectId: mongoose.Types.ObjectId | undefined = undefined;
    let requestedServiceObjectId: mongoose.Types.ObjectId | undefined = undefined;

    if (input.requestedServiceId) {
      validateObjectId(input.requestedServiceId, 'Service');
      const service = await Service.findOne({
        _id: new mongoose.Types.ObjectId(input.requestedServiceId),
        businessId: businessObjectId,
        status: 'active',
      });
      if (!service) {
        throw new AppError('Requested service not found or archived', 400, 'INVALID_SERVICE');
      }
      requestedServiceObjectId = service._id;
    }

    let startingStatus: 'submitted' | 'waiting_diagnosis' = 'submitted';
    let intakeReceivedAt: Date | undefined = undefined;
    const initialTimeline: IServiceTicket['timeline'] = [];

    if (isOwner) {
      if (!callerObjectId) throw new AppError('Owner authentication is required', 401);
      if (!input.customerId) {
        throw new AppError('Customer ID is required for owner walk-in intake', 400, 'CUSTOMER_REQUIRED');
      }
      validateObjectId(input.customerId, 'Customer');
      const customer = await Customer.findOne({
        _id: new mongoose.Types.ObjectId(input.customerId),
        businessId: businessObjectId,
        status: 'active',
      });
      if (!customer) {
        throw new AppError('Customer contact not found in this business', 400, 'CUSTOMER_NOT_FOUND');
      }
      customerId = customer._id;
      customerName = customer.name;

      if (input.assignedTechnicianId) {
        validateObjectId(input.assignedTechnicianId, 'Technician');
        const technician = await Technician.findOne({
          _id: new mongoose.Types.ObjectId(input.assignedTechnicianId),
          businessId: businessObjectId,
          status: 'active',
        });
        if (!technician) {
          throw new AppError('Assigned technician is not active in this business', 400, 'INVALID_TECHNICIAN');
        }
        assignedTechObjectId = technician._id;
      }

      startingStatus = 'waiting_diagnosis';
      intakeReceivedAt = new Date();

      initialTimeline.push({
        status: 'waiting_diagnosis',
        action: 'created',
        actorId: callerObjectId,
        actorRole: 'owner',
        actorName: 'Owner',
        note: 'Walk-in service intake recorded at frontdesk',
        isPublic: true,
        timestamp: new Date(),
      });

      if (assignedTechObjectId) {
        initialTimeline.push({
          status: 'waiting_diagnosis',
          action: 'assigned',
          actorId: callerObjectId,
          actorRole: 'owner',
          actorName: 'Owner',
          note: 'Assigned to technician',
          isPublic: true,
          timestamp: new Date(),
        });
      }
    } else {
      let customer = callerObjectId ? await Customer.findOne({
        businessId: businessObjectId,
        userId: callerObjectId,
      }) : null;

      if (customer?.status === 'archived') {
        throw new AppError('Customer contact is archived', 403, 'CUSTOMER_ARCHIVED');
      }

      if (customer && selfService) {
        customer.name = customerName;
        customer.phone = callerUser.phone;
        customer.email = callerUser.email;
        await customer.save();
      }

      if (!customer) {
        customer = await Customer.create({
          businessId: businessObjectId,
          userId: callerObjectId,
          name: customerName,
          email: callerUser.email,
          phone: callerUser.phone,
          address: callerUser.address,
          status: 'active',
        });
      }

      customerId = customer._id;
      customerName = customer.name;
      startingStatus = 'submitted';

      initialTimeline.push({
        status: 'submitted',
        action: 'created',
        actorId: callerObjectId,
        actorRole: 'customer',
        actorName: customerName,
        note: 'Service request submitted online by customer',
        isPublic: true,
        timestamp: new Date(),
      });
    }

    const ticketCode = await this.generateUniqueTicketCode(businessObjectId);

    const ticket = await ServiceTicket.create({
      businessId: businessObjectId,
      ticketCode,
      customerId,
      assignedTechnicianId: assignedTechObjectId,
      requestedServiceId: requestedServiceObjectId,
      device: {
        category: input.device.category,
        brand: input.device.brand,
        model: input.device.model,
        serialNumber: input.device.serialNumber,
        accessories: input.device.accessories || [],
        condition: input.device.condition,
      },
      complaint: input.complaint,
      intakeMethod: isOwner ? input.intakeMethod || 'walk_in' : 'online',
      status: startingStatus,
      revision: 1,
      ...(selfService && { trackingSecretHash: crypto.createHash('sha256').update(selfService.trackingSecret).digest('hex') }),
      intakeReceivedAt,
      timeline: initialTimeline,
    });

    const populated = (await ticket.populate([
      { path: 'customerId', select: 'name email phone' },
      { path: 'assignedTechnicianId', select: 'name email phone specializations' },
      { path: 'requestedServiceId', select: 'name category basePrice estimatedDuration' },
    ])) as IServiceTicket;

    // Send ticket-received notification (best-effort)
    try {
      const recipientEmail = (populated.customerId as any)?.email;
      if (recipientEmail) {
        mailService
          .sendTemplate({
            to: recipientEmail,
            subject: `Tiket Servis Diterima - ${ticket.ticketCode}`,
            template: 'ticket-received',
            data: {
              title: 'Tiket Servis Diterima',
              preheader: `Penerimaan servis di ${business.name}`,
              name: (populated.customerId as any)?.name || customerName,
              businessName: business.name,
              ticketCode: ticket.ticketCode,
              device: `${ticket.device.brand ? ticket.device.brand + ' ' : ''}${ticket.device.model}`,
              complaint: ticket.complaint,
              receivedAt: ticket.intakeReceivedAt || ticket.createdAt,
              timezone: business.timezone || 'Asia/Jakarta',
            },
          })
          .catch((err) => logger.error('Failed to send ticket-received email', { error: err }));
      }
    } catch (err) {
      logger.error('Error triggering ticket-received email', { error: err });
    }

    return populated;
  }

  /**
   * Get role-scoped list of tickets
   */
  static async getTickets(
    businessId: string,
    callerUserId: string,
    callerRole: 'owner' | 'technician' | 'customer',
    query?: TicketQueryParams,
  ): Promise<{ tickets: IServiceTicket[]; total: number; page: number; limit: number }> {
    validateObjectId(businessId, 'Business');

    const businessObjectId = new mongoose.Types.ObjectId(businessId);
    const callerObjectId = new mongoose.Types.ObjectId(callerUserId);
    const filter: Record<string, unknown> = { businessId: businessObjectId };

    if (callerRole === 'owner') {
      if (query?.customerId) {
        validateObjectId(query.customerId, 'Customer');
        filter.customerId = new mongoose.Types.ObjectId(query.customerId);
      }
      if (query?.technicianId) {
        validateObjectId(query.technicianId, 'Technician');
        filter.assignedTechnicianId = new mongoose.Types.ObjectId(query.technicianId);
      }
    } else if (callerRole === 'technician') {
      const technician = await Technician.findOne({
        businessId: businessObjectId,
        userId: callerObjectId,
        status: 'active',
      });
      if (!technician) {
        return { tickets: [], total: 0, page: query?.page || 1, limit: query?.limit || 20 };
      }
      filter.assignedTechnicianId = technician._id;
    } else if (callerRole === 'customer') {
      const customer = await Customer.findOne({
        businessId: businessObjectId,
        userId: callerObjectId,
        status: 'active',
      });
      if (!customer) {
        return { tickets: [], total: 0, page: query?.page || 1, limit: query?.limit || 20 };
      }
      filter.customerId = customer._id;
    }

    if (query?.status) {
      filter.status = query.status;
    }

    if (query?.q) {
      const escaped = query.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { ticketCode: { $regex: escaped, $options: 'i' } },
        { 'device.model': { $regex: escaped, $options: 'i' } },
        { 'device.brand': { $regex: escaped, $options: 'i' } },
        { complaint: { $regex: escaped, $options: 'i' } },
      ];
    }

    const page = query?.page || 1;
    const limit = query?.limit || 20;
    const skip = (page - 1) * limit;

    const [tickets, total] = await Promise.all([
      ServiceTicket.find(filter)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1, _id: -1 })
        .populate('customerId', 'name email phone')
        .populate('assignedTechnicianId', 'name email phone specializations')
        .populate('requestedServiceId', 'name category basePrice estimatedDuration'),
      ServiceTicket.countDocuments(filter),
    ]);

    return { tickets, total, page, limit };
  }

  /**
   * Get single ticket detail with role verification
   */
  static async getTicketById(
    businessId: string,
    ticketId: string,
    callerUserId: string,
    roles: Array<'owner' | 'technician' | 'customer'>,
  ): Promise<{ ticket: IServiceTicket; activeRole: 'owner' | 'technician' | 'customer'; isAssignedTechnician: boolean }> {
    validateObjectId(businessId, 'Business');
    validateObjectId(ticketId, 'ServiceTicket');

    const businessObjectId = new mongoose.Types.ObjectId(businessId);
    const ticketObjectId = new mongoose.Types.ObjectId(ticketId);

    const ticket = await ServiceTicket.findOne({
      _id: ticketObjectId,
      businessId: businessObjectId,
    })
      .populate('customerId', 'name email phone userId')
      .populate('assignedTechnicianId', 'name email phone specializations userId')
      .populate('requestedServiceId', 'name category basePrice estimatedDuration');

    if (!ticket) {
      throw new AppError('Ticket not found', 404);
    }

    let activeRole: 'owner' | 'technician' | 'customer' | null = null;
    let isAssignedTechnician = false;

    if (roles.includes('owner')) {
      activeRole = 'owner';
    } else if (roles.includes('technician')) {
      const tech = ticket.assignedTechnicianId as any;
      if (tech && tech.userId?.toString() === callerUserId) {
        activeRole = 'technician';
        isAssignedTechnician = true;
      }
    }

    if (!activeRole && roles.includes('customer')) {
      const cust = ticket.customerId as any;
      if (cust && cust.userId?.toString() === callerUserId) {
        activeRole = 'customer';
      }
    }

    if (!activeRole) {
      throw new AppError('Ticket not found', 404);
    }

    return { ticket, activeRole, isAssignedTechnician };
  }

  /**
   * Correct intake details before diagnosis begins (owner only)
   */
  static async updateIntake(
    businessId: string,
    ticketId: string,
    callerUserId: string,
    input: UpdateIntakeInput,
  ): Promise<IServiceTicket> {
    validateObjectId(businessId, 'Business');
    validateObjectId(ticketId, 'ServiceTicket');

    const ticket = await ServiceTicket.findOne({
      _id: new mongoose.Types.ObjectId(ticketId),
      businessId: new mongoose.Types.ObjectId(businessId),
    });

    if (!ticket) {
      throw new AppError('Ticket not found', 404);
    }

    if (!['submitted', 'waiting_diagnosis'].includes(ticket.status)) {
      throw new AppError('Intake details cannot be edited once diagnosis or work has begun', 400, 'INVALID_STATUS');
    }

    if (ticket.revision !== input.expectedRevision) {
      throw new AppError('Ticket has been modified by another action. Please refresh.', 409, 'TICKET_CHANGED');
    }

    if (input.requestedServiceId) {
      validateObjectId(input.requestedServiceId, 'Service');
      const service = await Service.findOne({
        _id: new mongoose.Types.ObjectId(input.requestedServiceId),
        businessId: ticket.businessId,
        status: 'active',
      });
      if (!service) {
        throw new AppError('Requested service not found or archived', 400, 'INVALID_SERVICE');
      }
      ticket.requestedServiceId = service._id;
    }

    if (input.device) {
      if (input.device.category !== undefined) ticket.device.category = input.device.category;
      if (input.device.brand !== undefined) ticket.device.brand = input.device.brand;
      if (input.device.model !== undefined) ticket.device.model = input.device.model;
      if (input.device.serialNumber !== undefined) ticket.device.serialNumber = input.device.serialNumber;
      if (input.device.accessories !== undefined) ticket.device.accessories = input.device.accessories;
      if (input.device.condition !== undefined) ticket.device.condition = input.device.condition;
    }

    if (input.complaint !== undefined) {
      ticket.complaint = input.complaint;
    }

    ticket.revision += 1;
    ticket.timeline.push({
      status: ticket.status,
      action: 'intake_corrected',
      actorId: new mongoose.Types.ObjectId(callerUserId),
      actorRole: 'owner',
      actorName: 'Owner',
      note: 'Intake details updated by owner',
      isPublic: true,
      timestamp: new Date(),
    });

    await ticket.save();

    return (await ticket.populate([
      { path: 'customerId', select: 'name email phone' },
      { path: 'assignedTechnicianId', select: 'name email phone specializations' },
      { path: 'requestedServiceId', select: 'name category basePrice estimatedDuration' },
    ])) as IServiceTicket;
  }

  /**
   * Assign or reassign technician to ticket (owner only)
   */
  static async assignTechnician(
    businessId: string,
    ticketId: string,
    callerUserId: string,
    input: AssignTechnicianInput,
  ): Promise<IServiceTicket> {
    validateObjectId(businessId, 'Business');
    validateObjectId(ticketId, 'ServiceTicket');
    validateObjectId(input.assignedTechnicianId, 'Technician');

    const businessObjectId = new mongoose.Types.ObjectId(businessId);
    const ticketObjectId = new mongoose.Types.ObjectId(ticketId);
    const techObjectId = new mongoose.Types.ObjectId(input.assignedTechnicianId);

    const [ticket, technician] = await Promise.all([
      ServiceTicket.findOne({ _id: ticketObjectId, businessId: businessObjectId }),
      Technician.findOne({ _id: techObjectId, businessId: businessObjectId, status: 'active' }),
    ]);

    if (!ticket) {
      throw new AppError('Ticket not found', 404);
    }

    if (!technician) {
      throw new AppError('Technician not found or is not active in this business', 400, 'INVALID_TECHNICIAN');
    }

    if (ticket.status === 'completed' || ticket.status === 'cancelled') {
      throw new AppError('Cannot reassign a closed or cancelled ticket', 400, 'INVALID_STATUS');
    }

    if (ticket.revision !== input.expectedRevision) {
      throw new AppError('Ticket has been modified by another action. Please refresh.', 409, 'TICKET_CHANGED');
    }

    const isReassignment = Boolean(
      ticket.assignedTechnicianId && ticket.assignedTechnicianId.toString() !== techObjectId.toString(),
    );
    const action = isReassignment ? 'reassigned' : 'assigned';

    ticket.assignedTechnicianId = techObjectId;
    ticket.revision += 1;

    if (ticket.status === 'submitted') {
      ticket.status = 'waiting_diagnosis';
    }

    ticket.timeline.push({
      status: ticket.status,
      action,
      actorId: new mongoose.Types.ObjectId(callerUserId),
      actorRole: 'owner',
      actorName: 'Owner',
      note: input.reason || `${isReassignment ? 'Reassigned' : 'Assigned'} to technician ${technician.name}`,
      isPublic: true,
      timestamp: new Date(),
    });

    await ticket.save();

    return (await ticket.populate([
      { path: 'customerId', select: 'name email phone' },
      { path: 'assignedTechnicianId', select: 'name email phone specializations' },
      { path: 'requestedServiceId', select: 'name category basePrice estimatedDuration' },
    ])) as IServiceTicket;
  }

  /**
   * Save diagnosis findings (Assigned technician only)
   */
  static async saveDiagnosis(
    businessId: string,
    ticketId: string,
    callerUserId: string,
    input: DiagnosisInput,
  ): Promise<IServiceTicket> {
    validateObjectId(businessId, 'Business');
    validateObjectId(ticketId, 'ServiceTicket');

    const businessObjectId = new mongoose.Types.ObjectId(businessId);
    const ticketObjectId = new mongoose.Types.ObjectId(ticketId);

    const ticket = await ServiceTicket.findOne({ _id: ticketObjectId, businessId: businessObjectId });
    if (!ticket) {
      throw new AppError('Ticket not found', 404);
    }

    const technician = await this.verifyAssignedTechnician(businessObjectId, ticket, callerUserId);

    if (!['waiting_diagnosis', 'diagnosing'].includes(ticket.status)) {
      throw new AppError('Diagnosis can only be saved while in diagnosis stage', 400, 'INVALID_STATUS');
    }

    if (ticket.revision !== input.expectedRevision) {
      throw new AppError('Ticket has been modified by another action. Please refresh.', 409, 'TICKET_CHANGED');
    }

    ticket.diagnosis = {
      staffFindings: input.staffFindings,
      customerExplanation: input.customerExplanation,
      diagnosedAt: new Date(),
      diagnosedBy: new mongoose.Types.ObjectId(callerUserId),
    };

    if (ticket.status === 'waiting_diagnosis') {
      ticket.status = 'diagnosing';
    }

    ticket.revision += 1;
    ticket.timeline.push({
      status: ticket.status,
      action: 'diagnosed',
      actorId: new mongoose.Types.ObjectId(callerUserId),
      actorRole: 'technician',
      actorName: technician.name,
      note: 'Diagnosis recorded by technician',
      isPublic: true,
      timestamp: new Date(),
    });

    await ticket.save();

    return (await ticket.populate([
      { path: 'customerId', select: 'name email phone' },
      { path: 'assignedTechnicianId', select: 'name email phone specializations' },
      { path: 'requestedServiceId', select: 'name category basePrice estimatedDuration' },
    ])) as IServiceTicket;
  }

  /**
   * Save mutable estimate draft (Assigned technician only)
   */
  static async saveEstimateDraft(
    businessId: string,
    ticketId: string,
    callerUserId: string,
    input: EstimateDraftInput,
  ): Promise<IServiceTicket> {
    validateObjectId(businessId, 'Business');
    validateObjectId(ticketId, 'ServiceTicket');

    const businessObjectId = new mongoose.Types.ObjectId(businessId);
    const ticketObjectId = new mongoose.Types.ObjectId(ticketId);

    const ticket = await ServiceTicket.findOne({ _id: ticketObjectId, businessId: businessObjectId });
    if (!ticket) {
      throw new AppError('Ticket not found', 404);
    }

    await this.verifyAssignedTechnician(businessObjectId, ticket, callerUserId);

    if (!['diagnosing', 'approved', 'repairing'].includes(ticket.status)) {
      throw new AppError('Estimate draft can only be saved during diagnosis or active repair', 400, 'INVALID_STATUS');
    }

    if (ticket.revision !== input.expectedRevision) {
      throw new AppError('Ticket has been modified by another action. Please refresh.', 409, 'TICKET_CHANGED');
    }

    let calculatedTotal = 0;
    const lines: IEstimateLine[] = input.lines.map((line) => {
      const lineTotal = line.quantity * line.unitPrice;
      calculatedTotal += lineTotal;
      return {
        description: line.description,
        type: line.type,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        total: lineTotal,
      };
    });

    if (!Number.isSafeInteger(calculatedTotal)) {
      throw new AppError('Calculated total exceeds safe integer amount', 400, 'INVALID_AMOUNT');
    }

    ticket.estimateDraft = {
      lines,
      currency: 'IDR',
      totalAmount: calculatedTotal,
      targetCompletionDate: input.targetCompletionDate,
      notes: input.notes,
      updatedAt: new Date(),
    };

    ticket.revision += 1;
    await ticket.save();

    return (await ticket.populate([
      { path: 'customerId', select: 'name email phone' },
      { path: 'assignedTechnicianId', select: 'name email phone specializations' },
      { path: 'requestedServiceId', select: 'name category basePrice estimatedDuration' },
    ])) as IServiceTicket;
  }

  /**
   * Submit estimate revision for customer approval (Assigned technician only)
   */
  static async submitEstimate(
    businessId: string,
    ticketId: string,
    callerUserId: string,
    input: SubmitEstimateInput,
  ): Promise<IServiceTicket> {
    validateObjectId(businessId, 'Business');
    validateObjectId(ticketId, 'ServiceTicket');

    const businessObjectId = new mongoose.Types.ObjectId(businessId);
    const ticketObjectId = new mongoose.Types.ObjectId(ticketId);

    const ticket = await ServiceTicket.findOne({ _id: ticketObjectId, businessId: businessObjectId });
    if (!ticket) {
      throw new AppError('Ticket not found', 404);
    }

    const technician = await this.verifyAssignedTechnician(businessObjectId, ticket, callerUserId);

    if (!['diagnosing', 'approved', 'repairing'].includes(ticket.status)) {
      throw new AppError(
        'Estimate can only be submitted during diagnosis or when revising repair costs',
        400,
        'INVALID_STATUS',
      );
    }

    if (ticket.revision !== input.expectedRevision) {
      throw new AppError('Ticket has been modified by another action. Please refresh.', 409, 'TICKET_CHANGED');
    }

    // Determine customer explanation
    const customerExplanation =
      input.customerExplanation || ticket.diagnosis?.customerExplanation;
    if (!customerExplanation || customerExplanation.trim().length < 3) {
      throw new AppError(
        'Customer explanation of defect/damage is required before submitting estimate',
        400,
        'EXPLANATION_REQUIRED',
      );
    }

    // Update diagnosis explanation if explicitly provided
    if (input.customerExplanation) {
      if (!ticket.diagnosis) {
        ticket.diagnosis = { customerExplanation: input.customerExplanation };
      } else {
        ticket.diagnosis.customerExplanation = input.customerExplanation;
      }
    }

    // Determine estimate lines
    let lines: IEstimateLine[];
    let totalAmount = 0;

    if (input.lines && input.lines.length > 0) {
      lines = input.lines.map((line) => {
        const lineTotal = line.quantity * line.unitPrice;
        totalAmount += lineTotal;
        return {
          description: line.description,
          type: line.type,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          total: lineTotal,
        };
      });
    } else if (ticket.estimateDraft && ticket.estimateDraft.lines.length > 0) {
      lines = ticket.estimateDraft.lines;
      totalAmount = ticket.estimateDraft.totalAmount;
    } else {
      throw new AppError('Estimate must contain at least one line item', 400, 'ESTIMATE_LINES_REQUIRED');
    }

    if (!Number.isSafeInteger(totalAmount)) {
      throw new AppError('Calculated total exceeds safe integer amount', 400, 'INVALID_AMOUNT');
    }

    const nextVersion = (ticket.estimateRevisions?.length || 0) + 1;
    const targetCompletionDate =
      input.targetCompletionDate || ticket.estimateDraft?.targetCompletionDate;

    const newRevision: IEstimateRevision = {
      version: nextVersion,
      lines,
      currency: 'IDR',
      totalAmount,
      targetCompletionDate,
      customerExplanation,
      submittedBy: new mongoose.Types.ObjectId(callerUserId),
      submittedByName: technician.name,
      submittedAt: new Date(),
      status: 'pending',
    };

    ticket.estimateRevisions.push(newRevision);
    ticket.status = 'awaiting_approval';
    ticket.revision += 1;

    ticket.timeline.push({
      status: 'awaiting_approval',
      action: 'estimate_submitted',
      actorId: new mongoose.Types.ObjectId(callerUserId),
      actorRole: 'technician',
      actorName: technician.name,
      note: `Estimate revision #${nextVersion} submitted for customer approval (Rp ${totalAmount.toLocaleString('id-ID')})`,
      isPublic: true,
      timestamp: new Date(),
    });

    await ticket.save();

    const populated = (await ticket.populate([
      { path: 'customerId', select: 'name email phone' },
      { path: 'assignedTechnicianId', select: 'name email phone specializations' },
      { path: 'requestedServiceId', select: 'name category basePrice estimatedDuration' },
    ])) as IServiceTicket;

    // Send estimate-ready notification (best-effort)
    try {
      const recipientEmail = (populated.customerId as any)?.email;
      if (recipientEmail) {
        const business = await Business.findById(businessId);
        mailService
          .sendTemplate({
            to: recipientEmail,
            subject: `Estimasi Biaya Servis Siap Ditinjau - ${ticket.ticketCode}`,
            template: 'estimate-ready',
            data: {
              title: 'Estimasi Biaya Servis Siap Ditinjau',
              preheader: `Estimasi biaya di ${business?.name || 'URT'}`,
              name: (populated.customerId as any)?.name || 'Pelanggan',
              businessName: business?.name || 'URT Servis',
              ticketCode: ticket.ticketCode,
              device: `${ticket.device.brand ? ticket.device.brand + ' ' : ''}${ticket.device.model}`,
              totalAmount: newRevision.totalAmount,
              customerExplanation: newRevision.customerExplanation,
              targetCompletionDate: newRevision.targetCompletionDate,
              timezone: business?.timezone || 'Asia/Jakarta',
            },
          })
          .catch((err) => logger.error('Failed to send estimate-ready email', { error: err }));
      }
    } catch (err) {
      logger.error('Error triggering estimate-ready email', { error: err });
    }

    return populated;
  }

  /**
   * Customer approves or rejects pending estimate revision
   */
  static async respondToEstimate(
    businessId: string,
    ticketId: string,
    callerUserId: string,
    input: ApprovalInput,
  ): Promise<IServiceTicket> {
    validateObjectId(businessId, 'Business');
    validateObjectId(ticketId, 'ServiceTicket');

    const businessObjectId = new mongoose.Types.ObjectId(businessId);
    const ticketObjectId = new mongoose.Types.ObjectId(ticketId);

    const ticket = await ServiceTicket.findOne({
      _id: ticketObjectId,
      businessId: businessObjectId,
    }).populate('customerId');

    if (!ticket) {
      throw new AppError('Ticket not found', 404);
    }

    // Verify caller is the customer owning this ticket
    const customer = ticket.customerId as any;
    if (!customer || customer.userId?.toString() !== callerUserId) {
      throw new AppError('Only the customer who owns this ticket may approve or reject the estimate', 403, 'FORBIDDEN');
    }

    if (ticket.status !== 'awaiting_approval') {
      throw new AppError('Ticket is not currently awaiting estimate approval', 400, 'ESTIMATE_NOT_APPROVABLE');
    }

    if (ticket.revision !== input.expectedRevision) {
      throw new AppError('Ticket has been modified by another action. Please refresh.', 409, 'TICKET_CHANGED');
    }

    const pendingRevision = ticket.estimateRevisions.find(
      (r) => r.version === input.estimateVersion && r.status === 'pending',
    );

    if (!pendingRevision) {
      throw new AppError(
        'Selected estimate revision is not pending approval. Refresh to see the latest estimate.',
        400,
        'ESTIMATE_CHANGED',
      );
    }

    const callerObjectId = new mongoose.Types.ObjectId(callerUserId);

    if (input.decision === 'approved') {
      pendingRevision.status = 'approved';
      pendingRevision.decisionAt = new Date();
      ticket.approvedEstimate = pendingRevision;
      ticket.status = 'approved';
      ticket.revision += 1;

      ticket.timeline.push({
        status: 'approved',
        action: 'estimate_approved',
        actorId: callerObjectId,
        actorRole: 'customer',
        actorName: customer.name,
        note: `Customer approved estimate revision #${pendingRevision.version} (Rp ${pendingRevision.totalAmount.toLocaleString('id-ID')})`,
        isPublic: true,
        timestamp: new Date(),
      });
    } else {
      pendingRevision.status = 'rejected';
      pendingRevision.decisionAt = new Date();
      pendingRevision.decisionReason = input.reason;
      ticket.status = 'rejected';
      ticket.revision += 1;

      ticket.timeline.push({
        status: 'rejected',
        action: 'estimate_rejected',
        actorId: callerObjectId,
        actorRole: 'customer',
        actorName: customer.name,
        note: input.reason || `Customer declined estimate revision #${pendingRevision.version}`,
        isPublic: true,
        timestamp: new Date(),
      });
    }

    await ticket.save();

    return (await ticket.populate([
      { path: 'customerId', select: 'name email phone' },
      { path: 'assignedTechnicianId', select: 'name email phone specializations' },
      { path: 'requestedServiceId', select: 'name category basePrice estimatedDuration' },
    ])) as IServiceTicket;
  }

  /**
   * Execute lifecycle status transition according to Section 8 state machine
   */
  static async transitionTicket(
    businessId: string,
    ticketId: string,
    callerUserId: string,
    callerRole: 'owner' | 'technician' | 'customer',
    input: TicketTransitionInput,
  ): Promise<IServiceTicket> {
    validateObjectId(businessId, 'Business');
    validateObjectId(ticketId, 'ServiceTicket');

    const businessObjectId = new mongoose.Types.ObjectId(businessId);
    const ticketObjectId = new mongoose.Types.ObjectId(ticketId);

    const ticket = await ServiceTicket.findOne({
      _id: ticketObjectId,
      businessId: businessObjectId,
    }).populate('customerId');

    if (!ticket) {
      throw new AppError('Ticket not found', 404);
    }

    if (ticket.revision !== input.expectedRevision) {
      throw new AppError('Ticket has been modified by another action. Please refresh.', 409, 'TICKET_CHANGED');
    }

    const callerObjectId = new mongoose.Types.ObjectId(callerUserId);

    switch (input.targetStatus) {
      case 'waiting_diagnosis': {
        // Physical intake accepted at shop by owner
        if (callerRole !== 'owner') {
          throw new AppError('Only the business owner can accept physical device intake', 403, 'FORBIDDEN');
        }
        if (ticket.status !== 'submitted') {
          throw new AppError(
            'Only online submitted tickets can transition to waiting diagnosis via intake acceptance',
            400,
            'INVALID_STATUS_TRANSITION',
          );
        }
        ticket.status = 'waiting_diagnosis';
        ticket.intakeReceivedAt = new Date();
        ticket.revision += 1;
        ticket.timeline.push({
          status: 'waiting_diagnosis',
          action: 'intake_accepted',
          actorId: callerObjectId,
          actorRole: 'owner',
          actorName: 'Owner',
          note: input.reason || 'Device physically received at repair shop',
          isPublic: true,
          timestamp: new Date(),
        });
        break;
      }

      case 'diagnosing': {
        // Either starting diagnosis from waiting_diagnosis OR reopening from rejected
        if (ticket.status === 'waiting_diagnosis') {
          await this.verifyAssignedTechnician(businessObjectId, ticket, callerUserId);
          ticket.status = 'diagnosing';
          ticket.revision += 1;
          ticket.timeline.push({
            status: 'diagnosing',
            action: 'diagnosis_started',
            actorId: callerObjectId,
            actorRole: 'technician',
            actorName: 'Technician',
            note: 'Technician started device diagnosis',
            isPublic: true,
            timestamp: new Date(),
          });
        } else if (ticket.status === 'rejected') {
          // Reopening declined repair for revised diagnosis
          if (callerRole !== 'owner') {
            await this.verifyAssignedTechnician(businessObjectId, ticket, callerUserId);
          }
          if (!input.reason) {
            throw new AppError('Reason is required when reopening a rejected repair', 400, 'REASON_REQUIRED');
          }
          ticket.status = 'diagnosing';
          ticket.revision += 1;
          ticket.timeline.push({
            status: 'diagnosing',
            action: 'reopened_for_diagnosis',
            actorId: callerObjectId,
            actorRole: callerRole,
            actorName: callerRole === 'owner' ? 'Owner' : 'Technician',
            note: `Reopened for revised diagnosis: ${input.reason}`,
            isPublic: true,
            timestamp: new Date(),
          });
        } else {
          throw new AppError(
            `Cannot transition to diagnosing from current status '${ticket.status}'`,
            400,
            'INVALID_STATUS_TRANSITION',
          );
        }
        break;
      }

      case 'repairing': {
        // Starting repair after estimate approval OR rework after failed QC
        await this.verifyAssignedTechnician(businessObjectId, ticket, callerUserId);

        if (ticket.status === 'approved') {
          ticket.status = 'repairing';
          ticket.repairStartedAt = new Date();
          ticket.revision += 1;
          ticket.timeline.push({
            status: 'repairing',
            action: 'repair_started',
            actorId: callerObjectId,
            actorRole: 'technician',
            actorName: 'Technician',
            note: 'Repair work commenced according to approved estimate',
            isPublic: true,
            timestamp: new Date(),
          });
        } else if (ticket.status === 'quality_check') {
          // Quality check failed -> back to repairing
          if (input.qcPassed !== false || !input.qcNotes) {
            throw new AppError('QC failure notes are required when returning to repair', 400, 'QC_NOTES_REQUIRED');
          }
          ticket.status = 'repairing';
          ticket.qualityCheck = {
            passed: false,
            notes: input.qcNotes,
            checkedAt: new Date(),
            checkedBy: callerObjectId,
          };
          ticket.revision += 1;
          ticket.timeline.push({
            status: 'repairing',
            action: 'qc_failed',
            actorId: callerObjectId,
            actorRole: 'technician',
            actorName: 'Technician',
            note: `QC failed: ${input.qcNotes}. Rework required.`,
            isPublic: true,
            timestamp: new Date(),
          });
        } else {
          throw new AppError(
            `Cannot transition to repairing from status '${ticket.status}'`,
            400,
            'INVALID_STATUS_TRANSITION',
          );
        }
        break;
      }

      case 'quality_check': {
        // Submitting repair for quality control inspection
        await this.verifyAssignedTechnician(businessObjectId, ticket, callerUserId);

        if (ticket.status !== 'repairing') {
          throw new AppError('Can only submit for QC from repairing status', 400, 'INVALID_STATUS_TRANSITION');
        }

        if (!input.workSummary || input.workSummary.trim().length < 3) {
          throw new AppError('Summary of repair work performed is required for QC', 400, 'WORK_SUMMARY_REQUIRED');
        }

        ticket.workSummary = input.workSummary;
        ticket.repairCompletedAt = new Date();
        ticket.status = 'quality_check';
        ticket.revision += 1;
        ticket.timeline.push({
          status: 'quality_check',
          action: 'quality_check_submitted',
          actorId: callerObjectId,
          actorRole: 'technician',
          actorName: 'Technician',
          note: `Repair completed: ${input.workSummary}. Awaiting quality check.`,
          isPublic: true,
          timestamp: new Date(),
        });
        break;
      }

      case 'completed': {
        // Quality check passed -> repair completed & ready for pickup
        if (ticket.status !== 'quality_check') {
          throw new AppError('Can only complete ticket after passing quality check', 400, 'INVALID_STATUS_TRANSITION');
        }

        if (callerRole !== 'owner') {
          await this.verifyAssignedTechnician(businessObjectId, ticket, callerUserId);
        }

        if (input.qcPassed !== true) {
          throw new AppError('qcPassed must be true to complete repair', 400, 'QC_REQUIRED');
        }

        ticket.status = 'completed';
        ticket.readyAt = new Date();
        ticket.qualityCheck = {
          passed: true,
          notes: input.qcNotes,
          checkedAt: new Date(),
          checkedBy: callerObjectId,
        };

        if (input.warrantyDays !== undefined && input.warrantyDays >= 0) {
          ticket.warranty = {
            days: input.warrantyDays,
            terms: input.warrantyTerms,
            expiresAt: new Date(Date.now() + input.warrantyDays * 86400000),
          };
        }

        ticket.revision += 1;
        ticket.timeline.push({
          status: 'completed',
          action: 'completed',
          actorId: callerObjectId,
          actorRole: callerRole === 'owner' ? 'owner' : 'technician',
          actorName: callerRole === 'owner' ? 'Owner' : 'Technician',
          note: `Quality check passed. Device repair completed and ready for pickup.${input.warrantyDays ? ` Warranty: ${input.warrantyDays} days.` : ''}`,
          isPublic: true,
          timestamp: new Date(),
        });
        break;
      }

      case 'cancelled': {
        if (!input.reason) {
          throw new AppError('Reason is required when cancelling a ticket', 400, 'REASON_REQUIRED');
        }

        if (ticket.status === 'submitted' || ticket.status === 'waiting_diagnosis') {
          // Early cancellation
          if (callerRole === 'customer') {
            const cust = ticket.customerId as any;
            if (!cust || cust.userId?.toString() !== callerUserId) {
              throw new AppError('Not authorized to cancel this ticket', 403, 'FORBIDDEN');
            }
          } else if (callerRole !== 'owner') {
            throw new AppError('Only the customer or owner may cancel this ticket', 403, 'FORBIDDEN');
          }
        } else if (ticket.status === 'rejected') {
          // Closing declined repair
          if (callerRole !== 'owner') {
            throw new AppError('Only the business owner may close a declined ticket', 403, 'FORBIDDEN');
          }
        } else {
          throw new AppError(
            `Cannot cancel ticket in active progress '${ticket.status}'`,
            400,
            'INVALID_STATUS_TRANSITION',
          );
        }

        ticket.status = 'cancelled';
        ticket.cancellationReason = input.reason;
        ticket.revision += 1;
        ticket.timeline.push({
          status: 'cancelled',
          action: 'cancelled',
          actorId: callerObjectId,
          actorRole: callerRole,
          actorName: callerRole === 'owner' ? 'Owner' : 'Customer',
          note: input.reason,
          isPublic: true,
          timestamp: new Date(),
        });
        break;
      }

      default:
        throw new AppError(`Unknown target status '${input.targetStatus}'`, 400, 'INVALID_STATUS');
    }

    await ticket.save();

    const populated = (await ticket.populate([
      { path: 'customerId', select: 'name email phone' },
      { path: 'assignedTechnicianId', select: 'name email phone specializations' },
      { path: 'requestedServiceId', select: 'name category basePrice estimatedDuration' },
    ])) as IServiceTicket;

    if (input.targetStatus === 'completed') {
      try {
        const recipientEmail = (populated.customerId as any)?.email;
        if (recipientEmail) {
          const business = await Business.findById(businessId);
          mailService
            .sendTemplate({
              to: recipientEmail,
              subject: `Perbaikan Selesai & Siap Diambil - ${ticket.ticketCode}`,
              template: 'repair-ready',
              data: {
                title: 'Perbaikan Selesai & Siap Diambil',
                preheader: `Perangkat siap diambil di ${business?.name || 'URT'}`,
                name: (populated.customerId as any)?.name || 'Pelanggan',
                businessName: business?.name || 'URT Servis',
                ticketCode: ticket.ticketCode,
                device: `${ticket.device.brand ? ticket.device.brand + ' ' : ''}${ticket.device.model}`,
                workSummary: ticket.workSummary,
                readyAt: ticket.readyAt || new Date(),
                warrantyDays: ticket.warranty?.days,
                timezone: business?.timezone || 'Asia/Jakarta',
              },
            })
            .catch((err) => logger.error('Failed to send repair-ready email', { error: err }));
        }
      } catch (err) {
        logger.error('Error triggering repair-ready email', { error: err });
      }
    }

    return populated;
  }

  /**
   * Device Handover to Customer (Owner only)
   */
  static async handoverTicket(
    businessId: string,
    ticketId: string,
    callerUserId: string,
    input: HandoverInput,
  ): Promise<IServiceTicket> {
    validateObjectId(businessId, 'Business');
    validateObjectId(ticketId, 'ServiceTicket');

    const businessObjectId = new mongoose.Types.ObjectId(businessId);
    const ticketObjectId = new mongoose.Types.ObjectId(ticketId);

    const ticket = await ServiceTicket.findOne({
      _id: ticketObjectId,
      businessId: businessObjectId,
    });

    if (!ticket) {
      throw new AppError('Ticket not found', 404);
    }

    if (ticket.status !== 'completed') {
      throw new AppError('Device handover can only be performed on completed repairs', 400, 'INVALID_STATUS');
    }

    if (ticket.revision !== input.expectedRevision) {
      throw new AppError('Ticket has been modified by another action. Please refresh.', 409, 'TICKET_CHANGED');
    }

    // Repeated handover check (idempotent result)
    if (ticket.handover?.handedOverAt) {
      return (await ticket.populate([
        { path: 'customerId', select: 'name email phone' },
        { path: 'assignedTechnicianId', select: 'name email phone specializations' },
        { path: 'requestedServiceId', select: 'name category basePrice estimatedDuration' },
      ])) as IServiceTicket;
    }

    const callerObjectId = new mongoose.Types.ObjectId(callerUserId);
    const now = new Date();

    ticket.handover = {
      handedOverAt: now,
      handedOverBy: callerObjectId,
      handedOverTo: input.handedOverTo,
      notes: input.notes,
    };
    ticket.handedOverAt = now;
    ticket.revision += 1;

    ticket.timeline.push({
      status: 'completed',
      action: 'handed_over',
      actorId: callerObjectId,
      actorRole: 'owner',
      actorName: 'Owner',
      note: `Device collected by ${input.handedOverTo}${input.notes ? ` (${input.notes})` : ''}`,
      isPublic: true,
      timestamp: now,
    });

    await ticket.save();

    return (await ticket.populate([
      { path: 'customerId', select: 'name email phone' },
      { path: 'assignedTechnicianId', select: 'name email phone specializations' },
      { path: 'requestedServiceId', select: 'name category basePrice estimatedDuration' },
    ])) as IServiceTicket;
  }

  /**
   * Issue or rotate high-entropy tracking secret (Owner only)
   * Stored as SHA-256 hash in ticket; raw secret returned once.
   */
  static async issueTrackingAccess(
    businessId: string,
    ticketId: string,
    callerUserId: string,
    expectedRevision: number,
  ): Promise<{ ticketCode: string; trackingSecret: string; revision: number }> {
    validateObjectId(businessId, 'Business');
    validateObjectId(ticketId, 'ServiceTicket');

    const businessObjectId = new mongoose.Types.ObjectId(businessId);
    const ticketObjectId = new mongoose.Types.ObjectId(ticketId);

    const ticket = await ServiceTicket.findOne({
      _id: ticketObjectId,
      businessId: businessObjectId,
    });

    if (!ticket) {
      throw new AppError('Ticket not found', 404);
    }

    if (ticket.revision !== expectedRevision) {
      throw new AppError(
        `Ticket has been modified (current revision: ${ticket.revision}, expected: ${expectedRevision})`,
        409,
        'TICKET_CHANGED',
      );
    }

    // High entropy random secret: 16 bytes = 32 hex characters
    const rawSecret = crypto.randomBytes(16).toString('hex');
    const secretHash = crypto.createHash('sha256').update(rawSecret).digest('hex');

    ticket.trackingSecretHash = secretHash;
    ticket.revision += 1;

    ticket.timeline.push({
      status: ticket.status,
      action: 'tracking_access_issued',
      actorId: new mongoose.Types.ObjectId(callerUserId),
      actorRole: 'owner',
      actorName: 'Pemilik Usaha',
      note: 'Akses lacak publik diperbarui oleh pemilik usaha',
      isPublic: false,
      timestamp: new Date(),
    });

    await ticket.save();

    return {
      ticketCode: ticket.ticketCode,
      trackingSecret: rawSecret,
      revision: ticket.revision,
    };
  }

  /**
   * Public tracking lookup (Rate-limited, strict uniform 404 on invalid credentials)
   * Only returns safe allowlisted customer/public progress data.
   */
  static async getPublicTracking(input: PublicTrackingInput) {
    const business = await Business.findOne({
      slug: input.businessSlug.trim().toLowerCase(),
      isActive: true,
    });

    if (!business) {
      throw new AppError('Tiket servis tidak ditemukan atau kode rahasia salah', 404, 'TRACKING_NOT_FOUND');
    }

    const ticket = await ServiceTicket.findOne({
      businessId: business._id,
      ticketCode: input.ticketCode.trim().toUpperCase(),
    }).select('+trackingSecretHash');

    if (!ticket || !ticket.trackingSecretHash) {
      throw new AppError('Tiket servis tidak ditemukan atau kode rahasia salah', 404, 'TRACKING_NOT_FOUND');
    }

    const providedHash = crypto.createHash('sha256').update(input.trackingSecret.trim()).digest('hex');
    const hashBufferA = Buffer.from(providedHash);
    const hashBufferB = Buffer.from(ticket.trackingSecretHash);

    if (hashBufferA.length !== hashBufferB.length || !crypto.timingSafeEqual(hashBufferA, hashBufferB)) {
      throw new AppError('Tiket servis tidak ditemukan atau kode rahasia salah', 404, 'TRACKING_NOT_FOUND');
    }

    const statusLabels: Record<string, string> = {
      submitted: 'Pendaftaran Diterima',
      waiting_diagnosis: 'Menunggu Diagnosis',
      diagnosing: 'Sedang Didiagnosis',
      awaiting_approval: 'Menunggu Persetujuan Biaya',
      approved: 'Estimasi Disetujui',
      rejected: 'Estimasi Ditolak',
      repairing: 'Sedang Dikerjakan',
      quality_check: 'Uji Kendali Mutu (QC)',
      completed: 'Selesai & Siap Diambil',
      cancelled: 'Servis Dibatalkan',
    };

    let currentStep = 1;
    if (['submitted', 'waiting_diagnosis'].includes(ticket.status)) currentStep = 1;
    else if (ticket.status === 'diagnosing') currentStep = 2;
    else if (['awaiting_approval', 'approved', 'rejected'].includes(ticket.status)) currentStep = 3;
    else if (['repairing', 'quality_check'].includes(ticket.status)) currentStep = 4;
    else if (ticket.status === 'completed') currentStep = 5;

    return {
      ticketCode: ticket.ticketCode,
      status: ticket.status,
      statusLabel: statusLabels[ticket.status] || ticket.status,
      currentStep,
      device: {
        category: ticket.device.category,
        brand: ticket.device.brand,
        model: ticket.device.model,
      },
      complaint: ticket.complaint,
      business: {
        name: business.name,
        slug: business.slug,
        phone: business.phone,
      },
      receivedAt: ticket.intakeReceivedAt || ticket.createdAt,
      readyAt: ticket.readyAt,
      handedOverAt: ticket.handedOverAt,
      timeline: ticket.timeline
        .filter((e) => e.isPublic)
        .map((e) => ({
          status: e.status,
          action: e.action,
          actorRole: e.actorRole,
          note: e.note,
          timestamp: e.timestamp,
        })),
    };
  }

  /**
   * Add attachment to ticket
   */
  static async addAttachment(
    businessId: string,
    ticketId: string,
    callerUser: { id: string; email: string; firstName?: string; lastName?: string },
    callerRole: 'owner' | 'technician' | 'customer',
    input: AddAttachmentInput,
  ): Promise<IServiceTicket> {
    validateObjectId(businessId, 'Business');
    validateObjectId(ticketId, 'ServiceTicket');

    const businessObjectId = new mongoose.Types.ObjectId(businessId);
    const ticketObjectId = new mongoose.Types.ObjectId(ticketId);

    const ticket = await ServiceTicket.findOne({
      _id: ticketObjectId,
      businessId: businessObjectId,
    });

    if (!ticket) {
      throw new AppError('Ticket not found', 404);
    }

    if (ticket.revision !== input.expectedRevision) {
      throw new AppError(
        `Ticket has been modified (current revision: ${ticket.revision}, expected: ${input.expectedRevision})`,
        409,
        'TICKET_CHANGED',
      );
    }

    // Role-specific permission check
    if (callerRole === 'customer') {
      const customer = await Customer.findOne({
        businessId: businessObjectId,
        userId: new mongoose.Types.ObjectId(callerUser.id),
        status: 'active',
      });
      if (!customer || ticket.customerId.toString() !== customer._id.toString()) {
        throw new AppError('You do not have access to this ticket', 403, 'FORBIDDEN');
      }
    } else if (callerRole === 'technician') {
      await this.verifyAssignedTechnician(businessObjectId, ticket, callerUser.id);
    }

    // Lookup uploaded file
    const file = await File.findOne({ key: input.key });
    if (!file) {
      throw new AppError('File not found', 404, 'UPLOAD_NOT_FOUND');
    }
    if (file.deleting) {
      throw new AppError('File deletion is in progress', 409, 'UPLOAD_DELETING');
    }

    // Fixed business scope check
    if (file.businessId && file.businessId.toString() !== businessId) {
      throw new AppError('File belongs to another business scope', 403, 'SCOPE_FORBIDDEN');
    }

    // File ownership check: must be uploader or owner
    if (callerRole !== 'owner' && file.uploadedBy.toString() !== callerUser.id) {
      throw new AppError('You cannot attach files uploaded by other users', 403, 'UPLOAD_FORBIDDEN');
    }

    // Already attached check
    if (ticket.attachments.some((a) => a.key === input.key)) {
      throw new AppError('File is already attached to this ticket', 400, 'ALREADY_ATTACHED');
    }

    // Customer can only create customer-visible attachments
    const visibility = callerRole === 'customer' ? 'customer' : (input.visibility || 'customer');
    const uploaderName = `${callerUser.firstName || ''} ${callerUser.lastName || ''}`.trim() || callerUser.email;

    // Atomically increment file reference and bind businessId
    await File.updateOne(
      { _id: file._id },
      {
        $inc: { referenceCount: 1 },
        $set: { businessId: businessObjectId },
      },
    );

    ticket.attachments.push({
      key: file.key,
      originalName: file.originalName,
      mimeType: file.mimeType,
      size: file.size,
      visibility,
      uploadedBy: new mongoose.Types.ObjectId(callerUser.id),
      uploadedByName: uploaderName,
      uploadedAt: new Date(),
    });

    ticket.timeline.push({
      status: ticket.status,
      action: 'attachment_added',
      actorId: new mongoose.Types.ObjectId(callerUser.id),
      actorRole: callerRole,
      actorName: uploaderName,
      note: `Lampiran ditambahkan: ${file.originalName}`,
      isPublic: visibility === 'customer',
      timestamp: new Date(),
    });

    ticket.revision += 1;
    await ticket.save();

    return (await ticket.populate([
      { path: 'customerId', select: 'name email phone' },
      { path: 'assignedTechnicianId', select: 'name email phone specializations' },
      { path: 'requestedServiceId', select: 'name category basePrice estimatedDuration' },
    ])) as IServiceTicket;
  }

  /**
   * Detach attachment from ticket
   */
  static async detachAttachment(
    businessId: string,
    ticketId: string,
    key: string,
    callerUser: { id: string; email: string },
    callerRole: 'owner' | 'technician' | 'customer',
    expectedRevision: number,
  ): Promise<IServiceTicket> {
    validateObjectId(businessId, 'Business');
    validateObjectId(ticketId, 'ServiceTicket');

    const businessObjectId = new mongoose.Types.ObjectId(businessId);
    const ticketObjectId = new mongoose.Types.ObjectId(ticketId);

    const ticket = await ServiceTicket.findOne({
      _id: ticketObjectId,
      businessId: businessObjectId,
    });

    if (!ticket) {
      throw new AppError('Ticket not found', 404);
    }

    if (ticket.revision !== expectedRevision) {
      throw new AppError(
        `Ticket has been modified (current revision: ${ticket.revision}, expected: ${expectedRevision})`,
        409,
        'TICKET_CHANGED',
      );
    }

    const attIndex = ticket.attachments.findIndex((a) => a.key === key);
    if (attIndex === -1) {
      throw new AppError('Attachment not found on this ticket', 404, 'ATTACHMENT_NOT_FOUND');
    }

    const attachment = ticket.attachments[attIndex];

    // Detach authorization: owner can detach any, customer only what they uploaded, tech if assigned
    if (callerRole === 'customer') {
      const customer = await Customer.findOne({
        businessId: businessObjectId,
        userId: new mongoose.Types.ObjectId(callerUser.id),
        status: 'active',
      });
      if (!customer || ticket.customerId.toString() !== customer._id.toString()) {
        throw new AppError('You do not have access to this ticket', 403, 'FORBIDDEN');
      }
      if (attachment.uploadedBy.toString() !== callerUser.id) {
        throw new AppError('Customers can only remove attachments they uploaded', 403, 'FORBIDDEN');
      }
    } else if (callerRole === 'technician') {
      await this.verifyAssignedTechnician(businessObjectId, ticket, callerUser.id);
    }

    ticket.attachments.splice(attIndex, 1);

    // Atomically decrement file reference
    await File.updateOne(
      { key, referenceCount: { $gt: 0 } },
      { $inc: { referenceCount: -1 } },
    );

    ticket.timeline.push({
      status: ticket.status,
      action: 'attachment_removed',
      actorId: new mongoose.Types.ObjectId(callerUser.id),
      actorRole: callerRole,
      actorName: callerRole === 'owner' ? 'Owner' : callerUser.email,
      note: `Lampiran dihapus: ${attachment.originalName}`,
      isPublic: attachment.visibility === 'customer',
      timestamp: new Date(),
    });

    ticket.revision += 1;
    await ticket.save();

    return (await ticket.populate([
      { path: 'customerId', select: 'name email phone' },
      { path: 'assignedTechnicianId', select: 'name email phone specializations' },
      { path: 'requestedServiceId', select: 'name category basePrice estimatedDuration' },
    ])) as IServiceTicket;
  }

  /**
   * Get fresh signed download URL for ticket attachment
   */
  static async getAttachmentDownload(
    businessId: string,
    ticketId: string,
    key: string,
    callerUser: { id: string; email: string },
    callerRole: 'owner' | 'technician' | 'customer',
  ) {
    validateObjectId(businessId, 'Business');
    validateObjectId(ticketId, 'ServiceTicket');

    const businessObjectId = new mongoose.Types.ObjectId(businessId);
    const ticketObjectId = new mongoose.Types.ObjectId(ticketId);

    const ticket = await ServiceTicket.findOne({
      _id: ticketObjectId,
      businessId: businessObjectId,
    });

    if (!ticket) {
      throw new AppError('Ticket not found', 404);
    }

    if (callerRole === 'customer') {
      const customer = await Customer.findOne({
        businessId: businessObjectId,
        userId: new mongoose.Types.ObjectId(callerUser.id),
        status: 'active',
      });
      if (!customer || ticket.customerId.toString() !== customer._id.toString()) {
        throw new AppError('You do not have access to this ticket', 403, 'FORBIDDEN');
      }
    } else if (callerRole === 'technician') {
      await this.verifyAssignedTechnician(businessObjectId, ticket, callerUser.id);
    }

    const attachment = ticket.attachments.find((a) => a.key === key);
    if (!attachment) {
      throw new AppError('Attachment not found on this ticket', 404, 'ATTACHMENT_NOT_FOUND');
    }

    // Visibility restriction
    if (callerRole === 'customer' && attachment.visibility === 'staff') {
      throw new AppError('You cannot view staff-only attachments', 403, 'ATTACHMENT_FORBIDDEN');
    }

    const file = await File.findOne({ key });
    if (!file) {
      throw new AppError('File not found', 404, 'UPLOAD_NOT_FOUND');
    }
    if (file.deleting) {
      throw new AppError('File deletion is in progress', 409, 'UPLOAD_DELETING');
    }

    const download = await signDownload(file.objectKey);

    return {
      key: attachment.key,
      originalName: attachment.originalName,
      mimeType: attachment.mimeType,
      size: attachment.size,
      visibility: attachment.visibility,
      ...download,
    };
  }
}

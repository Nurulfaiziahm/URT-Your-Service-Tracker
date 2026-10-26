import mongoose, { Document, Schema, Model } from 'mongoose';

export type TicketStatus =
  | 'submitted'
  | 'waiting_diagnosis'
  | 'diagnosing'
  | 'awaiting_approval'
  | 'approved'
  | 'rejected'
  | 'repairing'
  | 'quality_check'
  | 'completed'
  | 'cancelled';

export type IntakeMethod = 'walk_in' | 'online';

export type TimelineActorRole = 'owner' | 'technician' | 'customer' | 'system';

export type EstimateItemType = 'part' | 'labor';

export type EstimateRevisionStatus = 'pending' | 'approved' | 'rejected';

export type AttachmentVisibility = 'customer' | 'staff';

export interface ITicketAttachment {
  _id?: mongoose.Types.ObjectId;
  key: string;
  originalName: string;
  mimeType: string;
  size: number;
  visibility: AttachmentVisibility;
  uploadedBy: mongoose.Types.ObjectId;
  uploadedByName: string;
  uploadedAt: Date;
}

export interface ITimelineEvent {
  _id?: mongoose.Types.ObjectId;
  status: TicketStatus;
  action: string;
  actorId: mongoose.Types.ObjectId;
  actorRole: TimelineActorRole;
  actorName: string;
  note?: string;
  isPublic: boolean;
  timestamp: Date;
}

export interface IDeviceSnapshot {
  category: string;
  brand?: string;
  model: string;
  serialNumber?: string;
  accessories: string[];
  condition?: string;
}

export interface IDiagnosis {
  staffFindings?: string;
  customerExplanation?: string;
  diagnosedAt?: Date;
  diagnosedBy?: mongoose.Types.ObjectId;
}

export interface IEstimateLine {
  description: string;
  type: EstimateItemType;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface IEstimateDraft {
  lines: IEstimateLine[];
  currency: string;
  totalAmount: number;
  targetCompletionDate?: Date;
  notes?: string;
  updatedAt?: Date;
}

export interface IEstimateRevision {
  version: number;
  lines: IEstimateLine[];
  currency: string;
  totalAmount: number;
  targetCompletionDate?: Date;
  customerExplanation: string;
  submittedBy: mongoose.Types.ObjectId;
  submittedByName: string;
  submittedAt: Date;
  status: EstimateRevisionStatus;
  decisionAt?: Date;
  decisionReason?: string;
}

export interface IQualityCheck {
  passed: boolean;
  notes?: string;
  checkedAt?: Date;
  checkedBy?: mongoose.Types.ObjectId;
}

export interface IWarranty {
  days: number;
  terms?: string;
  expiresAt?: Date;
}

export interface IHandover {
  handedOverAt: Date;
  handedOverBy: mongoose.Types.ObjectId;
  handedOverTo: string;
  notes?: string;
}

export interface IServiceTicket extends Document {
  _id: mongoose.Types.ObjectId;
  businessId: mongoose.Types.ObjectId;
  ticketCode: string;
  customerId: mongoose.Types.ObjectId;
  assignedTechnicianId?: mongoose.Types.ObjectId;
  requestedServiceId?: mongoose.Types.ObjectId;
  device: IDeviceSnapshot;
  complaint: string;
  intakeMethod: IntakeMethod;
  status: TicketStatus;
  revision: number;
  intakeReceivedAt?: Date;
  readyAt?: Date;
  handedOverAt?: Date;
  cancellationReason?: string;
  diagnosis?: IDiagnosis;
  estimateDraft?: IEstimateDraft;
  estimateRevisions: IEstimateRevision[];
  approvedEstimate?: IEstimateRevision;
  workSummary?: string;
  repairStartedAt?: Date;
  repairCompletedAt?: Date;
  qualityCheck?: IQualityCheck;
  warranty?: IWarranty;
  handover?: IHandover;
  trackingSecretHash?: string;
  attachments: ITicketAttachment[];
  timeline: ITimelineEvent[];
  createdAt: Date;
  updatedAt: Date;
}

export type IServiceTicketModel = Model<IServiceTicket>;

const timelineEventSchema = new Schema<ITimelineEvent>(
  {
    status: {
      type: String,
      required: true,
    },
    action: {
      type: String,
      required: true,
      trim: true,
    },
    actorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    actorRole: {
      type: String,
      enum: ['owner', 'technician', 'customer', 'system'],
      required: true,
    },
    actorName: {
      type: String,
      required: true,
      trim: true,
    },
    note: {
      type: String,
      trim: true,
    },
    isPublic: {
      type: Boolean,
      default: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true },
);

const estimateLineSchema = new Schema<IEstimateLine>(
  {
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    type: {
      type: String,
      enum: ['part', 'labor'],
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: Number.isInteger,
        message: 'Quantity must be an integer',
      },
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: 'Unit price must be a whole integer in rupiah',
      },
    },
    total: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false },
);

const estimateDraftSchema = new Schema<IEstimateDraft>(
  {
    lines: {
      type: [estimateLineSchema],
      default: [],
    },
    currency: {
      type: String,
      default: 'IDR',
    },
    totalAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    targetCompletionDate: {
      type: Date,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false },
);

const estimateRevisionSchema = new Schema<IEstimateRevision>(
  {
    version: {
      type: Number,
      required: true,
      min: 1,
    },
    lines: {
      type: [estimateLineSchema],
      required: true,
    },
    currency: {
      type: String,
      default: 'IDR',
      required: true,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    targetCompletionDate: {
      type: Date,
    },
    customerExplanation: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    submittedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    submittedByName: {
      type: String,
      required: true,
      trim: true,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    decisionAt: {
      type: Date,
    },
    decisionReason: {
      type: String,
      trim: true,
      maxlength: 500,
    },
  },
  { _id: true },
);

const diagnosisSchema = new Schema<IDiagnosis>(
  {
    staffFindings: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    customerExplanation: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    diagnosedAt: {
      type: Date,
    },
    diagnosedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { _id: false },
);

const qualityCheckSchema = new Schema<IQualityCheck>(
  {
    passed: {
      type: Boolean,
      required: true,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    checkedAt: {
      type: Date,
      default: Date.now,
    },
    checkedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { _id: false },
);

const warrantySchema = new Schema<IWarranty>(
  {
    days: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: 'Warranty days must be an integer',
      },
    },
    terms: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    expiresAt: {
      type: Date,
    },
  },
  { _id: false },
);

const handoverSchema = new Schema<IHandover>(
  {
    handedOverAt: {
      type: Date,
      default: Date.now,
    },
    handedOverBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    handedOverTo: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 500,
    },
  },
  { _id: false },
);

const ticketAttachmentSchema = new Schema<ITicketAttachment>(
  {
    key: {
      type: String,
      required: true,
      trim: true,
    },
    originalName: {
      type: String,
      required: true,
      trim: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      required: true,
      min: 0,
    },
    visibility: {
      type: String,
      enum: ['customer', 'staff'],
      default: 'customer',
      required: true,
    },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    uploadedByName: {
      type: String,
      required: true,
      trim: true,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true },
);

const serviceTicketSchema = new Schema<IServiceTicket>(
  {
    businessId: {
      type: Schema.Types.ObjectId,
      ref: 'Business',
      required: [true, 'Business ID is required'],
      index: true,
    },
    ticketCode: {
      type: String,
      required: [true, 'Ticket code is required'],
      trim: true,
      uppercase: true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      required: [true, 'Customer ID is required'],
      index: true,
    },
    assignedTechnicianId: {
      type: Schema.Types.ObjectId,
      ref: 'Technician',
      default: undefined,
      index: true,
    },
    requestedServiceId: {
      type: Schema.Types.ObjectId,
      ref: 'Service',
      default: undefined,
    },
    device: {
      category: {
        type: String,
        required: [true, 'Device category is required'],
        trim: true,
        maxlength: [50, 'Category cannot exceed 50 characters'],
      },
      brand: {
        type: String,
        trim: true,
        maxlength: [50, 'Brand cannot exceed 50 characters'],
      },
      model: {
        type: String,
        required: [true, 'Device model is required'],
        trim: true,
        maxlength: [100, 'Model cannot exceed 100 characters'],
      },
      serialNumber: {
        type: String,
        trim: true,
        maxlength: [100, 'Serial number cannot exceed 100 characters'],
      },
      accessories: {
        type: [String],
        default: [],
      },
      condition: {
        type: String,
        trim: true,
        maxlength: [200, 'Condition cannot exceed 200 characters'],
      },
    },
    complaint: {
      type: String,
      required: [true, 'Complaint description is required'],
      trim: true,
      maxlength: [1000, 'Complaint description cannot exceed 1000 characters'],
    },
    intakeMethod: {
      type: String,
      enum: ['walk_in', 'online'],
      default: 'online',
    },
    status: {
      type: String,
      enum: [
        'submitted',
        'waiting_diagnosis',
        'diagnosing',
        'awaiting_approval',
        'approved',
        'rejected',
        'repairing',
        'quality_check',
        'completed',
        'cancelled',
      ],
      default: 'submitted',
      index: true,
    },
    revision: {
      type: Number,
      default: 1,
      min: 1,
    },
    intakeReceivedAt: {
      type: Date,
    },
    readyAt: {
      type: Date,
    },
    handedOverAt: {
      type: Date,
    },
    cancellationReason: {
      type: String,
      trim: true,
      maxlength: [500, 'Cancellation reason cannot exceed 500 characters'],
    },
    diagnosis: {
      type: diagnosisSchema,
      default: undefined,
    },
    estimateDraft: {
      type: estimateDraftSchema,
      default: undefined,
    },
    estimateRevisions: {
      type: [estimateRevisionSchema],
      default: [],
    },
    approvedEstimate: {
      type: estimateRevisionSchema,
      default: undefined,
    },
    workSummary: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    repairStartedAt: {
      type: Date,
    },
    repairCompletedAt: {
      type: Date,
    },
    qualityCheck: {
      type: qualityCheckSchema,
      default: undefined,
    },
    warranty: {
      type: warrantySchema,
      default: undefined,
    },
    handover: {
      type: handoverSchema,
      default: undefined,
    },
    trackingSecretHash: {
      type: String,
      select: false,
    },
    attachments: {
      type: [ticketAttachmentSchema],
      default: [],
    },
    timeline: {
      type: [timelineEventSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

// Enforce business-scoped ticketCode uniqueness
serviceTicketSchema.index({ businessId: 1, ticketCode: 1 }, { unique: true });

// Scoped listing & sorting indexes
serviceTicketSchema.index({ businessId: 1, status: 1, createdAt: -1 });
serviceTicketSchema.index({ businessId: 1, customerId: 1, createdAt: -1 });
serviceTicketSchema.index({ businessId: 1, assignedTechnicianId: 1, status: 1, createdAt: -1 });
serviceTicketSchema.index({ 'attachments.key': 1 });

export const ServiceTicket =
  (mongoose.models.ServiceTicket as IServiceTicketModel) ||
  mongoose.model<IServiceTicket, IServiceTicketModel>('ServiceTicket', serviceTicketSchema);

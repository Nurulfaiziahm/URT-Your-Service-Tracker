import mongoose, { Schema } from 'mongoose';

interface TicketApprovalAccessRecord {
  businessId: mongoose.Types.ObjectId;
  ticketId: mongoose.Types.ObjectId;
  estimateVersion: number;
  tokenHash: string;
  expiresAt: Date;
}

const schema = new Schema<TicketApprovalAccessRecord>({
  businessId: { type: Schema.Types.ObjectId, required: true },
  ticketId: { type: Schema.Types.ObjectId, required: true },
  estimateVersion: { type: Number, required: true, min: 1 },
  tokenHash: { type: String, required: true, unique: true, select: false },
  expiresAt: { type: Date, required: true, expires: 0 },
}, { timestamps: true });

export const TicketApprovalAccess = mongoose.model<TicketApprovalAccessRecord>('TicketApprovalAccess', schema);

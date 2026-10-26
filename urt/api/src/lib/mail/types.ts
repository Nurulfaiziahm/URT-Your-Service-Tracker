/**
 * Email types and interfaces
 */

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    content?: string | Buffer;
    path?: string;
  }>;
}

export interface SendTemplateOptions {
  to: string | string[];
  subject: string;
  template: string;
  data: Record<string, any>;
  attachments?: Array<{
    filename: string;
    content?: string | Buffer;
    path?: string;
  }>;
}

export interface TemplateProps {
  [key: string]: unknown;
}

export interface BaseTemplateProps extends TemplateProps {
  title: string;
  preheader?: string;
}

// Template data interfaces
export interface WelcomeTemplateData {
  title: string;
  preheader?: string;
  name: string;
}

export interface VerifyEmailTemplateData {
  title: string;
  preheader?: string;
  name: string;
  otp: string;
  expiresIn?: string;
}

export interface ResetPasswordTemplateData {
  title: string;
  preheader?: string;
  name: string;
  otp: string;
  expiresIn?: string;
}

export interface TechnicianInvitationTemplateData {
  title: string;
  preheader?: string;
  name: string;
  businessName: string;
  invitationUrl: string;
  expiresIn?: string;
}

export interface CustomerInvitationTemplateData {
  title: string;
  preheader?: string;
  name: string;
  businessName: string;
  invitationUrl: string;
  expiresIn?: string;
}

export interface TicketReceivedTemplateData {
  title: string;
  preheader?: string;
  name: string;
  businessName: string;
  ticketCode: string;
  device: string;
  complaint: string;
  receivedAt: string | Date;
  trackingUrl?: string;
  timezone?: string;
}

export interface EstimateReadyTemplateData {
  title: string;
  preheader?: string;
  name: string;
  businessName: string;
  ticketCode: string;
  device: string;
  totalAmount: number;
  customerExplanation: string;
  targetCompletionDate?: string | Date;
  approvalUrl?: string;
  timezone?: string;
}

export interface RepairReadyTemplateData {
  title: string;
  preheader?: string;
  name: string;
  businessName: string;
  ticketCode: string;
  device: string;
  workSummary?: string;
  readyAt: string | Date;
  warrantyDays?: number;
  pickupUrl?: string;
  timezone?: string;
}

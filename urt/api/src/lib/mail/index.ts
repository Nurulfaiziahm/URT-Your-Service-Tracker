export { mailService } from './mailer.service.js';
export { renderer } from './renderer.service.js';
export { transporter, verifyConnection } from './config.js';
export type {
  EmailOptions,
  SendTemplateOptions,
  WelcomeTemplateData,
  VerifyEmailTemplateData,
  ResetPasswordTemplateData,
  TechnicianInvitationTemplateData,
  CustomerInvitationTemplateData,
  TicketReceivedTemplateData,
  EstimateReadyTemplateData,
  RepairReadyTemplateData,
} from './types.js';

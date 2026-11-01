import { Business } from '../../models/Business.model.js';
import { AppError } from '../../middleware/error-handler.js';
import { requireActiveSubscription } from '../subscription/subscription.access.js';
import { TicketService } from './ticket.service.js';
import type { ServiceRequestInput } from './ticket.schema.js';

export async function createServiceRequest(slug: string, input: ServiceRequestInput, userId?: string) {
  const business = await Business.findOne({ slug: slug.toLowerCase(), isActive: true });
  if (!business) throw new AppError('Tempat servis tidak ditemukan', 404);
  await requireActiveSubscription(business._id.toString());

  const ticket = await TicketService.createTicket(
    business._id.toString(),
    { id: userId, firstName: input.customer.name, phone: input.customer.phone, email: input.customer.email },
    false,
    { device: input.device, complaint: input.complaint, intakeMethod: 'online' },
    true,
  );
  return {
    ticketCode: ticket.ticketCode,
    businessSlug: business.slug,
    ...(userId && { ticketId: ticket._id.toString() }),
  };
}

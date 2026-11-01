export interface ServiceRequestInput {
  customer: { name: string; phone: string; email?: string };
  device: { category: string; brand: string; model?: string; condition?: string; accessories?: string[] };
  complaint: string;
}

export interface ServiceRequestReceipt {
  ticketCode: string;
  businessSlug: string;
  ticketId?: string;
}

export function serviceTrackingPath(receipt: ServiceRequestReceipt) {
  return `/tracking/${encodeURIComponent(receipt.ticketCode)}`;
}

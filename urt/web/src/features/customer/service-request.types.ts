export interface ServiceRequestInput {
  customer: { name: string; phone: string; email?: string };
  device: { category: string; brand: string; model?: string; condition?: string; accessories?: string[] };
  complaint: string;
}

export interface ServiceRequestReceipt {
  ticketCode: string;
  businessSlug: string;
  trackingSecret: string;
  ticketId?: string;
}

export function serviceTrackingPath(receipt: ServiceRequestReceipt) {
  const fragment = new URLSearchParams({ business: receipt.businessSlug, access: receipt.trackingSecret });
  return `/tracking/${encodeURIComponent(receipt.ticketCode)}#${fragment}`;
}

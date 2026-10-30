import type { InvoiceStatus } from './types';
import { StatusBadge, type StatusTone } from '../../components/ui/StatusBadge';

interface InvoiceStatusBadgeProps {
  status: InvoiceStatus;
}

export function InvoiceStatusBadge({ status }: InvoiceStatusBadgeProps) {
  const statusInfo: Record<InvoiceStatus, { label: string; tone: StatusTone }> = {
    paid: { label: 'Lunas', tone: 'success' },
    partially_paid: { label: 'Sebagian Dibayar', tone: 'info' },
    issued: { label: 'Belum Dibayar', tone: 'warning' },
    voided: { label: 'Dibatalkan', tone: 'danger' },
  };
  const { label, tone } = statusInfo[status];
  return <StatusBadge label={label} tone={tone} />;
}

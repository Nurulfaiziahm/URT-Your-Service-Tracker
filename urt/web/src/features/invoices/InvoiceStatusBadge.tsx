import type { InvoiceStatus } from './types';

interface InvoiceStatusBadgeProps {
  status: InvoiceStatus;
}

export function InvoiceStatusBadge({ status }: InvoiceStatusBadgeProps) {
  const getBadgeStyle = () => {
    switch (status) {
      case 'paid':
        return {
          background: '#ecfdf5',
          color: '#059669',
          border: '1px solid #a7f3d0',
          label: 'Lunas',
        };
      case 'partially_paid':
        return {
          background: '#eff6ff',
          color: '#2563eb',
          border: '1px solid #bfdbfe',
          label: 'Sebagian Dibayar',
        };
      case 'issued':
        return {
          background: '#fffbeb',
          color: '#d97706',
          border: '1px solid #fde68a',
          label: 'Belum Dibayar',
        };
      case 'voided':
        return {
          background: '#fef2f2',
          color: '#dc2626',
          border: '1px solid #fecaca',
          label: 'Dibatalkan',
        };
    }
  };

  const { background, color, border, label } = getBadgeStyle();

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '3px 10px',
        borderRadius: 9999,
        fontSize: '0.8rem',
        fontWeight: 600,
        background,
        color,
        border,
      }}
    >
      {label}
    </span>
  );
}

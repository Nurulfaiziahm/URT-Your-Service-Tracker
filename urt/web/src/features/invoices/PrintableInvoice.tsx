import { Icon } from '../../components/ui/Icon';
import type { ServiceInvoice } from './types';
import { InvoiceStatusBadge } from './InvoiceStatusBadge';
import { formatRupiah } from '../tickets/currency';
import { Button } from '../../components/ui/Button';

interface PrintableInvoiceProps {
  invoice: ServiceInvoice;
  onClose?: () => void;
}

export function PrintableInvoice({ invoice, onClose }: PrintableInvoiceProps) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      className="print-document"
      style={{
        background: '#ffffff',
        color: '#0f172a',
        padding: 32,
        maxWidth: 720,
        margin: '0 auto',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      {/* On-screen action buttons */}
      <div
        className="no-print"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
          paddingBottom: 16,
          borderBottom: '1px solid #e2e8f0',
        }}
      >
        <span style={{ fontSize: '0.9rem', color: '#64748b' }}>Pratinjau Cetak Invoice Servis</span>
        <div style={{ display: 'flex', gap: 8 }}>
          {onClose && (
            <Button type="button" variant="secondary" onClick={onClose}>
              Tutup
            </Button>
          )}
          <Button type="button" variant="primary" onClick={handlePrint}>
            <Icon name="print" /> Cetak Invoice
          </Button>
        </div>
      </div>

      {/* Invoice Document Body */}
      <div
        style={{
          border: '1px solid #e2e8f0',
          padding: 28,
          borderRadius: 8,
          background: '#ffffff',
          position: 'relative',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            borderBottom: '2px solid #0f172a',
            paddingBottom: 20,
            marginBottom: 20,
          }}
        >
          <div>
            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>
              {invoice.business.name}
            </h1>
            {invoice.business.address && (
              <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#475569' }}>
                {invoice.business.address}
              </p>
            )}
            {invoice.business.phone && (
              <p style={{ margin: '2px 0 0', fontSize: '0.85rem', color: '#475569' }}>
                Telp / WhatsApp: {invoice.business.phone}
              </p>
            )}
          </div>

          <div style={{ textAlign: 'right' }}>
            <span
              style={{
                fontSize: '0.85rem',
                fontWeight: 700,
                color: '#64748b',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              INVOICE SERVIS
            </span>
            <div
              style={{
                fontFamily: 'monospace',
                fontSize: '1.4rem',
                fontWeight: 800,
                color: '#0f172a',
                marginTop: 2,
              }}
            >
              {invoice.invoiceNumber}
            </div>
            <div style={{ marginTop: 6 }}>
              <InvoiceStatusBadge status={invoice.status} />
            </div>
          </div>
        </div>

        {/* Invoice Info Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 16,
            fontSize: '0.88rem',
            marginBottom: 24,
          }}
        >
          <div>
            <strong style={{ color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase' }}>
              Tagihan Kepada:
            </strong>
            <div style={{ fontWeight: 700, fontSize: '1rem', marginTop: 2 }}>
              {invoice.customer.name}
            </div>
            {invoice.customer.phone && <div>Telp: {invoice.customer.phone}</div>}
            {invoice.customer.email && <div>Email: {invoice.customer.email}</div>}
            {invoice.customer.address && <div>Alamat: {invoice.customer.address}</div>}
          </div>

          <div>
            <strong style={{ color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase' }}>
              Perangkat & Tiket:
            </strong>
            <div style={{ fontWeight: 700, marginTop: 2 }}>
              {invoice.device.brand ? `${invoice.device.brand} ` : ''}
              {invoice.device.model} ({invoice.device.category})
            </div>
            <div>
              Kode Tiket Servis: <strong>{invoice.ticketCode}</strong>
            </div>
            {invoice.device.serialNumber && <div>No. Seri: {invoice.device.serialNumber}</div>}
          </div>

          <div>
            <strong style={{ color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase' }}>
              Tanggal & Penerbit:
            </strong>
            <div style={{ marginTop: 2 }}>
              Tanggal: {new Date(invoice.issuedAt).toLocaleDateString('id-ID')}
            </div>
            <div>Penerbit: {invoice.issuedByName}</div>
          </div>
        </div>

        {/* Line Items Table */}
        <div style={{ marginBottom: 20 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ textAlign: 'left', padding: '10px 12px' }}>Jenis</th>
                <th style={{ textAlign: 'left', padding: '10px 12px' }}>Deskripsi</th>
                <th style={{ textAlign: 'right', padding: '10px 12px', width: 70 }}>Qty</th>
                <th style={{ textAlign: 'right', padding: '10px 12px', width: 140 }}>
                  Harga Satuan
                </th>
                <th style={{ textAlign: 'right', padding: '10px 12px', width: 140 }}>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {invoice.lines.map((line, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '10px 12px' }}>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        padding: '2px 6px',
                        borderRadius: 4,
                        background: line.type === 'part' ? '#f0fdf4' : '#eff6ff',
                        color: line.type === 'part' ? '#166534' : '#1e40af',
                        fontWeight: 600,
                      }}
                    >
                      {line.type === 'part' ? 'Suku Cadang' : 'Jasa'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px' }}>{line.description}</td>
                  <td style={{ textAlign: 'right', padding: '10px 12px' }}>{line.quantity}</td>
                  <td style={{ textAlign: 'right', padding: '10px 12px' }}>
                    {formatRupiah(line.unitPrice)}
                  </td>
                  <td style={{ textAlign: 'right', padding: '10px 12px', fontWeight: 600 }}>
                    {formatRupiah(line.subtotal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals Section */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            marginBottom: 24,
          }}
        >
          <div style={{ width: 280, display: 'grid', gap: 6, fontSize: '0.9rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748b' }}>Subtotal:</span>
              <span>{formatRupiah(invoice.subtotal)}</span>
            </div>
            {invoice.tax > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Pajak:</span>
                <span>{formatRupiah(invoice.tax)}</span>
              </div>
            )}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                paddingTop: 8,
                borderTop: '1px solid #e2e8f0',
                fontWeight: 700,
                fontSize: '1rem',
              }}
            >
              <span>Total Tagihan:</span>
              <span>{formatRupiah(invoice.totalAmount)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#059669' }}>
              <span>Sudah Dibayar:</span>
              <span>{formatRupiah(invoice.paidAmount)}</span>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                paddingTop: 6,
                borderTop: '1px solid #e2e8f0',
                fontWeight: 800,
                fontSize: '1.1rem',
                color: invoice.balance > 0 ? '#dc2626' : '#059669',
              }}
            >
              <span>Sisa Tagihan:</span>
              <span>{formatRupiah(invoice.balance)}</span>
            </div>
          </div>
        </div>

        {/* Payment History */}
        {invoice.payments.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 8 }}>
              Riwayat Pembayaran Diterima
            </h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ textAlign: 'left', padding: '6px 10px' }}>
                    No. Kwitansi / Transaksi
                  </th>
                  <th style={{ textAlign: 'left', padding: '6px 10px' }}>Metode</th>
                  <th style={{ textAlign: 'left', padding: '6px 10px' }}>Tanggal</th>
                  <th style={{ textAlign: 'right', padding: '6px 10px' }}>Jumlah</th>
                </tr>
              </thead>
              <tbody>
                {invoice.payments.map((p, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '6px 10px', fontFamily: 'monospace' }}>
                      {p.operationId}
                      {p.reference && ` (Ref: ${p.reference})`}
                    </td>
                    <td style={{ padding: '6px 10px', textTransform: 'uppercase' }}>
                      {p.paymentMethod}
                    </td>
                    <td style={{ padding: '6px 10px' }}>
                      {new Date(p.paidAt).toLocaleDateString('id-ID')}
                    </td>
                    <td style={{ textAlign: 'right', padding: '6px 10px', fontWeight: 600 }}>
                      {formatRupiah(p.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Void notice */}
        {invoice.status === 'voided' && (
          <div
            style={{
              padding: '10px 14px',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: 6,
              color: '#991b1b',
              fontSize: '0.85rem',
              marginBottom: 16,
            }}
          >
            <strong>Invoice ini telah dibatalkan (VOID).</strong>
            {invoice.voidReason && ` Alasan: ${invoice.voidReason}`}
          </div>
        )}

        {/* Footer Note */}
        <div style={{ textAlign: 'center', fontSize: '0.8rem', color: '#64748b', marginTop: 32 }}>
          <p style={{ margin: 0 }}>
            Terima kasih atas kepercayaan Anda mempercayakan perbaikan perangkat kepada kami.
          </p>
        </div>
      </div>
    </div>
  );
}

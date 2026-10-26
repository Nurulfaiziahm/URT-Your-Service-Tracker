import { Icon } from '../../components/ui/Icon';
import type { ServiceTicket } from './types';
import { Button } from '../../components/ui/Button';

interface PrintableTicketReceiptProps {
  businessName: string;
  businessPhone?: string;
  ticket: ServiceTicket;
  onClose?: () => void;
}

export function PrintableTicketReceipt({
  businessName,
  businessPhone,
  ticket,
  onClose,
}: PrintableTicketReceiptProps) {
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
        maxWidth: 680,
        margin: '0 auto',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      {/* On-screen action buttons (hidden during print) */}
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
        <span style={{ fontSize: '0.9rem', color: '#64748b' }}>
          Pratinjau Cetak Bukti Penerimaan Servis
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          {onClose && (
            <Button type="button" variant="secondary" onClick={onClose}>
              Tutup
            </Button>
          )}
          <Button type="button" variant="primary" onClick={handlePrint}>
            <Icon name="print" /> Cetak Tanda Terima
          </Button>
        </div>
      </div>

      {/* Printable Body */}
      <div
        style={{
          border: '2px dashed #94a3b8',
          padding: 24,
          borderRadius: 8,
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            borderBottom: '2px solid #0f172a',
            paddingBottom: 16,
            marginBottom: 16,
          }}
        >
          <div>
            <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800 }}>{businessName}</h1>
            <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#475569' }}>
              Pusat Layanan & Perbaikan Perangkat
            </p>
            {businessPhone && (
              <p style={{ margin: '2px 0 0', fontSize: '0.85rem', color: '#475569' }}>
                WhatsApp / Telp: {businessPhone}
              </p>
            )}
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>
              Tanda Terima Servis
            </span>
            <div
              style={{
                fontFamily: 'monospace',
                fontSize: '1.35rem',
                fontWeight: 800,
                color: '#0f172a',
                marginTop: 2,
              }}
            >
              {ticket.ticketCode}
            </div>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
              {new Date(ticket.createdAt).toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </span>
          </div>
        </div>

        {/* Customer & Device Details Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 16,
            fontSize: '0.88rem',
            marginBottom: 16,
          }}
        >
          <div>
            <strong
              style={{
                display: 'block',
                color: '#64748b',
                fontSize: '0.75rem',
                textTransform: 'uppercase',
              }}
            >
              Data Pelanggan
            </strong>
            <div style={{ fontWeight: 700, fontSize: '1rem', marginTop: 2 }}>
              {ticket.customer?.name || 'Pelanggan Walk-in'}
            </div>
            <div>Telp: {ticket.customer?.phone || '-'}</div>
            {ticket.customer?.email && <div>Email: {ticket.customer.email}</div>}
          </div>

          <div>
            <strong
              style={{
                display: 'block',
                color: '#64748b',
                fontSize: '0.75rem',
                textTransform: 'uppercase',
              }}
            >
              Data Unit Perangkat
            </strong>
            <div style={{ fontWeight: 700, fontSize: '1rem', marginTop: 2 }}>
              {ticket.device.brand ? `${ticket.device.brand} ` : ''}
              {ticket.device.model}
            </div>
            <div>Kategori: {ticket.device.category}</div>
            {ticket.device.serialNumber && <div>No. Seri: {ticket.device.serialNumber}</div>}
          </div>
        </div>

        {/* Condition & Accessories */}
        <div
          style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 6,
            padding: 12,
            fontSize: '0.85rem',
            marginBottom: 16,
            display: 'grid',
            gap: 6,
          }}
        >
          <div>
            <strong style={{ color: '#475569' }}>Keluhan Kerusakan: </strong>
            <span>{ticket.complaint}</span>
          </div>
          {ticket.device.condition && (
            <div>
              <strong style={{ color: '#475569' }}>Kondisi Fisik Masuk: </strong>
              <span>{ticket.device.condition}</span>
            </div>
          )}
          {ticket.device.accessories && ticket.device.accessories.length > 0 && (
            <div>
              <strong style={{ color: '#475569' }}>Kelengkapan yang Ditinggal: </strong>
              <span>{ticket.device.accessories.join(', ')}</span>
            </div>
          )}
        </div>

        {/* Terms & Notice */}
        <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: 24, lineHeight: 1.4 }}>
          <strong>Syarat & Ketentuan Pengambilan Unit:</strong>
          <ol style={{ margin: '4px 0 0', paddingLeft: 16 }}>
            <li>
              Tanda terima ini adalah bukti sah pengambilan unit perangkat. Harap disimpan dengan
              baik.
            </li>
            <li>
              Tempat servis tidak bertanggung jawab atas kehilangan data internal saat perbaikan.
              Pastikan telah mencadangkan data.
            </li>
            <li>
              Unit yang tidak diambil dalam waktu 60 hari sejak tanggal konfirmasi perbaikan selesai
              bukan lagi tanggung jawab tempat servis.
            </li>
          </ol>
        </div>

        {/* Signature Area */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            textAlign: 'center',
            fontSize: '0.85rem',
            paddingTop: 16,
            borderTop: '1px solid #e2e8f0',
          }}
        >
          <div>
            <p style={{ margin: 0, color: '#64748b' }}>Diserahkan oleh (Pelanggan),</p>
            <div style={{ height: 50 }} />
            <p style={{ margin: 0, fontWeight: 700 }}>( {ticket.customer?.name || 'Pelanggan'} )</p>
          </div>
          <div>
            <p style={{ margin: 0, color: '#64748b' }}>Diterima oleh (Staf Servis),</p>
            <div style={{ height: 50 }} />
            <p style={{ margin: 0, fontWeight: 700 }}>( {businessName} )</p>
          </div>
        </div>
      </div>
    </div>
  );
}

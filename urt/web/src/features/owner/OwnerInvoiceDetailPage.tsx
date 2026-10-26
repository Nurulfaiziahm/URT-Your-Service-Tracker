import { Icon } from '../../components/ui/Icon';
import { Modal } from '../../components/ui/Modal';
import { useState } from 'react';
import { useParams } from 'react-router';
import { useAppSelector } from '../../redux/hooks';
import { selectSelectedBusinessId } from '../business/businessSlice';
import { useGetInvoiceByIdQuery } from '../invoices/invoicesApi';
import { InvoiceStatusBadge } from '../invoices/InvoiceStatusBadge';
import { RecordPaymentModal } from '../invoices/RecordPaymentModal';
import { VoidInvoiceModal } from '../invoices/VoidInvoiceModal';
import { PrintableInvoice } from '../invoices/PrintableInvoice';
import { formatRupiah } from '../tickets/currency';
import { Button, ButtonLink } from '../../components/ui/Button';
import { PageLoader, EmptyState } from '../../components/feedback/Feedback';
import styles from '../tickets/Tickets.module.css';

export default function OwnerInvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const businessId = useAppSelector(selectSelectedBusinessId);

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showVoidModal, setShowVoidModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);

  const { data, isLoading, error, refetch } = useGetInvoiceByIdQuery(
    { businessId: businessId || '', invoiceId: id || '' },
    { skip: !businessId || !id },
  );

  const invoice = data?.data?.invoice;

  if (isLoading || !businessId) {
    return <PageLoader />;
  }

  if (error || !invoice) {
    return (
      <main className="container page-content">
        <EmptyState
          title="Invoice Tidak Ditemukan"
          description="Data invoice tagihan ini tidak tersedia atau Anda tidak memiliki akses ke tempat servis ini."
          symbol="404"
          action={<ButtonLink to="/owner/transactions">Kembali ke Daftar Transaksi</ButtonLink>}
        />
      </main>
    );
  }

  const canRecordPayment = invoice.balance > 0 && invoice.status !== 'voided';

  const canVoid = invoice.status === 'issued' && invoice.paidAmount === 0;

  return (
    <div className={`container page-content ${styles.container}`}>
      <header className={styles.heading}>
        <div>
          <span className="eyebrow">Detail Transaksi</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
            <span style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: 'monospace' }}>
              {invoice.invoiceNumber}
            </span>
            <InvoiceStatusBadge status={invoice.status} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Button type="button" variant="secondary" onClick={() => setShowPrintModal(true)}>
            <Icon name="print" /> Cetak Invoice
          </Button>
          <ButtonLink to="/owner/transactions" variant="secondary">
            ← Kembali ke Transaksi
          </ButtonLink>
        </div>
      </header>

      {/* Action Bar for Owner */}
      {(canRecordPayment || canVoid) && (
        <div className={styles.ticketCard} style={{ background: '#f8fafc' }}>
          <h2>Tindakan Pembayaran</h2>
          <div className={styles.actionBar}>
            {canRecordPayment && (
              <Button type="button" variant="primary" onClick={() => setShowPaymentModal(true)}>
                💵 Catat Pembayaran Tagihan
              </Button>
            )}

            {canVoid && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowVoidModal(true)}
                style={{ color: '#dc2626' }}
              >
                ✕ Batalkan Invoice (Void)
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Void notice */}
      {invoice.status === 'voided' && (
        <div
          className={styles.ticketCard}
          style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b' }}
        >
          <strong>Invoice Ini Telah Dibatalkan (VOID)</strong>
          {invoice.voidReason && (
            <p style={{ margin: '4px 0 0', fontSize: '0.9rem' }}>Alasan: {invoice.voidReason}</p>
          )}
        </div>
      )}

      {/* Customer & Ticket Details */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 16,
        }}
      >
        <div className={styles.ticketCard}>
          <h2>Informasi Pelanggan</h2>
          <div style={{ display: 'grid', gap: 4, fontSize: '0.92rem' }}>
            <div>
              <span style={{ color: 'var(--slate-500)' }}>Nama: </span>
              <strong>{invoice.customer.name}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--slate-500)' }}>Telepon: </span>
              <span>{invoice.customer.phone || '-'}</span>
            </div>
            <div>
              <span style={{ color: 'var(--slate-500)' }}>Email: </span>
              <span>{invoice.customer.email || '-'}</span>
            </div>
            <div>
              <span style={{ color: 'var(--slate-500)' }}>Alamat: </span>
              <span>{invoice.customer.address || '-'}</span>
            </div>
          </div>
        </div>

        <div className={styles.ticketCard}>
          <h2>Informasi Tiket Servis</h2>
          <div style={{ display: 'grid', gap: 4, fontSize: '0.92rem' }}>
            <div>
              <span style={{ color: 'var(--slate-500)' }}>Kode Tiket: </span>
              <strong style={{ fontFamily: 'monospace' }}>{invoice.ticketCode}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--slate-500)' }}>Perangkat: </span>
              <span>
                {invoice.device.brand ? `${invoice.device.brand} ` : ''}
                {invoice.device.model} ({invoice.device.category})
              </span>
            </div>
            {invoice.device.serialNumber && (
              <div>
                <span style={{ color: 'var(--slate-500)' }}>No. Seri: </span>
                <span>{invoice.device.serialNumber}</span>
              </div>
            )}
            <div style={{ marginTop: 8 }}>
              <ButtonLink
                to={`/owner/tickets/${invoice.ticketId}`}
                variant="secondary"
                style={{ fontSize: '0.82rem', padding: '4px 10px' }}
              >
                Buka Tiket Servis Terkait ↗
              </ButtonLink>
            </div>
          </div>
        </div>
      </div>

      {/* Line Items Table */}
      <div className={styles.ticketCard}>
        <h2>Rincian Tagihan Perbaikan</h2>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Jenis</th>
                <th>Deskripsi Item</th>
                <th className={styles.textRight}>Jumlah</th>
                <th className={styles.textRight}>Harga Satuan</th>
                <th className={styles.textRight}>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {invoice.lines.map((line, idx) => (
                <tr key={idx}>
                  <td>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        padding: '2px 6px',
                        borderRadius: 4,
                        background: line.type === 'part' ? '#f0fdf4' : '#eff6ff',
                        color: line.type === 'part' ? '#166534' : '#1e40af',
                      }}
                    >
                      {line.type === 'part' ? 'Suku Cadang' : 'Jasa'}
                    </span>
                  </td>
                  <td>{line.description}</td>
                  <td className={styles.textRight}>{line.quantity}</td>
                  <td className={styles.textRight}>{formatRupiah(line.unitPrice)}</td>
                  <td className={styles.textRight}>
                    <strong>{formatRupiah(line.subtotal)}</strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals Summary */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
          <div style={{ width: 300, display: 'grid', gap: 6, fontSize: '0.92rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--slate-600)' }}>Subtotal:</span>
              <span>{formatRupiah(invoice.subtotal)}</span>
            </div>
            {invoice.tax > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--slate-600)' }}>Pajak:</span>
                <span>{formatRupiah(invoice.tax)}</span>
              </div>
            )}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                paddingTop: 8,
                borderTop: '1px solid var(--border)',
                fontWeight: 700,
                fontSize: '1.05rem',
              }}
            >
              <span>Total Tagihan:</span>
              <span style={{ color: 'var(--blue)' }}>{formatRupiah(invoice.totalAmount)}</span>
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
                borderTop: '1px solid var(--border)',
                fontWeight: 800,
                fontSize: '1.15rem',
                color: invoice.balance > 0 ? '#dc2626' : '#059669',
              }}
            >
              <span>Sisa Tagihan:</span>
              <span>{formatRupiah(invoice.balance)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Payment History */}
      {invoice.payments.length > 0 && (
        <div className={styles.ticketCard}>
          <h2>Riwayat Pembayaran</h2>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>No. Transaksi</th>
                  <th>Metode Pembayaran</th>
                  <th>Referensi</th>
                  <th>Dicatat Oleh</th>
                  <th>Tanggal</th>
                  <th className={styles.textRight}>Jumlah</th>
                </tr>
              </thead>
              <tbody>
                {invoice.payments.map((p, idx) => (
                  <tr key={idx}>
                    <td>
                      <strong style={{ fontFamily: 'monospace' }}>{p.operationId}</strong>
                    </td>
                    <td style={{ textTransform: 'uppercase' }}>{p.paymentMethod}</td>
                    <td>{p.reference || '-'}</td>
                    <td>{p.recordedByName}</td>
                    <td style={{ fontSize: '0.85rem' }}>
                      {new Date(p.paidAt).toLocaleDateString('id-ID')}
                    </td>
                    <td className={styles.textRight}>
                      <strong style={{ color: '#059669' }}>{formatRupiah(p.amount)}</strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showPaymentModal && (
        <RecordPaymentModal
          businessId={businessId}
          invoice={invoice}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={() => {
            setShowPaymentModal(false);
            refetch();
          }}
        />
      )}

      {showVoidModal && (
        <VoidInvoiceModal
          businessId={businessId}
          invoice={invoice}
          onClose={() => setShowVoidModal(false)}
          onSuccess={() => {
            setShowVoidModal(false);
            refetch();
          }}
        />
      )}

      {showPrintModal && (
        <Modal onClose={() => setShowPrintModal(false)}>
          <div className={styles.modalDialog} style={{ maxWidth: 760, padding: 16 }}>
            <PrintableInvoice invoice={invoice} onClose={() => setShowPrintModal(false)} />
          </div>
        </Modal>
      )}
    </div>
  );
}

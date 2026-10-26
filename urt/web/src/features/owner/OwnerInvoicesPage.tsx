import { Pagination } from '../../components/navigation/Pagination';
import { useSearchParams } from 'react-router';
import { useAppSelector } from '../../redux/hooks';
import { selectSelectedBusinessId } from '../business/businessSlice';
import { useGetInvoicesQuery } from '../invoices/invoicesApi';
import type { InvoiceStatus } from '../invoices/types';
import { InvoiceStatusBadge } from '../invoices/InvoiceStatusBadge';
import { formatRupiah } from '../tickets/currency';
import { ButtonLink } from '../../components/ui/Button';
import { PageLoader, EmptyState, InlineNotice } from '../../components/feedback/Feedback';
import styles from '../tickets/Tickets.module.css';

export default function OwnerInvoicesPage() {
  const businessId = useAppSelector(selectSelectedBusinessId);
  const [searchParams, setSearchParams] = useSearchParams();

  const statusParam = (searchParams.get('status') as InvoiceStatus) || '';

  const { data, isLoading, isError } = useGetInvoicesQuery(
    {
      businessId: businessId || '',
      params: {
        status: statusParam || undefined,
        page: Math.max(1, Number(searchParams.get('page')) || 1),
      },
    },
    { skip: !businessId },
  );

  const invoices = data?.data?.invoices || [];

  const handleStatusChange = (status: string) => {
    const next = new URLSearchParams(searchParams);
    if (status) {
      next.set('status', status);
    } else {
      next.delete('status');
    }
    next.delete('page');
    setSearchParams(next);
  };

  if (isLoading && !statusParam) {
    return <PageLoader />;
  }

  return (
    <div className={`container page-content ${styles.container}`}>
      <header className={styles.heading}>
        <div>
          <span className="eyebrow">Keuangan & Pembayaran</span>
          <h1>Daftar Transaksi & Invoice</h1>
          <p>Kelola tagihan perbaikan, catatan pembayaran kas/transfer, dan status pelunasan.</p>
        </div>
      </header>

      {isError && <InlineNotice>Daftar invoice gagal dimuat. Silakan coba lagi.</InlineNotice>}
      {/* Filter Tabs */}
      <div className={styles.filters}>
        <div>
          <label
            htmlFor="invoiceStatusFilter"
            style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}
          >
            Filter Status Tagihan
          </label>
          <select
            id="invoiceStatusFilter"
            className={styles.filterSelect}
            value={statusParam}
            onChange={(e) => handleStatusChange(e.target.value)}
          >
            <option value="">Semua Status Tagihan</option>
            <option value="issued">Belum Dibayar</option>
            <option value="partially_paid">Sebagian Dibayar</option>
            <option value="paid">Lunas</option>
            <option value="voided">Dibatalkan (Void)</option>
          </select>
        </div>
      </div>

      {invoices.length === 0 ? (
        <EmptyState
          title="Belum Ada Transaksi"
          description={
            statusParam
              ? 'Tidak ada invoice yang sesuai dengan filter status yang dipilih.'
              : 'Invoice diterbitkan secara otomatis setelah proses perbaikan selesai dan disetujui.'
          }
        />
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>No. Invoice</th>
                <th>Tiket Servis</th>
                <th>Pelanggan</th>
                <th className={styles.textRight}>Total Tagihan</th>
                <th className={styles.textRight}>Terbayar</th>
                <th className={styles.textRight}>Sisa Tagihan</th>
                <th>Status</th>
                <th>Tanggal</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id}>
                  <td>
                    <strong style={{ fontFamily: 'monospace', color: 'var(--navy-950)' }}>
                      {inv.invoiceNumber}
                    </strong>
                  </td>
                  <td>
                    <span className={styles.ticketCode} style={{ fontSize: '0.88rem' }}>
                      {inv.ticketCode}
                    </span>
                  </td>
                  <td>{inv.customer?.name}</td>
                  <td className={styles.textRight}>
                    <strong>{formatRupiah(inv.totalAmount)}</strong>
                  </td>
                  <td className={styles.textRight} style={{ color: '#059669' }}>
                    {formatRupiah(inv.paidAmount)}
                  </td>
                  <td
                    className={styles.textRight}
                    style={{
                      color: inv.balance > 0 ? '#dc2626' : '#059669',
                      fontWeight: 700,
                    }}
                  >
                    {formatRupiah(inv.balance)}
                  </td>
                  <td>
                    <InvoiceStatusBadge status={inv.status} />
                  </td>
                  <td style={{ fontSize: '0.82rem', color: 'var(--slate-500)' }}>
                    {new Date(inv.issuedAt).toLocaleDateString('id-ID')}
                  </td>
                  <td>
                    <ButtonLink
                      to={`/owner/transactions/${inv.id}`}
                      variant="secondary"
                      style={{ fontSize: '0.8rem', padding: '4px 10px' }}
                    >
                      Buka Detail
                    </ButtonLink>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination
        pagination={data?.data.pagination}
        onPageChange={(page) => {
          const next = new URLSearchParams(searchParams);
          next.set('page', String(page));
          setSearchParams(next);
        }}
      />
    </div>
  );
}

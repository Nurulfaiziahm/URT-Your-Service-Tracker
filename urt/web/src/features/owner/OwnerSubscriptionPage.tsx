import { useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router';
import { useAppSelector } from '../../redux/hooks';
import { selectSelectedBusinessId } from '../business/businessSlice';
import {
  useGetPackagesQuery,
  useGetSubscriptionQuery,
  useGetSubscriptionPaymentsQuery,
  useCheckoutSubscriptionMutation,
} from '../subscription/subscriptionApi';
import { Button, ButtonLink } from '../../components/ui/Button';
import { Pagination } from '../../components/navigation/Pagination';
import { InlineNotice, PageLoader } from '../../components/feedback/Feedback';
import { SummaryCard } from '../../components/ui/SummaryCard';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { ResponsiveTable } from '../../components/ui/ResponsiveTable';
import { formatRupiah } from '../tickets/currency';
import type { ApiErrorBody } from '../../lib/api.types';
import styles from '../subscription/Subscription.module.css';
const paymentLabels = {
  pending: 'Menunggu Pembayaran',
  paid: 'Lunas',
  failed: 'Gagal',
  expired: 'Kedaluwarsa',
};
export default function OwnerSubscriptionPage() {
  const businessId = useAppSelector(selectSelectedBusinessId) || '';
  const location = useLocation();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number(params.get('page')) || 1);
  const choosing = location.pathname.endsWith('/plans');
  const { data, isLoading, isError, refetch } = useGetSubscriptionQuery(businessId, {
    skip: !businessId,
  });
  const {
    data: packages,
    isLoading: loadingPackages,
    isError: packagesError,
  } = useGetPackagesQuery();
  const {
    data: payments,
    isLoading: loadingPayments,
    isError: paymentsError,
  } = useGetSubscriptionPaymentsQuery({ businessId, page }, { skip: !businessId });
  const [checkout, { isLoading: checkingOut }] = useCheckoutSubscriptionMutation();
  const [error, setError] = useState('');
  const subscription = data?.data.subscription;
  async function selectPlan(packageCode: string) {
    setError('');
    try {
      const result = await checkout({ businessId, packageCode }).unwrap();
      navigate(`/owner/subscription/payments/${result.data.payment.id}`, {
        state: { instructions: result.data.instructions },
      });
    } catch (err) {
      const e = err as { data?: ApiErrorBody };
      setError(
        e.data?.error || e.data?.message || 'Pembayaran belum dapat dibuat. Silakan coba lagi.',
      );
    }
  }
  if (isLoading || !businessId) return <PageLoader />;
  if (isError || !subscription)
    return (
      <InlineNotice>
        Data langganan gagal dimuat.{' '}
        <Button onClick={() => refetch()} size="small">
          Coba lagi
        </Button>
      </InlineNotice>
    );
  return (
    <div className="reference-stack">
      <header className="reference-heading">
        <div>
          <h1>{choosing ? 'Pilih Paket Langganan' : 'Langganan Saya'}</h1>
          <p>Kelola paket, masa aktif, dan pembayaran tempat servis Anda.</p>
        </div>
        {choosing ? (
          <ButtonLink to="/owner/subscription" variant="secondary">
           Langganan Saya
          </ButtonLink>
        ) : (
          <ButtonLink to="/owner/subscription/plans">Perpanjang / Pilih Paket</ButtonLink>
        )}
      </header>
      {error && <InlineNotice type="error">{error}</InlineNotice>}
      {!choosing && (
        <>
          <div className="reference-stats reference-stats-three">
            <SummaryCard
              label="Paket Saat Ini"
              value={subscription.planName || 'Belum Berlangganan'}
              icon="wallet"
            />
            <SummaryCard
              label="Sisa Masa Aktif"
              value={`${subscription.daysRemaining} Hari`}
              icon="clock"
              tone={subscription.status === 'active' ? 'green' : 'orange'}
            />
            <SummaryCard
              label="Teknisi Terdaftar"
              value={`${subscription.occupiedTechnicianSeats} / ${subscription.package?.maxTechnicians ?? '∞'}`}
              icon="people"
            />
          </div>
          <section className="reference-panel">
            <div className="reference-panel-header">
              <h2>Status Langganan</h2>
              <StatusBadge label={subscription.status === 'active' ? 'Aktif' : subscription.status === 'expired' ? 'Kedaluwarsa' : 'Belum Aktif'} tone={subscription.status === 'active' ? 'success' : subscription.status === 'expired' ? 'danger' : 'warning'} />
            </div>
            <dl className="reference-dl">
              <div>
                <dt>Mulai Periode</dt>
                <dd>
                  {subscription.currentPeriodStart
                    ? new Date(subscription.currentPeriodStart).toLocaleDateString('id-ID')
                    : '—'}
                </dd>
              </div>
              <div>
                <dt>Berakhir</dt>
                <dd>
                  {subscription.currentPeriodEnd
                    ? new Date(subscription.currentPeriodEnd).toLocaleDateString('id-ID')
                    : '—'}
                </dd>
              </div>
            </dl>
            {subscription.pendingPayment && (
              <div className="reference-callout">
                <p>Ada pembayaran yang menunggu penyelesaian.</p>
                <ButtonLink
                  to={`/owner/subscription/payments/${subscription.pendingPayment.id}`}
                  size="small"
                >
                  Lihat Instruksi Pembayaran
                </ButtonLink>
              </div>
            )}
          </section>
          <section className="reference-panel">
            <h2>Riwayat Pembayaran</h2>
            {paymentsError ? (
              <InlineNotice>Riwayat pembayaran gagal dimuat.</InlineNotice>
            ) : loadingPayments ? (
              <PageLoader />
            ) : (
              <ResponsiveTable className={styles.tableWrap} rowHeading="Pembayaran">
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>No. Invoice</th>
                      <th>Tanggal</th>
                      <th>Paket</th>
                      <th>Total</th>
                      <th>Status</th>
                      <th>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments?.data.map((p) => (
                      <tr key={p.id}>
                        <td>{p.reference}</td>
                        <td>{new Date(p.createdAt).toLocaleDateString('id-ID')}</td>
                        <td>{p.package.name}</td>
                        <td>{formatRupiah(p.amount)}</td>
                        <td>
                          <StatusBadge label={paymentLabels[p.status]} tone={p.status === 'paid' ? 'success' : p.status === 'failed' || p.status === 'expired' ? 'danger' : 'warning'} />
                        </td>
                        <td>
                          <ButtonLink
                            size="small"
                            variant="secondary"
                            to={`/owner/subscription/payments/${p.id}?page=${page}`}
                          >
                            Detail
                          </ButtonLink>
                        </td>
                      </tr>
                    ))}
                    {!payments?.data.length && (
                      <tr>
                        <td colSpan={6}>Belum ada pembayaran langganan.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </ResponsiveTable>
            )}
            <Pagination
              pagination={payments?.pagination}
              onPageChange={(p) => setParams({ page: String(p) })}
            />
          </section>
        </>
      )}
      {choosing &&
        (loadingPackages ? (
          <PageLoader />
        ) : packagesError ? (
          <InlineNotice>Paket gagal dimuat.</InlineNotice>
        ) : (
          <div className={styles.plans}>
            {packages?.data.packages.map((plan) => (
              <section className={styles.plan} data-popular={plan.isPopular} key={plan.code}>
                {plan.isPopular && <span className={styles.recommended}>REKOMENDASI</span>}
                <h2>{plan.name}</h2>
                <p>
                  {plan.description ||
                    `Ditagih ${plan.billingInterval === 'year' ? 'sekali setahun' : 'setiap bulan'}`}
                </p>
                <div className={styles.price}>
                  {formatRupiah(plan.price)}
                  <small> / {plan.billingInterval === 'year' ? 'tahun' : 'bulan'}</small>
                </div>
                <ul>
                  {plan.features.map((feature) => (
                    <li key={feature}>
                      <span aria-hidden="true">✓</span> {feature}
                    </li>
                  ))}
                </ul>
                <Button
                  pending={checkingOut}
                  disabled={
                    !!subscription.pendingPayment ||
                    (subscription.status === 'active' && subscription.package?.code !== plan.code)
                  }
                  onClick={() => void selectPlan(plan.code)}
                >
                  Pilih {plan.name}
                </Button>
              </section>
            ))}
          </div>
        ))}
      {choosing && subscription.pendingPayment && (
        <InlineNotice>Selesaikan pembayaran yang tertunda sebelum memilih paket baru.</InlineNotice>
      )}
    </div>
  );
}

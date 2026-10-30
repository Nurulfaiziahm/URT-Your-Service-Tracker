import { Navigate, useLocation, useParams } from 'react-router';
import { DirectoryTicketHistory } from '../tickets/DirectoryTicketHistory';
import { useGetCustomerQuery } from '../customers/customersApi';
import { useAppSelector } from '../../redux/hooks';
import { selectSelectedBusinessId } from '../business/businessSlice';
import { ButtonLink } from '../../components/ui/Button';
import { InlineNotice, PageLoader } from '../../components/feedback/Feedback';

export default function OwnerCustomerDetailPage() {
  const businessId = useAppSelector(selectSelectedBusinessId);
  const { id = '' } = useParams();
  const location = useLocation();
  const { currentData: data, isLoading, isError } = useGetCustomerQuery({ businessId: businessId || '', id }, { skip: !businessId || !id });
  if (location.pathname.endsWith('/edit')) return <Navigate to={`/owner/customers/${id}`} replace />;
  if (isLoading) return <PageLoader />;
  const customer = data?.data.customer;
  if (isError || !customer) return <InlineNotice>Data pelanggan belum dapat dimuat. <ButtonLink to="/owner/customers">Kembali ke pelanggan</ButtonLink></InlineNotice>;
  return <div className="reference-stack">
    <header className="reference-heading"><div><ButtonLink to="/owner/customers" variant="ghost">Kembali ke pelanggan</ButtonLink>
      <h1>{customer.name}</h1><p>Teknisi penanggung jawab dan keluhan pada setiap tiket servis.</p></div></header>
    <section className="reference-panel"><h2>Informasi Pelanggan</h2><dl className="reference-dl">
      <div><dt>Nama</dt><dd>{customer.name}</dd></div><div><dt>WhatsApp</dt><dd>{customer.phone || '—'}</dd></div>
      <div><dt>Email</dt><dd>{customer.email || '—'}</dd></div>
    </dl></section>
    {businessId && <DirectoryTicketHistory key={customer.id} businessId={businessId} customerId={customer.id} />}
  </div>;
}

import { DirectoryTicketHistory } from '../tickets/DirectoryTicketHistory';
import { useState, type FormEvent } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router';
import { useGetCustomerQuery, useUpdateCustomerMutation } from '../customers/customersApi';
import type { Customer } from '../customers/types';
import { useAppSelector } from '../../redux/hooks';
import { selectSelectedBusinessId } from '../business/businessSlice';
import { TextInput } from '../../components/ui/TextInput';
import { Button, ButtonLink } from '../../components/ui/Button';
import { InlineNotice, PageLoader } from '../../components/feedback/Feedback';
import styles from '../business/Business.module.css';

function EditForm({ item, businessId }: { item: Customer; businessId: string }) {
  const navigate = useNavigate();
  const [name, setName] = useState(item.name || '');
  const [email, setEmail] = useState(item.email || '');
  const [phone, setPhone] = useState(item.phone || '');
  const [address, setAddress] = useState(item.address || '');
  const [status, setStatus] = useState<'active' | 'archived'>(item.status);
  const [error, setError] = useState('');
  const [update, { isLoading }] = useUpdateCustomerMutation();
  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await update({
        businessId,
        customerId: item.id,
        body: {
          name: name.trim(),
          email: email.trim() || undefined,
          phone: phone.trim(),
          address: address.trim(),
          status,
        },
      }).unwrap();
      navigate(`/owner/customers/${item.id}`);
    } catch {
      setError('Perubahan gagal disimpan. Periksa data dan coba lagi.');
    }
  }
  return (
    <form className={styles.card} onSubmit={submit}>
      <h2>Informasi Pelanggan</h2>
      {error && <InlineNotice>{error}</InlineNotice>}
      <div className={styles.row}>
        <TextInput
          label="Nama lengkap"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <TextInput
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <TextInput
          label="Nomor WhatsApp"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <TextInput
          label="Alamat"
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />
      </div>
      <label>
        Status
        <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
          <option value="active">Aktif</option>
          <option value="archived">Diarsipkan</option>
        </select>
      </label>
      <div className="actions">
        <Button type="submit" pending={isLoading}>
          Simpan Perubahan
        </Button>
        <ButtonLink to={`/owner/customers/${item.id}`} variant="secondary">
          Batal
        </ButtonLink>
      </div>
    </form>
  );
}
export default function OwnerCustomerDetailPage() {
  const businessId = useAppSelector(selectSelectedBusinessId);
  const { id = '' } = useParams();
  const editing = useLocation().pathname.endsWith('/edit');
  const { data, isLoading, isError } = useGetCustomerQuery(
    { businessId: businessId || '', id },
    { skip: !businessId || !id },
  );
  const item = data?.data.customer;
  if (isLoading) return <PageLoader />;
  if (isError || !item)
    return (
      <InlineNotice>
        Data pelanggan tidak dapat dimuat.{' '}
        <ButtonLink to="/owner/customers" variant="secondary">
          Kembali
        </ButtonLink>
      </InlineNotice>
    );
  return (
    <div className="reference-stack">
      <header className="reference-heading">
        <div>
          <ButtonLink to="/owner/customers" variant="ghost" size="small">
            ← Daftar Pelanggan
          </ButtonLink>
          <h1>{editing ? 'Edit Pelanggan' : item.name}</h1>
          <p>
            {editing ? 'Perbarui informasi pelanggan.' : 'Detail pelanggan dan informasi kontak.'}
          </p>
        </div>
        {!editing && <ButtonLink to={`/owner/customers/${id}/edit`}>Edit Pelanggan</ButtonLink>}
      </header>
      {editing ? (
        <EditForm key={item.id + item.updatedAt} item={item} businessId={businessId!} />
      ) : (
        <>
          <section className="reference-panel">
            <div className="reference-profile">
              <span className="reference-avatar">{item.name.slice(0, 2).toUpperCase()}</span>
              <div>
                <h2>{item.name}</h2>
                <p>{item.status === 'active' ? 'Aktif' : 'Nonaktif'}</p>
              </div>
            </div>
            <dl className="reference-dl">
              <div>
                <dt>Nama lengkap</dt>
                <dd>{item.name || '—'}</dd>
              </div>
              <div>
                <dt>Email</dt>
                <dd>{item.email || '—'}</dd>
              </div>
              <div>
                <dt>Nomor WhatsApp</dt>
                <dd>{item.phone || '—'}</dd>
              </div>
              <div>
                <dt>Alamat</dt>
                <dd>{item.address || '—'}</dd>
              </div>
              <div>
                <dt>Terdaftar</dt>
                <dd>{new Date(item.createdAt).toLocaleDateString('id-ID')}</dd>
              </div>
            </dl>
          </section>
          <DirectoryTicketHistory key={item.id} businessId={businessId!} customerId={item.id} />
        </>
      )}
    </div>
  );
}

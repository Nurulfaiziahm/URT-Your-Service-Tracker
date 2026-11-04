import { useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router';
import { useAppSelector } from '../../redux/hooks';
import { selectSelectedBusinessId } from '../business/businessSlice';
import { useGetCustomersQuery, useDeleteCustomerMutation, useCreateCustomerMutation } from '../customers/customersApi';
import { Pagination } from '../../components/navigation/Pagination';
import { TextInput } from '../../components/ui/TextInput';
import { Button } from '../../components/ui/Button';
import { ResponsiveTable } from '../../components/ui/ResponsiveTable';
import { InlineNotice, PageLoader, EmptyState } from '../../components/feedback/Feedback';
import type { ApiErrorBody } from '../../lib/api.types';
import styles from '../business/Business.module.css';

export default function OwnerCustomersPage() {
  const businessId = useAppSelector(selectSelectedBusinessId);
  const location = useLocation();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [notice, setNotice] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const isNewRoute = location.pathname.endsWith('/new');
  const createFormOpen = showCreateForm || isNewRoute;
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [createError, setCreateError] = useState('');
  const page = Math.max(1, Number(params.get('page')) || 1);
  const { currentData: data, isLoading, isError } = useGetCustomersQuery(
    { businessId: businessId || '', page, q: search.trim() || undefined },
    { skip: !businessId, pollingInterval: 10000, refetchOnFocus: true, refetchOnReconnect: true },
  );
  const [remove, deletion] = useDeleteCustomerMutation();
  const [create, creation] = useCreateCustomerMutation();
  async function createContact(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!businessId || creation.isLoading) return;
    setCreateError('');
    try {
      await create({ businessId, body: {
        name: name.trim(), phone: phone.trim() || undefined,
        email: email.trim().toLowerCase() || undefined, address: address.trim() || undefined,
      } }).unwrap();
      setName(''); setPhone(''); setEmail(''); setAddress('');
      setShowCreateForm(false);
      setNotice('Kontak pelanggan berhasil ditambahkan.');
    } catch (error) {
      setCreateError((error as { data?: ApiErrorBody }).data?.error || 'Kontak pelanggan belum dapat ditambahkan.');
    }
  }
  async function removeContact(id: string, name: string) {
    if (!businessId || !window.confirm(`Hapus kontak ${name}? Riwayat tiket servis tetap disimpan.`)) return;
    try {
      await remove({ businessId, customerId: id }).unwrap();
      setNotice('Kontak pelanggan dihapus dari daftar.');
    } catch (error) {
      setNotice((error as { data?: ApiErrorBody }).data?.error || 'Kontak pelanggan belum dapat dihapus.');
    }
  }
  if (isLoading) return <PageLoader />;
  return <div className={`container page-content ${styles.container}`}>
    <header className={styles.heading}><span className="eyebrow">Pelanggan</span><h1>Penanganan Pelanggan</h1>
      <p>Lihat keluhan pelanggan dan teknisi yang menangani tiket servisnya.</p>
      <Button onClick={() => { setCreateError(''); if (isNewRoute) void navigate('/owner/customers'); else setShowCreateForm((shown) => !shown); }}>Tambah kontak</Button></header>
    {notice && <InlineNotice>{notice}</InlineNotice>}
    {createFormOpen && <form className="reference-panel" onSubmit={(event) => void createContact(event)}>
      <h2>Kontak pelanggan baru</h2>
      {createError && <InlineNotice>{createError}</InlineNotice>}
      <div className="reference-form-grid">
        <TextInput label="Nama lengkap" value={name} required maxLength={100} onChange={(event) => setName(event.target.value)} />
        <TextInput label="Telepon / WhatsApp" value={phone} maxLength={30} onChange={(event) => setPhone(event.target.value)} />
        <TextInput label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        <TextInput label="Alamat" value={address} maxLength={200} onChange={(event) => setAddress(event.target.value)} />
      </div>
      <div className="actions"><Button type="submit" pending={creation.isLoading}>Simpan kontak</Button>
        <Button type="button" variant="ghost" onClick={() => { if (isNewRoute) void navigate('/owner/customers'); else setShowCreateForm(false); }}>Batal</Button></div>
    </form>}
    {isError && <InlineNotice>Data pelanggan belum dapat dimuat.</InlineNotice>}
    <TextInput label="Cari pelanggan" value={search} onChange={(event) => { setSearch(event.target.value); setParams({}); }} />
    {!data?.data.length ? <EmptyState title="Belum ada pelanggan" description="Pelanggan akan muncul setelah mengajukan servis." /> : <ResponsiveTable className={styles.tableWrap} rowHeading="Pelanggan">
      <table className={styles.table}><thead><tr><th>Pelanggan</th><th>Kontak</th><th>Akun</th><th>Penanganan Servis</th></tr></thead>
        <tbody>{data.data.map((customer) => <tr key={customer.id}>
          <td>{customer.name}</td><td>{customer.phone || customer.email || '—'}</td>
          <td>{customer.userId ? 'Memiliki akun' : 'Tanpa akun'}</td>
          <td><div className="actions"><Link className="text-link" to={`/owner/customers/${customer.id}`}>Lihat teknisi & keluhan</Link>
            {!customer.userId && <Button variant="ghost" pending={deletion.isLoading} onClick={() => void removeContact(customer.id, customer.name)}>Hapus kontak</Button>}
          </div></td></tr>)}</tbody>
      </table></ResponsiveTable>}
    <Pagination pagination={data?.pagination} onPageChange={(value) => setParams({ page: String(value) })} />
  </div>;
}

import { Icon } from '../../components/ui/Icon';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router';
import { Pagination } from '../../components/navigation/Pagination';
import { SummaryCard } from '../../components/ui/SummaryCard';
import { useState, type FormEvent } from 'react';
import { useAppSelector } from '../../redux/hooks';
import { selectSelectedBusinessId } from '../business/businessSlice';
import {
  useGetCustomersQuery,
  useCreateCustomerMutation,
  useSendCustomerInvitationMutation,
} from '../customers/customersApi';
import { CustomerImportModal } from '../customers/CustomerImportModal';
import { TextInput } from '../../components/ui/TextInput';
import { Button } from '../../components/ui/Button';
import { InlineNotice, PageLoader, EmptyState } from '../../components/feedback/Feedback';
import styles from '../business/Business.module.css';

export default function OwnerCustomersPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number(params.get('page')) || 1);
  const filter = params.get('status') || '';
  const setFilter = (status: string) => {
    const next = new URLSearchParams(params);
    next.delete('page');
    status ? next.set('status', status) : next.delete('status');
    setParams(next);
  };

  const businessId = useAppSelector(selectSelectedBusinessId);
  const showAddForm = location.pathname.endsWith('/new');
  const setShowAddForm = (open: boolean) =>
    navigate(open ? '/owner/customers/new' : '/owner/customers');
  const [showImportModal, setShowImportModal] = useState(false);
  const [search, setSearch] = useState('');

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);

  const { data, isLoading, isError } = useGetCustomersQuery(
    {
      businessId: businessId || '',
      q: search.trim() || undefined,
      page,
      status: filter || undefined,
    },
    { skip: !businessId },
  );

  const { data: allCount } = useGetCustomersQuery(
    { businessId: businessId || '', limit: 1 },
    { skip: !businessId },
  );
  const { data: activeCount } = useGetCustomersQuery(
    { businessId: businessId || '', limit: 1, status: 'active' },
    { skip: !businessId },
  );
  const [createCustomer, { isLoading: isCreating }] = useCreateCustomerMutation();
  const [sendInvitation, { isLoading: isSendingInvite }] = useSendCustomerInvitationMutation();

  const customers = data?.data || [];

  async function handleAddCustomer(e: FormEvent) {
    e.preventDefault();
    setFeedback(null);

    if (!businessId) return;

    try {
      await createCustomer({
        businessId,
        body: {
          name: name.trim(),
          phone: phone.trim() || undefined,
          email: email.trim().toLowerCase() || undefined,
          address: address.trim() || undefined,
        },
      }).unwrap();

      setFeedback('Kontak pelanggan berhasil ditambahkan.');
      setShowAddForm(false);
      setName('');
      setPhone('');
      setEmail('');
      setAddress('');
    } catch {
      setFeedback('Gagal menambahkan kontak pelanggan.');
    }
  }

  async function handleSendInvite(customerId: string) {
    if (!businessId) return;
    try {
      await sendInvitation({ businessId, customerId }).unwrap();
      setFeedback('Tautan klaim undangan berhasil dibuat.');
    } catch {
      setFeedback('Gagal mengirimkan undangan.');
    }
  }

  if (isLoading && !search) {
    return <PageLoader />;
  }

  return (
    <div className={`container page-content ${styles.container}`}>
      <header className={styles.heading}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div>
            <span className="eyebrow">Data Pelanggan</span>
            <h1>{showAddForm ? 'Tambah Pelanggan' : 'Daftar Pelanggan'}</h1>
            <p>Kelola kontak pelanggan dan hubungkan riwayat servis perangkat mereka.</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="secondary" onClick={() => setShowImportModal(true)}>
              <Icon name="people" /> Impor Kontak CSV
            </Button>
            <Button onClick={() => setShowAddForm(!showAddForm)}>
              {showAddForm ? 'Tutup Formulir' : '+ Tambah Kontak Pelanggan'}
            </Button>
          </div>
        </div>
      </header>

      {feedback && <InlineNotice>{feedback}</InlineNotice>}
      {isError && <InlineNotice>Data gagal dimuat. Silakan coba lagi.</InlineNotice>}

      {showAddForm && (
        <form className={styles.card} onSubmit={handleAddCustomer}>
          <div className={styles.cardHeader}>
            <h2>Tambah Kontak Pelanggan Baru</h2>
            <p>Kontak ini dapat langsung digunakan untuk pencatatan tiket walk-in.</p>
          </div>

          <div className={styles.row}>
            <TextInput
              label="Nama Lengkap Pelanggan"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <TextInput
              label="Nomor Telepon / WhatsApp"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <div className={styles.row}>
            <TextInput
              label="Alamat Email (opsional)"
              type="email"
              placeholder="nama@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              hint="Diperlukan jika pelanggan ingin mengklaim akun online."
            />
            <TextInput
              label="Alamat Domisili (opsional)"
              placeholder="Kota / Daerah"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>

          <div className="actions">
            <Button type="submit" pending={isCreating}>
              Simpan Kontak Pelanggan
            </Button>
            <Button variant="ghost" onClick={() => setShowAddForm(false)}>
              Batal
            </Button>
          </div>
        </form>
      )}

      {!showAddForm && (
        <>
          <div className="reference-stats reference-stats-three">
            <SummaryCard
              label="Total Pelanggan"
              value={allCount?.pagination?.total ?? '—'}
              icon="people"
            />
            <SummaryCard
              label="Pelanggan Aktif"
              value={activeCount?.pagination?.total ?? '—'}
              icon="check"
              tone="green"
            />
            <SummaryCard
              label="Hasil Pencarian"
              value={data?.pagination?.total ?? '—'}
              icon="chart"
            />
          </div>
          <div className="reference-toolbar">
            <TextInput
              label="Cari Pelanggan"
              placeholder="Cari nama atau kontak…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                const next = new URLSearchParams(params);
                next.delete('page');
                setParams(next, { replace: true });
              }}
            />
            <label>
              Status{' '}
              <select value={filter} onChange={(e) => setFilter(e.target.value)}>
                <option value="">Semua status</option>
                <option value="active">Aktif</option>
                <option value="archived">Diarsipkan</option>
              </select>
            </label>
          </div>
          {customers.length === 0 ? (
            <EmptyState
              title="Belum Ada Kontak Pelanggan"
              description={
                search
                  ? 'Tidak ada kontak yang cocok dengan kata kunci pencarian.'
                  : 'Tambahkan kontak pelanggan walk-in pertama Anda.'
              }
              action={
                !search ? (
                  <Button onClick={() => setShowAddForm(true)}>+ Tambah Pelanggan Pertama</Button>
                ) : undefined
              }
            />
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Nama Pelanggan</th>
                    <th>Kontak</th>
                    <th>Alamat</th>
                    <th>Status Akun</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <Link className="text-link" to={`/owner/customers/${c.id}`}>
                          {c.name}
                        </Link>
                      </td>
                      <td>
                        {c.phone || '-'}
                        {c.email && (
                          <div style={{ fontSize: '0.8rem', color: 'var(--slate-500)' }}>
                            {c.email}
                          </div>
                        )}
                      </td>
                      <td>{c.address || '-'}</td>
                      <td>
                        {c.userId ? (
                          <span className={styles.statusActive}>Terhubung (Online)</span>
                        ) : (
                          <span className={styles.statusInactive}>Kontak Lokal (Walk-in)</span>
                        )}
                      </td>
                      <td>
                        <Link className="text-link" to={`/owner/customers/${c.id}/edit`}>
                          Edit
                        </Link>
                        {!c.userId && c.email && (
                          <Button
                            variant="ghost"
                            onClick={() => handleSendInvite(c.id)}
                            pending={isSendingInvite}
                            style={{ fontSize: '0.85rem' }}
                          >
                            Kirim Undangan Klaim
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <Pagination
            pagination={data?.pagination}
            onPageChange={(p) => {
              const next = new URLSearchParams(params);
              next.set('page', String(p));
              setParams(next);
            }}
          />
        </>
      )}
      {showImportModal && businessId && (
        <CustomerImportModal
          businessId={businessId}
          onClose={() => setShowImportModal(false)}
          onSuccess={() => {
            setShowImportModal(false);
            setFeedback('Kontak pelanggan berhasil diimpor.');
          }}
        />
      )}
    </div>
  );
}

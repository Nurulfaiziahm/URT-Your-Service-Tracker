import { Link, useLocation, useNavigate, useSearchParams } from 'react-router';
import { Pagination } from '../../components/navigation/Pagination';
import { SummaryCard } from '../../components/ui/SummaryCard';
import { useState, type FormEvent } from 'react';
import { useAppSelector } from '../../redux/hooks';
import { selectSelectedBusinessId } from '../business/businessSlice';
import {
  useGetServicesQuery,
  useCreateServiceMutation,
  useUpdateServiceMutation,
} from '../services/servicesApi';
import { TextInput } from '../../components/ui/TextInput';
import { Button } from '../../components/ui/Button';
import { InlineNotice, PageLoader, EmptyState } from '../../components/feedback/Feedback';
import styles from '../business/Business.module.css';

export default function OwnerServicesPage() {
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
    navigate(open ? '/owner/services/new' : '/owner/services');

  const [search, setSearch] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [basePrice, setBasePrice] = useState('');
  const [estimatedDuration, setEstimatedDuration] = useState('');
  const [description, setDescription] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);

  const { data, isLoading, isError } = useGetServicesQuery(
    {
      businessId: businessId || '',
      page,
      q: search.trim() || undefined,
      status: filter || undefined,
    },
    { skip: !businessId },
  );

  const { data: allCount } = useGetServicesQuery(
    { businessId: businessId || '', limit: 1 },
    { skip: !businessId },
  );
  const { data: activeCount } = useGetServicesQuery(
    { businessId: businessId || '', limit: 1, status: 'active' },
    { skip: !businessId },
  );
  const [createService, { isLoading: isCreating }] = useCreateServiceMutation();
  const [updateService, { isLoading: isUpdating }] = useUpdateServiceMutation();

  const services = data?.data || [];

  async function handleAddService(e: FormEvent) {
    e.preventDefault();
    setFeedback(null);

    if (!businessId) return;

    const parsedPrice = parseInt(basePrice.replace(/\D/g, ''), 10) || 0;

    try {
      await createService({
        businessId,
        body: {
          name: name.trim(),
          category: category.trim(),
          basePrice: parsedPrice,
          estimatedDuration: estimatedDuration.trim() || undefined,
          description: description.trim() || undefined,
        },
      }).unwrap();

      setFeedback('Layanan servis berhasil ditambahkan.');
      setShowAddForm(false);
      setName('');
      setCategory('');
      setBasePrice('');
      setEstimatedDuration('');
      setDescription('');
    } catch {
      setFeedback('Gagal menambahkan layanan servis.');
    }
  }

  async function handleToggleStatus(serviceId: string, currentStatus: 'active' | 'archived') {
    if (!businessId) return;
    const nextStatus = currentStatus === 'active' ? 'archived' : 'active';
    try {
      await updateService({
        businessId,
        serviceId,
        body: { status: nextStatus },
      }).unwrap();
    } catch {
      setFeedback('Gagal memperbarui status layanan.');
    }
  }

  if (isLoading) {
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
            <span className="eyebrow">Katalog Layanan</span>
            <h1>{showAddForm ? 'Tambah Layanan' : 'Daftar Layanan'}</h1>
            <p>Daftar jenis perbaikan dan estimasi biaya standar untuk tempat servis Anda.</p>
          </div>
          <Button onClick={() => setShowAddForm(!showAddForm)}>
            {showAddForm ? 'Tutup Formulir' : '+ Tambah Layanan Servis'}
          </Button>
        </div>
      </header>

      {feedback && <InlineNotice>{feedback}</InlineNotice>}
      {isError && <InlineNotice>Data gagal dimuat. Silakan coba lagi.</InlineNotice>}

      {showAddForm && (
        <form className={styles.card} onSubmit={handleAddService}>
          <div className={styles.cardHeader}>
            <h2>Tambah Layanan Baru</h2>
            <p>Layanan ini akan menjadi pilihan saat pembuatan tiket dan estimasi biaya.</p>
          </div>

          <div className={styles.row}>
            <TextInput
              label="Nama Layanan"
              placeholder="Contoh: Ganti Baterai, Service Mesin, Instalasi OS"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <TextInput
              label="Kategori"
              placeholder="Contoh: Hardware, Software, Pembersihan"
              required
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
          </div>

          <div className={styles.row}>
            <TextInput
              label="Tarif Dasar (Rp)"
              type="text"
              placeholder="Contoh: 150000"
              required
              value={basePrice}
              onChange={(e) => setBasePrice(e.target.value)}
              hint="Masukkan angka nominal rupiah (IDR)."
            />
            <TextInput
              label="Estimasi Durasi (opsional)"
              placeholder="Contoh: 1-2 Jam, 1 Hari"
              value={estimatedDuration}
              onChange={(e) => setEstimatedDuration(e.target.value)}
            />
          </div>

          <TextInput
            label="Keterangan Layanan (opsional)"
            placeholder="Deskripsi singkat mengenai cakupan pengerjaan layanan"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <div className="actions">
            <Button type="submit" pending={isCreating}>
              Simpan Layanan
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
              label="Total Layanan"
              value={allCount?.pagination?.total ?? '—'}
              icon="tool"
            />
            <SummaryCard
              label="Layanan Aktif"
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
              label="Cari Layanan"
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
          {services.length === 0 ? (
            <EmptyState
              title="Belum Ada Katalog Layanan"
              description="Tambahkan layanan pertama Anda untuk mempermudah pembuatan estimasi tiket perbaikan."
              action={
                <Button onClick={() => setShowAddForm(true)}>+ Tambah Layanan Pertama</Button>
              }
            />
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Layanan</th>
                    <th>Kategori</th>
                    <th>Tarif Dasar</th>
                    <th>Durasi</th>
                    <th>Status</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {services.map((srv) => (
                    <tr key={srv.id}>
                      <td>
                        <Link className="text-link" to={`/owner/services/${srv.id}`}>
                          {srv.name}
                        </Link>
                        {srv.description && (
                          <div style={{ fontSize: '0.8rem', color: 'var(--slate-500)' }}>
                            {srv.description}
                          </div>
                        )}
                      </td>
                      <td>{srv.category}</td>
                      <td>
                        <strong>
                          {new Intl.NumberFormat('id-ID', {
                            style: 'currency',
                            currency: 'IDR',
                            maximumFractionDigits: 0,
                          }).format(srv.basePrice)}
                        </strong>
                      </td>
                      <td>{srv.estimatedDuration || '-'}</td>
                      <td>
                        <span
                          className={
                            srv.status === 'active' ? styles.statusActive : styles.statusInactive
                          }
                        >
                          {srv.status === 'active' ? 'Aktif' : 'Diarsipkan'}
                        </span>
                      </td>
                      <td>
                        <Link className="text-link" to={`/owner/services/${srv.id}/edit`}>
                          Edit
                        </Link>
                        <Button
                          variant="ghost"
                          onClick={() => handleToggleStatus(srv.id, srv.status)}
                          pending={isUpdating}
                          style={{ fontSize: '0.82rem' }}
                        >
                          {srv.status === 'active' ? 'Arsipkan' : 'Aktifkan'}
                        </Button>
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
    </div>
  );
}

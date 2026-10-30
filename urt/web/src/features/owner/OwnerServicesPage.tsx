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
  useDeleteServiceMutation,
} from '../services/servicesApi';
import { TextInput } from '../../components/ui/TextInput';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { ResponsiveTable } from '../../components/ui/ResponsiveTable';
import { InlineNotice, PageLoader, EmptyState } from '../../components/feedback/Feedback';
import styles from '../business/Business.module.css';
import { DifficultyPricingSettings } from '../services/DifficultyPricingSettings';
import catalogStyles from '../services/Catalog.module.css';
import type { RepairService } from '../services/types';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';

export default function OwnerServicesPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number(params.get('page')) || 1);
  const filter = params.get('status') || '';
  const setFilter = (status: string) => {
    const next = new URLSearchParams(params);
    next.delete('page');
    if (status) next.set('status', status);
    else next.delete('status');
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
  const [deleting, setDeleting] = useState<RepairService | null>(null);
  const [deleteItem, deletion] = useDeleteServiceMutation();

  const { data, isLoading, isError } = useGetServicesQuery(
    {
      businessId: businessId || '',
      page,
      q: search.trim() || undefined,
      status: filter || undefined,
      scope: 'catalog',
    },
    { skip: !businessId },
  );

  const { data: allCount } = useGetServicesQuery(
    { businessId: businessId || '', limit: 1, scope: 'catalog' },
    { skip: !businessId },
  );
  const { data: activeCount } = useGetServicesQuery(
    { businessId: businessId || '', limit: 1, status: 'active', scope: 'catalog' },
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
          entryType: 'service',
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
    } catch (error) {
      setFeedback((error as { data?: { error?: string } }).data?.error || 'Gagal menambahkan item katalog.');
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
            <h1>{showAddForm ? 'Tambah Item Katalog' : 'Katalog Harga Servis'}</h1>
            <p>Tetapkan harga layanan, suku cadang, dan tingkat kesulitan untuk estimasi teknisi.</p>
          </div>
          <Button onClick={() => setShowAddForm(!showAddForm)}>
            {showAddForm ? 'Tutup Formulir' : '+ tambahkan item'}
          </Button>
        </div>
      </header>

      {feedback && <InlineNotice>{feedback}</InlineNotice>}
      {location.state?.notice && <InlineNotice type="success">{location.state.notice}</InlineNotice>}
      {deleting && <ConfirmDialog title="Hapus Item Katalog?" description={`Hapus ${deleting.name}? Estimasi yang sudah dikirim tetap menyimpan harga sebelumnya.`} pending={deletion.isLoading} onClose={() => setDeleting(null)} onConfirm={() => { if (businessId) void deleteItem({ businessId, serviceId: deleting.id }).unwrap().then(() => { setDeleting(null); setFeedback('Item katalog berhasil dihapus.'); }).catch(() => { setDeleting(null); setFeedback('Item belum dapat dihapus.'); }); }} />}
      {isError && <InlineNotice>Data gagal dimuat. Silakan coba lagi.</InlineNotice>}

      {showAddForm && (
        <form className={styles.card} onSubmit={handleAddService}>
          <div className={styles.cardHeader}>
            <h2>Tambah Item Katalog</h2>
            <p>Teknisi menggunakan harga ini saat menyusun estimasi. Tarif tingkat kesulitan dihitung sekali per tiket.</p>
          </div>

          <div className={styles.row}>
            <TextInput
              label="Nama Item"
              name="catalogName"
              placeholder="Contoh: Ganti Baterai, Service Mesin, Instalasi OS"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <TextInput
              label="Kategori"
              name="catalogCategory"
              placeholder="Contoh: Hardware, Software, Pembersihan"
              required
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
          </div>

          <div className={styles.row}>
            <TextInput
              label="Tarif Dasar (Rp)"
              name="catalogPrice"
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
          {businessId && <DifficultyPricingSettings key={businessId} businessId={businessId} />}
          <div className="reference-stats reference-stats-three">
            <SummaryCard
              label="Total Item Katalog"
              value={allCount?.pagination?.total ?? '—'}
              icon="tool"
            />
            <SummaryCard
              label="Item Aktif"
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
              label="Cari Item Katalog"
              placeholder="Cari nama item atau kategori..."
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
            <ResponsiveTable className={styles.tableWrap} rowHeading="Layanan">
              <table className={`${styles.table} ${catalogStyles.catalogTable}`}>
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
                      <td data-label="Item">
                        <Link className="text-link" to={`/owner/services/${srv.id}`}>
                          {srv.name}
                        </Link>
                        {srv.description && (
                          <div style={{ fontSize: '0.8rem', color: 'var(--slate-500)' }}>
                            {srv.description}
                          </div>
                        )}
                      </td>
                      <td data-label="Kategori">{srv.category}</td>
                      <td data-label="Tarif Dasar">
                        <strong>
                          {new Intl.NumberFormat('id-ID', {
                            style: 'currency',
                            currency: 'IDR',
                            maximumFractionDigits: 0,
                          }).format(srv.basePrice)}
                        </strong>
                      </td>
                      <td data-label="Durasi">{srv.estimatedDuration || '-'}</td>
                      <td data-label="Status">
                        <StatusBadge label={srv.status === 'active' ? 'Aktif' : 'Diarsipkan'} tone={srv.status === 'active' ? 'success' : 'neutral'} />
                      </td>
                      <td data-label="Aksi">
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
                        <Button variant="ghost" onClick={() => setDeleting(srv)}>Hapus</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ResponsiveTable>
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

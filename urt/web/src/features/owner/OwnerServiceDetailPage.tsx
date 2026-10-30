import { useState, type FormEvent } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router';
import { useGetServiceQuery, useUpdateServiceMutation, useDeleteServiceMutation } from '../services/servicesApi';
import type { RepairService } from '../services/types';
import { useAppSelector } from '../../redux/hooks';
import { selectSelectedBusinessId } from '../business/businessSlice';
import { TextInput } from '../../components/ui/TextInput';
import { Button, ButtonLink } from '../../components/ui/Button';
import { InlineNotice, PageLoader } from '../../components/feedback/Feedback';
import styles from '../business/Business.module.css';
import { difficultyLabels } from '../services/catalog';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';

function EditForm({ item, businessId }: { item: RepairService; businessId: string }) {
  const navigate = useNavigate();
  const [name, setName] = useState(item.name || '');
  const [category, setCategory] = useState(item.category || '');
  const [basePrice, setBasePrice] = useState(String(item.basePrice));
  const [estimatedDuration, setEstimatedDuration] = useState(item.estimatedDuration || '');
  const [description, setDescription] = useState(item.description || '');
  const [status, setStatus] = useState<'active' | 'archived'>(item.status);
  const [error, setError] = useState('');
  const [update, { isLoading }] = useUpdateServiceMutation();
  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await update({
        businessId,
        serviceId: item.id,
        body: {
          name: name.trim(),
          category: category.trim(),
          basePrice: Number(basePrice),
          estimatedDuration: estimatedDuration.trim(),
          description: description.trim(),
          status,
        },
      }).unwrap();
      navigate(`/owner/services/${item.id}`, { state: { notice: 'Perubahan katalog berhasil disimpan.' } });
    } catch (error) {
      setError((error as { data?: { error?: string } }).data?.error || 'Perubahan gagal disimpan. Periksa data dan coba lagi.');
    }
  }
  return (
    <form className={styles.card} onSubmit={submit}>
      <h2>Informasi Item Katalog</h2>
      {error && <InlineNotice>{error}</InlineNotice>}
      {item.difficultyLevel && <p>Tingkat Kesulitan: {difficultyLabels[item.difficultyLevel]}</p>}
      <div className={styles.row}>
        <TextInput
          label="Nama Item"
          name="catalogName"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <TextInput
          label="Kategori"
          name="catalogCategory"
          type="text"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          required
        />
        <TextInput
          label="Tarif dasar (Rp)"
          name="catalogPrice"
          type="number"
          value={basePrice}
          onChange={(e) => setBasePrice(e.target.value)}
          required
          min="0"
          step="1"
        />
        <TextInput
          label="Estimasi durasi"
          type="text"
          value={estimatedDuration}
          onChange={(e) => setEstimatedDuration(e.target.value)}
        />
        <TextInput
          label="Deskripsi"
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
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
        <ButtonLink to={`/owner/services/${item.id}`} variant="secondary">
          Batal
        </ButtonLink>
      </div>
    </form>
  );
}
export default function OwnerServiceDetailPage() {
  const businessId = useAppSelector(selectSelectedBusinessId);
  const { id = '' } = useParams();
  const location = useLocation();
  const editing = location.pathname.endsWith('/edit');
  const navigate = useNavigate();
  const [showDelete, setShowDelete] = useState(false);
  const [deleteItem, deletion] = useDeleteServiceMutation();
  const { data, isLoading, isError } = useGetServiceQuery(
    { businessId: businessId || '', id },
    { skip: !businessId || !id },
  );
  const item = data?.data.service;
  async function removeItem() {
    if (!businessId || !item) return;
    try { await deleteItem({ businessId, serviceId: item.id }).unwrap(); navigate('/owner/services', { state: { notice: 'Item katalog berhasil dihapus.' } }); }
    catch { setShowDelete(false); }
  }
  if (isLoading) return <PageLoader />;
  if (isError || !item)
    return (
      <InlineNotice>
        Data layanan tidak dapat dimuat.{' '}
        <ButtonLink to="/owner/services" variant="secondary">
          Kembali
        </ButtonLink>
      </InlineNotice>
    );
  return (
    <div className="reference-stack">
      <header className="reference-heading">
        <div>
          <ButtonLink to="/owner/services" variant="ghost" size="small">
           Daftar Katalog
          </ButtonLink>
          <h1>{editing ? 'Edit Item Katalog' : item.name}</h1>
          <p>{editing ? 'Perbarui rincian dan harga item katalog.' : 'Rincian item dan tarif pada katalog servis.'}</p>
        </div>
        {!editing && <div className="actions"><ButtonLink to={`/owner/services/${id}/edit`}>Edit Layanan</ButtonLink><Button variant="danger" onClick={() => setShowDelete(true)}>Hapus Item Katalog</Button></div>}
      </header>
      {location.state?.notice && <InlineNotice type="success">{location.state.notice}</InlineNotice>}
      {deletion.isError && <InlineNotice type="error">Item belum dapat dihapus. Coba lagi.</InlineNotice>}
      {showDelete && item && <ConfirmDialog title="Hapus Item Katalog?" description={`Hapus ${item.name} dari katalog? Estimasi yang sudah dikirim tetap menyimpan rincian harga sebelumnya.`} pending={deletion.isLoading} onClose={() => setShowDelete(false)} onConfirm={() => void removeItem()} />}
      {editing ? (
        <EditForm key={item.id + item.updatedAt} item={item} businessId={businessId!} />
      ) : (
        <section className="reference-panel">
          <div className="reference-profile">
            <span className="reference-avatar">{item.name.slice(0, 2).toUpperCase()}</span>
            <div>
              <h2>{item.name}</h2>
              <p>{item.status === 'active' ? 'Aktif' : 'Nonaktif'}</p>
            </div>
          </div>
          <dl className="reference-dl">
            {item.difficultyLevel && <div><dt>Tingkat Kesulitan</dt><dd>{difficultyLabels[item.difficultyLevel]}</dd></div>}
            <div>
              <dt>Nama layanan</dt>
              <dd>{item.name || '—'}</dd>
            </div>
            <div>
              <dt>Kategori</dt>
              <dd>{item.category || '—'}</dd>
            </div>
            <div>
              <dt>Tarif dasar (Rp)</dt>
              <dd>
                {new Intl.NumberFormat('id-ID', {
                  style: 'currency',
                  currency: 'IDR',
                  maximumFractionDigits: 0,
                }).format(item.basePrice)}
              </dd>
            </div>
            <div>
              <dt>Estimasi durasi</dt>
              <dd>{item.estimatedDuration || '—'}</dd>
            </div>
            <div>
              <dt>Deskripsi</dt>
              <dd>{item.description || '—'}</dd>
            </div>
            <div>
              <dt>Terdaftar</dt>
              <dd>{new Date(item.createdAt).toLocaleDateString('id-ID')}</dd>
            </div>
          </dl>
        </section>
      )}
    </div>
  );
}

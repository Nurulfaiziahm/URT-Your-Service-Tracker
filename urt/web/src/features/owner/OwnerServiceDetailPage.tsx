import { useState, type FormEvent } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router';
import { useGetServiceQuery, useUpdateServiceMutation } from '../services/servicesApi';
import type { RepairService } from '../services/types';
import { useAppSelector } from '../../redux/hooks';
import { selectSelectedBusinessId } from '../business/businessSlice';
import { TextInput } from '../../components/ui/TextInput';
import { Button, ButtonLink } from '../../components/ui/Button';
import { InlineNotice, PageLoader } from '../../components/feedback/Feedback';
import styles from '../business/Business.module.css';

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
      navigate(`/owner/services/${item.id}`);
    } catch {
      setError('Perubahan gagal disimpan. Periksa data dan coba lagi.');
    }
  }
  return (
    <form className={styles.card} onSubmit={submit}>
      <h2>Informasi Layanan</h2>
      {error && <InlineNotice>{error}</InlineNotice>}
      <div className={styles.row}>
        <TextInput
          label="Nama layanan"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <TextInput
          label="Kategori"
          type="text"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          required
        />
        <TextInput
          label="Tarif dasar (Rp)"
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
  const editing = useLocation().pathname.endsWith('/edit');
  const { data, isLoading, isError } = useGetServiceQuery(
    { businessId: businessId || '', id },
    { skip: !businessId || !id },
  );
  const item = data?.data.service;
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
            ← Daftar Layanan
          </ButtonLink>
          <h1>{editing ? 'Edit Layanan' : item.name}</h1>
          <p>{editing ? 'Perbarui informasi layanan.' : 'Detail layanan dan informasi kontak.'}</p>
        </div>
        {!editing && <ButtonLink to={`/owner/services/${id}/edit`}>Edit Layanan</ButtonLink>}
      </header>
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

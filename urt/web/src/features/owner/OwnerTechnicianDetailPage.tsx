import { DirectoryTicketHistory } from '../tickets/DirectoryTicketHistory';
import { useState, type FormEvent } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router';
import { useGetTechnicianQuery, useUpdateTechnicianMutation } from '../technicians/techniciansApi';
import type { Technician } from '../technicians/types';
import { useAppSelector } from '../../redux/hooks';
import { selectSelectedBusinessId } from '../business/businessSlice';
import { TextInput } from '../../components/ui/TextInput';
import { Button, ButtonLink } from '../../components/ui/Button';
import { InlineNotice, PageLoader } from '../../components/feedback/Feedback';
import styles from '../business/Business.module.css';

function EditForm({ item, businessId }: { item: Technician; businessId: string }) {
  const navigate = useNavigate();
  const [name, setName] = useState(item.name || '');
  const [email, setEmail] = useState(item.email || '');
  const [phone, setPhone] = useState(item.phone || '');
  const [specializations, setSpecializations] = useState(item.specializations.join(', '));
  const [status, setStatus] = useState<'active' | 'inactive'>(
    item.status === 'pending' ? 'active' : item.status,
  );
  const [error, setError] = useState('');
  const [update, { isLoading }] = useUpdateTechnicianMutation();
  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await update({
        businessId,
        technicianId: item.id,
        body: {
          name: name.trim(),
          phone: phone.trim(),
          specializations: specializations
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
          ...(item.status !== 'pending' ? { status } : {}),
        },
      }).unwrap();
      navigate(`/owner/technicians/${item.id}`);
    } catch {
      setError('Perubahan gagal disimpan. Periksa data dan coba lagi.');
    }
  }
  return (
    <form className={styles.card} onSubmit={submit}>
      <h2>Informasi Teknisi</h2>
      {error && <InlineNotice>{error}</InlineNotice>}
      <div className={styles.row}>
        <TextInput
          label="Nama teknisi"
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
          disabled
        />
        <TextInput
          label="Nomor WhatsApp"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <TextInput
          label="Spesialisasi (pisahkan dengan koma)"
          type="text"
          value={specializations}
          onChange={(e) => setSpecializations(e.target.value)}
        />
      </div>
      {item.status !== 'pending' && (
        <label>
          Status
          <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
            <option value="active">Aktif</option>
            <option value="inactive">Nonaktif</option>
          </select>
        </label>
      )}
      <div className="actions">
        <Button type="submit" pending={isLoading}>
          Simpan Perubahan
        </Button>
        <ButtonLink to={`/owner/technicians/${item.id}`} variant="secondary">
          Batal
        </ButtonLink>
      </div>
    </form>
  );
}
export default function OwnerTechnicianDetailPage() {
  const businessId = useAppSelector(selectSelectedBusinessId);
  const { id = '' } = useParams();
  const editing = useLocation().pathname.endsWith('/edit');
  const { data, isLoading, isError } = useGetTechnicianQuery(
    { businessId: businessId || '', id },
    { skip: !businessId || !id },
  );
  const item = data?.data.technician;
  if (isLoading) return <PageLoader />;
  if (isError || !item)
    return (
      <InlineNotice>
        Data teknisi tidak dapat dimuat.{' '}
        <ButtonLink to="/owner/technicians" variant="secondary">
          Kembali
        </ButtonLink>
      </InlineNotice>
    );
  return (
    <div className="reference-stack">
      <header className="reference-heading">
        <div>
          <ButtonLink to="/owner/technicians" variant="ghost" size="small">
            ← Daftar Teknisi
          </ButtonLink>
          <h1>{editing ? 'Edit Teknisi' : item.name}</h1>
          <p>{editing ? 'Perbarui informasi teknisi.' : 'Detail teknisi dan informasi kontak.'}</p>
        </div>
        {!editing && <ButtonLink to={`/owner/technicians/${id}/edit`}>Edit Teknisi</ButtonLink>}
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
                <p>
                  {item.status === 'active'
                    ? 'Aktif'
                    : item.status === 'pending'
                      ? 'Menunggu Konfirmasi'
                      : 'Nonaktif'}
                </p>
              </div>
            </div>
            <dl className="reference-dl">
              <div>
                <dt>Nama teknisi</dt>
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
                <dt>Spesialisasi (pisahkan dengan koma)</dt>
                <dd>{item.specializations.join(', ') || 'Umum'}</dd>
              </div>
              <div>
                <dt>Terdaftar</dt>
                <dd>{new Date(item.createdAt).toLocaleDateString('id-ID')}</dd>
              </div>
            </dl>
          </section>
          <DirectoryTicketHistory key={item.id} businessId={businessId!} technicianId={item.id} />
        </>
      )}
    </div>
  );
}

import { Link, useLocation, useNavigate, useSearchParams } from 'react-router';
import { Pagination } from '../../components/navigation/Pagination';
import { SummaryCard } from '../../components/ui/SummaryCard';
import { useState, type FormEvent } from 'react';
import { useAppSelector } from '../../redux/hooks';
import { selectSelectedBusinessId } from '../business/businessSlice';
import {
  useGetTechniciansQuery,
  useInviteTechnicianMutation,
  useResendTechnicianInvitationMutation,
  useDeleteTechnicianMutation,
} from '../technicians/techniciansApi';
import { TextInput } from '../../components/ui/TextInput';
import { Button } from '../../components/ui/Button';
import { InlineNotice, PageLoader, EmptyState } from '../../components/feedback/Feedback';
import styles from '../business/Business.module.css';

export default function OwnerTechniciansPage() {
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
  const showInviteForm = location.pathname.endsWith('/new');
  const setShowInviteForm = (open: boolean) =>
    navigate(open ? '/owner/technicians/new' : '/owner/technicians');

  const [search, setSearch] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [specializations, setSpecializations] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [invitationUrl, setInvitationUrl] = useState<string | null>(null);

  const { data, isLoading, isError } = useGetTechniciansQuery(
    {
      businessId: businessId || '',
      page,
      q: search.trim() || undefined,
      status: filter || undefined,
    },
    { skip: !businessId },
  );

  const { data: allCount } = useGetTechniciansQuery(
    { businessId: businessId || '', limit: 1 },
    { skip: !businessId },
  );
  const { data: activeCount } = useGetTechniciansQuery(
    { businessId: businessId || '', limit: 1, status: 'active' },
    { skip: !businessId },
  );
  const [inviteTechnician, { isLoading: isInviting }] = useInviteTechnicianMutation();
  const [resendInvitation, { isLoading: isResending }] = useResendTechnicianInvitationMutation();
  const [deleteTechnician, { isLoading: isDeleting }] = useDeleteTechnicianMutation();

  const technicians = data?.data || [];

  async function handleInvite(e: FormEvent) {
    e.preventDefault();
    setFeedback(null);

    if (!businessId) return;

    try {
      const specs = specializations
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const res = await inviteTechnician({
        businessId,
        body: {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim() || undefined,
          specializations: specs,
        },
      }).unwrap();

      setFeedback(
        `Undangan berhasil dibuat untuk ${res.data.technician.name}. Tautan undangan telah disiapkan.`,
      );
      setShowInviteForm(false);
      setName('');
      setEmail('');
      setPhone('');
      setSpecializations('');
    } catch {
      setFeedback('Gagal mengirimkan undangan teknisi. Periksa kembali email teknisi.');
    }
  }

  async function handleResend(technicianId: string) {
    if (!businessId) return;
    setFeedback(null);
    setInvitationUrl(null);
    try {
      const result = await resendInvitation({ businessId, technicianId }).unwrap();
      setFeedback(
        result.data.mailSent
          ? 'Undangan berhasil dikirim ulang melalui email.'
          : 'Tautan undangan diperbarui, tetapi email tidak terkirim. Periksa konfigurasi email.',
      );
      setInvitationUrl(result.data.invitationUrl ?? null);
    } catch {
      setFeedback('Gagal mengirim ulang undangan.');
    }
  }

  async function handleDelete(technicianId: string, technicianName: string) {
    if (!businessId || !window.confirm(
      `Hapus ${technicianName}? Teknisi aktif harus dinonaktifkan terlebih dahulu. Teknisi dengan riwayat tiket akan dinonaktifkan agar riwayat tetap utuh.`,
    )) return;

    setFeedback(null);
    setInvitationUrl(null);
    try {
      await deleteTechnician({ businessId, technicianId }).unwrap();
      setFeedback(`${technicianName} berhasil dihapus.`);
    } catch (error) {
      const code = (error as { data?: { code?: string } }).data?.code;
      setFeedback(
        code === 'TECHNICIAN_HAS_TICKETS'
          ? `${technicianName} memiliki riwayat tiket dan dinonaktifkan agar riwayat tetap utuh.`
          : code === 'TECHNICIAN_ACTIVE'
            ? 'Nonaktifkan teknisi aktif terlebih dahulu sebelum menghapusnya.'
            : 'Teknisi gagal dihapus. Coba lagi.',
      );
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
            <span className="eyebrow">Manajemen Tim</span>
            <h1>{showInviteForm ? 'Undang Teknisi' : 'Daftar Teknisi'}</h1>
            <p>Kelola teknisi dan undang anggota baru untuk menangani tiket perbaikan.</p>
          </div>
          <Button onClick={() => setShowInviteForm(!showInviteForm)}>
            {showInviteForm ? 'Tutup Formulir' : '+ Undang Teknisi'}
          </Button>
        </div>
      </header>

      {feedback && (
        <InlineNotice>
          {feedback}
          {invitationUrl && (
            <div>
              <a href={invitationUrl}>Buka tautan undangan baru</a>
            </div>
          )}
        </InlineNotice>
      )}
      {isError && <InlineNotice>Data gagal dimuat. Silakan coba lagi.</InlineNotice>}

      {showInviteForm && (
        <form className={styles.card} onSubmit={handleInvite}>
          <div className={styles.cardHeader}>
            <h2>Undang Teknisi Baru</h2>
            <p>Teknisi akan menerima akses setelah menerima undangan melalui akun mereka.</p>
          </div>

          <div className={styles.row}>
            <TextInput
              label="Nama Teknisi"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <TextInput
              label="Email Teknisi"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className={styles.row}>
            <TextInput
              label="Nomor Telepon (opsional)"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <TextInput
              label="Spesialisasi (pisahkan dengan koma)"
              placeholder="Contoh: Hardware, Laptop, Layar LCD"
              value={specializations}
              onChange={(e) => setSpecializations(e.target.value)}
            />
          </div>

          <div className="actions">
            <Button type="submit" pending={isInviting}>
              Kirim Undangan
            </Button>
            <Button variant="ghost" onClick={() => setShowInviteForm(false)}>
              Batal
            </Button>
          </div>
        </form>
      )}

      {!showInviteForm && (
        <>
          <div className="reference-stats reference-stats-three">
            <SummaryCard
              label="Total Teknisi"
              value={allCount?.pagination?.total ?? '—'}
              icon="people"
            />
            <SummaryCard
              label="Teknisi Aktif"
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
              label="Cari Teknisi"
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
                <option value="inactive">Nonaktif</option>
                <option value="pending">Menunggu Konfirmasi</option>
              </select>
            </label>
          </div>
          {technicians.length === 0 ? (
            <EmptyState
              title="Belum Ada Teknisi"
              description="Tambahkan teknisi pertama Anda untuk mulai menugaskan tiket servis."
              action={
                <Button onClick={() => setShowInviteForm(true)}>+ Undang Teknisi Pertama</Button>
              }
            />
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Nama</th>
                    <th>Email / Telepon</th>
                    <th>Spesialisasi</th>
                    <th>Status</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {technicians.map((tech) => (
                    <tr key={tech.id}>
                      <td>
                        <Link className="text-link" to={`/owner/technicians/${tech.id}`}>
                          {tech.name}
                        </Link>
                      </td>
                      <td>
                        {tech.email}
                        {tech.phone && (
                          <div style={{ fontSize: '0.8rem', color: 'var(--slate-500)' }}>
                            {tech.phone}
                          </div>
                        )}
                      </td>
                      <td>
                        {tech.specializations.length > 0 ? tech.specializations.join(', ') : 'Umum'}
                      </td>
                      <td>
                        <span
                          className={
                            tech.status === 'active'
                              ? styles.statusActive
                              : tech.status === 'pending'
                                ? styles.statusPending
                                : styles.statusInactive
                          }
                        >
                          {tech.status === 'active'
                            ? 'Aktif'
                            : tech.status === 'pending'
                              ? 'Menunggu Konfirmasi'
                              : 'Nonaktif'}
                        </span>
                      </td>
                      <td>
                        <Link className="text-link" to={`/owner/technicians/${tech.id}/edit`}>
                          Edit
                        </Link>
                        {tech.status === 'pending' && (
                          <Button
                            variant="ghost"
                            onClick={() => handleResend(tech.id)}
                            pending={isResending}
                            style={{ fontSize: '0.85rem' }}
                          >
                            Kirim Ulang
                          </Button>
                        )}
                        <Button
                          variant="danger"
                          onClick={() => void handleDelete(tech.id, tech.name)}
                          pending={isDeleting}
                          style={{ fontSize: '0.85rem' }}
                        >
                          Hapus
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

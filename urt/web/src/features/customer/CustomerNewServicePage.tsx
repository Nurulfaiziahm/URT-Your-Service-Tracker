import { useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useAppSelector } from '../../redux/hooks';
import { selectSelectedBusinessId } from '../business/businessSlice';
import { useGetPublicBusinessQuery } from '../business/businessApi';
import { useGetServicesQuery } from '../services/servicesApi';
import { useCreateTicketMutation } from '../tickets/ticketsApi';
import { TextInput } from '../../components/ui/TextInput';
import { Button, ButtonLink } from '../../components/ui/Button';
import { InlineNotice, PageLoader, EmptyState } from '../../components/feedback/Feedback';
import type { ApiErrorBody } from '../../lib/api.types';
import styles from '../tickets/Tickets.module.css';

export default function CustomerNewServicePage() {
  const navigate = useNavigate();
  const { businessSlug } = useParams<{ businessSlug?: string }>();
  const activeBusinessId = useAppSelector(selectSelectedBusinessId);

  // If accessed via /b/:businessSlug/services/new, load business details by slug
  const { data: publicBizData, isLoading: isLoadingPublicBiz } = useGetPublicBusinessQuery(
    businessSlug || '',
    { skip: !businessSlug },
  );

  const targetBusinessId = businessSlug ? publicBizData?.data?.business.id : activeBusinessId;

  // Services offered by this business
  const { data: servicesData } = useGetServicesQuery(
    { businessId: targetBusinessId || '' },
    { skip: !targetBusinessId },
  );

  const [createTicket, { isLoading: isSubmitting }] = useCreateTicketMutation();

  const [category, setCategory] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [condition, setCondition] = useState('');
  const [accessories, setAccessories] = useState('');
  const [complaint, setComplaint] = useState('');
  const [requestedServiceId, setRequestedServiceId] = useState('');

  const [createdTicketCode, setCreatedTicketCode] = useState<string | null>(null);
  const [createdTicketId, setCreatedTicketId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const services = servicesData?.data || [];

  if (businessSlug && isLoadingPublicBiz) {
    return <PageLoader />;
  }

  if (!targetBusinessId) {
    return (
      <main className="container page-content">
        <EmptyState
          title="Tempat Servis Belum Dipilih"
          description="Silakan pilih tempat servis tujuan sebelum mengajukan perbaikan perangkat."
          action={<ButtonLink to="/portal">Pilih Tempat Servis</ButtonLink>}
        />
      </main>
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrorMessage(null);

    if (!category.trim() || !model.trim() || !complaint.trim()) {
      setErrorMessage('Kategori perangkat, model, dan keluhan wajib diisi.');
      return;
    }

    try {
      const res = await createTicket({
        businessId: targetBusinessId!,
        body: {
          device: {
            category: category.trim(),
            brand: brand.trim() || undefined,
            model: model.trim(),
            serialNumber: serialNumber.trim() || undefined,
            condition: condition.trim() || undefined,
            accessories: accessories
              ? accessories
                  .split(',')
                  .map((a) => a.trim())
                  .filter(Boolean)
              : [],
          },
          complaint: complaint.trim(),
          requestedServiceId: requestedServiceId || undefined,
          intakeMethod: 'online',
        },
      }).unwrap();

      const ticket = res.data.ticket;
      setCreatedTicketCode(ticket.ticketCode);
      setCreatedTicketId(ticket.id);
    } catch (err: unknown) {
      const apiErr = err as { data?: ApiErrorBody; error?: string };
      setErrorMessage(
        apiErr.data?.error ||
          apiErr.error ||
          'Gagal mengirimkan pengajuan servis. Silakan periksa kembali data perangkat Anda.',
      );
    }
  }

  if (createdTicketCode && createdTicketId) {
    return (
      <div className={`container page-content ${styles.container}`}>
        <div className={styles.ticketCard} style={{ textAlign: 'center', padding: '40px 24px' }}>
          <span style={{ fontSize: '3rem' }}>✓</span>
          <span className="eyebrow">Pengajuan Berhasil</span>
          <h1 style={{ fontSize: '1.8rem', color: 'var(--navy-950)' }}>
            Tiket Servis Telah Dibuat
          </h1>
          <p>Nomor tiket Anda adalah:</p>
          <div
            style={{
              padding: '12px 24px',
              background: 'var(--blue-soft)',
              borderRadius: 'var(--radius-md)',
              display: 'inline-block',
              marginInline: 'auto',
              fontFamily: 'monospace',
              fontSize: '1.4rem',
              fontWeight: 700,
              color: 'var(--blue)',
            }}
          >
            {createdTicketCode}
          </div>
          <p style={{ maxWidth: 480, marginInline: 'auto', fontSize: '0.92rem' }}>
            Tempat servis akan segera memeriksa permohonan Anda. Anda dapat memantau perkembangan
            perbaikan langsung melalui portal atau pelacakan servis.
          </p>
          <div className="actions" style={{ justifyContent: 'center', marginTop: 16 }}>
            <Button onClick={() => navigate(`/customer/services/${createdTicketId}`)}>
              Lihat Detail Tiket
            </Button>
            <ButtonLink to="/customer" variant="secondary">
              Buka Beranda Pelanggan
            </ButtonLink>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`container page-content ${styles.container}`}>
      <header className={styles.heading}>
        <div>
          <span className="eyebrow">Layanan Pelanggan</span>
          <h1>Pengajuan Servis Perangkat</h1>
          <p>Lengkapi informasi kendala dan spesifikasi perangkat yang ingin Anda perbaiki.</p>
        </div>
      </header>

      {errorMessage && <InlineNotice>{errorMessage}</InlineNotice>}

      <form className={styles.ticketCard} onSubmit={handleSubmit} noValidate>
        <h2>1. Informasi Perangkat</h2>

        <div
          className="row"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: 16,
          }}
        >
          <TextInput
            label="Kategori Perangkat"
            placeholder="Contoh: Laptop, Smartphone, Printer, Audio"
            required
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />
          <TextInput
            label="Merk / Brand"
            placeholder="Contoh: Asus, Apple, Samsung"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
          />
          <TextInput
            label="Model / Tipe Perangkat"
            placeholder="Contoh: Vivobook 14 A416"
            required
            value={model}
            onChange={(e) => setModel(e.target.value)}
          />
        </div>

        <div
          className="row"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: 16,
          }}
        >
          <TextInput
            label="Nomor Seri / SN (opsional)"
            placeholder="Nomor seri perangkat"
            value={serialNumber}
            onChange={(e) => setSerialNumber(e.target.value)}
          />
          <TextInput
            label="Kondisi Fisik Saat Diserahkan"
            placeholder="Contoh: Bodi mulus, lecet pemakaian, layar retak"
            value={condition}
            onChange={(e) => setCondition(e.target.value)}
          />
        </div>

        <TextInput
          label="Kelengkapan yang Disertakan"
          placeholder="Contoh: Unit, Charger adaptor, Tas laptop (pisahkan dengan koma)"
          value={accessories}
          onChange={(e) => setAccessories(e.target.value)}
        />

        <hr style={{ border: 'none', borderTop: '1px solid var(--border)', marginBlock: 8 }} />

        <h2>2. Keluhan & Layanan yang Dibutuhkan</h2>

        <TextInput
          label="Deskripsi Keluhan / Kerusakan"
          placeholder="Jelaskan kendala yang dialami perangkat Anda secara rinci..."
          required
          value={complaint}
          onChange={(e) => setComplaint(e.target.value)}
          hint="Ceritakan kronologi kerusakan atau gejala yang muncul."
        />

        {services.length > 0 && (
          <div>
            <label
              htmlFor="service-select"
              style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, marginBottom: 4 }}
            >
              Pilih Paket Layanan (Opsional)
            </label>
            <select
              id="service-select"
              value={requestedServiceId}
              onChange={(e) => setRequestedServiceId(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)',
                background: 'var(--card)',
                color: 'var(--navy-950)',
              }}
            >
              <option value="">-- Pilih Jika Memiliki Layanan Tertentu --</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.category}) — Rp {s.basePrice.toLocaleString('id-ID')}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="actions" style={{ marginTop: 12 }}>
          <Button type="submit" pending={isSubmitting}>
            Kirim Pengajuan Servis
          </Button>
          <ButtonLink to="/customer" variant="ghost">
            Batal
          </ButtonLink>
        </div>
      </form>
    </div>
  );
}

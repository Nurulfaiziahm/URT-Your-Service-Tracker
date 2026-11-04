import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { useAppSelector } from '../../redux/hooks';
import { selectSelectedBusinessId } from '../business/businessSlice';
import { useGetServicesQuery } from '../services/servicesApi';
import { useGetTechniciansQuery } from '../technicians/techniciansApi';
import { useAddAttachmentMutation, useCreateTicketMutation, useUploadFileMutation } from '../tickets/ticketsApi';
import { CustomerPicker } from '../customers/CustomerPicker';
import type { Customer } from '../customers/types';
import { TextInput } from '../../components/ui/TextInput';
import { Button, ButtonLink } from '../../components/ui/Button';
import { InlineNotice, EmptyState } from '../../components/feedback/Feedback';
import type { ApiErrorBody } from '../../lib/api.types';
import styles from '../tickets/Tickets.module.css';

const deviceTypes = ['Laptop', 'Smartphone', 'Tablet', 'Komputer Desktop', 'Printer', 'Monitor', 'Kamera', 'Perangkat Audio', 'Perangkat Lain'];
const deviceBrands = ['Acer', 'Apple', 'Asus', 'Dell', 'HP', 'Lenovo', 'Samsung', 'Xiaomi', 'Oppo', 'Vivo', 'Canon', 'Epson', 'Sony', 'Merek Lain'];

export default function OwnerNewTicketPage() {
  const navigate = useNavigate();
  const businessId = useAppSelector(selectSelectedBusinessId);

  const { data: servicesData } = useGetServicesQuery(
    { businessId: businessId || '' },
    { skip: !businessId },
  );

  const { data: techsData } = useGetTechniciansQuery(
    { businessId: businessId || '', status: 'active' },
    { skip: !businessId },
  );

  const [createTicket, { isLoading: isSubmitting }] = useCreateTicketMutation();
  const [uploadFile, { isLoading: isUploading }] = useUploadFileMutation();
  const [addAttachment, { isLoading: isAttaching }] = useAddAttachmentMutation();

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [category, setCategory] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [condition, setCondition] = useState('');
  const [accessories, setAccessories] = useState('');
  const [complaint, setComplaint] = useState('');
  const [requestedServiceId, setRequestedServiceId] = useState('');
  const [assignedTechnicianId, setAssignedTechnicianId] = useState('');
  const [intakePhoto, setIntakePhoto] = useState<File | null>(null);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const services = servicesData?.data || [];
  const technicians = techsData?.data || [];

  if (!businessId) {
    return (
      <main className="container page-content">
        <EmptyState
          title="Tempat Servis Belum Dipilih"
          description="Pilih tempat servis aktif terlebih dahulu."
          action={<ButtonLink to="/portal">Pilih Portal</ButtonLink>}
        />
      </main>
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrorMessage(null);

    if (!selectedCustomer?.id) {
      setErrorMessage('Pilih atau buat kontak pelanggan walk-in terlebih dahulu.');
      return;
    }

    if (!category.trim() || !model.trim() || !complaint.trim()) {
      setErrorMessage('Kategori, model perangkat, dan keluhan wajib diisi.');
      return;
    }

    try {
      const res = await createTicket({
        businessId: businessId!,
        body: {
          customerId: selectedCustomer.id,
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
          assignedTechnicianId: assignedTechnicianId || undefined,
          intakeMethod: 'walk_in',
        },
      }).unwrap();

      const created = res.data.ticket;
      let intakePhotoError: string | undefined;
      if (intakePhoto) {
        try {
          const formData = new FormData();
          formData.append('file', intakePhoto);
          const uploaded = await uploadFile(formData).unwrap();
          await addAttachment({
            businessId: businessId!,
            ticketId: created.id,
            body: { key: uploaded.data.key, visibility: 'customer', expectedRevision: created.revision },
          }).unwrap();
        } catch {
          intakePhotoError = 'Tiket berhasil dicatat, tetapi foto belum terunggah. Anda dapat mengunggahnya dari detail tiket.';
        }
      }
      navigate(`/owner/tickets/${created.id}`, { state: { intakePhotoError } });
    } catch (err: unknown) {
      const apiErr = err as { data?: ApiErrorBody; error?: string };
      setErrorMessage(
        apiErr.data?.error ||
          apiErr.error ||
          'Gagal mencatat tiket servis walk-in. Periksa kembali kelengkapan data.',
      );
    }
  }

  return (
    <div className={`container page-content ${styles.container}`}>
      <header className={styles.heading}>
        <div>
          <span className="eyebrow">Penerimaan Unit</span>
          <h1>Catat Tiket Servis Walk-in</h1>
          <p>Terima unit perangkat yang dibawa langsung oleh pelanggan ke tempat servis.</p>
        </div>
      </header>

      {errorMessage && <InlineNotice>{errorMessage}</InlineNotice>}

      <form className={styles.ticketCard} onSubmit={handleSubmit} noValidate>
        <h2>1. Identitas Pelanggan</h2>
        <CustomerPicker
          businessId={businessId}
          selectedCustomerId={selectedCustomer?.id}
          onSelectCustomer={setSelectedCustomer}
        />

        <hr style={{ border: 'none', borderTop: '1px solid var(--border)', marginBlock: 8 }} />

        <h2>2. Data Perangkat & Fisik</h2>

        <div
          className="row"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: 16,
          }}
        >
          <label htmlFor="intake-category">Jenis perangkat<select id="intake-category" required value={category} onChange={(e) => setCategory(e.target.value)}><option value="">Pilih jenis perangkat</option>{deviceTypes.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
          <label htmlFor="intake-brand">Merek<select id="intake-brand" value={brand} onChange={(e) => setBrand(e.target.value)}><option value="">Pilih merek</option>{deviceBrands.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
          <TextInput
            label="Tipe / Model"
            placeholder="Contoh: ThinkPad T480"
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
            label="Nomor Seri / SN"
            placeholder="Nomor seri perangkat"
            value={serialNumber}
            onChange={(e) => setSerialNumber(e.target.value)}
          />
          <TextInput
            label="Kondisi Fisik Saat Diterima"
            placeholder="Contoh: Bodi lecet, baut hilang, layar utuh"
            value={condition}
            onChange={(e) => setCondition(e.target.value)}
          />
        </div>

        <TextInput
          label="Kelengkapan Tambahan"
          placeholder="Contoh: Charger, Kabel power, Box, Hard disk eksternal"
          value={accessories}
          onChange={(e) => setAccessories(e.target.value)}
        />
        <label htmlFor="intake-photo">Foto kondisi perangkat saat diterima (opsional)
          <input id="intake-photo" type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(event) => {
            const file = event.target.files?.[0] || null;
            setIntakePhoto(file && file.size <= 5 * 1024 * 1024 ? file : null);
            if (file && (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type) || file.size > 5 * 1024 * 1024)) setErrorMessage('Pilih foto JPEG, PNG, WebP, atau GIF dengan ukuran maksimal 5 MiB.');
            else setErrorMessage(null);
          }} />
          <small>JPG, PNG, WebP, atau GIF. Maksimal 5 MiB.</small>
        </label>

        <hr style={{ border: 'none', borderTop: '1px solid var(--border)', marginBlock: 8 }} />

        <h2>3. Keluhan & Penugasan</h2>

        <TextInput
          label="Keluhan Kerusakan dari Pelanggan"
          placeholder="Jelaskan kendala kerusakan yang disampaikan oleh pelanggan..."
          required
          value={complaint}
          onChange={(e) => setComplaint(e.target.value)}
        />

        <div
          className="row"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: 16,
          }}
        >
          <div>
            <label
              htmlFor="owner-service-select"
              style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, marginBottom: 4 }}
            >
              Layanan yang Dipilih (Opsional)
            </label>
            <select
              id="owner-service-select"
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
              <option value="">-- Tanpa Paket Layanan Khusus --</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.category})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="owner-tech-select"
              style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, marginBottom: 4 }}
            >
              Tugaskan Langsung ke Teknisi (Opsional)
            </label>
            <select
              id="owner-tech-select"
              value={assignedTechnicianId}
              onChange={(e) => setAssignedTechnicianId(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)',
                background: 'var(--card)',
                color: 'var(--navy-950)',
              }}
            >
              <option value="">-- Belum Ditugaskan (Antrean Umum) --</option>
              {technicians.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} {t.specializations.length > 0 ? `(${t.specializations.join(', ')})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="actions" style={{ marginTop: 16 }}>
          <Button type="submit" pending={isSubmitting || isUploading || isAttaching}>
            Simpan Tiket Masuk
          </Button>
          <ButtonLink to="/owner/tickets" variant="ghost">
            Batal
          </ButtonLink>
        </div>
      </form>
    </div>
  );
}

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
import pageStyles from './OwnerNewTicketPage.module.css';
import { difficultyLabels } from '../services/catalog';

const deviceTypes = ['Laptop', 'Smartphone', 'Tablet', 'Komputer Desktop', 'Printer', 'Monitor', 'Kamera', 'Perangkat Audio'];
const deviceBrands = ['Acer', 'Apple', 'Asus', 'Dell', 'HP', 'Lenovo', 'Samsung', 'Xiaomi', 'Oppo', 'Vivo', 'Canon', 'Epson', 'Sony'];
const otherOption = '__other__';

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
  const [customCategory, setCustomCategory] = useState('');
  const [brand, setBrand] = useState('');
  const [customBrand, setCustomBrand] = useState('');
  const [model, setModel] = useState('');
  const [condition, setCondition] = useState('');
  const [accessories, setAccessories] = useState('');
  const [complaint, setComplaint] = useState('');
  const [requestedServiceId, setRequestedServiceId] = useState('');
  const [assignedTechnicianId, setAssignedTechnicianId] = useState('');
  const [intakeDifficultyLevel, setIntakeDifficultyLevel] = useState<'' | 'low' | 'medium' | 'high' | 'complex'>('');
  const [intakePhoto, setIntakePhoto] = useState<File | null>(null);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const services = servicesData?.data || [];
  const technicians = techsData?.data || [];
  const deviceCategory = category === otherOption ? customCategory : category;
  const deviceBrand = brand === otherOption ? customBrand : brand;

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
      setErrorMessage('Pilih atau buat kontak untuk pelanggan yang datang langsung terlebih dahulu.');
      return;
    }

    if (!deviceCategory.trim() || !deviceBrand.trim() || !complaint.trim()) {
      setErrorMessage('Jenis perangkat, merek, dan keluhan wajib diisi.');
      return;
    }

    try {
      const res = await createTicket({
        businessId: businessId!,
        body: {
          customerId: selectedCustomer.id,
          device: {
            category: deviceCategory.trim(),
            brand: deviceBrand.trim(),
            model: model.trim(),
            condition: condition.trim() || undefined,
            accessories: accessories
              ? accessories
                  .split(',')
                  .map((a) => a.trim())
                  .filter(Boolean)
              : [],
          },
          complaint: complaint.trim(),
          intakeDifficultyLevel: intakeDifficultyLevel || undefined,
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
          'Gagal mencatat tiket servis. Periksa kembali kelengkapan data.',
      );
    }
  }

  return (
    <div className={`container page-content ${styles.container}`}>
      <header className={`${styles.heading} ${pageStyles.pageHeading}`}>
        <div>
          <span className="eyebrow">Tiket Servis</span>
          <h1>Buat Tiket Servis</h1>
          <p>Catat perangkat yang dibawa langsung oleh pelanggan ke tempat servis.</p>
        </div>
      </header>

      {errorMessage && <InlineNotice>{errorMessage}</InlineNotice>}

      <form className={`${styles.ticketCard} ${pageStyles.newTicketForm}`} onSubmit={handleSubmit} noValidate>
        <h2 className={pageStyles.sectionTitle}><span>1</span>Identitas Pelanggan</h2>
        <CustomerPicker
          businessId={businessId}
          selectedCustomerId={selectedCustomer?.id}
          selectedCustomer={selectedCustomer}
          onSelectCustomer={setSelectedCustomer}
        />

        <h2 className={pageStyles.sectionTitle}><span>2</span>Data Perangkat</h2>

        <div className={`${styles.row} ${pageStyles.formGrid}`}>
          <label className={pageStyles.selectField} htmlFor="intake-category">Jenis perangkat *<select className={pageStyles.select} id="intake-category" required value={category} onChange={(e) => setCategory(e.target.value)}><option value="">Pilih jenis perangkat</option>{deviceTypes.map((value) => <option key={value} value={value}>{value}</option>)}<option value={otherOption}>Perangkat Lain</option></select></label>
          {category === otherOption && <TextInput label="Nama perangkat *" required maxLength={50} placeholder="Tulis jenis perangkat" value={customCategory} onChange={(e) => setCustomCategory(e.target.value)} />}
          <label className={pageStyles.selectField} htmlFor="intake-brand">Merek *<select className={pageStyles.select} id="intake-brand" required value={brand} onChange={(e) => setBrand(e.target.value)}><option value="">Pilih merek</option>{deviceBrands.map((value) => <option key={value} value={value}>{value}</option>)}<option value={otherOption}>Merek Lain</option></select></label>
          {brand === otherOption && <TextInput label="Nama merek *" required maxLength={50} placeholder="Tulis nama merek" value={customBrand} onChange={(e) => setCustomBrand(e.target.value)} />}
          <TextInput
            label="Tipe / Model"
            placeholder="Contoh: ThinkPad T480"
            value={model}
            onChange={(e) => setModel(e.target.value)}
          />
        </div>

        <div className={`${styles.row} ${pageStyles.formGrid}`}>
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
        <label className={pageStyles.fileField} htmlFor="intake-photo">Foto kondisi perangkat saat diterima (opsional)
          <input className={pageStyles.fileInput} id="intake-photo" type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(event) => {
            const file = event.target.files?.[0] || null;
            setIntakePhoto(file && file.size <= 5 * 1024 * 1024 ? file : null);
            if (file && (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type) || file.size > 5 * 1024 * 1024)) setErrorMessage('Pilih foto JPEG, PNG, WebP, atau GIF dengan ukuran maksimal 5 MiB.');
            else setErrorMessage(null);
          }} />
          <small>JPG, PNG, WebP, atau GIF. Maksimal 5 MiB.</small>
        </label>

        <h2 className={pageStyles.sectionTitle}><span>3</span>Keluhan & Penugasan</h2>

        <label className={pageStyles.selectField} htmlFor="intake-complaint">Keluhan / masalah *</label>
        <textarea className={pageStyles.textarea} id="intake-complaint" required minLength={3} maxLength={1000} rows={4} placeholder="Jelaskan masalah perangkat yang disampaikan pelanggan" value={complaint} onChange={(e) => setComplaint(e.target.value)} />

        <div className={`${styles.row} ${pageStyles.formGrid}`}>
          <div className={pageStyles.selectField}>
            <label htmlFor="intake-difficulty">Tingkat kesulitan awal</label>
            <select id="intake-difficulty" value={intakeDifficultyLevel} onChange={(e) => setIntakeDifficultyLevel(e.target.value as typeof intakeDifficultyLevel)} className={pageStyles.select}>
              <option value="">Belum ditentukan</option>
              {Object.entries(difficultyLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <small>Teknisi dapat menyesuaikannya setelah diagnosis.</small>
          </div>
          <div className={pageStyles.selectField}>
            <label
              htmlFor="owner-service-select"
            >
              Layanan yang Dipilih (Opsional)
            </label>
            <select
              id="owner-service-select"
              value={requestedServiceId}
              onChange={(e) => setRequestedServiceId(e.target.value)}
              className={pageStyles.select}
            >
              <option value="">-- Tanpa Paket Layanan Khusus --</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.category})
                </option>
              ))}
            </select>
          </div>

          <div className={pageStyles.selectField}>
            <label
              htmlFor="owner-tech-select"
            >
              Tugaskan Langsung ke Teknisi (Opsional)
            </label>
            <select
              id="owner-tech-select"
              value={assignedTechnicianId}
              onChange={(e) => setAssignedTechnicianId(e.target.value)}
              className={pageStyles.select}
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

        <div className={`actions ${pageStyles.formActions}`}>
          <Button className={pageStyles.submitButton} type="submit" pending={isSubmitting || isUploading || isAttaching}>
            Simpan Tiket Masuk
          </Button>
          <ButtonLink className={pageStyles.cancelButton} to="/owner/tickets" variant="ghost">
            Batal
          </ButtonLink>
        </div>
      </form>
    </div>
  );
}

import { useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { TextInput } from '../../components/ui/TextInput';
import { Button } from '../../components/ui/Button';
import { InlineNotice } from '../../components/feedback/Feedback';
import type { ServiceRequestInput } from './service-request.types';
import styles from './CustomerServiceForm.module.css';

const steps = ['Mulai Servis', 'Data Perangkat', 'Konfirmasi'];

export function CustomerServiceForm({ initialCustomer, signedIn, returnPath, onSubmit }: {
  initialCustomer: ServiceRequestInput['customer'];
  signedIn: boolean;
  returnPath: string;
  onSubmit: (input: ServiceRequestInput) => Promise<void>;
}) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState(initialCustomer.name);
  const [phone, setPhone] = useState(initialCustomer.phone);
  const [email, setEmail] = useState(initialCustomer.email || '');
  const [category, setCategory] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [complaint, setComplaint] = useState('');
  const [condition, setCondition] = useState('');
  const [accessories, setAccessories] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const inFlight = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);

  function move(next: number) {
    setError('');
    setStep(next);
    heading.current?.focus();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    if (step === 0) {
      const normalized = phone.trim().replace(/[\s()-]/g, '').replace(/^0/, '+62');
      if (!name.trim() || !/^\+?[1-9]\d{7,14}$/.test(normalized)) {
        setError('Isi nama lengkap dan nomor WhatsApp yang valid.'); return;
      }
      move(1); return;
    }
    if (step === 1) {
      if (!category.trim() || !brand.trim() || complaint.trim().length < 3) {
        setError('Isi jenis perangkat, merek, dan keluhan minimal 3 karakter.'); return;
      }
      const items = accessories.split(',').map((item) => item.trim()).filter(Boolean);
      if (items.length > 20 || items.some((item) => item.length > 50)) {
        setError('Isi maksimal 20 perlengkapan, masing-masing maksimal 50 karakter.'); return;
      }
      move(2); return;
    }
    inFlight.current = true;
    setPending(true);
    setError('');
    try {
      await onSubmit({
        customer: { name: name.trim(), phone: phone.trim(), email: email.trim() || undefined },
        device: {
          category: category.trim(), brand: brand.trim(), model: model.trim() || undefined,
          condition: condition.trim() || undefined,
          accessories: accessories.split(',').map((item) => item.trim()).filter(Boolean),
        },
        complaint: complaint.trim(),
      });
    } catch {
      setError('Pengajuan belum berhasil. Data Anda tetap tersimpan di formulir ini. Silakan coba lagi.');
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }

  return <div className={styles.card}>
    {!signedIn && <p className={styles.signIn}>Sudah punya akun? <Link to="/customer/login" state={{ from: { pathname: returnPath } }}>Masuk</Link></p>}
    <ol className={styles.steps} aria-label="Langkah pengajuan servis">
      {steps.map((label, index) => <li key={label} aria-current={step === index ? 'step' : undefined} data-complete={index < step}>
        <span>{index < step ? '✓' : index + 1}</span><strong>{label}</strong>
      </li>)}
    </ol>
    <form onSubmit={submit} className={styles.form}>
      <header><p className="eyebrow">Langkah {step + 1} dari 3</p><h2 ref={heading} tabIndex={-1}>{steps[step]}</h2>
        <p>{step === 0 ? 'Cukup isi kontak Anda. Tidak perlu membuat akun.' : step === 1 ? 'Ceritakan perangkat dan kendala yang Anda alami.' : 'Pastikan informasi sudah benar sebelum dikirim.'}</p>
      </header>
      {error && <InlineNotice type="error">{error}</InlineNotice>}
      {step === 0 && <>
        {signedIn && <p className={styles.note}>Kontak diisi dari akun Anda. Silakan periksa dan lengkapi.</p>}
        <TextInput label="Nama lengkap *" name="name" autoComplete="name" required maxLength={100} value={name} onChange={(e) => setName(e.target.value)} />
        <TextInput label="Nomor WhatsApp *" name="phone" type="tel" autoComplete="tel" required maxLength={30} placeholder="Contoh: 081234567890" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <TextInput label="Email (opsional)" name="email" type="email" autoComplete="email" maxLength={254} value={email} onChange={(e) => setEmail(e.target.value)} />
      </>}
      {step === 1 && <>
        <TextInput label="Jenis perangkat *" name="category" required maxLength={50} placeholder="Contoh: Laptop, HP, Printer" value={category} onChange={(e) => setCategory(e.target.value)} />
        <div className={styles.row}>
          <TextInput label="Merek *" name="brand" required maxLength={50} placeholder="Contoh: Samsung, Asus" value={brand} onChange={(e) => setBrand(e.target.value)} />
          <TextInput label="Model (opsional)" name="model" maxLength={100} value={model} onChange={(e) => setModel(e.target.value)} />
        </div>
        <label className={styles.textarea}>Keluhan/masalah *<textarea name="complaint" required minLength={3} maxLength={1000} rows={4} placeholder="Jelaskan masalah perangkat Anda" value={complaint} onChange={(e) => setComplaint(e.target.value)} /></label>
        <TextInput label="Kondisi perangkat (opsional)" name="condition" maxLength={200} placeholder="Contoh: Layar retak, bodi lecet" value={condition} onChange={(e) => setCondition(e.target.value)} />
        <TextInput label="Perlengkapan (opsional)" name="accessories" maxLength={500} placeholder="Contoh: Charger, tas (pisahkan dengan koma)" value={accessories} onChange={(e) => setAccessories(e.target.value)} />
      </>}
      {step === 2 && <dl className={styles.summary}>
        <div><dt>Nama lengkap</dt><dd>{name}</dd></div>
        <div><dt>WhatsApp</dt><dd>{phone}</dd></div>
        {email && <div><dt>Email</dt><dd>{email}</dd></div>}
        <div><dt>Perangkat</dt><dd>{[category, brand, model].filter(Boolean).join(' · ')}</dd></div>
        <div><dt>Keluhan/masalah</dt><dd>{complaint}</dd></div>
        {condition && <div><dt>Kondisi</dt><dd>{condition}</dd></div>}
        {accessories && <div><dt>Perlengkapan</dt><dd>{accessories}</dd></div>}
      </dl>}
      <div className={styles.actions}>
        {step > 0 && <Button variant="secondary" disabled={pending} onClick={() => move(step - 1)}>Kembali</Button>}
        <Button type="submit" pending={pending}>{step === 2 ? 'Kirim & Dapatkan Nomor Tiket' : 'Lanjut'}</Button>
      </div>
    </form>
  </div>;
}

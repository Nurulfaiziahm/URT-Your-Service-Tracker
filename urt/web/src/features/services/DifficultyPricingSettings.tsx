import { useState, type FormEvent } from 'react';
import { useCreateServiceMutation, useGetServicesQuery, useUpdateServiceMutation } from './servicesApi';
import { difficultyLabels } from './catalog';
import type { RepairService } from './types';
import { Button } from '../../components/ui/Button';
import { TextInput } from '../../components/ui/TextInput';
import { InlineNotice } from '../../components/feedback/Feedback';
import { formatRupiah } from '../tickets/currency';
import styles from './Catalog.module.css';

type Difficulty = NonNullable<RepairService['difficultyLevel']>;

function DifficultyPriceForm({ businessId, level, item }: { businessId: string; level: Difficulty; item?: RepairService }) {
  const [price, setPrice] = useState(item ? String(item.basePrice) : '');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [createItem, creation] = useCreateServiceMutation();
  const [updateItem, update] = useUpdateServiceMutation();
  const pending = creation.isLoading || update.isLoading;

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');
    setError('');
    const basePrice = Number(price);
    if (!price.trim() || !Number.isSafeInteger(basePrice) || basePrice < 0) {
      setError('Masukkan harga rupiah yang valid.');
      return;
    }
    try {
      if (item) {
        await updateItem({ businessId, serviceId: item.id, body: { basePrice } }).unwrap();
      } else {
        await createItem({ businessId, body: { entryType: 'difficulty', difficultyLevel: level, name: `Jasa Servis ${difficultyLabels[level]}`, category: 'Jasa Servis', basePrice } }).unwrap();
      }
      setMessage('Tarif berhasil disimpan.');
    } catch (error) {
      setError((error as { data?: { error?: string } }).data?.error || 'Tarif belum dapat disimpan. Coba lagi.');
    }
  }

  return (
    <form className={styles.difficultyCard} onSubmit={save}>
      <div><h3>{difficultyLabels[level]}</h3><p>{item ? `Tarif saat ini: ${formatRupiah(item.basePrice)}` : 'Belum diatur'}</p></div>
      <TextInput label={`Harga Servis ${difficultyLabels[level]} (Rp)`} name={`difficultyPrice-${level}`} type="number" min={0} max={Number.MAX_SAFE_INTEGER} step={1} required value={price} onChange={(event) => { setPrice(event.target.value); setMessage(''); }} hint="Isi 0 jika tanpa biaya tambahan." />
      {error && <InlineNotice type="error">{error}</InlineNotice>}
      {message && <InlineNotice type="success">{message}</InlineNotice>}
      <Button type="submit" variant="secondary" size="small" pending={pending}>{item ? 'Simpan Harga' : 'Tetapkan Harga'}</Button>
    </form>
  );
}

export function DifficultyPricingSettings({ businessId }: { businessId: string }) {
  const { currentData, isLoading, isError, refetch } = useGetServicesQuery({ businessId, entryType: 'difficulty', status: 'active', limit: 100 }, { refetchOnFocus: true });
  return (
    <section className={styles.difficultySettings} aria-label="Pengaturan Harga Tingkat Kesulitan">
      <div><h2>Harga Servis Berdasarkan Tingkat Kesulitan</h2><p>Atur tarif setiap tingkat. Teknisi wajib memilih tingkat kesulitan; tarifnya otomatis ditambahkan satu kali ke subtotal biaya.</p></div>
      {isLoading ? <p>Memuat tarif servis...</p> : isError ? <InlineNotice type="error">Tarif gagal dimuat. <Button variant="ghost" onClick={() => void refetch()}>Coba lagi</Button></InlineNotice> : (
        <div className={styles.difficultyGrid}>
          {(Object.keys(difficultyLabels) as Difficulty[]).map((level) => {
            const item = currentData?.data.find((entry) => entry.difficultyLevel === level);
            return <DifficultyPriceForm key={`${businessId}:${level}:${item?.id || 'new'}`} businessId={businessId} level={level} item={item} />;
          })}
        </div>
      )}
    </section>
  );
}

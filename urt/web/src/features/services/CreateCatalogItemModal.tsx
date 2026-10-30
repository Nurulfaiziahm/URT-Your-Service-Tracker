import { useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { useCreateServiceMutation } from './servicesApi';
import type { RepairService } from './types';
import { Modal } from '../../components/ui/Modal';
import { TextInput } from '../../components/ui/TextInput';
import { Button } from '../../components/ui/Button';
import { InlineNotice } from '../../components/feedback/Feedback';

export function CreateCatalogItemModal({ businessId, onClose, onCreated }: { businessId: string; onClose: () => void; onCreated: (item: RepairService) => void }) {
  const [createItem, { isLoading }] = useCreateServiceMutation();
  const [error, setError] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); event.stopPropagation(); const values = new FormData(event.currentTarget); setError('');
    try {
      const result = await createItem({ businessId, body: { entryType: 'service', name: String(values.get('name')).trim(), category: String(values.get('category')).trim(), basePrice: Number(values.get('price')) } }).unwrap();
      onCreated(result.data.service);
    } catch (error) { setError((error as { data?: { error?: string } }).data?.error || 'Item belum dapat ditambahkan.'); }
  }
  return createPortal(<Modal label="Tambah Item Katalog" onClose={() => { if (!isLoading) onClose(); }}><form onSubmit={submit} style={{ padding: 24, display: 'grid', gap: 16, background: 'var(--card)' }}><h2>Tambah Item Katalog</h2><p>Item dan harga ini juga masuk ke katalog owner.</p>
    {error && <InlineNotice type="error">{error}</InlineNotice>}
    <TextInput label="Nama Item" name="name" maxLength={100} required />
    <TextInput label="Kategori" name="category" maxLength={50} required />
    <TextInput label="Harga (Rp)" name="price" type="number" min={0} step={1} required />
    <div className="actions"><Button variant="secondary" onClick={onClose} disabled={isLoading}>Batal</Button><Button type="submit" pending={isLoading}>Simpan & Tambahkan</Button></div>
  </form></Modal>, document.body);
}

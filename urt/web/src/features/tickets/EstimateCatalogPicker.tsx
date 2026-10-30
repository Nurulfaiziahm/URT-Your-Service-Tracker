import { useState } from 'react';
import { useGetServicesQuery } from '../services/servicesApi';
import type { RepairService } from '../services/types';
import { difficultyLabels } from '../services/catalog';
import { CreateCatalogItemModal } from '../services/CreateCatalogItemModal';
import { Button } from '../../components/ui/Button';
import { TextInput } from '../../components/ui/TextInput';
import { Pagination } from '../../components/navigation/Pagination';
import { formatRupiah } from './currency';
import type { EstimateLine } from './types';
import styles from './Tickets.module.css';

export function EstimateCatalogPicker({ businessId, lines, onAdd, onDifficulty }: { businessId: string; lines: EstimateLine[]; onAdd: (item: RepairService) => void; onDifficulty: (item?: RepairService) => void }) {
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState('');
  const [creating, setCreating] = useState(false);
  const { currentData: catalog, isFetching, isError, refetch } = useGetServicesQuery({ businessId, scope: 'catalog', status: 'active', page, limit: 10, q: q.trim() || undefined }, { refetchOnFocus: true });
  const { currentData: tiers, isError: tiersError, isFetching: tiersFetching, refetch: refetchTiers } = useGetServicesQuery({ businessId, entryType: 'difficulty', status: 'active', limit: 100 }, { refetchOnFocus: true });
  const selectedItem = catalog?.data.find((item) => item.id === selected);
  const chosenTier = lines.find((line) => line.catalogEntryType === 'difficulty');
  return <section className={styles.estimateCatalog} aria-label="Katalog Harga Owner">
    <div className={styles.estimateHeader}><h3>Pilih dari Katalog Harga</h3><div className={styles.estimateButtons}><Button variant="ghost" size="small" onClick={() => { void refetch(); void refetchTiers(); }}>Perbarui Katalog</Button><Button variant="secondary" size="small" onClick={() => setCreating(true)}>+ tambahkan item</Button></div></div>
    <p className={styles.estimateHint}>Harga mengikuti katalog. Tambahkan item yang belum tersedia agar tersimpan juga di katalog owner.</p>
    <TextInput label="Cari Item Katalog" name="catalogSearch" placeholder="Cari nama item atau kategori..." value={q} onChange={(event) => { setQ(event.target.value); setPage(1); setSelected(''); }} />
    {isError ? <p>Katalog belum dapat dimuat. <Button variant="ghost" onClick={() => void refetch()}>Coba lagi</Button></p> : <>
      <label className={styles.estimateField}>Item Katalog<select name="catalogItem" value={selected} onChange={(event) => setSelected(event.target.value)} disabled={isFetching}><option value="">{isFetching ? 'Memuat katalog...' : 'Pilih item dan harga'}</option>{catalog?.data.map((item) => <option key={item.id} value={item.id}>{item.name} · {formatRupiah(item.basePrice)}</option>)}</select></label>
      {!isFetching && !catalog?.data.length && <p>Belum ada item yang sesuai. Anda dapat membuat item katalog baru.</p>}
      <div><Button variant="secondary" size="small" disabled={!selectedItem || isFetching} onClick={() => { if (selectedItem) { onAdd(selectedItem); setSelected(''); } }}>Tambahkan ke Estimasi</Button></div>
      {(catalog?.pagination.totalPages || 0) > 1 && <Pagination pagination={catalog?.pagination} onPageChange={(value) => { setPage(value); setSelected(''); }} />}
    </>}
    <label className={styles.estimateField}>Tingkat Kesulitan (Wajib)<select name="estimateDifficulty" required aria-describedby="estimate-difficulty-hint" value={chosenTier?.catalogItemId || ''} onChange={(event) => onDifficulty(tiers?.data.find((item) => item.id === event.target.value))}><option value="">{tiersFetching && !tiers ? 'Memuat tarif...' : 'Pilih tingkat kesulitan'}</option>{chosenTier && !tiers?.data.some((item) => item.id === chosenTier.catalogItemId) && <option value={chosenTier.catalogItemId} disabled>Tarif tidak tersedia. Pilih ulang.</option>}{[...(tiers?.data || [])].sort((a, b) => ['low', 'medium', 'high', 'complex'].indexOf(a.difficultyLevel || 'low') - ['low', 'medium', 'high', 'complex'].indexOf(b.difficultyLevel || 'low')).map((item) => <option key={item.id} value={item.id}>{difficultyLabels[item.difficultyLevel || 'low']} · {formatRupiah(item.basePrice)}</option>)}</select></label>
    {tiersError ? <p id="estimate-difficulty-hint">Tarif kesulitan belum dapat dimuat. <Button variant="ghost" onClick={() => void refetchTiers()}>Coba lagi</Button></p> : <p id="estimate-difficulty-hint" className={styles.estimateHint}>{tiers?.data.length ? 'Pilih tingkat kesulitan sesuai hasil diagnosis. Biaya otomatis ditambahkan satu kali ke subtotal.' : tiersFetching ? 'Memuat tarif tingkat kesulitan dari owner...' : 'Owner belum menetapkan tarif tingkat kesulitan. Minta owner mengaturnya di halaman Layanan sebelum menyimpan atau mengajukan estimasi.'}</p>}
    {creating && <CreateCatalogItemModal businessId={businessId} onClose={() => setCreating(false)} onCreated={(item) => { onAdd(item); setCreating(false); }} />}
  </section>;
}

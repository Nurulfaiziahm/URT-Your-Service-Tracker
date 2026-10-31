import { useState, type FormEvent } from 'react';
import type { EstimateLine, ServiceTicket } from './types';
import { useSaveEstimateDraftMutation, useSubmitEstimateMutation } from './ticketsApi';
import { Button } from '../../components/ui/Button';
import { TextInput } from '../../components/ui/TextInput';
import { InlineNotice } from '../../components/feedback/Feedback';
import { formatRupiah } from './currency';
import type { ApiErrorBody } from '../../lib/api.types';
import styles from './Tickets.module.css';
import { localDateTimeInput } from './service-timing';
import { diagnosisExplanation } from './diagnosis-explanation';
import { EstimateCatalogPicker } from './EstimateCatalogPicker';
import { catalogEstimateLine, difficultyLabels } from '../services/catalog';
import type { RepairService } from '../services/types';

interface EstimateEditorProps {
  businessId: string;
  ticket: ServiceTicket;
  onSuccess?: () => void;
  onSubmitted?: () => void;
}

export function EstimateEditor({
  businessId,
  ticket,
  onSuccess,
  onSubmitted,
}: EstimateEditorProps) {
  const initialLines: EstimateLine[] = ticket.estimateDraft?.lines?.length
    ? ticket.estimateDraft.lines
    : ticket.service ? [
        {
          catalogItemId: ticket.service.id,
          catalogEntryType: 'service',
          description: ticket.service.name,
          type: 'labor',
          quantity: 1,
          unitPrice: ticket.service?.basePrice ?? 0,
        },
      ] : [];

  const [lines, setLines] = useState<EstimateLine[]>(initialLines);
  const [repairHours, setRepairHours] = useState(String((ticket.estimateDraft?.repairDurationMinutes || 120) / 60));
  const [qcHours, setQcHours] = useState(String((ticket.estimateDraft?.qcDurationMinutes || 30) / 60));
  const [targetDate, setTargetDate] = useState<string>(() => {
    if (ticket.estimateDraft?.targetCompletionDate) {
      return localDateTimeInput(new Date(ticket.estimateDraft.targetCompletionDate));
    }
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 3);
    return localDateTimeInput(defaultDate);
  });
  const customerExplanation =
    ticket.diagnosis?.customerExplanation ||
    diagnosisExplanation(ticket.diagnosis?.staffFindings || '');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [saveDraft, { isLoading: isSavingDraft }] = useSaveEstimateDraftMutation();
  const [submitEstimate, { isLoading: isSubmitting }] = useSubmitEstimateMutation();

  const handleLineChange = (index: number, field: keyof EstimateLine, value: string | number) => {
    setLines((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleAddCatalogItem = (item: RepairService) => {
    setLines((previous) => previous.some((line) => line.catalogItemId === item.id)
      ? previous.map((line) => line.catalogItemId === item.id ? { ...catalogEstimateLine(item), quantity: line.quantity + 1 } : line)
      : [...previous, catalogEstimateLine(item)]);
  };

  const handleRemoveLine = (index: number) => {
    setLines((prev) => prev.filter((_, i) => i !== index));
  };

  const selectedDifficulty = lines.find((line) => line.catalogEntryType === 'difficulty');
  const itemLines = lines.filter((line) => line.catalogEntryType !== 'difficulty');
  const itemSubtotal = itemLines.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const difficultyAmount = selectedDifficulty?.unitPrice ?? 0;
  const totalAmount = itemSubtotal + difficultyAmount;

  const handleSaveDraft = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    if (!selectedDifficulty?.catalogItemId) { setErrorMsg('Pilih tingkat kesulitan servis terlebih dahulu.'); return; }
    if (!lines.length) { setErrorMsg('Pilih minimal satu item dari katalog.'); return; }
    try {
      await saveDraft({
        businessId,
        ticketId: ticket.id,
        body: {
          expectedRevision: ticket.revision,
          repairDurationMinutes: Math.round(Number(repairHours) * 60),
          qcDurationMinutes: Math.round(Number(qcHours) * 60),
          lines,
          targetCompletionDate: targetDate ? new Date(targetDate).toISOString() : undefined,
        },
      }).unwrap();

      setSuccessMsg('Draf estimasi berhasil disimpan.');
      onSuccess?.();
    } catch (err) {
      const apiErr = err as { data?: ApiErrorBody };
      setErrorMsg(apiErr.data?.error || apiErr.data?.message || 'Gagal menyimpan draf estimasi.');
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!selectedDifficulty?.catalogItemId) { setErrorMsg('Pilih tingkat kesulitan servis terlebih dahulu.'); return; }

    const explanationToSend = (customerExplanation || '').trim();
    if (!explanationToSend || explanationToSend.length < 3) {
      setErrorMsg('Penjelasan untuk pelanggan belum diisi pada diagnosis tiket.');
      return;
    }

    if (!lines.length || lines.some((l) => !l.description.trim() || l.quantity < 1 || l.unitPrice < 0)) {
      setErrorMsg(
        'Pastikan semua baris item memiliki deskripsi, jumlah minimal 1, dan harga valid.',
      );
      return;
    }

    try {
      await submitEstimate({
        businessId,
        ticketId: ticket.id,
        body: {
          expectedRevision: ticket.revision,
          customerExplanation: explanationToSend,
          repairDurationMinutes: Math.round(Number(repairHours) * 60),
          qcDurationMinutes: Math.round(Number(qcHours) * 60),
          lines,
          targetCompletionDate: targetDate ? new Date(targetDate).toISOString() : undefined,
        },
      }).unwrap();

      setSuccessMsg('Estimasi resmi berhasil dikirim ke pelanggan untuk persetujuan.');
      onSuccess?.();
      onSubmitted?.();
    } catch (err) {
      const apiErr = err as { data?: ApiErrorBody };
      setErrorMsg(
        apiErr.data?.error || apiErr.data?.message || 'Gagal mengajukan estimasi ke pelanggan.',
      );
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.ticketCard}>
      <div className={styles.estimateHeader}>
        <h2>Penyusunan Estimasi Biaya Servis</h2>
        <span style={{ fontSize: '0.85rem', color: 'var(--slate-500)' }}>
          Revisi Tiket #{ticket.revision}
        </span>
      </div>

      {errorMsg && <InlineNotice type="error">{errorMsg}</InlineNotice>}
      {successMsg && <InlineNotice type="success">{successMsg}</InlineNotice>}

      <div className={styles.estimateWorkspace}>
        <div className={styles.estimateMain}>
          <div style={{ display: 'grid', gap: 8 }}>
            <EstimateCatalogPicker businessId={businessId} lines={lines} onAdd={handleAddCatalogItem} onDifficulty={(item) => setLines((previous) => [...previous.filter((line) => line.catalogEntryType !== 'difficulty'), ...(item ? [catalogEstimateLine(item)] : [])])} />
            {!lines.length && <p>Pilih item katalog untuk mulai menyusun rincian biaya.</p>}
            <div className={styles.estimateItems}>
              {lines.map((line, idx) => (
                <fieldset key={idx} className={styles.estimateItem}>
                  <legend>Item {idx + 1}</legend>
                  <div className={styles.estimateHeader}>
                    <label className={styles.estimateField} htmlFor={`line-type-${idx}`}>
                      Jenis Item
                      <select id={`line-type-${idx}`} value={line.type} disabled={Boolean(line.catalogItemId)} onChange={(event) => handleLineChange(idx, 'type', event.target.value)}>
                        <option value="part">Suku Cadang</option>
                        <option value="labor">Jasa / Biaya</option>
                      </select>
                    </label>
                    <div className={styles.estimateButtons}>
                      {line.difficultyLevel && <span>Tingkat {difficultyLabels[line.difficultyLevel]}</span>}
                      <Button type="button" variant="ghost" size="small" onClick={() => handleRemoveLine(idx)} aria-label={`Hapus Item ${idx + 1}`}>Hapus</Button>
                    </div>
                  </div>
                  <label className={styles.estimateField} htmlFor={`line-description-${idx}`}>
                    Deskripsi Item
                    <textarea id={`line-description-${idx}`} name={`description-${idx}`} rows={2} maxLength={200} value={line.description} readOnly={Boolean(line.catalogItemId)} onChange={(event) => handleLineChange(idx, 'description', event.target.value)} placeholder="Deskripsi item dari katalog" required />
                  </label>
                  <div className={styles.estimateAmounts}>
                    <TextInput label="Jumlah" name={`quantity-${idx}`} type="number" min={1} step={1} value={line.quantity} readOnly={line.catalogEntryType === 'difficulty'} onChange={(event) => handleLineChange(idx, 'quantity', parseInt(event.target.value, 10) || 1)} required />
                    <TextInput label="Harga Satuan (Rp)" name={`unitPrice-${idx}`} type="number" min={0} step={1} value={line.unitPrice} readOnly={Boolean(line.catalogItemId)} onChange={(event) => handleLineChange(idx, 'unitPrice', Math.max(0, parseInt(event.target.value, 10) || 0))} required />
                    <div className={styles.estimateSubtotal}><span>Subtotal</span><output>{formatRupiah(line.quantity * line.unitPrice)}</output></div>
                  </div>
                </fieldset>
              ))}
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <div style={{ maxWidth: 220 }}>
              <TextInput
                id="targetDate"
                label="Target Siap Diambil"
                type="datetime-local"
                required
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
              />
            </div>

            <div className={styles.totalBox}>
              <span className={styles.totalLabel}>Total Biaya Estimasi:</span>
              <span className={styles.totalAmount}>{formatRupiah(totalAmount)}</span>
            </div>
          </div>

          <div className={styles.estimateSchedule}>
            <TextInput label="Durasi Pengerjaan (jam)" name="repairHours" type="number" min={1 / 60} max={8760} step="any" required value={repairHours} onChange={(event) => setRepairHours(event.target.value)} hint="Contoh: 2 untuk dua jam." />
            <TextInput label="Durasi QC (jam)" name="qcHours" type="number" min={1 / 60} max={8760} step="any" required value={qcHours} onChange={(event) => setQcHours(event.target.value)} hint="Contoh: 0.5 untuk 30 menit." />
          </div>
        </div>
        <aside className={styles.estimateReceipt} aria-label="Struk Estimasi">
          <div className={styles.receiptHeading}><span className="eyebrow">Struk Estimasi</span><h3>Rincian Biaya Servis</h3><p>{ticket.ticketCode}</p><p>{ticket.customer?.name || 'Pelanggan'}</p></div>
          <div className={styles.receiptLines}>
            {!itemLines.length && <p className={styles.estimateHint}>Item yang ditambahkan akan tampil di sini.</p>}
            {itemLines.map((line, index) => <div className={styles.receiptLine} key={line.catalogItemId || index}><div><strong>{line.description}</strong><span>{line.quantity} × {formatRupiah(line.unitPrice)}</span></div><output>{formatRupiah(line.quantity * line.unitPrice)}</output></div>)}
          </div>
          <div className={styles.receiptSummary}>
            <div><span>Subtotal Item</span><output>{formatRupiah(itemSubtotal)}</output></div>
            <div><span>Jasa Servis{selectedDifficulty?.difficultyLevel ? ` (${difficultyLabels[selectedDifficulty.difficultyLevel]})` : ''}</span><output>{selectedDifficulty ? formatRupiah(difficultyAmount) : 'Belum dipilih'}</output></div>
            <div><strong>Subtotal Biaya</strong><output>{formatRupiah(totalAmount)}</output></div>
          </div>
          <div className={styles.receiptTotal} aria-live="polite" aria-atomic="true"><span>Total Keseluruhan</span><output>{formatRupiah(totalAmount)}</output></div>
          {!selectedDifficulty && <p className={styles.receiptWarning}>Pilih tingkat kesulitan untuk melengkapi total biaya.</p>}
          <p className={styles.estimateHint}>Estimasi biaya menunggu persetujuan pelanggan.</p>
        </aside>
      </div>
      <div className={`${styles.actionBar} ${styles.estimateActions}`}>
        <Button type="button" variant="secondary" onClick={handleSaveDraft} disabled={isSavingDraft || isSubmitting}>
          {isSavingDraft ? 'Menyimpan...' : 'Simpan Draf Estimasi'}
        </Button>
        <Button type="submit" variant="primary" disabled={isSavingDraft || isSubmitting}>
          {isSubmitting ? 'Mengajukan...' : 'Ajukan Estimasi ke Pelanggan'}
        </Button>
      </div>
    </form>
  );
}

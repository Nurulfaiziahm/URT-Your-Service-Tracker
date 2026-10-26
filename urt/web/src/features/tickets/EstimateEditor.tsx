import { useState, type FormEvent } from 'react';
import type { EstimateLine, ServiceTicket } from './types';
import { useSaveEstimateDraftMutation, useSubmitEstimateMutation } from './ticketsApi';
import { Button } from '../../components/ui/Button';
import { TextInput } from '../../components/ui/TextInput';
import { InlineNotice } from '../../components/feedback/Feedback';
import { formatRupiah } from './currency';
import type { ApiErrorBody } from '../../lib/api.types';
import styles from './Tickets.module.css';

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
    : [
        {
          description: ticket.service ? `Jasa perbaikan ${ticket.service.name}` : 'Jasa perbaikan',
          type: 'labor',
          quantity: 1,
          unitPrice: ticket.service?.basePrice || 50000,
        },
      ];

  const [lines, setLines] = useState<EstimateLine[]>(initialLines);
  const [targetDate, setTargetDate] = useState<string>(() => {
    if (ticket.estimateDraft?.targetCompletionDate) {
      return new Date(ticket.estimateDraft.targetCompletionDate).toISOString().split('T')[0];
    }
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 3);
    return defaultDate.toISOString().split('T')[0];
  });
  const [customerExplanation, setCustomerExplanation] = useState<string>(
    ticket.diagnosis?.customerExplanation || '',
  );
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

  const handleAddLine = (type: 'part' | 'labor') => {
    setLines((prev) => [
      ...prev,
      {
        description: type === 'part' ? 'Suku cadang baru' : 'Biaya pengerjaan',
        type,
        quantity: 1,
        unitPrice: 0,
      },
    ]);
  };

  const handleRemoveLine = (index: number) => {
    if (lines.length <= 1) {
      setErrorMsg('Estimasi harus memiliki setidaknya satu item.');
      return;
    }
    setLines((prev) => prev.filter((_, i) => i !== index));
  };

  const totalAmount = lines.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

  const handleSaveDraft = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await saveDraft({
        businessId,
        ticketId: ticket.id,
        body: {
          expectedRevision: ticket.revision,
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

    if (!customerExplanation || customerExplanation.trim().length < 3) {
      setErrorMsg('Penjelasan untuk pelanggan wajib diisi sebelum mengajukan estimasi.');
      return;
    }

    if (lines.some((l) => !l.description.trim() || l.quantity < 1 || l.unitPrice < 0)) {
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
          customerExplanation: customerExplanation.trim(),
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Penyusunan Estimasi Biaya Servis</h2>
        <span style={{ fontSize: '0.85rem', color: 'var(--slate-500)' }}>
          Revisi Tiket #{ticket.revision}
        </span>
      </div>

      {errorMsg && <InlineNotice type="error">{errorMsg}</InlineNotice>}
      {successMsg && <InlineNotice type="success">{successMsg}</InlineNotice>}

      <div style={{ display: 'grid', gap: 6 }}>
        <label htmlFor="cust-explanation" style={{ fontWeight: 600, fontSize: '0.9rem' }}>
          Penjelasan untuk Pelanggan (Wajib):
        </label>
        <textarea
          id="cust-explanation"
          rows={3}
          value={customerExplanation}
          onChange={(e) => setCustomerExplanation(e.target.value)}
          placeholder="Jelaskan kerusakan yang ditemukan dan perbaikan yang dibutuhkan dengan bahasa yang ramah dipahami pelanggan..."
          style={{
            padding: '10px 12px',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            fontFamily: 'inherit',
            fontSize: '0.9rem',
          }}
          required
        />
      </div>

      <div style={{ display: 'grid', gap: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <strong style={{ fontSize: '0.92rem', color: 'var(--navy-950)' }}>
            Rincian Item & Suku Cadang:
          </strong>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button
              type="button"
              variant="secondary"
              style={{ fontSize: '0.82rem', padding: '4px 10px' }}
              onClick={() => handleAddLine('part')}
            >
              + Tambah Suku Cadang
            </Button>
            <Button
              type="button"
              variant="secondary"
              style={{ fontSize: '0.82rem', padding: '4px 10px' }}
              onClick={() => handleAddLine('labor')}
            >
              + Tambah Biaya Jasa
            </Button>
          </div>
        </div>

        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th style={{ width: 130 }}>Jenis</th>
                <th>Deskripsi Item</th>
                <th style={{ width: 80 }} className={styles.textRight}>
                  Jumlah
                </th>
                <th style={{ width: 150 }} className={styles.textRight}>
                  Harga Satuan (Rp)
                </th>
                <th style={{ width: 140 }} className={styles.textRight}>
                  Subtotal
                </th>
                <th style={{ width: 50 }}></th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line, idx) => {
                const subtotal = line.quantity * line.unitPrice;
                return (
                  <tr key={idx}>
                    <td>
                      <select
                        value={line.type}
                        onChange={(e) =>
                          handleLineChange(idx, 'type', e.target.value as 'part' | 'labor')
                        }
                        style={{
                          padding: '6px 8px',
                          border: '1px solid var(--border)',
                          borderRadius: 4,
                          fontSize: '0.82rem',
                          width: '100%',
                        }}
                      >
                        <option value="part">Suku Cadang</option>
                        <option value="labor">Jasa / Biaya</option>
                      </select>
                    </td>
                    <td>
                      <input
                        type="text"
                        value={line.description}
                        onChange={(e) => handleLineChange(idx, 'description', e.target.value)}
                        placeholder="Contoh: Penggantian Baterai OEM"
                        style={{
                          padding: '6px 8px',
                          border: '1px solid var(--border)',
                          borderRadius: 4,
                          fontSize: '0.88rem',
                          width: '100%',
                        }}
                        required
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min="1"
                        value={line.quantity}
                        onChange={(e) =>
                          handleLineChange(idx, 'quantity', parseInt(e.target.value, 10) || 1)
                        }
                        style={{
                          padding: '6px 8px',
                          border: '1px solid var(--border)',
                          borderRadius: 4,
                          fontSize: '0.88rem',
                          width: '100%',
                          textAlign: 'right',
                        }}
                        required
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        step="1000"
                        value={line.unitPrice}
                        onChange={(e) =>
                          handleLineChange(
                            idx,
                            'unitPrice',
                            Math.max(0, parseInt(e.target.value, 10) || 0),
                          )
                        }
                        style={{
                          padding: '6px 8px',
                          border: '1px solid var(--border)',
                          borderRadius: 4,
                          fontSize: '0.88rem',
                          width: '100%',
                          textAlign: 'right',
                        }}
                        required
                      />
                    </td>
                    <td className={styles.textRight}>
                      <strong>{formatRupiah(subtotal)}</strong>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={() => handleRemoveLine(idx)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#dc2626',
                          cursor: 'pointer',
                          fontWeight: 'bold',
                        }}
                        title="Hapus baris"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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
            label="Target Selesai (Opsional)"
            type="date"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
          />
        </div>

        <div className={styles.totalBox}>
          <span className={styles.totalLabel}>Total Biaya Estimasi:</span>
          <span className={styles.totalAmount}>{formatRupiah(totalAmount)}</span>
        </div>
      </div>

      <div className={styles.actionBar} style={{ justifyContent: 'flex-end' }}>
        <Button
          type="button"
          variant="secondary"
          onClick={handleSaveDraft}
          disabled={isSavingDraft || isSubmitting}
        >
          {isSavingDraft ? 'Menyimpan...' : 'Simpan Draf Estimasi'}
        </Button>
        <Button type="submit" variant="primary" disabled={isSavingDraft || isSubmitting}>
          {isSubmitting ? 'Mengajukan...' : 'Ajukan Estimasi ke Pelanggan'}
        </Button>
      </div>
    </form>
  );
}

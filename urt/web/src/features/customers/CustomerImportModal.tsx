import { Modal } from '../../components/ui/Modal';
import { useState, type ChangeEvent, type FormEvent } from 'react';
import { useCreateCustomerMutation } from './customersApi';
import { Button } from '../../components/ui/Button';
import { ResponsiveTable } from '../../components/ui/ResponsiveTable';
import { InlineNotice } from '../../components/feedback/Feedback';
import styles from '../tickets/Tickets.module.css';

interface CustomerImportModalProps {
  businessId: string;
  onClose: () => void;
  onSuccess: () => void;
}

interface ParsedCustomerRow {
  rowNumber: number;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  isValid: boolean;
  error?: string;
}

export function CustomerImportModal({ businessId, onClose, onSuccess }: CustomerImportModalProps) {
  const [rows, setRows] = useState<ParsedCustomerRow[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importStats, setImportStats] = useState<{ success: number; failed: number } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [createCustomer] = useCreateCustomerMutation();

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    setImportStats(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      setErrorMsg('Mohon unggah berkas berekstensi .csv');
      return;
    }

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        parseCsv(text);
      } catch {
        setErrorMsg('Gagal membaca format file CSV. Pastikan encoding UTF-8.');
      }
    };
    reader.readAsText(file);
  };

  const parseCsv = (text: string) => {
    const rawLines = text.split(/\r\n|\n/).filter((l) => l.trim().length > 0);
    if (rawLines.length < 2) {
      setErrorMsg('File CSV harus memiliki baris judul kolom dan minimal satu baris data.');
      setRows([]);
      return;
    }

    // Determine delimiter: comma or semicolon
    const headerLine = rawLines[0];
    const delimiter = headerLine.includes(';') ? ';' : ',';

    const headers = headerLine.split(delimiter).map((h) =>
      h
        .replace(/^["']|["']$/g, '')
        .trim()
        .toLowerCase(),
    );

    const nameIdx = headers.indexOf('name');
    const phoneIdx = headers.indexOf('phone');
    const emailIdx = headers.indexOf('email');
    const addressIdx = headers.indexOf('address');

    if (nameIdx === -1) {
      setErrorMsg("Kolom 'name' wajib ada pada baris pertama (header) file CSV.");
      setRows([]);
      return;
    }

    const seenPhones = new Set<string>();
    const seenEmails = new Set<string>();
    const parsed: ParsedCustomerRow[] = [];

    for (let i = 1; i < rawLines.length; i++) {
      const line = rawLines[i].trim();
      if (!line) continue;

      const cols = line.split(delimiter).map((c) => c.replace(/^["']|["']$/g, '').trim());
      const name = cols[nameIdx] || '';
      const phone = phoneIdx !== -1 ? cols[phoneIdx] || undefined : undefined;
      const email = emailIdx !== -1 ? cols[emailIdx]?.toLowerCase() || undefined : undefined;
      const address = addressIdx !== -1 ? cols[addressIdx] || undefined : undefined;

      let isValid = true;
      let error: string | undefined;

      if (!name) {
        isValid = false;
        error = 'Nama pelanggan kosong';
      } else if (phone && seenPhones.has(phone)) {
        error = 'Duplikasi nomor telepon dalam file';
      } else if (email && seenEmails.has(email)) {
        error = 'Duplikasi email dalam file';
      }

      if (phone) seenPhones.add(phone);
      if (email) seenEmails.add(email);

      parsed.push({
        rowNumber: i + 1,
        name,
        phone,
        email,
        address,
        isValid,
        error,
      });
    }

    setRows(parsed);
  };

  const handleConfirmImport = async (e: FormEvent) => {
    e.preventDefault();
    const validRows = rows.filter((r) => r.isValid);
    if (validRows.length === 0) {
      setErrorMsg('Tidak ada baris valid untuk diimpor.');
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);

    let successCount = 0;
    let failedCount = 0;

    for (const row of validRows) {
      try {
        await createCustomer({
          businessId,
          body: {
            name: row.name,
            phone: row.phone,
            email: row.email,
            address: row.address,
          },
        }).unwrap();
        successCount++;
      } catch {
        failedCount++;
      }
    }

    setIsProcessing(false);
    setImportStats({ success: successCount, failed: failedCount });

    if (successCount > 0) {
      setTimeout(() => {
        onSuccess();
      }, 1500);
    }
  };

  const validCount = rows.filter((r) => r.isValid).length;
  const invalidCount = rows.filter((r) => !r.isValid).length;

  return (
    <Modal onClose={onClose}>
      <div className={styles.modalDialog} style={{ maxWidth: 680 }}>
        <div className={styles.modalHeader}>
          <h3>Impor Kontak Pelanggan dari Berkas CSV</h3>
          <button type="button" className={styles.closeButton} onClick={onClose}>
            ✕
          </button>
        </div>

        <form onSubmit={handleConfirmImport} style={{ display: 'grid', gap: 14 }}>
          {errorMsg && <InlineNotice type="error">{errorMsg}</InlineNotice>}

          {importStats && (
            <InlineNotice type="success">
              ✓ Proses impor selesai: {importStats.success} kontak berhasil ditambahkan
              {importStats.failed > 0 && `, ${importStats.failed} gagal`}.
            </InlineNotice>
          )}

          {/* Column Guide */}
          <div
            style={{
              padding: '12px 14px',
              background: 'var(--canvas)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
              fontSize: '0.85rem',
            }}
          >
            <strong style={{ color: 'var(--navy-950)' }}>Panduan Kolom Header CSV:</strong>
            <p style={{ margin: '4px 0 0', color: 'var(--slate-600)' }}>
              Baris pertama harus berisi judul kolom:{' '}
              <code style={{ background: '#e2e8f0', padding: '1px 4px', borderRadius: 4 }}>
                name, phone, email, address
              </code>
              <br />
              Kolom <code>name</code> wajib diisi. Kolom <code>phone</code>, <code>email</code>, dan{' '}
              <code>address</code> bersifat opsional.
            </p>
          </div>

          {/* File Picker */}
          <div>
            <label
              htmlFor="csvFile"
              style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, marginBottom: 6 }}
            >
              Pilih Berkas Spreadsheet CSV:
            </label>
            <input
              id="csvFile"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              disabled={isProcessing}
              style={{ fontSize: '0.9rem' }}
            />
            {fileName && (
              <span style={{ fontSize: '0.8rem', color: 'var(--slate-500)', marginLeft: 8 }}>
                ({fileName})
              </span>
            )}
          </div>

          {/* Preview Table */}
          {rows.length > 0 && (
            <div style={{ display: 'grid', gap: 8 }}>
              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <strong style={{ fontSize: '0.9rem', color: 'var(--navy-950)' }}>
                  Pratinjau Data ({rows.length} Baris Terdeteksi):
                </strong>
                <span style={{ fontSize: '0.82rem', color: 'var(--slate-600)' }}>
                  <span style={{ color: '#059669', fontWeight: 600 }}>{validCount} Valid</span>
                  {invalidCount > 0 && (
                    <span style={{ color: '#dc2626', fontWeight: 600, marginLeft: 8 }}>
                      {invalidCount} Tidak Valid
                    </span>
                  )}
                </span>
              </div>

              <ResponsiveTable className={styles.tableWrapper} style={{ maxHeight: 220, overflowY: 'auto' }} rowHeading="Baris">
                <table className={styles.table} style={{ fontSize: '0.82rem' }}>
                  <thead>
                    <tr>
                      <th style={{ width: 50 }}>Baris</th>
                      <th>Nama Pelanggan</th>
                      <th>Telepon</th>
                      <th>Email</th>
                      <th>Status Validasi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 15).map((r) => (
                      <tr
                        key={r.rowNumber}
                        style={{ background: !r.isValid ? '#fef2f2' : undefined }}
                      >
                        <td>{r.rowNumber}</td>
                        <td>
                          <strong>{r.name || '—'}</strong>
                        </td>
                        <td>{r.phone || '—'}</td>
                        <td>{r.email || '—'}</td>
                        <td>
                          {r.isValid ? (
                            <span style={{ color: '#059669', fontWeight: 600 }}>
                              ✓ Siap diimpor
                              {r.error && ` (${r.error})`}
                            </span>
                          ) : (
                            <span style={{ color: '#dc2626', fontWeight: 600 }}>✕ {r.error}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ResponsiveTable>
              {rows.length > 15 && (
                <span style={{ fontSize: '0.78rem', color: 'var(--slate-500)' }}>
                  Menampilkan 15 baris pertama dari total {rows.length} baris.
                </span>
              )}
            </div>
          )}

          <div className={styles.modalFooter}>
            <Button type="button" variant="secondary" onClick={onClose} disabled={isProcessing}>
              Tutup
            </Button>
            <Button type="submit" variant="primary" disabled={validCount === 0 || isProcessing}>
              {isProcessing ? 'Mengimpor Kontak...' : `Konfirmasi Impor (${validCount} Kontak)`}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}

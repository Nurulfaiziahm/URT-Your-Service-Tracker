import { useState } from 'react';
import { useGetCustomersQuery, useCreateCustomerMutation, useUpdateCustomerMutation } from './customersApi';
import type { Customer } from './types';
import { TextInput } from '../../components/ui/TextInput';
import { Button } from '../../components/ui/Button';
import { InlineNotice } from '../../components/feedback/Feedback';
import { Modal } from '../../components/ui/Modal';
import styles from './CustomerPicker.module.css';

function normalizeIndonesianPhone(value: string): string | undefined {
  const digits = value.replace(/\D/g, '');
  if (!digits || digits === '62') return undefined;
  if (digits.startsWith('62')) return `+${digits}`;
  if (digits.startsWith('0')) return `+62${digits.slice(1)}`;
  return `+62${digits}`;
}

interface CustomerPickerProps {
  businessId: string;
  selectedCustomerId?: string | null;
  selectedCustomer?: Customer | null;
  onSelectCustomer: (customer: Customer | null) => void;
}

export function CustomerPicker({
  businessId,
  selectedCustomerId,
  selectedCustomer,
  onSelectCustomer,
}: CustomerPickerProps) {
  const [search, setSearch] = useState('');
  const [showNewForm, setShowNewForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const { data, isLoading } = useGetCustomersQuery({
    businessId,
    q: search.trim() || undefined,
    limit: 10,
  });

  const [createCustomer, { isLoading: isCreating }] = useCreateCustomerMutation();
  const [updateCustomer, { isLoading: isUpdating }] = useUpdateCustomerMutation();

  const customers = data?.data || [];
  const selected = selectedCustomer?.id === selectedCustomerId
    ? selectedCustomer
    : customers.find((c) => c.id === selectedCustomerId);

  async function handleCreateWalkIn() {
    setFormError(null);

    if (!newName.trim()) {
      setFormError('Nama pelanggan wajib diisi.');
      return;
    }

    try {
      const res = await createCustomer({
        businessId,
        body: {
          name: newName.trim(),
          phone: normalizeIndonesianPhone(newPhone),
          email: newEmail.trim().toLowerCase() || undefined,
          address: newAddress.trim() || undefined,
        },
      }).unwrap();

      onSelectCustomer(res.data.customer);
      setShowNewForm(false);
      setNewName('');
      setNewPhone('');
      setNewEmail('');
      setNewAddress('');
    } catch {
      setFormError('Gagal menambahkan kontak pelanggan.');
    }
  }

  function startEditing(customer: Customer) {
    setFormError(null);
    setEditingCustomer(customer);
    setEditName(customer.name);
    setEditPhone(customer.phone || '');
    setEditEmail(customer.email || '');
    setEditAddress(customer.address || '');
  }

  async function handleUpdateCustomer() {
    if (!editingCustomer || !editName.trim()) {
      setFormError('Nama pelanggan wajib diisi.');
      return;
    }
    setFormError(null);
    try {
      const result = await updateCustomer({
        businessId,
        customerId: editingCustomer.id,
        body: {
          name: editName.trim(),
          phone: normalizeIndonesianPhone(editPhone),
          email: editEmail.trim().toLowerCase() || undefined,
          address: editAddress.trim() || undefined,
        },
      }).unwrap();
      if (selectedCustomerId === result.data.customer.id) onSelectCustomer(result.data.customer);
      setEditingCustomer(null);
    } catch {
      setFormError('Gagal memperbarui data pelanggan.');
    }
  }

  return (
    <div className={styles.picker}>
      {selected ? (
        <div
          style={{
            padding: 12,
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            background: 'var(--canvas)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <strong>{selected.name}</strong>
            <div style={{ fontSize: '0.85rem', color: 'var(--slate-500)' }}>
              {selected.phone || 'Tanpa telepon'} • {selected.email || 'Tanpa email'}
            </div>
          </div>
          <Button variant="ghost" onClick={() => onSelectCustomer(null)}>
            Ganti
          </Button>
        </div>
      ) : showNewForm ? (
        <div
          role="group"
          aria-labelledby="new-walk-in-customer-title"
          onKeyDown={(event) => {
            if (event.key === 'Enter' && event.target instanceof HTMLInputElement) {
              event.preventDefault();
              if (!isCreating) void handleCreateWalkIn();
            }
          }}
          style={{
            display: 'grid',
            gap: 12,
            padding: 16,
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            background: 'var(--canvas)',
          }}
        >
          <strong id="new-walk-in-customer-title">Tambah Kontak Pelanggan Baru</strong>
          {formError && <InlineNotice type="error">{formError}</InlineNotice>}
          <TextInput
            label="Nama Lengkap"
            value={newName}
            required
            onChange={(e) => setNewName(e.target.value)}
          />
          <TextInput
            label="Nomor Telepon / WhatsApp"
            value={newPhone}
            type="tel"
            onChange={(e) => setNewPhone(e.target.value)}
          />
          <TextInput
            label="Email (opsional)"
            value={newEmail}
            type="email"
            onChange={(e) => setNewEmail(e.target.value)}
          />
          <TextInput
            label="Alamat (opsional)"
            value={newAddress}
            onChange={(e) => setNewAddress(e.target.value)}
          />
          <div className="actions">
            <Button type="button" pending={isCreating} onClick={() => void handleCreateWalkIn()}>
              Simpan & Pilih
            </Button>
            <Button variant="ghost" onClick={() => setShowNewForm(false)}>
              Batal
            </Button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <TextInput
              label="Cari Pelanggan"
              placeholder="Ketik nama atau nomor telepon..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Button
              variant="secondary"
              style={{ alignSelf: 'flex-end', height: 42 }}
              onClick={() => setShowNewForm(true)}
            >
              + Kontak Baru
            </Button>
          </div>

          {isLoading ? (
            <div style={{ padding: 12, fontSize: '0.88rem' }}>Mencari...</div>
          ) : customers.length > 0 ? (
            <div
              style={{
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                maxHeight: 180,
                overflowY: 'auto',
              }}
            >
              {customers.map((c) => (
                <div
                  key={c.id}
                  style={{
                    padding: '8px 12px',
                    borderBottom: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                  }}
                >
                  <div className={styles.customerRowSelect}>
                    <span className={styles.customerName}>{c.name}</span>
                    <span className={styles.customerPhone}>{c.phone || '—'}</span>
                    <span className={styles.customerEmail}>{c.email || '—'}</span>
                  </div>
                  <Button type="button" variant="ghost" size="small" className={styles.customerAction} onClick={() => onSelectCustomer(c)}>Pilih</Button>
                  <Button type="button" variant="ghost" size="small" className={styles.customerEditAction} onClick={() => startEditing(c)}>Edit</Button>
                </div>
              ))}
            </div>
          ) : search ? (
            <div style={{ fontSize: '0.85rem', color: 'var(--slate-500)' }}>
              Tidak ada pelanggan yang cocok.{' '}
              <button
                type="button"
                className="text-link"
                onClick={() => setShowNewForm(true)}
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Buat kontak baru
              </button>
            </div>
          ) : null}
        </div>
      )}
      {editingCustomer && (
        <Modal
          label="Edit kontak pelanggan"
          onClose={() => {
            setEditingCustomer(null);
            setFormError(null);
          }}
        >
          <div
            className={styles.editModal}
            role="group"
            aria-labelledby="edit-customer-title"
            onKeyDown={(event) => {
              if (event.key === 'Enter' && event.target instanceof HTMLInputElement) {
                event.preventDefault();
                if (!isUpdating) void handleUpdateCustomer();
              }
            }}
          >
            <header className={styles.editHeader}>
              <div>
                <span className={styles.editEyebrow}>DATA PELANGGAN</span>
                <h2 id="edit-customer-title">Edit kontak</h2>
                <p>Perbarui informasi {editingCustomer.name}.</p>
              </div>
              <button
                type="button"
                className={styles.closeButton}
                aria-label="Tutup"
                onClick={() => {
                  setEditingCustomer(null);
                  setFormError(null);
                }}
              >
                ×
              </button>
            </header>
            {formError && <InlineNotice type="error">{formError}</InlineNotice>}
            <div className={styles.editFields}>
              <TextInput label="Nama Lengkap" value={editName} required onChange={(e) => setEditName(e.target.value)} />
              <TextInput label="Nomor Telepon / WhatsApp" type="tel" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
              <TextInput label="Email (opsional)" type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
              <TextInput label="Alamat (opsional)" value={editAddress} onChange={(e) => setEditAddress(e.target.value)} />
            </div>
            <footer className={styles.editActions}>
              <Button type="button" variant="secondary" onClick={() => { setEditingCustomer(null); setFormError(null); }}>Batal</Button>
              <Button type="button" pending={isUpdating} onClick={() => void handleUpdateCustomer()}>Simpan Perubahan</Button>
            </footer>
          </div>
        </Modal>
      )}
    </div>
  );
}

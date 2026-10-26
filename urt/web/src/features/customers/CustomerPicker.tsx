import { useState } from 'react';
import { useGetCustomersQuery, useCreateCustomerMutation } from './customersApi';
import type { Customer } from './types';
import { TextInput } from '../../components/ui/TextInput';
import { Button } from '../../components/ui/Button';
import { InlineNotice } from '../../components/feedback/Feedback';

interface CustomerPickerProps {
  businessId: string;
  selectedCustomerId?: string | null;
  onSelectCustomer: (customer: Customer) => void;
}

export function CustomerPicker({
  businessId,
  selectedCustomerId,
  onSelectCustomer,
}: CustomerPickerProps) {
  const [search, setSearch] = useState('');
  const [showNewForm, setShowNewForm] = useState(false);

  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const { data, isLoading } = useGetCustomersQuery({
    businessId,
    q: search.trim() || undefined,
    limit: 10,
  });

  const [createCustomer, { isLoading: isCreating }] = useCreateCustomerMutation();

  const customers = data?.data || [];
  const selected = customers.find((c) => c.id === selectedCustomerId);

  async function handleCreateWalkIn(e: React.FormEvent) {
    e.preventDefault();
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
          phone: newPhone.trim() || undefined,
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

  return (
    <div style={{ display: 'grid', gap: 12 }}>
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
          <Button variant="ghost" onClick={() => onSelectCustomer({} as Customer)}>
            Ganti
          </Button>
        </div>
      ) : showNewForm ? (
        <form
          onSubmit={handleCreateWalkIn}
          style={{
            display: 'grid',
            gap: 12,
            padding: 16,
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            background: 'var(--canvas)',
          }}
        >
          <strong>Tambah Kontak Pelanggan Baru (Walk-in)</strong>
          {formError && <InlineNotice>{formError}</InlineNotice>}
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
            <Button type="submit" pending={isCreating}>
              Simpan & Pilih
            </Button>
            <Button variant="ghost" onClick={() => setShowNewForm(false)}>
              Batal
            </Button>
          </div>
        </form>
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
                  onClick={() => onSelectCustomer(c)}
                  style={{
                    padding: '8px 12px',
                    borderBottom: '1px solid var(--border)',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                  }}
                >
                  <span>{c.name}</span>
                  <span style={{ fontSize: '0.82rem', color: 'var(--slate-500)' }}>
                    {c.phone || c.email}
                  </span>
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
    </div>
  );
}

import { useState, type FormEvent } from 'react';
import { useGetTechnicianDashboardQuery } from '../dashboard/dashboardApi';
import { useGetTechnicianQuery, useUpdateTechnicianMutation } from '../technicians/techniciansApi';
import type { Technician } from '../technicians/types';
import { TextInput } from '../../components/ui/TextInput';
import { Button } from '../../components/ui/Button';
import { InlineNotice, PageLoader } from '../../components/feedback/Feedback';
function TechnicianForm({
  technician,
  businessId,
}: {
  technician: Technician;
  businessId: string;
}) {
  const [specializations, setSpecializations] = useState(technician.specializations.join(', '));
  const [notice, setNotice] = useState('');
  const [update, { isLoading }] = useUpdateTechnicianMutation();
  async function submit(e: FormEvent) {
    e.preventDefault();
    setNotice('');
    try {
      await update({
        businessId,
        technicianId: technician.id,
        body: {
          specializations: specializations
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
        },
      }).unwrap();
      setNotice('Spesialisasi berhasil diperbarui.');
    } catch {
      setNotice('Spesialisasi gagal diperbarui. Silakan coba lagi.');
    }
  }
  return (
    <form className="reference-panel reference-stack" onSubmit={submit}>
      <div>
        <h2>Informasi Teknisi</h2>
        <p>Keahlian yang ditampilkan kepada pemilik tempat servis.</p>
      </div>
      {notice && <InlineNotice>{notice}</InlineNotice>}
      <TextInput
        label="Spesialisasi"
        value={specializations}
        onChange={(e) => setSpecializations(e.target.value)}
        hint="Pisahkan keahlian dengan koma, misalnya: Laptop, Hardware, Layar LCD."
      />
      <div className="actions">
        <Button type="submit" pending={isLoading}>
          Simpan Spesialisasi
        </Button>
      </div>
    </form>
  );
}
export function TechnicianProfileSection({ businessId }: { businessId: string }) {
  const { data: dashboard } = useGetTechnicianDashboardQuery({ businessId });
  const id = dashboard?.data.technicianId || '';
  const { data, isLoading, isError } = useGetTechnicianQuery({ businessId, id }, { skip: !id });
  if (isLoading) return <PageLoader />;
  if (isError) return <InlineNotice>Informasi teknisi belum dapat dimuat.</InlineNotice>;
  return data ? <TechnicianForm technician={data.data.technician} businessId={businessId} /> : null;
}

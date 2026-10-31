export const portals = {
  owner: {
    label: 'Owner', name: 'Portal pemilik', description: 'Ringkasan dan pengelolaan tempat servis.',
    items: [
      ['Beranda', '/owner'], ['Tiket servis', '/owner/tickets'], ['Teknisi', '/owner/technicians'], ['Pelanggan', '/owner/customers'], ['Layanan', '/owner/services'], ['Laporan', '/owner/reports'], ['Langganan', '/owner/subscription'], ['Pengaturan', '/owner/settings'], ['Profil', '/owner/profile'],
    ],
  },
  technician: {
    label: 'Teknisi', name: 'Portal teknisi', description: 'Antrean, diagnosis, estimasi, dan perbaikan.',
    items: [['Beranda', '/technician'], ['Antrean servis', '/technician/queue'], ['Riwayat servis', '/technician/history'], ['Profil', '/technician/profile']],
  },
  customer: {
    label: 'Pelanggan', name: 'Portal pelanggan', description: 'Pengajuan, persetujuan, dan perkembangan servis.',
    items: [['Beranda', '/customer'], ['Pengajuan servis', '/customer/services/new'], ['Riwayat servis', '/customer/history'], ['Profil', '/customer/profile']],
  },
} as const;

export type PortalRole = keyof typeof portals;

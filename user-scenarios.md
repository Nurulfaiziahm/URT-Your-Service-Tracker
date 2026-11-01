# User Scenarios — URT

Dokumen ini menjelaskan skenario utama pengguna URT dari awal pengajuan servis sampai perangkat siap diambil. Skenario dibagi berdasarkan tiga peran: Owner (pemilik/pengelola tempat servis), Teknisi, dan Pelanggan.

## Peran dan tujuan

| Peran | Tujuan utama |
| --- | --- |
| Owner / Pengelola | Memantau operasional, tiket, pelanggan, teknisi, layanan, dan laporan tempat servis. |
| Teknisi | Menangani tiket yang ditugaskan, mencatat diagnosis dan estimasi, memperbaiki perangkat, lalu melakukan QC. |
| Pelanggan | Mengajukan servis, memahami biaya dan progres, lalu mengambil perangkat setelah servis selesai. |

## Skenario 1 — Owner mengelola permintaan servis

**Aktor:** Owner atau pengelola tempat servis

**Tujuan:** Memastikan permintaan pelanggan tercatat, ditangani teknisi, dan dapat dipantau sampai selesai.
**Prasyarat:** Owner sudah masuk ke portal dan bisnisnya aktif di URT.

### Alur utama

1. Owner membuka dashboard dan meninjau jumlah tiket aktif serta tiket yang memerlukan perhatian.
2. Pelanggan mengirim permintaan melalui tautan atau QR tempat servis. Permintaan muncul sebagai tiket baru; jika belum ada teknisi yang memenuhi syarat, tiket tetap menunggu penugasan.
3. Owner membuka detail tiket untuk memeriksa kontak pelanggan, keluhan, informasi perangkat, dan status penanganan.
4. Jika diperlukan, Owner memilih atau mengatur teknisi yang menangani tiket, lalu memantau antrean dan progresnya.
5. Owner memeriksa direktori pelanggan, katalog layanan dan tarif, atau laporan operasional sesuai kebutuhan.
6. Setelah teknisi menyelesaikan perbaikan dan QC, Owner melihat status siap diambil dan riwayat tiket pada portal.

### Alur alternatif

- **Tiket belum memiliki teknisi:** Owner atau staf menugaskan teknisi yang tersedia. Tiket tetap tercatat selama menunggu.
- **Pelanggan membawa perangkat langsung ke outlet:** Owner/staf mencatat penerimaan perangkat melalui alur operasional tempat servis sebelum pekerjaan dilanjutkan.
- **Tiket pelanggan tanpa akun perlu dihapus:** Owner hanya dapat menghapus tiket anonim yang memenuhi ketentuan aplikasi; tiket yang terhubung ke akun pelanggan tidak dapat dihapus melalui alur ini.

**Hasil:** Owner dapat melihat keadaan operasional dan riwayat tiket tanpa mengandalkan catatan terpisah.

## Skenario 2 — Teknisi mendiagnosis dan memperbaiki perangkat

**Aktor:** Teknisi

**Tujuan:** Menangani tiket penugasan dari pemeriksaan awal sampai perangkat lulus QC.
**Prasyarat:** Teknisi sudah masuk ke portal dan memiliki tiket yang ditugaskan.

### Alur utama

1. Teknisi membuka dashboard atau antrean untuk melihat tiket, prioritas, serta tenggat penanganan.
2. Teknisi memilih tiket dan memeriksa keluhan, informasi pelanggan, serta detail perangkat.
3. Teknisi menerima perangkat secara fisik sebelum memulai pemeriksaan.
4. Teknisi memeriksa perangkat dan mencatat diagnosis serta penjelasan yang dapat dibaca pelanggan.
5. Teknisi menyusun estimasi terperinci dari item katalog, tarif kesulitan, durasi perbaikan dan QC, serta target pengambilan.
6. Teknisi meninjau estimasi dan mengirimkannya untuk persetujuan pelanggan. Untuk menyampaikan pembaruan melalui WhatsApp, teknisi meninjau pesan yang disiapkan lalu mengirimkannya sendiri dari WhatsApp.
7. Setelah pelanggan menyetujui estimasi, teknisi melakukan perbaikan dan memperbarui progres tiket.
8. Teknisi menguji fungsi perangkat melalui QC. Jika lulus, teknisi menandai tiket siap diambil dan menyampaikan pemberitahuan pengambilan kepada pelanggan.

### Alur alternatif

- **Informasi permintaan kurang lengkap:** Teknisi mengklarifikasi informasi atau memeriksa perangkat saat serah terima sebelum menetapkan diagnosis.
- **Pelanggan menolak estimasi:** Teknisi tidak memulai perbaikan; keputusan penolakan tercatat pada tiket.
- **Pelanggan belum memberi keputusan:** Tiket tetap menunggu persetujuan dan perbaikan belum dimulai.
- **QC gagal:** Teknisi melanjutkan pemeriksaan/perbaikan dan mengulang QC sebelum menandai perangkat siap diambil.

**Hasil:** Diagnosis, estimasi, progres, dan hasil QC tersimpan dalam riwayat tiket.

## Skenario 3 — Pelanggan mengajukan dan melacak servis

**Aktor:** Pelanggan

**Tujuan:** Mengajukan perbaikan, menyetujui atau menolak estimasi, dan mengetahui kapan perangkat siap diambil.
**Prasyarat:** Pelanggan memiliki tautan/QR tempat servis atau tiket dan tautan pelacakan privat yang diterima setelah pengajuan.

### Alur utama

1. Pelanggan membuka tautan atau QR tempat servis dan mengisi kontak, kategori serta merek perangkat, dan keluhan. Akun tidak wajib untuk mengajukan permintaan.
2. Pelanggan meninjau konfirmasi pengajuan dan menyimpan kode serta tautan pelacakan yang diberikan.
3. Pelanggan menyerahkan perangkat ke tempat servis agar pemeriksaan fisik dapat dilakukan.
4. Setelah diagnosis dan estimasi tersedia, pelanggan membuka portal atau tautan persetujuan untuk membaca penjelasan kerusakan, rincian harga, durasi, dan target pengambilan.
5. Pelanggan memilih **Setujui** untuk mengizinkan perbaikan atau **Tolak** jika tidak ingin melanjutkan berdasarkan estimasi tersebut.
6. Jika disetujui, pelanggan menggunakan halaman pelacakan atau portal untuk melihat tahap servis.
7. Saat tiket berstatus siap diambil, pelanggan datang mengambil perangkat dan meninjau ringkasan servis serta garansi yang tersedia.

### Alur alternatif

- **Pelanggan menolak estimasi:** Perbaikan tidak dimulai berdasarkan estimasi tersebut. Pelanggan dapat menghubungi tempat servis untuk membicarakan langkah berikutnya.
- **Pelanggan belum memiliki akun:** Pelanggan tetap dapat mengajukan permintaan dan menggunakan tautan pelacakan privat; akun dapat dibuat kemudian untuk permintaan berikutnya.
- **Tautan pelacakan privat hilang:** Pelanggan menghubungi tempat servis untuk mendapatkan bantuan. Tautan tersebut bersifat privat dan tidak boleh dibagikan kepada orang lain.
- **Estimasi berubah:** Persetujuan pada estimasi lama tidak berlaku untuk estimasi versi baru; pelanggan meninjau dan memutuskan kembali.

**Hasil:** Pelanggan mengetahui keputusan biaya yang diminta, progres perbaikan, dan status pengambilan perangkat.

## Alur lintas peran

`Pelanggan mengajukan servis → Owner memantau atau mengatur penugasan → Teknisi memeriksa dan mengirim estimasi → Pelanggan menyetujui/menolak → Teknisi memperbaiki dan melakukan QC → Pelanggan mengambil perangkat.`

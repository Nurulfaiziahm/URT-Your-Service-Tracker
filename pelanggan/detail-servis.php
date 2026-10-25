<?php
// Letakkan di baris paling atas detail-servis.php
session_start();
require_once '../koneksi.php'; // Sesuaikan path jika koneksi.php ada di folder luar (root)

// Pastikan yang mengakses adalah pelanggan yang sudah login
if (!isset($_SESSION['id_user']) || $_SESSION['role'] !== 'pelanggan') {
    header("Location: ../masuk.php");
    exit;
}

$id_pelanggan = $_SESSION['id_user'];
// Ambil ID tiket dari URL, misalnya: detail-servis.php?id=1
$id_tiket = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT) ?: 0;
if (!$id_tiket) { http_response_code(400); exit('ID tiket tidak valid. <a href="beranda-pelanggan.php">Kembali</a>'); }

// Query mengambil data tiket, digabung (JOIN) dengan tabel layanan dan users (teknisi)
$sql = "SELECT t.*, 
               l.nama_layanan, 
               p.nama AS nama_pelanggan, p.no_telp AS telp_pelanggan,
               tk.nama AS nama_teknisi 
        FROM tiket_servis t
        JOIN layanan l ON t.id_layanan = l.id_layanan
        JOIN users p ON t.id_pelanggan = p.id_user
        LEFT JOIN users tk ON t.id_teknisi = tk.id_user
        WHERE t.id_tiket = $id_tiket AND t.id_pelanggan = $id_pelanggan";
        
$result = $conn->query($sql);

// Jika tiket tidak ada atau bukan milik pelanggan ini
if ($result->num_rows === 0) {
    die("<div style='padding: 20px; font-family: sans-serif;'>Tiket tidak ditemukan atau Anda tidak memiliki akses. <a href='beranda-pelanggan.php'>Kembali</a></div>");
}

$tiket = $result->fetch_assoc();

// Format inisial untuk avatar pelanggan
$inisial = strtoupper(substr($_SESSION['nama'], 0, 2));

// Penyesuaian label dan warna badge berdasarkan status dari database
$status_map = [
    'MASUK' => ['label' => 'Menunggu', 'class' => 'status-pill--neutral'],
    'DIAGNOSIS' => ['label' => 'Diestimasi', 'class' => 'status-pill--info'],
    'PERSETUJUAN' => ['label' => 'Menunggu Persetujuan', 'class' => 'status-pill--warning'],
    'DITOLAK' => ['label' => 'Ditolak', 'class' => 'status-pill--danger'],
    'PERBAIKAN' => ['label' => 'Dalam Perbaikan', 'class' => 'status-pill--active'],
    'QC' => ['label' => 'Pemeriksaan Akhir', 'class' => 'status-pill--active'],
    'SELESAI' => ['label' => 'Selesai', 'class' => 'status-pill--success']
];

$status_badge = $status_map[$tiket['status']] ?? ['label' => 'Unknown', 'class' => 'status-pill--neutral'];
?>
<!doctype html>
<html lang="id">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Detail Servis — URT Your Service Tracker</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
      rel="stylesheet"
    />
    <link rel="stylesheet" href="style-customer.css" />
    <!-- Hapus atribut defer script statis jika tidak lagi dibutuhkan -->
    <script src="js/customer.js" defer></script>
  </head>
  <body>
    <!-- SIDEBAR -->
    <aside class="sidebar">
      <div class="sidebar-header">
        <a href="beranda-pelanggan.php">
          <img src="../image/logo-urt.svg" alt="URT Your Service Tracker" height="38" />
        </a>
        <p>PORTAL PELANGGAN</p>
      </div>
      <nav class="nav-menu">
        <a href="beranda-pelanggan.php" class="nav-item">
          <svg aria-hidden="true" viewBox="0 0 24 24">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
          <span>Beranda</span>
        </a>
        <a href="riwayat-servis.php" class="nav-item active">
          <svg aria-hidden="true" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <span>Riwayat Servis</span>
        </a>
        <a href="profil-pelanggan.php" class="nav-item">
          <svg aria-hidden="true" viewBox="0 0 24 24">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          <span>Profil</span>
        </a>
        <a href="../masuk.php" class="nav-item nav-item--logout" title="Keluar dari portal">
          <svg aria-hidden="true" viewBox="0 0 24 24">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          <span>Keluar</span>
        </a>
      </nav>
      <div class="sidebar-footer">
        <div class="avatar"><?= $inisial ?></div>
        <div class="user-info">
          <p><?= htmlspecialchars($_SESSION['nama']) ?></p>
          <span>Pelanggan</span>
        </div>
      </div>
    </aside>

    <!-- MAIN WRAPPER -->
    <div class="main-wrapper">
      <header class="top-header">
        <div>
          <span class="badge-pelanggan">PELANGGAN</span>
          <span class="online-label">Sistem Online</span>
        </div>
        <div class="header-right">
          <span class="avatar avatar-outline"><?= $inisial ?></span>
        </div>
      </header>

      <main class="content">
        <div class="page-header">
          <div>
            <span class="page-title">PORTAL PELANGGAN</span>
            <h1>Detail Tiket Servis</h1>
            <p class="subtitle">
              Informasi lengkap spesifikasi perangkat, keluhan, hasil pemeriksaan, dan status tiket servis.
            </p>
          </div>
          <div style="display: flex; gap: 10px;">
            <a class="btn-secondary" href="beranda-pelanggan.php">&larr; Beranda</a>
            <a class="btn-secondary" href="riwayat-servis.php">Daftar Riwayat</a>
          </div>
        </div>

        <div class="detail-grid">
          <!-- LEFT: TICKET INFO & SPECIFICATIONS -->
          <div class="card">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid #e2e8f0; padding-bottom: 16px; margin-bottom: 20px;">
              <div>
                <span class="eyebrow">NO. TIKET SERVIS</span>
                <h2 style="font-size: 22px; margin: 4px 0;">#URT-<?= htmlspecialchars($tiket['id_tiket']) ?></h2>
                <strong style="color: var(--primary-blue);"><?= htmlspecialchars($tiket['nama_layanan']) ?></strong>
              </div>
              <span class="status-pill <?= $status_badge['class'] ?>">
                <?= $status_badge['label'] ?>
              </span>
            </div>

            <table class="kv-table">
              <tbody>
                <tr>
                  <td>Pemilik Perangkat</td>
                  <td><?= htmlspecialchars($tiket['nama_pelanggan']) ?> (<?= htmlspecialchars($tiket['telp_pelanggan']) ?>)</td>
                </tr>
                <tr>
                  <td>Tanggal Masuk Servis</td>
                  <td><?= date('j M Y, H:i', strtotime($tiket['created_at'])) ?> WIB</td>
                </tr>
                <tr>
                  <td>Keluhan Awal</td>
                  <td><?= nl2br(htmlspecialchars($tiket['keluhan'])) ?></td>
                </tr>
                <tr>
                  <td>Temuan Diagnosis Teknisi</td>
                  <td>
                    <?php if (!empty($tiket['catatan_teknisi'])): ?>
                      <?= nl2br(htmlspecialchars($tiket['catatan_teknisi'])) ?>
                    <?php else: ?>
                      <span style="color: #94a3b8; font-style: italic;">Belum ada catatan dari teknisi (masih dalam antrean)</span>
                    <?php endif; ?>
                  </td>
                </tr>
                <tr>
                  <td>Teknisi Penanggung Jawab</td>
                  <td><?= htmlspecialchars($tiket['nama_teknisi'] ?? 'Belum ditugaskan') ?></td>
                </tr>
                <tr>
                  <td>Terkahir Diperbarui</td>
                  <td><?= date('j M Y, H:i', strtotime($tiket['updated_at'])) ?> WIB</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- RIGHT: ACTION & COST STATUS -->
          <div class="side-stack">
            <div class="card">
              <h3 style="font-size: 16px; margin-bottom: 12px;">Status Pengerjaan</h3>
              
              <?php if ($tiket['status'] === 'PERSETUJUAN'): ?>
                  <p style="font-size: 14px; color: var(--text-muted); line-height: 1.5; margin-bottom: 16px;">
                    Saat ini pengerjaan sedang ditahan menunggu konfirmasi persetujuan biaya dari Anda.
                  </p>
                  
                  <div class="cost-summary-card">
                    <span style="font-size: 12px; color: var(--text-muted); text-transform: uppercase; font-weight: 600;">Estimasi Biaya Servis</span>
                    <div style="font-size: 24px; font-weight: 800; color: #2563eb; margin: 4px 0 8px;">
                      Rp <?= number_format($tiket['biaya_estimasi'], 0, ',', '.') ?>
                    </div>
                  </div>

                  <div style="margin-top: 20px; display: flex; flex-direction: column; gap: 10px;">
                    <!-- Akan mengirim ID tiket ke proses persetujuan -->
                    <a href="proses-persetujuan.php?id=<?= $tiket['id_tiket'] ?>&aksi=setuju" class="btn-primary" style="text-align: center; text-decoration: none;" onclick="return confirm('Apakah Anda yakin menyetujui biaya servis ini?');">
                      Beri Persetujuan Biaya &rarr;
                    </a>
                    <a href="proses-persetujuan.php?id=<?= $tiket['id_tiket'] ?>&aksi=tolak" class="btn-danger" style="text-align: center; text-decoration: none;" onclick="return confirm('Yakin ingin membatalkan/menolak perbaikan ini?');">
                      Batalkan / Tolak Servis
                    </a>
                  </div>
              <?php elseif ($tiket['status'] === 'SELESAI'): ?>
                  <p style="font-size: 14px; color: var(--text-muted); line-height: 1.5; margin-bottom: 16px;">
                    Perbaikan telah selesai. Silakan lakukan pengambilan perangkat di tempat servis.
                  </p>
                  <div class="cost-summary-card">
                    <span style="font-size: 12px; color: var(--text-muted); text-transform: uppercase; font-weight: 600;">Biaya Akhir</span>
                    <div style="font-size: 24px; font-weight: 800; color: #16a34a; margin: 4px 0 8px;">
                      Rp <?= number_format($tiket['biaya_akhir'] ?? $tiket['biaya_estimasi'], 0, ',', '.') ?>
                    </div>
                  </div>
              <?php else: ?>
                  <p style="font-size: 14px; color: var(--text-muted); line-height: 1.5; margin-bottom: 16px;">
                    Tiket sedang dalam tahap <strong><?= $status_badge['label'] ?></strong>. Teknisi kami akan terus memberikan pembaruan status ke sistem.
                  </p>
                  <?php if (!empty($tiket['biaya_estimasi'])): ?>
                      <div class="cost-summary-card">
                        <span style="font-size: 12px; color: var(--text-muted); text-transform: uppercase; font-weight: 600;">Estimasi/Biaya Servis</span>
                        <div style="font-size: 24px; font-weight: 800; color: #2563eb; margin: 4px 0 8px;">
                          Rp <?= number_format($tiket['biaya_estimasi'], 0, ',', '.') ?>
                        </div>
                      </div>
                  <?php endif; ?>
              <?php endif; ?>

            </div>

            <div class="card" style="margin-top: 20px;">
              <h3 style="font-size: 15px; margin-bottom: 8px;">Butuh Bantuan?</h3>
              <p style="font-size: 13px; color: var(--text-muted); line-height: 1.5; margin-bottom: 12px;">
                Hubungi counter tempat servis jika Anda memiliki pertanyaan khusus seputar pengerjaan unit Anda.
              </p>
              <a
                href="https://web.whatsapp.com"
                target="_blank"
                rel="noopener noreferrer"
                class="btn-secondary"
                style="text-align: center; text-decoration: none; display: block;"
              >
                Chat WhatsApp Admin
              </a>
            </div>
          </div>
        </div>
      </main>

      <footer class="site-footer">
        URT &mdash; Your Service Tracker <span>Kelompok 2 UT</span>
      </footer>
    </div>
  </body>
</html>

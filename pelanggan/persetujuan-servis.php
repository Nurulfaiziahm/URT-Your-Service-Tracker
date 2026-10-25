<?php
// Letakkan di baris paling atas persetujuan-servis.php
session_start();
require_once '../koneksi.php';

// Pastikan yang mengakses adalah pelanggan
if (!isset($_SESSION['id_user']) || $_SESSION['role'] !== 'pelanggan') {
    header("Location: ../masuk.php");
    exit;
}

$id_pelanggan = $_SESSION['id_user'];
$id_tiket = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT) ?: 0;
if (!$id_tiket) { http_response_code(400); exit('ID tiket tidak valid. <a href="beranda-pelanggan.php">Kembali</a>'); }

// Ambil detail tiket, pastikan milik pelanggan yang sedang login dan status 'PERSETUJUAN'
$sql = "SELECT t.*, 
               p.nama AS nama_pelanggan, p.no_telp AS telp_pelanggan,
               tk.nama AS nama_teknisi,
               l.nama_layanan
        FROM tiket_servis t
        JOIN users p ON t.id_pelanggan = p.id_user
        LEFT JOIN users tk ON t.id_teknisi = tk.id_user
        JOIN layanan l ON t.id_layanan = l.id_layanan
        WHERE t.id_tiket = ? AND t.id_pelanggan = ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param('ii', $id_tiket, $id_pelanggan);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    die("<div style='padding: 20px;'>Tiket tidak ditemukan atau akses ditolak. <a href='beranda-pelanggan.php'>Kembali</a></div>");
}

$tiket = $result->fetch_assoc();
$inisial = strtoupper(substr($_SESSION['nama'], 0, 2));

// Keamanan ekstra: Jika tiket tidak berstatus menunggu persetujuan, tolak askes
if ($tiket['status'] !== 'PERSETUJUAN') {
    header("Location: detail-servis.php?id=$id_tiket");
    exit;
}

// Format pemisahan Model/Merek dengan keluhan
$keluhan_raw = $tiket['keluhan'];
$model_perangkat = "Perangkat Tidak Diketahui";
$keluhan_bersih = $keluhan_raw;

if (strpos($keluhan_raw, "Perangkat:") !== false) {
    $parts = explode("\nDetail Keluhan: ", $keluhan_raw);
    $model_perangkat = str_replace("Perangkat: ", "", $parts[0]);
    $keluhan_bersih = $parts[1] ?? "-";
}
?>
<!doctype html>
<html lang="id">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Persetujuan Biaya Servis — URT</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
      rel="stylesheet"
    />
    <link rel="stylesheet" href="style-customer.css" />
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
            <h1>Persetujuan Estimasi Biaya</h1>
            <p class="subtitle">
              Tinjau hasil diagnosis teknisi dan beri konfirmasi persetujuan agar perbaikan dapat segera dikerjakan.
            </p>
          </div>
          <a class="btn-secondary" href="detail-servis.php?id=<?= $tiket['id_tiket'] ?>">
            &larr; Kembali ke Detail Tiket
          </a>
        </div>

        <div class="card">
          <div class="section-heading">
            <div>
              <span class="eyebrow">DETAIL TIKET SERVIS</span>
              <h2>#URT-<?= $tiket['id_tiket'] ?></h2>
              <p class="subtitle"><?= htmlspecialchars($model_perangkat) ?> &bull; <?= htmlspecialchars($tiket['nama_pelanggan']) ?></p>
            </div>
            <span class="status-pill warning">Menunggu Persetujuan</span>
          </div>

          <div class="info-list">
            <div><span>Nama Pelanggan</span><strong><?= htmlspecialchars($tiket['nama_pelanggan']) ?></strong></div>
            <div><span>Nomor Telepon</span><strong><?= htmlspecialchars($tiket['telp_pelanggan']) ?></strong></div>
            <div><span>Perangkat</span><strong><?= htmlspecialchars($model_perangkat) ?></strong></div>
            <div><span>Keluhan Awal</span><strong><?= htmlspecialchars(substr($keluhan_bersih, 0, 70)) ?>...</strong></div>
            <div><span>Teknisi Penanggung Jawab</span><strong><?= htmlspecialchars($tiket['nama_teknisi'] ?? 'Belum Ditugaskan') ?></strong></div>
          </div>

          <div class="subsection">
            <h3>Temuan Diagnosis &amp; Rekomendasi Teknisi</h3>
            <p>
              <?= nl2br(htmlspecialchars($tiket['catatan_teknisi'] ?? 'Tidak ada catatan tambahan dari teknisi.')) ?>
            </p>
          </div>

          <div class="subsection">
            <h3>Rincian Item &amp; Biaya Servis</h3>
            <table class="cost-table">
              <thead>
                <tr>
                  <th>Deskripsi Tindakan / Layanan Utama</th>
                  <th class="text-right">Biaya Estimasi</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><?= htmlspecialchars($tiket['nama_layanan']) ?></td>
                  <td class="text-right">Rp <?= number_format($tiket['biaya_estimasi'], 0, ',', '.') ?></td>
                </tr>
                <tr class="total-row">
                  <td>Total Estimasi Biaya Servis</td>
                  <td class="text-right" style="color: #2563eb;">Rp <?= number_format($tiket['biaya_estimasi'], 0, ',', '.') ?></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <section class="card action-card">
          <span class="eyebrow">PERSETUJUAN BIAYA</span>
          <h2>Konfirmasi Keputusan Pengerjaan</h2>
          <p>
            Apakah Anda menyetujui biaya estimasi perbaikan sebesar
            <strong>Rp <?= number_format($tiket['biaya_estimasi'], 0, ',', '.') ?></strong>?
          </p>
          <div class="button-row">
            <!-- Asumsi Anda membuat proses-persetujuan.php untuk menangani logika setuju/tolak di database -->
            <a class="btn-primary" href="proses-persetujuan.php?id=<?= $tiket['id_tiket'] ?>&aksi=setuju" onclick="return confirm('Anda yakin setuju untuk melanjutkan pengerjaan?');">
              ✓ Setujui Perbaikan (Rp <?= number_format($tiket['biaya_estimasi'], 0, ',', '.') ?>)
            </a>
            <a class="btn-danger" href="proses-persetujuan.php?id=<?= $tiket['id_tiket'] ?>&aksi=tolak" onclick="return confirm('Apakah Anda yakin menolak dan membatalkan perbaikan ini?');">
              ✕ Tolak Perbaikan
            </a>
          </div>
        </section>
      </main>

      <footer class="site-footer">
        URT &mdash; Your Service Tracker <span>Kelompok 2 UT</span>
      </footer>
    </div>
  </body>
</html>

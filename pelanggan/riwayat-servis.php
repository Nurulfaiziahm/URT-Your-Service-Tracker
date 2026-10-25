<?php
session_start();
require_once '../koneksi.php';

// Proteksi halaman: Pastikan yang mengakses adalah pelanggan
if (!isset($_SESSION['role']) || $_SESSION['role'] !== 'pelanggan') {
    header("Location: ../masuk.php");
    exit;
}

$id_pelanggan = $_SESSION['id_user'];
$nama_pelanggan = $_SESSION['nama'];

// Membuat inisial nama
$words = explode(" ", $nama_pelanggan);
$inisial = strtoupper(substr($words[0], 0, 1) . (isset($words[1]) ? substr($words[1], 0, 1) : ''));

// 1. Ambil Statistik Riwayat
$sql_stats = "SELECT 
    COUNT(id_tiket) as total_selesai,
    SUM(biaya_estimasi) as total_biaya
    FROM tiket_servis 
    WHERE id_pelanggan = '$id_pelanggan' AND status = 'SELESAI'";
$stats = $conn->query($sql_stats)->fetch_assoc();

$total_selesai = $stats['total_selesai'] ?? 0;
$total_biaya = $stats['total_biaya'] ?? 0;

// Format total biaya agar ringkas (Misal: Rp1,6 jt)
function formatRingkas($angka) {
    if ($angka >= 1000000) return 'Rp' . round($angka / 1000000, 1) . ' jt';
    if ($angka >= 1000) return 'Rp' . round($angka / 1000, 0) . ' rb';
    return 'Rp' . number_format($angka, 0, ',', '.');
}
$biaya_ringkas = formatRingkas($total_biaya);

// 2. Ambil Daftar Riwayat (Status: Selesai atau Ditolak)
$sql_list = "SELECT t.*, l.nama_layanan 
             FROM tiket_servis t 
             LEFT JOIN layanan l ON t.id_layanan = l.id_layanan 
             WHERE t.id_pelanggan = '$id_pelanggan' AND t.status IN ('SELESAI', 'DITOLAK') 
             ORDER BY t.created_at DESC";
$q_list = $conn->query($sql_list);
$total_riwayat_semua = $q_list->num_rows;
?>
<!doctype html>
<html lang="id">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Riwayat Servis - URT</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
      rel="stylesheet"
    />
    <link rel="stylesheet" href="style-customer.css" />
    <script src="../js/script.js" defer></script>
    <script src="js/customer.js" defer></script>
  </head>
  <body>
    <!-- SIDEBAR -->
    <aside class="sidebar">
      <div class="sidebar-header">
        <a href="beranda-pelanggan.php">
          <img
            src="../image/logo-urt.svg"
            alt="URT Your Service Tracker"
            height="38"
          />
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
        <a href="../masuk.php?logout=true" class="nav-item nav-item--logout" title="Keluar dari portal">
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
          <p><?= htmlspecialchars($nama_pelanggan) ?></p>
          <span>Pelanggan</span>
        </div>
      </div>
    </aside>

    <div class="main-wrapper">
      <header class="top-header">
        <div>
          <span class="badge-pelanggan">PELANGGAN</span
          ><span class="online-label">Sistem Online</span>
        </div>
        <div class="header-right">
          <span class="avatar avatar-outline"><?= $inisial ?></span>
        </div>
      </header>
      <main class="content">
        <div class="page-header">
          <div>
            <span class="page-title">PORTAL PELANGGAN</span>
            <h1>Riwayat Servis</h1>
            <p class="subtitle">
              Pantau dan lihat kembali servis perangkat yang telah selesai.
            </p>
          </div>
          <a class="btn-primary" href="pengajuan-servis.php">+ Ajukan Servis</a>
        </div>
        
        <div class="stats-grid history-stats">
          <div class="stat-card">
            <div class="stat-title">Total Servis Selesai</div>
            <div class="stat-value border-green"><?= $total_selesai ?></div>
          </div>
          <div class="stat-card">
            <div class="stat-title">Total Biaya Tercatat</div>
            <div class="stat-value border-blue"><?= $biaya_ringkas ?></div>
          </div>
          <div class="stat-card">
            <div class="stat-title">Total Riwayat</div>
            <div class="stat-value border-orange"><?= $total_riwayat_semua ?></div>
          </div>
        </div>

        <section class="card">
          <div class="section-heading">
            <div>
              <h2>Daftar Riwayat Servis</h2>
              <p class="subtitle">Seluruh tiket servis yang telah selesai atau dibatalkan.</p>
            </div>
            <span class="status-pill success"><?= $total_selesai ?> Selesai</span>
          </div>
          <div class="table-wrapper">
            <table class="history-table">
              <thead>
                <tr>
                  <th>Nomor Tiket &amp; Perangkat</th>
                  <th>Jenis Servis</th>
                  <th>Tanggal Masuk</th>
                  <th>Total Biaya</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                <?php if($total_riwayat_semua > 0): ?>
                  <?php while($row = $q_list->fetch_assoc()): ?>
                  <tr>
                    <td>
                      <strong>#URT-<?= htmlspecialchars($row['id_tiket']) ?></strong>
                      <span class="table-subtext"><?= htmlspecialchars(substr($row['keluhan'], 0, 25)) ?>...</span>
                    </td>
                    <td><?= htmlspecialchars($row['nama_layanan'] ?? 'Servis Perangkat') ?></td>
                    <td><?= date('d M Y', strtotime($row['created_at'])) ?></td>
                    <td class="price-cell">
                        <?= $row['biaya_estimasi'] ? 'Rp' . number_format($row['biaya_estimasi'], 0, ',', '.') : '-' ?>
                    </td>
                    <td>
                      <?php if($row['status'] == 'SELESAI'): ?>
                        <span class="status-pill success">Selesai</span>
                      <?php else: ?>
                        <span class="status-pill" style="color: #dc2626; background: #fee2e2; border-color: #fecaca;">Ditolak</span>
                      <?php endif; ?>
                    </td>
                    <td>
                      <a class="table-link" href="detail-servis.php?id=<?= $row['id_tiket'] ?>">Detail →</a>
                    </td>
                  </tr>
                  <?php endwhile; ?>
                <?php else: ?>
                  <tr>
                    <td colspan="6" style="text-align: center; padding: 20px; color: #64748b;">
                      Belum ada riwayat servis.
                    </td>
                  </tr>
                <?php endif; ?>
              </tbody>
            </table>
          </div>
        </section>
      </main>
      <footer class="site-footer">
        URT — Your Service Tracker <span>Kelompok 2</span>
      </footer>
    </div>
  </body>
</html>
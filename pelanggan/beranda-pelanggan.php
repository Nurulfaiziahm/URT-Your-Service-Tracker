<?php
// Letakkan di baris paling atas beranda-pelanggan.php
session_start();
require_once '../koneksi.php';

// Proteksi halaman: Pastikan yang mengakses adalah pelanggan
if (!isset($_SESSION['role']) || $_SESSION['role'] !== 'pelanggan') {
    header("Location: ../masuk.php");
    exit;
}

$id_pelanggan = $_SESSION['id_user'];
$nama_pelanggan = $_SESSION['nama'];

// Membuat inisial nama (Contoh: Nino Rachimas -> NR)
$words = explode(" ", $nama_pelanggan);
$inisial = strtoupper(substr($words[0], 0, 1) . (isset($words[1]) ? substr($words[1], 0, 1) : ''));

// 1. Ambil Statistik Servis Pelanggan
$sql_stats = "SELECT 
    SUM(CASE WHEN status NOT IN ('SELESAI', 'DITOLAK') THEN 1 ELSE 0 END) as servis_aktif,
    SUM(CASE WHEN status = 'SELESAI' THEN 1 ELSE 0 END) as servis_selesai,
    COUNT(*) as total_riwayat
    FROM tiket_servis WHERE id_pelanggan = '$id_pelanggan'";
$stats = $conn->query($sql_stats)->fetch_assoc();

// 2. Ambil 1 Tiket Aktif Terbaru
$sql_aktif = "SELECT t.*, l.nama_layanan, u.nama as nama_teknisi 
              FROM tiket_servis t 
              LEFT JOIN layanan l ON t.id_layanan = l.id_layanan
              LEFT JOIN users u ON t.id_teknisi = u.id_user
              WHERE t.id_pelanggan = '$id_pelanggan' AND t.status NOT IN ('SELESAI', 'DITOLAK') 
              ORDER BY t.created_at DESC LIMIT 1";
$tiket_aktif = $conn->query($sql_aktif)->fetch_assoc();

// 3. Ambil Riwayat Servis (Selesai/Ditolak)
$sql_riwayat = "SELECT t.*, l.nama_layanan 
                FROM tiket_servis t 
                LEFT JOIN layanan l ON t.id_layanan = l.id_layanan
                WHERE t.id_pelanggan = '$id_pelanggan' AND t.status IN ('SELESAI', 'DITOLAK') 
                ORDER BY t.created_at DESC LIMIT 5";
$q_riwayat = $conn->query($sql_riwayat);
?>
<!doctype html>
<html lang="id">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Portal Pelanggan - URT</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap"
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
        <button
          type="button"
          class="sidebar-toggle"
          id="customerSidebarToggle"
          aria-label="Menu navigasi"
          aria-expanded="false"
        >
          <svg class="icon-hamburger" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          <svg class="icon-close" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <nav class="nav-menu">
        <a href="beranda-pelanggan.php" class="nav-item active">
          <svg aria-hidden="true" viewBox="0 0 24 24">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
          <span>Beranda</span>
        </a>
        <a href="riwayat-servis.php" class="nav-item">
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
        <a href="../index.php" class="nav-item nav-item--logout" title="Keluar dari portal">
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

    <!-- MAIN DASHBOARD CONTENT -->
    <main class="main-wrapper dashboard-main-area">
      <!-- TOPBAR -->
      <header class="topbar-header">
        <div class="topbar-left">
          <span class="badge-role-blue">PELANGGAN</span>
          <span class="status-online-text">Sistem Online</span>
        </div>
        <div class="topbar-right">
          <button type="button" class="btn-icon-circle" aria-label="Buka notifikasi" onclick="alert('Tidak ada notifikasi baru.')">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"></path>
              <path d="M10 21h4"></path>
            </svg>
          </button>
          <div class="user-avatar-circle" aria-label="<?= htmlspecialchars($nama_pelanggan) ?>"><?= $inisial ?></div>
        </div>
      </header>

      <!-- CONTENT BODY -->
      <div class="dashboard-container">
        <!-- HEADING -->
        <div class="heading-row">
          <div>
            <div class="eyebrow-blue">PORTAL PELANGGAN</div>
            <h1 class="page-title">Halo, <?= htmlspecialchars($nama_pelanggan) ?></h1>
            <p class="page-subtitle">Ajukan servis, cek tiket, dan pantau proses perbaikan perangkatmu.</p>
          </div>
          <a href="pengajuan-servis.php" class="btn-primary-action">
            + Ajukan Servis
          </a>
        </div>

        <!-- 3 STAT CARDS -->
        <div class="stats-cards-grid">
          <div class="stat-box">
            <div class="stat-box-header">
              <span class="stat-box-title">Servis Aktif</span>
              <div class="stat-icon-wrap stat-icon-blue">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
                </svg>
              </div>
            </div>
            <div class="stat-box-value-row">
              <span class="stat-accent-bar bar-blue"></span>
              <span class="stat-big-number"><?= $stats['servis_aktif'] ?? 0 ?></span>
            </div>
          </div>

          <div class="stat-box">
            <div class="stat-box-header">
              <span class="stat-box-title">Servis Selesai</span>
              <div class="stat-icon-wrap stat-icon-green">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
              </div>
            </div>
            <div class="stat-box-value-row">
              <span class="stat-accent-bar bar-green"></span>
              <span class="stat-big-number"><?= $stats['servis_selesai'] ?? 0 ?></span>
            </div>
          </div>

          <div class="stat-box">
            <div class="stat-box-header">
              <span class="stat-box-title">Riwayat Servis</span>
              <div class="stat-icon-wrap stat-icon-orange">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
              </div>
            </div>
            <div class="stat-box-value-row">
              <span class="stat-accent-bar bar-orange"></span>
              <span class="stat-big-number"><?= $stats['total_riwayat'] ?? 0 ?></span>
            </div>
          </div>
        </div>

        <?php if($tiket_aktif): ?>
        <!-- MIDDLE 2-COLUMN SECTION -->
        <div class="middle-columns-grid">
          <!-- LEFT CARD: TIKET AKTIF -->
          <section class="content-card">
            <div class="ticket-card-top">
              <div>
                <div class="ticket-tag-label">TIKET AKTIF</div>
                <h2 class="ticket-id-title">#URT-<?= htmlspecialchars($tiket_aktif['id_tiket']) ?></h2>
              </div>
              <?php 
                $status_label = ucwords(str_replace('_', ' ', $tiket_aktif['status']));
                $badge_color = ($tiket_aktif['status'] == 'PERSETUJUAN') ? 'orange' : 'blue';
              ?>
              <span class="badge-status-<?= $badge_color ?>-pill"><?= $status_label ?></span>
            </div>

            <div class="device-preview-box">
              <div class="device-icon-box">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                  <line x1="2" y1="20" x2="22" y2="20"></line>
                </svg>
              </div>
              <div>
                <div class="device-name-text"><?= htmlspecialchars($tiket_aktif['nama_layanan']) ?></div>
                <p class="device-complaint-text">&ldquo;<?= htmlspecialchars($tiket_aktif['keluhan']) ?>&rdquo;</p>
              </div>
            </div>

            <!-- Segmented Progress Stepper -->
            <div class="stepper-section">
              <div class="stepper-label-heading">Tahapan Servis</div>
              <?php
                // Logika pewarnaan progres bar berdasarkan status database
                $s = $tiket_aktif['status'];
                $step1 = $step2 = $step3 = $step4 = $step5 = 'seg-gray';
                
                if (in_array($s, ['MASUK', 'DIAGNOSIS', 'PERSETUJUAN', 'PERBAIKAN', 'QC', 'SELESAI'], true)) $step1 = 'seg-green';
                if (in_array($s, ['DIAGNOSIS', 'PERSETUJUAN', 'PERBAIKAN', 'QC', 'SELESAI'], true)) $step2 = 'seg-green';
                if (in_array($s, ['PERSETUJUAN'])) $step3 = 'seg-orange'; // Butuh aksi
                elseif (in_array($s, ['PERBAIKAN', 'QC', 'SELESAI'], true)) $step3 = 'seg-green';
                if (in_array($s, ['PERBAIKAN', 'QC', 'SELESAI'], true)) $step4 = 'seg-green';
                if ($s == 'SELESAI') $step5 = 'seg-green';
              ?>
              <div class="segmented-progress-bar">
                <div class="progress-segment <?= $step1 ?>"></div>
                <div class="progress-segment <?= $step2 ?>"></div>
                <div class="progress-segment <?= $step3 ?>"></div>
                <div class="progress-segment <?= $step4 ?>"></div>
                <div class="progress-segment <?= $step5 ?>"></div>
              </div>
              <div class="stepper-stages-labels">
                <span class="stage-step-label <?= $step1 != 'seg-gray' ? 'is-active' : '' ?>">Diterima</span>
                <span class="stage-step-label <?= $step2 != 'seg-gray' ? 'is-active' : '' ?>">Diagnosa</span>
                <span class="stage-step-label <?= $step3 != 'seg-gray' ? 'is-active' : '' ?>">Persetujuan</span>
                <span class="stage-step-label <?= $step4 != 'seg-gray' ? 'is-active' : '' ?>">Perbaikan</span>
                <span class="stage-step-label <?= $step5 != 'seg-gray' ? 'is-active' : '' ?>">Selesai</span>
              </div>
            </div>

            <!-- Meta Box -->
            <div class="ticket-meta-info-strip">
              <div class="meta-info-item">
                <span class="meta-info-tag">TGL. MASUK</span>
                <span class="meta-info-data"><?= date('d M Y', strtotime($tiket_aktif['created_at'])) ?></span>
              </div>
              <div class="meta-info-item">
                <span class="meta-info-tag">TEKNISI</span>
                <span class="meta-info-data"><?= htmlspecialchars($tiket_aktif['nama_teknisi'] ?? 'Belum Ditentukan') ?></span>
              </div>
              <div class="meta-info-item">
                <span class="meta-info-tag">BIAYA SERVIS</span>
                <span class="meta-info-data meta-price-val">
                    <?= $tiket_aktif['biaya_estimasi'] ? 'Rp' . number_format($tiket_aktif['biaya_estimasi'], 0, ',', '.') : 'Menunggu' ?>
                </span>
              </div>
            </div>

            <?php if($tiket_aktif['status'] == 'PERSETUJUAN'): ?>
              <a href="persetujuan-servis.php?id=<?= $tiket_aktif['id_tiket'] ?>" class="btn-primary-action" style="display:block; text-align:center; margin-top: 15px;">
                Tinjau & Setujui Biaya
              </a>
            <?php else: ?>
              <a href="detail-servis.php?id=<?= $tiket_aktif['id_tiket'] ?>" class="btn-view-detail-service">
                Lihat Detail Service
              </a>
            <?php endif; ?>
          </section>

          <!-- RIGHT CARD: PERJALANAN SERVIS (TIMELINE) -->
          <section class="content-card">
            <h2 class="timeline-card-heading">Pembaruan Terakhir</h2>
            <div class="timeline-flow">
              <div class="timeline-step">
                <div class="timeline-circle circle-blue"></div>
                <div class="timeline-step-body">
                  <div class="timeline-step-header">
                    <span class="timeline-step-title">Status: <?= $status_label ?></span>
                    <span class="timeline-step-time"><?= date('H:i', strtotime($tiket_aktif['updated_at'])) ?></span>
                  </div>
                  <p class="timeline-step-desc">
                    <?= htmlspecialchars($tiket_aktif['catatan_teknisi'] ?? 'Perangkat Anda sedang dalam pantauan sistem.') ?>
                  </p>
                </div>
              </div>
              
              <div class="timeline-step">
                <div class="timeline-circle circle-gray"></div>
                <div class="timeline-step-body">
                  <div class="timeline-step-header">
                    <span class="timeline-step-title">Tiket Dibuat</span>
                    <span class="timeline-step-time"><?= date('d M', strtotime($tiket_aktif['created_at'])) ?></span>
                  </div>
                  <p class="timeline-step-desc">
                    Pengajuan servis berhasil masuk ke sistem URT.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>
        <?php endif; ?>

        <!-- BOTTOM CARD: SERVIS SEBELUMNYA -->
        <section class="content-card">
          <h2 class="prev-service-card-title">Servis Sebelumnya</h2>
          <div class="table-responsive-wrapper">
            <table class="clean-table">
              <thead>
                <tr>
                  <th>NOMOR TIKET</th>
                  <th>JENIS SERVIS</th>
                  <th>KELUHAN AWAL</th>
                  <th>TANGGAL MASUK</th>
                  <th>STATUS</th>
                </tr>
              </thead>
              <tbody>
                <?php if($q_riwayat->num_rows > 0): ?>
                  <?php while($row = $q_riwayat->fetch_assoc()): ?>
                  <tr>
                    <td><strong class="table-ticket-code">#URT-<?= htmlspecialchars($row['id_tiket']) ?></strong></td>
                    <td><strong class="table-device-bold"><?= htmlspecialchars($row['nama_layanan']) ?></strong></td>
                    <td><?= htmlspecialchars(substr($row['keluhan'], 0, 30)) ?>...</td>
                    <td><?= date('d M Y', strtotime($row['created_at'])) ?></td>
                    <td>
                        <?php if($row['status'] == 'SELESAI'): ?>
                            <span class="status-pill-green">Selesai</span>
                        <?php else: ?>
                            <span class="status-pill-red" style="color: #dc2626; background: #fee2e2; padding: 4px 10px; border-radius: 99px; font-size: 12px; font-weight: 600;">Ditolak</span>
                        <?php endif; ?>
                    </td>
                  </tr>
                  <?php endwhile; ?>
                <?php else: ?>
                  <tr>
                    <td colspan="5" style="text-align: center; padding: 20px; color: #64748b;">Belum ada riwayat servis sebelumnya.</td>
                  </tr>
                <?php endif; ?>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  </body>
</html>

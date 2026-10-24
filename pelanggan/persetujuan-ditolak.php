<?php
// Letakkan di baris paling atas persetujuan-ditolak.php
session_start();
require_once '../koneksi.php';

// Pastikan yang mengakses adalah pelanggan
if (!isset($_SESSION['id_user']) || $_SESSION['role'] !== 'pelanggan') {
    header("Location: ../masuk.php");
    exit;
}

$id_pelanggan = $_SESSION['id_user'];
$id_tiket = isset($_GET['id']) ? intval($_GET['id']) : 0;

// Ambil data tiket, pastikan tiket tersebut benar milik pelanggan ini dan statusnya ditolak
$sql = "SELECT t.*, 
               p.nama AS nama_pelanggan, p.no_telp AS telp_pelanggan,
               tk.nama AS nama_teknisi
        FROM tiket_servis t
        JOIN users p ON t.id_pelanggan = p.id_user
        LEFT JOIN users tk ON t.id_teknisi = tk.id_user
        WHERE t.id_tiket = $id_tiket AND t.id_pelanggan = $id_pelanggan";

$result = $conn->query($sql);

if ($result->num_rows === 0) {
    die("<div style='padding: 20px;'>Tiket tidak ditemukan. <a href='beranda-pelanggan.php'>Kembali</a></div>");
}

$tiket = $result->fetch_assoc();
$inisial = strtoupper(substr($_SESSION['nama'], 0, 2));

// Keamanan: Jika status bukan 'ditolak', redirect ke halaman detail
if ($tiket['status'] !== 'ditolak') {
    header("Location: detail-servis.php?id=$id_tiket");
    exit;
}

// Pisahkan keluhan menjadi Merek/Model dan masalahnya
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
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Penolakan Perbaikan — URT</title>
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
        <a href="../masuk.php" class="nav-item logout-nav-item" title="Keluar dari portal">
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
    <main class="main-wrapper">
      <!-- HEADER -->
      <header class="top-header">
        <div>
          <span class="badge-pelanggan">PELANGGAN</span>
          <span style="font-size: 14px; color: var(--text-muted); margin-left: 8px">Sistem Online</span>
        </div>
        <div class="header-right">
          <div class="avatar" style="background: white; border: 1px solid var(--primary-blue); color: var(--primary-blue);">
            <?= $inisial ?>
          </div>
        </div>
      </header>

      <!-- CONTENT -->
      <div class="content">
        <!-- PAGE HEADER -->
        <div class="page-header">
          <div>
            <span class="page-title">PORTAL PELANGGAN</span>
            <h1>Penolakan Perbaikan</h1>
            <p class="subtitle">
              Konfirmasi penolakan estimasi perbaikan untuk tiket #URT-<?= $tiket['id_tiket'] ?> (<?= htmlspecialchars($model_perangkat) ?>).
            </p>
          </div>
          <a href="beranda-pelanggan.php" class="btn-secondary" style="text-decoration: none;">
            &larr; Kembali ke Beranda
          </a>
        </div>

        <!-- ALERT DANGER / CANCELLATION STATUS -->
        <div class="alert-danger" role="alert">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink: 0; margin-top: 2px;">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
          <div>
            <h3 style="font-size: 16px; font-weight: 700; margin-bottom: 4px;">
              Perbaikan Dibatalkan oleh Pelanggan
            </h3>
            <p style="font-size: 14px; line-height: 1.5;">
              Penolakan biaya perbaikan telah tercatat dalam sistem URT. Teknisi kami telah diinstruksikan untuk merakit kembali unit ke kondisi semula tanpa biaya perbaikan tambahan. Unit siap diambil di tempat servis.
            </p>
          </div>
        </div>

        <!-- GRID KONTEN UTAMA -->
        <div class="main-grid">
          <!-- KOLOM KIRI: RINCIAN PENOLAKAN -->
          <section class="card" aria-labelledby="rincian-penolakan">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0; padding-bottom: 16px; margin-bottom: 16px;">
              <h2 id="rincian-penolakan" style="font-size: 18px;">Rincian Servis yang Dibatalkan</h2>
              <span class="badge-danger-tag">DIBATALKAN</span>
            </div>

            <p style="font-size: 14px; color: var(--primary-blue); font-weight: 600;">
              #URT-<?= $tiket['id_tiket'] ?> &bull; <?= htmlspecialchars($model_perangkat) ?>
            </p>

            <dl class="dl-grid">
              <dt>Pemilik Unit</dt>
              <dd><?= htmlspecialchars($tiket['nama_pelanggan']) ?></dd>

              <dt>Nomor Telepon</dt>
              <dd><?= htmlspecialchars($tiket['telp_pelanggan']) ?></dd>

              <dt>Keluhan Awal</dt>
              <dd><?= htmlspecialchars(substr($keluhan_bersih, 0, 50)) ?>...</dd>

              <dt>Hasil Diagnosis</dt>
              <dd><?= htmlspecialchars($tiket['catatan_teknisi'] ?? '-') ?></dd>

              <dt>Estimasi Ditolak</dt>
              <dd><span style="text-decoration: line-through; color: #94a3b8;">Rp <?= number_format($tiket['biaya_estimasi'], 0, ',', '.') ?></span> (Tidak disetujui)</dd>

              <dt>Status Unit</dt>
              <dd><strong style="color: #059669;">Siap Diambil di Outlet</strong></dd>

              <dt>Teknisi Pemeriksa</dt>
              <dd><?= htmlspecialchars($tiket['nama_teknisi'] ?? 'Belum Ditugaskan') ?></dd>
            </dl>

            <hr style="border: 0; border-top: 1px dashed #cbd5e1; margin: 20px 0;" />

            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <p style="font-size: 13px; color: var(--text-muted);">Biaya Akhir yang Harus Dibayar</p>
                <p style="font-size: 24px; font-weight: 800; color: var(--text-dark);">Rp 0</p>
                <small style="color: #64748b;">(Gratis biaya pengecekan / pemeriksaan awal)</small>
              </div>
              <a href="pengajuan-servis.php" class="btn-primary" style="text-decoration: none;">
                Ajukan Servis Lain
              </a>
            </div>
          </section>

          <!-- KOLOM KANAN: PANDUAN PENGAMBILAN & BANTUAN -->
          <section class="card" aria-labelledby="panduan-pengambilan">
            <h2 id="panduan-pengambilan" style="font-size: 18px; margin-bottom: 12px;">
              Petunjuk Pengambilan Unit
            </h2>
            <p style="font-size: 14px; color: var(--text-muted); margin-bottom: 16px;">
              Ikuti langkah di bawah ini untuk mengambil kembali perangkat Anda di workshop tempat servis.
            </p>

            <div class="pickup-notice-box">
              <div class="pickup-step">
                <div class="pickup-step-num">1</div>
                <div>
                  <strong>Tunjukkan Kode Tiket</strong><br />
                  <span style="color: var(--text-muted);">Sebutkan kode tiket <strong>#URT-<?= $tiket['id_tiket'] ?></strong> ke staf counter outlet.</span>
                </div>
              </div>
              <div class="pickup-step">
                <div class="pickup-step-num">2</div>
                <div>
                  <strong>Verifikasi Identitas</strong><br />
                  <span style="color: var(--text-muted);">Tunjukkan nomor WhatsApp atau identitas sesuai data pendaftaran (<?= htmlspecialchars($tiket['nama_pelanggan']) ?>).</span>
                </div>
              </div>
              <div class="pickup-step">
                <div class="pickup-step-num">3</div>
                <div>
                  <strong>Cek Kelengkapan Unit</strong><br />
                  <span style="color: var(--text-muted);">Pastikan unit <?= htmlspecialchars($model_perangkat) ?> Anda lengkap saat diserahterimakan.</span>
                </div>
              </div>
            </div>

            <div style="margin-top: 24px;">
              <h3 style="font-size: 14px; font-weight: 700; margin-bottom: 8px;">Butuh bantuan dari Admin?</h3>
              <p style="font-size: 13px; color: var(--text-muted); line-height: 1.6;">
                Hubungi admin kami melalui WhatsApp jika Anda ingin mengubah keputusan dan ingin melanjutkan perbaikan.
              </p>
            </div>

            <div style="margin-top: 20px; display: flex; flex-direction: column; gap: 10px;">
              <a
                href="https://web.whatsapp.com"
                target="_blank"
                rel="noopener noreferrer"
                class="btn-primary"
                style="display: flex; align-items: center; justify-content: center; gap: 8px; text-decoration: none; background: #059669;"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                </svg>
                Hubungi via WhatsApp
              </a>
              <a href="beranda-pelanggan.php" class="btn-secondary" style="text-align: center; text-decoration: none;">
                Kembali ke Beranda Pelanggan
              </a>
            </div>
          </section>
        </div>
      </div>

      <footer class="site-footer">
        URT &mdash; Your Service Tracker <span>Kelompok 2 UT</span>
      </footer>
    </main>
  </body>
</html>
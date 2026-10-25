<?php
// Letakkan di baris paling atas persetujuan-disetujui.php
session_start();
require_once '../koneksi.php';

// Pastikan yang mengakses adalah pelanggan
if (!isset($_SESSION['id_user']) || $_SESSION['role'] !== 'pelanggan') {
    header("Location: ../masuk.php");
    exit;
}

$id_pelanggan = $_SESSION['id_user'];
$id_tiket = isset($_GET['id']) ? intval($_GET['id']) : 0;

// Ambil data tiket dan pastikan tiket tersebut benar milik pelanggan ini dan statusnya disetujui/selesai
$sql = "SELECT t.*, 
               p.nama AS nama_pelanggan, 
               tk.nama AS nama_teknisi,
               l.nama_layanan
        FROM tiket_servis t
        JOIN users p ON t.id_pelanggan = p.id_user
        LEFT JOIN users tk ON t.id_teknisi = tk.id_user
        JOIN layanan l ON t.id_layanan = l.id_layanan
        WHERE t.id_tiket = $id_tiket AND t.id_pelanggan = $id_pelanggan";

$result = $conn->query($sql);

if ($result->num_rows === 0) {
    die("<div style='padding: 20px;'>Tiket tidak ditemukan. <a href='beranda-pelanggan.php'>Kembali</a></div>");
}

$tiket = $result->fetch_assoc();
$inisial = strtoupper(substr($_SESSION['nama'], 0, 2));

// Pastikan status tiket sudah disetujui (atau level selanjutnya seperti diproses/selesai)
if (!in_array($tiket['status'], ['PERBAIKAN', 'QC', 'SELESAI'], true)) {
    header("Location: detail-servis.php?id=$id_tiket");
    exit;
}

// Pisahkan keluhan menjadi Merek/Model dan masalahnya (berdasarkan format dari pengajuan-servis.php)
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
    <title>Persetujuan Biaya - URT</title>
    <!-- Menyambungkan ke CSS utama -->
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
            <h1>Persetujuan Biaya</h1>
            <p class="subtitle">
              Konfirmasi biaya perbaikan <?= htmlspecialchars($model_perangkat) ?> pada tiket #URT-<?= $tiket['id_tiket'] ?>.
            </p>
          </div>
          <a
            href="detail-servis.php?id=<?= $tiket['id_tiket'] ?>"
            class="btn-primary"
            style="background: white; color: var(--primary-blue); border: 1px solid var(--primary-blue);"
          >Kembali ke Detail Service</a>
        </div>

        <!-- ALERT STATUS -->
        <div class="alert-success" aria-labelledby="status-persetujuan">
          <div>
            <h3 id="status-persetujuan" style="margin-bottom: 4px; font-size: 16px">
              ✓ Perbaikan telah Anda setujui
            </h3>
            <p style="font-size: 14px">
              Persetujuan <?= htmlspecialchars($tiket['nama_pelanggan']) ?> tercatat pada <?= date('j M Y, H:i', strtotime($tiket['updated_at'])) ?> WIB. Teknisi telah
              menerima konfirmasi persetujuan dan dapat melanjutkan pekerjaan.
            </p>
          </div>
        </div>

        <!-- GRID KONTEN UTAMA (2 Kolom) -->
        <div class="main-grid">
          <!-- KOLOM KIRI (Rincian Disetujui) -->
          <section class="card" aria-labelledby="rincian-disetujui">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0; padding-bottom: 16px; margin-bottom: 16px;">
              <h2 id="rincian-disetujui" style="font-size: 18px">Rincian yang Disetujui</h2>
              <span class="badge-green">BIAYA DISETUJUI</span>
            </div>

            <p style="font-size: 14px; color: var(--primary-blue); font-weight: 600;">
              #URT-<?= $tiket['id_tiket'] ?> • <?= htmlspecialchars($model_perangkat) ?>
            </p>

            <dl class="dl-grid">
              <dt>Pelanggan</dt>
              <dd><?= htmlspecialchars($tiket['nama_pelanggan']) ?></dd>

              <dt>Keluhan Awal</dt>
              <dd><?= htmlspecialchars(substr($keluhan_bersih, 0, 50)) ?>...</dd>

              <dt>Tindakan</dt>
              <dd><?= htmlspecialchars($tiket['nama_layanan']) ?></dd>

              <dt>Catatan Teknisi</dt>
              <dd><?= htmlspecialchars($tiket['catatan_teknisi'] ?? '-') ?></dd>

              <dt>Teknisi Penugasan</dt>
              <dd><?= htmlspecialchars($tiket['nama_teknisi'] ?? 'Belum Ditugaskan') ?></dd>
            </dl>

            <hr style="border: 0; border-top: 1px dashed #cbd5e1; margin: 24px 0" />

            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <p style="font-size: 14px; color: var(--text-muted)">Total Biaya Servis</p>
                <p style="font-size: 24px; font-weight: 700; color: var(--primary-blue);">
                  Rp <?= number_format($tiket['biaya_estimasi'], 0, ',', '.') ?>
                </p>
              </div>
              <div style="text-align: right">
                <p style="font-size: 12px; color: var(--success-green); font-weight: 600;">
                  ✓ Saya menyetujui tindakan & estimasi
                </p>
                <p style="font-size: 12px; color: var(--text-muted)">
                  Tersimpan • <?= date('j M Y', strtotime($tiket['updated_at'])) ?>
                </p>
              </div>
            </div>

            <button
              type="button"
              class="btn-primary"
              onclick="window.print()"
              style="width: 100%; margin-top: 24px; background-color: var(--text-dark);"
            >
              Unduh Bukti Persetujuan
            </button>
          </section>

          <!-- KOLOM KANAN (Aside - Info & Langkah) -->
          <aside>
            <!-- Card Langkah -->
            <section class="card" aria-labelledby="langkah-selanjutnya" style="margin-bottom: 24px">
              <h2 id="langkah-selanjutnya" style="font-size: 16px; border-bottom: 1px solid #e2e8f0; padding-bottom: 12px;">
                Langkah Selanjutnya
              </h2>
              <ul class="timeline-list">
                <li>
                  <strong style="font-size: 14px">Persetujuan diterima</strong>
                  <p style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">
                    Konfirmasi sudah dikirim kepada teknisi.
                  </p>
                </li>
                <li>
                  <strong style="font-size: 14px">Proses perbaikan</strong>
                  <p style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">
                    Teknisi melanjutkan pengerjaan sesuai antrean operasional.
                  </p>
                </li>
                <li>
                  <strong style="font-size: 14px">QC &amp; Penyerahan</strong>
                  <p style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">
                    Perangkat diuji sebelum siap diambil di counter.
                  </p>
                </li>
              </ul>
            </section>

            <!-- Card Info -->
            <section class="card" aria-labelledby="informasi-biaya">
              <h2 id="informasi-biaya" style="font-size: 16px; margin-bottom: 12px; color: var(--warning-orange);">
                Informasi Biaya
              </h2>
              <p style="font-size: 13px; color: var(--text-muted); line-height: 1.5;">
                <strong>Tidak ada biaya tambahan tanpa konfirmasi.</strong>
                Jika ditemukan pekerjaan tambahan, teknisi akan mengajukan estimasi baru sebelum melanjutkan.
              </p>
            </section>
          </aside>
        </div>

        <footer style="margin-top: 40px; text-align: center; font-size: 12px; color: #94a3b8;">
          <p>URT — Your Service Tracker | Kelompok 2</p>
        </footer>
      </div>
    </main>
  </body>
</html>

<?php
// Letakkan di baris paling atas pengajuan-servis.php
session_start();
require_once '../koneksi.php';

// Pastikan yang mengakses adalah pelanggan
if (!isset($_SESSION['id_user']) || $_SESSION['role'] !== 'pelanggan') {
    header("Location: ../masuk.php");
    exit;
}

$id_pelanggan = $_SESSION['id_user'];
$pesan_error = "";

// 1. Proses pengajuan form ke database
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Ambil input dari form
    $id_layanan = intval($_POST['id_layanan']);
    $model = $conn->real_escape_string($_POST['model']);
    $keluhan_asli = $conn->real_escape_string($_POST['keluhan']);
    
    // Karena di database hanya ada kolom keluhan, kita gabungkan model perangkat dengan keluhannya
    $keluhan_lengkap = "Perangkat: " . $model . "\nDetail Keluhan: " . $keluhan_asli;

    // Masukkan ke tabel tiket_servis dengan status default 'menunggu'
    $sql_insert = "INSERT INTO tiket_servis (id_pelanggan, id_layanan, keluhan, status) 
                   VALUES ($id_pelanggan, $id_layanan, '$keluhan_lengkap', 'menunggu')";

    if ($conn->query($sql_insert) === TRUE) {
        // Alihkan ke riwayat servis jika berhasil
        header("Location: riwayat-servis.php?status=sukses");
        exit;
    } else {
        $pesan_error = "Terjadi kesalahan sistem: " . $conn->error;
    }
}

// 2. Ambil data pelanggan untuk auto-fill form "Data Pemilik"
$sql_user = "SELECT nama, email, no_telp FROM users WHERE id_user = $id_pelanggan";
$data_user = $conn->query($sql_user)->fetch_assoc();
$inisial = strtoupper(substr($data_user['nama'], 0, 2));

// 3. Ambil daftar layanan dari database untuk dropdown
$sql_layanan = "SELECT id_layanan, nama_layanan FROM layanan";
$result_layanan = $conn->query($sql_layanan);
?>
<!doctype html>
<html lang="id">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#0F172A" />
    <title>Pengajuan Servis - URT</title>
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
          <p><?= htmlspecialchars($data_user['nama']) ?></p>
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
          <span class="avatar avatar-outline" aria-label="<?= htmlspecialchars($data_user['nama']) ?>">
            <?= $inisial ?>
          </span>
        </div>
      </header>

      <main class="content">
        <div class="page-header">
          <div>
            <span class="page-title">LAYANAN SERVIS</span>
            <h1>Pengajuan Servis</h1>
            <p class="subtitle">
              Lengkapi informasi pemilik dan perangkat agar teknisi dapat memeriksa masalah dengan tepat.
            </p>
          </div>
        </div>

        <?php if (!empty($pesan_error)): ?>
        <div style="background-color: #fee2e2; color: #991b1b; padding: 12px; border-radius: 8px; margin-bottom: 20px;">
            <strong>Gagal:</strong> <?= $pesan_error; ?>
        </div>
        <?php endif; ?>

        <div class="status-banner" style="background: #eff6ff; border-color: #bfdbfe">
          <span class="status-icon" style="background: #dbeafe; color: #1d4ed8" aria-hidden="true">i</span>
          <div>
            <h2>Sebelum mengajukan servis</h2>
            <p>
              Pastikan nomor telepon dan alamat sudah benar. Jelaskan keluhan perangkat sedetail mungkin agar proses pemeriksaan lebih lancar.
            </p>
          </div>
        </div>

        <form class="profile-form service-form" id="form-servis" action="pengajuan-servis.php" method="POST">
          <section class="card form-card">
            <div class="section-heading">
              <div>
                <h2>Data Pemilik</h2>
                <p class="subtitle">
                  Informasi kontak yang dapat dihubungi selama proses servis.
                </p>
              </div>
              <span class="status-pill" style="background: #dbeafe; color: #1d4ed8">Bagian 1 dari 2</span>
            </div>

            <div class="form-grid">
              <div class="form-group">
                <label for="nama">Nama Lengkap <span aria-hidden="true">*</span></label>
                <input class="form-control" id="nama" type="text" name="nama" value="<?= htmlspecialchars($data_user['nama']) ?>" readonly required />
              </div>

              <div class="form-group">
                <label for="email">Email Aktif <span aria-hidden="true">*</span></label>
                <input class="form-control" id="email" type="email" name="email" value="<?= htmlspecialchars($data_user['email']) ?>" readonly required />
              </div>

              <div class="form-group">
                <label for="nohp">Nomor HP / WhatsApp <span aria-hidden="true">*</span></label>
                <input class="form-control" id="nohp" type="tel" name="nohp" value="<?= htmlspecialchars($data_user['no_telp']) ?>" readonly required />
                <small class="field-help">Diambil otomatis dari data profil Anda.</small>
              </div>
            </div>
          </section>

          <section class="card form-card">
            <div class="section-heading">
              <div>
                <h2>Data Perangkat</h2>
                <p class="subtitle">
                  Ceritakan perangkat yang ingin diservis dan masalah yang dialami.
                </p>
              </div>
              <span class="status-pill" style="background: #dbeafe; color: #1d4ed8">Bagian 2 dari 2</span>
            </div>

            <div class="form-grid">
              <div class="form-group">
                <label for="id_layanan">Pilih Kategori Layanan <span aria-hidden="true">*</span></label>
                <select class="form-control" id="id_layanan" name="id_layanan" required>
                  <option value="">-- Pilih Layanan Tersedia --</option>
                  <?php while($row_layanan = $result_layanan->fetch_assoc()): ?>
                      <option value="<?= $row_layanan['id_layanan'] ?>"><?= htmlspecialchars($row_layanan['nama_layanan']) ?></option>
                  <?php endwhile; ?>
                </select>
              </div>

              <div class="form-group">
                <label for="model">Merek / Model <span aria-hidden="true">*</span></label>
                <input class="form-control" id="model" type="text" name="model" placeholder="Contoh: ASUS VivoBook 14" required />
              </div>

              <div class="form-group form-group-full">
                <label for="keluhan">Keluhan / Kerusakan <span aria-hidden="true">*</span></label>
                <textarea class="form-control" id="keluhan" name="keluhan" rows="5" placeholder="Contoh: perangkat cepat panas, kipas berbunyi keras, atau tidak dapat menyala..." required></textarea>
                <small class="field-help">Sebutkan gejala, kapan masalah mulai terjadi, dan hal yang sudah dicoba jika ada.</small>
              </div>
            </div>
          </section>

          <div class="notice-card">
            <strong>Periksa kembali data sebelum mengirim</strong>
            <p>
              Pengajuan akan diteruskan ke halaman riwayat servis. Teknisi akan memeriksa perangkat dan memberikan informasi lanjutan sesuai proses servis.
            </p>
          </div>

          <div class="form-actions">
            <a class="btn-secondary" href="beranda-pelanggan.php">Batal</a>
            <button class="btn-primary" type="submit">Ajukan Servis</button>
          </div>
        </form>
      </main>

      <footer class="site-footer">
        URT — Your Service Tracker <span>Kelompok 2 UT</span>
      </footer>
    </div>
  </body>
</html>
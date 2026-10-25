<?php
session_start();
require_once '../koneksi.php';

if (!isset($_SESSION['role']) || $_SESSION['role'] !== 'pelanggan') {
    header("Location: ../masuk.php");
    exit;
}

$id_pelanggan = $_SESSION['id_user'];
$pesan_notifikasi = '';
$tipe_notifikasi = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $nama_baru = $conn->real_escape_string($_POST['nama']);
    $email_baru = $conn->real_escape_string($_POST['email']);
    $telepon_baru = $conn->real_escape_string($_POST['telepon']);
    $password_baru = $_POST['password_baru'];
    $konfirmasi = $_POST['konfirmasi_password'];
    
    $sql_update = "UPDATE users SET nama = '$nama_baru', email = '$email_baru', no_telp = '$telepon_baru' WHERE id_user = '$id_pelanggan'";
    
    if ($conn->query($sql_update) === TRUE) {
        $_SESSION['nama'] = $nama_baru; 
        $pesan_notifikasi = "Profil berhasil diperbarui!";
        $tipe_notifikasi = "success";
        
        // Update password jika diisi
        if (!empty($password_baru)) {
            if ($password_baru === $konfirmasi) {
                $hash = password_hash($password_baru, PASSWORD_DEFAULT);
                $conn->query("UPDATE users SET password = '$hash' WHERE id_user = '$id_pelanggan'");
                $pesan_notifikasi .= " Kata sandi juga telah diubah.";
            } else {
                $pesan_notifikasi = "Profil diperbarui, tetapi kata sandi gagal diubah (konfirmasi tidak cocok).";
                $tipe_notifikasi = "warning";
            }
        }
    } else {
        $pesan_notifikasi = "Gagal memperbarui profil: " . $conn->error;
        $tipe_notifikasi = "error";
    }
}

// Ambil data pelanggan terbaru dari database untuk ditampilkan di form
$sql_user = "SELECT * FROM users WHERE id_user = '$id_pelanggan'";
$user_data = $conn->query($sql_user)->fetch_assoc();

// Membuat inisial nama
$words = explode(" ", $user_data['nama']);
$inisial = strtoupper(substr($words[0], 0, 1) . (isset($words[1]) ? substr($words[1], 0, 1) : ''));
?>
<!doctype html>
<html lang="id">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Profil Pelanggan - URT</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
      rel="stylesheet"
    />
    <link rel="stylesheet" href="style-customer.css" />
    <script src="../js/script.js" defer></script>
    <script src="js/customer.js" defer></script>
    <style>
      .alert { padding: 12px 16px; border-radius: 6px; margin-bottom: 20px; font-weight: 500; }
      .alert-success { background-color: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }
      .alert-warning { background-color: #fef08a; color: #854d0e; border: 1px solid #fde047; }
      .alert-error { background-color: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }
    </style>
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
        <a href="beranda-pelanggan.php" class="nav-item">
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
        <a href="profil-pelanggan.php" class="nav-item active">
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
          <p><?= htmlspecialchars($user_data['nama']) ?></p>
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
            <span class="page-title">PENGATURAN AKUN</span>
            <h1>Profil Pelanggan</h1>
            <p class="subtitle">
              Kelola identitas dan kontak untuk pembaruan status servis perangkat Anda.
            </p>
          </div>
        </div>

        <?php if(!empty($pesan_notifikasi)): ?>
            <div class="alert alert-<?= $tipe_notifikasi ?>">
                <?= $pesan_notifikasi ?>
            </div>
        <?php endif; ?>

        <div class="profile-intro card">
          <div class="avatar profile-avatar"><?= $inisial ?></div>
          <div>
            <h2><?= htmlspecialchars($user_data['nama']) ?></h2>
            <p class="subtitle">Bergabung sejak: <?= date('d M Y', strtotime($user_data['created_at'])) ?></p>
          </div>
        </div>

        <!-- Ubah action ke profil-pelanggan.php dan method jadi POST agar bisa disimpan -->
        <form class="profile-form" action="profil-pelanggan.php" method="POST">
          <section class="card form-card">
            <div class="section-heading">
              <div>
                <h2>Informasi Pribadi</h2>
                <p class="subtitle">Pastikan informasi kontak selalu terbaru.</p>
              </div>
            </div>
            <div class="form-grid">
              <div class="form-group">
                <label for="nama">Nama Lengkap</label>
                <input
                  class="form-control"
                  id="nama"
                  type="text"
                  name="nama"
                  value="<?= htmlspecialchars($user_data['nama']) ?>"
                  required
                />
              </div>
              <div class="form-group">
                <label for="email">Email Aktif</label>
                <input
                  class="form-control"
                  id="email"
                  type="email"
                  name="email"
                  value="<?= htmlspecialchars($user_data['email']) ?>"
                  required
                />
              </div>
              <div class="form-group">
                <label for="telepon">Nomor WhatsApp/Telepon</label>
                <input
                  class="form-control"
                  id="telepon"
                  type="tel"
                  name="telepon"
                  value="<?= htmlspecialchars($user_data['no_telp']) ?>"
                  required
                />
              </div>
            </div>
          </section>
          
          <section class="card form-card">
            <div class="section-heading">
              <div>
                <h2>Keamanan Akun</h2>
                <p class="subtitle">Atur ulang kata sandi Anda di sini.</p>
              </div>
            </div>
            <div class="form-grid password-grid">
              <div class="form-group">
                <label for="password_baru">Kata Sandi Baru</label>
                <input
                  class="form-control"
                  id="password_baru"
                  type="password"
                  name="password_baru"
                  autocomplete="new-password"
                />
                <small class="field-help">Opsional. Kosongkan jika tidak ingin mengganti kata sandi.</small>
              </div>
              <div class="form-group">
                <label for="konfirmasi_password">Konfirmasi Kata Sandi Baru</label>
                <input
                  class="form-control"
                  id="konfirmasi_password"
                  type="password"
                  name="konfirmasi_password"
                  autocomplete="new-password"
                />
              </div>
            </div>
          </section>

          <div class="notice-card">
            <strong>Data kontak digunakan untuk servis</strong>
            <p>
              Pastikan nomor dan email aktif agar Anda menerima permintaan persetujuan biaya dan pembaruan perbaikan.
            </p>
          </div>

          <div class="form-actions">
            <a class="btn-secondary" href="beranda-pelanggan.php">Batal</a>
            <button class="btn-primary" type="submit">Simpan Profil</button>
            <a
              class="btn-secondary"
              href="../masuk.php?logout=true"
              onclick="return confirm('Anda yakin mau keluar dari portal pelanggan?');"
              >Keluar</a
            >
          </div>
        </form>
      </main>
      <footer class="site-footer">
        URT — Your Service Tracker <span>Kelompok 2</span>
      </footer>
    </div>
  </body>
</html>
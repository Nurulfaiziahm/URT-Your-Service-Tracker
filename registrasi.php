<?php
// Letakkan di baris paling atas registrasi.php
session_start();
require_once 'koneksi.php';

$pesan_error = '';

// Proses form jika ada request POST
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Mengambil dan membersihkan input dari form
    $nama = $conn->real_escape_string($_POST['name']);
    $email = $conn->real_escape_string($_POST['email']);
    $phone = $conn->real_escape_string($_POST['phone']);
    $password_raw = $_POST['password'];
    $role = 'pelanggan'; // Pastikan role diset sebagai pelanggan

    // Cek apakah email sudah terdaftar sebelumnya
    $cek_email = $conn->query("SELECT id_user FROM users WHERE email = '$email'");
    
    if ($cek_email->num_rows > 0) {
        $pesan_error = "Email sudah terdaftar! Silakan gunakan email lain atau masuk ke portal.";
    } else {
        // Enkripsi kata sandi (hashing) sebelum masuk ke database
        $password_hash = password_hash($password_raw, PASSWORD_DEFAULT);

        // Query untuk menyimpan data ke tabel users[cite: 1]
        $sql_insert = "INSERT INTO users (nama, email, password, role, no_telp) 
                       VALUES ('$nama', '$email', '$password_hash', '$role', '$phone')";

        if ($conn->query($sql_insert) === TRUE) {
            // Ambil ID user yang baru saja dibuat
            $id_baru = $conn->insert_id;

            // Buat sesi login otomatis agar tidak perlu login ulang
            $_SESSION['id_user'] = $id_baru;
            $_SESSION['nama'] = $nama;
            $_SESSION['role'] = $role;

            // Arahkan ke beranda pelanggan
            header("Location: pelanggan/beranda-pelanggan.php");
            exit;
        } else {
            $pesan_error = "Terjadi kesalahan sistem: " . $conn->error;
        }
    }
}
?>
<!doctype html>
<html lang="id">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Registrasi Akun Pelanggan — URT Your Service Tracker</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
      rel="stylesheet"
    />
    <link rel="stylesheet" href="owner/css/owner-auth.css" />
  </head>
  <body>
    <div class="register-wrap">
      <main class="reg-card">
        <div class="reg-brand-header">
          <a href="index.php">
            <img src="image/logo-urt.svg" alt="URT Logo" class="reg-brand-logo" />
          </a>
          <div><span class="reg-role-badge">AKUN PELANGGAN</span></div>
          <h1 class="reg-title">Buat Akun Pelanggan</h1>
          <p class="reg-subtitle">
            Daftar untuk memantau status servis, menyetujui estimasi biaya, dan melihat riwayat perbaikan Anda.
          </p>
        </div>

        <?php if (!empty($pesan_error)): ?>
        <div class="toast-error" role="alert" style="background-color: #fee2e2; color: #991b1b; padding: 12px; border-radius: 8px; margin-bottom: 16px; font-size: 14px;">
            <strong>Gagal:</strong> <?= $pesan_error; ?>
        </div>
        <?php endif; ?>

        <!-- Perhatikan perubahan action dan method di sini -->
        <form id="customerRegisterForm" class="reg-form" action="registrasi.php" method="POST" novalidate>
          <div class="form-group">
            <label class="form-label" for="regName">Nama Lengkap</label>
            <div class="input-container">
              <input
                type="text"
                id="regName"
                name="name"
                class="form-control no-icon"
                placeholder="Contoh: Nino Rachimas"
                required
              />
            </div>
            <div class="field-error" id="regNameError"></div>
          </div>

          <div class="form-group">
            <label class="form-label" for="regEmail">Alamat Email</label>
            <div class="input-container">
              <input
                type="email"
                id="regEmail"
                name="email"
                class="form-control no-icon"
                placeholder="nino.rachimas@email.com"
                required
              />
            </div>
            <div class="field-error" id="regEmailError"></div>
          </div>

          <div class="form-group">
            <label class="form-label" for="regPhone">Nomor WhatsApp / HP</label>
            <div class="input-container">
              <input
                type="tel"
                id="regPhone"
                name="phone"
                class="form-control no-icon"
                placeholder="0812 3456 7890"
                required
              />
            </div>
            <div class="field-error" id="regPhoneError"></div>
          </div>

          <div class="form-group">
            <label class="form-label" for="regPassword">Kata Sandi</label>
            <div class="input-container">
              <input
                type="password"
                id="regPassword"
                name="password"
                class="form-control no-icon"
                placeholder="Minimal 6 karakter"
                required
              />
              <button
                type="button"
                class="toggle-password"
                data-target="regPassword"
                aria-label="Lihat password"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </button>
            </div>
            <div class="field-error" id="regPasswordError"></div>
          </div>

          <button type="submit" class="btn-primary" style="margin-top: 8px;">
            Daftar Sekarang
          </button>
        </form>

        <div class="reg-link-row">
          Sudah punya akun? <a href="masuk.php">Masuk ke Portal</a>
        </div>

        <a href="index.php" class="back-home-link">
          &larr; Kembali ke Beranda URT
        </a>
      </main>
    </div>

    <!-- <script src="owner/js/owner-auth.js" defer></script> -->
  </body>
</html>


<?php
session_start();
require_once 'koneksi.php';

$error = '';
$active_role = '';

$redirects = [
    'owner'    => 'owner/beranda-owner.php',
    'teknisi'  => 'teknisi/beranda-teknisi.php',
    'pelanggan'=> 'pelanggan/beranda-pelanggan.php'
];

// Jika sudah login, arahkan ke dashboard sesuai role
if (isset($_SESSION['role']) && isset($redirects[$_SESSION['role']])) {
    header("Location: " . $redirects[$_SESSION['role']]);
    exit;
}

// Proses login
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $email = trim($_POST['email'] ?? '');
    $password = $_POST['password'] ?? '';
    $active_role = $_POST['role'] ?? '';

    if (!isset($redirects[$active_role])) {
        $error = 'Portal login tidak valid.';
    } elseif ($email === '' || $password === '') {
        $error = 'Email dan password wajib diisi.';
    } else {
        // Sesuaikan nama tabel/kolom jika berbeda di database
        $stmt = $conn->prepare(
            "SELECT id_user, nama, email, password, role
             FROM users
             WHERE email = ?
             LIMIT 1"
        );

        $stmt->bind_param("s", $email);
        $stmt->execute();
        $result = $stmt->get_result();
        $user = $result->fetch_assoc();
        $stmt->close();

        // Pastikan akun ada, password cocok, dan role sesuai portal
        if (
            $user &&
            password_verify($password, $user['password']) &&
            $user['role'] === $active_role
        ) {
            session_regenerate_id(true);

            $_SESSION['id_user'] = $user['id_user'];
            $_SESSION['nama'] = $user['nama'];
            $_SESSION['role'] = $user['role'];
            $_SESSION['email'] = $user['email'];

            header("Location: " . $redirects[$user['role']]);
            exit;
        } else {
            $error = 'Email atau password salah, atau akun tidak sesuai dengan portal yang dipilih.';
        }
    }
}
?>
<!doctype html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Pilih Portal Masuk — URT Your Service Tracker</title>

    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="owner/css/owner-auth.css">

    <style>
        .portal-login-form {
            display: none;
            margin-top: 18px;
            padding: 18px;
            border: 1px solid #334155;
            border-radius: 12px;
            background: #0f172a;
            text-align: left;
            animation: formIn .2s ease;
        }

        .portal-login-form.is-open {
            display: block;
        }

        .portal-login-form label {
            display: block;
            margin: 12px 0 6px;
            color: #e2e8f0;
            font-size: 13px;
            font-weight: 600;
        }

        .portal-login-form input {
            box-sizing: border-box;
            width: 100%;
            padding: 11px 12px;
            border: 1px solid #475569;
            border-radius: 8px;
            background: #1e293b;
            color: #f8fafc;
            font: inherit;
            font-size: 14px;
            outline: none;
        }

        .portal-login-form input:focus {
            border-color: #60a5fa;
            box-shadow: 0 0 0 3px rgba(96, 165, 250, .15);
        }

        .portal-login-form .login-submit {
            width: 100%;
            margin-top: 16px;
            padding: 11px;
            border: 0;
            border-radius: 8px;
            background: #2563eb;
            color: white;
            font: inherit;
            font-weight: 700;
            cursor: pointer;
        }

        .portal-login-form .login-submit:hover {
            background: #1d4ed8;
        }

        .login-error {
            margin: 0 0 12px;
            padding: 10px;
            border: 1px solid #7f1d1d;
            border-radius: 8px;
            background: #450a0a;
            color: #fecaca;
            font-size: 13px;
            line-height: 1.5;
        }

        .portal-toggle {
            width: 100%;
            border: 0;
            cursor: pointer;
            font: inherit;
            text-align: center;
        }

        .portal-toggle:focus-visible {
            outline: 2px solid #60a5fa;
            outline-offset: 3px;
        }

        @keyframes formIn {
            from { opacity: 0; transform: translateY(-5px); }
            to { opacity: 1; transform: translateY(0); }
        }
    </style>
</head>

<body class="page-portal page-login">
<div class="portal-select-container">

    <header class="portal-header">
        <a href="index.php" class="portal-header-logo">
            <img src="image/logo-urt.svg" alt="URT — Your Service Tracker">
        </a>

        <nav class="portal-header-links" aria-label="Navigasi Halaman Masuk">
            <a href="index.php">&larr; Kembali ke Landing Page</a>
            <a href="registrasi.php" style="color:#60a5fa;">Daftar Akun Baru</a>
        </nav>
    </header>

    <main class="portal-content">
        <div class="portal-title-area">
            <div class="eyebrow">PORTAL AKSES TERINTEGRASI</div>
            <h1>Pilih Portal Akses URT</h1>
            <p>
                Masuk ke lingkungan kerja sesuai peran Anda:
                Pelanggan yang memantau servis, Teknisi yang mengerjakan
                diagnosis, atau Pemilik Usaha yang memantau performa.
            </p>
        </div>

        <div class="portal-cards-grid">

            <!-- CARD PELANGGAN -->
            <div class="portal-card">
                <div class="portal-card__icon icon-pelanggan">
                    <svg width="24" height="24" viewBox="0 0 24 24"
                         fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                        <circle cx="12" cy="7" r="4"/>
                    </svg>
                </div>

                <div class="portal-card__role role-pelanggan">Pelanggan</div>
                <h2 class="portal-card__title">Portal Pelanggan</h2>
                <p class="portal-card__desc">
                    Pantau status perbaikan perangkat Anda, beri persetujuan
                    biaya estimasi, dan ajukan tiket servis baru secara mandiri.
                </p>

                <div class="portal-card__demo-user">
                    <strong>Portal pelanggan</strong><br>
                    <span style="color:#94a3b8;">Pantau tiket servis Anda</span>
                </div>

                <button type="button"
                    class="portal-card__btn portal-card__btn--green portal-toggle"
                    data-target="form-pelanggan"
                    aria-expanded="<?= $active_role === 'pelanggan' ? 'true' : 'false' ?>">
                    Masuk Portal Pelanggan &rarr;
                </button>

                <form id="form-pelanggan"
                      class="portal-login-form <?= $active_role === 'pelanggan' ? 'is-open' : '' ?>"
                      method="POST" action="masuk.php">

                    <input type="hidden" name="role" value="pelanggan">

                    <?php if ($error !== '' && $active_role === 'pelanggan'): ?>
                        <div class="login-error" role="alert">
                            <?= htmlspecialchars($error, ENT_QUOTES, 'UTF-8') ?>
                        </div>
                    <?php endif; ?>

                    <label for="email-pelanggan">Email</label>
                    <input type="email" id="email-pelanggan" name="email"
                           placeholder="nama@email.com" autocomplete="username"
                           required>

                    <label for="password-pelanggan">Password</label>
                    <input type="password" id="password-pelanggan" name="password"
                           placeholder="Masukkan password"
                           autocomplete="current-password" required>

                    <button type="submit" class="login-submit">
                        Masuk sebagai Pelanggan
                    </button>
                </form>
            </div>

            <!-- CARD TEKNISI -->
            <div class="portal-card">
                <div class="portal-card__icon icon-teknisi">
                    <svg width="24" height="24" viewBox="0 0 24 24"
                         fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
                    </svg>
                </div>

                <div class="portal-card__role role-teknisi">Teknisi Servis</div>
                <h2 class="portal-card__title">Portal Teknisi</h2>
                <p class="portal-card__desc">
                    Kelola antrean tiket penugasan, input hasil diagnosis
                    kerusakan, buat rincian estimasi biaya, dan catat penyelesaian QC.
                </p>

                <div class="portal-card__demo-user">
                    <strong>Portal teknisi</strong><br>
                    <span style="color:#94a3b8;">Kelola pekerjaan servis</span>
                </div>

                <button type="button"
                    class="portal-card__btn portal-card__btn--amber portal-toggle"
                    data-target="form-teknisi"
                    aria-expanded="<?= $active_role === 'teknisi' ? 'true' : 'false' ?>">
                    Masuk Portal Teknisi &rarr;
                </button>

                <form id="form-teknisi"
                      class="portal-login-form <?= $active_role === 'teknisi' ? 'is-open' : '' ?>"
                      method="POST" action="masuk.php">

                    <input type="hidden" name="role" value="teknisi">

                    <?php if ($error !== '' && $active_role === 'teknisi'): ?>
                        <div class="login-error" role="alert">
                            <?= htmlspecialchars($error, ENT_QUOTES, 'UTF-8') ?>
                        </div>
                    <?php endif; ?>

                    <label for="email-teknisi">Email</label>
                    <input type="email" id="email-teknisi" name="email"
                           placeholder="nama@email.com" autocomplete="username"
                           required>

                    <label for="password-teknisi">Password</label>
                    <input type="password" id="password-teknisi" name="password"
                           placeholder="Masukkan password"
                           autocomplete="current-password" required>

                    <button type="submit" class="login-submit">
                        Masuk sebagai Teknisi
                    </button>
                </form>
            </div>

            <!-- CARD OWNER -->
            <div class="portal-card">
                <div class="portal-card__icon icon-owner">
                    <svg width="24" height="24" viewBox="0 0 24 24"
                         fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                        <line x1="8" y1="21" x2="16" y2="21"/>
                        <line x1="12" y1="17" x2="12" y2="21"/>
                    </svg>
                </div>

                <div class="portal-card__role role-owner">Pemilik Usaha</div>
                <h2 class="portal-card__title">Portal Owner</h2>
                <p class="portal-card__desc">
                    Pusat kendali tempat servis: pantau pendapatan, beban kerja
                    teknisi, database pelanggan, dan manajemen paket langganan.
                </p>

                <div class="portal-card__demo-user">
                    <strong>Portal owner</strong><br>
                    <span style="color:#94a3b8;">Kelola operasional usaha</span>
                </div>

                <button type="button"
                    class="portal-card__btn portal-toggle"
                    data-target="form-owner"
                    aria-expanded="<?= $active_role === 'owner' ? 'true' : 'false' ?>">
                    Masuk Portal Owner &rarr;
                </button>

                <form id="form-owner"
                      class="portal-login-form <?= $active_role === 'owner' ? 'is-open' : '' ?>"
                      method="POST" action="masuk.php">

                    <input type="hidden" name="role" value="owner">

                    <?php if ($error !== '' && $active_role === 'owner'): ?>
                        <div class="login-error" role="alert">
                            <?= htmlspecialchars($error, ENT_QUOTES, 'UTF-8') ?>
                        </div>
                    <?php endif; ?>

                    <label for="email-owner">Email</label>
                    <input type="email" id="email-owner" name="email"
                           placeholder="nama@email.com" autocomplete="username"
                           required>

                    <label for="password-owner">Password</label>
                    <input type="password" id="password-owner" name="password"
                           placeholder="Masukkan password"
                           autocomplete="current-password" required>

                    <button type="submit" class="login-submit">
                        Masuk sebagai Owner
                    </button>
                </form>
            </div>
        </div>

        <div style="color:#64748b;font-size:14px;text-align:center;margin-top:24px;">
            Belum punya akun?
            <a href="registrasi.php"
               style="color:#60a5fa;text-decoration:underline;margin-left:4px;">
                Daftar sekarang
            </a>
        </div>
    </main>

    <footer class="portal-footer">
        &copy; 2026 URT — Your Service Tracker | Kelompok 2 UT. Hak cipta dilindungi.
    </footer>
</div>

<script>
document.querySelectorAll('.portal-toggle').forEach(button => {
    button.addEventListener('click', () => {
        const targetId = button.dataset.target;
        const targetForm = document.getElementById(targetId);
        const shouldOpen = !targetForm.classList.contains('is-open');

        // Tutup form lainnya
        document.querySelectorAll('.portal-login-form').forEach(form => {
            form.classList.remove('is-open');
        });

        document.querySelectorAll('.portal-toggle').forEach(btn => {
            btn.setAttribute('aria-expanded', 'false');
        });

        // Buka form yang dipilih
        if (shouldOpen) {
            targetForm.classList.add('is-open');
            button.setAttribute('aria-expanded', 'true');

            const emailInput = targetForm.querySelector('input[type="email"]');
            if (emailInput) emailInput.focus();
        }
    });
});
</script>
</body>
</html>

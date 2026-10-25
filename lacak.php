<?php
require_once 'koneksi.php';
$query = strtoupper(trim($_GET['ticket'] ?? ''));
$ticketId = null;
if (preg_match('/^URT-\d{4}-(\d+)$/', $query, $matches)) $ticketId = (int)$matches[1];
elseif (ctype_digit($query)) $ticketId = (int)$query;
$ticket = null;
if ($ticketId) {
    $stmt = $conn->prepare("SELECT t.*, u.nama AS customer_name, l.nama_layanan FROM tiket_servis t JOIN users u ON u.id_user=t.id_pelanggan JOIN layanan l ON l.id_layanan=t.id_layanan WHERE t.id_tiket=? LIMIT 1");
    $stmt->bind_param('i', $ticketId); $stmt->execute(); $ticket = $stmt->get_result()->fetch_assoc(); $stmt->close();
}
$ticketCode = $ticket ? 'URT-' . date('Y', strtotime($ticket['created_at'])) . '-' . str_pad((string)$ticket['id_tiket'], 3, '0', STR_PAD_LEFT) : '';
$e = static fn($value) => htmlspecialchars((string)$value, ENT_QUOTES, 'UTF-8');
?>
<!doctype html>
<html lang="id">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Hasil Pelacakan Servis — URT Your Service Tracker</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
      rel="stylesheet"
    />
    <link rel="stylesheet" href="css/style.css" />
  </head>
  <body class="tracking-page-wrap">
    <nav class="tracking-nav">
      <a href="index.php" style="display: inline-block; line-height: 0;">
        <img src="image/logo-urt.svg" alt="URT Your Service Tracker" height="38" />
      </a>
      <div style="display: flex; gap: 12px; align-items: center;">
        <a href="index.php" style="font-size: 14px; color: #64748b; text-decoration: none; font-weight: 500;">&larr; Kembali ke Beranda</a>
        <a href="masuk.php" class="btn btn--primary btn--sm" style="padding: 8px 16px; font-size: 13px;">Masuk Portal</a>
      </div>
    </nav>

    <main class="tracking-main">
      <!-- Search Again Bar -->
      <form action="lacak.php" method="get" class="search-again-bar">
        <input
          type="text"
          name="ticket"
          id="searchTicketInput"
          class="search-input"
          placeholder="Lacak nomor tiket lain (contoh: URT-2026-001)"
          required
        />
        <button type="submit" class="btn btn--primary" style="padding: 12px 20px; font-size: 14px;">Lacak</button>
      </form>

      <?php if (!$ticket): ?>
      <p role="alert" style="padding:16px;background:#fef2f2;color:#991b1b;border-radius:10px;">Ticket not found. Periksa kembali nomor tiket Anda.</p>
      <?php else: ?>
      <!-- Main Result Card -->
      <section class="result-card" aria-labelledby="trackingResultHeading">
        <div class="result-header">
          <div>
            <div style="font-size: 12px; color: #64748b; font-weight: 600; margin-bottom: 4px;">NOMOR TIKET SERVIS</div>
            <div class="ticket-id" id="displayTicketId">#<?= $e($ticketCode) ?></div>
          </div>
          <div>
            <span class="status-pill-badge" id="displayStatusBadge">
              <span class="status-dot-pulse"></span>
              <span id="displayStatusText"><?= $e($ticket['status']) ?></span>
            </span>
          </div>
        </div>

        <!-- Stepper -->
        <div class="tracker-stepper">
          <div class="tracker-step is-done">
            <div class="step-circle">&#10003;</div>
            <div class="step-label">Pendaftaran</div>
          </div>
          <div class="tracker-step is-done">
            <div class="step-circle">&#10003;</div>
            <div class="step-label">Diagnosis</div>
          </div>
          <div class="tracker-step is-active">
            <div class="step-circle">3</div>
            <div class="step-label">Persetujuan</div>
          </div>
          <div class="tracker-step">
            <div class="step-circle">4</div>
            <div class="step-label">Pengerjaan</div>
          </div>
          <div class="tracker-step">
            <div class="step-circle">5</div>
            <div class="step-label">Siap Diambil</div>
          </div>
        </div>

        <!-- Details Grid -->
        <dl class="details-grid">
          <div class="detail-cell">
            <dt>Perangkat</dt>
            <dd id="displayDevice"><?= $e(preg_match('/Perangkat: (.+)/', $ticket['keluhan'], $m) ? $m[1] : $ticket['nama_layanan']) ?></dd>
          </div>
          <div class="detail-cell">
            <dt>Pemilik / Pelanggan</dt>
            <dd id="displayCustomer"><?= $e($ticket['customer_name']) ?></dd>
          </div>
          <div class="detail-cell">
            <dt>Teknisi Penanggung Jawab</dt>
            <dd id="displayTechnician">Sofia Malvalena Adam</dd>
          </div>
          <div class="detail-cell">
            <dt>Tempat Servis</dt>
            <dd>ServisKita (iFix Lab)</dd>
          </div>
          <div class="detail-cell">
            <dt>Temuan Masalah</dt>
            <dd><?= $e($ticket['keluhan']) ?></dd>
          </div>
          <div class="detail-cell">
            <dt>Estimasi Biaya</dt>
            <dd style="color: #1d4ed8; font-size: 16px;">Rp<?= number_format((float)($ticket['biaya_akhir'] ?: $ticket['biaya_estimasi']), 0, ',', '.') ?></dd>
          </div>
        </dl>

        <!-- Action / Approval Callout -->
        <div class="action-banner">
          <div>
            <h2 style="font-size: 15px; font-weight: 700; color: #1e40af; margin-bottom: 4px;">Tindakan Perlu Persetujuan Anda</h2>
            <p style="font-size: 13px; color: #3b82f6; margin: 0;">Teknisi telah menyelesaikan diagnosis dan memerlukan persetujuan estimasi sesuai tiket sebelum pekerjaan dimulai.</p>
          </div>
          <a href="pelanggan/persetujuan-servis.php?id=<?= (int)$ticket['id_tiket'] ?>" class="btn btn--primary" style="padding: 10px 20px; font-size: 14px; white-space: nowrap;">
            Tinjau & Setujui Biaya &rarr;
          </a>
        </div>
      </section>
      <?php endif; ?>

      <!-- Back links -->
      <div style="text-align: center; font-size: 13px; color: #64748b;">
        Punya akun pelanggan? <a href="pelanggan/beranda-pelanggan.php" style="color: #2563eb; font-weight: 600;">Buka Dashboard Pelanggan</a>
      </div>
    </main>

    <footer style="text-align: center; padding: 24px; font-size: 13px; color: #94a3b8; border-top: 1px solid #e2e8f0; background: #ffffff;">
      URT — Your Service Tracker | Kelompok 2
    </footer>

  </body>
</html>

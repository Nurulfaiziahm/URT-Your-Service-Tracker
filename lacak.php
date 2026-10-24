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
        <a href="masuk.html" class="btn btn--primary btn--sm" style="padding: 8px 16px; font-size: 13px;">Masuk Portal</a>
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

      <!-- Main Result Card -->
      <section class="result-card" aria-labelledby="trackingResultHeading">
        <div class="result-header">
          <div>
            <div style="font-size: 12px; color: #64748b; font-weight: 600; margin-bottom: 4px;">NOMOR TIKET SERVIS</div>
            <div class="ticket-id" id="displayTicketId">#URT-2026-001</div>
          </div>
          <div>
            <span class="status-pill-badge" id="displayStatusBadge">
              <span class="status-dot-pulse"></span>
              <span id="displayStatusText">Menunggu Persetujuan Biaya</span>
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
            <dd id="displayDevice">ASUS VivoBook 14</dd>
          </div>
          <div class="detail-cell">
            <dt>Pemilik / Pelanggan</dt>
            <dd id="displayCustomer">Nino Rachimas</dd>
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
            <dd>Thermal Paste Kering & Debu Kipas</dd>
          </div>
          <div class="detail-cell">
            <dt>Estimasi Biaya</dt>
            <dd style="color: #1d4ed8; font-size: 16px;">Rp250.000</dd>
          </div>
        </dl>

        <!-- Action / Approval Callout -->
        <div class="action-banner">
          <div>
            <h2 style="font-size: 15px; font-weight: 700; color: #1e40af; margin-bottom: 4px;">Tindakan Perlu Persetujuan Anda</h2>
            <p style="font-size: 13px; color: #3b82f6; margin: 0;">Teknisi telah menyelesaikan diagnosis dan memerlukan persetujuan estimasi Rp250.000 sebelum pekerjaan dimulai.</p>
          </div>
          <a href="pelanggan/persetujuan-servis.html" class="btn btn--primary" style="padding: 10px 20px; font-size: 14px; white-space: nowrap;">
            Tinjau & Setujui Biaya &rarr;
          </a>
        </div>
      </section>

      <!-- Back links -->
      <div style="text-align: center; font-size: 13px; color: #64748b;">
        Punya akun pelanggan? <a href="pelanggan/beranda-pelanggan.html" style="color: #2563eb; font-weight: 600;">Buka Dashboard Pelanggan</a>
      </div>
    </main>

    <footer style="text-align: center; padding: 24px; font-size: 13px; color: #94a3b8; border-top: 1px solid #e2e8f0; background: #ffffff;">
      URT — Your Service Tracker | Kelompok 2
    </footer>

    <script src="js/data.js" defer></script>
  <script src="js/store.js" defer></script>
  <script src="js/ux.js" defer></script>
    <script src="js/script.js" defer></script>
  </body>
</html>

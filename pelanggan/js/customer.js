(() => {
  "use strict";

  const E = (v) => (window.URT_UX ? window.URT_UX.esc(v) : String(v == null ? "" : v));

  function setupCustomerSidebar() {
    const sidebar = document.querySelector(".sidebar");
    if (!sidebar) return;

    let toggleBtn = sidebar.querySelector(".sidebar-toggle");
    const header = sidebar.querySelector(".sidebar-header");

    // Automatically inject hamburger button if not present in markup
    if (!toggleBtn && header) {
      toggleBtn = document.createElement("button");
      toggleBtn.type = "button";
      toggleBtn.className = "sidebar-toggle";
      toggleBtn.id = "customerSidebarToggle";
      toggleBtn.setAttribute("aria-label", "Menu navigasi");
      toggleBtn.setAttribute("aria-expanded", "false");
      toggleBtn.innerHTML = `
        <svg class="icon-hamburger" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
        <svg class="icon-close" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 18L18 6M6 6l12 12" />
        </svg>
      `;
      header.appendChild(toggleBtn);
    }

    if (toggleBtn && !toggleBtn.dataset.wired) {
      toggleBtn.dataset.wired = "true";

      toggleBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const isOpen = sidebar.classList.toggle("is-open");
        toggleBtn.setAttribute("aria-expanded", String(isOpen));
      });

      // Close menu when clicking outside
      document.addEventListener("click", (e) => {
        if (sidebar.classList.contains("is-open") && !sidebar.contains(e.target)) {
          sidebar.classList.remove("is-open");
          toggleBtn.setAttribute("aria-expanded", "false");
        }
      });

      // Close on Escape key
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && sidebar.classList.contains("is-open")) {
          sidebar.classList.remove("is-open");
          toggleBtn.setAttribute("aria-expanded", "false");
          toggleBtn.focus();
        }
      });

      // Close menu when any nav item is clicked
      sidebar.querySelectorAll(".nav-menu a").forEach((link) => {
        link.addEventListener("click", () => {
          sidebar.classList.remove("is-open");
          toggleBtn.setAttribute("aria-expanded", "false");
        });
      });
    }
  }

  /* ==========================================================================
     Central Data Layer Integration for Customer Portal
     Populates HTML dynamic elements from window.URT_DATA
     ========================================================================== */
  function populateCustomerPortalData() {
    if (typeof window.URT_DATA === "undefined") return;
    const { customers, tickets, technicians } = window.URT_DATA;

    // Logged in customer: Nino Rachimas (CUS-001)
    const customer = (window.getCustomerById && window.getCustomerById("CUS-001")) || customers[0];
    const custTickets = window.getTicketsByCustomerId
      ? window.getTicketsByCustomerId(customer.id)
      : tickets.filter((t) => t.customerId === customer.id);

    // 1. Sidebar & Topbar profile info
    const footer = document.querySelector(".sidebar-footer");
    if (footer) {
      const avatar = footer.querySelector(".avatar");
      if (avatar) avatar.textContent = customer.initials || "NR";
      const nameP = footer.querySelector(".user-info p");
      if (nameP) nameP.textContent = customer.name;
    }

    const topbarAvatars = document.querySelectorAll(".user-avatar-circle, .avatar-outline");
    topbarAvatars.forEach((el) => {
      el.textContent = customer.initials || "NR";
      el.setAttribute("aria-label", customer.name);
    });

    // 2. Beranda Pelanggan (beranda-pelanggan.html)
    if (window.location.pathname.includes("beranda-pelanggan.html")) {
      const pageTitle = document.querySelector(".page-title");
      if (pageTitle) pageTitle.textContent = `Halo, ${customer.name}`;

      // Stat cards: Servis Aktif, Servis Selesai, Riwayat Servis
      const statBigNumbers = document.querySelectorAll(".stats-cards-grid .stat-big-number");
      if (statBigNumbers.length >= 3) {
        const activeCount = custTickets.filter((t) => t.status !== "SELESAI").length;
        statBigNumbers[0].textContent = activeCount || 1;
        statBigNumbers[1].textContent = custTickets.filter((t) => t.status === "SELESAI").length;
        statBigNumbers[2].textContent = customer.totalDevices || 3;
      }

      // Left Card: Tiket Aktif
      const activeTicket = custTickets.find((t) => t.id === "URT-2026-001") || custTickets[0] || tickets[0];
      const tech = window.getTechnicianById ? window.getTechnicianById(activeTicket.technicianId) : technicians[0];

      const ticketHeading = document.querySelector(".ticket-id-title");
      if (ticketHeading) ticketHeading.textContent = `#${activeTicket.id}`;

      const statusPill = document.querySelector(".badge-status-orange-pill");
      if (statusPill) statusPill.textContent = activeTicket.statusLabel || "Persetujuan Biaya";

      const deviceName = document.querySelector(".device-name-text");
      if (deviceName) deviceName.textContent = activeTicket.device;

      const deviceComplaint = document.querySelector(".device-complaint-text");
      if (deviceComplaint) deviceComplaint.textContent = `\u201C${activeTicket.issue}\u201D`;

      const metaDatas = document.querySelectorAll(".ticket-meta-info-strip .meta-info-data");
      if (metaDatas.length >= 3) {
        metaDatas[0].textContent = activeTicket.estimatedCompletion;
        metaDatas[1].textContent = tech ? tech.name : "Belum ditugaskan";
        metaDatas[2].textContent = window.formatCurrency ? window.formatCurrency(activeTicket.estimatedCost) : "Rp" + activeTicket.estimatedCost;
      }

      const viewDetailBtn = document.querySelector(".btn-view-detail-service");
      if (viewDetailBtn) {
        viewDetailBtn.href = `persetujuan-servis.html?id=${activeTicket.id}`;
      }

      // Bottom Card: Servis Sebelumnya
      const prevTbody = document.querySelector(".clean-table tbody");
      if (prevTbody) {
        const prevTickets = [
          tickets.find((t) => t.id === "URT-2026-004") || tickets[3],
          tickets.find((t) => t.id === "URT-2026-003") || tickets[2],
        ].filter(Boolean);

        prevTbody.innerHTML = prevTickets.map((t) => `
          <tr>
            <td><strong class="table-ticket-code">#${t.id}</strong></td>
            <td><strong class="table-device-bold">${E(t.device)}</strong></td>
            <td>${t.serviceName || t.diagnosisSummary || 'Cleaning & Thermal Paste'}</td>
            <td>${t.createdAt.split(',')[0]}</td>
            <td><span class="status-pill-green">Selesai</span></td>
          </tr>
        `).join("");
      }
    }

    // 3. Detail Servis (detail-servis.html)
    if (window.location.pathname.includes("detail-servis.html")) {
      const params = new URLSearchParams(window.location.search);
      const ticketId = params.get("id") || "URT-2026-001";
      const ticket = (window.getTicketById && window.getTicketById(ticketId)) || null;
      if (!ticket) return renderNotFound("Tiket tidak ditemukan", "Tiket " + ticketId + " tidak ada atau sudah dihapus.");
      const tech = (window.getTechnicianById && window.getTechnicianById(ticket.technicianId)) || null;

      const h2 = document.querySelector(".card h2");
      if (h2) h2.textContent = `#${ticket.id}`;
      document.title = `Detail Servis - #${ticket.id}`;

      const strongDevice = document.querySelector(".card strong[style*='color: var(--primary-blue)']");
      if (strongDevice) strongDevice.textContent = ticket.deviceDetail || ticket.device;

      const statusPill = document.querySelector(".status-pill");
      if (statusPill) {
        statusPill.className = `status-pill status-pill--${ticket.statusClass || 'warning'}`;
        statusPill.textContent = ticket.statusLabel || ticket.status;
      }

      // Key-value table rows
      const kvRows = document.querySelectorAll(".kv-table tbody tr");
      if (kvRows.length >= 8) {
        kvRows[0].children[1].textContent = `${customer.name} (${customer.phone})`;
        kvRows[1].children[1].textContent = ticket.device;
        kvRows[2].children[1].textContent = ticket.serialNumber || `SN-${ticket.id}`;
        kvRows[3].children[1].textContent = ticket.createdAt;
        kvRows[4].children[1].textContent = ticket.issue;
        kvRows[5].children[1].textContent = ticket.diagnosis;
        kvRows[6].children[1].textContent = ticket.actionRequired || "Deep Cleaning & Thermal Paste Replacement";
        kvRows[7].children[1].textContent = tech ? `${tech.name} (${tech.specialty})` : "Belum ditugaskan";
        if (kvRows[8]) kvRows[8].children[1].textContent = `${ticket.estimatedCompletion} (1\u20132 hari kerja setelah persetujuan)`;
      }

      // Cost card
      const costNumber = document.querySelector(".cost-summary-card div[style*='font-weight: 800']");
      if (costNumber) {
        costNumber.textContent = window.formatCurrency ? window.formatCurrency(ticket.estimatedCost) : "Rp" + ticket.estimatedCost;
      }

      const approveLink = document.querySelector(".btn-primary[href*='persetujuan-servis']");
      if (approveLink) approveLink.href = `persetujuan-servis.html?id=${ticket.id}`;

      const rejectLink = document.querySelector(".btn-danger[href*='persetujuan-ditolak']");
      if (rejectLink) rejectLink.href = `persetujuan-ditolak.html?id=${ticket.id}`;
    }

    // 4. Persetujuan Biaya (persetujuan-servis.html)
    if (window.location.pathname.includes("persetujuan-servis.html")) {
      const params = new URLSearchParams(window.location.search);
      const ticketId = params.get("id") || "URT-2026-001";
      const ticket = (window.getTicketById && window.getTicketById(ticketId)) || null;
      if (!ticket) return renderNotFound("Tiket tidak ditemukan", "Tiket " + ticketId + " tidak ada atau sudah dihapus.");
      const tech = (window.getTechnicianById && window.getTechnicianById(ticket.technicianId)) || null;

      const h2 = document.querySelector(".section-heading h2");
      if (h2) h2.textContent = `#${ticket.id}`;
      document.title = `Persetujuan Estimasi Biaya - #${ticket.id}`;

      const subtitle = document.querySelector(".section-heading .subtitle");
      if (subtitle) subtitle.textContent = `${ticket.device} \u2022 ${customer.name}`;

      const statusPill = document.querySelector(".section-heading .status-pill");
      if (statusPill) {
        statusPill.className = `status-pill ${ticket.statusClass || 'warning'}`;
        statusPill.textContent = ticket.statusLabel || ticket.status;
      }

      // Info list
      const infoList = document.querySelector(".info-list");
      if (infoList) {
        infoList.innerHTML = `
          <div><span>Nama Pelanggan</span><strong>${E(customer.name)}</strong></div>
          <div><span>Nomor Telepon</span><strong>${E(customer.phone)}</strong></div>
          <div><span>Perangkat</span><strong>${E(ticket.device)}</strong></div>
          <div><span>Serial Number</span><strong>${E(ticket.serialNumber || 'SN-' + ticket.id)}</strong></div>
          <div><span>Keluhan Awal</span><strong>${E(ticket.issue)}</strong></div>
          <div><span>Teknisi Penanggung Jawab</span><strong>${E(tech ? tech.name : 'Belum ditugaskan')}</strong></div>
        `;
      }

      // Diagnosis paragraph
      const diagP = document.querySelector(".subsection p");
      if (diagP) diagP.textContent = ticket.diagnosis;

      // Cost table
      const costTbody = document.querySelector(".cost-table tbody");
      if (costTbody) {
        const breakdown = ticket.costBreakdown && ticket.costBreakdown.length
          ? ticket.costBreakdown
          : [{ item: "Jasa Servis & Sparepart", amount: ticket.estimatedCost, category: "Servis" }];

        const breakdownRows = breakdown.map((item) => `
          <tr>
            <td>${E(item.item)}</td>
            <td>${item.category || 'Jasa Servis'}</td>
            <td class="text-right">${window.formatCurrency ? window.formatCurrency(item.amount) : 'Rp' + item.amount}</td>
          </tr>
        `).join("");

        costTbody.innerHTML = breakdownRows + `
          <tr class="total-row">
            <td colspan="2">Total Estimasi Biaya Servis</td>
            <td class="text-right" style="color: #2563eb;">${window.formatCurrency ? window.formatCurrency(ticket.estimatedCost) : 'Rp' + ticket.estimatedCost}</td>
          </tr>
        `;
      }
    }

    // 5. Riwayat Servis (riwayat-servis.html)
    if (window.location.pathname.includes("riwayat-servis.html")) {
      const historyTbody = document.querySelector(".history-table tbody");
      if (historyTbody) {
        const completedTickets = tickets.filter((t) => t.status === "SELESAI");
        historyTbody.innerHTML = completedTickets.map((t) => `
          <tr>
            <td>
              <strong>#${t.id}</strong><span class="table-subtext">${E(t.device)}</span>
            </td>
            <td>${t.serviceName || t.diagnosisSummary || 'Pemeriksaan & Servis Berkala'}</td>
            <td>${t.createdAt.split(',')[0]}</td>
            <td class="price-cell">${window.formatCurrency ? window.formatCurrency(t.estimatedCost) : 'Rp' + t.estimatedCost}</td>
            <td><span class="status-pill success">Selesai</span></td>
            <td>
              <a class="table-link" href="detail-servis.html?id=${t.id}">Detail &rarr;</a>
            </td>
          </tr>
        `).join("");
      }
    }

    // 6. Profil Pelanggan (profil-pelanggan.html)
    if (window.location.pathname.includes("profil-pelanggan.html")) {
      const namaInput = document.getElementById("nama");
      if (namaInput) namaInput.value = customer.name;
      const usernameInput = document.getElementById("username");
      if (usernameInput) usernameInput.value = customer.username;
      const emailInput = document.getElementById("email");
      if (emailInput) emailInput.value = customer.email;
      const telInput = document.getElementById("telepon");
      if (telInput) telInput.value = customer.phone;
      const alamatInput = document.getElementById("alamat");
      if (alamatInput) alamatInput.value = customer.address;
    }

    // 7. Pengajuan Servis: validasi -> simpan tiket baru ke store -> toast -> detail servis
    const formServis = document.getElementById("form-servis");
    if (formServis && window.URT_UX && window.URT_API) wirePengajuanServis(formServis, customer);

    // 8. Aksi persetujuan biaya (Setujui / Tolak) benar-benar mengubah status tiket
    if (window.location.pathname.includes("persetujuan-servis.html")) wireApprovalActions();
  }

  function renderNotFound(title, message) {
    const area = document.querySelector(".content") || document.querySelector("main");
    if (!area || !window.URT_UX) return;
    area.innerHTML = window.URT_UX.stateHtml({ type: "error", title: title, message: message }) +
      '<div style="text-align:center"><a class="btn-secondary" href="beranda-pelanggan.html">&larr; Kembali ke Beranda</a></div>';
  }

  function wirePengajuanServis(form, customer) {
    const UX = window.URT_UX;
    form.setAttribute("novalidate", "");
    UX.liveClear(form);
    const rules = {
      nama: { label: "Nama lengkap", required: true, minLength: 3, maxLength: 80 },
      email: { label: "Email", required: true, type: "email" },
      nohp: { label: "Nomor HP / WhatsApp", required: true, type: "phone" },
      alamat: { label: "Alamat lengkap", required: true, minLength: 10, maxLength: 200 },
      jenis_perangkat: { label: "Jenis perangkat", required: true },
      model: { label: "Merek / model", required: true, minLength: 3, maxLength: 80 },
      keluhan: { label: "Keluhan", required: true, minLength: 10, maxLength: 500 }
    };
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const btn = form.querySelector('button[type="submit"]');
      if (btn && btn.disabled) return;
      const { valid, values } = UX.validate(form, rules);
      if (!valid) {
        UX.toast("Periksa kembali isian yang ditandai merah.", "error");
        return;
      }
      UX.setLoading(btn, true, "Mengirim...");
      try {
        const select = form.elements.namedItem("jenis_perangkat");
        const ticket = await window.URT_API.create("tickets", {
          customerId: customer.id,
          device: values.model,
          deviceType: select.options[select.selectedIndex].text,
          issue: values.keluhan
        });
        UX.flash("Pengajuan servis berhasil dikirim! Nomor tiket #" + ticket.id, "success");
        window.location.href = "detail-servis.html?id=" + encodeURIComponent(ticket.id);
      } catch (err) {
        UX.setLoading(btn, false);
        UX.toast((err && err.message) || "Gagal mengirim pengajuan. Coba lagi.", "error");
      }
    });
  }

  function wireApprovalActions() {
    const UX = window.URT_UX;
    if (!UX || !window.URT_API) return;
    const ticketId = new URLSearchParams(window.location.search).get("id");
    const links = [
      { el: document.querySelector('.btn-primary[href*="persetujuan-disetujui"]'), approve: true },
      { el: document.querySelector('.btn-danger[href*="persetujuan-ditolak"]'), approve: false }
    ];
    links.forEach(({ el, approve }) => {
      if (!el) return;
      const target = el.getAttribute("href");
      el.addEventListener("click", async (event) => {
        event.preventDefault();
        if (el.classList.contains("is-loading")) return;
        const ok = await UX.confirm({
          title: approve ? "Setujui estimasi biaya?" : "Tolak estimasi biaya?",
          message: approve
            ? "Teknisi akan langsung memulai perbaikan setelah Anda menyetujui."
            : "Perbaikan tidak akan dilanjutkan dan tiket ini ditandai dibatalkan.",
          confirmLabel: approve ? "Ya, setujui" : "Ya, tolak",
          danger: !approve
        });
        if (!ok) return;
        const original = el.innerHTML;
        el.classList.add("is-loading");
        el.style.pointerEvents = "none";
        el.innerHTML = '<span class="urt-spinner" aria-hidden="true"></span>Memproses...';
        try {
          const current = window.getTicketById(ticketId || "URT-2026-001");
          const tl = (current.timeline || []).map((x) => Object.assign({}, x));
          const ci = tl.findIndex((x) => x.current);
          if (ci > -1) {
            tl[ci].current = false;
            tl[ci].done = true;
            tl[ci].time = (approve ? "Disetujui pelanggan" : "Ditolak pelanggan");
            if (approve && tl[ci + 1]) {
              tl[ci + 1].current = true;
              tl[ci + 1].time = "Sedang berlangsung";
            }
          }
          await window.URT_API.update("tickets", current.id, approve
            ? { status: "PERBAIKAN", statusLabel: "Dalam Pengerjaan", statusClass: "progress", timeline: tl, currentStep: 4 }
            : { status: "DIBATALKAN", statusLabel: "Dibatalkan Pelanggan", statusClass: "danger", timeline: tl });
          UX.flash(approve ? "Estimasi biaya disetujui. Perbaikan segera dimulai." : "Estimasi biaya ditolak.", approve ? "success" : "info");
          window.location.href = target;
        } catch (err) {
          el.classList.remove("is-loading");
          el.style.pointerEvents = "";
          el.innerHTML = original;
          UX.toast((err && err.message) || "Gagal memproses keputusan. Coba lagi.", "error");
        }
      });
    });
  }

  function setupNavItems() {
    const navItems = document.querySelectorAll(".nav-menu .nav-item");
    navItems.forEach((item) => {
      item.addEventListener("click", function () {
        navItems.forEach((nav) => nav.classList.remove("active"));
        this.classList.add("active");
      });
    });
  }

  const FILE = window.location.pathname.split("/").pop();
  const GATED = ["beranda-pelanggan.html", "riwayat-servis.html", "detail-servis.html", "persetujuan-servis.html"];

  // Skeleton -> data -> (empty | error) untuk halaman yang menampilkan data tiket
  function loadWithStates() {
    const UX = window.URT_UX;
    if (!UX || !window.URT_API || !GATED.includes(FILE)) return populateCustomerPortalData();
    const tbodies = [".history-table tbody", ".clean-table tbody"].map((q) => document.querySelector(q)).filter(Boolean);
    const colsOf = (tb) => tb.closest("table")?.querySelectorAll("thead th").length || 5;
    const area = document.querySelector(".content") || document.querySelector(".dashboard-main-area") || document.querySelector("main");
    const pageLevel = FILE !== "riwayat-servis.html"; // riwayat: skeleton pada baris tabel
    const run = () => {
      if (pageLevel) UX.pageLoading(area, true);
      else tbodies.forEach((tb) => UX.skeletonRows(tb, colsOf(tb), 3));
      window.URT_API.ready()
        .then(() => {
          if (pageLevel) UX.pageLoading(area, false);
          populateCustomerPortalData();
          tbodies.forEach((tb) => {
            if (!tb.querySelector("tr"))
              UX.showState(tb, { type: "empty", title: "Belum ada servis selesai", message: "Riwayat akan muncul setelah servis Anda selesai." }, colsOf(tb));
          });
        })
        .catch(() => {
          const opts = { type: "error", title: "Gagal memuat data", message: "Periksa koneksi internet Anda lalu coba lagi.", actionLabel: "Coba lagi ↻", onAction: run };
          if (pageLevel) {
            UX.pageLoading(area, false);
            UX.showState(area, Object.assign({}, opts, { onAction: () => window.location.reload() }));
          } else tbodies.forEach((tb) => UX.showState(tb, opts, colsOf(tb)));
          UX.toast("Gagal memuat data. Coba lagi.", "error");
        });
    };
    run();
  }

  function init() {
    setupCustomerSidebar();
    loadWithStates();
    setupNavItems();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

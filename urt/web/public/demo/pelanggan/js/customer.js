(() => {
  "use strict";

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
        statBigNumbers[1].textContent = 4; // Total selesai
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
        metaDatas[1].textContent = tech ? tech.name : "Sofia Malvalena Adam";
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
            <td><strong class="table-device-bold">${t.device}</strong></td>
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
      const ticket = (window.getTicketById && window.getTicketById(ticketId)) || tickets[0];
      const tech = (window.getTechnicianById && window.getTechnicianById(ticket.technicianId)) || technicians[0];

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
        kvRows[7].children[1].textContent = tech ? `${tech.name} (${tech.specialty})` : "Sofia Malvalena Adam";
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
      const ticket = (window.getTicketById && window.getTicketById(ticketId)) || tickets[0];
      const tech = (window.getTechnicianById && window.getTechnicianById(ticket.technicianId)) || technicians[0];

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
          <div><span>Nama Pelanggan</span><strong>${customer.name}</strong></div>
          <div><span>Nomor Telepon</span><strong>${customer.phone}</strong></div>
          <div><span>Perangkat</span><strong>${ticket.device}</strong></div>
          <div><span>Serial Number</span><strong>${ticket.serialNumber || 'SN-' + ticket.id}</strong></div>
          <div><span>Keluhan Awal</span><strong>${ticket.issue}</strong></div>
          <div><span>Teknisi Penanggung Jawab</span><strong>${tech ? tech.name : 'Sofia Malvalena Adam'}</strong></div>
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
            <td>${item.item}</td>
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
              <strong>#${t.id}</strong><span class="table-subtext">${t.device}</span>
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

    // 7. Pengajuan Servis Form handler
    const formServis = document.getElementById("form-servis");
    if (formServis) {
      formServis.addEventListener("submit", function (event) {
        event.preventDefault();
        window.location.href = "persetujuan-servis.html";
      });
    }
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

  function init() {
    setupCustomerSidebar();
    populateCustomerPortalData();
    setupNavItems();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

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
     Populates HTML dynamic elements from window.URT_DATA (MySQL Connected)
     ========================================================================== */
  function populateCustomerPortalData() {
    if (typeof window.URT_DATA === "undefined") return;
    const { customers, tickets, technicians } = window.URT_DATA;

    // Deteksi nama pelanggan dari UI (karena dirender oleh PHP)
    const userInfoEl = document.querySelector(".user-info p");
    const loggedInName = userInfoEl ? userInfoEl.textContent.trim() : "";
    
    // Cari customer berdasarkan nama dari UI, atau gunakan index 0 sebagai fallback
    const customer = customers.find(c => c.name === loggedInName) || customers[0];
    if (!customer) return;

    const custTickets = window.getTicketsByCustomerId
      ? window.getTicketsByCustomerId(customer.id)
      : tickets.filter((t) => t.customerId == customer.id);

    // 1. Beranda Pelanggan (beranda-pelanggan.php)
    if (window.location.pathname.includes("beranda-pelanggan.php")) {
      
      // Ambil tiket aktif pertama secara dinamis (bukan hardcode)
      const activeTicket = custTickets.find((t) => t.status !== "SELESAI" && t.status !== "DITOLAK");
      
      if (activeTicket) {
        const viewDetailBtn = document.querySelector(".btn-view-detail-service, .btn-primary-action[href*='persetujuan']");
        if (viewDetailBtn) {
          // Arahkan tombol ke halaman persetujuan atau detail sesuai status dari database
          if (activeTicket.status === "MENUNGGU_PERSETUJUAN") {
            viewDetailBtn.href = `persetujuan-servis.php?id=${activeTicket.id.replace('URT-', '')}`;
          } else {
            viewDetailBtn.href = `detail-servis.php?id=${activeTicket.id.replace('URT-', '')}`;
          }
        }
      }
    }

    // 2. Detail Servis (detail-servis.php)
    if (window.location.pathname.includes("detail-servis.php")) {
      const params = new URLSearchParams(window.location.search);
      const ticketIdNum = params.get("id");
      const ticketId = ticketIdNum ? `URT-${ticketIdNum}` : custTickets[0]?.id;
      
      const ticket = (window.getTicketById && window.getTicketById(ticketId)) || tickets[0];
      if(!ticket) return;

      const tech = (window.getTechnicianById && window.getTechnicianById(ticket.technicianId)) || null;

      const h2 = document.querySelector(".card h2");
      if (h2) h2.textContent = `#${ticket.id}`;
      document.title = `Detail Servis - #${ticket.id}`;

      const strongDevice = document.querySelector(".card strong[style*='color: var(--primary-blue)']");
      if (strongDevice) strongDevice.textContent = ticket.deviceDetail || ticket.device;

      const statusPill = document.querySelector(".status-pill");
      if (statusPill) {
        statusPill.className = `status-pill status-pill--${ticket.status === 'SELESAI' ? 'success' : 'warning'}`;
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
        kvRows[5].children[1].textContent = ticket.diagnosis || 'Menunggu diagnosis teknisi';
        kvRows[6].children[1].textContent = ticket.actionRequired || "Sesuai rincian diagnosis";
        kvRows[7].children[1].textContent = tech ? `${tech.name}` : "Menunggu Penugasan";
      }

      // Cost card
      const costNumber = document.querySelector(".cost-summary-card div[style*='font-weight: 800']");
      if (costNumber) {
        costNumber.textContent = window.formatCurrency ? window.formatCurrency(ticket.estimatedCost) : "Rp" + (ticket.estimatedCost || 0);
      }

      const approveLink = document.querySelector(".btn-primary[href*='persetujuan-servis']");
      if (approveLink) approveLink.href = `persetujuan-servis.php?id=${ticket.id.replace('URT-', '')}`;

      const rejectLink = document.querySelector(".btn-danger[href*='persetujuan-ditolak']");
      if (rejectLink) rejectLink.href = `persetujuan-ditolak.php?id=${ticket.id.replace('URT-', '')}`;
    }

    // 3. Persetujuan Biaya (persetujuan-servis.php)
    if (window.location.pathname.includes("persetujuan-servis.php")) {
      const params = new URLSearchParams(window.location.search);
      const ticketIdNum = params.get("id");
      const ticketId = ticketIdNum ? `URT-${ticketIdNum}` : custTickets[0]?.id;
      
      const ticket = (window.getTicketById && window.getTicketById(ticketId)) || tickets[0];
      if(!ticket) return;

      const tech = (window.getTechnicianById && window.getTechnicianById(ticket.technicianId)) || null;

      const h2 = document.querySelector(".section-heading h2");
      if (h2) h2.textContent = `#${ticket.id}`;
      document.title = `Persetujuan Estimasi Biaya - #${ticket.id}`;

      const subtitle = document.querySelector(".section-heading .subtitle");
      if (subtitle) subtitle.textContent = `${ticket.device} \u2022 ${customer.name}`;

      const statusPill = document.querySelector(".section-heading .status-pill");
      if (statusPill) {
        statusPill.className = `status-pill warning`;
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
          <div><span>Teknisi Penanggung Jawab</span><strong>${tech ? tech.name : 'Menunggu Penugasan'}</strong></div>
        `;
      }

      // Diagnosis paragraph
      const diagP = document.querySelector(".subsection p");
      if (diagP) diagP.textContent = ticket.diagnosis;

      // Cost table
      const costTbody = document.querySelector(".cost-table tbody");
      if (costTbody) {
        costTbody.innerHTML = `
          <tr>
            <td>Tindakan Servis & Pergantian Suku Cadang</td>
            <td>Jasa Servis</td>
            <td class="text-right">${window.formatCurrency ? window.formatCurrency(ticket.estimatedCost) : 'Rp' + ticket.estimatedCost}</td>
          </tr>
          <tr class="total-row">
            <td colspan="2">Total Estimasi Biaya Servis</td>
            <td class="text-right" style="color: #2563eb;">${window.formatCurrency ? window.formatCurrency(ticket.estimatedCost) : 'Rp' + ticket.estimatedCost}</td>
          </tr>
        `;
      }
    }

    // 4. Profil Pelanggan (profil-pelanggan.php)
    if (window.location.pathname.includes("profil-pelanggan.php")) {
      const namaInput = document.getElementById("nama");
      if (namaInput) namaInput.value = customer.name;
      const emailInput = document.getElementById("email");
      if (emailInput) emailInput.value = customer.email;
      const telInput = document.getElementById("telepon");
      if (telInput) telInput.value = customer.phone;
    }

    // 5. Pengajuan Servis Form handler
    const formServis = document.getElementById("form-servis");
    if (formServis) {
      // Jika form diubah jadi PHP, JS default prevent tidak diperlukan.
      // Namun kita biarkan jika masih menggunakan AJAX di masa depan.
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

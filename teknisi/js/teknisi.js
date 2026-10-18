(() => {
  "use strict";

  function setupTeknisiSidebar() {
    // Target the main sidebar header
    const header = document.querySelector("body > header");
    if (!header) return;

    let toggleBtn = header.querySelector(".sidebar-toggle");

    // Automatically inject hamburger button if not present in markup
    if (!toggleBtn) {
      toggleBtn = document.createElement("button");
      toggleBtn.type = "button";
      toggleBtn.className = "sidebar-toggle";
      toggleBtn.id = "teknisiSidebarToggle";
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
      const nav = header.querySelector("nav");
      if (nav) {
        header.insertBefore(toggleBtn, nav);
      } else {
        header.appendChild(toggleBtn);
      }
    }

    if (toggleBtn && !toggleBtn.dataset.wired) {
      toggleBtn.dataset.wired = "true";

      toggleBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const isOpen = header.classList.toggle("is-open");
        toggleBtn.setAttribute("aria-expanded", String(isOpen));
      });

      // Close menu when clicking outside
      document.addEventListener("click", (e) => {
        if (header.classList.contains("is-open") && !header.contains(e.target)) {
          header.classList.remove("is-open");
          toggleBtn.setAttribute("aria-expanded", "false");
        }
      });

      // Close on Escape key
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && header.classList.contains("is-open")) {
          header.classList.remove("is-open");
          toggleBtn.setAttribute("aria-expanded", "false");
          toggleBtn.focus();
        }
      });

      // Close menu when any nav item is clicked
      header.querySelectorAll("nav a").forEach((link) => {
        link.addEventListener("click", () => {
          header.classList.remove("is-open");
          toggleBtn.setAttribute("aria-expanded", "false");
        });
      });
    }

    // Enforce exactly one active sidebar navigation item based on route
    const currentPath = window.location.pathname.toLowerCase();
    const navLinks = header.querySelectorAll("nav a");
    navLinks.forEach((link) => link.removeAttribute("aria-current"));

    let targetHref = "beranda-teknisi.html";
    if (currentPath.includes("profil.html")) {
      targetHref = "profil.html";
    } else if (
      currentPath.includes("antrean") ||
      currentPath.includes("antrian")
    ) {
      targetHref = "antrean.html";
    } else if (
      currentPath.includes("riwayat") ||
      currentPath.includes("tiket-selesai") ||
      currentPath.includes("detail-tiket") ||
      currentPath.includes("estimasi") ||
      currentPath.includes("ringkasan-terkirim")
    ) {
      targetHref = "riwayat.html";
    } else if (currentPath.includes("beranda")) {
      targetHref = "beranda-teknisi.html";
    }

    const activeLink = Array.from(navLinks).find((l) => l.getAttribute("href") === targetHref);
    if (activeLink) {
      activeLink.setAttribute("aria-current", "page");
    }
  }

  /* ==========================================================================
     Central Data Layer Integration for Technician Portal
     Populates HTML dynamic elements from window.URT_DATA
     ========================================================================== */
  function populateTeknisiPortalData() {
    if (typeof window.URT_DATA === "undefined") return;
    const { technicians, tickets, customers } = window.URT_DATA;

    // Default logged in technician: Sofia Malvalena Adam (TECH-001)
    const technician = (window.getTechnicianById && window.getTechnicianById("TECH-001")) || technicians[0];
    const techTickets = window.getTicketsByTechnicianId
      ? window.getTicketsByTechnicianId(technician.id)
      : tickets.filter((t) => t.technicianId === technician.id);

    // 1. Sidebar & Topbar profile info
    const profileContainers = document.querySelectorAll(
      "header > div[style*='margin-top: auto'], .topbar-right"
    );
    profileContainers.forEach((container) => {
      const avatar = container.querySelector(
        "div[style*='border-radius: 50%'], .user-avatar-circle"
      );
      if (avatar && !avatar.textContent.trim()) {
        avatar.textContent = technician.initials || "SMA";
      }
      const nameEl = container.querySelector("strong");
      if (nameEl) nameEl.textContent = technician.name;
    });

    // 2. Beranda Teknisi (beranda-teknisi.html)
    const statsGrid = document.querySelector(".stats-cards-grid");
    if (statsGrid && window.location.pathname.includes("beranda-teknisi.html")) {
      const statBigNumbers = statsGrid.querySelectorAll(".stat-big-number");
      if (statBigNumbers.length >= 3) {
        statBigNumbers[0].textContent = technician.activeTickets + technician.completedTickets;
        statBigNumbers[1].textContent = technician.activeTickets;
        statBigNumbers[2].textContent = technician.completedTickets;
      }

      // Urgent / Selected Ticket card
      const ticketCard = document.querySelector(".content-card .ticket-id-title");
      if (ticketCard) {
        const urgentTicket = techTickets.find((t) => t.id === "URT-2026-001") || techTickets[0] || tickets[0];
        const cust = window.getCustomerById ? window.getCustomerById(urgentTicket.customerId) : null;

        ticketCard.textContent = `#${urgentTicket.id}`;
        const badge = ticketCard.closest(".content-card")?.querySelector(".badge-status-soft-blue");
        if (badge) badge.textContent = urgentTicket.statusLabel || "Menunggu Persetujuan";

        const detailVals = ticketCard.closest(".content-card")?.querySelectorAll(".detail-field-val");
        if (detailVals && detailVals.length >= 3) {
          detailVals[0].textContent = urgentTicket.device;
          detailVals[1].textContent = `\u201C${urgentTicket.issue}\u201D`;
          detailVals[2].textContent = cust ? cust.name : "Nino Rachimas";
        }

        const openBtn = ticketCard.closest(".content-card")?.querySelector(".btn-open-ticket");
        if (openBtn) openBtn.href = `detail-tiket.html?id=${urgentTicket.id}`;
      }

      // Urgent queue table
      const queueTbody = document.querySelector(".clean-table tbody");
      if (queueTbody) {
        const displayTickets = [
          tickets.find((t) => t.id === "URT-2026-001") || tickets[0],
          tickets.find((t) => t.id === "URT-2026-004") || tickets[1],
          tickets.find((t) => t.id === "URT-2026-007") || tickets[2],
        ].filter(Boolean);

        const renderQueueRows = (filteredTickets) => {
          queueTbody.innerHTML = filteredTickets.map((t) => {
            const cust = window.getCustomerById ? window.getCustomerById(t.customerId) : null;
            const custName = cust ? cust.name : "Pelanggan";
            const pillClass = t.status === "SELESAI" ? "status-pill-green" : t.status === "PENGERJAAN" ? "status-pill-blue" : "status-pill-amber";
            const priorityClass = t.priority === "Tinggi" ? "priority-danger" : "priority-default";
            return `
              <tr data-status="${t.status}">
                <td><a href="detail-tiket.html?id=${t.id}" class="table-ticket-link">#${t.id}</a></td>
                <td><strong>${t.device}</strong></td>
                <td>${custName}</td>
                <td><span class="${pillClass}">${t.statusLabel || t.status}</span></td>
                <td><span class="${priorityClass}">${t.priority || 'Normal'}</span></td>
                <td><a href="detail-tiket.html?id=${t.id}" class="action-arrow-link">Kelola &rarr;</a></td>
              </tr>
            `;
          }).join("");
        };

        renderQueueRows(displayTickets);

        // Filter pills hookup
        const filterSemua = document.getElementById("filterSemua");
        const filterMenunggu = document.getElementById("filterMenunggu");
        const filterPengerjaan = document.getElementById("filterPengerjaan");

        if (filterSemua) {
          filterSemua.addEventListener("click", () => renderQueueRows(displayTickets));
        }
        if (filterMenunggu) {
          filterMenunggu.addEventListener("click", () => {
            renderQueueRows(displayTickets.filter((t) => t.status === "PERSETUJUAN" || t.status === "DIAGNOSA"));
          });
        }
        if (filterPengerjaan) {
          filterPengerjaan.addEventListener("click", () => {
            renderQueueRows(displayTickets.filter((t) => t.status === "PENGERJAAN" || t.status === "QC"));
          });
        }
      }
    }

    // 3. Antrean Servis (antrean.html)
    const antreanTable = document.querySelector("table caption");
    if (antreanTable && window.location.pathname.includes("antrean.html")) {
      const activeList = tickets.filter((t) => t.status !== "SELESAI");
      const tbody = document.querySelector("table tbody");
      if (tbody) {
        tbody.innerHTML = activeList.map((t) => {
          const cust = window.getCustomerById ? window.getCustomerById(t.customerId) : null;
          const custName = cust ? cust.name : "Pelanggan";
          return `
            <tr>
              <td><strong>#${t.id}</strong></td>
              <td>${t.device}</td>
              <td>${custName}</td>
              <td>${t.issue}</td>
              <td>${t.createdAt.split(',')[0]}</td>
              <td>${t.estimatedCompletion}</td>
              <td><span class="status status--${t.statusClass || 'warning'}">${t.statusLabel || t.status}</span></td>
              <td><a href="detail-tiket.html?id=${t.id}">Lihat Detail</a></td>
            </tr>
          `;
        }).join("");
      }

      // Stats list
      const statsUl = document.querySelector("section[aria-labelledby='statistik'] ul");
      if (statsUl) {
        const diagCount = activeList.filter((t) => t.status === "DIAGNOSA").length;
        const apprvCount = activeList.filter((t) => t.status === "PERSETUJUAN").length;
        const qcCount = activeList.filter((t) => t.status === "QC" || t.status === "PENGERJAAN").length;
        statsUl.innerHTML = `
          <li>Total aktif: ${activeList.length}</li>
          <li>Dalam diagnosa: ${diagCount}</li>
          <li>Menunggu persetujuan: ${apprvCount}</li>
          <li>Pemeriksaan QC: ${qcCount}</li>
        `;
      }
    }

    // 4. Riwayat Tiket (riwayat.html)
    if (window.location.pathname.includes("riwayat.html")) {
      const activeOl = document.querySelector("section[aria-labelledby='aktif'] ol");
      if (activeOl) {
        const activeTickets = tickets.filter((t) => t.status !== "SELESAI").slice(0, 3);
        activeOl.innerHTML = activeTickets.map((t) => {
          const cust = window.getCustomerById ? window.getCustomerById(t.customerId) : null;
          return `
            <li>
              <article>
                <h3>#${t.id} - ${t.device}</h3>
                <p>${cust ? cust.name : 'Pelanggan'}</p>
                <p>${t.issue}</p>
                <p>Status: ${t.statusLabel || t.status}</p>
                <a href="detail-tiket.html?id=${t.id}">Lihat Detail</a>
              </article>
            </li>
          `;
        }).join("");
      }

      const completedOl = document.querySelector("section[aria-labelledby='selesai'] ol");
      if (completedOl) {
        const completedTickets = tickets.filter((t) => t.status === "SELESAI");
        completedOl.innerHTML = completedTickets.map((t) => {
          const cust = window.getCustomerById ? window.getCustomerById(t.customerId) : null;
          return `
            <li>
              <article>
                <h3>#${t.id} - ${t.device}</h3>
                <p>${cust ? cust.name : 'Pelanggan'}</p>
                <p>${t.diagnosisSummary || t.diagnosis || 'Servis selesai'}</p>
                <p>Status: Selesai</p>
                <p><a href="tiket-selesai.html?id=${t.id}">Lihat Detail</a></p>
              </article>
            </li>
          `;
        }).join("");
      }
    }

    // 5. Detail Tiket Teknisi (detail-tiket.html)
    if (window.location.pathname.includes("detail-tiket.html")) {
      const params = new URLSearchParams(window.location.search);
      const ticketId = params.get("id") || "URT-2026-001";
      const ticket = (window.getTicketById && window.getTicketById(ticketId)) || tickets[0];
      const cust = (window.getCustomerById && window.getCustomerById(ticket.customerId)) || customers[0];

      // Title & Status
      const h1 = document.querySelector("article header h1");
      if (h1) h1.textContent = `Detail Tiket #${ticket.id}`;
      document.title = `Detail Tiket - #${ticket.id}`;

      const statusBadge = document.querySelector("article header .status");
      if (statusBadge) {
        statusBadge.className = `status status--${ticket.statusClass || 'warning'}`;
        statusBadge.textContent = ticket.statusLabel || ticket.status;
      }

      // Customer & Device DL
      const dl = document.querySelector("section[aria-labelledby='data-customer'] dl");
      if (dl) {
        dl.innerHTML = `
          <dt>Nama Customer</dt><dd>${cust.name}</dd>
          <dt>Nomor HP</dt><dd>${cust.phone}</dd>
          <dt>Perangkat</dt><dd>${ticket.device}</dd>
          <dt>Keluhan Kerusakan</dt><dd>${ticket.issue}</dd>
        `;
      }

      // Form diagnosis
      const kerusakanTextarea = document.getElementById("kerusakan");
      if (kerusakanTextarea && !kerusakanTextarea.value.trim()) {
        kerusakanTextarea.value = ticket.diagnosis;
      }
      const biayaInput = document.getElementById("biaya");
      if (biayaInput && (!biayaInput.value || biayaInput.value === "250000")) {
        biayaInput.value = ticket.estimatedCost;
      }
      const selesaiInput = document.getElementById("selesai");
      if (selesaiInput && ticket.estimatedCompletionDate) {
        selesaiInput.value = ticket.estimatedCompletionDate;
      }

      // Customer message textarea
      const pesanTextarea = document.getElementById("pesan");
      if (pesanTextarea) {
        pesanTextarea.value = `Halo ${cust.name}, diagnosis ${ticket.device} telah selesai. ${ticket.diagnosis} Estimasi servis ${window.formatCurrency ? window.formatCurrency(ticket.estimatedCost) : 'Rp' + ticket.estimatedCost}, selesai ${ticket.estimatedCompletion}. Silakan konfirmasi persetujuan biaya melalui portal pelanggan.`;
      }

      // Timeline Steps in Detail Tiket Teknisi
      const timelineOl = document.querySelector(".timeline-steps");
      if (timelineOl && ticket.timeline) {
        timelineOl.innerHTML = ticket.timeline.map((step) => {
          const isDone = step.done;
          const isCurrent = step.current;
          const stepClass = isDone ? "is-done" : (isCurrent ? "is-current" : "");
          const marker = isDone ? "&#10003;" : (isCurrent ? "&bull;" : "&cir;");
          return `
            <li class="timeline-step ${stepClass}">
              <span class="timeline-step__marker" aria-hidden="true">${marker}</span>
              <div class="timeline-step__content">
                <strong class="timeline-step__title">${step.title}</strong>
                <div class="timeline-step__meta">
                  <span class="timeline-step__time">${step.time}</span>
                  ${step.actor ? `<span class="timeline-step__actor">&bull; ${step.actor}</span>` : ""}
                </div>
              </div>
            </li>
          `;
        }).join("");
      }
    }

    // 6. Profil Teknisi (profil.html)
    if (window.location.pathname.includes("profil.html")) {
      const h2 = document.querySelector("article header h2");
      if (h2) h2.textContent = technician.name;

      const namaInput = document.getElementById("nama");
      if (namaInput) namaInput.value = technician.name;
      const usernameInput = document.getElementById("username");
      if (usernameInput) usernameInput.value = technician.username;
      const emailInput = document.getElementById("email");
      if (emailInput) emailInput.value = technician.email;
      const telInput = document.getElementById("telepon");
      if (telInput) telInput.value = technician.phone;
      const alamatInput = document.getElementById("alamat");
      if (alamatInput) alamatInput.value = technician.address;
    }

    // 7. Tiket Selesai (tiket-selesai.html)
    if (window.location.pathname.includes("tiket-selesai.html")) {
      const params = new URLSearchParams(window.location.search);
      const ticketId = params.get("id") || "URT-2026-004";
      const ticket = (window.getTicketById && window.getTicketById(ticketId)) || tickets[3] || tickets[0];
      const cust = (window.getCustomerById && window.getCustomerById(ticket.customerId)) || customers[0];

      const h1 = document.querySelector("main h1");
      if (h1) h1.textContent = `Tiket Selesai #${ticket.id}`;

      const dl = document.querySelector("main dl");
      if (dl) {
        dl.innerHTML = `
          <dt>Nomor Tiket</dt><dd>#${ticket.id}</dd>
          <dt>Pelanggan</dt><dd>${cust.name}</dd>
          <dt>Perangkat</dt><dd>${ticket.device}</dd>
          <dt>Tindakan Selesai</dt><dd>${ticket.diagnosisSummary || ticket.diagnosis}</dd>
          <dt>Total Biaya</dt><dd>${window.formatCurrency ? window.formatCurrency(ticket.estimatedCost) : 'Rp' + ticket.estimatedCost}</dd>
          <dt>Status</dt><dd><span class="status status--success">SELESAI</span></dd>
        `;
      }
    }

    // 8. Estimasi (estimasi.html)
    if (window.location.pathname.includes("estimasi.html")) {
      const params = new URLSearchParams(window.location.search);
      const ticketId = params.get("id") || "URT-2026-001";
      const ticket = (window.getTicketById && window.getTicketById(ticketId)) || tickets[0];
      const cust = (window.getCustomerById && window.getCustomerById(ticket.customerId)) || customers[0];

      const h1 = document.querySelector("main h1");
      if (h1) h1.textContent = `Estimasi Servis #${ticket.id}`;
      const subtitle = document.querySelector("main p");
      if (subtitle) subtitle.textContent = `Ringkasan estimasi biaya untuk ${ticket.device} milik ${cust.name}.`;
    }
  }

  function setupFilterPills() {
    const filterButtons = document.querySelectorAll(".pill-filter-item");
    filterButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        filterButtons.forEach((b) => b.classList.remove("is-active"));
        btn.classList.add("is-active");
      });
    });
  }

  function init() {
    setupTeknisiSidebar();
    populateTeknisiPortalData();
    setupFilterPills();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

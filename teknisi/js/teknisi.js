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

    const page = window.location.pathname.split('/').pop();
    const ticketPages = ['detail-tiket.html', 'estimasi.html', 'ringkasan-terkirim.html', 'tiket-selesai.html'];
    const selectedTicket = ticketPages.includes(page) ? window.getSelectedRecord('tickets') : null;
    if (ticketPages.includes(page) && !selectedTicket) return;
    if (selectedTicket) window.preserveTicketLinks(document.querySelector('main'), selectedTicket);

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
        statBigNumbers[0].textContent = techTickets.length;
        statBigNumbers[1].textContent = techTickets.filter((ticket) => !['SELESAI', 'DITOLAK'].includes(ticket.status)).length;
        statBigNumbers[2].textContent = techTickets.filter((ticket) => ticket.status === 'SELESAI').length;
      }

      // Urgent / Selected Ticket card
      const ticketCard = document.querySelector(".content-card .ticket-id-title");
      if (ticketCard) {
        const urgentTicket = techTickets.find((t) => t.status !== "SELESAI" && t.status !== "DITOLAK");
        if (!urgentTicket) {
          ticketCard.textContent = "Tidak ada tiket aktif";
          const open = ticketCard.closest('.content-card')?.querySelector('.btn-open-ticket');
          if (open) open.hidden = true;
          ticketCard.closest('.content-card')?.setAttribute('hidden', '');
          document.querySelector('.timeline-flow')?.closest('.content-card')?.setAttribute('hidden', '');
        } else {
        window.renderDashboardTimeline(document.querySelector('.timeline-flow'), urgentTicket);
        const cust = window.getCustomerById ? window.getCustomerById(urgentTicket.customerId) : null;

        ticketCard.textContent = `#${urgentTicket.id}`;
        const badge = ticketCard.closest(".content-card")?.querySelector(".badge-status-soft-blue");
        if (badge) badge.textContent = urgentTicket.statusLabel || "Menunggu Persetujuan";

        const detailVals = ticketCard.closest(".content-card")?.querySelectorAll(".detail-field-val");
        if (detailVals && detailVals.length >= 3) {
          detailVals[0].textContent = urgentTicket.device;
          detailVals[1].textContent = `\u201C${urgentTicket.issue}\u201D`;
          detailVals[2].textContent = cust ? cust.name : "Pelanggan";
        }

        const openBtn = ticketCard.closest(".content-card")?.querySelector(".btn-open-ticket");
        if (openBtn) openBtn.href = `detail-tiket.html?id=${urgentTicket.id}`;
      }

      }

      // Urgent queue table
      const queueTbody = document.querySelector(".clean-table tbody");
      if (queueTbody) {
        const displayTickets = techTickets.filter((t) => t.status !== "SELESAI" && t.status !== "DITOLAK");

        const renderQueueRows = (filteredTickets) => {
          queueTbody.innerHTML = filteredTickets.map((t) => {
            const cust = window.getCustomerById ? window.getCustomerById(t.customerId) : null;
            const custName = cust ? cust.name : "Pelanggan";
            const pillClass = t.status === "SELESAI" ? "status-pill-green" : (t.status === "PERBAIKAN" || t.status === "QC") ? "status-pill-blue" : "status-pill-amber";
            const priorityClass = t.priority === "Tinggi" ? "priority-danger" : "priority-default";
            return `
              <tr data-status="${t.status}">
                <td><a href="detail-tiket.html?id=${t.id}" class="table-ticket-link">#${t.id}</a></td>
                <td><strong>${window.escapeHtml(t.device)}</strong></td>
                <td>${window.escapeHtml(custName)}</td>
                <td><span class="${pillClass}">${t.statusLabel || t.status}</span></td>
                <td><span class="${priorityClass}">${t.priority || 'Normal'}</span></td>
                <td><a href="detail-tiket.html?id=${t.id}" class="action-arrow-link">Kelola &rarr;</a></td>
              </tr>
            `;
          }).join("");
        };

        renderQueueRows(displayTickets);

        const filterCounts = {
          filterSemua: ['Semua', displayTickets.length],
          filterMenunggu: ['Menunggu', displayTickets.filter((t) => ['MASUK', 'DIAGNOSIS', 'PERSETUJUAN'].includes(t.status)).length],
          filterPengerjaan: ['Pengerjaan', displayTickets.filter((t) => ['PERBAIKAN', 'QC'].includes(t.status)).length]
        };
        Object.entries(filterCounts).forEach(([id, [label, count]]) => {
          const button = document.getElementById(id);
          if (button) button.textContent = `${label} (${count})`;
        });

        // Filter pills hookup
        const filterSemua = document.getElementById("filterSemua");
        const filterMenunggu = document.getElementById("filterMenunggu");
        const filterPengerjaan = document.getElementById("filterPengerjaan");

        if (filterSemua) {
          filterSemua.addEventListener("click", () => renderQueueRows(displayTickets));
        }
        if (filterMenunggu) {
          filterMenunggu.addEventListener("click", () => {
            renderQueueRows(displayTickets.filter((t) => t.status === "MASUK" || t.status === "PERSETUJUAN" || t.status === "DIAGNOSIS"));
          });
        }
        if (filterPengerjaan) {
          filterPengerjaan.addEventListener("click", () => {
            renderQueueRows(displayTickets.filter((t) => t.status === "PERBAIKAN" || t.status === "QC"));
          });
        }
      }
    }

    // 3. Antrean Servis (antrean.html)
    const antreanTable = document.querySelector("table caption");
    if (antreanTable && ["antrean.html", "antrian-servis.html"].includes(page)) {
      const activeList = tickets.filter((t) => t.status !== "SELESAI" && t.status !== "DITOLAK");
      const tbody = document.querySelector("table tbody");
      if (tbody) {
        tbody.innerHTML = activeList.map((t) => {
          const cust = window.getCustomerById ? window.getCustomerById(t.customerId) : null;
          const custName = cust ? cust.name : "Pelanggan";
          return `
            <tr>
              <td><strong>#${t.id}</strong></td>
              <td>${window.escapeHtml(t.device)}</td>
              <td>${window.escapeHtml(custName)}</td>
              <td>${window.escapeHtml(t.issue)}</td>
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
        const diagCount = activeList.filter((t) => t.status === "DIAGNOSIS").length;
        const apprvCount = activeList.filter((t) => t.status === "PERSETUJUAN").length;
        const qcCount = activeList.filter((t) => t.status === "QC" || t.status === "PERBAIKAN").length;
        statsUl.innerHTML = `
          <li>Total aktif: ${activeList.length}</li>
          <li>Dalam diagnosa: ${diagCount}</li>
          <li>Menunggu persetujuan: ${apprvCount}</li>
          <li>Pemeriksaan QC: ${qcCount}</li>
        `;
      }
    }

    // 4. Riwayat Tiket (riwayat.html)
    if (["riwayat.html", "riwayat-tiket.html"].includes(page)) {
      const activeOl = document.querySelector("section[aria-labelledby='aktif'] ol");
      if (activeOl) {
        const activeTickets = tickets.filter((t) => t.status !== "SELESAI" && t.status !== "DITOLAK").slice(0, 3);
        activeOl.innerHTML = activeTickets.map((t) => {
          const cust = window.getCustomerById ? window.getCustomerById(t.customerId) : null;
          return `
            <li>
              <article>
                <h3>#${t.id} - ${window.escapeHtml(t.device)}</h3>
                <p>${window.escapeHtml(cust ? cust.name : 'Pelanggan')}</p>
                <p>${window.escapeHtml(t.issue)}</p>
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
                <h3>#${t.id} - ${window.escapeHtml(t.device)}</h3>
                <p>${window.escapeHtml(cust ? cust.name : 'Pelanggan')}</p>
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
      const ticket = selectedTicket;
      const cust = window.getCustomerById(ticket.customerId);

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
          <dt>Nama Customer</dt><dd>${window.escapeHtml(cust.name)}</dd>
          <dt>Nomor HP</dt><dd>${window.escapeHtml(cust.phone)}</dd>
          <dt>Perangkat</dt><dd>${window.escapeHtml(ticket.device)}</dd>
          <dt>Keluhan Kerusakan</dt><dd>${window.escapeHtml(ticket.issue)}</dd>
        `;
      }

      // Form diagnosis
      const kerusakanTextarea = document.getElementById("kerusakan");
      if (kerusakanTextarea) {
        kerusakanTextarea.value = ticket.diagnosis;
      }
      const biayaInput = document.getElementById("biaya");
      if (biayaInput) {
        biayaInput.value = ticket.estimatedCost;
      }
      const selesaiInput = document.getElementById("selesai");
      if (selesaiInput) selesaiInput.value = ticket.estimatedCompletionDate || "";
      const sparepartInput = document.getElementById("sparepart");
      if (sparepartInput) sparepartInput.value = ticket.sparepart || "";

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
                <strong class="timeline-step__title">${window.escapeHtml(step.title)}</strong>
                <div class="timeline-step__meta">
                  <span class="timeline-step__time">${window.escapeHtml(step.time)}</span>
                  ${step.actor ? `<span class="timeline-step__actor">&bull; ${window.escapeHtml(step.actor)}</span>` : ""}
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
      const ticket = selectedTicket;
      const cust = window.getCustomerById(ticket.customerId);

      document.querySelector("main h1").textContent = `Tiket #${ticket.id} - ${ticket.statusLabel}`;
      const summary = document.querySelector("section[aria-labelledby='ringkasan-selesai'] ul");
      if (summary) summary.innerHTML = `<li>#${ticket.id}</li><li>${window.formatCurrency(ticket.estimatedCost)}</li><li>${ticket.statusLabel}</li>`;
      const tbody = document.querySelector("main table tbody");
      if (tbody) tbody.innerHTML = `<tr>
        <td><strong>#${ticket.id}</strong></td><td>${window.escapeHtml(cust.name)}</td>
        <td>${window.escapeHtml(ticket.device)}</td><td>${window.escapeHtml(ticket.diagnosis)}</td>
        <td>${window.formatCurrency(ticket.estimatedCost)}</td><td>${ticket.statusLabel}</td>
        <td><a href="${window.recordUrl('detail-tiket.html', ticket)}">Lihat Detail</a></td></tr>`;
    }

    // Estimate and sent-summary pages share the selected ticket from the URL.
    if (["estimasi.html", "ringkasan-terkirim.html"].includes(page)) {
      const ticket = selectedTicket;
      const cust = window.getCustomerById(ticket.customerId);
      const tech = window.getTechnicianById(ticket.technicianId);
      const article = document.querySelector("main article");
      article.querySelector("h2").textContent = `#${ticket.id} - ${ticket.device}`;
      article.querySelector("p strong").textContent = ticket.statusLabel;
      const values = page === "estimasi.html"
        ? [cust.name, cust.phone, ticket.device, ticket.issue]
        : [cust.name, ticket.device, ticket.diagnosis, ticket.sparepart || "-",
          ticket.actionNeeded || "-", window.formatCurrency(ticket.estimatedCost), ticket.estimatedCompletion, tech?.name || "-"];
      article.querySelectorAll("section:first-of-type dl dd").forEach((dd, i) => { dd.textContent = values[i] || "-"; });
      if (page === "estimasi.html") {
        document.getElementById("diagnosa").value = ticket.diagnosis || "";
        document.getElementById("suku-cadang").value = ticket.sparepart || "";
        document.getElementById("qc").value = ticket.qcDate || "";
        document.getElementById("estimasi").value = ticket.estimatedCompletionDate || "";
      } else {
        const delivery = [cust.name, cust.phone, cust.email, ticket.summarySentAt || "-", "WhatsApp & Portal", ticket.statusLabel];
        document.querySelectorAll("section[aria-labelledby='pengiriman'] dd").forEach((dd, i) => { dd.textContent = delivery[i]; });
        document.querySelector("section[aria-labelledby='pesan'] p").textContent = ticket.customerMessage || ticket.diagnosis;
      }
    }

    if (selectedTicket) {
      document.querySelectorAll("main form[action]").forEach((form) => {
        form.addEventListener("submit", (event) => {
          event.preventDefault();
          if (!form.reportValidity()) return;
          const fields = new FormData(form);
          const diagnosis = fields.get("kerusakan") ?? fields.get("diagnosa") ?? selectedTicket.diagnosis;
          const cost = fields.has("biaya") ? Number(fields.get("biaya")) : selectedTicket.estimatedCost;
          const date = fields.get("selesai") ?? fields.get("estimasi") ?? selectedTicket.estimatedCompletionDate;
          const changes = { diagnosis, diagnosisSummary: diagnosis, estimatedCost: cost,
            sparepart: fields.get("sparepart") ?? fields.get("suku-cadang") ?? selectedTicket.sparepart,
            estimatedCompletionDate: date || "", estimatedCompletion: date || selectedTicket.estimatedCompletion,
            qcDate: fields.get("qc") ?? selectedTicket.qcDate ?? "",
            customerMessage: fields.get("pesan") ?? selectedTicket.customerMessage ?? "" };
          if (cost !== selectedTicket.estimatedCost) changes.costBreakdown = [{ item: "Jasa Servis & Sparepart", amount: cost }];
          const target = form.getAttribute("action");
          const sent = target === "ringkasan-terkirim.html";
          if (sent) changes.summarySentAt = new Date().toLocaleString("id-ID");
          const saved = sent
            ? window.setTicketStatus(selectedTicket, "PERSETUJUAN", changes)
            : window.saveRecord("tickets", selectedTicket.id, changes);
          if (saved) window.location.href = window.recordUrl(target, selectedTicket);
        });
      });
      const complete = document.querySelector('main a[href*="tiket-selesai.html"]');
      if (complete && page === "detail-tiket.html") complete.addEventListener("click", (event) => {
        event.preventDefault();
        if (window.setTicketStatus(selectedTicket, "SELESAI")) window.location.href = window.recordUrl("tiket-selesai.html", selectedTicket);
      });
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

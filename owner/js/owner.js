(() => {
  "use strict";

  const page = window.location.pathname.split('/').pop();
  const selectedCollections = {
    'detail-tiket.html': 'tickets',
    'detail-teknisi.html': 'technicians', 'edit-teknisi.html': 'technicians',
    'detail-pelanggan.html': 'customers', 'edit-pelanggan.html': 'customers',
    'detail-layanan.html': 'services', 'edit-layanan.html': 'services'
  };
  const collection = selectedCollections[page];
  const selectedRecord = collection ? window.getSelectedRecord(collection) : null;
  if (collection && !selectedRecord) return;
  if (selectedRecord) {
    document.querySelectorAll('main a[href^="edit-"]').forEach((link) => {
      link.href = window.recordUrl(link.getAttribute('href'), selectedRecord);
    });
  }

  const toast = document.getElementById("toast");
  let toastTimer;

  function showToast(message) {
    if (!toast) return;
    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add("is-visible");
    toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 2200);
  }

  function normalize(value) {
    return String(value || "").trim().toLowerCase();
  }

  function getCheckedValues(container, selector) {
    if (!container) return [];
    return Array.from(container.querySelectorAll(selector))
      .filter((input) => input.checked)
      .map((input) => input.value);
  }

  function wirePopover(toggle, panel) {
    if (!toggle || !panel) return () => {};

    const close = () => {
      panel.hidden = true;
      toggle.setAttribute("aria-expanded", "false");
    };

    toggle.addEventListener("click", (event) => {
      event.stopPropagation();
      const open = panel.hidden;
      panel.hidden = !open;
      toggle.setAttribute("aria-expanded", String(open));
    });

    panel.addEventListener("click", (event) => event.stopPropagation());

    document.addEventListener("click", (event) => {
      if (!panel.hidden && !panel.contains(event.target) && !toggle.contains(event.target)) close();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !panel.hidden) {
        close();
        toggle.focus();
      }
    });

    return close;
  }

  function downloadText(filename, content, type = "text/plain;charset=utf-8") {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  async function copyText(text) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const field = document.createElement("textarea");
        field.value = text;
        field.setAttribute("readonly", "");
        field.style.position = "fixed";
        field.style.opacity = "0";
        document.body.appendChild(field);
        field.select();
        document.execCommand("copy");
        field.remove();
      }
      showToast("Tautan berhasil disalin.");
    } catch {
      showToast("Tautan belum dapat disalin.");
    }
  }

  document.querySelectorAll(".copy-link").forEach((button) => {
    button.addEventListener("click", () => copyText(button.dataset.copy || ""));
  });

  document.getElementById("notificationButton")?.addEventListener("click", () => {
    showToast("Tidak ada notifikasi baru.");
  });

  /* ==========================================================================
     Central Data Layer Integration for Owner Portal
     Populates HTML dynamic elements from window.URT_DATA
     ========================================================================== */
  function populateOwnerPortalData() {
    if (typeof window.URT_DATA === "undefined") return;
    const { owner, technicians, customers, tickets, services } = window.URT_DATA;

    // 1. Dashboard Statistics (beranda-owner.html)
    const statCards = document.querySelectorAll(".stats-grid .stat-card");
    if (statCards.length >= 4) {
      const stats = typeof window.getDashboardStats === "function" ? window.getDashboardStats() : {
        activeTickets: 28,
        totalCustomers: 186,
        activeTechnicians: 8,
        subscriptionRemainingDays: 328
      };
      const v0 = statCards[0].querySelector(".stat-value");
      if (v0) v0.innerHTML = `<span class="stat-accent stat-accent--blue"></span>${stats.activeTickets}`;
      const v1 = statCards[1].querySelector(".stat-value");
      if (v1) v1.innerHTML = `<span class="stat-accent stat-accent--green"></span>${stats.totalCustomers}`;
      const v2 = statCards[2].querySelector(".stat-value");
      if (v2) v2.innerHTML = `<span class="stat-accent stat-accent--orange"></span>${stats.activeTechnicians}`;
      const v3 = statCards[3].querySelector(".stat-value");
      if (v3) v3.innerHTML = `<span class="stat-accent stat-accent--blue"></span>${stats.subscriptionRemainingDays} hari`;
    }

    // 1b. Recent tickets in dashboard
    const activityTableBody = document.querySelector(".activity-panel tbody");
    if (activityTableBody) {
      const recentTickets = tickets.slice(0, 3);
      activityTableBody.innerHTML = recentTickets.map((t) => {
        const cust = window.getCustomerById ? window.getCustomerById(t.customerId) : null;
        const tech = window.getTechnicianById ? window.getTechnicianById(t.technicianId) : null;
        const custName = cust ? cust.name : "Pelanggan";
        const techName = tech ? tech.name.split(" ").slice(0, 2).join(" ") : "Teknisi";
        return `
          <tr>
            <td><a class="ticket-link" href="detail-tiket.html?id=${t.id}">#${t.id}</a></td>
            <td><strong>${window.escapeHtml(t.device)}</strong></td>
            <td>${window.escapeHtml(custName)}</td>
            <td>${window.escapeHtml(techName)}</td>
            <td><span class="status status--${t.statusClass || 'warning'}">${t.status}</span></td>
          </tr>
        `;
      }).join("");
    }

    // 2. Tiket Servis Table (tiket-servis.html)
    const ticketTable = document.getElementById("ticketTable");
    if (ticketTable) {
      const tbody = ticketTable.querySelector("tbody");
      if (tbody) {
        const rowsHtml = tickets.map((t) => {
          const cust = window.getCustomerById ? window.getCustomerById(t.customerId) : null;
          const tech = window.getTechnicianById ? window.getTechnicianById(t.technicianId) : null;
          const custName = cust ? cust.name : "Pelanggan";
          const techName = tech ? tech.name.split(" ").slice(0, 2).join(" ") : "Teknisi";
          const searchContent = `#${t.id.toLowerCase()} ${t.device.toLowerCase()} ${custName.toLowerCase()} ${techName.toLowerCase()} ${t.status.toLowerCase()}`;
          return `
            <tr data-ticket-row data-search="${window.escapeHtml(searchContent)}" data-status="${t.status.toLowerCase()}" data-month="${t.month || '2026-08'}">
              <td><strong>#${t.id}</strong></td>
              <td>${window.escapeHtml(t.device)}</td>
              <td>${window.escapeHtml(custName)}</td>
              <td>${window.escapeHtml(techName)}</td>
              <td><span class="status status--${t.statusClass || 'warning'}">${t.status}</span></td>
              <td><a class="detail-action" href="detail-tiket.html?id=${t.id}">Detail</a></td>
            </tr>
          `;
        }).join("");

        tbody.innerHTML = rowsHtml + `<tr id="ticketEmptyState" class="empty-row" hidden><td colspan="6">Tidak ada tiket yang sesuai dengan pencarian atau filter.</td></tr>`;
      }
    }

    // 3. Teknisi Table (teknisi.html)
    const techTable = document.querySelector(".technician-table tbody");
    if (techTable) {
      techTable.innerHTML = technicians.map((tech) => {
        const searchContent = `${tech.name.toLowerCase()} ${tech.username.toLowerCase()} ${tech.specialty.toLowerCase()}`;
        return `
          <tr data-technician-row data-search="${window.escapeHtml(searchContent)}" data-specialty="${window.escapeHtml(tech.specialties.join(' '))}" data-workload="${tech.workload}" data-status="${tech.status}">
            <td><strong>${window.escapeHtml(tech.name)}</strong></td>
            <td>${window.escapeHtml(tech.username)}</td>
            <td>${window.escapeHtml(tech.specialty)}</td>
            <td>${tech.activeTickets} tiket</td>
            <td><span class="status status--success">${tech.status.toUpperCase()}</span></td>
            <td>
              <div class="technician-actions">
                <a href="detail-teknisi.html?id=${tech.slug || tech.id}">Lihat</a>
                <a href="edit-teknisi.html?id=${tech.slug || tech.id}">Edit</a>
              </div>
            </td>
          </tr>
        `;
      }).join("") + `<tr id="technicianEmptyState" class="empty-row" hidden><td colspan="6">Tidak ada teknisi yang sesuai.</td></tr>`;
    }

    // 4. Pelanggan Table (pelanggan.html)
    const custTable = document.querySelector(".resource-table tbody");
    const isPelangganPage = window.location.pathname.includes("pelanggan.html");
    if (custTable && isPelangganPage) {
      custTable.innerHTML = customers.map((c) => {
        const searchContent = `${c.name.toLowerCase()} ${c.email.toLowerCase()} ${c.phone}`;
        const activeCount = tickets.filter((t) => t.customerId === c.id && t.status !== "SELESAI" && t.status !== "DITOLAK").length;
        const ticketSummary = activeCount > 0 ? `${activeCount} aktif` : `1 selesai`;
        return `
          <tr data-customer-row data-search="${window.escapeHtml(searchContent)}" data-status="${c.status}">
            <td><strong>${window.escapeHtml(c.name)}</strong></td>
            <td>${window.escapeHtml(c.email)}</td>
            <td>${window.escapeHtml(c.phone)}</td>
            <td>${ticketSummary}</td>
            <td>${c.registeredDate}</td>
            <td>
              <div class="row-actions">
                <a href="detail-pelanggan.html?id=${c.slug || c.id}">Lihat</a>
                <a href="edit-pelanggan.html?id=${c.slug || c.id}">Edit</a>
              </div>
            </td>
          </tr>
        `;
      }).join("") + `<tr id="customerEmptyState" class="empty-row" hidden><td colspan="6">Tidak ada pelanggan yang sesuai.</td></tr>`;
    }

    // 5. Layanan Table (layanan.html)
    const isLayananPage = window.location.pathname.includes("layanan.html");
    if (custTable && isLayananPage) {
      custTable.innerHTML = services.map((s) => {
        const searchContent = `${s.name.toLowerCase()} ${s.category.toLowerCase()}`;
        return `
          <tr data-service-row data-search="${window.escapeHtml(searchContent)}" data-category="${window.escapeHtml(s.categories.join(' '))}" data-status="${s.status}">
            <td><strong>${window.escapeHtml(s.name)}</strong></td>
            <td>${window.escapeHtml(s.category)}</td>
            <td>${s.priceLabel || window.formatCurrency(s.price)}</td>
            <td>${window.escapeHtml(s.duration)}</td>
            <td><span class="status status--success">${s.status.toUpperCase()}</span></td>
            <td>
              <div class="row-actions">
                <a href="detail-layanan.html?id=${s.slug || s.id}">Lihat</a>
                <a href="edit-layanan.html?id=${s.slug || s.id}">Edit</a>
              </div>
            </td>
          </tr>
        `;
      }).join("") + `<tr id="serviceEmptyState" class="empty-row" hidden><td colspan="6">Tidak ada layanan yang sesuai.</td></tr>`;
    }

    // 6. Detail Tiket (detail-tiket.html)
    const ticketIdHeading = document.getElementById("ticketIdHeading");
    if (ticketIdHeading) {
      const ticket = selectedRecord;
      const customer = window.getCustomerById(ticket.customerId);

      ticketIdHeading.textContent = `#${ticket.id}`;
      const subtitleEl = ticketIdHeading.nextElementSibling;
      if (subtitleEl) {
        subtitleEl.textContent = `${ticket.device} • ${customer.name} • Servis Masuk ${ticket.createdAt.split(',')[0]}`;
      }

      const badge = document.getElementById("ticketStatusBadge");
      if (badge) {
        badge.className = `status status--${ticket.statusClass || 'warning'}`;
        badge.textContent = ticket.statusLabel.toUpperCase();
      }

      // Meta list: Card 1
      const metaList1 = document.querySelector(".detail-card .meta-list");
      if (metaList1) {
        metaList1.innerHTML = `
          <dt>Nomor Tiket</dt><dd>#${ticket.id}</dd>
          <dt>Nama Perangkat</dt><dd>${ticket.deviceDetail || ticket.device}</dd>
          <dt>Nomor Seri</dt><dd>${ticket.serialNumber || 'SN-' + ticket.id}</dd>
          <dt>Tanggal Masuk</dt><dd>${ticket.createdAt}</dd>
          <dt>Estimasi Selesai</dt><dd>${ticket.estimatedCompletion}</dd>
          <dt>Keluhan Awal</dt><dd style="font-weight: 500; line-height: 1.5;">${window.escapeHtml(ticket.issue)}</dd>
        `;
      }

      // Diagnosis notes & cost box: Card 2
      const card2 = document.querySelectorAll(".ticket-detail-grid > div:first-child .detail-card")[1];
      if (card2) {
        const diagNote = card2.querySelector("p");
        if (diagNote) {
          diagNote.innerHTML = `<strong>Catatan Teknisi:</strong> ${window.escapeHtml(ticket.diagnosis)}`;
        }
        const costBox = card2.querySelector(".cost-box");
        if (costBox) {
          const breakdown = ticket.costBreakdown && ticket.costBreakdown.length
            ? ticket.costBreakdown
            : [{ item: "Jasa Perbaikan & Pemeriksaan", amount: ticket.estimatedCost }];
          
          const breakdownHtml = breakdown.map((item) => `
            <div class="cost-row">
              <span>${window.escapeHtml(item.item)}</span>
              <strong>${window.formatCurrency(item.amount)}</strong>
            </div>
          `).join("");

          costBox.innerHTML = breakdownHtml + `
            <div class="cost-row cost-row--total">
              <span>Total Estimasi Biaya Servis</span>
              <span>${window.formatCurrency(ticket.estimatedCost)}</span>
            </div>
          `;
        }
      }

      // Technician Select dropdown: Card 3
      const techSelect = document.getElementById("technicianSelect");
      if (techSelect) {
        techSelect.innerHTML = technicians.map((t) => {
          const isSelected = t.id === ticket.technicianId ? "selected" : "";
          return `<option value="${t.slug}" ${isSelected}>${window.escapeHtml(t.name)} (${window.escapeHtml(t.specialty)} • ${t.activeTickets} Tiket)</option>`;
        }).join("");
      }

      // Customer Card: Card 4
      const custCard = document.querySelectorAll(".ticket-detail-grid > div:last-child .detail-card")[1];
      if (custCard) {
        const link = custCard.querySelector(".detail-action");
        if (link) link.href = `detail-pelanggan.html?id=${customer.slug || customer.id}`;

        const dl = custCard.querySelector(".meta-list");
        if (dl) {
          dl.innerHTML = `
            <dt>Nama Lengkap</dt><dd>${window.escapeHtml(customer.name)}</dd>
            <dt>No. WhatsApp</dt><dd>${window.escapeHtml(customer.phone)}</dd>
            <dt>Email</dt><dd>${window.escapeHtml(customer.email)}</dd>
            <dt>Alamat</dt><dd>${window.escapeHtml(customer.address)}</dd>
          `;
        }
      }

      // Timeline Steps: Card 5
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

    // 7. Detail Teknisi (detail-teknisi.html)
    const techProfileCard = document.querySelector(".tech-profile-card");
    if (techProfileCard && window.location.pathname.includes("detail-teknisi.html")) {
      const tech = selectedRecord;

      const avatar = techProfileCard.querySelector(".tech-header-row div > div:first-child");
      if (avatar) avatar.textContent = tech.initials || "TK";

      const h2 = techProfileCard.querySelector(".tech-header-row h2");
      if (h2) h2.textContent = tech.name;

      const sub = techProfileCard.querySelector(".tech-header-row h2 + span");
      if (sub) {
        sub.innerHTML = `Username: <strong>${window.escapeHtml(tech.username)}</strong> &bull; Spesialis: ${window.escapeHtml(tech.specialty)}`;
      }

      const dl = techProfileCard.querySelector(".tech-meta-grid");
      if (dl) {
        dl.innerHTML = `
          <div><dt>Email</dt><dd>${window.escapeHtml(tech.email)}</dd></div>
          <div><dt>Nomor Telepon</dt><dd>${window.escapeHtml(tech.phone)}</dd></div>
          <div><dt>Beban Tiket Aktif</dt><dd class="stat-badge-num">${tech.activeTickets} <span style="font-size: 14px; font-weight: 500; color: var(--text-muted);">tiket</span></dd></div>
          <div><dt>Total Tiket Selesai</dt><dd class="stat-badge-num" style="color: var(--success);">${tech.completedTickets} <span style="font-size: 14px; font-weight: 500; color: var(--text-muted);">unit</span></dd></div>
        `;
      }

      // Assigned tickets table
      const techTicketsTbody = document.querySelector(".data-table tbody");
      if (techTicketsTbody) {
        const assignedTickets = window.getTicketsByTechnicianId ? window.getTicketsByTechnicianId(tech.id) : [];
        if (assignedTickets.length) {
          techTicketsTbody.innerHTML = assignedTickets.map((t) => {
            const c = window.getCustomerById ? window.getCustomerById(t.customerId) : null;
            return `
              <tr>
                <td><strong>#${t.id}</strong></td>
                <td>${window.escapeHtml(t.device)}</td>
                <td>${c ? c.name : 'Pelanggan'}</td>
                <td><span class="status status--${t.statusClass || 'warning'}">${t.status}</span></td>
                <td>${t.estimatedCompletion}</td>
                <td><a class="detail-action" href="detail-tiket.html?id=${t.id}">Kelola</a></td>
              </tr>
            `;
          }).join("");
        } else {
          techTicketsTbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">Belum ada tiket yang ditugaskan saat ini.</td></tr>`;
        }
      }
    }

    // 8. Detail Pelanggan (detail-pelanggan.html)
    const custProfileCard = document.querySelector(".cust-profile-card");
    if (custProfileCard && window.location.pathname.includes("detail-pelanggan.html")) {
      const cust = selectedRecord;

      const avatar = custProfileCard.querySelector(".cust-header-row div > div:first-child");
      if (avatar) avatar.textContent = cust.initials || "PL";

      const h2 = custProfileCard.querySelector(".cust-header-row h2");
      if (h2) h2.textContent = cust.name;

      const sub = custProfileCard.querySelector(".cust-header-row h2 + span");
      if (sub) {
        sub.innerHTML = `Member Sejak: <strong>${cust.memberSince}</strong> &bull; Total Unit Diservis: <strong>${cust.totalDevices} Perangkat</strong>`;
      }

      const dl = custProfileCard.querySelector(".cust-meta-grid");
      if (dl) {
        dl.innerHTML = `
          <div><dt>Nomor WhatsApp</dt><dd>${window.escapeHtml(cust.phone)}</dd></div>
          <div><dt>Email</dt><dd>${window.escapeHtml(cust.email)}</dd></div>
          <div><dt>Alamat Domisili</dt><dd>${window.escapeHtml(cust.address)}</dd></div>
          <div><dt>Total Belanja Servis</dt><dd class="stat-badge-num">${window.formatCurrency(cust.totalSpent)}</dd></div>
        `;
      }

      // Customer Tickets History table
      const custTicketsTbody = document.querySelector(".data-table tbody");
      if (custTicketsTbody) {
        const custTickets = window.getTicketsByCustomerId ? window.getTicketsByCustomerId(cust.id) : [];
        if (custTickets.length) {
          custTicketsTbody.innerHTML = custTickets.map((t) => {
            const tech = window.getTechnicianById ? window.getTechnicianById(t.technicianId) : null;
            return `
              <tr>
                <td><strong>#${t.id}</strong></td>
                <td>${window.escapeHtml(t.device)}</td>
                <td>${t.actionNeeded || t.issue}</td>
                <td>${tech ? tech.name : 'Teknisi'}</td>
                <td><span class="status status--${t.statusClass || 'warning'}">${t.status}</span></td>
                <td>${window.formatCurrency(t.estimatedCost)}</td>
                <td><a class="detail-action" href="detail-tiket.html?id=${t.id}">Lihat</a></td>
              </tr>
            `;
          }).join("");
        } else {
          custTicketsTbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted);">Belum ada riwayat tiket untuk pelanggan ini.</td></tr>`;
        }
      }
    }

    // 9. Detail Layanan (detail-layanan.html)
    const svcDetailCard = document.querySelector(".service-detail-card");
    if (svcDetailCard && window.location.pathname.includes("detail-layanan.html")) {
      const svc = selectedRecord;

      const headerDiv = svcDetailCard.querySelector(".service-header-row > div");
      if (headerDiv) {
        headerDiv.innerHTML = `
          <span style="font-size: 12px; color: var(--primary); font-weight: 700; text-transform: uppercase;">${window.escapeHtml(svc.category)}</span>
          <h2 style="font-size: 22px; margin: 4px 0; color: var(--text);">${window.escapeHtml(svc.name)}</h2>
          <span style="color: var(--text-muted); font-size: 14px;">Estimasi Pengerjaan: <strong>${window.escapeHtml(svc.duration)}</strong></span>
        `;
      }

      const dl = svcDetailCard.querySelector(".service-meta-grid");
      if (dl) {
        dl.innerHTML = `
          <div><dt>Harga Dasar</dt><dd class="stat-badge-num">${svc.priceLabel || window.formatCurrency(svc.price)}</dd></div>
          <div><dt>Kategori</dt><dd>${window.escapeHtml(svc.category)}</dd></div>
          <div><dt>Total Unit Selesai</dt><dd class="stat-badge-num" style="color: var(--success);">18 <span style="font-size: 14px; font-weight: 500; color: var(--text-muted);">unit</span></dd></div>
          <div><dt>Garansi Layanan</dt><dd>30 Hari (Garansi Performa)</dd></div>
        `;
      }

      const descP = svcDetailCard.querySelector("p");
      if (descP && svc.description) {
        descP.textContent = svc.description;
      }
    }

    // 10. Profil Owner (profil-owner.html)
    const profileForm = document.getElementById("profileForm");
    if (profileForm && window.location.pathname.includes("profil-owner.html")) {
      const nameInput = profileForm.elements.namedItem("profileName");
      if (nameInput && !nameInput.value) nameInput.value = owner.name;
      const emailInput = profileForm.elements.namedItem("profileEmail");
      if (emailInput && !emailInput.value) emailInput.value = owner.email;
      const phoneInput = profileForm.elements.namedItem("profilePhone");
      if (phoneInput && !phoneInput.value) phoneInput.value = owner.phone;
      const usernameInput = profileForm.elements.namedItem("profileUsername");
      if (usernameInput && !usernameInput.value) usernameInput.value = owner.username;
    }
  }

  // Populate dynamic data across owner pages
  populateOwnerPortalData();

  // ---------------- Tiket Servis ----------------
  const ticketRows = Array.from(document.querySelectorAll("[data-ticket-row]"));
  if (ticketRows.length) {
    const search = document.getElementById("ticketSearch");
    const month = document.getElementById("monthFilter");
    const toggle = document.getElementById("filterToggle");
    const panel = document.getElementById("ticketFilterPanel");
    const empty = document.getElementById("ticketEmptyState");
    const summary = document.getElementById("ticketTableSummary");
    let statuses = [];
    const close = wirePopover(toggle, panel);

    const update = () => {
      const query = normalize(search?.value);
      const selectedMonth = month?.value || "all";
      let visible = 0;

      ticketRows.forEach((row) => {
        const ok =
          (!query || normalize(row.dataset.search).includes(query)) &&
          (selectedMonth === "all" || row.dataset.month === selectedMonth) &&
          (!statuses.length || statuses.includes(normalize(row.dataset.status)));
        row.hidden = !ok;
        if (ok) visible += 1;
      });

      if (empty) empty.hidden = visible !== 0;
      if (summary) {
        const defaultView = visible === ticketRows.length && selectedMonth === "2026-08" && !query && !statuses.length;
        summary.textContent = defaultView
          ? "Menampilkan 5 tiket terbaru • 28 tiket aktif di ServisKita"
          : `Menampilkan ${visible} dari ${ticketRows.length} tiket contoh • 28 tiket aktif di ServisKita`;
      }
    };

    search?.addEventListener("input", update);
    month?.addEventListener("change", update);
    document.getElementById("applyTicketFilter")?.addEventListener("click", () => {
      statuses = getCheckedValues(panel, 'input[name="ticketStatus"]');
      update();
      close();
      showToast(statuses.length ? `${statuses.length} filter status diterapkan.` : "Semua status ditampilkan.");
    });
    document.getElementById("resetTicketFilter")?.addEventListener("click", () => {
      panel?.querySelectorAll('input[name="ticketStatus"]').forEach((input) => input.checked = false);
      statuses = [];
      update();
      showToast("Filter status direset.");
    });
    update();
  }

  // ---------------- Teknisi ----------------
  const technicianRows = Array.from(document.querySelectorAll("[data-technician-row]"));
  if (technicianRows.length) {
    const search = document.getElementById("technicianSearch");
    const specialty = document.getElementById("specialtyFilter");
    const toggle = document.getElementById("technicianFilterToggle");
    const panel = document.getElementById("technicianFilterPanel");
    const empty = document.getElementById("technicianEmptyState");
    const summary = document.getElementById("technicianTableSummary");
    let workloads = [];
    let statuses = [];
    const close = wirePopover(toggle, panel);

    const update = () => {
      const query = normalize(search?.value);
      const selected = normalize(specialty?.value || "all");
      let visible = 0;

      technicianRows.forEach((row) => {
        const specialties = normalize(row.dataset.specialty).split(/\s+/);
        const ok =
          (!query || normalize(row.dataset.search).includes(query)) &&
          (selected === "all" || specialties.includes(selected)) &&
          (!workloads.length || workloads.includes(normalize(row.dataset.workload))) &&
          (!statuses.length || statuses.includes(normalize(row.dataset.status)));
        row.hidden = !ok;
        if (ok) visible += 1;
      });

      if (empty) empty.hidden = visible !== 0;
      if (summary) summary.textContent = `Menampilkan ${visible} dari ${technicianRows.length} teknisi`;
    };

    search?.addEventListener("input", update);
    specialty?.addEventListener("change", update);

    document.getElementById("applyTechnicianFilter")?.addEventListener("click", () => {
      workloads = getCheckedValues(panel, 'input[name="workloadFilter"]');
      statuses = getCheckedValues(panel, 'input[name="technicianStatusFilter"]');
      update();
      close();
      showToast(`${workloads.length + statuses.length || 0} filter teknisi diterapkan.`);
    });

    document.getElementById("resetTechnicianFilter")?.addEventListener("click", () => {
      panel?.querySelectorAll('input[type="checkbox"]').forEach((input) => input.checked = false);
      workloads = [];
      statuses = [];
      update();
      showToast("Filter teknisi direset.");
    });
    update();
  }

  // ---------------- Layanan ----------------
  const serviceRows = Array.from(document.querySelectorAll("[data-service-row]"));
  if (serviceRows.length) {
    const search = document.getElementById("serviceSearch");
    const category = document.getElementById("serviceCategory");
    const toggle = document.getElementById("serviceFilterToggle");
    const panel = document.getElementById("serviceFilterPanel");
    const empty = document.getElementById("serviceEmptyState");
    const summary = document.getElementById("serviceTableSummary");
    let statuses = [];
    const close = wirePopover(toggle, panel);

    const update = () => {
      const query = normalize(search?.value);
      const selected = normalize(category?.value || "all");
      let visible = 0;
      serviceRows.forEach((row) => {
        const cats = normalize(row.dataset.category).split(/\s+/);
        const ok =
          (!query || normalize(row.dataset.search).includes(query)) &&
          (selected === "all" || cats.includes(selected)) &&
          (!statuses.length || statuses.includes(normalize(row.dataset.status)));
        row.hidden = !ok;
        if (ok) visible += 1;
      });
      if (empty) empty.hidden = visible !== 0;
      if (summary) summary.textContent = `Menampilkan ${visible} dari ${serviceRows.length} layanan`;
    };

    search?.addEventListener("input", update);
    category?.addEventListener("change", update);
    document.getElementById("applyServiceFilter")?.addEventListener("click", () => {
      statuses = getCheckedValues(panel, 'input[name="serviceStatus"]');
      update();
      close();
      showToast(statuses.length ? "Filter layanan diterapkan." : "Semua layanan ditampilkan.");
    });
    document.getElementById("resetServiceFilter")?.addEventListener("click", () => {
      panel?.querySelectorAll('input[type="checkbox"]').forEach((input) => input.checked = false);
      statuses = [];
      update();
      showToast("Filter layanan direset.");
    });
    update();
  }

  // ---------------- Pelanggan ----------------
  const customerRows = Array.from(document.querySelectorAll("[data-customer-row]"));
  if (customerRows.length) {
    const search = document.getElementById("customerSearch");
    const status = document.getElementById("customerStatus");
    const toggle = document.getElementById("customerFilterToggle");
    const panel = document.getElementById("customerFilterPanel");
    const empty = document.getElementById("customerEmptyState");
    const summary = document.getElementById("customerTableSummary");
    let augustOnly = false;
    const close = wirePopover(toggle, panel);

    const update = () => {
      const query = normalize(search?.value);
      const selected = normalize(status?.value || "all");
      let visible = 0;
      customerRows.forEach((row) => {
        const ok =
          (!query || normalize(row.dataset.search).includes(query)) &&
          (selected === "all" || normalize(row.dataset.status) === selected);
        row.hidden = !ok;
        if (ok) visible += 1;
      });
      if (empty) empty.hidden = visible !== 0;
      if (summary) summary.textContent = `Menampilkan ${visible} dari 186 pelanggan • Halaman 1`;
    };

    search?.addEventListener("input", update);
    status?.addEventListener("change", update);
    document.getElementById("applyCustomerFilter")?.addEventListener("click", () => {
      augustOnly = !!panel?.querySelector('input[name="customerPeriod"]')?.checked;
      update();
      close();
      showToast(augustOnly ? "Filter pendaftaran Agustus 2026 diterapkan." : "Filter pelanggan diterapkan.");
    });
    document.getElementById("resetCustomerFilter")?.addEventListener("click", () => {
      panel?.querySelectorAll('input[type="checkbox"]').forEach((input) => input.checked = false);
      augustOnly = false;
      update();
      showToast("Filter pelanggan direset.");
    });
    update();
  }

  // ---------------- Pengaturan ----------------
  const settingsForm = document.getElementById("settingsForm");
  if (settingsForm) {
    const storageKey = "yst-owner-settings";
    const success = document.getElementById("settingsSuccess");

    const collect = () => Object.fromEntries(new FormData(settingsForm).entries());
    const apply = (data) => {
      Object.entries(data || {}).forEach(([name, value]) => {
        const field = settingsForm.elements.namedItem(name);
        if (!field) return;
        if (field.type === "checkbox") field.checked = value === true || value === "on";
        else field.value = value;
      });
    };

    const saved = JSON.parse(localStorage.getItem(storageKey) || "null");
    if (saved) apply(saved);

    document.getElementById("saveSettings")?.addEventListener("click", () => {
      const data = collect();
      ["waNotification", "emailNotification", "costApproval"].forEach((name) => {
        data[name] = settingsForm.elements.namedItem(name)?.checked || false;
      });
      localStorage.setItem(storageKey, JSON.stringify(data));
      success?.removeAttribute("hidden");
      showToast("Pengaturan berhasil disimpan.");
    });

    document.getElementById("resetSettings")?.addEventListener("click", () => {
      const currentSaved = JSON.parse(localStorage.getItem(storageKey) || "null");
      if (currentSaved) apply(currentSaved);
      else settingsForm.reset();
      showToast("Perubahan yang belum disimpan dibatalkan.");
    });
  }

  // ---------------- Profil ----------------
  const profileForm = document.getElementById("profileForm");
  if (profileForm) {
    const storageKey = "yst-owner-profile";
    const saved = JSON.parse(localStorage.getItem(storageKey) || "null");

    const apply = (data) => {
      Object.entries(data || {}).forEach(([name, value]) => {
        const field = profileForm.elements.namedItem(name);
        if (field) field.value = value;
      });
    };
    if (saved) apply(saved);

    document.getElementById("saveProfile")?.addEventListener("click", () => {
      const password = profileForm.elements.namedItem("newPassword")?.value || "";
      const confirm = profileForm.elements.namedItem("confirmPassword")?.value || "";
      if (password && password !== confirm) {
        showToast("Konfirmasi kata sandi belum sama.");
        profileForm.elements.namedItem("confirmPassword")?.focus();
        return;
      }
      const data = Object.fromEntries(new FormData(profileForm).entries());
      data.newPassword = "";
      data.confirmPassword = "";
      localStorage.setItem(storageKey, JSON.stringify(data));
      profileForm.elements.namedItem("newPassword").value = "";
      profileForm.elements.namedItem("confirmPassword").value = "";
      showToast("Profil berhasil disimpan.");
    });

    document.getElementById("cancelProfile")?.addEventListener("click", () => {
      const current = JSON.parse(localStorage.getItem(storageKey) || "null");
      if (current) apply(current);
      else profileForm.reset();
      profileForm.elements.namedItem("newPassword").value = "";
      profileForm.elements.namedItem("confirmPassword").value = "";
      showToast("Perubahan profil dibatalkan.");
    });
  }

  // ---------------- Langganan / invoice ----------------
  document.querySelectorAll(".invoice-download").forEach((button) => {
    button.addEventListener("click", () => {
      const d = button.dataset;
      const content =
`YOUR SERVICE TRACKER
Invoice: ${d.invoice}
Tanggal: ${d.date}
Paket: ${d.plan}
Metode: ${d.method}
Total: ${d.total}
Status: BERHASIL
Usaha: ServisKita
Pemilik: Andi Ramadhan`;
      downloadText(`${d.invoice}.txt`, content);
      showToast(`Invoice ${d.invoice} diunduh.`);
    });
  });

  document.getElementById("downloadAllInvoices")?.addEventListener("click", () => {
    const rows = Array.from(document.querySelectorAll(".invoice-download")).map((button) => {
      const d = button.dataset;
      return [d.invoice, d.date, d.plan, d.method, d.total, "BERHASIL"];
    });
    const csv = [["Invoice","Tanggal","Paket","Metode","Total","Status"], ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replaceAll('"','""')}"`).join(","))
      .join("\n");
    downloadText("riwayat-invoice-serviskita.csv", csv, "text/csv;charset=utf-8");
    showToast("Semua invoice berhasil diunduh.");
  });

  // ---------------- Laporan ----------------
  const reportMonth = document.getElementById("reportMonth");
  if (reportMonth) {
    const datasets = {
      august: {
        label: "Agustus 2026",
        range: "1–31 Agu 2026",
        weeks: ["1–7 Agu","8–14 Agu","15–21 Agu","22–28 Agu"],
        incoming: [18,23,27,32],
        done: [15,20,24,28],
      },
      july: {
        label: "Juli 2026",
        range: "1–31 Jul 2026",
        weeks: ["1–7 Jul","8–14 Jul","15–21 Jul","22–28 Jul"],
        incoming: [16,21,25,29],
        done: [14,18,23,26],
      },
      june: {
        label: "Juni 2026",
        range: "1–30 Jun 2026",
        weeks: ["1–7 Jun","8–14 Jun","15–21 Jun","22–28 Jun"],
        incoming: [15,19,22,26],
        done: [13,17,20,24],
      }
    };

    const renderReport = () => {
      const set = datasets[reportMonth.value] || datasets.august;
      const groups = document.querySelectorAll("#weeklyChart .bar-group");
      const max = Math.max(...set.incoming, ...set.done);
      groups.forEach((group, index) => {
        group.querySelector(".incoming-value").textContent = set.incoming[index];
        group.querySelector(".done-label").textContent = set.done[index];
        group.querySelector(".bar--blue").style.height = `${Math.round((set.incoming[index] / max) * 160)}px`;
        group.querySelector(".bar--green").style.height = `${Math.round((set.done[index] / max) * 160)}px`;
        group.querySelector("small").textContent = set.weeks[index];
      });
      document.getElementById("reportRange").value = set.range;
      document.getElementById("chartPeriodLabel").textContent = `${set.label} • Tiket masuk dibandingkan tiket selesai`;
      document.getElementById("teamPeriodLabel").textContent = set.label;
      showToast(`Laporan ${set.label} ditampilkan.`);
    };

    document.getElementById("applyReportFilter")?.addEventListener("click", renderReport);

    document.getElementById("downloadReport")?.addEventListener("click", () => {
      const set = datasets[reportMonth.value] || datasets.august;
      const csv = [
        ["Laporan Operasional ServisKita", set.label],
        [],
        ["Minggu","Tiket Masuk","Tiket Selesai"],
        ...set.weeks.map((week, i) => [week, set.incoming[i], set.done[i]]),
        [],
        ["Teknisi","Tiket Aktif","Selesai Bulan Ini","SLA","Rata-rata"],
        ["Sofia M. Adam",5,12,"92%","2,4 hari"],
        ["Ardi Pratama",4,11,"91%","2,6 hari"],
        ["Tim lainnya (6 teknisi)",19,64,"85%","2,8 hari"],
      ].map((row) => row.map((cell) => `"${String(cell ?? "").replaceAll('"','""')}"`).join(",")).join("\n");
      downloadText(`laporan-serviskita-${reportMonth.value}-2026.csv`, csv, "text/csv;charset=utf-8");
      showToast("Laporan berhasil diunduh.");
    });
  }

  // Mobile Hamburger Navigation Toggle
  const sidebar = document.querySelector(".sidebar");
  if (sidebar) {
    let toggleBtn = sidebar.querySelector(".sidebar-toggle");
    const brand = sidebar.querySelector(".brand");

    // Automatically inject hamburger button if not present in markup
    if (!toggleBtn && brand) {
      toggleBtn = document.createElement("button");
      toggleBtn.type = "button";
      toggleBtn.className = "sidebar-toggle";
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
      brand.appendChild(toggleBtn);
    }

    if (toggleBtn) {
      toggleBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const isOpen = sidebar.classList.toggle("is-open");
        toggleBtn.setAttribute("aria-expanded", String(isOpen));
      });

      document.addEventListener("click", (e) => {
        if (sidebar.classList.contains("is-open") && !sidebar.contains(e.target)) {
          sidebar.classList.remove("is-open");
          toggleBtn.setAttribute("aria-expanded", "false");
        }
      });

      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && sidebar.classList.contains("is-open")) {
          sidebar.classList.remove("is-open");
          toggleBtn.setAttribute("aria-expanded", "false");
          toggleBtn.focus();
        }
      });

      sidebar.querySelectorAll(".sidebar-nav a").forEach((link) => {
        link.addEventListener("click", () => {
          sidebar.classList.remove("is-open");
          toggleBtn.setAttribute("aria-expanded", "false");
        });
      });
    }
  }

  /* ==========================================================================
     Owner Subpage Form & Action Handlers
     ========================================================================== */
  function initOwnerSubpageForms() {
    // Selected records drive both initial values and the save target.
    const editForms = {
      technicians: 'editTechnicianForm', customers: 'editCustomerForm', services: 'editServiceForm'
    };
    const editForm = selectedRecord && document.getElementById(editForms[collection]);
    if (editForm) {
      const fieldValue = (field) => field.name === 'specialty' ? '' : selectedRecord[field.name] ?? '';
      Array.from(editForm.elements).forEach((field) => {
        if (!field.name) return;
        if (field.type === 'checkbox') {
          field.checked = (selectedRecord.specialties || []).includes(field.value.toLowerCase());
        } else if (field.tagName === 'SELECT') {
          const value = String(fieldValue(field));
          if (value && !Array.from(field.options).some((option) => option.value === value)) {
            const option = document.createElement('option');
            option.value = value; option.textContent = value; field.appendChild(option);
          }
          field.value = value;
        } else {
          field.value = fieldValue(field);
        }
      });
      const heading = editForm.querySelector('h2');
      if (heading) heading.textContent = `Profil: ${selectedRecord.name}`;
      const badge = editForm.querySelector('.status');
      if (badge) {
        badge.textContent = selectedRecord.status.toUpperCase();
        badge.className = `status status--${selectedRecord.status === 'aktif' ? 'success' : 'warning'}`;
      }
      const idInput = document.createElement('input');
      idInput.type = 'hidden'; idInput.name = 'id'; idInput.value = selectedRecord.id;
      editForm.appendChild(idInput);
      editForm.addEventListener('submit', (event) => {
        event.preventDefault();
        if (!editForm.reportValidity()) return;
        const changes = Object.fromEntries(new FormData(editForm).entries());
        delete changes.id;
        if (collection === 'technicians') {
          const offered = Array.from(editForm.querySelectorAll('input[name="specialty"]')).map((field) => field.value.toLowerCase());
          changes.specialties = [...(selectedRecord.specialties || []).filter((value) => !offered.includes(value)),
            ...getCheckedValues(editForm, 'input[name="specialty"]').map((value) => value.toLowerCase())];
          const specialtyChanged = JSON.stringify(changes.specialties) !== JSON.stringify(selectedRecord.specialties || []);
          changes.specialty = specialtyChanged ? changes.specialties.join(' / ') : selectedRecord.specialty;
          changes.initials = changes.name.trim().split(/\s+/).map((part) => part[0]).join('').slice(0, 3);
        }
        if (collection === 'customers') changes.initials = changes.name.trim().split(/\s+/).map((part) => part[0]).join('').slice(0, 3);
        if (collection === 'services') {
          changes.price = Number(changes.price);
          changes.priceLabel = window.formatCurrency(changes.price);
          changes.categories = changes.category === 'Laptop / Notebook' ? ['laptop', 'notebook'] : [changes.category.toLowerCase()];
        }
        if (!window.saveRecord(collection, selectedRecord.id, changes)) return;
        const detailPages = { technicians: 'detail-teknisi.html', customers: 'detail-pelanggan.html', services: 'detail-layanan.html' };
        window.location.href = window.recordUrl(detailPages[collection], selectedRecord);
      });
    }

    // 1. Assign technician & print in detail-tiket.html
    const assignForm = document.getElementById("assignTechnicianForm");
    if (assignForm) {
      assignForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const select = document.getElementById("technicianSelect");
        const techName = select?.options[select.selectedIndex]?.text.split("(")[0].trim() || "Teknisi";
        const technician = window.getTechnicianById(select?.value);
        if (!technician || !window.saveRecord('tickets', selectedRecord.id, { technicianId: technician.id })) return;
        showToast(`Penugasan tiket berhasil diperbarui ke ${techName}.`);
      });
    }

    const btnPrint = document.getElementById("btnPrintStruk");
    if (btnPrint) {
      btnPrint.addEventListener("click", () => {
        window.print();
      });
    }

    // 2. Add technician
    const addTechForm = document.getElementById("addTechnicianForm");
    if (addTechForm) {
      addTechForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const name = document.getElementById("techName")?.value.trim() || "baru";
        showToast(`Teknisi ${name} berhasil ditambahkan ke tim!`);
        setTimeout(() => {
          window.location.href = "teknisi.html";
        }, 1200);
      });
    }

    // 4. Add customer
    const addCustForm = document.getElementById("addCustomerForm");
    if (addCustForm) {
      addCustForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const name = document.getElementById("custName")?.value.trim() || "baru";
        showToast(`Pelanggan ${name} berhasil ditambahkan!`);
        setTimeout(() => {
          window.location.href = "pelanggan.html";
        }, 1200);
      });
    }

    // 6. Add service
    const addSvcForm = document.getElementById("addServiceForm");
    if (addSvcForm) {
      addSvcForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const name = document.getElementById("serviceName")?.value.trim() || "baru";
        showToast(`Layanan ${name} berhasil ditambahkan!`);
        setTimeout(() => {
          window.location.href = "layanan.html";
        }, 1200);
      });
    }

    // 8. Import customer
    const fileInput = document.getElementById("fileInput");
    const selectedFileName = document.getElementById("selectedFileName");
    fileInput?.addEventListener("change", () => {
      if (fileInput.files.length && selectedFileName) {
        selectedFileName.textContent = `File terpilih: ${fileInput.files[0].name}`;
      }
    });

    document.getElementById("btnDownloadTemplate")?.addEventListener("click", () => {
      const csvHeader = "nama_lengkap,nomor_telepon,email,alamat,catatan\nNino Rachimas,081234567890,nino.rachimas@email.com,Jakarta Pusat,Customer VIP\n";
      const blob = new Blob([csvHeader], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "template_pelanggan_urt.csv";
      a.click();
    });

    const btnImport = document.getElementById("btnStartImport");
    if (btnImport) {
      btnImport.addEventListener("click", () => {
        showToast("Memproses data pelanggan... 12 kontak baru berhasil diimpor!");
        setTimeout(() => {
          window.location.href = "pelanggan.html";
        }, 1400);
      });
    }

    // 9. Renew subscription plan cards
    document.querySelectorAll('input[name="plan"]').forEach((radio) => {
      radio.addEventListener("change", () => {
        document.querySelectorAll(".plan-radio-card").forEach((c) => c.classList.remove("is-selected"));
        radio.closest(".plan-radio-card")?.classList.add("is-selected");
        const price = radio.value === "annual" ? "Rp999.000" : "Rp99.000";
        const sumPrice = document.getElementById("summaryPrice");
        const sumTotal = document.getElementById("summaryTotal");
        if (sumPrice) sumPrice.textContent = price;
        if (sumTotal) sumTotal.textContent = price;
      });
    });

    const renewForm = document.getElementById("renewForm");
    if (renewForm) {
      renewForm.addEventListener("submit", (e) => {
        e.preventDefault();
        showToast("Membuat tagihan perpanjangan... Mengalihkan ke pembayaran.");
        setTimeout(() => {
          window.location.href = "pembayaran-berhasil.html";
        }, 1200);
      });
    }
  }

  // Initialize subpage forms if present
  initOwnerSubpageForms();
})();

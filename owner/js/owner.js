(() => {
  "use strict";

  const toast = document.getElementById("toast");
  let toastTimer;

  // Toast: memakai URT_UX (stack, ikon, tombol tutup). Fallback ke #toast lama.
  function showToast(message, type) {
    if (window.URT_UX) {
      window.URT_UX.toast(message, type || "success");
      return;
    }
    if (!toast) return;
    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add("is-visible");
    toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 2200);
  }

  // Escape teks buatan user sebelum masuk innerHTML (cegah XSS dari form CRUD)
  const E = (v) => (window.URT_UX ? window.URT_UX.esc(v) : String(v == null ? "" : v));

  const BULAN_PANJANG = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  function monthLabel(key) {
    const [y, m] = String(key).split("-");
    return (BULAN_PANJANG[parseInt(m, 10) - 1] || key) + " " + y;
  }

  // Baris empty-state dengan tombol Reset
  function emptyRow(id, colspan, title, message) {
    const box = window.URT_UX
      ? window.URT_UX.stateHtml({ type: "empty", title: title, message: message, actionLabel: "Reset Pencarian" })
      : title;
    return `<tr id="${id}" class="empty-row urt-state-row" hidden><td colspan="${colspan}">${box}</td></tr>`;
  }

  // Hubungkan tombol Reset pada empty-state ke fungsi reset filter
  function wireEmptyReset(emptyId, resetFn) {
    const row = document.getElementById(emptyId);
    const btn = row && row.querySelector("[data-urt-state-action]");
    if (btn) btn.addEventListener("click", resetFn);
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

  // Halaman detail: data tidak ditemukan -> error state yang manusiawi
  function renderNotFound(title, message, backHref, backLabel) {
    const main = document.querySelector(".owner-main");
    if (!main || !window.URT_UX) return;
    main.innerHTML = window.URT_UX.stateHtml({ type: "error", title: title, message: message }) +
      `<div style="text-align:center"><a class="secondary-button" href="${backHref}">&larr; ${backLabel}</a></div>`;
  }

  // Tautan "Edit" membawa ?id= dan tombol "Hapus" ditambahkan di header detail
  function wireDetailActions(collection, record, editHref, listHref) {
    const editLink = document.querySelector('a.primary-button[href^="' + editHref + '"]');
    if (!editLink || editLink.dataset.wired) return;
    editLink.dataset.wired = "true";
    editLink.href = editHref + "?id=" + encodeURIComponent(record.slug || record.id);
    const del = document.createElement("button");
    del.type = "button";
    del.className = "urt-btn-danger";
    del.textContent = "Hapus";
    del.dataset.delete = collection;
    del.dataset.id = record.id;
    del.dataset.name = record.name;
    del.dataset.redirect = listHref;
    editLink.parentNode.insertBefore(del, editLink);
  }

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
            <td><a class="ticket-link" href="detail-tiket.html?id=${E(t.id)}">#${E(t.id)}</a></td>
            <td><strong>${E(t.device)}</strong></td>
            <td>${E(custName)}</td>
            <td>${E(techName)}</td>
            <td><span class="status status--${t.statusClass || 'warning'}">${E(t.status)}</span></td>
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
            <tr data-ticket-row data-search="${E(searchContent)}" data-status="${t.status.toLowerCase()}" data-month="${t.month || '2026-08'}">
              <td><strong>#${E(t.id)}</strong></td>
              <td>${E(t.device)}</td>
              <td>${E(custName)}</td>
              <td>${E(techName)}</td>
              <td><span class="status status--${t.statusClass || 'warning'}">${E(t.status)}</span></td>
              <td><a class="detail-action" href="detail-tiket.html?id=${E(t.id)}">Detail</a></td>
            </tr>
          `;
        }).join("");

        tbody.innerHTML = rowsHtml + emptyRow("ticketEmptyState", 6, "Yah, tiket tidak ditemukan 🔍", "Tidak ada tiket yang cocok dengan pencarian atau filter. Coba kata kunci lain.");

        // Filter periode dibangun dari data tiket (bukan hardcode)
        const monthSelect = document.getElementById("monthFilter");
        if (monthSelect) {
          const months = Array.from(new Set(tickets.map((t) => t.month).filter(Boolean))).sort().reverse();
          monthSelect.innerHTML =
            `<option value="all" selected>Semua Periode</option>` +
            months.map((m) => `<option value="${m}">${monthLabel(m)}</option>`).join("");
        }
      }
    }

    // 3. Teknisi Table (teknisi.html)
    const techTable = document.querySelector("#technicianTable tbody");
    if (techTable) {
      techTable.innerHTML = technicians.map((tech) => {
        const searchContent = `${tech.name.toLowerCase()} ${tech.username.toLowerCase()} ${tech.specialty.toLowerCase()}`;
        return `
          <tr data-technician-row data-search="${E(searchContent)}" data-specialty="${tech.specialties.join(' ')}" data-workload="${E(tech.workload)}" data-status="${E(tech.status)}">
            <td><strong>${E(tech.name)}</strong></td>
            <td>${E(tech.username)}</td>
            <td>${E(tech.specialty)}</td>
            <td>${E(tech.activeTickets)} tiket</td>
            <td><span class="status status--success">${E(tech.status.toUpperCase())}</span></td>
            <td>
              <div class="technician-actions">
                <a href="detail-teknisi.html?id=${tech.slug || tech.id}">Lihat</a>
                <a href="edit-teknisi.html?id=${tech.slug || tech.id}">Edit</a>
                <button type="button" class="urt-link-danger" data-delete="technicians" data-id="${tech.id}" data-name="${E(tech.name)}">Hapus</button>
              </div>
            </td>
          </tr>
        `;
      }).join("") + emptyRow("technicianEmptyState", 6, "Yah, teknisi tidak ditemukan 🔍", "Tidak ada teknisi yang cocok dengan pencarian atau filter.");
    }

    // 4. Pelanggan Table (pelanggan.html)
    const custTable = document.querySelector(".resource-table tbody");
    const isPelangganPage = window.location.pathname.includes("pelanggan.html");
    if (custTable && isPelangganPage) {
      custTable.innerHTML = customers.map((c) => {
        const searchContent = `${c.name.toLowerCase()} ${c.email.toLowerCase()} ${E(c.phone)}`;
        const activeCount = tickets.filter((t) => t.customerId === c.id && t.status !== "SELESAI").length;
        const totalCount = tickets.filter((t) => t.customerId === c.id).length;
        const ticketSummary = activeCount > 0 ? `${activeCount} aktif` : totalCount > 0 ? `${totalCount} selesai` : "Belum ada";
        return `
          <tr data-customer-row data-search="${E(searchContent)}" data-status="${E(c.status)}">
            <td><strong>${E(c.name)}</strong></td>
            <td>${E(c.email)}</td>
            <td>${E(c.phone)}</td>
            <td>${ticketSummary}</td>
            <td>${E(c.registeredDate)}</td>
            <td>
              <div class="row-actions">
                <a href="detail-pelanggan.html?id=${c.slug || c.id}">Lihat</a>
                <a href="edit-pelanggan.html?id=${c.slug || c.id}">Edit</a>
                <button type="button" class="urt-link-danger" data-delete="customers" data-id="${c.id}" data-name="${E(c.name)}">Hapus</button>
              </div>
            </td>
          </tr>
        `;
      }).join("") + emptyRow("customerEmptyState", 6, "Yah, pelanggan tidak ditemukan 🔍", "Tidak ada pelanggan yang cocok dengan pencarian atau filter.");
    }

    // 5. Layanan Table (layanan.html)
    const isLayananPage = window.location.pathname.includes("layanan.html");
    if (custTable && isLayananPage) {
      custTable.innerHTML = services.map((s) => {
        const searchContent = `${s.name.toLowerCase()} ${s.category.toLowerCase()}`;
        return `
          <tr data-service-row data-search="${E(searchContent)}" data-category="${s.categories.join(' ')}" data-status="${E(s.status)}">
            <td><strong>${E(s.name)}</strong></td>
            <td>${E(s.category)}</td>
            <td>${s.priceLabel || window.formatCurrency(s.price)}</td>
            <td>${E(s.duration)}</td>
            <td><span class="status status--${s.status === 'aktif' ? 'success' : 'warning'}">${E(s.status.toUpperCase())}</span></td>
            <td>
              <div class="row-actions">
                <a href="detail-layanan.html?id=${s.slug || s.id}">Lihat</a>
                <a href="edit-layanan.html?id=${s.slug || s.id}">Edit</a>
                <button type="button" class="urt-link-danger" data-delete="services" data-id="${s.id}" data-name="${E(s.name)}">Hapus</button>
              </div>
            </td>
          </tr>
        `;
      }).join("") + emptyRow("serviceEmptyState", 6, "Yah, layanan tidak ditemukan 🔍", "Tidak ada layanan yang cocok dengan pencarian atau filter.");
    }

    // 6. Detail Tiket (detail-tiket.html)
    const ticketIdHeading = document.getElementById("ticketIdHeading");
    if (ticketIdHeading) {
      const params = new URLSearchParams(window.location.search);
      const ticketId = params.get("id") || (tickets[0] && tickets[0].id) || "";
      const ticket = window.getTicketById ? window.getTicketById(ticketId) : null;
      if (!ticket) return renderNotFound("Tiket tidak ditemukan", "Tiket " + ticketId + " tidak ada atau sudah dihapus.", "tiket-servis.html", "Kembali ke Daftar Tiket");
      const customer = (window.getCustomerById && window.getCustomerById(ticket.customerId)) || { name: "(pelanggan dihapus)", phone: "-", email: "-", address: "-", slug: "", id: "" };
      const technician = (window.getTechnicianById && window.getTechnicianById(ticket.technicianId)) || null;

      ticketIdHeading.textContent = `#${E(ticket.id)}`;
      const subtitleEl = ticketIdHeading.nextElementSibling;
      if (subtitleEl) {
        subtitleEl.textContent = `${E(ticket.device)} • ${E(customer.name)} • Servis Masuk ${ticket.createdAt.split(',')[0]}`;
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
          <dt>Nomor Tiket</dt><dd>#${E(ticket.id)}</dd>
          <dt>Nama Perangkat</dt><dd>${ticket.deviceDetail || ticket.device}</dd>
          <dt>Nomor Seri</dt><dd>${ticket.serialNumber || 'SN-' + ticket.id}</dd>
          <dt>Tanggal Masuk</dt><dd>${E(ticket.createdAt)}</dd>
          <dt>Estimasi Selesai</dt><dd>${E(ticket.estimatedCompletion)}</dd>
          <dt>Keluhan Awal</dt><dd style="font-weight: 500; line-height: 1.5;">${E(ticket.issue)}</dd>
        `;
      }

      // Diagnosis notes & cost box: Card 2
      const card2 = document.querySelectorAll(".ticket-detail-grid > div:first-child .detail-card")[1];
      if (card2) {
        const diagNote = card2.querySelector("p");
        if (diagNote) {
          diagNote.innerHTML = `<strong>Catatan Teknisi:</strong> ${E(ticket.diagnosis)}`;
        }
        const costBox = card2.querySelector(".cost-box");
        if (costBox) {
          const breakdown = ticket.costBreakdown && ticket.costBreakdown.length
            ? ticket.costBreakdown
            : [{ item: "Jasa Perbaikan & Pemeriksaan", amount: ticket.estimatedCost }];
          
          const breakdownHtml = breakdown.map((item) => `
            <div class="cost-row">
              <span>${E(item.item)}</span>
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
          return `<option value="${E(t.slug)}" ${isSelected}>${E(t.name)} (${E(t.specialty)} • ${E(t.activeTickets)} Tiket)</option>`;
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
            <dt>Nama Lengkap</dt><dd>${E(customer.name)}</dd>
            <dt>No. WhatsApp</dt><dd>${E(customer.phone)}</dd>
            <dt>Email</dt><dd>${E(customer.email)}</dd>
            <dt>Alamat</dt><dd>${E(customer.address)}</dd>
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
                <strong class="timeline-step__title">${E(step.title)}</strong>
                <div class="timeline-step__meta">
                  <span class="timeline-step__time">${E(step.time)}</span>
                  ${step.actor ? `<span class="timeline-step__actor">&bull; ${E(step.actor)}</span>` : ""}
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
      const params = new URLSearchParams(window.location.search);
      const techId = params.get("id") || "TECH-001";
      const tech = window.getTechnicianById ? window.getTechnicianById(techId) : null;
      if (!tech) return renderNotFound("Teknisi tidak ditemukan", "Data teknisi tidak ada atau sudah dihapus.", "teknisi.html", "Kembali ke Daftar Teknisi");

      const avatar = techProfileCard.querySelector(".tech-header-row div > div:first-child");
      if (avatar) avatar.textContent = tech.initials || "TK";

      const h2 = techProfileCard.querySelector(".tech-header-row h2");
      if (h2) h2.textContent = tech.name;

      const sub = techProfileCard.querySelector(".tech-header-row h2 + span");
      if (sub) {
        sub.innerHTML = `Username: <strong>${E(tech.username)}</strong> &bull; Spesialis: ${E(tech.specialty)}`;
      }

      wireDetailActions("technicians", tech, "edit-teknisi.html", "teknisi.html");
      const dl = techProfileCard.querySelector(".tech-meta-grid");
      if (dl) {
        dl.innerHTML = `
          <div><dt>Email</dt><dd>${E(tech.email)}</dd></div>
          <div><dt>Nomor Telepon</dt><dd>${E(tech.phone)}</dd></div>
          <div><dt>Beban Tiket Aktif</dt><dd class="stat-badge-num">${E(tech.activeTickets)} <span style="font-size: 14px; font-weight: 500; color: var(--text-muted);">tiket</span></dd></div>
          <div><dt>Total Tiket Selesai</dt><dd class="stat-badge-num" style="color: var(--success);">${E(tech.completedTickets)} <span style="font-size: 14px; font-weight: 500; color: var(--text-muted);">unit</span></dd></div>
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
                <td><strong>#${E(t.id)}</strong></td>
                <td>${E(t.device)}</td>
                <td>${c ? c.name : 'Pelanggan'}</td>
                <td><span class="status status--${t.statusClass || 'warning'}">${E(t.status)}</span></td>
                <td>${E(t.estimatedCompletion)}</td>
                <td><a class="detail-action" href="detail-tiket.html?id=${E(t.id)}">Kelola</a></td>
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
      const params = new URLSearchParams(window.location.search);
      const custId = params.get("id") || "CUS-001";
      const cust = window.getCustomerById ? window.getCustomerById(custId) : null;
      if (!cust) return renderNotFound("Pelanggan tidak ditemukan", "Data pelanggan tidak ada atau sudah dihapus.", "pelanggan.html", "Kembali ke Daftar Pelanggan");

      const avatar = custProfileCard.querySelector(".cust-header-row div > div:first-child");
      if (avatar) avatar.textContent = cust.initials || "PL";

      const h2 = custProfileCard.querySelector(".cust-header-row h2");
      if (h2) h2.textContent = cust.name;

      const sub = custProfileCard.querySelector(".cust-header-row h2 + span");
      if (sub) {
        sub.innerHTML = `Member Sejak: <strong>${E(cust.memberSince)}</strong> &bull; Total Unit Diservis: <strong>${E(cust.totalDevices)} Perangkat</strong>`;
      }

      wireDetailActions("customers", cust, "edit-pelanggan.html", "pelanggan.html");
      const dl = custProfileCard.querySelector(".cust-meta-grid");
      if (dl) {
        dl.innerHTML = `
          <div><dt>Nomor WhatsApp</dt><dd>${E(cust.phone)}</dd></div>
          <div><dt>Email</dt><dd>${E(cust.email)}</dd></div>
          <div><dt>Alamat Domisili</dt><dd>${E(cust.address)}</dd></div>
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
                <td><strong>#${E(t.id)}</strong></td>
                <td>${E(t.device)}</td>
                <td>${t.actionNeeded || t.issue}</td>
                <td>${tech ? tech.name : 'Teknisi'}</td>
                <td><span class="status status--${t.statusClass || 'warning'}">${E(t.status)}</span></td>
                <td>${window.formatCurrency(t.estimatedCost)}</td>
                <td><a class="detail-action" href="detail-tiket.html?id=${E(t.id)}">Lihat</a></td>
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
      const params = new URLSearchParams(window.location.search);
      const svcId = params.get("id") || "deep-cleaning-mx4";
      const svc = window.getServiceById ? window.getServiceById(svcId) : null;
      if (!svc) return renderNotFound("Layanan tidak ditemukan", "Data layanan tidak ada atau sudah dihapus.", "layanan.html", "Kembali ke Katalog Layanan");

      const headerDiv = svcDetailCard.querySelector(".service-header-row > div");
      if (headerDiv) {
        headerDiv.innerHTML = `
          <span style="font-size: 12px; color: var(--primary); font-weight: 700; text-transform: uppercase;">${E(svc.category)}</span>
          <h2 style="font-size: 22px; margin: 4px 0; color: var(--text);">${E(svc.name)}</h2>
          <span style="color: var(--text-muted); font-size: 14px;">Estimasi Pengerjaan: <strong>${E(svc.duration)}</strong></span>
        `;
      }

      wireDetailActions("services", svc, "edit-layanan.html", "layanan.html");
      const dl = svcDetailCard.querySelector(".service-meta-grid");
      if (dl) {
        dl.innerHTML = `
          <div><dt>Harga Dasar</dt><dd class="stat-badge-num">${svc.priceLabel || window.formatCurrency(svc.price)}</dd></div>
          <div><dt>Kategori</dt><dd>${E(svc.category)}</dd></div>
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


  function initListFilters() {
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
        summary.textContent = `Menampilkan ${visible} dari ${ticketRows.length} tiket`;
      }
    };

    search?.addEventListener("input", update);
    month?.addEventListener("change", update);
    wireEmptyReset("ticketEmptyState", () => {
      if (search) search.value = "";
      if (month) month.value = "all";
      panel?.querySelectorAll('input[type="checkbox"]').forEach((i) => (i.checked = false));
      statuses = [];
      update();
    });
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
    wireEmptyReset("technicianEmptyState", () => {
      if (search) search.value = "";
      if (specialty) specialty.value = "all";
      panel?.querySelectorAll('input[type="checkbox"]').forEach((i) => (i.checked = false));
      workloads = [];
      statuses = [];
      update();
    });

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
    wireEmptyReset("serviceEmptyState", () => {
      if (search) search.value = "";
      if (category) category.value = "all";
      panel?.querySelectorAll('input[type="checkbox"]').forEach((i) => (i.checked = false));
      statuses = [];
      update();
    });
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
      if (summary) summary.textContent = `Menampilkan ${visible} dari ${customerRows.length} pelanggan`;
    };

    search?.addEventListener("input", update);
    status?.addEventListener("change", update);
    wireEmptyReset("customerEmptyState", () => {
      if (search) search.value = "";
      if (status) status.value = "all";
      panel?.querySelectorAll('input[type="checkbox"]').forEach((i) => (i.checked = false));
      augustOnly = false;
      update();
    });
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
    // 1. Assign technician (disimpan ke store) & print in detail-tiket.html
    const assignForm = document.getElementById("assignTechnicianForm");
    if (assignForm) {
      assignForm.setAttribute("novalidate", "");
      assignForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const select = document.getElementById("technicianSelect");
        const btn = assignForm.querySelector('button[type="submit"], button:not([type])');
        const ticketId = (document.getElementById("ticketIdHeading")?.textContent || "").replace("#", "").trim();
        const tech = window.getTechnicianById && window.getTechnicianById(select?.value);
        if (!select || !select.value || !tech || !ticketId) {
          showToast("Pilih teknisi terlebih dahulu.", "error");
          return;
        }
        window.URT_UX.setLoading(btn, true, "Menyimpan...");
        try {
          const current = window.getTicketById(ticketId);
          const timeline = (current.timeline || []).map((st) =>
            /^Penugasan Teknisi/.test(st.title) ? Object.assign({}, st, { title: "Penugasan Teknisi: " + tech.name.split(" ").slice(0, 2).join(" ") }) : st
          );
          await window.URT_API.update("tickets", ticketId, { technicianId: tech.id, timeline: timeline });
          showToast(`Penugasan tiket berhasil diperbarui ke ${tech.name}.`);
        } catch (err) {
          showToast(err.message || "Gagal memperbarui penugasan. Coba lagi.", "error");
        } finally {
          window.URT_UX.setLoading(btn, false);
        }
      });
    }

    const btnPrint = document.getElementById("btnPrintStruk");
    if (btnPrint) {
      btnPrint.addEventListener("click", () => {
        window.print();
      });
    }

    initCrudForms();

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

  /* ==========================================================================
     CRUD Forms (Modul 8): validasi + sanitasi + simpan via URT_API + toast
     ========================================================================== */
  function getRecordParam() {
    return new URLSearchParams(window.location.search).get("id");
  }

  function wireForm(form, cfg) {
    const UX = window.URT_UX;
    form.setAttribute("novalidate", "");
    UX.liveClear(form);
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const btn = form.querySelector('button[type="submit"]');
      if (btn && btn.disabled) return; // tombol terkunci saat proses kirim
      const { valid, values } = UX.validate(form, cfg.rules);
      const extraOk = cfg.extraCheck ? cfg.extraCheck(form, values) : true;
      if (!valid || extraOk === false) {
        showToast("Periksa kembali isian yang ditandai merah.", "error");
        return;
      }
      UX.setLoading(btn, true, "Menyimpan...");
      try {
        const record = await cfg.action(values, form);
        UX.flash(cfg.successMessage(record), "success");
        window.location.href = cfg.redirect; // tombol tetap terkunci sampai pindah halaman
      } catch (err) {
        UX.setLoading(btn, false);
        const handled = err && err.field && UX.serverFieldError(form, err.field, err.message);
        if (!handled) showToast((err && err.message) || "Gagal menyimpan data. Coba lagi.", "error");
      }
    });
  }

  // Halaman edit: ambil data dari store (skeleton -> isi form / error state)
  function loadRecordIntoForm(form, collection, fill) {
    const UX = window.URT_UX;
    const id = getRecordParam();
    const holder = document.createElement("div");
    holder.className = "form-card";
    form.style.display = "none";
    form.parentNode.insertBefore(holder, form);

    const run = () => {
      if (!id) {
        UX.showState(holder, { type: "error", title: "Data tidak ditemukan", message: "Alamat halaman tidak memuat ID data yang akan diedit." });
        return;
      }
      UX.skeletonBlock(holder, 6);
      window.URT_API.get(collection, id)
        .then((rec) => {
          holder.remove();
          form.style.display = "";
          form.dataset.recordId = rec.id;
          fill(rec);
        })
        .catch((err) => {
          UX.showState(holder, {
            type: "error",
            title: err.message === "Data tidak ditemukan." ? "Data tidak ditemukan" : "Gagal memuat data",
            message: err.message === "Data tidak ditemukan." ? "Data mungkin sudah dihapus." : "Periksa koneksi Anda lalu coba lagi.",
            actionLabel: err.message === "Data tidak ditemukan." ? "" : "Coba lagi ↻",
            onAction: run
          });
        });
    };
    run();
  }

  function setVal(form, name, value) {
    const el = form.elements.namedItem(name);
    if (el) el.value = value == null ? "" : value;
  }

  function setHeading(form, rec) {
    const h = form.querySelector("h2");
    if (h && h.textContent.indexOf(":") > -1) h.textContent = h.textContent.split(":")[0] + ": " + rec.name;
    const badge = form.querySelector(".status");
    if (badge && rec.status) {
      badge.textContent = String(rec.status).toUpperCase();
      badge.className = "status status--" + (rec.status === "aktif" ? "success" : "warning");
    }
  }

  function checkedValues(form, name) {
    return Array.from(form.querySelectorAll('input[name="' + name + '"]:checked')).map((i) => i.value);
  }

  function requireSpecialty(form) {
    const group = form.querySelector(".checkbox-group");
    if (!group) return true;
    group.nextElementSibling?.classList.contains("urt-field-error") && group.nextElementSibling.remove();
    if (checkedValues(form, "specialty").length) return true;
    const msg = document.createElement("small");
    msg.className = "urt-field-error";
    msg.setAttribute("role", "alert");
    msg.textContent = "Pilih minimal satu bidang keahlian.";
    group.insertAdjacentElement("afterend", msg);
    return false;
  }

  function initCrudForms() {
    if (!window.URT_UX || !window.URT_API) return;

    const customerRules = {
      name: { label: "Nama lengkap", required: true, minLength: 3, maxLength: 80 },
      phone: { label: "Nomor HP", required: true, type: "phone" },
      email: { label: "Email", type: "email", maxLength: 100 },
      city: { label: "Kota / wilayah", maxLength: 60 },
      address: { label: "Alamat lengkap", maxLength: 200 },
      notes: { label: "Catatan", maxLength: 300 }
    };
    const technicianRules = {
      name: { label: "Nama lengkap", required: true, minLength: 3, maxLength: 80 },
      email: { label: "Email", required: true, type: "email", maxLength: 100 },
      phone: { label: "Nomor HP", required: true, type: "phone" }
    };
    const serviceRules = {
      name: { label: "Nama layanan", required: true, minLength: 3, maxLength: 100 },
      price: { label: "Harga dasar", required: true, type: "number", min: 0, max: 100000000 },
      duration: { label: "Estimasi pengerjaan", required: true, minLength: 2, maxLength: 40 },
      description: { label: "Deskripsi", maxLength: 400 }
    };

    // ----- Tambah pelanggan -----
    const addCust = document.getElementById("addCustomerForm");
    if (addCust) {
      wireForm(addCust, {
        rules: customerRules,
        action: (v) => window.URT_API.create("customers", v),
        successMessage: (r) => `Pelanggan ${r.name} berhasil ditambahkan!`,
        redirect: "pelanggan.html"
      });
    }

    // ----- Edit pelanggan -----
    const editCust = document.getElementById("editCustomerForm");
    if (editCust) {
      loadRecordIntoForm(editCust, "customers", (rec) => {
        ["name", "phone", "email", "city", "address", "notes"].forEach((f) => setVal(editCust, f, f === "address" && rec.address === rec.city ? "" : rec[f]));
        setHeading(editCust, rec);
      });
      wireForm(editCust, {
        rules: customerRules,
        action: (v, form) => window.URT_API.update("customers", form.dataset.recordId, v),
        successMessage: (r) => `Data pelanggan ${r.name} berhasil diperbarui!`,
        redirect: "pelanggan.html"
      });
    }

    // ----- Tambah teknisi -----
    const addTech = document.getElementById("addTechnicianForm");
    if (addTech) {
      wireForm(addTech, {
        rules: Object.assign({}, technicianRules, {
          username: { label: "Username", required: true, minLength: 3, maxLength: 30, pattern: /^[a-zA-Z0-9._-]+$/, patternMessage: "Username hanya boleh huruf, angka, titik, strip, dan underscore." },
          password: { label: "Kata sandi", required: true, minLength: 6, maxLength: 64 },
          password_confirm: { label: "Konfirmasi kata sandi", required: true, matches: "password" }
        }),
        extraCheck: requireSpecialty,
        // kata sandi sengaja TIDAK disimpan (prototipe tanpa autentikasi backend)
        action: (v, form) =>
          window.URT_API.create("technicians", { name: v.name, username: v.username, email: v.email, phone: v.phone, specialties: checkedValues(form, "specialty") }),
        successMessage: (r) => `Teknisi ${r.name} berhasil ditambahkan ke tim!`,
        redirect: "teknisi.html"
      });
    }

    // ----- Edit teknisi -----
    const editTech = document.getElementById("editTechnicianForm");
    if (editTech) {
      loadRecordIntoForm(editTech, "technicians", (rec) => {
        ["name", "username", "email", "phone"].forEach((f) => setVal(editTech, f, rec[f]));
        setVal(editTech, "status", rec.status);
        editTech.querySelectorAll('input[name="specialty"]').forEach((cb) => {
          cb.checked = (rec.specialties || []).includes(cb.value.toLowerCase());
        });
        setHeading(editTech, rec);
      });
      wireForm(editTech, {
        rules: technicianRules,
        extraCheck: requireSpecialty,
        action: (v, form) =>
          window.URT_API.update("technicians", form.dataset.recordId, {
            name: v.name, email: v.email, phone: v.phone,
            username: form.elements.namedItem("username").value,
            status: form.elements.namedItem("status")?.value,
            specialties: checkedValues(form, "specialty")
          }),
        successMessage: (r) => `Data teknisi ${r.name} berhasil diperbarui!`,
        redirect: "teknisi.html"
      });
    }

    // ----- Tambah layanan -----
    const addSvc = document.getElementById("addServiceForm");
    if (addSvc) {
      wireForm(addSvc, {
        rules: serviceRules,
        action: (v, form) => window.URT_API.create("services", Object.assign({}, v, { category: form.elements.namedItem("category").value })),
        successMessage: (r) => `Layanan ${r.name} berhasil ditambahkan!`,
        redirect: "layanan.html"
      });
    }

    // ----- Edit layanan -----
    const editSvc = document.getElementById("editServiceForm");
    if (editSvc) {
      loadRecordIntoForm(editSvc, "services", (rec) => {
        ["name", "price", "duration", "description"].forEach((f) => setVal(editSvc, f, rec[f]));
        const cat = editSvc.elements.namedItem("category");
        if (cat) {
          if (!Array.from(cat.options).some((o) => o.value === rec.category)) cat.add(new Option(rec.category, rec.category));
          cat.value = rec.category;
        }
        setVal(editSvc, "status", rec.status);
        setHeading(editSvc, rec);
      });
      wireForm(editSvc, {
        rules: serviceRules,
        action: (v, form) =>
          window.URT_API.update("services", form.dataset.recordId, Object.assign({}, v, {
            category: form.elements.namedItem("category").value,
            status: form.elements.namedItem("status")?.value
          })),
        successMessage: (r) => `Layanan ${r.name} berhasil diperbarui!`,
        redirect: "layanan.html"
      });
    }
  }

  // Hapus data (list & halaman detail) dengan dialog konfirmasi sendiri
  document.addEventListener("click", async (event) => {
    const btn = event.target.closest("[data-delete]");
    if (!btn || !window.URT_UX || !window.URT_API) return;
    const { delete: collection, id, name, redirect } = btn.dataset;
    const ok = await window.URT_UX.confirm({
      title: "Hapus data ini?",
      message: `"${name}" akan dihapus permanen dari ServisKita. Tindakan ini tidak dapat dibatalkan.`,
      confirmLabel: "Ya, hapus",
      danger: true
    });
    if (!ok) return;
    window.URT_UX.setLoading(btn, true, "Menghapus...");
    try {
      await window.URT_API.remove(collection, id);
      window.URT_UX.flash(`${name} berhasil dihapus.`, "success");
      if (redirect) window.location.href = redirect;
      else window.location.reload();
    } catch (err) {
      window.URT_UX.setLoading(btn, false);
      showToast(err.message || "Gagal menghapus data. Coba lagi.", "error");
    }
  });

  /* ==========================================================================
     Bootstrap halaman: skeleton -> data -> (empty | error) states
     ========================================================================== */
  const PAGE_FILE = window.location.pathname.split("/").pop();
  const DATA_PAGES = [
    "beranda-owner.html", "tiket-servis.html", "teknisi.html", "pelanggan.html", "layanan.html",
    "detail-tiket.html", "detail-teknisi.html", "detail-pelanggan.html", "detail-layanan.html"
  ];

  function bootData() {
    populateOwnerPortalData();
    initListFilters();
  }

  function startPage() {
    if (!window.URT_API || !window.URT_UX || !DATA_PAGES.includes(PAGE_FILE)) {
      bootData();
      return;
    }
    const UX = window.URT_UX;
    const tbodies = ["#ticketTable tbody", "#technicianTable tbody", ".resource-table tbody", ".activity-panel tbody", ".data-table tbody"]
      .filter((q) => q !== ".data-table tbody" || /detail-(teknisi|pelanggan)\.html$/.test(PAGE_FILE))
      .map((q) => document.querySelector(q))
      .filter(Boolean);
    const colsOf = (tb) => tb.closest("table")?.querySelectorAll("thead th").length || 6;

    const main = document.querySelector(".owner-main");
    const isDetail = /^detail-/.test(PAGE_FILE);

    const load = () => {
      if (isDetail) UX.pageLoading(main, true);
      else tbodies.forEach((tb) => UX.skeletonRows(tb, colsOf(tb), 5));
      window.URT_API.ready()
        .then(() => {
          if (isDetail) UX.pageLoading(main, false);
          bootData();
        })
        .catch(() => {
          const errOpts = {
            type: "error",
            title: "Gagal memuat data",
            message: "Periksa koneksi internet Anda lalu coba lagi.",
            actionLabel: "Coba lagi ↻",
            onAction: load
          };
          if (isDetail) {
            UX.pageLoading(main, false);
            UX.showState(main, Object.assign({}, errOpts, { onAction: () => window.location.reload() }));
          } else if (tbodies.length) tbodies.forEach((tb) => UX.showState(tb, errOpts, colsOf(tb)));
          else UX.showState(main, Object.assign({}, errOpts, { onAction: () => window.location.reload() }));
          showToast("Gagal memuat data. Coba lagi.", "error");
        });
    };
    load();
  }

  // Initialize subpage forms if present
  initOwnerSubpageForms();
  startPage();
})();

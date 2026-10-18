(() => {
  "use strict";

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
})();

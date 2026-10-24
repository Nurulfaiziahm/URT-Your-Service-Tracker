/**
 * URT — Your Service Tracker
 * Modul 8 · Data Layer Dinamis (CRUD + persistensi)
 *
 * - Seed data diambil dari js/data.js (URT_DATA) saat pertama kali dibuka.
 * - Semua perubahan (Create / Update / Delete) disimpan ke localStorage
 *   dengan struktur terpisah per koleksi, sehingga data tetap ada setelah refresh.
 * - API bersifat ASYNC (Promise) dengan jeda singkat agar perilaku loading
 *   skeleton / error state sama seperti memanggil REST API sungguhan
 *   (mudah diganti ke MockAPI.io / Supabase: cukup ganti isi fungsi request()).
 * - Tidak ada API key di sisi klien, jadi tidak ada rahasia yang perlu di-.env.
 *
 * Simulasi error (untuk demo Error State ke mentor):
 *   tambahkan  ?simulate=error  pada URL halaman, atau jalankan di console:
 *   localStorage.setItem("urt_simulate_error", "1")   // matikan: removeItem(...)
 */
(function () {
  "use strict";

  if (typeof window.URT_DATA === "undefined") {
    console.error("[URT_API] data.js harus dimuat sebelum store.js");
    return;
  }

  const DB_KEY = "urt_db_v1";
  const ERR_KEY = "urt_simulate_error";
  const COLLECTIONS = ["customers", "technicians", "services", "tickets"];
  const D = window.URT_DATA;

  /* ---------- Persistensi ---------- */
  function readDb() {
    try {
      const raw = localStorage.getItem(DB_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function writeDb() {
    try {
      const snapshot = {};
      COLLECTIONS.forEach((c) => (snapshot[c] = D[c]));
      localStorage.setItem(DB_KEY, JSON.stringify(snapshot));
      return true;
    } catch (e) {
      return false; // quota penuh / mode privat
    }
  }

  // Muat data tersimpan ke dalam URT_DATA (in-place, agar renderer lama tetap bekerja)
  (function hydrate() {
    const saved = readDb();
    if (!saved) return;
    COLLECTIONS.forEach((c) => {
      if (Array.isArray(saved[c])) {
        D[c].length = 0;
        saved[c].forEach((item) => D[c].push(item));
      }
    });
  })();

  /* ---------- Util ---------- */
  const clone = (v) => JSON.parse(JSON.stringify(v));

  function shouldFail() {
    try {
      const p = new URLSearchParams(window.location.search);
      return p.get("simulate") === "error" || localStorage.getItem(ERR_KEY) === "1";
    } catch (e) {
      return false;
    }
  }

  // Meniru request jaringan: jeda + kemungkinan gagal
  function request(fn, opts) {
    const delay = (opts && opts.delay) || 450 + Math.random() * 350;
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (shouldFail()) {
          reject(new Error("Koneksi ke server gagal (simulasi)."));
          return;
        }
        try {
          resolve(fn());
        } catch (err) {
          reject(err);
        }
      }, delay);
    });
  }

  const PREFIX = { customers: "CUS", technicians: "TECH", services: "SERVICE" };

  function nextId(col) {
    if (col === "tickets") {
      const nums = D.tickets
        .map((t) => parseInt(String(t.id).split("-").pop(), 10))
        .filter((n) => !isNaN(n));
      const n = (nums.length ? Math.max.apply(null, nums) : 0) + 1;
      return "URT-2026-" + String(n).padStart(4, "0");
    }
    const nums = D[col]
      .map((x) => parseInt(String(x.id).split("-").pop(), 10))
      .filter((n) => !isNaN(n));
    const n = (nums.length ? Math.max.apply(null, nums) : 0) + 1;
    return PREFIX[col] + "-" + String(n).padStart(3, "0");
  }

  function slugify(str) {
    return String(str || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function uniqueSlug(col, base, ignoreId) {
    let slug = slugify(base) || "item";
    let i = 2;
    const taken = (s) => D[col].some((x) => x.slug === s && x.id !== ignoreId);
    let candidate = slug;
    while (taken(candidate)) candidate = slug + "-" + i++;
    return candidate;
  }

  function initialsOf(name) {
    return String(name || "")
      .trim()
      .split(/\s+/)
      .slice(0, 3)
      .map((w) => w[0] || "")
      .join("")
      .toUpperCase();
  }

  const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  function todayLabel(withTime) {
    const d = new Date();
    const base = d.getDate() + " " + BULAN[d.getMonth()] + " " + d.getFullYear();
    if (!withTime) return base;
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return base + ", " + hh + ":" + mm + " WIB";
  }
  function monthKey() {
    const d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
  }

  function findIndex(col, idOrSlug) {
    const key = String(idOrSlug || "").trim().toLowerCase();
    return D[col].findIndex(
      (x) =>
        String(x.id).toLowerCase() === key ||
        (x.slug && String(x.slug).toLowerCase() === key)
    );
  }

  /* ---------- Validasi unik (dipakai form) ---------- */
  function ensureUnique(col, field, value, ignoreId, label) {
    const v = String(value || "").trim().toLowerCase();
    if (!v) return;
    const dup = D[col].find(
      (x) => x.id !== ignoreId && String(x[field] || "").trim().toLowerCase() === v
    );
    if (dup) {
      const err = new Error(label + " sudah digunakan.");
      err.field = field;
      throw err;
    }
  }

  /* ---------- Pembentuk record per koleksi ---------- */
  function buildCustomer(input, existing) {
    const name = String(input.name || "").trim();
    const email = String(input.email || "").trim();
    const phone = String(input.phone || "").trim();
    ensureUnique("customers", "phone", phone, existing && existing.id, "Nomor telepon");
    if (email) ensureUnique("customers", "email", email, existing && existing.id, "Email");
    const city = String(input.city || "").trim();
    const addr = String(input.address || "").trim();
    return Object.assign({}, existing || {}, {
      name: name,
      initials: initialsOf(name),
      email: email,
      phone: phone,
      city: city,
      address: addr || city || "-",
      notes: String(input.notes || "").trim(),
      username: (existing && existing.username) || slugify(name).replace(/-/g, ""),
      status: (existing && existing.status) || "aktif",
      memberSince: (existing && existing.memberSince) || todayLabel(false),
      registeredDate: (existing && existing.registeredDate) || todayLabel(false),
      totalDevices: (existing && existing.totalDevices) || 0,
      totalSpent: (existing && existing.totalSpent) || 0
    });
  }

  function buildTechnician(input, existing) {
    const name = String(input.name || "").trim();
    const username = String(input.username || (existing && existing.username) || "").trim();
    ensureUnique("technicians", "username", username, existing && existing.id, "Username");
    ensureUnique("technicians", "email", input.email, existing && existing.id, "Email");
    const list = (input.specialties || []).map((s) => String(s).trim()).filter(Boolean);
    const specialty = list.slice(0, 2).join(" • ") || "Umum";
    return Object.assign({}, existing || {}, {
      name: name,
      initials: initialsOf(name),
      username: username,
      role: "Teknisi",
      specialty: specialty,
      specialties: list.map((s) => s.toLowerCase()),
      email: String(input.email || "").trim(),
      phone: String(input.phone || "").trim(),
      status: input.status || (existing && existing.status) || "aktif",
      workload: (existing && existing.workload) || "low",
      activeTickets: (existing && existing.activeTickets) || 0,
      completedTickets: (existing && existing.completedTickets) || 0,
      slaRating: (existing && existing.slaRating) || "—",
      avgCompletionTime: (existing && existing.avgCompletionTime) || "—",
      address: (existing && existing.address) || "-"
    });
  }

  const CATEGORY_MAP = {
    hardware: ["hardware"],
    software: ["software"],
    maintenance: ["maintenance"],
    data: ["data"],
    penyimpanan: ["penyimpanan"],
    "laptop / notebook": ["laptop", "notebook"]
  };

  function buildService(input, existing) {
    const name = String(input.name || "").trim();
    const price = Number(input.price);
    const category = String(input.category || "Hardware").trim();
    ensureUnique("services", "name", name, existing && existing.id, "Nama layanan");
    return Object.assign({}, existing || {}, {
      name: name,
      category: category,
      categories: CATEGORY_MAP[category.toLowerCase()] || [slugify(category)],
      price: price,
      priceLabel: "Rp" + price.toLocaleString("id-ID"),
      duration: String(input.duration || "").trim(),
      description: String(input.description || "").trim(),
      status: input.status || (existing && existing.status) || "aktif"
    });
  }

  function buildTicket(input) {
    const id = nextId("tickets");
    const device = String(input.device || "").trim();
    const issue = String(input.issue || "").trim();
    const now = todayLabel(true);
    return {
      id: id,
      customerId: input.customerId,
      technicianId: input.technicianId || "",
      device: device,
      deviceDetail: device,
      deviceType: input.deviceType || "Perangkat",
      serialNumber: "SN-" + id,
      issue: issue,
      diagnosis: "Menunggu pemeriksaan teknisi.",
      actionNeeded: "-",
      sparepart: "-",
      status: "DIAGNOSIS",
      statusLabel: "Diagnosis",
      statusClass: "warning",
      estimatedCost: 0,
      costBreakdown: [],
      createdAt: now,
      month: monthKey(),
      estimatedCompletion: "Menunggu diagnosis",
      currentStep: 1,
      timeline: [
        { title: "Pengajuan Servis Diterima", time: now, actor: "Portal Pelanggan", done: true },
        { title: "Pemeriksaan & Diagnosis", time: "Menunggu penugasan teknisi", current: true },
        { title: "Estimasi & Persetujuan Biaya", time: "Menunggu diagnosis", done: false },
        { title: "Pengerjaan Servis", time: "Menunggu persetujuan", done: false },
        { title: "Selesai & QC", time: "-", done: false }
      ]
    };
  }

  const BUILDERS = {
    customers: buildCustomer,
    technicians: buildTechnician,
    services: buildService
  };

  /* ---------- Public API ---------- */
  const URT_API = {
    /** Simulasi pemuatan awal halaman (dipakai untuk menampilkan skeleton). */
    ready: function () {
      return request(function () {
        return true;
      });
    },

    list: function (col) {
      return request(function () {
        return clone(D[col]);
      });
    },

    get: function (col, idOrSlug) {
      return request(function () {
        const i = findIndex(col, idOrSlug);
        if (i < 0) throw new Error("Data tidak ditemukan.");
        return clone(D[col][i]);
      });
    },

    create: function (col, input) {
      return request(function () {
        let record;
        if (col === "tickets") {
          record = buildTicket(input);
        } else {
          record = BUILDERS[col](input, null);
          record.id = nextId(col);
          record.slug = uniqueSlug(col, record.name);
        }
        D[col].unshift(record);
        if (col === "tickets") syncCounters();
        if (!writeDb()) throw new Error("Penyimpanan browser penuh atau dinonaktifkan.");
        return clone(record);
      });
    },

    update: function (col, idOrSlug, input) {
      return request(function () {
        const i = findIndex(col, idOrSlug);
        if (i < 0) throw new Error("Data tidak ditemukan.");
        const current = D[col][i];
        let updated;
        if (col === "tickets") {
          updated = Object.assign({}, current, input);
        } else {
          updated = BUILDERS[col](input, current);
          if (updated.name !== current.name) {
            updated.slug = uniqueSlug(col, updated.name, current.id);
          }
        }
        D[col][i] = updated;
        if (col === "tickets") syncCounters();
        if (!writeDb()) throw new Error("Penyimpanan browser penuh atau dinonaktifkan.");
        return clone(updated);
      });
    },

    remove: function (col, idOrSlug) {
      return request(function () {
        const i = findIndex(col, idOrSlug);
        if (i < 0) throw new Error("Data tidak ditemukan.");
        const target = D[col][i];

        // Jaga integritas relasi: jangan hapus data yang masih punya tiket aktif
        if (col === "customers" || col === "technicians") {
          const fk = col === "customers" ? "customerId" : "technicianId";
          const open = D.tickets.filter((t) => t[fk] === target.id && t.status !== "SELESAI");
          if (open.length) {
            throw new Error(
              target.name + " masih memiliki " + open.length + " tiket aktif, selesaikan atau pindahkan dulu."
            );
          }
        }
        D[col].splice(i, 1);
        if (!writeDb()) throw new Error("Penyimpanan browser penuh atau dinonaktifkan.");
        return clone(target);
      });
    },

    /** Kembalikan semua data ke seed bawaan data.js */
    reset: function () {
      try {
        localStorage.removeItem(DB_KEY);
      } catch (e) {}
      window.location.reload();
    },

    isSimulatingError: shouldFail
  };

  // Sinkronkan counter tiket aktif milik teknisi dari data tiket yang ada
  function syncCounters() {
    D.technicians.forEach((tech) => {
      tech.activeTickets = D.tickets.filter(
        (t) => t.technicianId === tech.id && t.status !== "SELESAI"
      ).length;
    });
    D.customers.forEach((c) => {
      const own = D.tickets.filter((t) => t.customerId === c.id);
      if (own.length > (c.totalDevices || 0)) c.totalDevices = own.length;
    });
  }

  window.URT_API = URT_API;
})();

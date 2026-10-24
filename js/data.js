/**
 * URT — Your Service Tracker
 * Central Data Layer (Single Source of Truth)
 * 
 * Contains all business/domain entities for the prototype:
 * - owner
 * - technicians
 * - customers
 * - services
 * - tickets (with customerId & technicianId relations)
 * - transactions
 * - helper resolver functions
 */

(function () {
  'use strict';

  const URT_DATA = {
    owner: {
      id: "OWNER-001",
      name: "Andi Ramadhan",
      businessName: "ServisKita",
      businessAlias: "iFix Lab",
      role: "Pemilik Usaha",
      email: "andi@serviskita.id",
      phone: "0812 3456 7890",
      username: "andi.ramadhan",
      portalUrl: "urt.id/serviskita",
      technicianPortalUrl: "urt.id/serviskita/teknisi",
      plan: "Paket Tahunan",
      planStatus: "AKTIF",
      planExpiry: "24 Agustus 2027",
      planRemainingDays: 328,
      planTotalDays: 365
    },

    technicians: [
      {
        id: "TECH-001",
        slug: "sofia-adam",
        name: "Sofia Malvalena Adam",
        initials: "SMA",
        username: "sofia.adam",
        role: "Teknisi",
        specialty: "Laptop • Hardware",
        specialties: ["laptop", "hardware"],
        workload: "high",
        activeTickets: 5,
        completedTickets: 28,
        status: "aktif",
        email: "sofia.adam@serviskita.id",
        phone: "0812 9988 7766",
        slaRating: "92%",
        avgCompletionTime: "2,4 hari",
        address: "Jl. Raya Kebon Jeruk No. 18, Jakarta Barat, DKI Jakarta 11530"
      },
      {
        id: "TECH-002",
        slug: "ardi-pratama",
        name: "Ardi Pratama",
        initials: "AP",
        username: "ardi.pratama",
        role: "Teknisi",
        specialty: "Laptop • Diagnosis",
        specialties: ["laptop", "diagnosis"],
        workload: "medium",
        activeTickets: 4,
        completedTickets: 11,
        status: "aktif",
        email: "ardi.pratama@serviskita.id",
        phone: "0812 9988 7767",
        slaRating: "91%",
        avgCompletionTime: "2,6 hari",
        address: "Jl. Tanjung Duren No. 4, Jakarta Barat"
      },
      {
        id: "TECH-003",
        slug: "dimas-saputra",
        name: "Dimas Saputra",
        initials: "DS",
        username: "dimas.saputra",
        role: "Teknisi",
        specialty: "Software • OS",
        specialties: ["software", "os"],
        workload: "medium",
        activeTickets: 3,
        completedTickets: 9,
        status: "aktif",
        email: "dimas.saputra@serviskita.id",
        phone: "0812 9988 7768",
        slaRating: "89%",
        avgCompletionTime: "1,8 hari",
        address: "Jl. Kemanggisan Raya No. 12, Jakarta Barat"
      },
      {
        id: "TECH-004",
        slug: "rani-oktaviani",
        name: "Rani Oktaviani",
        initials: "RO",
        username: "rani.oktaviani",
        role: "Teknisi",
        specialty: "Laptop • QC",
        specialties: ["laptop", "qc"],
        workload: "medium",
        activeTickets: 4,
        completedTickets: 14,
        status: "aktif",
        email: "rani.oktaviani@serviskita.id",
        phone: "0812 9988 7769",
        slaRating: "94%",
        avgCompletionTime: "2,1 hari",
        address: "Jl. Palmerah Barat No. 8, Jakarta Pusat"
      },
      {
        id: "TECH-005",
        slug: "fajar-nugroho",
        name: "Fajar Nugroho",
        initials: "FN",
        username: "fajar.nugroho",
        role: "Teknisi",
        specialty: "Hardware • Pendingin",
        specialties: ["hardware", "pendingin"],
        workload: "medium",
        activeTickets: 3,
        completedTickets: 8,
        status: "aktif",
        email: "fajar.nugroho@serviskita.id",
        phone: "0812 9988 7770",
        slaRating: "88%",
        avgCompletionTime: "2,5 hari",
        address: "Jl. Tomang Raya No. 15, Jakarta Barat"
      },
      {
        id: "TECH-006",
        slug: "bayu-setiawan",
        name: "Bayu Setiawan",
        initials: "BS",
        username: "bayu.setiawan",
        role: "Teknisi",
        specialty: "Laptop • Hardware",
        specialties: ["laptop", "hardware"],
        workload: "medium",
        activeTickets: 4,
        completedTickets: 12,
        status: "aktif",
        email: "bayu.setiawan@serviskita.id",
        phone: "0812 9988 7771",
        slaRating: "90%",
        avgCompletionTime: "2,3 hari",
        address: "Jl. Meruya Ilir No. 22, Jakarta Barat"
      },
      {
        id: "TECH-007",
        slug: "intan-permata",
        name: "Intan Permata",
        initials: "IP",
        username: "intan.permata",
        role: "Teknisi",
        specialty: "Software • Data",
        specialties: ["software", "data"],
        workload: "light",
        activeTickets: 2,
        completedTickets: 7,
        status: "aktif",
        email: "intan.permata@serviskita.id",
        phone: "0812 9988 7772",
        slaRating: "95%",
        avgCompletionTime: "1,5 hari",
        address: "Jl. Ciledug Raya No. 45, Jakarta Selatan"
      },
      {
        id: "TECH-008",
        slug: "rizal-hidayat",
        name: "Rizal Hidayat",
        initials: "RH",
        username: "rizal.hidayat",
        role: "Teknisi",
        specialty: "Laptop • QC",
        specialties: ["laptop", "qc"],
        workload: "medium",
        activeTickets: 3,
        completedTickets: 10,
        status: "aktif",
        email: "rizal.hidayat@serviskita.id",
        phone: "0812 9988 7773",
        slaRating: "91%",
        avgCompletionTime: "2,2 hari",
        address: "Jl. Srengseng Raya No. 3, Jakarta Barat"
      }
    ],

    customers: [
      {
        id: "CUS-001",
        slug: "nino-rachimas",
        name: "Nino Rachimas",
        initials: "NR",
        email: "nino.rachimas@email.com",
        username: "ninorachimas",
        phone: "0812 3456 7890",
        address: "Jakarta Pusat",
        memberSince: "Januari 2024",
        status: "aktif",
        registeredDate: "24 Agu 2026",
        totalDevices: 2,
        totalSpent: 400000
      },
      {
        id: "CUS-002",
        slug: "nadia-putri",
        name: "Nadia Putri",
        initials: "NP",
        email: "nadia.putri@email.com",
        username: "nadiaputri",
        phone: "0813 2211 9087",
        address: "Jakarta Selatan",
        memberSince: "Februari 2025",
        status: "aktif",
        registeredDate: "24 Agu 2026",
        totalDevices: 1,
        totalSpent: 1450000
      },
      {
        id: "CUS-003",
        slug: "rizky-fauzan",
        name: "Rizky Fauzan",
        initials: "RF",
        email: "rizky.fauzan@email.com",
        username: "rizkyfauzan",
        phone: "0812 9988 1102",
        address: "Jakarta Timur",
        memberSince: "Maret 2025",
        status: "aktif",
        registeredDate: "24 Agu 2026",
        totalDevices: 1,
        totalSpent: 450000
      },
      {
        id: "CUS-004",
        slug: "dewi-lestari",
        name: "Dewi Lestari",
        initials: "DL",
        email: "dewi.lestari@email.com",
        username: "dewilestari",
        phone: "0857 2211 3478",
        address: "Jakarta Barat",
        memberSince: "April 2025",
        status: "selesai",
        registeredDate: "23 Agu 2026",
        totalDevices: 1,
        totalSpent: 650000
      },
      {
        id: "CUS-005",
        slug: "aulia-rahman",
        name: "Aulia Rahman",
        initials: "AR",
        email: "aulia.rahman@email.com",
        username: "auliarahman",
        phone: "0813 4499 6721",
        address: "Tangerang",
        memberSince: "Mei 2025",
        status: "selesai",
        registeredDate: "18 Agu 2026",
        totalDevices: 1,
        totalSpent: 150000
      },
      {
        id: "CUS-006",
        slug: "maya-putri",
        name: "Maya Putri",
        initials: "MP",
        email: "maya.putri@email.com",
        username: "mayaputri",
        phone: "0856 8877 1302",
        address: "Depok",
        memberSince: "Juni 2025",
        status: "selesai",
        registeredDate: "7 Agu 2026",
        totalDevices: 1,
        totalSpent: 250000
      },
      {
        id: "CUS-007",
        slug: "rani-kurnia",
        name: "Rani Kurnia",
        initials: "RK",
        email: "rani.kurnia@email.com",
        username: "ranikurnia",
        phone: "0812 8877 6655",
        address: "Jakarta Selatan",
        memberSince: "Juli 2025",
        status: "aktif",
        registeredDate: "1 Sep 2026",
        totalDevices: 1,
        totalSpent: 200000
      },
      {
        id: "CUS-008",
        slug: "dimas-pratama",
        name: "Dimas Pratama",
        initials: "DP",
        email: "dimas.p@email.com",
        username: "dimaspratama",
        phone: "0812 7766 5544",
        address: "Bekasi",
        memberSince: "Agustus 2025",
        status: "aktif",
        registeredDate: "30 Agu 2026",
        totalDevices: 1,
        totalSpent: 300000
      },
      {
        id: "CUS-009",
        slug: "sari-dewi",
        name: "Sari Dewi",
        initials: "SD",
        email: "sari.dewi@email.com",
        username: "saridewi",
        phone: "0813 9988 7766",
        address: "Jakarta Pusat",
        memberSince: "Agustus 2025",
        status: "aktif",
        registeredDate: "30 Agu 2026",
        totalDevices: 1,
        totalSpent: 350000
      },
      {
        id: "CUS-010",
        slug: "yoga-saputra",
        name: "Yoga Saputra",
        initials: "YS",
        email: "yoga.s@email.com",
        username: "yogasaputra",
        phone: "0857 1122 3344",
        address: "Jakarta Barat",
        memberSince: "Agustus 2025",
        status: "aktif",
        registeredDate: "29 Agu 2026",
        totalDevices: 1,
        totalSpent: 650000
      }
    ],

    services: [
      {
        id: "SERVICE-001",
        slug: "cleaning-thermal",
        name: "Cleaning & Thermal Paste",
        category: "Laptop / Notebook",
        categories: ["laptop", "notebook"],
        price: 150000,
        priceLabel: "Rp150.000",
        duration: "1–2 hari",
        status: "aktif",
        description: "Pembersihan menyeluruh debu pada exhaust kipas pendingin dan penggantian pasta termal konduktivitas tinggi standar pabrikan."
      },
      {
        id: "SERVICE-002",
        slug: "deep-cleaning-mx4",
        name: "Deep Cleaning & Re-paste Arctic MX-4",
        category: "Laptop / Notebook",
        categories: ["laptop", "notebook"],
        price: 250000,
        priceLabel: "Rp250.000",
        duration: "1–2 hari",
        status: "aktif",
        description: "Pembersihan total motherboard, sirip heatsink ultrasonik, pelumasan bearing kipas, dan aplikasi pasta termal premium Arctic MX-4."
      },
      {
        id: "SERVICE-003",
        slug: "windows-driver",
        name: "Instalasi Windows 11 & Driver",
        category: "Software",
        categories: ["software"],
        price: 120000,
        priceLabel: "Rp120.000",
        duration: "1 hari",
        status: "aktif",
        description: "Fresh install sistem operasi Windows 11 resmi, pembaruan seluruh driver perangkat keras, dan pengujian stabilitas booting."
      },
      {
        id: "SERVICE-004",
        slug: "keyboard-trackpad",
        name: "Perbaikan Keyboard & Trackpad",
        category: "Hardware",
        categories: ["hardware"],
        price: 850000,
        priceLabel: "Mulai Rp850.000",
        duration: "2–3 hari",
        status: "aktif",
        description: "Penggantian modul keyboard backlit internal dan kalibrasi klik touchpad laptop."
      },
      {
        id: "SERVICE-005",
        slug: "kipas-pendingin",
        name: "Penggantian Kipas Pendingin",
        category: "Hardware",
        categories: ["hardware"],
        price: 690000,
        priceLabel: "Mulai Rp690.000",
        duration: "2–3 hari",
        status: "aktif",
        description: "Penggantian unit kipas pendingin brushless baru original OEM untuk laptop yang berisik atau macet."
      },
      {
        id: "SERVICE-006",
        slug: "data-ssd",
        name: "Pemulihan Data & Penggantian SSD",
        category: "Penyimpanan",
        categories: ["penyimpanan"],
        price: 1250000,
        priceLabel: "Mulai Rp1.250.000",
        duration: "3–5 hari",
        status: "aktif",
        description: "Penyelamatan data dari drive rusak dan migrasi ke SSD PCIe NVMe berkecepatan tinggi generasi terbaru."
      }
    ],

    tickets: [
      {
        id: "URT-2026-001",
        customerId: "CUS-001", // Nino Rachimas
        technicianId: "TECH-001", // Sofia M. Adam
        device: "ASUS VivoBook 14",
        deviceDetail: "ASUS VivoBook 14 (A416MA)",
        deviceType: "Laptop / Ultrabook 14 Inci",
        serialNumber: "ASUS-VB14-2026-001",
        issue: "Laptop mati mendadak setelah 10-15 menit digunakan. Area casing bawah dan ventilasi kipas terasa sangat panas.",
        diagnosis: "Debu tebal menumpuk pada sirip heatsink dan kipas pendingin laptop, memicu thermal throttling hingga laptop mati mendadak. Kualitas thermal paste CPU/GPU telah kering mengeras dan wajib diganti dengan pasta konduktivitas tinggi.",
        actionNeeded: "Deep Cleaning Fan, Heatsink & Motherboard + Thermal Paste Replacement Arctic MX-4.",
        sparepart: "Arctic MX-4 Thermal Paste",
        status: "PERSETUJUAN",
        statusLabel: "Menunggu Persetujuan",
        statusClass: "warning",
        estimatedCost: 250000,
        costBreakdown: [
          { item: "Jasa Deep Cleaning & Pembersihan Pendingin", amount: 150000 },
          { item: "Suku Cadang: Arctic MX-4 Thermal Paste", amount: 100000 }
        ],
        createdAt: "1 Sep 2026, 10:15 WIB",
        month: "2026-08",
        estimatedCompletion: "3 Sep 2026 (1–2 hari kerja)",
        currentStep: 3,
        timeline: [
          { title: "Tiket Diterima di Outlet", time: "1 Sep 2026, 10:15 WIB", actor: "Staf Front Desk", done: true },
          { title: "Penugasan Teknisi: Sofia M. Adam", time: "1 Sep 2026, 11:30 WIB", actor: "Oleh Pemilik Usaha", done: true },
          { title: "Diagnosis Selesai & Estimasi Diajukan", time: "2 Sep 2026, 09:40 WIB", actor: "Rp250.000", done: true },
          { title: "Menunggu Persetujuan Pelanggan", time: "Link persetujuan aktif di Portal Pelanggan", current: true },
          { title: "Dalam Perbaikan & Pengujian QC", time: "Menunggu persetujuan Nino Rachimas", done: false },
          { title: "Unit Siap Diambil / Selesai", time: "Estimasi target 3 Sep 2026", done: false }
        ]
      },
      {
        id: "URT-2026-0142",
        customerId: "CUS-002", // Nadia Putri
        technicianId: "TECH-001", // Sofia M. Adam
        device: "MacBook Air M2",
        deviceDetail: "MacBook Air M2 (2022)",
        deviceType: "Laptop / Ultrabook",
        serialNumber: "MBA-M2-2026-142",
        issue: "Baterai cepat habis dan trackpad sesekali tidak merespons klik.",
        diagnosis: "Siklus baterai telah mencapai batas maksimum (health 68%). Perlu kalibrasi dan penggantian cell baterai OEM.",
        actionNeeded: "Penggantian modul baterai dan pembersihan konektor trackpad.",
        sparepart: "Baterai OEM MacBook Air M2",
        status: "DIAGNOSIS",
        statusLabel: "Diagnosis",
        statusClass: "warning",
        estimatedCost: 1450000,
        costBreakdown: [
          { item: "Jasa Pemeriksaan & Pemasangan Baterai", amount: 250000 },
          { item: "Sparepart: Baterai OEM MacBook Air M2", amount: 1200000 }
        ],
        createdAt: "24 Agu 2026, 14:00 WIB",
        month: "2026-08",
        estimatedCompletion: "2 Sep 2026",
        currentStep: 2,
        timeline: [
          { title: "Tiket Diterima di Outlet", time: "24 Agu 2026, 14:00 WIB", actor: "Staf Front Desk", done: true },
          { title: "Penugasan Teknisi: Sofia M. Adam", time: "24 Agu 2026, 15:30 WIB", actor: "Oleh Pemilik Usaha", done: true },
          { title: "Pemeriksaan & Diagnosis", time: "Sedang berlangsung", current: true },
          { title: "Estimasi & Persetujuan Biaya", time: "Menunggu diagnosis", done: false },
          { title: "Pengerjaan Servis", time: "Menunggu persetujuan", done: false },
          { title: "Selesai & QC", time: "Target 2 Sep 2026", done: false }
        ]
      },
      {
        id: "URT-2026-0141",
        customerId: "CUS-003", // Rizky Fauzan
        technicianId: "TECH-002", // Ardi Pratama
        device: "ASUS VivoBook 14",
        deviceDetail: "ASUS VivoBook 14 (X412DA)",
        deviceType: "Laptop",
        serialNumber: "ASUS-VB14-2026-141",
        issue: "Keyboard beberapa tombol (W, S, Spasi) tidak berfungsi setelah terkena percikan air.",
        diagnosis: "Jalur fleksibel keyboard mengalami korosi akibat cairan. Diperlukan penggantian keyboard satu modul.",
        actionNeeded: "Penggantian modul keyboard dan pembersihan sisa korosi motherboard.",
        sparepart: "Keyboard ASUS VivoBook 14 OEM",
        status: "PERBAIKAN",
        statusLabel: "Dalam Pengerjaan",
        statusClass: "progress",
        estimatedCost: 450000,
        costBreakdown: [
          { item: "Jasa Pemasangan & Pembersihan Korosi", amount: 150000 },
          { item: "Keyboard Original ASUS VivoBook", amount: 300000 }
        ],
        createdAt: "24 Agu 2026, 11:30 WIB",
        month: "2026-08",
        estimatedCompletion: "26 Agu 2026",
        currentStep: 4,
        timeline: [
          { title: "Tiket Diterima di Outlet", time: "24 Agu 2026, 11:30 WIB", actor: "Staf Front Desk", done: true },
          { title: "Penugasan Teknisi: Ardi Pratama", time: "24 Agu 2026, 12:00 WIB", actor: "Oleh Pemilik Usaha", done: true },
          { title: "Diagnosis Selesai", time: "24 Agu 2026, 14:00 WIB", actor: "Rp450.000", done: true },
          { title: "Persetujuan Pelanggan Diterima", time: "24 Agu 2026, 15:10 WIB", actor: "Disetujui", done: true },
          { title: "Pengerjaan Pergantian Keyboard", time: "Sedang dikerjakan oleh Ardi", current: true },
          { title: "Selesai & Pengambilan", time: "Target 26 Agu 2026", done: false }
        ]
      },
      {
        id: "URT-2026-0140",
        customerId: "CUS-004", // Dewi Lestari
        technicianId: "TECH-001", // Sofia M. Adam
        device: "Lenovo IdeaPad",
        deviceDetail: "Lenovo IdeaPad Slim 3 14ITL6",
        deviceType: "Laptop",
        serialNumber: "LNV-IP3-2026-140",
        issue: "Sistem operasi sering blue screen (BSOD) dan lambat saat booting.",
        diagnosis: "SSD NVMe lama mengalami bad block sektor awal OS. Perlu kloning data dan ganti SSD 512GB baru.",
        actionNeeded: "Penggantian SSD M.2 NVMe 512GB dan fresh instalasi OS Windows 11 + Driver.",
        sparepart: "SSD NVMe PCIe Gen3 512GB",
        status: "SELESAI",
        statusLabel: "Selesai",
        statusClass: "success",
        estimatedCost: 650000,
        costBreakdown: [
          { item: "Jasa Kloning & Instalasi Windows 11", amount: 150000 },
          { item: "SSD NVMe 512GB High Speed", amount: 500000 }
        ],
        createdAt: "23 Agu 2026, 09:15 WIB",
        month: "2026-08",
        estimatedCompletion: "25 Agu 2026",
        currentStep: 5,
        timeline: [
          { title: "Tiket Diterima di Outlet", time: "23 Agu 2026, 09:15 WIB", actor: "Staf Front Desk", done: true },
          { title: "Penugasan Teknisi: Sofia M. Adam", time: "23 Agu 2026, 10:00 WIB", actor: "Oleh Pemilik Usaha", done: true },
          { title: "Diagnosis & Persetujuan Biaya", time: "23 Agu 2026, 11:30 WIB", actor: "Disetujui Rp650.000", done: true },
          { title: "Penggantian SSD & Kloning Data", time: "24 Agu 2026, 16:00 WIB", actor: "Selesai", done: true },
          { title: "QC Selesai & Unit Diambil", time: "25 Agu 2026, 11:00 WIB", actor: "Sudah diserahkan", done: true }
        ]
      },
      {
        id: "URT-2026-004",
        customerId: "CUS-005", // Aulia Rahman
        technicianId: "TECH-001", // Sofia M. Adam
        device: "Lenovo IdeaPad 3",
        deviceDetail: "Lenovo IdeaPad 3 14ARE05",
        deviceType: "Laptop",
        serialNumber: "LNV-IP3-2026-004",
        issue: "Kipas berisik dan laptop cepat hangat saat membuka aplikasi kantor.",
        diagnosis: "Debu kering pada exhaust heatsink. Kualitas thermal paste menurun.",
        actionNeeded: "Cleaning fan & penggantian thermal paste.",
        sparepart: "Thermal paste Arctic",
        status: "SELESAI",
        statusLabel: "Selesai",
        statusClass: "success",
        estimatedCost: 150000,
        costBreakdown: [
          { item: "Cleaning Fan & Thermal Paste", amount: 150000 }
        ],
        createdAt: "18 Agu 2026, 13:00 WIB",
        month: "2026-08",
        estimatedCompletion: "19 Agu 2026",
        currentStep: 5,
        timeline: [
          { title: "Tiket Diterima di Outlet", time: "18 Agu 2026, 13:00 WIB", actor: "Staf Front Desk", done: true },
          { title: "Penugasan & Diagnosis", time: "18 Agu 2026, 14:00 WIB", actor: "Sofia M. Adam", done: true },
          { title: "Persetujuan Pelanggan", time: "18 Agu 2026, 14:30 WIB", actor: "Disetujui", done: true },
          { title: "Deep Cleaning & Re-paste", time: "18 Agu 2026, 16:30 WIB", actor: "Selesai", done: true },
          { title: "Unit Diambil Pelanggan", time: "19 Agu 2026, 10:15 WIB", actor: "Lunas & Diambil", done: true }
        ]
      },
      {
        id: "URT-2026-005",
        customerId: "CUS-007", // Rani Kurnia
        technicianId: "TECH-001", // Sofia M. Adam
        device: "Acer Swift 3",
        deviceDetail: "Acer Swift 3 SF314",
        deviceType: "Laptop",
        serialNumber: "ACER-SW3-2026-005",
        issue: "Kipas pendingin berbunyi kasar dan bergetar saat dinyalakan.",
        diagnosis: "Bearing fan aus dan kemasukan kotoran serat benang.",
        actionNeeded: "Pembersihan bearing kipas dan pelumasan poros fan.",
        sparepart: "Pelumas bearing khusus & thermal paste",
        status: "DIAGNOSIS",
        statusLabel: "Diagnosa",
        statusClass: "warning",
        estimatedCost: 200000,
        costBreakdown: [
          { item: "Jasa Servis Kipas & Pelumasan Bearing", amount: 150000 },
          { item: "Thermal Paste Replacement", amount: 50000 }
        ],
        createdAt: "1 Sep 2026, 11:00 WIB",
        month: "2026-09",
        estimatedCompletion: "4 Sep 2026",
        currentStep: 2,
        timeline: [
          { title: "Tiket Diterima di Outlet", time: "1 Sep 2026, 11:00 WIB", actor: "Front Desk", done: true },
          { title: "Pemeriksaan Teknisi", time: "1 Sep 2026, 13:00 WIB", current: true }
        ]
      },
      {
        id: "URT-2026-007",
        customerId: "CUS-008", // Dimas Pratama
        technicianId: "TECH-001", // Sofia M. Adam
        device: "Lenovo ThinkPad T14",
        deviceDetail: "Lenovo ThinkPad T14 Gen 2",
        deviceType: "Laptop",
        serialNumber: "TP-T14-2026-007",
        issue: "Restart otomatis saat menjalankan compiler atau beban CPU tinggi.",
        diagnosis: "Thermal pad VRM meleleh dan fan tersumbat debu.",
        actionNeeded: "Penggantian thermal pad dan pengujian stres QC 24 jam.",
        sparepart: "Thermal Pad 1.5mm K5 Pro",
        status: "PERBAIKAN",
        statusLabel: "QC",
        statusClass: "neutral",
        estimatedCost: 300000,
        costBreakdown: [
          { item: "Penggantian Thermal Pad & Cleaning Heatsink", amount: 200000 },
          { item: "Pengujian Stres & Burn-in QC", amount: 100000 }
        ],
        createdAt: "30 Agu 2026, 15:00 WIB",
        month: "2026-08",
        estimatedCompletion: "2 Sep 2026",
        currentStep: 4
      },
      {
        id: "URT-2026-008",
        customerId: "CUS-009", // Sari Dewi
        technicianId: "TECH-001", // Sofia M. Adam
        device: "HP Pavilion 14",
        deviceDetail: "HP Pavilion 14-dv0000",
        deviceType: "Laptop",
        serialNumber: "HP-PAV14-2026-008",
        issue: "Layar berkedip dan backlight sesekali redup sendiri.",
        diagnosis: "Kabel fleksibel LCD eDP terjepit engsel.",
        actionNeeded: "Reposisi dan perbaikan jalur fleksibel LCD.",
        sparepart: "Kabel eDP display",
        status: "DIAGNOSIS",
        statusLabel: "Diagnosa",
        statusClass: "warning",
        estimatedCost: 350000,
        costBreakdown: [
          { item: "Jasa Perbaikan Jalur Fleksibel LCD", amount: 200000 },
          { item: "Kabel Display eDP HP", amount: 150000 }
        ],
        createdAt: "30 Agu 2026, 16:30 WIB",
        month: "2026-08",
        estimatedCompletion: "4 Sep 2026",
        currentStep: 2
      },
      {
        id: "URT-2026-009",
        customerId: "CUS-010", // Yoga Saputra
        technicianId: "TECH-001", // Sofia M. Adam
        device: "Dell Inspiron 5410",
        deviceDetail: "Dell Inspiron 14 5410 2-in-1",
        deviceType: "Laptop",
        serialNumber: "DELL-5410-2026-009",
        issue: "Baterai cepat drop dari 80% ke 10% dalam 20 menit.",
        diagnosis: "Cell baterai degradasi tidak seimbang.",
        actionNeeded: "Penggantian baterai OEM Dell 54Wh dan kalibrasi BMS.",
        sparepart: "Baterai Dell Inspiron 54Wh",
        status: "PERBAIKAN",
        statusLabel: "QC",
        statusClass: "neutral",
        estimatedCost: 650000,
        costBreakdown: [
          { item: "Jasa Kalibrasi & Pemasangan Baterai", amount: 150000 },
          { item: "Baterai Dell 54Wh Original", amount: 500000 }
        ],
        createdAt: "29 Agu 2026, 10:00 WIB",
        month: "2026-08",
        estimatedCompletion: "3 Sep 2026",
        currentStep: 4
      },
      {
        id: "URT-2026-0032",
        customerId: "CUS-001", // Nino Rachimas
        technicianId: "TECH-003", // Dimas Saputra
        device: "MacBook Air M1",
        deviceDetail: "MacBook Air M1 (2020)",
        deviceType: "Laptop",
        serialNumber: "MBA-M1-2026-032",
        issue: "Install ulang macOS Sonoma dan backup data dokumen penting.",
        diagnosis: "Sistem korup karena update gagal. Komponen hardware normal.",
        actionNeeded: "Fresh install macOS Sonoma dan restore user data.",
        sparepart: "-",
        status: "SELESAI",
        statusLabel: "Selesai",
        statusClass: "success",
        estimatedCost: 250000,
        costBreakdown: [
          { item: "Jasa Backup & Fresh Install macOS", amount: 250000 }
        ],
        createdAt: "12 Sep 2026, 11:00 WIB",
        month: "2026-09",
        estimatedCompletion: "13 Sep 2026",
        currentStep: 5
      },
      {
        id: "URT-2026-0050",
        customerId: "CUS-001", // Nino Rachimas
        technicianId: "TECH-006", // Bayu Setiawan
        device: "Acer Nitro 5",
        deviceDetail: "Acer Nitro 5 AN515-57",
        deviceType: "Laptop Gaming",
        serialNumber: "ACER-N5-2026-050",
        issue: "Upgrade SSD NVMe 1TB untuk instalasi game dan software rendering.",
        diagnosis: "Slot M.2 kedua kosong dan mendukung PCIe Gen4.",
        actionNeeded: "Pemasangan SSD NVMe 1TB & format partisi NTFS.",
        sparepart: "SSD NVMe 1TB Kingston NV2",
        status: "SELESAI",
        statusLabel: "Selesai",
        statusClass: "success",
        estimatedCost: 1200000,
        costBreakdown: [
          { item: "Jasa Pemasangan & Konfigurasi Storage", amount: 100000 },
          { item: "SSD NVMe 1TB High Performance", amount: 1100000 }
        ],
        createdAt: "1 Okt 2026, 14:00 WIB",
        month: "2026-10",
        estimatedCompletion: "2 Okt 2026",
        currentStep: 5
      }
    ],

    transactions: [
      {
        id: "TRX-001",
        ticketId: "URT-2026-001",
        amount: 250000,
        status: "PENDING",
        method: "QRIS / Transfer Bank",
        date: "1 Sep 2026"
      },
      {
        id: "TRX-002",
        ticketId: "URT-2026-004",
        amount: 150000,
        status: "PAID",
        method: "Tunai",
        date: "19 Agu 2026"
      },
      {
        id: "TRX-003",
        ticketId: "URT-2026-0140",
        amount: 650000,
        status: "PAID",
        method: "QRIS",
        date: "25 Agu 2026"
      },
      {
        id: "TRX-004",
        ticketId: "URT-2026-0032",
        amount: 250000,
        status: "PAID",
        method: "Transfer BCA",
        date: "13 Sep 2026"
      },
      {
        id: "TRX-005",
        ticketId: "URT-2026-0050",
        amount: 1200000,
        status: "PAID",
        method: "Kartu Debit",
        date: "2 Okt 2026"
      }
    ]
  };

  /* ==========================================================================
     Helper Resolver Functions (Maintainability & Clean Architecture)
     ========================================================================== */

  function normalizeKey(str) {
    return String(str || "")
      .trim()
      .toLowerCase()
      .replace(/^#/, "");
  }

  function getCustomerById(idOrSlug) {
    if (!idOrSlug) return null;
    const key = normalizeKey(idOrSlug);
    return (
      URT_DATA.customers.find(
        (c) =>
          normalizeKey(c.id) === key ||
          normalizeKey(c.slug) === key ||
          normalizeKey(c.name) === key
      ) || null
    );
  }

  function getTechnicianById(idOrSlug) {
    if (!idOrSlug) return null;
    const key = normalizeKey(idOrSlug);
    return (
      URT_DATA.technicians.find(
        (t) =>
          normalizeKey(t.id) === key ||
          normalizeKey(t.slug) === key ||
          normalizeKey(t.username) === key ||
          normalizeKey(t.name).includes(key)
      ) || null
    );
  }

  function getTicketById(id) {
    if (!id) return null;
    const cleanId = normalizeKey(id);
    return (
      URT_DATA.tickets.find((t) => {
        const ticketClean = normalizeKey(t.id);
        return (
          ticketClean === cleanId ||
          ticketClean.endsWith(cleanId) ||
          cleanId.endsWith(ticketClean)
        );
      }) || null
    );
  }

  function getServiceById(idOrSlug) {
    if (!idOrSlug) return null;
    const key = normalizeKey(idOrSlug);
    return (
      URT_DATA.services.find(
        (s) =>
          normalizeKey(s.id) === key ||
          normalizeKey(s.slug) === key ||
          normalizeKey(s.name) === key
      ) || null
    );
  }

  function getTicketsByCustomerId(customerId) {
    const cust = getCustomerById(customerId);
    const targetId = cust ? cust.id : customerId;
    return URT_DATA.tickets.filter((t) => t.customerId === targetId);
  }

  function getTicketsByTechnicianId(technicianId) {
    const tech = getTechnicianById(technicianId);
    const targetId = tech ? tech.id : technicianId;
    return URT_DATA.tickets.filter((t) => t.technicianId === targetId);
  }

  function formatCurrency(num) {
    if (typeof num !== "number") return num || "Rp0";
    return "Rp" + num.toLocaleString("id-ID");
  }

  // Jumlah data awal (seed) — dipakai agar statistik dashboard ikut bertambah saat CRUD
  const SEED = {
    customers: URT_DATA.customers.length,
    activeTickets: URT_DATA.tickets.filter((t) => t.status !== "SELESAI").length
  };

  function getDashboardStats() {
    const activeTickets = URT_DATA.tickets.filter(
      (t) => t.status !== "SELESAI"
    ).length;
    const pendingApproval = URT_DATA.tickets.filter(
      (t) => t.status === "PERSETUJUAN"
    ).length;
    const completedTickets = URT_DATA.tickets.filter(
      (t) => t.status === "SELESAI"
    ).length;
    const totalCustomers = 186 + (URT_DATA.customers.length - SEED.customers); // 186 = angka dasar ServisKita
    const activeTechnicians = URT_DATA.technicians.filter(
      (t) => t.status === "aktif"
    ).length;

    return {
      activeTickets: 28 + (activeTickets - SEED.activeTickets), // 28 = angka dasar ServisKita
      activeTicketsSample: activeTickets,
      pendingApproval,
      completedToday: 8,
      totalCustomers,
      activeTechnicians,
      subscriptionRemainingDays: URT_DATA.owner.planRemainingDays
    };
  }

  function initSidebarController() {
    const STORAGE_KEY = "urt_sidebar_state";
    const body = document.body;
    if (!body) return;

    // Restore saved state or apply responsive default
    const savedState = localStorage.getItem(STORAGE_KEY);
    const width = window.innerWidth;

    if (width >= 1200) {
      if (savedState === "collapsed") {
        body.classList.add("sidebar-collapsed");
      } else {
        body.classList.remove("sidebar-collapsed");
      }
    } else if (width >= 768 && width < 1200) {
      if (savedState === "expanded") {
        body.classList.remove("sidebar-collapsed");
      } else {
        body.classList.add("sidebar-collapsed");
      }
    } else {
      // Mobile < 768: Do not use desktop collapsed mode
      body.classList.remove("sidebar-collapsed");
    }

    // Find sidebar in Owner, Teknisi, or Pelanggan
    const sidebar =
      document.querySelector(".sidebar") ||
      document.querySelector("body > header");
    if (!sidebar) return;

    // Inject tooltips on navigation links if not already present
    sidebar
      .querySelectorAll("nav a, .sidebar-nav a, .nav-menu a")
      .forEach((link) => {
        const text =
          link.querySelector("span")?.textContent?.trim() ||
          link.textContent?.trim();
        if (text && !link.getAttribute("data-tooltip")) {
          link.setAttribute("data-tooltip", text);
        }
      });

    // Create desktop collapse button if not present
    let collapseBtn = document.getElementById("desktopCollapseToggle");
    if (!collapseBtn) {
      collapseBtn = document.createElement("button");
      collapseBtn.type = "button";
      collapseBtn.id = "desktopCollapseToggle";
      collapseBtn.className = "desktop-collapse-btn";
      collapseBtn.setAttribute("aria-label", "Ciutkan / Perluas Menu Navigasi");
      collapseBtn.innerHTML = `
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M15 19l-7-7 7-7" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span class="collapse-text">Ciutkan Menu</span>
      `;

      // Insert before profile or footer if exists, or append
      const profile = sidebar.querySelector(
        ".owner-mini-profile, .sidebar-footer, header > div[style*='margin-top: auto']"
      );
      if (profile) {
        sidebar.insertBefore(collapseBtn, profile);
      } else {
        const nav = sidebar.querySelector("nav, .sidebar-nav, .nav-menu");
        if (nav && nav.nextSibling) {
          sidebar.insertBefore(collapseBtn, nav.nextSibling);
        } else {
          sidebar.appendChild(collapseBtn);
        }
      }
    }

    const updateToggleLabels = (isCollapsed) => {
      const textEl = collapseBtn.querySelector(".collapse-text");
      if (textEl) {
        textEl.textContent = isCollapsed ? "Perluas Menu" : "Ciutkan Menu";
      }
      collapseBtn.setAttribute(
        "title",
        isCollapsed ? "Perluas Menu" : "Ciutkan Menu"
      );
    };

    updateToggleLabels(body.classList.contains("sidebar-collapsed"));

    if (!collapseBtn.dataset.wired) {
      collapseBtn.dataset.wired = "true";
      collapseBtn.addEventListener("click", () => {
        const isCollapsed = body.classList.toggle("sidebar-collapsed");
        localStorage.setItem(
          STORAGE_KEY,
          isCollapsed ? "collapsed" : "expanded"
        );
        updateToggleLabels(isCollapsed);
      });
    }
  }

  // Auto-init sidebar controller
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initSidebarController);
  } else {
    initSidebarController();
  }

  // Export to global window scope
  window.URT_DATA = URT_DATA;
  window.getCustomerById = getCustomerById;
  window.getTechnicianById = getTechnicianById;
  window.getTicketById = getTicketById;
  window.getServiceById = getServiceById;
  window.getTicketsByCustomerId = getTicketsByCustomerId;
  window.getTicketsByTechnicianId = getTicketsByTechnicianId;
  window.formatCurrency = formatCurrency;
  window.getDashboardStats = getDashboardStats;
  window.initSidebarController = initSidebarController;
})();


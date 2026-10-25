-- Membuat Database
CREATE DATABASE IF NOT EXISTS service_tracker;
USE service_tracker;

-- 1. Tabel Users (Menyimpan data Owner, Pelanggan, dan Teknisi)
CREATE TABLE users (
    id_user INT AUTO_INCREMENT PRIMARY KEY,
    nama VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('owner', 'pelanggan', 'teknisi') NOT NULL,
    no_telp VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabel Bisnis (Data toko/bisnis milik Owner)
CREATE TABLE bisnis (
    id_bisnis INT AUTO_INCREMENT PRIMARY KEY,
    id_owner INT NOT NULL,
    nama_bisnis VARCHAR(100) NOT NULL,
    alamat TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_owner) REFERENCES users(id_user) ON DELETE CASCADE
);

-- 3. Tabel Layanan (Katalog jasa yang ditawarkan oleh Owner)
CREATE TABLE layanan (
    id_layanan INT AUTO_INCREMENT PRIMARY KEY,
    id_bisnis INT NOT NULL,
    nama_layanan VARCHAR(100) NOT NULL,
    deskripsi TEXT,
    harga_dasar DECIMAL(10,2),
    FOREIGN KEY (id_bisnis) REFERENCES bisnis(id_bisnis) ON DELETE CASCADE
);

-- 4. Tabel Langganan (Sistem subscription/SaaS untuk Owner)
CREATE TABLE langganan (
    id_langganan INT AUTO_INCREMENT PRIMARY KEY,
    id_owner INT NOT NULL,
    paket_langganan VARCHAR(50) NOT NULL,
    status ENUM('aktif', 'kedaluwarsa', 'menunggu_pembayaran') DEFAULT 'menunggu_pembayaran',
    tanggal_mulai DATE,
    tanggal_berakhir DATE,
    FOREIGN KEY (id_owner) REFERENCES users(id_user) ON DELETE CASCADE
);

-- 5. Tabel Pembayaran Langganan (Invoice dan tagihan Owner)
CREATE TABLE pembayaran_langganan (
    id_pembayaran INT AUTO_INCREMENT PRIMARY KEY,
    id_langganan INT NOT NULL,
    jumlah DECIMAL(10,2) NOT NULL,
    metode_pembayaran VARCHAR(50),
    status_pembayaran ENUM('berhasil', 'gagal', 'pending') DEFAULT 'pending',
    tanggal_bayar TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_langganan) REFERENCES langganan(id_langganan) ON DELETE CASCADE
);

-- 6. Tabel Tiket Servis (Inti pelacakan untuk antrean, estimasi, dan riwayat)
CREATE TABLE tiket_servis (
    id_tiket INT AUTO_INCREMENT PRIMARY KEY,
    id_pelanggan INT NOT NULL,
    id_teknisi INT,
    id_layanan INT NOT NULL,
    keluhan TEXT NOT NULL,
    catatan_teknisi TEXT,
    biaya_estimasi DECIMAL(10,2),
    biaya_akhir DECIMAL(10,2),
    status ENUM('MASUK', 'DIAGNOSIS', 'PERSETUJUAN', 'PERBAIKAN', 'QC', 'SELESAI', 'DITOLAK') DEFAULT 'MASUK',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_pelanggan) REFERENCES users(id_user),
    FOREIGN KEY (id_teknisi) REFERENCES users(id_user),
    FOREIGN KEY (id_layanan) REFERENCES layanan(id_layanan)
);

-- Demo catalog so a clean installation can submit its first service request.
INSERT IGNORE INTO users (nama, email, password, role, no_telp)
VALUES ('URT Demo Owner', 'demo-owner@urt.local', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi', 'owner', '0800000000');

INSERT INTO bisnis (id_owner, nama_bisnis, alamat)
SELECT u.id_user, 'URT Service Center', 'Alamat demo'
FROM users u
WHERE u.email = 'demo-owner@urt.local'
  AND NOT EXISTS (SELECT 1 FROM bisnis b WHERE b.id_owner = u.id_user);

INSERT INTO layanan (id_bisnis, nama_layanan, deskripsi, harga_dasar)
SELECT b.id_bisnis, seed.nama_layanan, seed.deskripsi, seed.harga_dasar
FROM bisnis b
JOIN users u ON u.id_user = b.id_owner AND u.email = 'demo-owner@urt.local'
CROSS JOIN (
    SELECT 'Pemeriksaan dan Diagnosis' AS nama_layanan, 'Pemeriksaan awal perangkat' AS deskripsi, 0.00 AS harga_dasar
    UNION ALL SELECT 'Perbaikan Perangkat', 'Perbaikan perangkat dan komponen', 150000.00
    UNION ALL SELECT 'Pembersihan Perangkat', 'Pembersihan internal perangkat', 75000.00
) seed
WHERE NOT EXISTS (
    SELECT 1 FROM layanan l WHERE l.id_bisnis = b.id_bisnis AND l.nama_layanan = seed.nama_layanan
);

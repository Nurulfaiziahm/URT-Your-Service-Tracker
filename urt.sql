-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Waktu pembuatan: 24 Okt 2026 pada 23.45
-- Versi server: 10.4.32-MariaDB
-- Versi PHP: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `urt`
--

-- --------------------------------------------------------

--
-- Struktur dari tabel `bisnis`
--

CREATE TABLE `bisnis` (
  `id_bisnis` int(11) NOT NULL,
  `id_owner` int(11) NOT NULL,
  `nama_bisnis` varchar(100) NOT NULL,
  `alamat` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data untuk tabel `bisnis`
--

INSERT INTO `bisnis` (`id_bisnis`, `id_owner`, `nama_bisnis`, `alamat`, `created_at`) VALUES
(1, 1, 'ServisKita by Sofia', 'Jl. Margonda Raya, Depok', '2026-10-24 20:39:32'),
(2, 2, 'iFix Lab Auliya', 'Jl. Pemuda No. 45, Semarang', '2026-10-24 20:39:32');

-- --------------------------------------------------------

--
-- Struktur dari tabel `langganan`
--

CREATE TABLE `langganan` (
  `id_langganan` int(11) NOT NULL,
  `id_owner` int(11) NOT NULL,
  `paket_langganan` varchar(50) NOT NULL,
  `status` enum('aktif','kedaluwarsa','menunggu_pembayaran') DEFAULT 'menunggu_pembayaran',
  `tanggal_mulai` date DEFAULT NULL,
  `tanggal_berakhir` date DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data untuk tabel `langganan`
--

INSERT INTO `langganan` (`id_langganan`, `id_owner`, `paket_langganan`, `status`, `tanggal_mulai`, `tanggal_berakhir`) VALUES
(1, 1, 'Paket Tahunan', 'aktif', '2026-01-01', '2026-12-31'),
(2, 2, 'Paket Bulanan', 'kedaluwarsa', '2026-08-01', '2026-09-01');

-- --------------------------------------------------------

--
-- Struktur dari tabel `layanan`
--

CREATE TABLE `layanan` (
  `id_layanan` int(11) NOT NULL,
  `id_bisnis` int(11) NOT NULL,
  `nama_layanan` varchar(100) NOT NULL,
  `deskripsi` text DEFAULT NULL,
  `harga_dasar` decimal(10,2) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data untuk tabel `layanan`
--

INSERT INTO `layanan` (`id_layanan`, `id_bisnis`, `nama_layanan`, `deskripsi`, `harga_dasar`) VALUES
(1, 1, 'Deep Cleaning & Re-paste', 'Pembersihan total debu kipas dan penggantian thermal paste', 150000.00),
(2, 1, 'Penggantian LCD Laptop', 'Ganti panel layar LCD/LED rusak atau bergaris', 850000.00),
(3, 2, 'Install Ulang OS', 'Instalasi Windows/macOS beserta driver dan aplikasi dasar', 100000.00);

-- --------------------------------------------------------

--
-- Struktur dari tabel `pembayaran_langganan`
--

CREATE TABLE `pembayaran_langganan` (
  `id_pembayaran` int(11) NOT NULL,
  `id_langganan` int(11) NOT NULL,
  `jumlah` decimal(10,2) NOT NULL,
  `metode_pembayaran` varchar(50) DEFAULT NULL,
  `status_pembayaran` enum('berhasil','gagal','pending') DEFAULT 'pending',
  `tanggal_bayar` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data untuk tabel `pembayaran_langganan`
--

INSERT INTO `pembayaran_langganan` (`id_pembayaran`, `id_langganan`, `jumlah`, `metode_pembayaran`, `status_pembayaran`, `tanggal_bayar`) VALUES
(1, 1, 999000.00, 'Bank Transfer', 'berhasil', '2026-10-24 20:39:32'),
(2, 2, 99000.00, 'E-Wallet', 'berhasil', '2026-10-24 20:39:32'),
(3, 2, 99000.00, 'Virtual Account', 'pending', '2026-10-24 20:39:32');

-- --------------------------------------------------------

--
-- Struktur dari tabel `tiket_servis`
--

CREATE TABLE `tiket_servis` (
  `id_tiket` int(11) NOT NULL,
  `id_pelanggan` int(11) NOT NULL,
  `id_teknisi` int(11) DEFAULT NULL,
  `id_layanan` int(11) NOT NULL,
  `keluhan` text NOT NULL,
  `catatan_teknisi` text DEFAULT NULL,
  `biaya_estimasi` decimal(10,2) DEFAULT NULL,
  `biaya_akhir` decimal(10,2) DEFAULT NULL,
  `status` enum('menunggu','diestimasi','menunggu_persetujuan','disetujui','ditolak','diproses','selesai') DEFAULT 'menunggu',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data untuk tabel `tiket_servis`
--

INSERT INTO `tiket_servis` (`id_tiket`, `id_pelanggan`, `id_teknisi`, `id_layanan`, `keluhan`, `catatan_teknisi`, `biaya_estimasi`, `biaya_akhir`, `status`, `created_at`, `updated_at`) VALUES
(1, 1, 3, 1, 'Perangkat: ASUS VivoBook 14\nDetail Keluhan: Laptop mati tiba-tiba dan terasa sangat panas', 'Debu menumpuk pada fan dan thermal paste kering', 250000.00, NULL, 'selesai', '2026-10-24 20:39:33', '2026-10-24 20:45:20'),
(2, 5, 3, 2, 'Perangkat: Lenovo ThinkPad\nDetail Keluhan: Layar bergaris horizontal dan sering berkedip', 'Panel LCD rusak total, memerlukan penggantian unit layar baru', 1200000.00, 1200000.00, 'diproses', '2026-10-24 20:39:33', '2026-10-24 20:39:33'),
(3, 4, NULL, 3, 'Perangkat: PC Rakitan\nDetail Keluhan: Terkena virus ransomware, minta install ulang', NULL, NULL, NULL, 'menunggu', '2026-10-24 20:39:33', '2026-10-24 20:39:33'),
(4, 4, 3, 2, 'Perangkat: MacBook Air M1\nDetail Keluhan: Layar retak setelah jatuh dari meja.', 'Perlu penggantian full set LCD assembly.', 1500000.00, 1500000.00, 'selesai', '2026-10-24 20:42:49', '2026-10-24 20:42:49'),
(5, 4, 3, 3, 'Perangkat: PC Rakitan\nDetail Keluhan: Blue screen terus menerus saat booting.', 'Sistem operasi korup, perlu install ulang.', 150000.00, NULL, 'ditolak', '2026-10-24 20:42:49', '2026-10-24 20:42:49'),
(6, 5, 3, 1, 'Perangkat: ASUS ROG Strix\nDetail Keluhan: Kipas berbunyi sangat kasar dan laptop overheating.', 'Deep cleaning fan dan ganti thermal paste.', 250000.00, NULL, 'disetujui', '2026-10-24 20:42:49', '2026-10-24 20:42:49'),
(7, 5, 3, 1, 'Perangkat: Lenovo IdeaPad\nDetail Keluhan: Keyboard beberapa tombol mati.', 'Perlu ganti modul keyboard bawaan.', 450000.00, NULL, 'menunggu_persetujuan', '2026-10-24 20:42:49', '2026-10-24 20:42:49'),
(8, 5, NULL, 3, 'Perangkat: iPhone 13\nDetail Keluhan: Baterai sangat boros dan health turun ke 70%.', NULL, NULL, NULL, 'menunggu', '2026-10-24 20:42:49', '2026-10-24 20:42:49'),
(9, 1, NULL, 1, 'Perangkat: ASUS \nDetail Keluhan: Rusak', NULL, NULL, NULL, 'menunggu', '2026-10-24 20:43:37', '2026-10-24 20:43:37');

-- --------------------------------------------------------

--
-- Struktur dari tabel `users`
--

CREATE TABLE `users` (
  `id_user` int(11) NOT NULL,
  `nama` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('owner','pelanggan','teknisi') NOT NULL,
  `no_telp` varchar(20) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data untuk tabel `users`
--

INSERT INTO `users` (`id_user`, `nama`, `email`, `password`, `role`, `no_telp`, `created_at`) VALUES
(1, 'Sofia', 'sofia@gmail.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'pelanggan', '081234567890', '2026-10-24 19:28:08'),
(2, 'Malvalena', 'malvalenai@gmail.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'pelanggan', '081232425262', '2026-10-24 20:05:02'),
(3, 'Sofia Malvalena Adam', 'sofia@email.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'owner', '08111111111', '2026-10-24 20:39:32'),
(4, 'Auliya Nur Aini', 'auliya@email.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'owner', '08222222222', '2026-10-24 20:39:32'),
(5, 'Nurul Faiziah', 'nurul@email.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'teknisi', '08333333333', '2026-10-24 20:39:32'),
(6, 'Nino Rachimas', 'nino@email.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'pelanggan', '08444444444', '2026-10-24 20:39:32'),
(7, 'Wildan Krisna Hakim', 'wildan@email.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'pelanggan', '08555555555', '2026-10-24 20:39:32');

--
-- Indexes for dumped tables
--

--
-- Indeks untuk tabel `bisnis`
--
ALTER TABLE `bisnis`
  ADD PRIMARY KEY (`id_bisnis`),
  ADD KEY `id_owner` (`id_owner`);

--
-- Indeks untuk tabel `langganan`
--
ALTER TABLE `langganan`
  ADD PRIMARY KEY (`id_langganan`),
  ADD KEY `id_owner` (`id_owner`);

--
-- Indeks untuk tabel `layanan`
--
ALTER TABLE `layanan`
  ADD PRIMARY KEY (`id_layanan`),
  ADD KEY `id_bisnis` (`id_bisnis`);

--
-- Indeks untuk tabel `pembayaran_langganan`
--
ALTER TABLE `pembayaran_langganan`
  ADD PRIMARY KEY (`id_pembayaran`),
  ADD KEY `id_langganan` (`id_langganan`);

--
-- Indeks untuk tabel `tiket_servis`
--
ALTER TABLE `tiket_servis`
  ADD PRIMARY KEY (`id_tiket`),
  ADD KEY `id_pelanggan` (`id_pelanggan`),
  ADD KEY `id_teknisi` (`id_teknisi`),
  ADD KEY `id_layanan` (`id_layanan`);

--
-- Indeks untuk tabel `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id_user`),
  ADD UNIQUE KEY `email` (`email`);

--
-- AUTO_INCREMENT untuk tabel yang dibuang
--

--
-- AUTO_INCREMENT untuk tabel `bisnis`
--
ALTER TABLE `bisnis`
  MODIFY `id_bisnis` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT untuk tabel `langganan`
--
ALTER TABLE `langganan`
  MODIFY `id_langganan` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT untuk tabel `layanan`
--
ALTER TABLE `layanan`
  MODIFY `id_layanan` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT untuk tabel `pembayaran_langganan`
--
ALTER TABLE `pembayaran_langganan`
  MODIFY `id_pembayaran` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT untuk tabel `tiket_servis`
--
ALTER TABLE `tiket_servis`
  MODIFY `id_tiket` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT untuk tabel `users`
--
ALTER TABLE `users`
  MODIFY `id_user` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- Ketidakleluasaan untuk tabel pelimpahan (Dumped Tables)
--

--
-- Ketidakleluasaan untuk tabel `bisnis`
--
ALTER TABLE `bisnis`
  ADD CONSTRAINT `bisnis_ibfk_1` FOREIGN KEY (`id_owner`) REFERENCES `users` (`id_user`) ON DELETE CASCADE;

--
-- Ketidakleluasaan untuk tabel `langganan`
--
ALTER TABLE `langganan`
  ADD CONSTRAINT `langganan_ibfk_1` FOREIGN KEY (`id_owner`) REFERENCES `users` (`id_user`) ON DELETE CASCADE;

--
-- Ketidakleluasaan untuk tabel `layanan`
--
ALTER TABLE `layanan`
  ADD CONSTRAINT `layanan_ibfk_1` FOREIGN KEY (`id_bisnis`) REFERENCES `bisnis` (`id_bisnis`) ON DELETE CASCADE;

--
-- Ketidakleluasaan untuk tabel `pembayaran_langganan`
--
ALTER TABLE `pembayaran_langganan`
  ADD CONSTRAINT `pembayaran_langganan_ibfk_1` FOREIGN KEY (`id_langganan`) REFERENCES `langganan` (`id_langganan`) ON DELETE CASCADE;

--
-- Ketidakleluasaan untuk tabel `tiket_servis`
--
ALTER TABLE `tiket_servis`
  ADD CONSTRAINT `tiket_servis_ibfk_1` FOREIGN KEY (`id_pelanggan`) REFERENCES `users` (`id_user`),
  ADD CONSTRAINT `tiket_servis_ibfk_2` FOREIGN KEY (`id_teknisi`) REFERENCES `users` (`id_user`),
  ADD CONSTRAINT `tiket_servis_ibfk_3` FOREIGN KEY (`id_layanan`) REFERENCES `layanan` (`id_layanan`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;

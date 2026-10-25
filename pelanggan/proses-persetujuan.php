<?php
session_start();
require_once '../koneksi.php';

if (!isset($_SESSION['id_user']) || ($_SESSION['role'] ?? '') !== 'pelanggan') {
    header('Location: ../masuk.php');
    exit;
}

$id_tiket = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT) ?: 0;
$aksi = $_GET['aksi'] ?? '';
if (!$id_tiket || !in_array($aksi, ['setuju', 'tolak'], true)) {
    http_response_code(400);
    exit('Permintaan persetujuan tidak valid.');
}

$status = $aksi === 'setuju' ? 'PERBAIKAN' : 'DITOLAK';
$stmt = $conn->prepare("UPDATE tiket_servis SET status = ? WHERE id_tiket = ? AND id_pelanggan = ? AND status = 'PERSETUJUAN'");
$stmt->bind_param('sii', $status, $id_tiket, $_SESSION['id_user']);
$stmt->execute();
$updated = $stmt->affected_rows;
$stmt->close();

if ($updated !== 1) {
    http_response_code(404);
    exit('Tiket tidak ditemukan, bukan milik akun ini, atau sudah diproses.');
}

$destination = $aksi === 'setuju' ? 'persetujuan-disetujui.php' : 'persetujuan-ditolak.php';
header('Location: ' . $destination . '?id=' . $id_tiket);
exit;

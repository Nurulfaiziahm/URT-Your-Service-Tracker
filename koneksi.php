<?php
$host = "localhost";
$user = "root";       
$pass = "";        
$db   = "service_tracker";

$conn = new mysqli($host, $user, $pass, $db);

if ($conn->connect_error) {
    die("Koneksi database gagal: " . $conn->connect_error);
}
?>

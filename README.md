# Locana Ordering & Loyalty System Prototype

Prototipe aplikasi web pemesanan dan sistem loyalty member terpusat untuk **Locana**, dibangun menggunakan stack modern:
- **Frontend**: React.js (Vite) + Tailwind CSS v4 + Lucide Icons + Recharts (Visualisasi Grafik)
- **Backend**: Node.js (Express API) + Server-Sent Events (SSE) untuk realtime update
- **Database**: Firebase Firestore (NoSQL) dengan **Zero-Configuration Fallback** (file JSON lokal `mock_db.json` otomatis digunakan jika kredensial cloud kosong).

---

## Fitur Utama Prototipe

1. **Multi-Role & Hak Akses Dinamis**:
   - **Pelanggan**: Melihat menu, mencari produk, filter kategori, belanja via keranjang (dengan catatan per item), tukar loyalty point, checkout (QRIS / Bayar di Kasir).
   - **Kasir**: POS (Point of Sale) kasir utama, scan/cari kode pesanan unik 8-digit, konfirmasi pelunasan, pencarian member terintegrasi.
   - **Dapur/Barista**: Monitor antrean pesanan masuk realtime, detail catatan produk (custom note), tombol konfirmasi penyajian selesai.
   - **Manager / Owner**: Dashboard KPI komprehensif (omzet, total order, jam ramai, produk terlaris, visualisasi grafik Recharts, metrik efektivitas loyalty program).

2. **Integrasi Real-time**:
   - Transaksi yang checkout (via QRIS) atau dilunasi (di kasir) langsung terdistribusi ke monitor dapur & kasir secara instan memanfaatkan **Server-Sent Events (SSE)**.

3. **Sistem Loyalty Point Terpusat**:
   - Pelanggan mengumpulkan poin saat berbelanja produk reguler, dan dapat menukarkan poin tersebut secara langsung dengan menu yang mendukung opsi penukaran gratis.

---

## Akun Demo Pengujian

Gunakan akun demo berikut pada halaman masuk (disediakan panel klik-cepat / *quick-login* di form login):

| Peran (Role) | Email Pengguna | Kata Sandi | Kegunaan Utama |
| :--- | :--- | :--- | :--- |
| **Owner** | `owner@locana.com` | `owner123` | Akses seluruh modul + laporan operasional & finansial. |
| **Manager** | `manager@locana.com` | `manager123` | Akses dashboard laporan penjualan, jam ramai, produk terlaris. |
| **Kasir** | `cashier@locana.com` | `cashier123` | POS Kasir lunas, scan kode 8-digit pelanggan. |
| **Dapur/Barista** | `kitchen@locana.com` | `kitchen123` | Monitor dapur pengerjaan pesanan & tandai selesai. |
| **Pelanggan** | `customer@locana.com` | `customer123` | Menu, keranjang, checkout QRIS, cek saldo poin. |

*Tersedia juga akun member tambahan:*
- `siti@locana.com` (Siti Rahma - 920 Poin)
- `budi@locana.com` (Budi Santoso - 120 Poin)

---

## Petunjuk Menjalankan Proyek

### 1. Prasyarat
Pastikan Anda telah menginstal [Node.js](https://nodejs.org/) (Versi 18+ direkomendasikan) di komputer Anda.

### 2. Cara Menjalankan (Otomatis & Mudah)
Kami telah menyediakan automasi monorepo di root directory agar Anda dapat menginstal dependensi dan menjalankan frontend & backend sekaligus.

Buka terminal (Powershell / CMD) di direktori `Locana/` lalu jalankan perintah berikut:

```bash
# 1. Instal seluruh dependensi (Root, Backend, & Frontend) sekaligus
npm run install:all

# 2. Jalankan Server API Backend & Frontend React secara bersamaan
npm run dev
```

Aplikasi Anda akan berjalan di alamat berikut:
- **Frontend React**: [http://localhost:3000](http://localhost:3000)
- **Backend API**: [http://localhost:5000](http://localhost:5000)

*Catatan: Pada saat server backend dijalankan pertama kali, script database seeder akan mendeteksi database kosong dan otomatis memasukkan menu makanan, akun demo, serta **data transaksi historis selama 3 bulan** agar grafik pada dashboard langsung terisi visual yang realistis.*

---

## Cara Menghubungkan ke Database Firebase Cloud Asli

Secara bawaan, aplikasi berjalan menggunakan **Mock Firestore lokal** demi kemudahan jalannya prototipe tanpa registrasi. Untuk menghubungkannya ke Firebase Anda:

1. Buat project baru di konsol Firebase.
2. Aktifkan **Cloud Firestore Database**.
3. Masuk ke *Project Settings* > *Service Accounts* > klik *Generate New Private Key* untuk mendownload file `.json`.
4. Letakkan file `.json` tersebut ke dalam folder `backend/` dengan nama `serviceAccountKey.json`.
5. Buka file `backend/.env` dan pastikan baris `USE_MOCK_FIREBASE=true` dimatikan (dihapus atau di-comment).
6. Restart server backend Anda. Server otomatis membaca file kunci tersebut dan bermigrasi menggunakan database cloud Firebase Firestore secara langsung.

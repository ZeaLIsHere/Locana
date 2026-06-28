# QR Table Ordering System — Design Spec
**Date:** 2026-06-28  
**Status:** Approved  

---

## Overview

Tambah fitur QR code per meja agar customer bisa scan dan langsung memesan dari meja tanpa perlu login terlebih dahulu. Setiap order yang masuk membawa informasi nomor meja sehingga kasir, dapur, manager, dan owner bisa mengetahui pesanan berasal dari meja mana.

---

## Keputusan Desain Utama

- **Tidak ada shared cart / session per meja.** Setiap customer yang scan punya cart sendiri di browser. Ini menghindari kompleksitas sinkronisasi dan mencegah orang iseng memodifikasi cart orang lain.
- **QR URL permanen.** URL berbentuk `/table/3` — tidak ada token, tidak perlu regenerate. Nomor meja ada di URL, bukan ID internal.
- **Repeat order bebas.** Customer bisa scan dan order berkali-kali dari meja yang sama tanpa ada reset atau session yang menghalangi.
- **Login wajib saat checkout.** Customer bisa lihat menu dan isi cart tanpa login, tapi wajib login saat mau checkout (untuk loyalty points dan identitas order).

---

## Arsitektur

### Data Baru di Firestore

**Collection `tables`**
```json
{
  "id": "tbl-001",
  "number": 3,
  "label": "Meja 3",
  "capacity": 4,
  "is_active": true,
  "created_at": "ISO string",
  "created_by": "uid-manager"
}
```

**Perubahan di collection `orders`** — dua field baru:
```json
{
  "table_id": "tbl-001",
  "table_number": 3
}
```
Jika order datang dari CustomerMenu biasa (bukan via QR), kedua field ini bernilai `null`.

---

### Backend — Endpoint Baru

| Method | Path | Role |
|--------|------|------|
| `GET` | `/api/tables` | Public |
| `POST` | `/api/tables` | manager, owner |
| `PUT` | `/api/tables/:id` | manager, owner |
| `DELETE` | `/api/tables/:id` | manager, owner |
| `GET` | `/api/tables/qr-export` | manager, owner |

**`GET /api/tables/qr-export`**  
Generate semua QR code aktif, bundle ke ZIP (satu PNG per meja, nama file `meja-3.png`), kirim sebagai download. Library: `qrcode` (generate PNG) + `archiver` (bundle ZIP).

**`DELETE /api/tables/:id`**  
Tolak jika ada order dengan status `preparing` atau `pending_payment` yang memiliki `table_id` tersebut. Tampilkan pesan error: `"Ada pesanan aktif di meja ini, selesaikan dulu sebelum menghapus."` Jika tidak ada order aktif, hapus bebas.

---

### Frontend — Halaman & Komponen Baru

**`/table/:tableNumber` — TableMenu Page**  
- Reuse `CustomerMenu` yang sudah ada, inject `tableNumber` dari URL params
- Header tambahan: chip/badge `"Meja X"` agar customer sadar mereka memesan untuk meja tertentu
- Saat checkout: jika belum login, tampilkan modal login → setelah login, lanjut checkout
- `table_number` dikirim sebagai bagian dari payload `POST /orders`
- Halaman ini bisa diakses tanpa login (browsing menu bebas)

**Manager — Tab "Manajemen Meja" (halaman baru di sidebar)**  
- Tabel list semua meja: nomor, label, kapasitas, status aktif
- Tombol tambah meja (form: nomor, label, kapasitas)
- Per baris: edit label/kapasitas, toggle aktif/nonaktif, hapus
- Tombol global: **"Download Semua QR (ZIP)"** → hit `GET /api/tables/qr-export`

---

### Perubahan di Halaman Existing

| Halaman | Perubahan |
|---------|-----------|
| `CashierPOS` | Tampilkan badge `"Meja X"` di setiap order card. Filter tambahan by table number. |
| `KitchenMonitor` | Tampilkan badge `"Meja X"` di setiap order card. |
| `ManagerDashboard` | Kolom/filter tambahan `table_number` di daftar order. |
| `SalesReports` | Filter by table number untuk analisis per meja. |
| `Sidebar` | Tambah menu `"Manajemen Meja"` untuk role `manager` dan `owner`. |
| `App.jsx` | Tambah route `/table/:tableNumber` → `TableMenu` (tanpa Navbar/Sidebar staff). |
| `orderController.js` | Terima `table_id` dan `table_number` dari request body, simpan ke order. |

---

## User Flow Lengkap

```
Customer scan QR (misal: https://locana.app/table/3)
        ↓
Buka /table/3 — tampil menu dengan badge "Meja 3"
        ↓
Tambah item ke cart (no login needed)
        ↓
Klik "Checkout"
        ↓
Belum login? → Modal login → Login → kembali ke cart
        ↓
Pilih metode bayar (QRIS / Kasir)
        ↓
POST /orders dengan { ..., table_id: "tbl-001", table_number: 3 }
        ↓
Kasir & dapur terima order dengan badge "Meja 3"
        ↓
Customer bisa langsung scan lagi untuk repeat order
```

---

## QR Code Format

- **URL:** `https://locana.app/table/{number}` (gunakan nomor meja, bukan ID internal)
- **Ukuran PNG:** 300×300px
- **Nama file di ZIP:** `meja-{number}.png`
- **Nama file ZIP:** `locana-qr-tables.zip`

---

## Dependencies Baru

| Package | Lokasi | Kegunaan |
|---------|--------|---------|
| `qrcode` | backend | Generate QR PNG |
| `archiver` | backend | Bundle PNG ke ZIP |

---

## Out of Scope

- Shared cart antar device di meja yang sama
- Token-based QR (invalidasi QR lama)
- Notifikasi real-time ke customer saat order mereka selesai (sudah ada via order number lookup)
- Reservasi meja / manajemen availability meja

---

## Urutan Implementasi yang Disarankan

1. Backend: `tableController.js` + endpoint tables + QR export
2. Backend: Update `orderController.js` untuk terima `table_number`
3. Frontend: Route `/table/:tableNumber` + `TableMenu` page
4. Frontend: Badge `"Meja X"` di CashierPOS & KitchenMonitor
5. Frontend: Manager "Manajemen Meja" page
6. Frontend: Update Sidebar + App.jsx routing

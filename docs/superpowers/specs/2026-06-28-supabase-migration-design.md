# Migrasi Firebase Firestore → Supabase (Postgres) — Design Spec

**Date:** 2026-06-28
**Status:** Approved

---

## Overview

Memindahkan backend Locana dari Firebase Firestore ke Supabase (Postgres) untuk
lepas dari batas kuota harian per-operasi Firestore (50K reads/hari, 20K
writes/hari di Spark plan). Pola kode saat ini — mengambil seluruh koleksi lalu
filter/agregasi di memori JS — membakar kuota Firestore dengan cepat, tetapi
aman di Postgres karena tidak ada plafon per-operasi.

Auth tetap memakai JWT + bcrypt yang sudah ada (tidak mengadopsi Supabase Auth).
Bentuk request/response API **tidak berubah**, sehingga frontend tidak perlu
disentuh.

---

## Keputusan Desain Utama

- **Pendekatan A — `supabase-js` + skema relasional, `items` sebagai JSONB.**
  Tiap koleksi → tabel Postgres dengan kolom bertipe. Array `items` di order
  disimpan sebagai kolom JSONB (cocok dengan struktur nested sekarang, tanpa join).
- **Client `@supabase/supabase-js`** (lewat PostgREST/HTTP) — stateless, aman
  untuk Vercel serverless, tanpa masalah connection pool.
- **ID tetap string buatan aplikasi** (`user-owner`, `ord-...`, `tbl-...`,
  `prod-...`, `cat-...`, `loy-...`). Semua PK bertipe `text`, diisi aplikasi.
- **Mock Firestore dibuang.** Dev lokal connect langsung ke Supabase cloud.
- **Mulai fresh** — tidak ada migrasi data dari Firestore; data diisi ulang lewat
  seeder (`npm run seed`).
- **RLS dimatikan** pada semua tabel; akses kontrol ditangani backend (JWT +
  verifyRoles) memakai service-role key dari server. Tidak ada akses langsung
  browser → Postgres.

---

## Skema Database

Semua PK `text` (diisi aplikasi). Kolom mengikuti field yang dipakai kode saat ini.

```sql
-- users
id text PRIMARY KEY
username text
email text UNIQUE NOT NULL
password_hash text NOT NULL
role text NOT NULL              -- owner|manager|cashier|kitchen|customer
name text
phone text
birthday date                  -- nullable
loyalty_points int DEFAULT 0   -- saldo, dijaga backend agar tidak pernah < 0
created_at timestamptz DEFAULT now()

-- categories
id text PRIMARY KEY
name text NOT NULL
slug text

-- products
id text PRIMARY KEY
category_id text
name text NOT NULL
description text DEFAULT ''
price numeric NOT NULL
points_cost int DEFAULT 0
points_reward int DEFAULT 0
image_url text
is_available boolean DEFAULT true

-- orders
id text PRIMARY KEY
order_number text
customer_id text               -- nullable (guest)
customer_name text
cashier_id text                -- nullable
table_id text                  -- nullable
table_number int               -- nullable
status text
payment_method text
payment_status text
total_price numeric
points_earned numeric DEFAULT 0   -- numeric: bisa pecahan (multiplier 1.2/1.5)
points_redeemed int DEFAULT 0
notes text DEFAULT ''
created_at timestamptz
items jsonb NOT NULL DEFAULT '[]'  -- array item nested, apa adanya

-- loyalty_transactions (BUKU BESAR / ledger, bukan saldo)
id text PRIMARY KEY
customer_id text
order_id text
points int                     -- bisa negatif: earn = +, redeem = -
transaction_type text          -- earn|redeem
created_at timestamptz

-- tables
id text PRIMARY KEY
number int
label text
is_active boolean DEFAULT true
created_at timestamptz
created_by text                -- nullable
```

**Index:** `users(email)` unik, `orders(customer_id)`, `orders(status)`,
`orders(created_at)`, `orders(payment_status)`, `products(category_id)`,
`tables(number)` unik, `loyalty_transactions(customer_id)`,
`loyalty_transactions(order_id)`.

**Catatan poin:** `users.loyalty_points` adalah saldo dan **tidak pernah
negatif** — dijaga dua lapis di backend: `createOrder` menolak redeem melebihi
saldo, `processPayment` clamp saldo baru ke `Math.max(0, ...)`. Kolom
`loyalty_transactions.points` boleh negatif karena hanya mencatat arah mutasi
(redeem = poin keluar), seperti mutasi rekening — bukan saldo.

---

## Lapisan Akses DB

`config/db.js` ditulis ulang total (Firestore + mock dibuang):

```js
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY   // service-role: server-only, bypass RLS
);

// supabase-js mengembalikan { data, error } (tidak melempar). unwrap() melempar
// saat error agar try/catch di controller tetap berfungsi apa adanya.
function unwrap({ data, error }) {
  if (error) throw error;
  return data;
}

module.exports = { supabase, unwrap };
```

Controller berubah dari `const { db } = require('../config/db')` →
`const { supabase, unwrap } = require('../config/db')`.

**Pemetaan operasi** (bentuk JSON balikan tetap identik):

| Firestore (sekarang) | supabase-js (jadi) |
|---|---|
| `db.collection('products').get()` + `forEach` | `unwrap(await supabase.from('products').select('*'))` |
| `db.collection('orders').doc(id).get()` + `doc.exists` | `await supabase.from('orders').select('*').eq('id', id).maybeSingle()` → cek `null` |
| `db.collection('orders').doc(id).set(obj)` | `unwrap(await supabase.from('orders').insert(obj))` |
| `ref.update({ status })` | `await supabase.from('orders').update({ status }).eq('id', id)` |
| `ref.delete()` | `await supabase.from('tables').delete().eq('id', id)` |
| `.where('email','==',x).get()` | `.select('*').eq('email', x)` |
| `.where('number','==',n).where('is_active','==',true)` | `.select('*').eq('number', n).eq('is_active', true)` |

`.maybeSingle()` mengembalikan `null` kalau tidak ada baris → menggantikan
`doc.exists`. ID string tetap dibuat aplikasi dan dimasukkan eksplisit saat
`insert`. Sorting/agregasi di reports tetap di JS.

**Dependency:** buang `firebase-admin`, tambah `@supabase/supabase-js`. Hapus
`src/config/mockFirestore.js`.

**Env vars baru:** `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`. Hapus semua
`FIREBASE_*` (PROJECT_ID, CLIENT_EMAIL, PRIVATE_KEY, PRIVATE_KEY_BASE64,
USE_MOCK_FIREBASE, SERVICE_ACCOUNT_KEY).

---

## Rewrite Controller

Struktur & logika tiap controller dipertahankan (validasi, perhitungan poin,
broadcast SSE) — hanya baris akses DB yang diganti. Request/response tidak berubah.

- **authController** — `login` cari user `.eq('email', email).maybeSingle()`;
  `computeMemberMetrics` ambil orders `.eq('customer_id', userId)`; `getProfile`
  `.eq('id', req.user.id).maybeSingle()`. bcrypt/JWT tetap.
- **productController** — `getCategories`/`getProducts` `select('*')` (filter
  category/search tetap di JS); `createProduct` → `insert`; `updateProduct` →
  `update().eq('id', id)`; `deleteProduct` → soft-delete `update({ is_available:false })`.
- **orderController** — `createOrder`: ambil products, lookup table
  `.eq('number',n).eq('is_active',true)`, cek customer, hitung poin/birthday
  (semua logika tetap), lalu `insert(newOrder)` dengan `items` JSONB, broadcast
  SSE. `getOrders` `select('*')` + sort/filter JS. `getOrderById`
  `.eq('id',id).maybeSingle()`. `processPayment`: update order → update saldo
  user (clamp ≥0) → insert 1–2 `loyalty_transactions`, **tetap berurutan
  non-transaksional** seperti sekarang. `updateOrderStatus`
  `update({status}).eq('id',id)`.
- **tableController** — `getTables` `select('*')` + sort JS; `createTable` cek
  duplikat `.eq('number',n)` (cek `data.length`) lalu `insert`; `updateTable`
  `update().eq('id',id)`; `deleteTable` cek order aktif `.eq('table_id',id)` +
  filter status JS, lalu `delete().eq('id',id)`. Bagian QR/ZIP (archiver+qrcode)
  tidak tersentuh.
- **reportController** — `getDashboardReports`, `getSalesReports` (9 tipe),
  `getPosReports` (4 tipe): hanya baris ambil `orders`/`users`/`products`/
  `categories` diganti `select('*')`. Seluruh agregasi tetap di JS.

---

## Seeder & Boot

- `config/seeder.js`: `.doc(id).set(obj)` → `.upsert(obj)` (idempoten). 280 order
  & loyalty tx di-`insert` per-array (batch) dalam satu panggilan, bukan 280
  panggilan terpisah.
- **Hapus auto-seed-on-boot** dari `server.js`. Seeding jadi perintah eksplisit
  `npm run seed` (= `node src/config/seeder.js`, blok run-langsung sudah ada).
  `server.js` cukup `app.listen`. Ini sekaligus menghilangkan pola boros yang
  menulis ulang DB tiap restart dev.
- `api/index.js`: endpoint diagnostik root `/` diganti melaporkan status koneksi
  Supabase (bukan `isMock`/`firebaseError`).

---

## Testing

Proyek belum punya framework test; logika berat di integrasi DB, jadi unit test
dengan mock bernilai kecil. Yang dipakai: **smoke test integrasi** terhadap
Supabase sungguhan via `scripts/smoke-test.js` — jalankan server (pointing ke
Supabase), panggil tiap endpoint berurutan, assert status + field kunci:

1. `POST /auth/login` tiap role → dapat token
2. `GET /products`, `GET /categories` → array tidak kosong
3. `POST /orders` (guest & member, satu via `table_number`) → tersimpan,
   `table_id` ter-resolve
4. `POST /orders/:id/pay` → status `preparing`, saldo poin member berubah, baris
   `loyalty_transactions` muncul
5. `PUT /orders/:id/status` → status berubah
6. `GET /reports/dashboard`, `/reports/sales?type=...`, `/reports/pos?type=...`
   → tidak error, struktur benar
7. Tables CRUD + `GET /tables/qr-export` → ZIP ter-generate

**Checklist manual frontend** setelah deploy: login tiap role; scan `/table/N` →
pesan → kasir bayar → dapur lihat → dashboard render.

---

## Env & Deploy

- Buat project Supabase → jalankan `supabase/schema.sql` (semua tabel + index)
  lewat SQL Editor.
- Ambil `SUPABASE_URL` + `service_role key` (Settings → API).
- `.env` lokal: tambah 2 var, hapus semua `FIREBASE_*`.
- Vercel (project backend): set 2 var, hapus `FIREBASE_*`, **redeploy tanpa build
  cache**.
- Jalankan `npm run seed` sekali untuk mengisi data.

**Bagian yang butuh user (tidak bisa dikerjakan agen):** membuat project Supabase,
menyediakan `SUPABASE_URL` + `service_role key`, dan men-set env vars di Vercel +
redeploy. Sisanya (kode, schema.sql, seeder, smoke test, commit) dikerjakan agen.

---

## Urutan Rollout (jadi task di plan)

1. Provision Supabase + `supabase/schema.sql` + env vars
2. Rewrite `config/db.js` (client + `unwrap`); swap dependency (buang
   `firebase-admin` & `mockFirestore.js`, tambah `@supabase/supabase-js`)
3. Rewrite seeder + script `npm run seed`; hapus auto-seed-on-boot dari `server.js`
4. Rewrite controllers: auth → product → order → table → report
5. Update endpoint diagnostik `api/index.js` + `server.js`
6. Smoke test terhadap Supabase
7. Deploy: set env Vercel, redeploy tanpa cache, seed, verifikasi

---

## Out of Scope

- Migrasi data lama dari Firestore (mulai fresh via seeder)
- Adopsi Supabase Auth (tetap JWT + bcrypt sendiri)
- Normalisasi `order_items` ke tabel terpisah (tetap JSONB)
- Memindahkan agregasi report ke SQL (tetap di JS)
- Supabase Realtime (SSE level aplikasi yang ada tetap dipakai)
- Mock/offline dev mode (dev connect langsung ke Supabase cloud)

# QR Table Ordering System — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add QR-per-table ordering so customers scan a table's QR to open the menu and order, with table number visible on every order card in cashier, kitchen, and manager views.

**Architecture:** Each table is stored in a Firestore `tables` collection. Scanning a QR opens `/table/:number` which renders CustomerMenu with a `tableNumber` prop, bypassing the login gate; login is required only at checkout. Orders carry `table_number` and `table_id` fields. Manager generates and downloads all QR codes as a ZIP.

**Tech Stack:** Node.js/Express backend, Firebase Firestore, React (Vite, no router — URL parsed via `window.location`), Tailwind CSS, `qrcode` npm package, `archiver` npm package.

## Global Constraints

- Frontend has no react-router — URL routing is done by parsing `window.location.pathname` in `App.jsx`.
- Frontend Vercel rewrite already catches all paths to `index.html` (frontend/vercel.json).
- All monetary values in IDR (integer). No cents.
- Tailwind classes only — no inline CSS beyond what already exists.
- Do not change `authController.js` or auth middleware.
- `table_number` and `table_id` are `null` on orders placed from the regular CustomerMenu (non-QR path).
- QR URL format: `https://locana.app/table/{number}` — use `number` (integer), not internal `id`.

---

## File Map

**Create:**
- `backend/src/controllers/tableController.js` — CRUD for tables + QR ZIP export
- `frontend/src/pages/Manager/TableManagement.jsx` — manager UI for table CRUD + download

**Modify:**
- `backend/src/routes/api.js` — register table routes
- `backend/src/controllers/orderController.js` — accept `table_number` in `createOrder`, look up `table_id`
- `frontend/src/pages/Login.jsx` — remove customer demo account, update subtitle
- `frontend/src/App.jsx` — parse `/table/:n` URL, bypass login gate
- `frontend/src/context/OrderContext.jsx` — `checkout()` accepts optional `tableNumber`
- `frontend/src/pages/Customer/CustomerMenu.jsx` — add `tableNumber` prop, table badge, login modal gate
- `frontend/src/components/Sidebar.jsx` — add "Manajemen Meja" menu item
- `frontend/src/pages/Cashier/CashierPOS.jsx` — show "Meja X" badge on order cards
- `frontend/src/pages/Kitchen/KitchenMonitor.jsx` — show "Meja X" badge on order cards

---

## Task 1: Backend — Install dependencies + tableController + routes

**Files:**
- Create: `backend/src/controllers/tableController.js`
- Modify: `backend/src/routes/api.js`

**Interfaces:**
- Produces:
  - `GET /api/tables` → `[{ id, number, label, capacity, is_active, created_at, created_by }]`
  - `POST /api/tables` body: `{ number, label, capacity }` → `{ id, number, label, ... }`
  - `PUT /api/tables/:id` body: `{ label?, capacity?, is_active? }` → updated table
  - `DELETE /api/tables/:id` → 200 or 400 if active orders exist
  - `GET /api/tables/qr-export` → ZIP file download (Content-Type: application/zip)

- [ ] **Step 1: Install qrcode and archiver in backend**

```bash
cd backend && npm install qrcode archiver
```

Expected: packages added to backend/package.json, no errors.

- [ ] **Step 2: Create `backend/src/controllers/tableController.js`**

```javascript
const { db } = require('../config/db');
const QRCode = require('qrcode');
const archiver = require('archiver');

async function getTables(req, res) {
  try {
    const snapshot = await db.collection('tables').get();
    const tables = [];
    snapshot.forEach(doc => tables.push({ id: doc.id, ...doc.data() }));
    tables.sort((a, b) => a.number - b.number);
    return res.status(200).json(tables);
  } catch (err) {
    console.error('Get tables error:', err);
    return res.status(500).json({ error: 'Failed to fetch tables' });
  }
}

async function createTable(req, res) {
  const { number, label, capacity } = req.body;
  if (!number || !label) {
    return res.status(400).json({ error: 'number and label are required' });
  }

  try {
    // Check for duplicate table number
    const existing = await db.collection('tables').where('number', '==', parseInt(number)).get();
    if (!existing.empty) {
      return res.status(400).json({ error: `Meja nomor ${number} sudah ada` });
    }

    const id = `tbl-${Date.now()}`;
    const newTable = {
      id,
      number: parseInt(number),
      label: label.trim(),
      capacity: parseInt(capacity) || 4,
      is_active: true,
      created_at: new Date().toISOString(),
      created_by: req.user?.uid || null
    };

    await db.collection('tables').doc(id).set(newTable);
    return res.status(201).json(newTable);
  } catch (err) {
    console.error('Create table error:', err);
    return res.status(500).json({ error: 'Failed to create table' });
  }
}

async function updateTable(req, res) {
  const { id } = req.params;
  const { label, capacity, is_active } = req.body;

  try {
    const ref = db.collection('tables').doc(id);
    const doc = await ref.get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Table not found' });
    }

    const updates = {};
    if (label !== undefined) updates.label = label.trim();
    if (capacity !== undefined) updates.capacity = parseInt(capacity);
    if (is_active !== undefined) updates.is_active = Boolean(is_active);

    await ref.update(updates);
    return res.status(200).json({ id, ...doc.data(), ...updates });
  } catch (err) {
    console.error('Update table error:', err);
    return res.status(500).json({ error: 'Failed to update table' });
  }
}

async function deleteTable(req, res) {
  const { id } = req.params;

  try {
    const doc = await db.collection('tables').doc(id).get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Table not found' });
    }

    // Block delete if there are active orders for this table
    const activeOrdersSnap = await db.collection('orders')
      .where('table_id', '==', id)
      .get();

    const activeOrders = [];
    activeOrdersSnap.forEach(d => {
      const o = d.data();
      if (['pending_payment', 'preparing'].includes(o.status)) {
        activeOrders.push(o);
      }
    });

    if (activeOrders.length > 0) {
      return res.status(400).json({
        error: 'Ada pesanan aktif di meja ini, selesaikan dulu sebelum menghapus.'
      });
    }

    await db.collection('tables').doc(id).delete();
    return res.status(200).json({ message: 'Table deleted successfully' });
  } catch (err) {
    console.error('Delete table error:', err);
    return res.status(500).json({ error: 'Failed to delete table' });
  }
}

async function exportQRCodes(req, res) {
  try {
    const snapshot = await db.collection('tables').where('is_active', '==', true).get();
    const tables = [];
    snapshot.forEach(doc => tables.push({ id: doc.id, ...doc.data() }));
    tables.sort((a, b) => a.number - b.number);

    if (tables.length === 0) {
      return res.status(400).json({ error: 'Tidak ada meja aktif untuk di-export' });
    }

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="locana-qr-tables.zip"');

    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.on('error', err => { throw err; });
    archive.pipe(res);

    const baseUrl = process.env.FRONTEND_URL || 'https://locana.app';

    for (const table of tables) {
      const url = `${baseUrl}/table/${table.number}`;
      const pngBuffer = await QRCode.toBuffer(url, {
        type: 'png',
        width: 300,
        margin: 2,
        color: { dark: '#1c1917', light: '#ffffff' }
      });
      archive.append(pngBuffer, { name: `meja-${table.number}.png` });
    }

    await archive.finalize();
  } catch (err) {
    console.error('QR export error:', err);
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Failed to generate QR codes' });
    }
  }
}

module.exports = { getTables, createTable, updateTable, deleteTable, exportQRCodes };
```

- [ ] **Step 3: Register table routes in `backend/src/routes/api.js`**

Add at the top (import section):
```javascript
const { getTables, createTable, updateTable, deleteTable, exportQRCodes } = require('../controllers/tableController');
```

Add after the products routes block:
```javascript
// Table Routes
router.get('/tables', getTables);
router.get('/tables/qr-export', authenticateToken, verifyRoles('owner', 'manager'), exportQRCodes);
router.post('/tables', authenticateToken, verifyRoles('owner', 'manager'), createTable);
router.put('/tables/:id', authenticateToken, verifyRoles('owner', 'manager'), updateTable);
router.delete('/tables/:id', authenticateToken, verifyRoles('owner', 'manager'), deleteTable);
```

> **Important:** `GET /tables/qr-export` must be registered BEFORE `GET /tables/:id` (if that ever gets added) so Express doesn't match `qr-export` as an `:id` parameter.

- [ ] **Step 4: Manual test — start backend and verify endpoints**

```bash
cd backend && npm run dev
```

```bash
# Create a table
curl -X POST http://localhost:5000/api/tables \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <owner_token>" \
  -d '{"number": 1, "label": "Meja 1", "capacity": 4}'
# Expected: 201 { id: "tbl-...", number: 1, label: "Meja 1", ... }

# List tables
curl http://localhost:5000/api/tables
# Expected: 200 [{ id, number: 1, label: "Meja 1", ... }]
```

- [ ] **Step 5: Commit**

```bash
git add backend/src/controllers/tableController.js backend/src/routes/api.js backend/package.json backend/package-lock.json
git commit -m "feat: add tableController and table routes with QR ZIP export"
```

---

## Task 2: Backend — Update orderController to accept table_number

**Files:**
- Modify: `backend/src/controllers/orderController.js:14-35` (createOrder function)

**Interfaces:**
- Consumes: `POST /api/orders` body now accepts `{ ..., table_number?: number }`
- Produces: saved order now includes `table_id: string|null, table_number: number|null`

- [ ] **Step 1: Update `createOrder` in `backend/src/controllers/orderController.js`**

Change the destructuring at the top of `createOrder` (line 15):
```javascript
// Before:
const { customer_id, items, payment_method, notes } = req.body;

// After:
const { customer_id, items, payment_method, notes, table_number } = req.body;
```

Add table lookup after the products fetch (after line 32, before customer validation):
```javascript
// Look up table_id from table_number
let tableId = null;
if (table_number) {
  const tableSnap = await db.collection('tables')
    .where('number', '==', parseInt(table_number))
    .where('is_active', '==', true)
    .get();
  if (!tableSnap.empty) {
    tableId = tableSnap.docs[0].id;
  }
}
```

In the `newOrder` object (around line 194), add the two new fields:
```javascript
const newOrder = {
  id: orderId,
  order_number: orderNumber,
  customer_id: customer_id || null,
  customer_name: customerData ? customerData.name : 'Guest/Umum',
  cashier_id: null,
  table_id: tableId,           // ADD THIS
  table_number: table_number ? parseInt(table_number) : null,  // ADD THIS
  status,
  payment_method,
  payment_status,
  total_price: totalPrice,
  points_earned: customer_id ? pointsEarned : 0,
  points_redeemed: customer_id ? pointsRedeemed : 0,
  notes: notes || '',
  created_at: new Date().toISOString(),
  items: processedItems
};
```

- [ ] **Step 2: Manual test — place order with table_number**

```bash
curl -X POST http://localhost:5000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "items": [{"product_id": "prod-001", "quantity": 1}],
    "payment_method": "cashier",
    "table_number": 1
  }'
# Expected: 201, order contains table_number: 1, table_id: "tbl-..."

# Place order without table_number (existing flow still works)
curl -X POST http://localhost:5000/api/orders \
  -H "Content-Type: application/json" \
  -d '{"items": [{"product_id": "prod-001", "quantity": 1}], "payment_method": "cashier"}'
# Expected: 201, order contains table_number: null, table_id: null
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/controllers/orderController.js
git commit -m "feat: accept table_number in createOrder, resolve table_id from tables collection"
```

---

## Task 3: Frontend — Update Login.jsx (remove customer, update subtitle)

**Files:**
- Modify: `frontend/src/pages/Login.jsx:13-19` (demoAccounts array)
- Modify: `frontend/src/pages/Login.jsx:86-87` (subtitle paragraph)

**Interfaces:**
- Produces: Login page no longer shows "Pelanggan" demo button. Subtitle updated.

- [ ] **Step 1: Remove customer from demoAccounts array**

In `frontend/src/pages/Login.jsx`, replace the `demoAccounts` array:
```javascript
// Before:
const demoAccounts = [
  { label: 'Pelanggan', email: 'customer@locana.com', pass: 'customer123', color: 'bg-stone-100 hover:bg-stone-200 text-stone-800' },
  { label: 'Kasir POS', email: 'cashier@locana.com', pass: 'cashier123', color: 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200' },
  { label: 'Dapur/Barista', email: 'kitchen@locana.com', pass: 'kitchen123', color: 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200' },
  { label: 'Manager', email: 'manager@locana.com', pass: 'manager123', color: 'bg-blue-50 hover:bg-blue-100 text-blue-800 border-blue-200' },
  { label: 'Owner', email: 'owner@locana.com', pass: 'owner123', color: 'bg-purple-50 hover:bg-purple-100 text-purple-800 border-purple-200' }
];

// After:
const demoAccounts = [
  { label: 'Kasir POS', email: 'cashier@locana.com', pass: 'cashier123', color: 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200' },
  { label: 'Dapur/Barista', email: 'kitchen@locana.com', pass: 'kitchen123', color: 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200' },
  { label: 'Manager', email: 'manager@locana.com', pass: 'manager123', color: 'bg-blue-50 hover:bg-blue-100 text-blue-800 border-blue-200' },
  { label: 'Owner', email: 'owner@locana.com', pass: 'owner123', color: 'bg-purple-50 hover:bg-purple-100 text-purple-800 border-purple-200' }
];
```

- [ ] **Step 2: Update subtitle and add customer hint**

Replace the subtitle paragraph (around line 87):
```jsx
// Before:
<p className="mt-1.5 text-xs text-stone-500">Silakan masuk untuk memesan dan mengumpulkan poin loyalty.</p>

// After:
<p className="mt-1.5 text-xs text-stone-500">Portal akses untuk staf Locana. Pelanggan? Scan QR di meja Anda untuk memesan.</p>
```

- [ ] **Step 3: Manual test**

Start frontend dev server, open `http://localhost:5173`. Verify:
- Only 4 demo buttons visible (Kasir POS, Dapur/Barista, Manager, Owner)
- No "Pelanggan" button
- Subtitle shows the new text

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/Login.jsx
git commit -m "feat: remove customer from login page — customers access via QR only"
```

---

## Task 4: Frontend — Update OrderContext.checkout() to accept tableNumber

**Files:**
- Modify: `frontend/src/context/OrderContext.jsx:213-254` (checkout function)

**Interfaces:**
- Produces: `checkout(paymentMethod, customNotes, tableNumber)` — third param optional, defaults to null

- [ ] **Step 1: Update checkout function signature and payload**

In `frontend/src/context/OrderContext.jsx`, replace the `checkout` function:
```javascript
// Before:
const checkout = async (paymentMethod, customNotes = '') => {
  const { totalPointsCost } = getCartTotals();
  
  if (user && totalPointsCost > (user.loyalty_points || 0)) {
    throw new Error(`Poin loyalitas Anda tidak cukup. Anda membutuhkan ${totalPointsCost} poin.`);
  }

  const payload = {
    customer_id: user?.role === 'customer' ? user.id : null,
    items: cart.map(item => ({
      product_id: item.product_id,
      quantity: item.quantity,
      notes: item.notes,
      is_redeemed_by_points: item.is_redeemed_by_points
    })),
    payment_method: paymentMethod,
    notes: customNotes
  };

// After:
const checkout = async (paymentMethod, customNotes = '', tableNumber = null) => {
  const { totalPointsCost } = getCartTotals();
  
  if (user && totalPointsCost > (user.loyalty_points || 0)) {
    throw new Error(`Poin loyalitas Anda tidak cukup. Anda membutuhkan ${totalPointsCost} poin.`);
  }

  const payload = {
    customer_id: user?.role === 'customer' ? user.id : null,
    items: cart.map(item => ({
      product_id: item.product_id,
      quantity: item.quantity,
      notes: item.notes,
      is_redeemed_by_points: item.is_redeemed_by_points
    })),
    payment_method: paymentMethod,
    notes: customNotes,
    table_number: tableNumber || null
  };
```

Also expose `checkout` in the context value object (find the `value` object passed to Provider and ensure `checkout` is there — it should already be).

- [ ] **Step 2: Commit**

```bash
git add frontend/src/context/OrderContext.jsx
git commit -m "feat: checkout() accepts tableNumber, passes table_number to backend"
```

---

## Task 5: Frontend — CustomerMenu.jsx: table badge + login gate

**Files:**
- Modify: `frontend/src/pages/Customer/CustomerMenu.jsx`

**Interfaces:**
- Consumes: optional `tableNumber` prop (integer or null)
- Consumes: `checkout(method, notes, tableNumber)` from OrderContext (Task 4)
- Produces: when `tableNumber` is set — shows "Meja X" badge in header, blocks payment selection behind login modal if `!user`

- [ ] **Step 1: Add tableNumber prop and showLoginModal state**

At the top of the `CustomerMenu` component, update the function signature and add state:
```jsx
// Before:
const CustomerMenu = () => {

// After:
const CustomerMenu = ({ tableNumber = null }) => {
```

Add after the existing state declarations (after `setShowPaymentSelection`):
```jsx
const [showLoginModal, setShowLoginModal] = useState(false);
const [loginEmail, setLoginEmail] = useState('');
const [loginPassword, setLoginPassword] = useState('');
const [loginError, setLoginError] = useState('');
const [loginLoading, setLoginLoading] = useState(false);
```

Add the `login` import from useAuth (already imported, but add destructuring):
```jsx
// Before:
const { user, refreshProfile } = useAuth();

// After:
const { user, login, refreshProfile } = useAuth();
```

- [ ] **Step 2: Update handleCheckout to pass tableNumber**

```jsx
// Before:
const handleCheckout = async (method) => {
  try {
    setShowPaymentSelection(false);
    const result = await checkout(method, checkoutNotes);

// After:
const handleCheckout = async (method) => {
  try {
    setShowPaymentSelection(false);
    const result = await checkout(method, checkoutNotes, tableNumber);
```

- [ ] **Step 3: Add login gate before payment selection**

Replace the "Lanjut Pembayaran" button (in the fixed bottom action panel, inside the checkout view):
```jsx
// Before:
<button
  onClick={() => setShowPaymentSelection(true)}
  className="btn-transition rounded-xl bg-orange-600 hover:bg-orange-700 px-6 py-3 text-xs font-bold text-white shadow-md shadow-orange-600/10 flex items-center gap-1.5 shrink-0"
>
  <span>Lanjut Pembayaran</span>
</button>

// After:
<button
  onClick={() => {
    if (tableNumber && !user) {
      setShowLoginModal(true);
    } else {
      setShowPaymentSelection(true);
    }
  }}
  className="btn-transition rounded-xl bg-orange-600 hover:bg-orange-700 px-6 py-3 text-xs font-bold text-white shadow-md shadow-orange-600/10 flex items-center gap-1.5 shrink-0"
>
  <span>Lanjut Pembayaran</span>
</button>
```

- [ ] **Step 4: Add "Meja X" badge in header banner**

In the header banner section (around line 524-556), add the table badge inside the banner `<div>`, after the subtitle `<p>`:
```jsx
// Find this block:
<span className="text-xs font-bold uppercase tracking-widest text-amber-500 font-mono">Cafe Locana</span>
<h2 className="text-2xl font-bold md:text-3xl mt-1">Locana Menu</h2>
<p className="text-stone-400 text-sm mt-1 max-w-md">Nikmati kopi premium dan makanan lezat pilihan kami langsung di meja Anda.</p>

// After the <p>, add:
{tableNumber && (
  <div className="mt-3 inline-flex items-center gap-2 rounded-xl bg-amber-600/20 border border-amber-500/40 px-3 py-1.5">
    <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse"></span>
    <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">Meja {tableNumber}</span>
  </div>
)}
```

- [ ] **Step 5: Add login modal JSX**

Before the closing `</div>` of the main RENDER CUSTOMER MENU / GRID VIEW return (after the Full Screen Image Modal block, before the final `</div>`):
```jsx
{/* ===== Login Modal (table QR checkout gate) ===== */}
{showLoginModal && (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div
      className="absolute inset-0 bg-stone-900/60 backdrop-blur-xs"
      onClick={() => { setShowLoginModal(false); setLoginError(''); }}
    />
    <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl z-10 animate-slide-up space-y-4">
      <div className="text-center">
        <h3 className="text-base font-bold text-stone-900">Masuk untuk Melanjutkan</h3>
        <p className="text-xs text-stone-500 mt-1">Login member untuk checkout dan kumpulkan poin loyalty.</p>
      </div>
      {loginError && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">{loginError}</div>
      )}
      <div className="space-y-3">
        <input
          type="email"
          value={loginEmail}
          onChange={e => setLoginEmail(e.target.value)}
          placeholder="Email member"
          className="block w-full rounded-xl border border-stone-300 bg-white py-2.5 px-4 text-stone-900 outline-none text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
        />
        <input
          type="password"
          value={loginPassword}
          onChange={e => setLoginPassword(e.target.value)}
          placeholder="Password"
          className="block w-full rounded-xl border border-stone-300 bg-white py-2.5 px-4 text-stone-900 outline-none text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
        />
      </div>
      <button
        onClick={async () => {
          if (!loginEmail || !loginPassword) {
            setLoginError('Email dan password harus diisi');
            return;
          }
          setLoginError('');
          setLoginLoading(true);
          try {
            await login(loginEmail, loginPassword);
            setShowLoginModal(false);
            setLoginEmail('');
            setLoginPassword('');
            setShowPaymentSelection(true);
          } catch (err) {
            setLoginError(err.message || 'Login gagal');
          } finally {
            setLoginLoading(false);
          }
        }}
        disabled={loginLoading}
        className="w-full rounded-xl bg-amber-600 hover:bg-amber-700 py-3 text-sm font-bold text-white disabled:bg-amber-400"
      >
        {loginLoading ? 'Memproses...' : 'Masuk & Lanjut Checkout'}
      </button>
      <button
        onClick={() => { setShowLoginModal(false); setLoginError(''); }}
        className="w-full rounded-xl border border-stone-200 py-2.5 text-xs font-semibold text-stone-600 hover:bg-stone-50"
      >
        Batal
      </button>
    </div>
  </div>
)}
```

- [ ] **Step 6: Manual test**

Open `http://localhost:5173/table/3` in browser (backend running). Verify:
- "Meja 3" amber badge visible in the header banner
- Add an item to cart, click "Checkout", click "Lanjut Pembayaran" while not logged in → login modal appears
- Login with `customer@locana.com` / `customer123` → modal closes, payment selection opens
- Complete checkout → order placed with `table_number: 3` (check backend logs)

Also test `http://localhost:5173` (regular path):
- No "Meja X" badge
- No login modal during checkout (existing behaviour unchanged)

- [ ] **Step 7: Commit**

```bash
git add frontend/src/pages/Customer/CustomerMenu.jsx
git commit -m "feat: CustomerMenu accepts tableNumber prop — adds Meja badge and login gate at checkout"
```

---

## Task 6: Frontend — App.jsx: /table/:n URL routing

**Files:**
- Modify: `frontend/src/App.jsx`

**Interfaces:**
- Consumes: `CustomerMenu` with `tableNumber` prop (Task 5)
- Produces: accessing `/table/3` renders `<CustomerMenu tableNumber={3} />` without login gate

- [ ] **Step 1: Add table route detection in MainApp**

In `frontend/src/App.jsx`, inside the `MainApp` component, add URL detection right after the `useEffect` blocks and before the loading spinner check:

```jsx
// Add after the useEffect blocks (around line 33), before the loading check:

// Detect /table/:n URL — render table ordering page bypassing login gate
const tablePathMatch = window.location.pathname.match(/^\/table\/(\d+)$/);
const tableRouteNumber = tablePathMatch ? parseInt(tablePathMatch[1]) : null;
```

Then add a render branch right after the loading spinner check and before the `if (!user)` check:

```jsx
// After the loading spinner block, before `if (!user)`:

// Table route: accessible without login
if (tableRouteNumber) {
  return (
    <div className="min-h-screen bg-stone-50">
      <CustomerMenu tableNumber={tableRouteNumber} />
    </div>
  );
}
```

- [ ] **Step 2: Manual test**

With frontend dev server running:
- Navigate to `http://localhost:5173/table/5` → see CustomerMenu with "Meja 5" badge, no login required to browse
- Navigate to `http://localhost:5173/table/0` → CustomerMenu renders (number 0 is valid per URL, badge shows "Meja 0")
- Navigate to `http://localhost:5173/table/abc` → no match (non-digit), falls through to normal login gate
- Navigate to `http://localhost:5173` → normal login page as before

- [ ] **Step 3: Commit**

```bash
git add frontend/src/App.jsx
git commit -m "feat: parse /table/:n URL in App.jsx, bypass login gate for table orders"
```

---

## Task 7: Frontend — "Meja X" badge in CashierPOS and KitchenMonitor

**Files:**
- Modify: `frontend/src/pages/Cashier/CashierPOS.jsx` (order card at ~line 296-315, and detail panel at ~line 326-329)
- Modify: `frontend/src/pages/Kitchen/KitchenMonitor.jsx` (order card header at ~line 119-130)

**Interfaces:**
- Consumes: `order.table_number` (number | null) from orders in OrderContext

- [ ] **Step 1: Add Meja badge helper (inline, both files)**

In both files, add this inline wherever `o.table_number` (or `order.table_number`) is rendered. Use a conditional span:
```jsx
{o.table_number && (
  <span className="inline-flex items-center gap-1 rounded-lg bg-amber-100 border border-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-800">
    Meja {o.table_number}
  </span>
)}
```

- [ ] **Step 2: Update CashierPOS order cards**

In `frontend/src/pages/Cashier/CashierPOS.jsx`, find the order card block (around line 308-315):
```jsx
// Before (existing lines):
<span className="text-[10px] text-stone-500">{new Date(o.created_at).toLocaleTimeString()}</span>
// ...
<h4 className="text-lg font-black tracking-wide text-stone-900 mt-1">{o.order_number}</h4>
<p className="text-xs font-semibold text-stone-700 mt-1">{o.customer_name}</p>

// After (add badge after customer_name):
<span className="text-[10px] text-stone-500">{new Date(o.created_at).toLocaleTimeString()}</span>
// ...
<h4 className="text-lg font-black tracking-wide text-stone-900 mt-1">{o.order_number}</h4>
<p className="text-xs font-semibold text-stone-700 mt-1">{o.customer_name}</p>
{o.table_number && (
  <span className="inline-flex items-center gap-1 rounded-lg bg-amber-100 border border-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-800 mt-1">
    Meja {o.table_number}
  </span>
)}
```

Also update the selected order detail panel (around line 328-329):
```jsx
// Before:
<p className="text-xs text-stone-500 mt-1">Pelanggan: {selectedOrder.customer_name}</p>

// After:
<p className="text-xs text-stone-500 mt-1">Pelanggan: {selectedOrder.customer_name}</p>
{selectedOrder.table_number && (
  <span className="inline-flex items-center gap-1 rounded-lg bg-amber-100 border border-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-800 mt-1">
    Meja {selectedOrder.table_number}
  </span>
)}
```

- [ ] **Step 3: Update KitchenMonitor order cards**

In `frontend/src/pages/Kitchen/KitchenMonitor.jsx`, find the card header block (around line 122-124):
```jsx
// Before:
<h4 className="text-lg font-black tracking-wider text-stone-900 leading-none">{order.order_number}</h4>
<span className="text-[10px] font-semibold text-stone-500 uppercase mt-1 block">Pelanggan: {order.customer_name}</span>

// After:
<h4 className="text-lg font-black tracking-wider text-stone-900 leading-none">{order.order_number}</h4>
<span className="text-[10px] font-semibold text-stone-500 uppercase mt-1 block">Pelanggan: {order.customer_name}</span>
{order.table_number && (
  <span className="inline-flex items-center gap-1 rounded-lg bg-amber-100 border border-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-800 mt-1.5">
    Meja {order.table_number}
  </span>
)}
```

- [ ] **Step 4: Manual test**

1. Login as owner/manager, go to `http://localhost:5173/table/2`
2. Add items, login as customer, checkout with "Bayar di Kasir"
3. Login as cashier — verify "Meja 2" badge appears on the order card in the queue
4. Process payment — check kitchen monitor shows "Meja 2" badge on the active order card

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/Cashier/CashierPOS.jsx frontend/src/pages/Kitchen/KitchenMonitor.jsx
git commit -m "feat: show Meja X badge on order cards in CashierPOS and KitchenMonitor"
```

---

## Task 8: Frontend — TableManagement.jsx (manager table CRUD + QR download)

**Files:**
- Create: `frontend/src/pages/Manager/TableManagement.jsx`

**Interfaces:**
- Consumes: `GET /api/tables`, `POST /api/tables`, `PUT /api/tables/:id`, `DELETE /api/tables/:id`, `GET /api/tables/qr-export`
- Consumes: `token` from `useAuth()`

- [ ] **Step 1: Create `frontend/src/pages/Manager/TableManagement.jsx`**

```jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiUrl } from '../../utils/api';
import { Plus, Trash2, Edit2, Download, QrCode, Users, Check, X } from 'lucide-react';

const TableManagement = () => {
  const { token } = useAuth();
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Add form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newNumber, setNewNumber] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [newCapacity, setNewCapacity] = useState('4');
  const [addLoading, setAddLoading] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState(null);
  const [editLabel, setEditLabel] = useState('');
  const [editCapacity, setEditCapacity] = useState('');

  const [exportLoading, setExportLoading] = useState(false);

  const fetchTables = async () => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl('/api/tables'));
      if (res.ok) {
        const data = await res.json();
        setTables(data);
      }
    } catch (err) {
      setError('Gagal memuat data meja');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTables(); }, []);

  const showMessage = (msg, isError = false) => {
    if (isError) { setError(msg); setSuccess(''); }
    else { setSuccess(msg); setError(''); }
    setTimeout(() => { setError(''); setSuccess(''); }, 3000);
  };

  const handleAddTable = async (e) => {
    e.preventDefault();
    if (!newNumber || !newLabel) return;
    setAddLoading(true);
    try {
      const res = await fetch(apiUrl('/api/tables'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ number: parseInt(newNumber), label: newLabel, capacity: parseInt(newCapacity) || 4 })
      });
      const data = await res.json();
      if (!res.ok) { showMessage(data.error || 'Gagal menambah meja', true); return; }
      setTables(prev => [...prev, data].sort((a, b) => a.number - b.number));
      setNewNumber(''); setNewLabel(''); setNewCapacity('4');
      setShowAddForm(false);
      showMessage(`Meja ${data.number} berhasil ditambahkan`);
    } catch (err) {
      showMessage('Gagal menambah meja', true);
    } finally {
      setAddLoading(false);
    }
  };

  const handleToggleActive = async (table) => {
    try {
      const res = await fetch(apiUrl(`/api/tables/${table.id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ is_active: !table.is_active })
      });
      if (res.ok) {
        setTables(prev => prev.map(t => t.id === table.id ? { ...t, is_active: !t.is_active } : t));
        showMessage(`Meja ${table.number} ${!table.is_active ? 'diaktifkan' : 'dinonaktifkan'}`);
      }
    } catch (err) {
      showMessage('Gagal mengubah status meja', true);
    }
  };

  const handleSaveEdit = async (id) => {
    try {
      const res = await fetch(apiUrl(`/api/tables/${id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ label: editLabel, capacity: parseInt(editCapacity) })
      });
      const data = await res.json();
      if (!res.ok) { showMessage(data.error || 'Gagal menyimpan', true); return; }
      setTables(prev => prev.map(t => t.id === id ? data : t));
      setEditingId(null);
      showMessage('Perubahan disimpan');
    } catch (err) {
      showMessage('Gagal menyimpan perubahan', true);
    }
  };

  const handleDelete = async (table) => {
    if (!window.confirm(`Hapus ${table.label}? Tindakan ini tidak bisa dibatalkan.`)) return;
    try {
      const res = await fetch(apiUrl(`/api/tables/${table.id}`), {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) { showMessage(data.error, true); return; }
      setTables(prev => prev.filter(t => t.id !== table.id));
      showMessage(`${table.label} dihapus`);
    } catch (err) {
      showMessage('Gagal menghapus meja', true);
    }
  };

  const handleExportQR = async () => {
    setExportLoading(true);
    try {
      const res = await fetch(apiUrl('/api/tables/qr-export'), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        const data = await res.json();
        showMessage(data.error || 'Gagal export QR', true);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'locana-qr-tables.zip';
      a.click();
      URL.revokeObjectURL(url);
      showMessage('QR codes berhasil didownload');
    } catch (err) {
      showMessage('Gagal mendownload QR codes', true);
    } finally {
      setExportLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
            <QrCode className="h-6 w-6 text-amber-600" />
            <span>Manajemen Meja</span>
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">Kelola meja dan generate QR untuk pemesanan mandiri.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExportQR}
            disabled={exportLoading || tables.filter(t => t.is_active).length === 0}
            className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-xs font-bold text-stone-700 hover:bg-stone-50 shadow-xs disabled:opacity-50 transition"
          >
            <Download className="h-4 w-4" />
            {exportLoading ? 'Mengunduh...' : 'Download Semua QR (ZIP)'}
          </button>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-amber-700 shadow-md shadow-amber-600/15 transition"
          >
            <Plus className="h-4 w-4" />
            Tambah Meja
          </button>
        </div>
      </div>

      {/* Feedback messages */}
      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-2.5 text-xs text-red-700 font-semibold">{error}</div>
      )}
      {success && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-xs text-emerald-700 font-semibold">{success}</div>
      )}

      {/* Add Table Form */}
      {showAddForm && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/30 p-4 space-y-3">
          <h3 className="text-sm font-bold text-stone-900">Tambah Meja Baru</h3>
          <form onSubmit={handleAddTable} className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block mb-1">Nomor Meja</label>
              <input
                type="number"
                value={newNumber}
                onChange={e => setNewLabel(e.target.value === '' ? '' : `Meja ${e.target.value}`) || setNewNumber(e.target.value)}
                placeholder="e.g. 7"
                required
                min="1"
                className="w-24 rounded-xl border border-stone-300 px-3 py-2 text-sm outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block mb-1">Label</label>
              <input
                type="text"
                value={newLabel}
                onChange={e => setNewLabel(e.target.value)}
                placeholder="Meja 7"
                required
                className="w-36 rounded-xl border border-stone-300 px-3 py-2 text-sm outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block mb-1">Kapasitas</label>
              <input
                type="number"
                value={newCapacity}
                onChange={e => setNewCapacity(e.target.value)}
                min="1"
                className="w-20 rounded-xl border border-stone-300 px-3 py-2 text-sm outline-none focus:border-amber-500"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={addLoading}
                className="rounded-xl bg-amber-600 hover:bg-amber-700 px-4 py-2 text-xs font-bold text-white"
              >
                {addLoading ? 'Menyimpan...' : 'Simpan'}
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="rounded-xl border border-stone-200 px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-50"
              >
                Batal
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tables List */}
      {loading ? (
        <div className="text-center py-12 text-stone-400 text-sm">Memuat data meja...</div>
      ) : tables.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-stone-300 rounded-2xl bg-white/50">
          <QrCode className="h-10 w-10 text-stone-300 mx-auto mb-2" />
          <p className="text-stone-500 text-sm font-semibold">Belum ada meja</p>
          <p className="text-stone-400 text-xs mt-1">Tambah meja pertama untuk mulai generate QR.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {tables.map(table => (
            <div
              key={table.id}
              className={`rounded-2xl border bg-white shadow-xs p-4 space-y-3 ${table.is_active ? 'border-stone-200' : 'border-stone-200 opacity-60'}`}
            >
              {editingId === table.id ? (
                <div className="space-y-2">
                  <input
                    value={editLabel}
                    onChange={e => setEditLabel(e.target.value)}
                    className="w-full rounded-lg border border-stone-300 px-3 py-1.5 text-sm outline-none focus:border-amber-500"
                  />
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={editCapacity}
                      onChange={e => setEditCapacity(e.target.value)}
                      min="1"
                      className="w-16 rounded-lg border border-stone-300 px-2 py-1.5 text-sm outline-none focus:border-amber-500"
                    />
                    <span className="text-xs text-stone-500">kursi</span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleSaveEdit(table.id)} className="flex-1 rounded-lg bg-amber-600 text-white text-xs font-bold py-1.5">
                      <Check className="h-3.5 w-3.5 mx-auto" />
                    </button>
                    <button onClick={() => setEditingId(null)} className="flex-1 rounded-lg border border-stone-200 text-xs text-stone-600 py-1.5">
                      <X className="h-3.5 w-3.5 mx-auto" />
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-2xl font-black text-stone-900">{table.number}</span>
                      <p className="text-xs font-semibold text-stone-600 mt-0.5">{table.label}</p>
                    </div>
                    <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${table.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-100 text-stone-500'}`}>
                      {table.is_active ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-stone-500">
                    <Users className="h-3.5 w-3.5" />
                    <span>{table.capacity} kursi</span>
                  </div>
                  <div className="pt-2 border-t border-stone-100 flex gap-2">
                    <button
                      onClick={() => { setEditingId(table.id); setEditLabel(table.label); setEditCapacity(String(table.capacity)); }}
                      className="flex-1 rounded-lg border border-stone-200 py-1.5 text-[11px] font-semibold text-stone-600 hover:bg-stone-50 flex items-center justify-center gap-1"
                    >
                      <Edit2 className="h-3 w-3" /> Edit
                    </button>
                    <button
                      onClick={() => handleToggleActive(table)}
                      className="flex-1 rounded-lg border border-stone-200 py-1.5 text-[11px] font-semibold text-stone-600 hover:bg-stone-50"
                    >
                      {table.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                    </button>
                    <button
                      onClick={() => handleDelete(table)}
                      className="rounded-lg border border-red-200 p-1.5 text-red-500 hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TableManagement;
```

- [ ] **Step 2: Manual test**

Login as manager, navigate to Table Management page (after Task 9 wires the sidebar). Verify:
- Can add a new table (form auto-fills label)
- Can edit label and capacity inline
- Can toggle active/inactive
- Can delete (with confirmation dialog)
- "Download Semua QR (ZIP)" downloads a zip file containing PNG files named `meja-N.png`

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/Manager/TableManagement.jsx
git commit -m "feat: add TableManagement page with table CRUD and QR ZIP download"
```

---

## Task 9: Frontend — Wire Sidebar + App.jsx navigation

**Files:**
- Modify: `frontend/src/components/Sidebar.jsx`
- Modify: `frontend/src/App.jsx`

**Interfaces:**
- Consumes: `TableManagement` component (Task 8)
- Produces: "Manajemen Meja" sidebar item for manager/owner; `case 'table-management'` in renderPage

- [ ] **Step 1: Add TableManagement import in App.jsx**

```jsx
// Add import at top of App.jsx with other page imports:
import TableManagement from './pages/Manager/TableManagement';
```

- [ ] **Step 2: Add case in renderPage switch**

```jsx
// In the renderPage() switch, add before the default case:
case 'table-management':
  return <TableManagement />;
```

- [ ] **Step 3: Add menu item in Sidebar.jsx**

```jsx
// In menuItems array, after the 'menu-management' entry:
{
  id: 'table-management',
  label: 'Manajemen Meja',
  icon: QrCode,
  roles: ['owner', 'manager']
},
```

Add `QrCode` to the lucide-react import at the top of `Sidebar.jsx`:
```jsx
// Before:
import { BarChart3, ChefHat, CreditCard, Layers, ShoppingBag, Users, Settings, FileText } from 'lucide-react';

// After:
import { BarChart3, ChefHat, CreditCard, Layers, ShoppingBag, Users, Settings, FileText, QrCode } from 'lucide-react';
```

- [ ] **Step 4: Manual end-to-end test**

Full flow test:
1. Login as manager → sidebar shows "Manajemen Meja" item
2. Click "Manajemen Meja" → TableManagement page loads
3. Add 3 tables (e.g., 1, 2, 3)
4. Click "Download Semua QR (ZIP)" → ZIP downloads with meja-1.png, meja-2.png, meja-3.png inside
5. Open a QR image — scan with phone (or open URL manually: `http://localhost:5173/table/2`)
6. On table page: add item to cart → click Checkout → Lanjut Pembayaran → login modal appears → login as customer → payment selection opens → checkout
7. Login as cashier → order appears with "Meja 2" badge
8. Login as kitchen → order in queue with "Meja 2" badge
9. Login as manager → dashboard/reports show table info
10. Verify that `http://localhost:5173` (direct login) shows no "Pelanggan" demo button

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/Sidebar.jsx frontend/src/App.jsx
git commit -m "feat: add Manajemen Meja to sidebar and App routing"
```

---

## Self-Review Checklist

**Spec coverage:**
- ✅ Tables collection with dynamic CRUD (Task 1)
- ✅ QR URL `/table/{number}` → CustomerMenu with badge (Tasks 5, 6)
- ✅ Login required at checkout on table route (Task 5)
- ✅ `table_number` + `table_id` saved to orders (Tasks 2, 4)
- ✅ "Meja X" badge on CashierPOS + KitchenMonitor (Task 7)
- ✅ Manager "Manajemen Meja" page with CRUD + ZIP download (Tasks 8, 9)
- ✅ Sidebar + routing wired (Task 9)
- ✅ Login.jsx removes customer option (Task 3)
- ✅ Delete table blocked if active orders exist (Task 1)
- ✅ Repeat orders work freely (no session reset — by design, no session at all)

**Type consistency:**
- `checkout(paymentMethod, customNotes, tableNumber)` — defined in Task 4, consumed in Task 5 ✅
- `table_number` (integer | null) — consistent across backend response, frontend display, payload ✅
- Table `id` format: `tbl-${Date.now()}` — consistent in controller and order lookup ✅

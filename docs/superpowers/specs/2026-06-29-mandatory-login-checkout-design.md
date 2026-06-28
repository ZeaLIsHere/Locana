# Design: Mandatory Login at Checkout + Phone/Email Login + Register + Password Toggle

**Date:** 2026-06-29
**Status:** Approved (Phase 1). Google login deferred to Phase 2.

## Goal

Make login mandatory before any customer checkout. Allow login with **email or phone
number** + password. Add a customer **registration** flow. Add a **show/hide password**
toggle. Keep the existing custom JWT + bcrypt auth (no Supabase Auth).

## Scope

- **In scope (Phase 1):** mandatory checkout gate, combined email/phone login, customer
  self-registration, password show/hide toggle, consistency on the staff login page.
- **Deferred (Phase 2):** "Sign in with Google" — to be implemented later via Google
  Identity Services + our own JWT (NOT Supabase Auth), which requires a Google Cloud
  OAuth Client ID.
- **No schema change.** `users.email` is already `unique not null`; `phone` stays
  optional. New self-registered users get `role = 'customer'`, `loyalty_points = 0`.

## Constraints / Decisions

- Password minimum length: **6 characters**.
- Registration required fields: **name, email, password**. Optional: **phone, birthday**
  (birthday powers the existing birthday-discount metric).
- New user id format: `user-<timestamp>` (e.g. `user-1719600000000`).
- API response shape of `register` mirrors `login` (`{ message, token, user }`) so the
  client can auto-login after registering.
- `login` stays backward-compatible: it accepts `identifier` OR the legacy `email` field.

## Components

### Backend — `backend/src/controllers/authController.js`

**`login` (modify):**
- Accept `{ identifier, password }` (fall back to `email` if `identifier` absent).
- Resolve lookup: if the identifier contains `@` → `.eq('email', value.trim().toLowerCase())`;
  otherwise → `.eq('phone', value.trim())`.
- Everything else unchanged (bcrypt compare, JWT sign, `computeMemberMetrics`, response).
- Error messages stay generic: `"Email/No. HP atau password salah"`.

**`register` (new):** `POST /api/auth/register`
- Input: `{ name, email, password, phone?, birthday? }`.
- Validate: `name`, `email`, `password` present; `password.length >= 6`; email not already
  used (`.eq('email', ...).maybeSingle()` → if found, `409 { error: 'Email sudah terdaftar' }`).
- Insert user: `id: 'user-'+Date.now()`, `role: 'customer'`, `loyalty_points: 0`,
  `password_hash: bcrypt.hashSync(password, 10)`, `email` lowercased/trimmed,
  `phone`/`birthday` if provided, `created_at: new Date().toISOString()`.
- Issue JWT (same payload/expiry as `login`) and return `{ message, token, user }` with
  `user` including `computeMemberMetrics`.

### Backend — `backend/src/routes/api.js`

- Add `router.post('/auth/register', register)` (public, no auth middleware).

### Frontend — `frontend/src/context/AuthContext.jsx`

- `login(identifier, password)` — send body `{ identifier, password }` (rename internal
  param from `email`).
- `register(payload)` — `POST /api/auth/register`; on success store token+user in state
  and localStorage exactly like `login`; return the user.

### Frontend — `frontend/src/pages/Customer/CustomerMenu.jsx`

- **Checkout gate:** change the "Lanjut Pembayaran" handler from
  `if (tableNumber && !user)` to `if (!user) → open Auth modal` (applies to ALL checkout).
- **Auth modal (replaces the existing login-only modal):** two tabs — **Masuk** / **Daftar**.
  - Masuk: one "Email atau No. HP" field + password field with show/hide toggle +
    "Masuk & Lanjut Checkout".
  - Daftar: Nama, Email, No. HP (opsional), Tgl Lahir (opsional), Password (with toggle) +
    "Daftar & Lanjut Checkout".
  - Inline error display. On success (login or register): close modal → open payment
    selection (`setShowPaymentSelection(true)`).

### Frontend — password toggle

- Reusable `PasswordInput` component (or inline Eye/EyeOff from `lucide-react`, already a
  dependency) toggling `type` between `password` and `text`. Used in the Auth modal and the
  staff login page.

### Frontend — `frontend/src/pages/Login.jsx` (staff)

- Add the same password show/hide toggle.
- Change the email field to "Email atau No. HP" and pass it as `identifier` (staff keep
  using email; phone also works if set). Demo-account buttons unchanged. No registration
  here.

## Data Flow

1. Customer adds items → taps "Lanjut Pembayaran".
2. If not logged in → Auth modal opens.
3a. **Masuk:** `login(identifier, password)` → `POST /api/auth/login` → JWT stored.
3b. **Daftar:** `register(payload)` → `POST /api/auth/register` → user created → JWT stored.
4. Modal closes → payment selection opens → existing checkout flow proceeds (now always
   with a `customer_id`, so loyalty points accrue).

## Error Handling

- Login: invalid identifier/password → `401 "Email/No. HP atau password salah"`.
- Register: missing fields → `400`; short password → `400`; duplicate email → `409`.
- Frontend shows server `error` message inline in the modal; never closes on failure.

## Testing

- Extend `backend/scripts/smoke-test.js`: register a new customer (random email) → expect
  201 + token; login with that email → 200; login with that phone (if set) → 200; login
  with wrong password → 401.
- Manual verification: gate appears for both table-QR and non-table checkout; password
  toggle reveals/hides; register → auto-login → pay → loyalty points increase.

## Self-Review Notes

- No schema change needed; email uniqueness already enforced at DB and re-checked in
  `register` for a friendly error.
- Backward compatibility: `login` still accepts `email` so nothing else breaks.
- Google explicitly deferred; no external credentials required for Phase 1.
- Reuses existing `lucide-react` (Eye/EyeOff) and `computeMemberMetrics`; no new deps.

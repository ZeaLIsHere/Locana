# Mandatory Login at Checkout + Phone/Email Login + Register + Password Toggle — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Require login before any customer checkout, allow login by email or phone + password, add a customer registration flow, and add a show/hide password toggle (incl. the staff login page).

**Architecture:** Keep the existing custom JWT + bcrypt auth. `authController.login` is widened to resolve an `identifier` (email if it contains `@`, else phone). A new `authController.register` creates `role:'customer'` users and returns a token like `login`. The frontend `AuthContext` gains `register()` and a renamed `login(identifier,password)`; `CustomerMenu` replaces its login-only modal with a Masuk/Daftar modal and gates ALL checkout behind auth; `Login.jsx` (staff) gets the password toggle and an "Email atau No. HP" field.

**Tech Stack:** Node.js, Express, `@supabase/supabase-js`, `bcryptjs`, `jsonwebtoken`; React (Vite), `lucide-react` (Eye/EyeOff icons — already a dependency).

## Global Constraints

- No schema change. `users.email` is already `unique not null`; `phone` stays optional.
- New self-registered users: `role = 'customer'`, `loyalty_points = 0`, `id = 'user-'+Date.now()`.
- Password minimum length: 6 characters.
- Registration required fields: `name`, `email`, `password`. Optional: `phone`, `birthday`.
- `register` response shape mirrors `login`: `{ message, token, user }` (user includes `computeMemberMetrics`).
- `login` stays backward-compatible: accept `identifier` OR legacy `email`.
- API request/response shapes for all OTHER endpoints stay unchanged.
- Bcrypt cost factor stays 10 (matches seeder). JWT expiry stays `24h`.
- Google login is OUT OF SCOPE (Phase 2).

**Verification note:** the live server runs on `http://localhost:5000` (`cd backend && npm run dev`). Backend load check pattern (no network needed):
```bash
cd backend && node -e "process.env.SUPABASE_URL='http://x.supabase.co'; process.env.SUPABASE_SERVICE_ROLE_KEY='x'; require('./src/controllers/authController'); console.log('loads OK');"
```

---

### Task 1: Backend — widen `login` and add `register`

**Files:**
- Modify: `backend/src/controllers/authController.js`
- Modify: `backend/src/routes/api.js`

**Interfaces:**
- Consumes: `{ supabase, unwrap }` from `config/db.js`; `bcrypt`, `jwt`, `JWT_SECRET`, `computeMemberMetrics` (already in the file).
- Produces: `module.exports = { login, register, getProfile }`. `register` handles `POST /api/auth/register`. `login` accepts `{ identifier, password }` or `{ email, password }`.

- [ ] **Step 1: Widen `login` to accept identifier (email or phone)**

In `backend/src/controllers/authController.js`, replace the top of `login` (the current lines):
```js
async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    // Look up user by email
    const { data: userData, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.trim().toLowerCase())
      .maybeSingle();
    if (error) throw error;

    if (!userData) {
      return res.status(401).json({ error: 'Email atau password salah' });
    }
```
with:
```js
async function login(req, res) {
  const { identifier, email, password } = req.body;
  const loginId = (identifier || email || '').trim();

  if (!loginId || !password) {
    return res.status(400).json({ error: 'Email/No. HP dan password harus diisi' });
  }

  try {
    // Resolve by email (contains '@') or phone (otherwise)
    const isEmail = loginId.includes('@');
    const query = supabase.from('users').select('*');
    const { data: userData, error } = isEmail
      ? await query.eq('email', loginId.toLowerCase()).maybeSingle()
      : await query.eq('phone', loginId).maybeSingle();
    if (error) throw error;

    if (!userData) {
      return res.status(401).json({ error: 'Email/No. HP atau password salah' });
    }
```

- [ ] **Step 2: Update the wrong-password message in `login`**

Still in `login`, change the invalid-password response message for consistency:
```js
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Email atau password salah' });
    }
```
to:
```js
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Email/No. HP atau password salah' });
    }
```

- [ ] **Step 3: Add the `register` function**

In `backend/src/controllers/authController.js`, add this function immediately after `login` (before `getProfile`):
```js
async function register(req, res) {
  const { name, email, password, phone, birthday } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Nama, email, dan password harus diisi' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password minimal 6 karakter' });
  }

  const normalizedEmail = email.trim().toLowerCase();

  try {
    const { data: existing, error: findErr } = await supabase
      .from('users').select('id').eq('email', normalizedEmail).maybeSingle();
    if (findErr) throw findErr;
    if (existing) {
      return res.status(409).json({ error: 'Email sudah terdaftar' });
    }

    const newUser = {
      id: 'user-' + Date.now(),
      name: name.trim(),
      email: normalizedEmail,
      phone: phone ? phone.trim() : null,
      birthday: birthday || null,
      password_hash: bcrypt.hashSync(password, 10),
      role: 'customer',
      loyalty_points: 0,
      created_at: new Date().toISOString()
    };

    unwrap(await supabase.from('users').insert(newUser));

    const token = jwt.sign(
      {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
        name: newUser.name
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    const profile = { ...newUser };
    delete profile.password_hash;

    const metrics = await computeMemberMetrics(newUser.id, newUser);

    return res.status(201).json({
      message: 'Registration successful',
      token,
      user: {
        id: newUser.id,
        ...profile,
        ...metrics
      }
    });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ error: 'Internal server error during registration' });
  }
}
```

- [ ] **Step 4: Export `register`**

Change the export at the bottom of `authController.js`:
```js
module.exports = {
  login,
  getProfile
};
```
to:
```js
module.exports = {
  login,
  register,
  getProfile
};
```

- [ ] **Step 5: Wire the route**

In `backend/src/routes/api.js` line 4, change:
```js
const { login, getProfile } = require('../controllers/authController');
```
to:
```js
const { login, register, getProfile } = require('../controllers/authController');
```
Then add the route right after the login route (after `router.post('/auth/login', login);`):
```js
router.post('/auth/register', register);
```

- [ ] **Step 6: Verify load**

```bash
cd backend && node -e "process.env.SUPABASE_URL='http://x.supabase.co'; process.env.SUPABASE_SERVICE_ROLE_KEY='x'; const a=require('./src/controllers/authController'); require('./src/routes/api'); console.log(typeof a.register, typeof a.login);"
```
Expected: `function function`

- [ ] **Step 7: Commit**

```bash
git add backend/src/controllers/authController.js backend/src/routes/api.js
git commit -m "feat: add register endpoint and email-or-phone login"
```

---

### Task 2: Backend — extend smoke test for register + dual-identifier login

**Files:**
- Modify: `backend/scripts/smoke-test.js`

**Interfaces:**
- Consumes: running server at `http://localhost:5000` (live Supabase). Uses the existing `j()` and `assert()` helpers already in the file.

- [ ] **Step 1: Add a register + login section to the smoke test**

In `backend/scripts/smoke-test.js`, insert this block immediately before the final
`console.log(process.exitCode ? ...)` line:
```js
  console.log('8. Register + email/phone login + checkout gate');
  const rnd = Date.now();
  const regEmail = `smoke${rnd}@example.com`;
  const regPhone = `08${rnd.toString().slice(-9)}`;
  const reg = await j('POST', '/api/auth/register', {
    name: 'Smoke Tester', email: regEmail, phone: regPhone, password: 'secret123'
  });
  assert(reg.status === 201 && reg.data.token, 'register returns token');
  assert(reg.data.user && reg.data.user.role === 'customer', 'registered as customer');

  const dupe = await j('POST', '/api/auth/register', {
    name: 'Dupe', email: regEmail, password: 'secret123'
  });
  assert(dupe.status === 409, 'duplicate email rejected (409)');

  const short = await j('POST', '/api/auth/register', {
    name: 'Short', email: `short${rnd}@example.com`, password: '123'
  });
  assert(short.status === 400, 'short password rejected (400)');

  const byEmail = await j('POST', '/api/auth/login', { identifier: regEmail, password: 'secret123' });
  assert(byEmail.status === 200 && byEmail.data.token, 'login by email');

  const byPhone = await j('POST', '/api/auth/login', { identifier: regPhone, password: 'secret123' });
  assert(byPhone.status === 200 && byPhone.data.token, 'login by phone');

  const badPass = await j('POST', '/api/auth/login', { identifier: regEmail, password: 'wrong' });
  assert(badPass.status === 401, 'wrong password rejected (401)');
```

- [ ] **Step 2: Run the smoke test (requires server + live Supabase)**

In one terminal: `cd backend && npm run dev`. In another:
```bash
cd backend && npm run smoke
```
Expected: every line prints `✓`, including the new section 8, and final line `SMOKE TEST PASSED`.

- [ ] **Step 3: Commit**

```bash
git add backend/scripts/smoke-test.js
git commit -m "test: cover register and email/phone login in smoke test"
```

---

### Task 3: Frontend — `AuthContext` `register()` + identifier login

**Files:**
- Modify: `frontend/src/context/AuthContext.jsx`

**Interfaces:**
- Consumes: `apiUrl` from `utils/api`.
- Produces: context value gains `register(payload)` and `login(identifier, password)` (param renamed). Both persist `locana_token`/`locana_user` and set state.

- [ ] **Step 1: Rename `login` param and send `identifier`**

In `frontend/src/context/AuthContext.jsx`, change the `login` function signature and body:
```js
  const login = async (email, password) => {
    setError(null);
    try {
      const response = await fetch(apiUrl('/api/auth/login'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });
```
to:
```js
  const login = async (identifier, password) => {
    setError(null);
    try {
      const response = await fetch(apiUrl('/api/auth/login'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ identifier, password })
      });
```

- [ ] **Step 2: Add `register()`**

In the same file, add this function right after the `login` function (before `logout`):
```js
  const register = async (payload) => {
    setError(null);
    try {
      const response = await fetch(apiUrl('/api/auth/register'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registrasi gagal. Coba lagi.');
      }

      setToken(data.token);
      setUser(data.user);
      localStorage.setItem('locana_token', data.token);
      localStorage.setItem('locana_user', JSON.stringify(data.user));
      return data.user;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };
```

- [ ] **Step 3: Expose `register` in the provider value**

Change:
```js
    <AuthContext.Provider value={{ user, token, loading, error, login, logout, refreshProfile }}>
```
to:
```js
    <AuthContext.Provider value={{ user, token, loading, error, login, register, logout, refreshProfile }}>
```

- [ ] **Step 4: Verify frontend build still compiles**

```bash
cd frontend && npm run build
```
Expected: build completes with no errors (Vite prints `built in ...`).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/context/AuthContext.jsx
git commit -m "feat: add register() and identifier login to AuthContext"
```

---

### Task 4: Frontend — reusable `PasswordInput` component

**Files:**
- Create: `frontend/src/components/PasswordInput.jsx`

**Interfaces:**
- Produces: default-exported `PasswordInput` React component. Props: `value`, `onChange`, `placeholder`, `id` (optional), `className` (optional, applied to the `<input>`), `autoComplete` (optional). Renders an `<input>` whose `type` toggles between `password` and `text` via an Eye/EyeOff button on the right.

- [ ] **Step 1: Create the component**

Create `frontend/src/components/PasswordInput.jsx`:
```jsx
import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

const PasswordInput = ({ value, onChange, placeholder = 'Password', id, className = '', autoComplete = 'current-password' }) => {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        id={id}
        type={show ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={`w-full pr-10 ${className}`}
      />
      <button
        type="button"
        onClick={() => setShow(s => !s)}
        aria-label={show ? 'Sembunyikan password' : 'Tampilkan password'}
        className="absolute inset-y-0 right-3 flex items-center text-stone-400 hover:text-stone-600"
      >
        {show ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
      </button>
    </div>
  );
};

export default PasswordInput;
```

- [ ] **Step 2: Verify build**

```bash
cd frontend && npm run build
```
Expected: build completes with no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/PasswordInput.jsx
git commit -m "feat: add reusable PasswordInput with show/hide toggle"
```

---

### Task 5: Frontend — staff `Login.jsx` (password toggle + identifier field)

**Files:**
- Modify: `frontend/src/pages/Login.jsx`

**Interfaces:**
- Consumes: `PasswordInput` from `../components/PasswordInput`; `login(identifier, password)` from `useAuth`.

- [ ] **Step 1: Import `PasswordInput` and rename the email state to identifier**

In `frontend/src/pages/Login.jsx`, add the import after the existing imports:
```jsx
import PasswordInput from '../components/PasswordInput';
```
Change:
```jsx
  const [email, setEmail] = useState('');
```
to:
```jsx
  const [identifier, setIdentifier] = useState('');
```
Then update `handleSubmit` validation + call:
```jsx
    if (!email || !password) {
      setError('Email dan password harus diisi');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await login(email, password);
```
to:
```jsx
    if (!identifier || !password) {
      setError('Email/No. HP dan password harus diisi');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await login(identifier, password);
```
And in `handleQuickLogin`, change:
```jsx
  const handleQuickLogin = async (demoEmail, demoPass) => {
    setError('');
    setEmail(demoEmail);
    setPassword(demoPass);
```
to:
```jsx
  const handleQuickLogin = async (demoEmail, demoPass) => {
    setError('');
    setIdentifier(demoEmail);
    setPassword(demoPass);
```

- [ ] **Step 2: Update the email input to identifier**

Replace the email field block:
```jsx
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-stone-700">Email Pengguna</label>
              <div className="relative mt-1">
                <Mail className="absolute top-3.5 left-3.5 h-4.5 w-4.5 text-stone-400" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@locana.com"
                  className="block w-full rounded-xl border border-stone-300 bg-white py-3 pr-4 pl-11 text-stone-900 shadow-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none text-sm transition"
                />
              </div>
            </div>
```
with:
```jsx
            <div>
              <label htmlFor="identifier" className="block text-sm font-semibold text-stone-700">Email atau No. HP</label>
              <div className="relative mt-1">
                <Mail className="absolute top-3.5 left-3.5 h-4.5 w-4.5 text-stone-400" />
                <input
                  id="identifier"
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="name@locana.com / 08xxxxxxxxxx"
                  className="block w-full rounded-xl border border-stone-300 bg-white py-3 pr-4 pl-11 text-stone-900 shadow-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none text-sm transition"
                />
              </div>
            </div>
```

- [ ] **Step 3: Replace the password input with `PasswordInput`**

Replace the password field block:
```jsx
              <div className="relative mt-1">
                <Key className="absolute top-3.5 left-3.5 h-4.5 w-4.5 text-stone-400" />
                <input
                  id="pass"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full rounded-xl border border-stone-300 bg-white py-3 pr-4 pl-11 text-stone-900 shadow-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none text-sm transition"
                />
              </div>
```
with:
```jsx
              <div className="relative mt-1">
                <Key className="absolute top-3.5 left-3.5 h-4.5 w-4.5 text-stone-400 z-10" />
                <PasswordInput
                  id="pass"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="rounded-xl border border-stone-300 bg-white py-3 pl-11 text-stone-900 shadow-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none text-sm transition"
                />
              </div>
```

- [ ] **Step 4: Verify build + manual check**

```bash
cd frontend && npm run build
```
Expected: build completes with no errors. Manual: on `/` (staff login), the password field shows an eye icon that toggles visibility; demo buttons still log in.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/Login.jsx
git commit -m "feat: staff login uses identifier field + password toggle"
```

---

### Task 6: Frontend — `CustomerMenu` mandatory gate + Masuk/Daftar modal

**Files:**
- Modify: `frontend/src/pages/Customer/CustomerMenu.jsx`

**Interfaces:**
- Consumes: `register` and `login` from `useAuth`; `PasswordInput` from `../../components/PasswordInput`.

- [ ] **Step 1: Import `register` and `PasswordInput`, add auth-modal state**

In `frontend/src/pages/Customer/CustomerMenu.jsx`, change:
```jsx
  const { user, login, refreshProfile } = useAuth();
```
to:
```jsx
  const { user, login, register, refreshProfile } = useAuth();
```
Add the import after the `apiUrl` import:
```jsx
import PasswordInput from '../../components/PasswordInput';
```
Replace the existing login-modal state:
```jsx
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
```
with:
```jsx
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'
  const [authIdentifier, setAuthIdentifier] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regBirthday, setRegBirthday] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
```

- [ ] **Step 2: Gate ALL checkout behind auth**

Change the "Lanjut Pembayaran" button handler:
```jsx
              <button
                onClick={() => {
                  if (tableNumber && !user) {
                    setShowLoginModal(true);
                  } else {
                    setShowPaymentSelection(true);
                  }
                }}
```
to:
```jsx
              <button
                onClick={() => {
                  if (!user) {
                    setAuthError('');
                    setShowLoginModal(true);
                  } else {
                    setShowPaymentSelection(true);
                  }
                }}
```

- [ ] **Step 3: Replace the login modal with the Masuk/Daftar modal**

Replace the ENTIRE existing login-modal block (from the `{/* ===== Login Modal (table QR checkout gate) ===== */}` comment through its closing `)}`) with:
```jsx
      {/* ===== Auth Modal (mandatory checkout gate: Masuk / Daftar) ===== */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-stone-900/60 backdrop-blur-xs"
            onClick={() => { setShowLoginModal(false); setAuthError(''); }}
          />
          <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl z-10 animate-slide-up space-y-4">
            {/* Tabs */}
            <div className="grid grid-cols-2 gap-1 rounded-xl bg-stone-100 p-1">
              <button
                onClick={() => { setAuthMode('login'); setAuthError(''); }}
                className={`rounded-lg py-2 text-xs font-bold transition ${authMode === 'login' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500'}`}
              >
                Masuk
              </button>
              <button
                onClick={() => { setAuthMode('register'); setAuthError(''); }}
                className={`rounded-lg py-2 text-xs font-bold transition ${authMode === 'register' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500'}`}
              >
                Daftar
              </button>
            </div>

            <div className="text-center">
              <h3 className="text-base font-bold text-stone-900">
                {authMode === 'login' ? 'Masuk untuk Melanjutkan' : 'Daftar Member Baru'}
              </h3>
              <p className="text-xs text-stone-500 mt-1">
                {authMode === 'login'
                  ? 'Login member untuk checkout dan kumpulkan poin loyalty.'
                  : 'Buat akun untuk checkout dan mulai kumpulkan poin.'}
              </p>
            </div>

            {authError && (
              <div className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">{authError}</div>
            )}

            {authMode === 'login' ? (
              <div className="space-y-3">
                <input
                  type="text"
                  value={authIdentifier}
                  onChange={e => setAuthIdentifier(e.target.value)}
                  placeholder="Email atau No. HP"
                  className="block w-full rounded-xl border border-stone-300 bg-white py-2.5 px-4 text-stone-900 outline-none text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
                <PasswordInput
                  value={authPassword}
                  onChange={e => setAuthPassword(e.target.value)}
                  placeholder="Password"
                  autoComplete="current-password"
                  className="rounded-xl border border-stone-300 bg-white py-2.5 px-4 text-stone-900 outline-none text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
                <button
                  onClick={async () => {
                    if (!authIdentifier || !authPassword) {
                      setAuthError('Email/No. HP dan password harus diisi');
                      return;
                    }
                    setAuthError('');
                    setAuthLoading(true);
                    try {
                      await login(authIdentifier, authPassword);
                      setShowLoginModal(false);
                      setAuthIdentifier(''); setAuthPassword('');
                      setShowPaymentSelection(true);
                    } catch (err) {
                      setAuthError(err.message || 'Login gagal');
                    } finally {
                      setAuthLoading(false);
                    }
                  }}
                  disabled={authLoading}
                  className="w-full rounded-xl bg-amber-600 hover:bg-amber-700 py-3 text-sm font-bold text-white disabled:bg-amber-400"
                >
                  {authLoading ? 'Memproses...' : 'Masuk & Lanjut Checkout'}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <input
                  type="text"
                  value={regName}
                  onChange={e => setRegName(e.target.value)}
                  placeholder="Nama lengkap"
                  className="block w-full rounded-xl border border-stone-300 bg-white py-2.5 px-4 text-stone-900 outline-none text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
                <input
                  type="email"
                  value={regEmail}
                  onChange={e => setRegEmail(e.target.value)}
                  placeholder="Email"
                  className="block w-full rounded-xl border border-stone-300 bg-white py-2.5 px-4 text-stone-900 outline-none text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
                <input
                  type="tel"
                  value={regPhone}
                  onChange={e => setRegPhone(e.target.value)}
                  placeholder="No. HP (opsional)"
                  className="block w-full rounded-xl border border-stone-300 bg-white py-2.5 px-4 text-stone-900 outline-none text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
                <div>
                  <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">Tgl Lahir (opsional)</label>
                  <input
                    type="date"
                    value={regBirthday}
                    onChange={e => setRegBirthday(e.target.value)}
                    className="block w-full mt-1 rounded-xl border border-stone-300 bg-white py-2.5 px-4 text-stone-900 outline-none text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                <PasswordInput
                  value={authPassword}
                  onChange={e => setAuthPassword(e.target.value)}
                  placeholder="Password (min. 6 karakter)"
                  autoComplete="new-password"
                  className="rounded-xl border border-stone-300 bg-white py-2.5 px-4 text-stone-900 outline-none text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
                <button
                  onClick={async () => {
                    if (!regName || !regEmail || !authPassword) {
                      setAuthError('Nama, email, dan password harus diisi');
                      return;
                    }
                    if (authPassword.length < 6) {
                      setAuthError('Password minimal 6 karakter');
                      return;
                    }
                    setAuthError('');
                    setAuthLoading(true);
                    try {
                      await register({
                        name: regName,
                        email: regEmail,
                        phone: regPhone || undefined,
                        birthday: regBirthday || undefined,
                        password: authPassword
                      });
                      setShowLoginModal(false);
                      setRegName(''); setRegEmail(''); setRegPhone(''); setRegBirthday(''); setAuthPassword('');
                      setShowPaymentSelection(true);
                    } catch (err) {
                      setAuthError(err.message || 'Registrasi gagal');
                    } finally {
                      setAuthLoading(false);
                    }
                  }}
                  disabled={authLoading}
                  className="w-full rounded-xl bg-amber-600 hover:bg-amber-700 py-3 text-sm font-bold text-white disabled:bg-amber-400"
                >
                  {authLoading ? 'Memproses...' : 'Daftar & Lanjut Checkout'}
                </button>
              </div>
            )}

            <button
              onClick={() => { setShowLoginModal(false); setAuthError(''); }}
              className="w-full rounded-xl border border-stone-200 py-2.5 text-xs font-semibold text-stone-600 hover:bg-stone-50"
            >
              Batal
            </button>
          </div>
        </div>
      )}
```

- [ ] **Step 4: Verify build**

```bash
cd frontend && npm run build
```
Expected: build completes with no errors.

- [ ] **Step 5: Manual verification (server must be running)**

With `npm run dev` running, open `http://localhost:3000` (or `/table/1`), add an item, tap "Lanjut Pembayaran" while logged out → Auth modal appears. Switch to "Daftar", create an account → modal closes and payment selection opens. Log out, tap checkout again, use "Masuk" with email then with phone → both succeed. Password eye toggle reveals/hides text in both tabs.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/Customer/CustomerMenu.jsx
git commit -m "feat: mandatory login gate at checkout with Masuk/Daftar modal"
```

---

## Self-Review Notes

- **Spec coverage:** mandatory gate (Task 6 Step 2), combined email/phone login (Task 1 Steps 1-2, Task 3 Step 1), register endpoint (Task 1 Step 3, route Step 5), `AuthContext.register` (Task 3 Step 2), password toggle component (Task 4), staff login toggle + identifier (Task 5), customer Masuk/Daftar modal with toggle (Task 6 Step 3), smoke test (Task 2). Covered.
- **No schema change:** `register` inserts into existing columns only; `birthday` is a `date` column, `phone` is `text` — both already exist.
- **Type consistency:** `login(identifier, password)` used identically in AuthContext (Task 3), Login.jsx (Task 5), CustomerMenu (Task 6). `register(payload)` payload keys (`name,email,phone,birthday,password`) match backend `register` destructure (Task 1 Step 3). `PasswordInput` prop set (`value,onChange,placeholder,id,className,autoComplete`) matches all call sites.
- **Backward compatibility:** backend `login` still reads legacy `email` field; no other endpoint touched.
- **`newUser.username`:** intentionally undefined in the JWT payload (self-registered customers have no username) — matches the existing `login` payload which also tolerates undefined username. The `users.username` column is nullable.
- **Google:** explicitly out of scope; no external credentials needed.

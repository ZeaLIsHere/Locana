const BASE = process.env.SMOKE_BASE || 'http://localhost:5000';

async function j(method, path, body, token) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data };
}

function assert(cond, msg) {
  if (!cond) { console.error('  ✗ FAIL:', msg); process.exitCode = 1; }
  else { console.log('  ✓', msg); }
}

(async () => {
  console.log('1. Login each role');
  const roles = [
    ['owner@locana.com', 'owner123'],
    ['manager@locana.com', 'manager123'],
    ['cashier@locana.com', 'cashier123'],
    ['kitchen@locana.com', 'kitchen123'],
    ['customer@locana.com', 'customer123'],
  ];
  let cashierToken, customerToken, ownerToken, managerToken;
  for (const [email, password] of roles) {
    const r = await j('POST', '/api/auth/login', { email, password });
    assert(r.status === 200 && r.data.token, `login ${email}`);
    if (email.startsWith('cashier')) cashierToken = r.data.token;
    if (email.startsWith('customer')) customerToken = r.data.token;
    if (email.startsWith('owner')) ownerToken = r.data.token;
    if (email.startsWith('manager')) managerToken = r.data.token;
  }

  console.log('2. Menu');
  const cats = await j('GET', '/api/categories');
  assert(cats.status === 200 && cats.data.length > 0, 'categories non-empty');
  const prods = await j('GET', '/api/products');
  assert(prods.status === 200 && prods.data.length > 0, 'products non-empty');
  const firstProduct = prods.data[0];

  console.log('3. Create guest order');
  const guestOrder = await j('POST', '/api/orders', {
    items: [{ product_id: firstProduct.id, quantity: 1 }],
    payment_method: 'cashier'
  });
  assert(guestOrder.status === 201 && guestOrder.data.order.id, 'guest order created');
  const orderId = guestOrder.data.order.id;

  console.log('4. Pay order (cashier)');
  const pay = await j('POST', `/api/orders/${orderId}/pay`, { cashier_id: 'user-cashier' }, cashierToken);
  assert(pay.status === 200 && pay.data.order.status === 'preparing', 'order paid → preparing');

  console.log('5. Update status');
  const upd = await j('PUT', `/api/orders/${orderId}/status`, { status: 'completed' }, cashierToken);
  assert(upd.status === 200 && upd.data.order.status === 'completed', 'status → completed');

  console.log('6. Reports');
  const dash = await j('GET', '/api/reports/dashboard', null, ownerToken);
  assert(dash.status === 200 && dash.data.summary, 'dashboard report');
  const sales = await j('GET', '/api/reports/sales?type=daily_summary', null, ownerToken);
  assert(sales.status === 200 && Array.isArray(sales.data.data), 'sales report');
  const pos = await j('GET', '/api/reports/pos?type=daily_pos', null, ownerToken);
  assert(pos.status === 200 && Array.isArray(pos.data.data), 'pos report');

  console.log('7. Tables CRUD + QR export');
  const created = await j('POST', '/api/tables', { number: 99, label: 'Meja 99' }, managerToken);
  assert(created.status === 201 && created.data.id, 'table created');
  const tableId = created.data.id;
  const tableOrder = await j('POST', '/api/orders', {
    items: [{ product_id: firstProduct.id, quantity: 1 }],
    payment_method: 'cashier',
    table_number: 99
  });
  assert(tableOrder.status === 201 && tableOrder.data.order.table_id === tableId, 'order resolves table_id');
  const qr = await fetch(BASE + '/api/tables/qr-export', { headers: { Authorization: `Bearer ${managerToken}` } });
  assert(qr.status === 200 && qr.headers.get('content-type') === 'application/zip', 'QR ZIP export');
  // cleanup: complete the table order, then delete the table
  await j('PUT', `/api/orders/${tableOrder.data.order.id}/status`, { status: 'completed' }, cashierToken);
  const del = await j('DELETE', `/api/tables/${tableId}`, null, managerToken);
  assert(del.status === 200, 'table deleted');

  console.log(process.exitCode ? '\nSMOKE TEST FAILED' : '\nSMOKE TEST PASSED');
})();

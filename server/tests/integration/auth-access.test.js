const request = require('supertest');
const {
  bootstrap, resetData, closeDb, loginAsOwner, createUserAndLogin, makeOrder,
} = require('../helpers/testdb');

let app, owner, staff, staff2, finance;

beforeAll(async () => {
  app = await bootstrap();
  await resetData();
  owner = await loginAsOwner(app);
  staff = (await createUserAndLogin(app, owner, { email: 'staff@test.local', password: 'staff123', custom_role: 'STAFF' })).token;
  staff2 = (await createUserAndLogin(app, owner, { email: 'staff2@test.local', password: 'staff223', custom_role: 'STAFF' })).token;
  finance = (await createUserAndLogin(app, owner, { email: 'finance@test.local', password: 'fin12345', custom_role: 'FINANCE' })).token;
}, 60000);

afterAll(closeDb);

const auth = (t) => ({ Authorization: `Bearer ${t}` });

describe('Pendaftaran akun', () => {
  it('menolak pendaftaran mandiri ketika sudah ada user', async () => {
    const res = await request(app).post('/api/auth/register')
      .send({ email: 'penyusup@test.local', password: 'rahasia123' });
    expect(res.status).toBe(403);
  });

  it('menghormati custom_role saat OWNER membuat user', async () => {
    const res = await request(app).post('/api/users').set(auth(owner))
      .send({ email: 'inv@test.local', password: 'inv12345', custom_role: 'INVENTORI' });
    expect(res.status).toBe(201);
    expect(res.body.user.custom_role).toBe('INVENTORI');
  });
});

describe('Login', () => {
  it('membalas 401 untuk akun tanpa password_hash, bukan 500', async () => {
    // alawizaneva@gmail.com di-seed tanpa password (khusus Login Google).
    // bcrypt.compare(password, null) melempar exception, bukan mengembalikan false.
    const res = await request(app).post('/api/auth/login')
      .send({ email: 'alawizaneva@gmail.com', password: 'apapun' });
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/Google/i);
  });

  it('menolak password salah', async () => {
    const res = await request(app).post('/api/auth/login')
      .send({ email: 'admin@zaneva.com', password: 'salah' });
    expect(res.status).toBe(401);
  });
});

describe('Otorisasi berbasis role', () => {
  let orderId;

  beforeAll(async () => {
    const res = await request(app).post('/api/orders').set(auth(staff)).send(makeOrder());
    orderId = res.body.order.id;
  });

  it.each([
    ['DELETE', '/api/orders/:id'],
    ['POST', '/api/orders/:id/finance'],
  ])('menolak STAFF pada %s %s', async (method, path) => {
    const url = path.replace(':id', orderId);
    const res = await request(app)[method.toLowerCase()](url).set(auth(staff)).send({ action: 'approve' });
    expect(res.status).toBe(403);
  });

  it.each([
    ['/api/orders/bulk-finance', { order_ids: [], action: 'approve' }],
    ['/api/products', { nama_produk: 'X', harga: 1 }],
    ['/api/import/confirm', { data: {} }],
    ['/api/shipping-services', { name: 'X', code: 'x' }],
  ])('menolak STAFF pada POST %s', async (path, body) => {
    const res = await request(app).post(path).set(auth(staff)).send(body);
    expect(res.status).toBe(403);
  });

  it('mengizinkan FINANCE melakukan approve', async () => {
    const res = await request(app).post(`/api/orders/${orderId}/finance`)
      .set(auth(finance)).send({ action: 'approve' });
    expect(res.status).toBe(200);
    expect(res.body.order.finance_status).toBe('APPROVED');
  });
});

describe('Kepemilikan order untuk STAFF', () => {
  let orderId;

  beforeAll(async () => {
    const res = await request(app).post('/api/orders').set(auth(staff))
      .send(makeOrder({ no_telepon: '081299999999' }));
    orderId = res.body.order.id;
  });

  it('menyembunyikan order milik STAFF lain sebagai 404', async () => {
    const res = await request(app).get(`/api/orders/${orderId}`).set(auth(staff2));
    expect(res.status).toBe(404);
  });

  it('menolak STAFF lain mengubah order tersebut', async () => {
    const res = await request(app).put(`/api/orders/${orderId}`)
      .set(auth(staff2)).send({ nama_pemesan: 'Diubah' });
    expect(res.status).toBe(404);
  });

  it('tetap mengizinkan pemiliknya', async () => {
    const res = await request(app).get(`/api/orders/${orderId}`).set(auth(staff));
    expect(res.status).toBe(200);
  });

  it('membatasi daftar customer STAFF pada pelanggan dari ordernya sendiri', async () => {
    const own = await request(app).get('/api/customers').set(auth(staff));
    const other = await request(app).get('/api/customers').set(auth(staff2));
    const all = await request(app).get('/api/customers').set(auth(owner));
    expect(own.body.customers.length).toBeGreaterThan(0);
    expect(other.body.customers.length).toBe(0);
    expect(all.body.total).toBeGreaterThanOrEqual(own.body.customers.length);
  });
});

describe('Dashboard', () => {
  it.each(['stats', 'sales-chart', 'status-distribution', 'shipping-performance'])(
    '/api/dashboard/%s berhasil untuk STAFF', async (endpoint) => {
      const res = await request(app).get(`/api/dashboard/${endpoint}`).set(auth(staff));
      expect(res.status).toBe(200);
    });

  it('tidak pecah oleh email yang mengandung sintaks SQL', async () => {
    // Email dipakai sebagai filter created_by. Dulu di-interpolasi langsung ke
    // string SQL, sehingga kutip tunggal di email bisa mengubah query.
    const evil = `bob' OR '1'='1@test.local`;
    const { token } = await createUserAndLogin(app, owner,
      { email: evil, password: 'evil1234', custom_role: 'STAFF' });
    const res = await request(app).get('/api/dashboard/stats').set(auth(token));
    expect(res.status).toBe(200);
  });
});

describe('Endpoint API yang tidak dikenal', () => {
  it('membalas JSON 404, bukan HTML SPA', async () => {
    const res = await request(app).get('/api/tidak-ada').set(auth(owner));
    expect(res.status).toBe(404);
    expect(res.body.error).toBeDefined();
  });
});

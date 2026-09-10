const request = require('supertest');
const {
  bootstrap, resetData, closeDb, loginAsOwner, createUserAndLogin, makeOrder,
} = require('../helpers/testdb');

let app, owner, staff;
const auth = (t) => ({ Authorization: `Bearer ${t}` });

beforeAll(async () => {
  app = await bootstrap();
  await resetData();
  owner = await loginAsOwner(app);
  staff = (await createUserAndLogin(app, owner, { email: 'staff@test.local', password: 'staff123', custom_role: 'STAFF' })).token;
}, 60000);

afterAll(closeDb);

const createOrder = (token, body) =>
  request(app).post('/api/orders').set(auth(token)).send(makeOrder(body));

describe('Perhitungan total', () => {
  it('mengalikan qty dengan harga pada total_belanja', async () => {
    const res = await createOrder(staff, {
      ongkir: 10000,
      items: [{ nama_produk: 'Hijab', qty: 3, harga_setelah_diskon: 100000 }],
    });
    expect(res.status).toBe(201);
    expect(Number(res.body.order.total_belanja)).toBe(300000);
    expect(Number(res.body.items[0].subtotal_item)).toBe(300000);
  });

  it('menjaga total_belanja tetap sama dengan jumlah subtotal item', async () => {
    const res = await createOrder(staff, {
      no_telepon: '081200000002',
      items: [
        { nama_produk: 'A', qty: 2, harga_setelah_diskon: 50000 },
        { nama_produk: 'B', qty: 4, harga_setelah_diskon: 25000 },
      ],
    });
    const jumlahItem = res.body.items.reduce((s, i) => s + Number(i.subtotal_item), 0);
    expect(Number(res.body.order.total_belanja)).toBe(jumlahItem);
    expect(Number(res.body.order.total_belanja)).toBe(200000);
  });

  it('menghitung penanganan COD 3% dari belanja + ongkir', async () => {
    const res = await createOrder(staff, {
      no_telepon: '081200000003', ongkir: 10000,
      items: [{ nama_produk: 'Hijab', qty: 3, harga_setelah_diskon: 100000 }],
    });
    expect(Number(res.body.order.penanganan)).toBe(9300);
    expect(Number(res.body.order.total)).toBe(319300);
  });

  it('tidak membebankan penanganan pada transaksi CASH', async () => {
    const res = await createOrder(staff, {
      no_telepon: '081200000004', jenis_transaksi: 'CASH', ongkir: 10000,
      items: [{ nama_produk: 'Hijab', qty: 2, harga_setelah_diskon: 100000 }],
    });
    expect(Number(res.body.order.penanganan)).toBe(0);
    expect(Number(res.body.order.total)).toBe(210000);
  });
});

describe('Penomoran order', () => {
  it('menghasilkan nomor unik dan berurutan', async () => {
    const nomor = [];
    for (let i = 0; i < 15; i++) {
      const res = await createOrder(staff, { no_telepon: '0813000000' + i });
      nomor.push(res.body.order.order_number);
    }
    expect(new Set(nomor).size).toBe(15);
    expect(nomor[0]).toMatch(/^CRM-\d{8}-\d{4}$/);

    const urutan = nomor.map((n) => parseInt(n.split('-')[2], 10));
    expect(urutan).toEqual([...urutan].sort((a, b) => a - b));
  });

  it('tidak bentrok walau order dibuat bersamaan', async () => {
    const hasil = await Promise.all(
      Array.from({ length: 20 }, (_, i) =>
        createOrder(staff, { no_telepon: '0814000000' + i })));
    const nomor = hasil.map((r) => r.body.order.order_number);
    expect(new Set(nomor).size).toBe(20);
  });
});

describe('Update order', () => {
  let orderId;

  beforeEach(async () => {
    const res = await createOrder(staff, {
      no_telepon: '081500000001', ongkir: 5000,
      items: [{ nama_produk: 'Hijab', qty: 2, harga_setelah_diskon: 100000 }],
    });
    orderId = res.body.order.id;
  });

  it('mempertahankan field yang tidak dikirim pada update parsial', async () => {
    // Upload Resi dulu memanggil endpoint ini hanya dengan no_resi, sehingga
    // seluruh kolom lain jadi NULL dan menabrak constraint NOT NULL.
    const res = await request(app).put(`/api/orders/${orderId}`)
      .set(auth(staff)).send({ ongkir: 20000 });
    expect(res.status).toBe(200);
    expect(res.body.order.nama_pemesan).toBe('Budi');
    expect(res.body.order.alamat).toBe('Jl Mawar 1');
    expect(Number(res.body.order.ongkir)).toBe(20000);
  });

  it('tidak menghapus item ketika items tidak dikirim', async () => {
    const res = await request(app).put(`/api/orders/${orderId}`)
      .set(auth(staff)).send({ ongkir: 20000 });
    expect(res.body.items).toHaveLength(1);
  });

  it('mengganti item ketika items dikirim', async () => {
    const res = await request(app).put(`/api/orders/${orderId}`).set(auth(staff))
      .send({ items: [
        { nama_produk: 'Baru A', qty: 1, harga_setelah_diskon: 1000 },
        { nama_produk: 'Baru B', qty: 2, harga_setelah_diskon: 2000 },
      ] });
    expect(res.body.items).toHaveLength(2);
    expect(Number(res.body.order.total_belanja)).toBe(5000);
  });

  it('mengembalikan order ke antrean Finance saat COD diubah jadi CASH', async () => {
    const res = await request(app).put(`/api/orders/${orderId}`)
      .set(auth(staff)).send({ jenis_transaksi: 'CASH' });
    expect(res.body.order.status_pesanan).toBe('WAITING_FINANCE');
    expect(res.body.order.finance_status).toBe('PENDING');
  });

  it('melepas kewajiban Finance saat kembali jadi COD', async () => {
    await request(app).put(`/api/orders/${orderId}`).set(auth(staff)).send({ jenis_transaksi: 'CASH' });
    const res = await request(app).put(`/api/orders/${orderId}`).set(auth(staff)).send({ jenis_transaksi: 'COD' });
    expect(res.body.order.status_pesanan).toBe('READY_TO_PROCESS');
  });

  it('tidak menaikkan total_orders pelanggan saat order diedit', async () => {
    const sebelum = await request(app).get('/api/customers?search=081500000001').set(auth(staff));
    const awal = Number(sebelum.body.customers[0].total_orders);
    await request(app).put(`/api/orders/${orderId}`).set(auth(staff)).send({ ongkir: 30000 });
    const sesudah = await request(app).get('/api/customers?search=081500000001').set(auth(staff));
    expect(Number(sesudah.body.customers[0].total_orders)).toBe(awal);
  });
});

describe('Alur Finance', () => {
  it('menempatkan order CASH di WAITING_FINANCE sejak dibuat', async () => {
    const res = await createOrder(staff, { no_telepon: '081600000001', jenis_transaksi: 'CASH' });
    expect(res.body.order.status_pesanan).toBe('WAITING_FINANCE');
    expect(res.body.order.finance_status).toBe('PENDING');
  });

  it('melepas order COD langsung ke READY_TO_PROCESS', async () => {
    const res = await createOrder(staff, { no_telepon: '081600000002' });
    expect(res.body.order.status_pesanan).toBe('READY_TO_PROCESS');
  });
});

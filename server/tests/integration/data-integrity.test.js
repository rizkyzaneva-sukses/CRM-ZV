const request = require('supertest');
const XLSX = require('xlsx');
const {
  bootstrap, resetData, closeDb, loginAsOwner, makeOrder,
} = require('../helpers/testdb');

let app, owner;
const auth = (t) => ({ Authorization: `Bearer ${t}` });

beforeAll(async () => {
  app = await bootstrap();
  await resetData();
  owner = await loginAsOwner(app);
}, 60000);

afterAll(closeDb);

const xlsxBuffer = (rows) => {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Sheet1');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
};

describe('Paginasi untuk ekspor penuh', () => {
  const JUMLAH = 120;
  const LIMIT = 25;

  beforeAll(async () => {
    for (let i = 0; i < JUMLAH; i++) {
      await request(app).post('/api/orders').set(auth(owner)).send(makeOrder({
        nama_pemesan: 'Cust' + i,
        no_telepon: '08' + String(i).padStart(9, '0'),
        items: [
          { nama_produk: 'A', qty: 2, harga_setelah_diskon: 50000 },
          { nama_produk: 'B', qty: 1, harga_setelah_diskon: 25000 },
        ],
      }));
    }
  }, 120000);

  // Ini kontrak yang diandalkan Download All Data: tanpa `total` dan `page`,
  // client tidak punya cara tahu masih ada sisa data.
  it.each([
    ['/api/orders', 'orders'],
    ['/api/order-items', 'order_items'],
    ['/api/customers', 'customers'],
    ['/api/audit-logs', 'logs'],
    ['/api/print-logs', 'print_logs'],
    ['/api/exceptions', 'exceptions'],
    ['/api/products', 'products'],
    ['/api/kecamatan-sap', 'data'],
    ['/api/kecamatan-jnt', 'data'],
  ])('%s mengembalikan total dan field %s', async (path, field) => {
    const res = await request(app).get(`${path}?limit=1`).set(auth(owner));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body[field])).toBe(true);
    expect(typeof res.body.total).toBe('number');
  });

  async function ambilSemua(path, field) {
    const semua = [];
    for (let page = 1; page <= 100; page++) {
      const res = await request(app).get(`${path}?page=${page}&limit=${LIMIT}`).set(auth(owner));
      const rows = res.body[field] || [];
      semua.push(...rows);
      if (rows.length < LIMIT) break;
      if (semua.length >= res.body.total) break;
    }
    return semua;
  }

  it('mengambil seluruh order tanpa terpotong', async () => {
    const semua = await ambilSemua('/api/orders', 'orders');
    expect(semua).toHaveLength(JUMLAH);
  });

  it('mengambil seluruh order item tanpa terpotong', async () => {
    // Endpoint ini dulu tidak punya offset sama sekali, jadi backup selalu
    // kehilangan baris produk begitu jumlahnya melebihi satu halaman.
    const semua = await ambilSemua('/api/order-items', 'order_items');
    expect(semua).toHaveLength(JUMLAH * 2);
  });

  it('tidak menghasilkan baris dobel antar halaman', async () => {
    const semua = await ambilSemua('/api/order-items', 'order_items');
    expect(new Set(semua.map((r) => r.id)).size).toBe(semua.length);
  });

  it('menghitung total dengan benar walau limit sangat kecil', async () => {
    const res = await request(app).get('/api/orders?limit=1').set(auth(owner));
    expect(res.body.total).toBe(JUMLAH);
    expect(res.body.orders).toHaveLength(1);
  });
});

describe('Keunikan nomor resi', () => {
  let a, b;

  beforeAll(async () => {
    const r1 = await request(app).post('/api/orders').set(auth(owner)).send(makeOrder({ no_telepon: '089900000001' }));
    const r2 = await request(app).post('/api/orders').set(auth(owner)).send(makeOrder({ no_telepon: '089900000002' }));
    a = r1.body.order.id;
    b = r2.body.order.id;
  });

  it('menerima resi pertama', async () => {
    const res = await request(app).post(`/api/orders/${a}/resi`).set(auth(owner)).send({ no_resi: 'RESI-UNIK-1' });
    expect(res.status).toBe(200);
  });

  it('menolak resi yang sudah dipakai order lain dengan 409', async () => {
    const res = await request(app).post(`/api/orders/${b}/resi`).set(auth(owner)).send({ no_resi: 'RESI-UNIK-1' });
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/sudah dipakai/i);
  });

  it('melewati yang bentrok pada bulk-resi tanpa menggagalkan sisanya', async () => {
    const res = await request(app).post('/api/orders/bulk-resi').set(auth(owner)).send({
      updates: [
        { order_id: b, no_resi: 'RESI-UNIK-2' },
        { order_id: b, no_resi: 'RESI-UNIK-1' },
      ],
    });
    expect(res.status).toBe(200);
    expect(res.body.updated).toBe(1);
    expect(res.body.conflicts).toHaveLength(1);
  });
});

describe('Upload Excel', () => {
  it('memasukkan semua baris produk walau SKU kosong', async () => {
    // SKU kosong dulu disimpan sebagai '' pada kolom UNIQUE, sehingga hanya
    // baris pertama yang berhasil dan sisanya gagal.
    const res = await request(app).post('/api/upload/products').set(auth(owner))
      .attach('file', xlsxBuffer([
        { nama_produk: 'Gamis A', harga: 150000 },
        { nama_produk: 'Gamis B', harga: 160000 },
        { nama_produk: 'Gamis C', harga: 170000 },
      ]), 'produk.xlsx');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(3);
    expect(res.body.failed).toBe(0);
  });

  it('tidak menebak tujuan resi ketika nama penerima ganda', async () => {
    for (const telp of ['089800000001', '089800000002']) {
      await request(app).post('/api/orders').set(auth(owner))
        .send(makeOrder({ nama_pemesan: 'Siti Aminah', no_telepon: telp }));
    }
    const res = await request(app).post('/api/upload/resi').set(auth(owner))
      .attach('file', xlsxBuffer([{ no_waybill: 'WB-AMBIGU', penerima: 'Siti Aminah' }]), 'resi.xlsx');
    expect(res.body.matched).toBe(0);
    expect(res.body.unmatched).toBe(1);
    expect(res.body.unmatchedData[0].reason).toMatch(/verifikasi manual/i);
  });
});

describe('Factory reset', () => {
  it('menghapus data transaksi tapi memulihkan master jasa pengiriman', async () => {
    const sebelum = await request(app).get('/api/shipping-services').set(auth(owner));
    const jumlahJasa = sebelum.body.shipping_services.length;
    expect(jumlahJasa).toBeGreaterThan(0);

    const reset = await request(app).post('/api/users/reset-all-data').set(auth(owner));
    expect(reset.status).toBe(200);

    const sesudah = await request(app).get('/api/shipping-services').set(auth(owner));
    expect(sesudah.body.shipping_services).toHaveLength(jumlahJasa);

    const orders = await request(app).get('/api/orders').set(auth(owner));
    expect(orders.body.total).toBe(0);
  });
});

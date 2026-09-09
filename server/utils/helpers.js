const { query } = require('./db');

// Nomor order diambil dari counter harian di database, bukan angka acak.
// Versi lama memakai 4 digit random (9.000 kemungkinan per hari): pada ~100 order
// sehari peluang tabrakan sudah puluhan persen, dan order_number itu UNIQUE.
// Loop retry hanya untuk melewati nomor lama hasil generator acak yang kebetulan sama.
async function generateOrderNumber() {
  for (let attempt = 0; attempt < 20; attempt++) {
    const counter = await query(
      `INSERT INTO order_number_counters (day, last_seq) VALUES (CURRENT_DATE, 1)
       ON CONFLICT (day) DO UPDATE SET last_seq = order_number_counters.last_seq + 1
       RETURNING last_seq, to_char(day, 'YYYYMMDD') AS day_str`
    );
    const { last_seq, day_str } = counter.rows[0];
    const candidate = `CRM-${day_str}-${String(last_seq).padStart(4, '0')}`;
    const clash = await query('SELECT 1 FROM orders WHERE order_number = $1', [candidate]);
    if (clash.rows.length === 0) return candidate;
  }
  throw new Error('Gagal membuat nomor order yang unik');
}

function normalizeShippingService(serviceName) {
  if (!serviceName) return 'other';
  const s = serviceName.toLowerCase();
  const map = {
    sap: 'sap', 'sap express': 'sap',
    jnt: 'jnt', 'j&t': 'jnt', 'j&t express': 'jnt',
    jne: 'jne',
    sicepat: 'sicepat', 'si cepat': 'sicepat',
    anteraja: 'anteraja', 'anter aja': 'anteraja',
    ninja: 'ninja', 'ninja express': 'ninja',
    idexpress: 'idexpress', 'id express': 'idexpress',
    lion: 'lion', 'lion parcel': 'lion',
    wahana: 'wahana',
    tiki: 'tiki',
    pos: 'pos', 'pos indonesia': 'pos',
    shopee: 'shopee', 'shopee express': 'shopee',
    grab: 'grab', 'grab express': 'grab',
    gojek: 'gojek', 'gosend': 'gojek',
  };
  for (const [key, val] of Object.entries(map)) {
    if (s.includes(key)) return val;
  }
  return 'other';
}

function isSAPService(serviceName) {
  return normalizeShippingService(serviceName) === 'sap';
}

function isJNTService(serviceName) {
  return normalizeShippingService(serviceName) === 'jnt';
}

module.exports = { generateOrderNumber, normalizeShippingService, isSAPService, isJNTService };

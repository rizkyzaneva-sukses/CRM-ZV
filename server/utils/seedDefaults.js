const { query } = require('./db');

// Master jasa pengiriman bawaan. Dipakai saat startup dan setelah Factory Reset,
// supaya reset mengembalikan aplikasi ke kondisi pabrik - bukan ke tabel kosong.
const DEFAULT_SHIPPING_SERVICES = [
  ['SAP Express', 'sap', 'Marketplace'],
  ['J&T Express', 'jnt', 'Marketplace'],
  ['JNE', 'jne', 'Marketplace'],
  ['SiCepat', 'sicepat', 'Marketplace'],
  ['AnterAja', 'anteraja', 'Marketplace'],
  ['Ninja Express', 'ninja', 'Marketplace'],
  ['ID Express', 'idexpress', 'Marketplace'],
  ['Lion Parcel', 'lion', 'Marketplace'],
  ['Wahana', 'wahana', 'Marketplace'],
  ['TIKI', 'tiki', 'Marketplace'],
  ['Pos Indonesia', 'pos', 'Marketplace'],
  ['Shopee Express', 'shopee', 'Shopee'],
  ['Grab Express', 'grab', 'Grab'],
  ['GoSend', 'gojek', 'Gojek'],
];

async function seedShippingServices() {
  let seeded = 0;
  for (const [name, code, platform] of DEFAULT_SHIPPING_SERVICES) {
    try {
      const res = await query(
        'INSERT INTO shipping_services (name, code, platform) VALUES ($1,$2,$3) ON CONFLICT (code) DO NOTHING',
        [name, code, platform]
      );
      seeded += res.rowCount;
    } catch (e) { /* skip */ }
  }
  return seeded;
}

module.exports = { DEFAULT_SHIPPING_SERVICES, seedShippingServices };

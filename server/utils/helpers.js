const { format } = require('date-fns');

function generateOrderNumber() {
  const date = format(new Date(), 'yyyyMMdd');
  const random = Math.floor(1000 + Math.random() * 9000);
  return `CRM-${date}-${random}`;
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

const API_BASE = '/api';

function getToken() {
  return localStorage.getItem('crm_token');
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    localStorage.removeItem('crm_token');
    localStorage.removeItem('crm_user');
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
    throw new Error('Unauthorized');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || 'Request failed');
  }

  return res.json();
}

export const api = {
  // Auth
  login: (email, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  loginWithGoogle: (token) => request('/auth/google', { method: 'POST', body: JSON.stringify({ token }) }),
  register: (data) => request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  me: () => request('/auth/me').then(res => res.user),

  // Orders
  getOrders: (params) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/orders?${qs}`);
  },
  getOrder: (id) => request(`/orders/${id}`),
  createOrder: (data) => request('/orders', { method: 'POST', body: JSON.stringify(data) }),
  updateOrder: (id, data) => request(`/orders/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteOrder: (id) => request(`/orders/${id}`, { method: 'DELETE' }),
  financeAction: (id, action) => request(`/orders/${id}/finance`, { method: 'POST', body: JSON.stringify({ action }) }),
  bulkFinance: (order_ids, action) => request('/orders/bulk-finance', { method: 'POST', body: JSON.stringify({ order_ids, action }) }),
  updateResi: (id, no_resi) => request(`/orders/${id}/resi`, { method: 'POST', body: JSON.stringify({ no_resi }) }),
  bulkResi: (updates) => request('/orders/bulk-resi', { method: 'POST', body: JSON.stringify({ updates }) }),

  // Customers
  getCustomers: (params) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/customers?${qs}`);
  },
  getCustomer: (id) => request(`/customers/${id}`),
  updateCustomer: (id, data) => request(`/customers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Products
  getProducts: (params) => {
    const qs = new URLSearchParams(params || {}).toString();
    return request(`/products?${qs}`);
  },
  createProduct: (data) => request('/products', { method: 'POST', body: JSON.stringify(data) }),
  updateProduct: (id, data) => request(`/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteProduct: (id) => request(`/products/${id}`, { method: 'DELETE' }),

  // Shipping Services
  getShippingServices: () => request('/shipping-services'),
  createShippingService: (data) => request('/shipping-services', { method: 'POST', body: JSON.stringify(data) }),
  updateShippingService: (id, data) => request(`/shipping-services/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteShippingService: (id) => request(`/shipping-services/${id}`, { method: 'DELETE' }),

  // Kecamatan
  getSapProvinces: () => request('/kecamatan-sap/provinces'),
  getSapCities: (provinsi) => request(`/kecamatan-sap/cities?provinsi=${encodeURIComponent(provinsi)}`),
  getSapDistricts: (provinsi, kota_kab) => request(`/kecamatan-sap/districts?provinsi=${encodeURIComponent(provinsi)}&kota_kab=${encodeURIComponent(kota_kab)}`),
  getSapKecamatans: (params) => {
    const qs = new URLSearchParams(params || {}).toString();
    return request(`/kecamatan-sap?${qs}`);
  },
  createSapKecamatan: (data) => request('/kecamatan-sap', { method: 'POST', body: JSON.stringify(data) }),
  updateSapKecamatan: (id, data) => request(`/kecamatan-sap/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSapKecamatan: (id) => request(`/kecamatan-sap/${id}`, { method: 'DELETE' }),

  getJntProvinces: () => request('/kecamatan-jnt/provinces'),
  getJntCities: (provinsi) => request(`/kecamatan-jnt/cities?provinsi=${encodeURIComponent(provinsi)}`),
  getJntDistricts: (provinsi, kota_kab) => request(`/kecamatan-jnt/districts?provinsi=${encodeURIComponent(provinsi)}&kota_kab=${encodeURIComponent(kota_kab)}`),
  getJntKecamatans: (params) => {
    const qs = new URLSearchParams(params || {}).toString();
    return request(`/kecamatan-jnt?${qs}`);
  },
  createJntKecamatan: (data) => request('/kecamatan-jnt', { method: 'POST', body: JSON.stringify(data) }),
  updateJntKecamatan: (id, data) => request(`/kecamatan-jnt/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteJntKecamatan: (id) => request(`/kecamatan-jnt/${id}`, { method: 'DELETE' }),

  // Dashboard
  getDashboardStats: () => request('/dashboard/stats'),
  getSalesChart: (period) => request(`/dashboard/sales-chart?period=${period}`),
  getStatusDistribution: () => request('/dashboard/status-distribution'),
  getShippingPerformance: () => request('/dashboard/shipping-performance'),

  // Export
  exportSAP: (params) => request(`/export/sap?${new URLSearchParams(params || {}).toString()}`),
  exportJNT: (params) => request(`/export/jnt?${new URLSearchParams(params || {}).toString()}`),
  exportCRM: () => request('/export/crm'),

  // Upload
  uploadFile: async (endpoint, file) => {
    const token = getToken();
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/upload/${endpoint}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Upload failed' }));
      throw new Error(err.error || 'Upload failed');
    }
    return res.json();
  },

  // Audit Logs
  getAuditLogs: (params) => {
    const qs = new URLSearchParams(params || {}).toString();
    return request(`/audit-logs?${qs}`);
  },

  // Users
  getUsers: () => request('/users'),
  createUser: (data) => request('/users', { method: 'POST', body: JSON.stringify(data) }),
  updateUser: (id, data) => request(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteUser: (id) => request(`/users/${id}`, { method: 'DELETE' }),
  resetAllData: () => request('/users/reset-all-data', { method: 'POST' }),

  // Import
  importPreview: async (file) => {
    const token = getToken();
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/import/preview`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Preview failed' }));
      throw new Error(err.error || 'Preview failed');
    }
    return res.json();
  },
  importConfirm: (data) => request('/import/confirm', { method: 'POST', body: JSON.stringify({ data }) }),

  // Order Items
  getOrderItems: (params) => {
    const qs = new URLSearchParams(params || {}).toString();
    return request(`/order-items?${qs}`);
  },
  deleteOrderItem: (id) => request(`/order-items/${id}`, { method: 'DELETE' }),

  // Print Logs
  getPrintLogs: (params) => {
    const qs = new URLSearchParams(params || {}).toString();
    return request(`/print-logs?${qs}`);
  },
  createPrintLog: (data) => request('/print-logs', { method: 'POST', body: JSON.stringify(data) }),

  // Resi Import Exceptions
  getResiExceptions: (params) => {
    const qs = new URLSearchParams(params || {}).toString();
    return request(`/exceptions?${qs}`);
  },
  createResiException: (data) => request('/exceptions', { method: 'POST', body: JSON.stringify(data) }),
  updateResiException: (id, data) => request(`/exceptions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Integrations Mock
  sendEmail: (data) => request('/integrations/email', { method: 'POST', body: JSON.stringify(data) }).catch(() => ({ success: true })),
};

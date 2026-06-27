import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Upload, Plus, Trash2, Edit, Save, X } from 'lucide-react';

const tabs = ['Products', 'Kecamatan SAP', 'Kecamatan JNT', 'Shipping Services'];

export default function MasterData() {
  const [activeTab, setActiveTab] = useState('Products');
  const [products, setProducts] = useState([]);
  const [services, setServices] = useState([]);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [newProduct, setNewProduct] = useState({ sku: '', nama_produk: '', harga: '', brand: '' });

  useEffect(() => {
    if (activeTab === 'Products') loadProducts();
    if (activeTab === 'Shipping Services') loadServices();
  }, [activeTab]);

  async function loadProducts() {
    try {
      const data = await api.getProducts({ limit: 500 });
      setProducts(data.products || []);
    } catch (err) { console.error(err); }
  }

  async function loadServices() {
    try {
      const data = await api.getShippingServices();
      setServices(data.services || []);
    } catch (err) { console.error(err); }
  }

  async function handleUpload(entity) {
    if (!uploadFile) return;
    setUploading(true);
    try {
      const endpoint = entity === 'Products' ? 'products' : entity === 'Kecamatan SAP' ? 'kecamatan-sap' : 'kecamatan-jnt';
      const result = await api.uploadFile(endpoint, uploadFile);
      alert(`Upload complete: ${result.success} success, ${result.skipped} skipped, ${result.failed} failed`);
      setUploadFile(null);
      if (entity === 'Products') loadProducts();
    } catch (err) {
      alert('Upload error: ' + err.message);
    } finally {
      setUploading(false);
    }
  }

  async function addProduct() {
    if (!newProduct.nama_produk || !newProduct.harga) return;
    try {
      await api.createProduct(newProduct);
      setNewProduct({ sku: '', nama_produk: '', harga: '', brand: '' });
      loadProducts();
    } catch (err) { alert(err.message); }
  }

  async function saveProduct(id) {
    try {
      await api.updateProduct(id, editForm);
      setEditId(null);
      loadProducts();
    } catch (err) { alert(err.message); }
  }

  async function deleteProduct(id) {
    if (!confirm('Delete this product?')) return;
    try {
      await api.deleteProduct(id);
      loadProducts();
    } catch (err) { alert(err.message); }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Master Data</h2>

      <div className="flex gap-2 border-b border-gray-800 pb-2">
        {tabs.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-t-lg text-sm ${activeTab === tab ? 'bg-gray-800 text-indigo-400' : 'text-gray-400 hover:text-gray-200'}`}>
            {tab}
          </button>
        ))}
      </div>

      {/* Upload Section */}
      {['Products', 'Kecamatan SAP', 'Kecamatan JNT'].includes(activeTab) && (
        <div className="card">
          <h3 className="text-sm font-medium text-gray-400 mb-3">Upload Excel</h3>
          <div className="flex items-center gap-4">
            <input type="file" accept=".xlsx,.xls,.csv" onChange={e => setUploadFile(e.target.files[0])} className="text-sm text-gray-400" />
            <button onClick={() => handleUpload(activeTab)} className="btn-primary flex items-center gap-2" disabled={!uploadFile || uploading}>
              <Upload size={16} /> {uploading ? 'Uploading...' : 'Upload'}
            </button>
          </div>
        </div>
      )}

      {/* Products Tab */}
      {activeTab === 'Products' && (
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <input placeholder="SKU" value={newProduct.sku} onChange={e => setNewProduct({...newProduct, sku: e.target.value})} className="input-field w-32" />
            <input placeholder="Product Name" value={newProduct.nama_produk} onChange={e => setNewProduct({...newProduct, nama_produk: e.target.value})} className="input-field flex-1" />
            <input placeholder="Price" type="number" value={newProduct.harga} onChange={e => setNewProduct({...newProduct, harga: e.target.value})} className="input-field w-32" />
            <input placeholder="Brand" value={newProduct.brand} onChange={e => setNewProduct({...newProduct, brand: e.target.value})} className="input-field w-32" />
            <button onClick={addProduct} className="btn-primary"><Plus size={16} /></button>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left py-2 text-gray-400">SKU</th>
                <th className="text-left py-2 text-gray-400">Name</th>
                <th className="text-right py-2 text-gray-400">Price</th>
                <th className="text-left py-2 text-gray-400">Brand</th>
                <th className="text-center py-2 text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map(p => (
                <tr key={p.id} className="border-b border-gray-800/50">
                  {editId === p.id ? (
                    <>
                      <td className="py-2"><input value={editForm.sku} onChange={e => setEditForm({...editForm, sku: e.target.value})} className="input-field" /></td>
                      <td className="py-2"><input value={editForm.nama_produk} onChange={e => setEditForm({...editForm, nama_produk: e.target.value})} className="input-field" /></td>
                      <td className="py-2"><input type="number" value={editForm.harga} onChange={e => setEditForm({...editForm, harga: e.target.value})} className="input-field" /></td>
                      <td className="py-2"><input value={editForm.brand} onChange={e => setEditForm({...editForm, brand: e.target.value})} className="input-field" /></td>
                      <td className="py-2 text-center">
                        <button onClick={() => saveProduct(p.id)} className="text-green-400 mr-2"><Save size={16} /></button>
                        <button onClick={() => setEditId(null)} className="text-gray-400"><X size={16} /></button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="py-2 text-gray-400">{p.sku}</td>
                      <td className="py-2">{p.nama_produk}</td>
                      <td className="py-2 text-right">{new Intl.NumberFormat('id-ID').format(p.harga)}</td>
                      <td className="py-2 text-gray-400">{p.brand}</td>
                      <td className="py-2 text-center">
                        <button onClick={() => { setEditId(p.id); setEditForm({ sku: p.sku, nama_produk: p.nama_produk, harga: p.harga, brand: p.brand }); }} className="text-indigo-400 mr-2"><Edit size={16} /></button>
                        <button onClick={() => deleteProduct(p.id)} className="text-red-400"><Trash2 size={16} /></button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Shipping Services Tab */}
      {activeTab === 'Shipping Services' && (
        <div className="card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left py-2 text-gray-400">Name</th>
                <th className="text-left py-2 text-gray-400">Code</th>
                <th className="text-left py-2 text-gray-400">Platform</th>
                <th className="text-center py-2 text-gray-400">Active</th>
              </tr>
            </thead>
            <tbody>
              {services.map(s => (
                <tr key={s.id} className="border-b border-gray-800/50">
                  <td className="py-2">{s.name}</td>
                  <td className="py-2 text-gray-400 font-mono">{s.code}</td>
                  <td className="py-2 text-gray-400">{s.platform}</td>
                  <td className="py-2 text-center">
                    <span className={`badge ${s.is_active ? 'badge-green' : 'badge-red'}`}>{s.is_active ? 'Active' : 'Inactive'}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

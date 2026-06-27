import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import { Plus, Trash2, Save, ArrowLeft } from 'lucide-react';

export default function InputOrder() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  const [loading, setLoading] = useState(false);
  const [services, setServices] = useState([]);
  const [products, setProducts] = useState([]);

  const [form, setForm] = useState({
    nama_pemesan: '', alamat: '', no_telepon: '', kode_pos: '', berat_kg: '',
    jenis_transaksi: 'CASH', instruksi_pengiriman: '', jasa_pengiriman: '',
    provinsi: '', kota_kab: '', kecamatan: '', kecamatan_kode: '',
    ketentuan: '', metode_pembayaran: '', transfer_atas_nama: '', ongkir: 0,
  });

  const [items, setItems] = useState([
    { nama_produk: '', sku: '', qty: 1, harga_setelah_diskon: 0, jasa_pengiriman: '', berat_kg: 0 }
  ]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [s, p] = await Promise.all([
        api.getShippingServices(),
        api.getProducts({ limit: 500 }),
      ]);
      setServices(s.services || []);
      setProducts(p.products || []);

      if (editId) {
        const { order, items: orderItems } = await api.getOrder(editId);
        setForm({
          nama_pemesan: order.nama_pemesan || '', alamat: order.alamat || '',
          no_telepon: order.no_telepon || '', kode_pos: order.kode_pos || '',
          berat_kg: order.berat_kg || '', jenis_transaksi: order.jenis_transaksi || 'CASH',
          instruksi_pengiriman: order.instruksi_pengiriman || '', jasa_pengiriman: order.jasa_pengiriman || '',
          provinsi: order.provinsi || '', kota_kab: order.kota_kab || '',
          kecamatan: order.kecamatan || '', kecamatan_kode: order.kecamatan_kode || '',
          ketentuan: order.ketentuan || '', metode_pembayaran: order.metode_pembayaran || '',
          transfer_atas_nama: order.transfer_atas_nama || '', ongkir: order.ongkir || 0,
        });
        if (orderItems && orderItems.length > 0) {
          setItems(orderItems.map(i => ({
            nama_produk: i.nama_produk || '', sku: i.sku || '',
            qty: i.qty || 1, harga_setelah_diskon: i.harga_setelah_diskon || 0,
            jasa_pengiriman: i.jasa_pengiriman || '', berat_kg: i.berat_kg || 0,
          })));
        }
      }
    } catch (err) {
      console.error('Load error:', err);
    }
  }

  function updateForm(field, value) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  function updateItem(index, field, value) {
    setItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
  }

  function addItem() {
    setItems(prev => [...prev, { nama_produk: '', sku: '', qty: 1, harga_setelah_diskon: 0, jasa_pengiriman: '', berat_kg: 0 }]);
  }

  function removeItem(index) {
    if (items.length <= 1) return;
    setItems(prev => prev.filter((_, i) => i !== index));
  }

  function selectProduct(index, product) {
    updateItem(index, 'nama_produk', product.nama_produk);
    updateItem(index, 'sku', product.sku || '');
    updateItem(index, 'harga_setelah_diskon', parseFloat(product.harga) || 0);
  }

  const totalBelanja = items.reduce((sum, item) => sum + (parseFloat(item.harga_setelah_diskon) || 0) * (parseInt(item.qty) || 1), 0);
  const ongkir = parseFloat(form.ongkir) || 0;
  const penanganan = form.jenis_transaksi === 'COD' ? Math.round((totalBelanja + ongkir) * 0.03) : 0;
  const grandTotal = totalBelanja + ongkir + penanganan;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.nama_pemesan || !form.alamat || !form.no_telepon) {
      alert('Nama pemesan, alamat, dan no telepon wajib diisi');
      return;
    }
    if (items.length === 0 || !items[0].nama_produk) {
      alert('Minimal 1 item dengan nama produk');
      return;
    }
    if (items.some(i => !i.jasa_pengiriman)) {
      alert('Setiap item harus memiliki jasa pengiriman');
      return;
    }

    setLoading(true);
    try {
      const data = {
        ...form,
        items: items.map(i => ({
          ...i,
          qty: parseInt(i.qty) || 1,
          harga_setelah_diskon: parseFloat(i.harga_setelah_diskon) || 0,
          subtotal_item: (parseInt(i.qty) || 1) * (parseFloat(i.harga_setelah_diskon) || 0),
        })),
      };

      if (editId) {
        await api.updateOrder(editId, data);
      } else {
        await api.createOrder(data);
      }
      navigate('/');
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate('/')} className="btn-secondary flex items-center gap-2">
          <ArrowLeft size={16} /> Back
        </button>
        <h2 className="text-xl font-semibold">{editId ? 'Edit Order' : 'New Order'}</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Customer Info */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Customer Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Nama Pemesan *</label>
              <input value={form.nama_pemesan} onChange={e => updateForm('nama_pemesan', e.target.value)} className="input-field" required />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">No Telepon *</label>
              <input value={form.no_telepon} onChange={e => updateForm('no_telepon', e.target.value)} className="input-field" required />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm text-gray-400 mb-1">Alamat *</label>
              <textarea value={form.alamat} onChange={e => updateForm('alamat', e.target.value)} className="input-field" rows={2} required />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Kode Pos</label>
              <input value={form.kode_pos} onChange={e => updateForm('kode_pos', e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Provinsi</label>
              <input value={form.provinsi} onChange={e => updateForm('provinsi', e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Kota/Kab</label>
              <input value={form.kota_kab} onChange={e => updateForm('kota_kab', e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Kecamatan</label>
              <input value={form.kecamatan} onChange={e => updateForm('kecamatan', e.target.value)} className="input-field" />
            </div>
          </div>
        </div>

        {/* Transaction Info */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Transaction</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Jenis Transaksi *</label>
              <select value={form.jenis_transaksi} onChange={e => updateForm('jenis_transaksi', e.target.value)} className="input-field">
                <option value="CASH">CASH</option>
                <option value="COD">COD</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Metode Pembayaran</label>
              <select value={form.metode_pembayaran} onChange={e => updateForm('metode_pembayaran', e.target.value)} className="input-field">
                <option value="">Pilih...</option>
                <option value="BCA">BCA</option>
                <option value="BNI">BNI</option>
                <option value="BRI">BRI</option>
                <option value="Mandiri">Mandiri</option>
                <option value="GoPay">GoPay</option>
                <option value="OVO">OVO</option>
                <option value="DANA">DANA</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Transfer Atas Nama</label>
              <input value={form.transfer_atas_nama} onChange={e => updateForm('transfer_atas_nama', e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Jasa Pengiriman *</label>
              <select value={form.jasa_pengiriman} onChange={e => updateForm('jasa_pengiriman', e.target.value)} className="input-field" required>
                <option value="">Pilih...</option>
                {services.filter(s => s.is_active).map(s => (
                  <option key={s.code} value={s.code}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Ongkir</label>
              <input type="number" value={form.ongkir} onChange={e => updateForm('ongkir', e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Berat (kg)</label>
              <input type="number" step="0.01" value={form.berat_kg} onChange={e => updateForm('berat_kg', e.target.value)} className="input-field" />
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm text-gray-400 mb-1">Instruksi Pengiriman</label>
            <textarea value={form.instruksi_pengiriman} onChange={e => updateForm('instruksi_pengiriman', e.target.value)} className="input-field" rows={2} />
          </div>
        </div>

        {/* Order Items */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Order Items</h3>
            <button type="button" onClick={addItem} className="btn-secondary flex items-center gap-1">
              <Plus size={16} /> Add Item
            </button>
          </div>
          <div className="space-y-3">
            {items.map((item, idx) => (
              <div key={idx} className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                <div className="flex items-start justify-between mb-3">
                  <span className="text-sm text-gray-400">Item #{idx + 1}</span>
                  {items.length > 1 && (
                    <button type="button" onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-300">
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="md:col-span-2">
                    <label className="block text-xs text-gray-500 mb-1">Nama Produk *</label>
                    <input
                      value={item.nama_produk}
                      onChange={e => updateItem(idx, 'nama_produk', e.target.value)}
                      className="input-field"
                      list={`products-${idx}`}
                      required
                    />
                    <datalist id={`products-${idx}`}>
                      {products.map(p => (
                        <option key={p.id} value={p.nama_produk} />
                      ))}
                    </datalist>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">SKU</label>
                    <input value={item.sku} onChange={e => updateItem(idx, 'sku', e.target.value)} className="input-field" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Qty</label>
                    <input type="number" min="1" value={item.qty} onChange={e => updateItem(idx, 'qty', e.target.value)} className="input-field" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Harga</label>
                    <input type="number" value={item.harga_setelah_diskon} onChange={e => updateItem(idx, 'harga_setelah_diskon', e.target.value)} className="input-field" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Jasa Kirim *</label>
                    <select value={item.jasa_pengiriman} onChange={e => updateItem(idx, 'jasa_pengiriman', e.target.value)} className="input-field" required>
                      <option value="">Pilih...</option>
                      {services.filter(s => s.is_active).map(s => (
                        <option key={s.code} value={s.code}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Berat (kg)</label>
                    <input type="number" step="0.01" value={item.berat_kg} onChange={e => updateItem(idx, 'berat_kg', e.target.value)} className="input-field" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Totals */}
        <div className="card">
          <div className="flex justify-end">
            <div className="w-72 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Subtotal</span>
                <span>{new Intl.NumberFormat('id-ID').format(totalBelanja)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Ongkir</span>
                <span>{new Intl.NumberFormat('id-ID').format(ongkir)}</span>
              </div>
              {penanganan > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Penanganan (3%)</span>
                  <span>{new Intl.NumberFormat('id-ID').format(penanganan)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold border-t border-gray-700 pt-2">
                <span>Total</span>
                <span className="text-indigo-400">{new Intl.NumberFormat('id-ID').format(grandTotal)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => navigate('/')} className="btn-secondary">Cancel</button>
          <button type="submit" className="btn-primary flex items-center gap-2" disabled={loading}>
            <Save size={16} />
            {loading ? 'Saving...' : editId ? 'Update Order' : 'Create Order'}
          </button>
        </div>
      </form>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Search, Edit, X, Save } from 'lucide-react';

export default function CustomerManagement() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [editCustomer, setEditCustomer] = useState(null);
  const [editForm, setEditForm] = useState({});

  useEffect(() => { loadCustomers(); }, [search]);

  async function loadCustomers() {
    setLoading(true);
    try {
      const data = await api.getCustomers({ search, limit: 100 });
      setCustomers(data.customers || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function startEdit(c) {
    setEditCustomer(c.id);
    setEditForm({ nama: c.nama, no_telepon: c.no_telepon, alamat: c.alamat, provinsi: c.provinsi || '', kota_kab: c.kota_kab || '', kecamatan: c.kecamatan || '', kode_pos: c.kode_pos || '', email: c.email || '', notes: c.notes || '' });
  }

  async function saveEdit(id) {
    try {
      await api.updateCustomer(id, editForm);
      setEditCustomer(null);
      loadCustomers();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Customer Management</h2>
        <div className="flex gap-2">
          <input placeholder="Search customers..." value={search} onChange={e => setSearch(e.target.value)} className="input-field w-64" />
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left py-3 px-2 text-gray-400">Name</th>
              <th className="text-left py-3 px-2 text-gray-400">Phone</th>
              <th className="text-left py-3 px-2 text-gray-400">Address</th>
              <th className="text-center py-3 px-2 text-gray-400">Orders</th>
              <th className="text-left py-3 px-2 text-gray-400">Last Order</th>
              <th className="text-center py-3 px-2 text-gray-400">Actions</th>
            </tr>
          </thead>
          <tbody>
            {customers.map(c => (
              <tr key={c.id} className="border-b border-gray-800/50">
                {editCustomer === c.id ? (
                  <>
                    <td className="py-2 px-2"><input value={editForm.nama} onChange={e => setEditForm({...editForm, nama: e.target.value})} className="input-field" /></td>
                    <td className="py-2 px-2"><input value={editForm.no_telepon} onChange={e => setEditForm({...editForm, no_telepon: e.target.value})} className="input-field" /></td>
                    <td className="py-2 px-2"><input value={editForm.alamat} onChange={e => setEditForm({...editForm, alamat: e.target.value})} className="input-field" /></td>
                    <td className="py-2 px-2 text-center">{c.total_orders}</td>
                    <td className="py-2 px-2 text-gray-400">{c.last_order_date?.slice(0, 10)}</td>
                    <td className="py-2 px-2 text-center">
                      <div className="flex gap-1 justify-center">
                        <button onClick={() => saveEdit(c.id)} className="text-green-400 hover:text-green-300"><Save size={16} /></button>
                        <button onClick={() => setEditCustomer(null)} className="text-gray-400 hover:text-gray-300"><X size={16} /></button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="py-2 px-2">{c.nama}</td>
                    <td className="py-2 px-2 text-gray-400">{c.no_telepon}</td>
                    <td className="py-2 px-2 text-gray-400 max-w-xs truncate">{c.alamat}</td>
                    <td className="py-2 px-2 text-center">{c.total_orders}</td>
                    <td className="py-2 px-2 text-gray-400">{c.last_order_date?.slice(0, 10) || '-'}</td>
                    <td className="py-2 px-2 text-center">
                      <button onClick={() => startEdit(c)} className="text-indigo-400 hover:text-indigo-300"><Edit size={16} /></button>
                    </td>
                  </>
                )}
              </tr>
            ))}
            {customers.length === 0 && (
              <tr><td colSpan={6} className="py-8 text-center text-gray-500">No customers found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

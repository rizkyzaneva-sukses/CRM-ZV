import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { CheckCircle, XCircle, DollarSign } from 'lucide-react';
import StatusBadge from '../components/ui/StatusBadge';

function formatCurrency(n) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n || 0);
}

export default function FinanceApproval() {
  const [orders, setOrders] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadOrders(); }, []);

  async function loadOrders() {
    setLoading(true);
    try {
      const data = await api.getOrders({ status: 'WAITING_FINANCE', limit: 100 });
      setOrders(data.orders || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  function toggleSelect(id) {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  async function handleBulkAction(action) {
    if (selected.length === 0) return alert('Select orders first');
    if (!confirm(`${action} ${selected.length} orders?`)) return;
    try {
      await api.bulkFinance(selected, action);
      setSelected([]);
      loadOrders();
    } catch (err) { alert(err.message); }
  }

  async function handleSingleAction(id, action) {
    try {
      await api.financeAction(id, action);
      loadOrders();
    } catch (err) { alert(err.message); }
  }

  const totalPending = orders.reduce((sum, o) => sum + parseFloat(o.total || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Finance Approval</h2>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <DollarSign size={16} className="text-yellow-400" />
            <span>{orders.length} pending | {formatCurrency(totalPending)}</span>
          </div>
        </div>
      </div>

      {selected.length > 0 && (
        <div className="flex gap-2">
          <button onClick={() => handleBulkAction('approve')} className="btn-primary flex items-center gap-2">
            <CheckCircle size={16} /> Approve Selected ({selected.length})
          </button>
          <button onClick={() => handleBulkAction('reject')} className="btn-danger flex items-center gap-2">
            <XCircle size={16} /> Reject Selected ({selected.length})
          </button>
        </div>
      )}

      <div className="card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="py-3 px-2 w-8"><input type="checkbox" onChange={e => setSelected(e.target.checked ? orders.map(o => o.id) : [])} /></th>
              <th className="text-left py-3 px-2 text-gray-400">Order #</th>
              <th className="text-left py-3 px-2 text-gray-400">Customer</th>
              <th className="text-left py-3 px-2 text-gray-400">Date</th>
              <th className="text-right py-3 px-2 text-gray-400">Total</th>
              <th className="text-left py-3 px-2 text-gray-400">Payment</th>
              <th className="text-center py-3 px-2 text-gray-400">Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map(o => (
              <tr key={o.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                <td className="py-3 px-2"><input type="checkbox" checked={selected.includes(o.id)} onChange={() => toggleSelect(o.id)} /></td>
                <td className="py-3 px-2 text-indigo-400">{o.order_number}</td>
                <td className="py-3 px-2">{o.nama_pemesan}</td>
                <td className="py-3 px-2 text-gray-400">{o.order_date?.slice(0, 10)}</td>
                <td className="py-3 px-2 text-right">{formatCurrency(o.total)}</td>
                <td className="py-3 px-2 text-gray-400">{o.metode_pembayaran || '-'}</td>
                <td className="py-3 px-2 text-center">
                  <div className="flex gap-1 justify-center">
                    <button onClick={() => handleSingleAction(o.id, 'approve')} className="text-green-400 hover:text-green-300 p-1" title="Approve">
                      <CheckCircle size={18} />
                    </button>
                    <button onClick={() => handleSingleAction(o.id, 'reject')} className="text-red-400 hover:text-red-300 p-1" title="Reject">
                      <XCircle size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr><td colSpan={7} className="py-8 text-center text-gray-500">No pending orders</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../App';
import { ArrowLeft, Edit, CheckCircle, XCircle, Printer } from 'lucide-react';
import StatusBadge from '../components/ui/StatusBadge';

function formatCurrency(n) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n || 0);
}

export default function OrderDetail() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('id');
  const { customRole } = useAuth();
  const [order, setOrder] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (orderId) loadOrder();
  }, [orderId]);

  async function loadOrder() {
    try {
      const data = await api.getOrder(orderId);
      setOrder(data.order);
      setItems(data.items || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleFinanceAction(action) {
    if (!confirm(`Are you sure you want to ${action} this order?`)) return;
    try {
      await api.financeAction(orderId, action);
      loadOrder();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="text-gray-500">Loading...</div></div>;
  if (!order) return <div className="text-center text-gray-500 py-20">Order not found</div>;

  const canFinance = ['OWNER', 'FINANCE'].includes(customRole) && order.finance_status === 'PENDING';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/')} className="btn-secondary flex items-center gap-2">
            <ArrowLeft size={16} /> Back
          </button>
          <div>
            <h2 className="text-xl font-semibold">{order.order_number}</h2>
            <span className="text-sm text-gray-400">{order.order_date?.slice(0, 10)}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <StatusBadge status={order.status_pesanan} />
          <span className={`badge ${order.jenis_transaksi === 'COD' ? 'badge-yellow' : 'badge-blue'}`}>{order.jenis_transaksi}</span>
        </div>
      </div>

      {/* Customer Info */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-3">Customer</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><span className="text-gray-400">Name:</span> {order.nama_pemesan}</div>
          <div><span className="text-gray-400">Phone:</span> {order.no_telepon}</div>
          <div className="col-span-2"><span className="text-gray-400">Address:</span> {order.alamat}</div>
          <div><span className="text-gray-400">Province:</span> {order.provinsi}</div>
          <div><span className="text-gray-400">City:</span> {order.kota_kab}</div>
          <div><span className="text-gray-400">District:</span> {order.kecamatan}</div>
          <div><span className="text-gray-400">Postal Code:</span> {order.kode_pos}</div>
        </div>
      </div>

      {/* Items */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-3">Items</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left py-2 text-gray-400">Product</th>
              <th className="text-left py-2 text-gray-400">SKU</th>
              <th className="text-center py-2 text-gray-400">Qty</th>
              <th className="text-right py-2 text-gray-400">Price</th>
              <th className="text-right py-2 text-gray-400">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id} className="border-b border-gray-800/50">
                <td className="py-2">{item.nama_produk}</td>
                <td className="py-2 text-gray-400">{item.sku}</td>
                <td className="py-2 text-center">{item.qty}</td>
                <td className="py-2 text-right">{formatCurrency(item.harga_setelah_diskon)}</td>
                <td className="py-2 text-right">{formatCurrency(item.subtotal_item)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="card">
        <div className="flex justify-end">
          <div className="w-72 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-400">Subtotal</span><span>{formatCurrency(order.total_belanja)}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Ongkir</span><span>{formatCurrency(order.ongkir)}</span></div>
            {parseFloat(order.penanganan) > 0 && (
              <div className="flex justify-between"><span className="text-gray-400">Penanganan</span><span>{formatCurrency(order.penanganan)}</span></div>
            )}
            <div className="flex justify-between text-lg font-bold border-t border-gray-700 pt-2">
              <span>Total</span><span className="text-indigo-400">{formatCurrency(order.total)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Shipping & Resi */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-3">Shipping</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><span className="text-gray-400">Service:</span> {order.jasa_pengiriman}</div>
          <div><span className="text-gray-400">Resi:</span> <span className="font-mono">{order.no_resi || '-'}</span></div>
          {order.instruksi_pengiriman && <div className="col-span-2"><span className="text-gray-400">Instructions:</span> {order.instruksi_pengiriman}</div>}
        </div>
      </div>

      {/* Finance Info */}
      {order.finance_status && (
        <div className="card">
          <h3 className="text-lg font-semibold mb-3">Finance</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-gray-400">Status:</span> <span className={`badge ${order.finance_status === 'APPROVED' ? 'badge-green' : order.finance_status === 'REJECTED' ? 'badge-red' : 'badge-yellow'}`}>{order.finance_status}</span></div>
            <div><span className="text-gray-400">Verified by:</span> {order.finance_verified_by || '-'}</div>
            <div><span className="text-gray-400">Verified at:</span> {order.finance_verified_at ? new Date(order.finance_verified_at).toLocaleString('id-ID') : '-'}</div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        {canFinance && (
          <>
            <button onClick={() => handleFinanceAction('approve')} className="btn-primary flex items-center gap-2">
              <CheckCircle size={16} /> Approve
            </button>
            <button onClick={() => handleFinanceAction('reject')} className="btn-danger flex items-center gap-2">
              <XCircle size={16} /> Reject
            </button>
          </>
        )}
        <button onClick={() => navigate(`/InputOrder?edit=${orderId}`)} className="btn-secondary flex items-center gap-2">
          <Edit size={16} /> Edit
        </button>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Package, DollarSign, Clock, Truck, CheckCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import StatusBadge from '../components/ui/StatusBadge';
import { useNavigate } from 'react-router-dom';

const COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#06b6d4'];

function formatCurrency(n) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n || 0);
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [salesData, setSalesData] = useState([]);
  const [statusData, setStatusData] = useState([]);
  const [shippingData, setShippingData] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      const [s, sales, status, shipping, ord] = await Promise.all([
        api.getDashboardStats(),
        api.getSalesChart('daily'),
        api.getStatusDistribution(),
        api.getShippingPerformance(),
        api.getOrders({ limit: 20 }),
      ]);
      setStats(s);
      setSalesData(sales.data || []);
      setStatusData(status.data || []);
      setShippingData(shipping.data || []);
      setOrders(ord.orders || []);
    } catch (err) {
      console.error('Dashboard error:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="text-gray-500">Loading...</div></div>;

  const statCards = [
    { title: 'Total Orders', value: stats?.total_orders || 0, icon: Package, color: 'text-indigo-400' },
    { title: 'Total Revenue', value: formatCurrency(stats?.total_revenue), icon: DollarSign, color: 'text-green-400' },
    { title: 'Pending Finance', value: stats?.pending_finance || 0, icon: Clock, color: 'text-yellow-400' },
    { title: 'Ready to Process', value: stats?.ready_to_process || 0, icon: Truck, color: 'text-blue-400' },
    { title: 'Resi Updated', value: stats?.resi_updated || 0, icon: CheckCircle, color: 'text-emerald-400' },
  ];

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {statCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div key={i} className="card">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">{card.title}</span>
                <Icon size={20} className={card.color} />
              </div>
              <div className="text-2xl font-bold">{card.value}</div>
            </div>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Sales (Last 30 Days)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={salesData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3e" />
              <XAxis dataKey="date" tick={{ fill: '#9ca3af', fontSize: 11 }} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid #2a2a3e' }} />
              <Bar dataKey="revenue" fill="#6366f1" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Order Status Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={statusData} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={80} label>
                {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid #2a2a3e' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Orders Table */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Recent Orders</h3>
          <div className="flex gap-2">
            <input
              placeholder="Search orders..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input-field w-64"
            />
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input-field w-40">
              <option value="">All Status</option>
              <option value="DRAFT">Draft</option>
              <option value="WAITING_FINANCE">Waiting Finance</option>
              <option value="READY_TO_PROCESS">Ready to Process</option>
              <option value="RESI_UPDATED">Resi Updated</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left py-3 px-2 text-gray-400 font-medium">Order #</th>
                <th className="text-left py-3 px-2 text-gray-400 font-medium">Customer</th>
                <th className="text-left py-3 px-2 text-gray-400 font-medium">Date</th>
                <th className="text-left py-3 px-2 text-gray-400 font-medium">Type</th>
                <th className="text-left py-3 px-2 text-gray-400 font-medium">Shipping</th>
                <th className="text-right py-3 px-2 text-gray-400 font-medium">Total</th>
                <th className="text-left py-3 px-2 text-gray-400 font-medium">Status</th>
                <th className="text-left py-3 px-2 text-gray-400 font-medium">Resi</th>
              </tr>
            </thead>
            <tbody>
              {orders.filter(o => {
                if (search && !o.nama_pemesan?.toLowerCase().includes(search.toLowerCase()) && !o.order_number?.toLowerCase().includes(search.toLowerCase())) return false;
                if (statusFilter && o.status_pesanan !== statusFilter) return false;
                return true;
              }).map(order => (
                <tr key={order.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 cursor-pointer" onClick={() => navigate(`/OrderDetail?id=${order.id}`)}>
                  <td className="py-3 px-2 text-indigo-400">{order.order_number}</td>
                  <td className="py-3 px-2">{order.nama_pemesan}</td>
                  <td className="py-3 px-2 text-gray-400">{order.order_date?.slice(0, 10)}</td>
                  <td className="py-3 px-2"><span className={`badge ${order.jenis_transaksi === 'COD' ? 'badge-yellow' : 'badge-blue'}`}>{order.jenis_transaksi}</span></td>
                  <td className="py-3 px-2 text-gray-400">{order.jasa_pengiriman}</td>
                  <td className="py-3 px-2 text-right">{formatCurrency(order.total)}</td>
                  <td className="py-3 px-2"><StatusBadge status={order.status_pesanan} /></td>
                  <td className="py-3 px-2 text-gray-400 font-mono text-xs">{order.no_resi || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

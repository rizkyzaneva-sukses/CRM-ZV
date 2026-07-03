import React, { useState } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileText } from 'lucide-react';
import { format } from 'date-fns';

export default function ExportCenter({ orders }) {
  const [exportFilter, setExportFilter] = useState('all');

  const getFilteredOrders = () => {
    switch (exportFilter) {
      case 'with-resi':
        return orders.filter(o => o.no_resi);
      case 'without-resi':
        return orders.filter(o => !o.no_resi);
      case 'ready-to-ship':
        return orders.filter(o => o.status_pesanan === 'READY_TO_PROCESS' && o.no_resi);
      default:
        return orders;
    }
  };

  const handleExportCSV = () => {
    const filteredOrders = getFilteredOrders();
    if (filteredOrders.length === 0) {
      alert('Tidak ada data untuk diexport');
      return;
    }

    const csvHeaders = [
      'No Order',
      'Tanggal',
      'Nama Pemesan',
      'No Telepon',
      'Alamat',
      'Kota/Kab',
      'Jasa Pengiriman',
      'Total',
      'Status',
      'No Resi'
    ].join(',');

    const csvRows = filteredOrders.map(order => [
      order.order_number || '',
      order.order_date || '',
      order.nama_pemesan || '',
      order.no_telepon || '',
      `"${(order.alamat || '').replace(/"/g, '""')}"`,
      order.kota_kab || '',
      order.jasa_pengiriman || '',
      order.total || 0,
      order.status_pesanan || '',
      order.no_resi || ''
    ].join(','));

    const csv = [csvHeaders, ...csvRows].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventori_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredOrders = getFilteredOrders();

  return (
    <div className="space-y-4">
      <Card className="bg-card border border-border p-6 space-y-4">
        <h3 className="text-foreground font-semibold">Filter Export</h3>
        
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { id: 'all', label: 'Semua Order', count: orders.length },
            { id: 'with-resi', label: 'Dengan Resi', count: orders.filter(o => o.no_resi).length },
            { id: 'without-resi', label: 'Tanpa Resi', count: orders.filter(o => !o.no_resi).length },
            { id: 'ready-to-ship', label: 'Siap Kirim', count: orders.filter(o => o.status_pesanan === 'READY_TO_PROCESS' && o.no_resi).length }
          ].map(filter => (
            <button
              key={filter.id}
              onClick={() => setExportFilter(filter.id)}
              className={`p-3 rounded-lg text-center transition ${
                exportFilter === filter.id
                  ? 'bg-blue-600 text-white border border-blue-500'
                  : 'bg-card border border-border text-muted-foreground hover:border-[#3A5A7A]'
              }`}
            >
              <p className="font-semibold">{filter.label}</p>
              <p className="text-sm opacity-75">{filter.count} order</p>
            </button>
          ))}
        </div>

        <Button
          onClick={handleExportCSV}
          disabled={filteredOrders.length === 0}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <Download className="w-4 h-4 mr-2" />
          Export CSV ({filteredOrders.length} order)
        </Button>
      </Card>

      <Card className="bg-card border border-border p-6">
        <h3 className="text-foreground font-semibold mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Preview Data Export
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-muted-foreground">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-2">Order</th>
                <th className="text-left p-2">Penerima</th>
                <th className="text-left p-2">Jasa</th>
                <th className="text-left p-2">Status</th>
                <th className="text-left p-2">Resi</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.slice(0, 5).map(order => (
                <tr key={order.id} className="border-b border-border hover:bg-card">
                  <td className="p-2 text-foreground">{order.order_number}</td>
                  <td className="p-2">{order.nama_pemesan}</td>
                  <td className="p-2">{order.jasa_pengiriman}</td>
                  <td className="p-2">{order.status_pesanan}</td>
                  <td className="p-2 font-mono text-blue-400">{order.no_resi || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredOrders.length > 5 && (
          <p className="text-muted-foreground text-center mt-4 text-sm">
            +{filteredOrders.length - 5} order lainnya akan diexport
          </p>
        )}
      </Card>
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Printer, RefreshCw } from 'lucide-react';
import StatusBadge from '../components/ui/StatusBadge';

export default function PrintResi() {
  const [orders, setOrders] = useState([]);
  const [selected, setSelected] = useState([]);
  const [tab, setTab] = useState('sap-jnt');
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadOrders(); }, [tab]);

  async function loadOrders() {
    setLoading(true);
    try {
      let filter = {};
      if (tab === 'sap-jnt') {
        filter = { status: 'RESI_UPDATED' };
      } else {
        filter = { status: 'READY_TO_PROCESS' };
      }
      const data = await api.getOrders(filter);
      setOrders(data.orders || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function toggleSelect(id) {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  function selectAll() {
    setSelected(orders.map(o => o.id));
  }

  function generateAutoResi(order) {
    const ts = Date.now().toString().slice(-6);
    const prefix = (order.jasa_pengiriman || 'EXP').toUpperCase().slice(0, 3).replace(/\s/g, '');
    return `${prefix}${ts}${Math.floor(Math.random() * 900 + 100)}`;
  }

  async function handlePrint() {
    if (selected.length === 0) {
      alert('Select orders to print');
      return;
    }

    const selectedOrders = orders.filter(o => selected.includes(o.id));

    // For other couriers, auto-generate resi if missing
    if (tab === 'other') {
      const updates = [];
      for (const o of selectedOrders) {
        if (!o.no_resi) {
          const resi = generateAutoResi(o);
          updates.push({ order_id: o.id, no_resi: resi });
          o.no_resi = resi;
        }
      }
      if (updates.length > 0) {
        await api.bulkResi(updates);
      }
    }

    // Build print HTML
    const labels = selectedOrders.map(o => `
      <div style="width:105mm;height:148mm;padding:5mm;border:1px solid #000;page-break-after:always;font-family:Arial,sans-serif;">
        <div style="text-align:center;font-weight:bold;font-size:14pt;margin-bottom:3mm;">ZANEVA</div>
        <div style="font-size:10pt;margin-bottom:2mm;"><strong>Order:</strong> ${o.order_number}</div>
        <div style="font-size:10pt;margin-bottom:2mm;"><strong>Resi:</strong> ${o.no_resi || '-'}</div>
        <div style="border-top:1px solid #000;padding-top:2mm;margin-top:2mm;">
          <div style="font-size:11pt;font-weight:bold;margin-bottom:1mm;">${o.nama_pemesan}</div>
          <div style="font-size:9pt;color:#333;">${o.alamat}</div>
          <div style="font-size:9pt;color:#333;">${o.kecamatan || ''}, ${o.kota_kab || ''}, ${o.provinsi || ''}</div>
          <div style="font-size:9pt;color:#333;">${o.no_telepon}</div>
          ${o.kode_pos ? `<div style="font-size:9pt;">Kode Pos: ${o.kode_pos}</div>` : ''}
        </div>
        <div style="margin-top:3mm;font-size:9pt;"><strong>${o.jasa_pengiriman?.toUpperCase()}</strong> | ${o.jenis_transaksi}</div>
        ${o.instruksi_pengiriman ? `<div style="font-size:8pt;color:#666;margin-top:1mm;">${o.instruksi_pengiriman}</div>` : ''}
        <div style="margin-top:auto;text-align:center;padding-top:3mm;">
          <svg id="barcode-${o.id}"></svg>
        </div>
      </div>
    `).join('');

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html><head><title>Print Resi</title>
      <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"></script>
      <style>body{margin:0;padding:0;}@media print{body{margin:0;}}</style>
      </head><body>${labels}
      <script>
        ${selectedOrders.map(o => `JsBarcode("#barcode-${o.id}", "${o.no_resi || o.order_number}", {format:"CODE128",width:2,height:50,fontSize:12,displayValue:true});`).join('\n')}
        setTimeout(function(){window.print();},500);
      </script>
      </body></html>
    `);
    printWindow.document.close();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Print Resi</h2>
        <div className="flex gap-2">
          <button onClick={() => setTab('sap-jnt')} className={tab === 'sap-jnt' ? 'btn-primary' : 'btn-secondary'}>SAP & J&T</button>
          <button onClick={() => setTab('other')} className={tab === 'other' ? 'btn-primary' : 'btn-secondary'}>Other Couriers</button>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-2">
            <button onClick={selectAll} className="btn-secondary text-xs">Select All</button>
            <button onClick={() => setSelected([])} className="btn-secondary text-xs">Deselect</button>
          </div>
          <div className="flex gap-2">
            <button onClick={loadOrders} className="btn-secondary flex items-center gap-1"><RefreshCw size={14} /></button>
            <button onClick={handlePrint} className="btn-primary flex items-center gap-2">
              <Printer size={16} /> Print ({selected.length})
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="py-3 px-2 w-8"></th>
                <th className="text-left py-3 px-2 text-gray-400">Order #</th>
                <th className="text-left py-3 px-2 text-gray-400">Customer</th>
                <th className="text-left py-3 px-2 text-gray-400">Shipping</th>
                <th className="text-left py-3 px-2 text-gray-400">Resi</th>
                <th className="text-left py-3 px-2 text-gray-400">Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(o => (
                <tr key={o.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="py-3 px-2">
                    <input type="checkbox" checked={selected.includes(o.id)} onChange={() => toggleSelect(o.id)} />
                  </td>
                  <td className="py-3 px-2 text-indigo-400">{o.order_number}</td>
                  <td className="py-3 px-2">{o.nama_pemesan}</td>
                  <td className="py-3 px-2 text-gray-400">{o.jasa_pengiriman}</td>
                  <td className="py-3 px-2 font-mono text-xs">{o.no_resi || '-'}</td>
                  <td className="py-3 px-2"><StatusBadge status={o.status_pesanan} /></td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr><td colSpan={6} className="py-8 text-center text-gray-500">No orders available for printing</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

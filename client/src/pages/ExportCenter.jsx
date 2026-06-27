import React, { useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../App';
import { Download, FileSpreadsheet } from 'lucide-react';

function downloadCSV(data, filename) {
  if (!data || data.length === 0) return;
  const headers = Object.keys(data[0]);
  const csv = [
    headers.join(','),
    ...data.map(row => headers.map(h => {
      const val = row[h];
      if (typeof val === 'string' && (val.includes(',') || val.includes('"'))) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val ?? '';
    }).join(','))
  ].join('\n');

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ExportCenter() {
  const { customRole } = useAuth();
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [loading, setLoading] = useState('');

  async function handleExport(type) {
    setLoading(type);
    try {
      let data;
      const params = {};
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;

      if (type === 'sap') {
        const res = await api.exportSAP(params);
        data = res.data;
      } else if (type === 'jnt') {
        const res = await api.exportJNT(params);
        data = res.data;
      } else {
        const res = await api.exportCRM();
        data = res.data;
      }

      if (data && data.length > 0) {
        downloadCSV(data, `export_${type}_${new Date().toISOString().slice(0, 10)}.csv`);
      } else {
        alert('No data to export');
      }
    } catch (err) {
      alert('Export error: ' + err.message);
    } finally {
      setLoading('');
    }
  }

  const showDateFilter = ['OWNER', 'FINANCE', 'INVENTORI'].includes(customRole);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h2 className="text-xl font-semibold">Export Center</h2>

      {showDateFilter && (
        <div className="card">
          <h3 className="text-sm font-medium text-gray-400 mb-3">Date Filter (optional)</h3>
          <div className="flex gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">From</label>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">To</label>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="input-field" />
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button onClick={() => handleExport('sap')} disabled={loading === 'sap'} className="card hover:border-indigo-600 transition-colors cursor-pointer text-left">
          <FileSpreadsheet size={32} className="text-indigo-400 mb-3" />
          <h3 className="font-semibold mb-1">SAP Template</h3>
          <p className="text-xs text-gray-400">Export orders in SAP Express format (27 columns)</p>
          <div className="mt-3 flex items-center gap-1 text-sm text-indigo-400">
            <Download size={14} /> {loading === 'sap' ? 'Exporting...' : 'Download CSV'}
          </div>
        </button>

        <button onClick={() => handleExport('jnt')} disabled={loading === 'jnt'} className="card hover:border-indigo-600 transition-colors cursor-pointer text-left">
          <FileSpreadsheet size={32} className="text-yellow-400 mb-3" />
          <h3 className="font-semibold mb-1">J&T Template</h3>
          <p className="text-xs text-gray-400">Export orders in J&T Express format (32 columns)</p>
          <div className="mt-3 flex items-center gap-1 text-sm text-indigo-400">
            <Download size={14} /> {loading === 'jnt' ? 'Exporting...' : 'Download CSV'}
          </div>
        </button>

        <button onClick={() => handleExport('crm')} disabled={loading === 'crm'} className="card hover:border-indigo-600 transition-colors cursor-pointer text-left">
          <FileSpreadsheet size={32} className="text-green-400 mb-3" />
          <h3 className="font-semibold mb-1">CRM Import</h3>
          <p className="text-xs text-gray-400">Export all orders for CRM import</p>
          <div className="mt-3 flex items-center gap-1 text-sm text-indigo-400">
            <Download size={14} /> {loading === 'crm' ? 'Exporting...' : 'Download CSV'}
          </div>
        </button>
      </div>
    </div>
  );
}

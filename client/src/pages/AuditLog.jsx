import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';

export default function AuditLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadLogs(); }, []);

  async function loadLogs() {
    setLoading(true);
    try {
      const data = await api.getAuditLogs({ limit: 100 });
      setLogs(data.logs || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  const statusColor = { SUCCESS: 'badge-green', PARTIAL: 'badge-yellow', FAILED: 'badge-red' };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Audit Log</h2>
      <div className="card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left py-3 px-2 text-gray-400">Time</th>
              <th className="text-left py-3 px-2 text-gray-400">Action</th>
              <th className="text-left py-3 px-2 text-gray-400">Entity</th>
              <th className="text-left py-3 px-2 text-gray-400">Status</th>
              <th className="text-right py-3 px-2 text-gray-400">Records</th>
              <th className="text-left py-3 px-2 text-gray-400">By</th>
            </tr>
          </thead>
          <tbody>
            {logs.map(log => (
              <tr key={log.id} className="border-b border-gray-800/50">
                <td className="py-3 px-2 text-gray-400">{new Date(log.created_at).toLocaleString('id-ID')}</td>
                <td className="py-3 px-2 font-mono text-xs">{log.action}</td>
                <td className="py-3 px-2 text-gray-400">{log.entity_name}</td>
                <td className="py-3 px-2"><span className={`badge ${statusColor[log.status] || 'badge-gray'}`}>{log.status}</span></td>
                <td className="py-3 px-2 text-right">
                  {log.success_count != null && <span className="text-green-400">{log.success_count}</span>}
                  {log.failed_count > 0 && <span className="text-red-400"> / {log.failed_count} failed</span>}
                  {log.skipped_count > 0 && <span className="text-gray-400"> / {log.skipped_count} skipped</span>}
                </td>
                <td className="py-3 px-2 text-gray-400">{log.performed_by || '-'}</td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr><td colSpan={6} className="py-8 text-center text-gray-500">No audit logs</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

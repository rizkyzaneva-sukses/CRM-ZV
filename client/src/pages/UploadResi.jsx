import React, { useState } from 'react';
import { api } from '../lib/api';
import { Upload, CheckCircle, AlertTriangle } from 'lucide-react';

export default function UploadResi() {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleUpload() {
    if (!file) return;
    setLoading(true);
    try {
      const res = await api.uploadFile('resi', file);
      setResult(res);
    } catch (err) {
      alert('Upload error: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h2 className="text-xl font-semibold">Upload Resi</h2>
      <div className="card">
        <p className="text-sm text-gray-400 mb-4">Upload Excel file with columns: <code>no_waybill</code> and <code>penerima</code>. Orders will be matched by recipient name.</p>
        <div className="flex items-center gap-4">
          <input type="file" accept=".xlsx,.xls,.csv" onChange={e => setFile(e.target.files[0])} className="text-sm text-gray-400" />
          <button onClick={handleUpload} className="btn-primary flex items-center gap-2" disabled={!file || loading}>
            <Upload size={16} /> {loading ? 'Uploading...' : 'Upload & Match'}
          </button>
        </div>
      </div>

      {result && (
        <div className="card space-y-4">
          <h3 className="text-lg font-semibold">Results</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-green-900/20 border border-green-800 rounded-lg p-4">
              <div className="flex items-center gap-2 text-green-400 mb-1"><CheckCircle size={18} /> Matched</div>
              <div className="text-2xl font-bold">{result.matched}</div>
            </div>
            <div className="bg-yellow-900/20 border border-yellow-800 rounded-lg p-4">
              <div className="flex items-center gap-2 text-yellow-400 mb-1"><AlertTriangle size={18} /> Unmatched</div>
              <div className="text-2xl font-bold">{result.unmatched}</div>
            </div>
          </div>

          {result.unmatchedData && result.unmatchedData.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-400 mb-2">Unmatched Entries</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-800">
                      <th className="text-left py-2 text-gray-400">No Waybill</th>
                      <th className="text-left py-2 text-gray-400">Penerima</th>
                      <th className="text-left py-2 text-gray-400">Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.unmatchedData.map((u, i) => (
                      <tr key={i} className="border-b border-gray-800/50">
                        <td className="py-2 font-mono">{u.no_waybill}</td>
                        <td className="py-2">{u.penerima}</td>
                        <td className="py-2 text-yellow-400">{u.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

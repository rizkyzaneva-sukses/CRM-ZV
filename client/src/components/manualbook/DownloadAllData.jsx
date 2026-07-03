import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Download, Loader2, FileJson, FileSpreadsheet, Lock, Database } from 'lucide-react';

const ENTITY_CONFIG = [
  { name: 'Order', label: 'Order / Pesanan', icon: '🛒' },
  { name: 'OrderItem', label: 'Order Items / Detail Produk', icon: '📦' },
  { name: 'Product', label: 'Product / Produk', icon: '🏷️' },
  { name: 'Customer', label: 'Customer / Pelanggan', icon: '👥' },
  { name: 'ShippingService', label: 'Shipping Service / Jasa Pengiriman', icon: '🚚' },
  { name: 'KecamatanSAP', label: 'Kecamatan SAP', icon: '📍' },
  { name: 'KecamatanJNT', label: 'Kecamatan J&T', icon: '📍' },
  { name: 'AuditLog', label: 'Audit Log', icon: '📝' },
  { name: 'PrintLog', label: 'Print Log', icon: '🖨️' },
  { name: 'ResiImportException', label: 'Resi Import Exception', icon: '⚠️' },
];

function convertToCSV(data) {
  if (!data || data.length === 0) return '';
  const keys = Object.keys(data[0]);
  const header = keys.join(',');
  const rows = data.map(row =>
    keys.map(key => {
      const val = row[key];
      if (val === null || val === undefined) return '';
      const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
      // Escape quotes and wrap in quotes if contains comma, quote, or newline
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    }).join(',')
  );
  return [header, ...rows].join('\n');
}

function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const PAGE_SIZE = 100000;

async function fetchAllRecords(entityName) {
  try {
    let result = [];
    if (entityName === 'Order') {
      const data = await api.getOrders({ limit: PAGE_SIZE });
      result = data.orders || [];
    } else if (entityName === 'Product') {
      const data = await api.getProducts({ limit: PAGE_SIZE });
      result = data.products || [];
    } else if (entityName === 'Customer') {
      const data = await api.getCustomers({ limit: PAGE_SIZE });
      result = data.customers || [];
    } else if (entityName === 'ShippingService') {
      result = await api.getShippingServices();
    } else if (entityName === 'KecamatanSAP') {
      const data = await api.getSapKecamatans({ limit: PAGE_SIZE });
      result = data.data || [];
    } else if (entityName === 'KecamatanJNT') {
      const data = await api.getJntKecamatans({ limit: PAGE_SIZE });
      result = data.data || [];
    } else {
      // Return empty array for unsupported entities for now
      result = [];
    }
    return result;
  } catch (error) {
    console.error(`Failed to fetch ${entityName}:`, error);
    return [];
  }
}

export default function DownloadAllData({ customRole }) {
  const [downloading, setDownloading] = useState(null);
  const [progress, setProgress] = useState({ current: 0, total: 0, entity: '' });
  const [counts, setCounts] = useState({});
  const [loadingCounts, setLoadingCounts] = useState(false);

  const isOwner = customRole === 'OWNER';

  React.useEffect(() => {
    if (!isOwner) return;
    const fetchCounts = async () => {
      setLoadingCounts(true);
      const result = {};
      for (const cfg of ENTITY_CONFIG) {
        try {
          const data = await fetchAllRecords(cfg.name);
          result[cfg.name] = data ? data.length : 0;
        } catch (err) {
          result[cfg.name] = 0;
        }
      }
      setCounts(result);
      setLoadingCounts(false);
    };
    fetchCounts();
  }, [isOwner]);

  const handleDownloadEntity = async (entityName, format) => {
    setDownloading(entityName);
    setProgress({ current: 0, total: 1, entity: entityName });
    try {
      const data = await fetchAllRecords(entityName);
      setProgress({ current: 1, total: 1, entity: entityName });

      if (!data || data.length === 0) {
        alert(`Tidak ada data untuk ${entityName}`);
        return;
      }

      const timestamp = new Date().toISOString().split('T')[0];

      if (format === 'json') {
        const jsonStr = JSON.stringify(data, null, 2);
        downloadFile(jsonStr, `${entityName}_${timestamp}.json`, 'application/json');
      } else {
        const csvStr = convertToCSV(data);
        downloadFile(csvStr, `${entityName}_${timestamp}.csv`, 'text/csv');
      }
    } catch (error) {
      alert(`Gagal download ${entityName}: ${error.message}`);
    } finally {
      setDownloading(null);
      setProgress({ current: 0, total: 0, entity: '' });
    }
  };

  const handleDownloadAll = async (format) => {
    setDownloading('ALL');
    setProgress({ current: 0, total: ENTITY_CONFIG.length, entity: '' });
    try {
      const timestamp = new Date().toISOString().split('T')[0];
      const allData = {};

      for (let i = 0; i < ENTITY_CONFIG.length; i++) {
        const cfg = ENTITY_CONFIG[i];
        setProgress({ current: i, total: ENTITY_CONFIG.length, entity: cfg.label });
        try {
          const data = await fetchAllRecords(cfg.name);
          allData[cfg.name] = data || [];
        } catch (err) {
          console.error(`Failed to fetch ${cfg.name}:`, err);
          allData[cfg.name] = [];
        }
      }

      setProgress({ current: ENTITY_CONFIG.length, total: ENTITY_CONFIG.length, entity: 'Finalizing' });

      if (format === 'json') {
        const jsonStr = JSON.stringify(allData, null, 2);
        downloadFile(jsonStr, `all_data_${timestamp}.json`, 'application/json');
      } else {
        // CSV: combine all entities into one file with category headers
        let csvContent = '';
        for (const cfg of ENTITY_CONFIG) {
          const data = allData[cfg.name];
          if (data && data.length > 0) {
            csvContent += `=== ${cfg.label} (${cfg.name}) ===\n`;
            csvContent += convertToCSV(data);
            csvContent += '\n\n';
          }
        }
        downloadFile(csvContent, `all_data_${timestamp}.csv`, 'text/csv');
      }

      alert(`✅ Download selesai! ${ENTITY_CONFIG.length} kategori data berhasil diexport.`);
    } catch (error) {
      alert(`Gagal download semua data: ${error.message}`);
    } finally {
      setDownloading(null);
      setProgress({ current: 0, total: 0, entity: '' });
    }
  };

  if (!isOwner) {
    return (
      <Card className="bg-card border border-red-500/30 p-8">
        <div className="flex flex-col items-center justify-center text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
            <Lock className="w-8 h-8 text-red-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-red-400">Akses Ditolak</h3>
            <p className="text-muted-foreground text-sm mt-2 max-w-md">
              Fitur Download Semua Data hanya tersedia untuk role <strong>OWNER</strong>.
              Hubungi Owner jika Anda memerlukan export data lengkap.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Download All Section */}
      <Card className="bg-card border border-emerald-500/30 p-6">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-12 h-12 rounded-lg bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
            <Database className="w-6 h-6 text-emerald-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-foreground">Download Semua Data Sekaligus</h3>
            <p className="text-muted-foreground text-sm mt-1">
              Download seluruh data dari semua kategori dalam satu file. Data akan tersusun rapi per kategori.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mt-4">
          <Button
            onClick={() => handleDownloadAll('json')}
            disabled={downloading !== null}
            className="bg-amber-600 hover:bg-amber-700 text-white flex-1"
          >
            {downloading === 'ALL' ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <FileJson className="w-4 h-4 mr-2" />
            )}
            Download Semua (JSON)
          </Button>
          <Button
            onClick={() => handleDownloadAll('csv')}
            disabled={downloading !== null}
            className="bg-emerald-600 hover:bg-emerald-700 text-white flex-1"
          >
            {downloading === 'ALL' ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <FileSpreadsheet className="w-4 h-4 mr-2" />
            )}
            Download Semua (CSV)
          </Button>
        </div>

        {downloading === 'ALL' && (
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Mengambil: {progress.entity}
              </span>
              <span className="text-emerald-400 font-semibold">
                {progress.current} / {progress.total}
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              />
            </div>
          </div>
        )}
      </Card>

      {/* Per-Entity Download */}
      <Card className="bg-card border border-border p-6">
        <h3 className="text-lg font-semibold text-foreground mb-1">Download Per Kategori</h3>
        <p className="text-muted-foreground text-sm mb-4">
          Pilih kategori data tertentu untuk didownload secara individual.
        </p>

        <div className="space-y-3">
          {ENTITY_CONFIG.map((cfg) => (
            <div
              key={cfg.name}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-card border border-border rounded-lg"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{cfg.icon}</span>
                <div>
                  <Label className="text-foreground text-sm font-medium cursor-pointer">
                    {cfg.label}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Entity: {cfg.name}
                    {loadingCounts ? (
                      <span className="ml-2 text-muted-foreground">…</span>
                    ) : (
                      <span className="ml-2 text-emerald-400 font-medium">
                        Total: {(counts[cfg.name] ?? 0).toLocaleString('id-ID')}
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDownloadEntity(cfg.name, 'json')}
                  disabled={downloading !== null}
                  className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                >
                  {downloading === cfg.name ? (
                    <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                  ) : (
                    <FileJson className="w-3.5 h-3.5 mr-1" />
                  )}
                  JSON
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDownloadEntity(cfg.name, 'csv')}
                  disabled={downloading !== null}
                  className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                >
                  {downloading === cfg.name ? (
                    <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                  ) : (
                    <FileSpreadsheet className="w-3.5 h-3.5 mr-1" />
                  )}
                  CSV
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="bg-amber-500/10 border border-amber-500/20 p-4">
        <div className="flex items-start gap-3">
          <Download className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-muted-foreground">
            <p className="font-semibold text-amber-400 mb-1">Catatan:</p>
            <ul className="space-y-1">
              <li>• Format JSON menyimpan seluruh struktur data asli (nested objects tetap utuh)</li>
              <li>• Format CSV lebih cocok untuk dibuka di Excel/Spreadsheet</li>
              <li>• "Download Semua" menggabungkan semua kategori dalam satu file</li>
              <li>• Data besar mungkin membutuhkan waktu beberapa detik untuk diproses</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}
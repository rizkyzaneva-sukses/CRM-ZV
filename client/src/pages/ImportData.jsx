import React, { useState, useCallback, useRef } from 'react';
import { api } from '../lib/api';
import {
  Upload, CheckCircle, AlertTriangle, Database, FileUp,
  X, ChevronDown, ChevronRight, Package, Users, ShoppingCart,
  Loader2, RotateCcw, Eye, EyeOff, Info
} from 'lucide-react';

const TAB_ICONS = {
  orders: ShoppingCart,
  products: Package,
  customers: Users,
};

export default function ImportData() {
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState(null);
  const [activeTab, setActiveTab] = useState(null);
  const [selections, setSelections] = useState({});
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showDetails, setShowDetails] = useState({});
  const fileInputRef = useRef(null);

  // Initialize selections from preview
  const initSelections = (data) => {
    const sel = {};
    for (const [type, items] of Object.entries(data)) {
      if (Array.isArray(items)) {
        sel[type] = items.map((item, idx) => !item._isDuplicate);
      }
    }
    setSelections(sel);
  };

  // Handle file drop or select
  const handleFile = useCallback(async (f) => {
    if (!f || !f.name.endsWith('.json')) {
      setError('Please select a JSON file');
      return;
    }
    setFile(f);
    setError(null);
    setPreview(null);
    setImportResult(null);
    setLoading(true);

    try {
      const result = await api.importPreview(f);
      const previewData = result.preview || result;
      setPreview(previewData);
      const dataTypes = Object.keys(previewData).filter(k => Array.isArray(previewData[k]));
      if (dataTypes.length > 0) setActiveTab(dataTypes[0]);
      initSelections(previewData);
    } catch (err) {
      setError(err.message || 'Failed to preview file');
    } finally {
      setLoading(false);
    }
  }, []);

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  const onFileSelect = (e) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  };

  // Toggle checkbox
  const toggleItem = (type, idx) => {
    setSelections(prev => ({
      ...prev,
      [type]: prev[type].map((v, i) => i === idx ? !v : v),
    }));
  };

  // Toggle all for a type
  const toggleAll = (type) => {
    const items = preview[type];
    const allSelected = selections[type]?.every(Boolean);
    setSelections(prev => ({
      ...prev,
      [type]: items.map(() => !allSelected),
    }));
  };

  // Toggle detail expansion
  const toggleDetail = (type, idx) => {
    const key = `${type}-${idx}`;
    setShowDetails(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Compute stats for a type
  const getStats = (type) => {
    if (!preview?.[type]) return { total: 0, newCount: 0, dupCount: 0, selected: 0 };
    const items = preview[type];
    const total = items.length;
    const dupCount = items.filter(i => i._isDuplicate).length;
    const newCount = total - dupCount;
    const selected = selections[type]?.filter(Boolean).length || 0;
    return { total, newCount, dupCount, selected };
  };

  // Get total stats across all types
  const getTotalStats = () => {
    if (!preview) return { total: 0, newCount: 0, dupCount: 0, selected: 0 };
    let total = 0, newCount = 0, dupCount = 0, selected = 0;
    for (const type of Object.keys(preview)) {
      if (!Array.isArray(preview[type])) continue;
      const s = getStats(type);
      total += s.total;
      newCount += s.newCount;
      dupCount += s.dupCount;
      selected += s.selected;
    }
    return { total, newCount, dupCount, selected };
  };

  // Import selected data
  const handleImport = async () => {
    const importData = {};
    let hasSelection = false;

    for (const type of Object.keys(preview)) {
      if (!Array.isArray(preview[type])) continue;
      const selArr = selections[type] || [];
      const selectedItems = preview[type]
        .filter((_, idx) => selArr[idx])
        .map(item => {
          const { _isDuplicate, _newId, duplicateOf, ...rest } = item;
          return rest;
        });
      if (selectedItems.length > 0) {
        importData[type] = selectedItems;
        hasSelection = true;
      }
    }

    if (!hasSelection) {
      setError('No items selected for import');
      return;
    }

    setImporting(true);
    setError(null);

    try {
      const result = await api.importConfirm(importData);
      setImportResult(result);
    } catch (err) {
      setError(err.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  // Reset everything
  const reset = () => {
    setFile(null);
    setPreview(null);
    setActiveTab(null);
    setSelections({});
    setImportResult(null);
    setError(null);
    setShowDetails({});
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Render item value
  const renderValue = (val) => {
    if (val === null || val === undefined) return <span className="text-gray-600">—</span>;
    if (typeof val === 'boolean') return val ? '✓' : '✗';
    if (typeof val === 'object') return JSON.stringify(val);
    return String(val);
  };

  const dataTypes = preview ? Object.keys(preview).filter(k => Array.isArray(preview[k])) : [];
  const totalStats = getTotalStats();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Import Data</h2>
        {preview && (
          <button onClick={reset} className="btn-secondary flex items-center gap-2 text-sm">
            <RotateCcw size={14} /> New Import
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-900/30 border border-red-800 rounded-lg p-4 flex items-center gap-3">
          <AlertTriangle size={18} className="text-red-400 flex-shrink-0" />
          <p className="text-red-300 text-sm">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-300">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Import Result */}
      {importResult && (
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <CheckCircle size={20} className="text-green-400" />
            <h3 className="text-lg font-medium">Import Complete</h3>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="bg-green-900/20 border border-green-800/50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-green-400">{importResult.totalImported || 0}</p>
              <p className="text-xs text-gray-400">Imported</p>
            </div>
            <div className="bg-yellow-900/20 border border-yellow-800/50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-yellow-400">{importResult.totalSkipped || 0}</p>
              <p className="text-xs text-gray-400">Skipped</p>
            </div>
            <div className="bg-red-900/20 border border-red-800/50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-red-400">{importResult.totalFailed || 0}</p>
              <p className="text-xs text-gray-400">Failed</p>
            </div>
          </div>

          {/* Per-type breakdown */}
          {importResult.results && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {Object.entries(importResult.results).map(([type, counts]) => {
                const total = (counts.success || 0) + (counts.skipped || 0) + (counts.failed || 0);
                if (total === 0) return null;
                return (
                  <div key={type} className="bg-gray-800 rounded-lg p-3">
                    <p className="text-sm text-gray-300 font-medium mb-2">{type}</p>
                    <div className="space-y-1 text-xs">
                      {counts.success > 0 && (
                        <div className="flex justify-between">
                          <span className="text-green-400">✓ Success</span>
                          <span>{counts.success}</span>
                        </div>
                      )}
                      {counts.skipped > 0 && (
                        <div className="flex justify-between">
                          <span className="text-yellow-400">⊘ Skipped</span>
                          <span>{counts.skipped}</span>
                        </div>
                      )}
                      {counts.failed > 0 && (
                        <div className="flex justify-between">
                          <span className="text-red-400">✗ Failed</span>
                          <span>{counts.failed}</span>
                        </div>
                      )}
                    </div>
                    {counts.errors && counts.errors.length > 0 && (
                      <p className="text-xs text-red-400 mt-2 truncate" title={counts.errors.join('\n')}>
                        {counts.errors.length} error(s)
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Upload Area */}
      {!preview && !loading && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`card cursor-pointer transition-all ${
            dragOver
              ? 'border-indigo-500 bg-indigo-900/10'
              : 'border-dashed border-gray-700 hover:border-gray-600'
          }`}
        >
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <div className={`p-4 rounded-xl ${dragOver ? 'bg-indigo-600/20' : 'bg-gray-800'}`}>
              <FileUp size={32} className={dragOver ? 'text-indigo-400' : 'text-gray-500'} />
            </div>
            <div className="text-center">
              <p className="text-gray-300 font-medium">
                {dragOver ? 'Drop your JSON file here' : 'Drag & drop a JSON file here'}
              </p>
              <p className="text-sm text-gray-500 mt-1">or click to browse</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={onFileSelect}
              className="hidden"
            />
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="card flex items-center justify-center py-16 gap-3">
          <Loader2 size={24} className="text-indigo-400 animate-spin" />
          <span className="text-gray-400">Analyzing file...</span>
        </div>
      )}

      {/* Preview */}
      {preview && !importResult && (
        <>
          {/* Stats Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="card flex items-center gap-3">
              <Database size={20} className="text-indigo-400" />
              <div>
                <p className="text-2xl font-bold">{totalStats.total}</p>
                <p className="text-xs text-gray-500">Total Records</p>
              </div>
            </div>
            <div className="card flex items-center gap-3">
              <CheckCircle size={20} className="text-green-400" />
              <div>
                <p className="text-2xl font-bold text-green-400">{totalStats.newCount}</p>
                <p className="text-xs text-gray-500">New Records</p>
              </div>
            </div>
            <div className="card flex items-center gap-3">
              <AlertTriangle size={20} className="text-yellow-400" />
              <div>
                <p className="text-2xl font-bold text-yellow-400">{totalStats.dupCount}</p>
                <p className="text-xs text-gray-500">Duplicates</p>
              </div>
            </div>
            <div className="card flex items-center gap-3">
              <Upload size={20} className="text-cyan-400" />
              <div>
                <p className="text-2xl font-bold text-cyan-400">{totalStats.selected}</p>
                <p className="text-xs text-gray-500">Selected</p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 border-b border-gray-800 pb-2 overflow-x-auto">
            {dataTypes.map(type => {
              const stats = getStats(type);
              const Icon = TAB_ICONS[type] || Database;
              return (
                <button
                  key={type}
                  onClick={() => setActiveTab(type)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm whitespace-nowrap transition-colors ${
                    activeTab === type
                      ? 'bg-gray-800 text-indigo-400 border-b-2 border-indigo-400'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
                  }`}
                >
                  <Icon size={14} />
                  <span className="capitalize">{type}</span>
                  <span className="bg-gray-700 text-gray-300 text-xs px-1.5 py-0.5 rounded">
                    {stats.total}
                  </span>
                  {stats.dupCount > 0 && (
                    <span className="bg-yellow-900/50 text-yellow-400 text-xs px-1.5 py-0.5 rounded">
                      {stats.dupCount} dup
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Active Tab Content */}
          {activeTab && preview[activeTab] && (
            <div className="card">
              {/* Tab Header Controls */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={selections[activeTab]?.every(Boolean)}
                      onChange={() => toggleAll(activeTab)}
                      className="rounded border-gray-600 bg-gray-800 text-indigo-500 focus:ring-indigo-500"
                    />
                    Select All ({getStats(activeTab).selected}/{getStats(activeTab).total})
                  </label>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  {getStats(activeTab).dupCount > 0 && (
                    <span className="flex items-center gap-1 text-yellow-400">
                      <AlertTriangle size={14} />
                      {getStats(activeTab).dupCount} duplicates
                    </span>
                  )}
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {preview[activeTab].map((item, idx) => {
                  const isDup = item._isDuplicate;
                  const isSelected = selections[activeTab]?.[idx] ?? false;
                  const detailKey = `${activeTab}-${idx}`;
                  const showDetail = showDetails[detailKey];

                  return (
                    <div
                      key={idx}
                      className={`rounded-lg border transition-colors ${
                        isDup
                          ? isSelected
                            ? 'border-yellow-600 bg-yellow-900/10'
                            : 'border-yellow-800/50 bg-yellow-900/5'
                          : isSelected
                            ? 'border-indigo-600/50 bg-indigo-900/10'
                            : 'border-gray-800 bg-gray-800/30'
                      }`}
                    >
                      {/* Item Row */}
                      <div className="flex items-center gap-3 px-4 py-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleItem(activeTab, idx)}
                          className="rounded border-gray-600 bg-gray-800 text-indigo-500 focus:ring-indigo-500 flex-shrink-0"
                        />

                        <button
                          onClick={() => toggleDetail(activeTab, idx)}
                          className="flex items-center gap-1 text-gray-500 hover:text-gray-300 flex-shrink-0"
                        >
                          {showDetail ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </button>

                        {isDup && (
                          <span className="badge-yellow text-xs flex-shrink-0">
                            Duplicate
                          </span>
                        )}

                        {/* Preview of key fields */}
                        <div className="flex-1 min-w-0 truncate text-sm text-gray-300">
                          {item.nama_produk && <span>{item.nama_produk}</span>}
                          {item.nama && <span>{item.nama}</span>}
                          {item.no_order && <span>No. {item.no_order}</span>}
                          {!item.nama_produk && !item.nama && !item.no_order && (
                            <span className="text-gray-500">Record {idx + 1}</span>
                          )}
                          {item.sku && <span className="text-gray-500 ml-2">({item.sku})</span>}
                          {item.email && <span className="text-gray-500 ml-2">{item.email}</span>}
                        </div>

                        {isDup && item.duplicateOf && (
                          <span className="text-xs text-yellow-500 flex-shrink-0 hidden md:block">
                            Matches: {item.duplicateOf}
                          </span>
                        )}
                      </div>

                      {/* Expanded Detail */}
                      {showDetail && (
                        <div className="px-4 pb-3 pt-1 border-t border-gray-800/50">
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {Object.entries(item).filter(([k]) => !['_isDuplicate', '_newId', 'duplicateOf'].includes(k)).map(([key, val]) => (
                              <div key={key} className="bg-gray-900/50 rounded px-2 py-1">
                                <span className="text-xs text-gray-500">{key}: </span>
                                <span className="text-xs text-gray-300">{renderValue(val)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Import Button */}
          <div className="flex justify-end">
            <button
              onClick={handleImport}
              disabled={importing || totalStats.selected === 0}
              className="btn-primary flex items-center gap-2 px-6 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {importing ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload size={16} />
                  Import {totalStats.selected} Selected
                </>
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

import React, { useState } from 'react';
import { api } from '@/lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Pagination from '@/components/ui/Pagination';
import {

  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { 
  Upload, 
  Loader2,
  Trash2,
  Database,
  MapPin,
  Download,
  AlertCircle,
  CheckCircle,
  Truck,
  Package,
  Plus,
  X,
  Pencil
} from 'lucide-react';
import ShippingServiceManagement from '@/components/forms/ShippingServiceManagement';
import * as XLSX from 'xlsx';

// Product-specific upload section with Edit button
const ProductUploadSection = React.memo(({
  data,
  searchKey,
  searchInputs,
  searchTerms,
  setSearchInputs,
  uploading,
  uploadProgress,
  deleting,
  deleteProgress,
  onUpload,
  onDeleteAll,
  onDeleteSingle,
  downloadErrorLog,
  deleteSingleMutation,
  onEdit
}) => {
  const searchInput = searchInputs[searchKey] || '';
  const searchTerm = searchTerms[searchKey] || '';

  const filteredData = React.useMemo(() => {
    if (!searchTerm) return data;
    return data.filter(item => {
      const search = searchTerm.toLowerCase();
      return ['sku', 'nama_produk', 'harga', 'brand'].some(field => {
        const value = item[field];
        return value && String(value).toLowerCase().includes(search);
      });
    });
  }, [data, searchTerm]);

  return (
    <Card className="bg-card border-border p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
          <Package className="w-6 h-6 text-emerald-400" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">Database Produk</h3>
          <p className="text-sm text-muted-foreground">{data.length.toLocaleString()} records</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="upload-Product" className="text-muted-foreground">Upload File Excel (.xlsx, .csv)</Label>
          <div className="flex gap-2 mt-2">
            <Input
              id="upload-Product"
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => { if (e.target.files[0]) { onUpload('Product', e.target.files[0]); e.target.value = ''; } }}
              disabled={uploading === 'Product'}
              className="bg-muted border-border text-foreground"
            />
            {uploading === 'Product' && (
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2 px-4 py-2 bg-muted border border-emerald-500/30 rounded-md">
                  <Loader2 className="w-4 h-4 text-emerald-500 animate-spin" />
                  {uploadProgress.total > 0 && (
                    <div className="flex-1 flex items-center gap-4 text-sm">
                      <span className="text-emerald-400 font-semibold">{uploadProgress.current} / {uploadProgress.total}</span>
                      <span className="text-muted-foreground">✓ {uploadProgress.inserted} | ⚠ {uploadProgress.skipped} | ✗ {uploadProgress.failed}</span>
                    </div>
                  )}
                </div>
                {uploadProgress.total > 0 && (
                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                    <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }} />
                  </div>
                )}
              </div>
            )}
            {!uploading && uploadProgress.errors.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-md">
                  <AlertCircle className="w-4 h-4 text-red-400" />
                  <span className="text-sm text-red-400">{uploadProgress.failed} gagal, {uploadProgress.skipped} dilewati</span>
                </div>
                <Button variant="outline" size="sm" onClick={downloadErrorLog} className="w-full border-border text-red-400 hover:bg-red-500/10">
                  <Download className="w-4 h-4 mr-2" />
                  Download Error Log ({uploadProgress.errors.length} baris)
                </Button>
              </div>
            )}
          </div>
        </div>

        {data.length > 0 && (
          <>
            <div className="mb-4">
              <Input
                placeholder="Cari database produk..."
                value={searchInput}
                onChange={(e) => setSearchInputs(prev => ({ ...prev, [searchKey]: e.target.value }))}
                className="bg-muted border-border text-foreground placeholder:text-muted-foreground"
                autoComplete="off"
              />
            </div>

            <div className="flex justify-end items-center gap-3">
              {deleting === 'Product' && deleteProgress.total > 0 && (
                <div className="flex items-center gap-2 text-sm text-red-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Menghapus {deleteProgress.current} / {deleteProgress.total}
                </div>
              )}
              <Button
                variant="destructive"
                size="sm"
                onClick={() => { if (confirm('Hapus semua data? Tindakan ini tidak dapat dibatalkan.')) onDeleteAll('Product'); }}
                disabled={deleting === 'Product'}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Hapus Semua Data
              </Button>
            </div>

            <div className="border border-border rounded-lg overflow-hidden">
              <div className="overflow-x-auto max-h-64">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border">
                      <TableHead className="text-foreground">SKU</TableHead>
                      <TableHead className="text-foreground">Nama Produk</TableHead>
                      <TableHead className="text-foreground">Harga</TableHead>
                      <TableHead className="text-foreground">Brand</TableHead>
                      <TableHead className="text-foreground w-24">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredData.slice(0, 10).map((item, index) => (
                      <TableRow key={item.id || index} className="border-border">
                        <TableCell className="text-foreground text-sm">{item.sku || '—'}</TableCell>
                        <TableCell className="text-foreground text-sm">{item.nama_produk || '—'}</TableCell>
                        <TableCell className="text-foreground text-sm">{item.harga || '—'}</TableCell>
                        <TableCell className="text-foreground text-sm">{item.brand || '—'}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => onEdit({ id: item.id, sku: item.sku || '', nama_produk: item.nama_produk || '', harga: item.harga || '', brand: item.brand || '' })}
                              className="h-7 w-7 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => { if (confirm('Hapus data ini?')) onDeleteSingle({ entityName: 'Product', id: item.id }); }}
                              disabled={deleteSingleMutation.isPending}
                              className="h-7 w-7 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {filteredData.length > 10 && (
                <div className="p-2 bg-muted border-t border-border text-center text-sm text-muted-foreground">
                  Menampilkan 10 dari {filteredData.length} data {searchInput && `(filtered from ${data.length} total)`}
                </div>
              )}
              {filteredData.length === 0 && searchInput && (
                <div className="p-4 bg-muted border-t border-border text-center text-sm text-muted-foreground">
                  Tidak ada hasil untuk "{searchInput}"
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </Card>
  );
});
ProductUploadSection.displayName = 'ProductUploadSection';

// Extract UploadSection outside to prevent re-mounting
const UploadSection = React.memo(({ 
  title, 
  entityName, 
  data, 
  icon: Icon, 
  columns, 
  searchKey,
  searchInputs,
  searchTerms,
  setSearchInputs,
  uploading,
  uploadProgress,
  deleting,
  deleteProgress,
  onUpload,
  onDeleteAll,
  onDeleteSingle,
  downloadErrorLog,
  deleteSingleMutation
}) => {
  const searchInput = searchInputs[searchKey] || '';
  const searchTerm = searchTerms[searchKey] || '';
  
  const filteredData = React.useMemo(() => {
    if (!searchTerm) return data;
    return data.filter(item => {
      const search = searchTerm.toLowerCase();
      return columns.some(col => {
        const fieldName = col.toLowerCase().replace(/\s+/g, '_').replace('/', '_');
        const value = item[fieldName];
        return value && String(value).toLowerCase().includes(search);
      });
    });
  }, [data, searchTerm, columns]);

  return (
    <Card className="bg-card border-border p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
          <Icon className="w-6 h-6 text-emerald-400" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">{title}</h3>
          <p className="text-sm text-muted-foreground">
            {data.length.toLocaleString()} records
            {data.length >= 10000 && <span className="text-yellow-400"> (showing max 10K)</span>}
            {data.length >= 5000 && data.length < 10000 && <span className="text-emerald-400"> ✓ All data accessible in search</span>}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor={`upload-${entityName}`} className="text-muted-foreground">
            Upload File Excel (.xlsx, .csv)
          </Label>
          <div className="flex gap-2 mt-2">
          <Input
            id={`upload-${entityName}`}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={(e) => {
              if (e.target.files[0]) {
                onUpload(entityName, e.target.files[0]);
                e.target.value = '';
              }
            }}
            disabled={uploading === entityName}
            className="bg-muted border-border text-foreground"
          />
          {uploading === entityName && (
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2 px-4 py-2 bg-muted border border-emerald-500/30 rounded-md">
                <Loader2 className="w-4 h-4 text-emerald-500 animate-spin" />
                {uploadProgress.total > 0 && (
                  <div className="flex-1 flex items-center gap-4 text-sm">
                    <span className="text-emerald-400 font-semibold">
                      {uploadProgress.current} / {uploadProgress.total}
                    </span>
                    <span className="text-muted-foreground">
                      ✓ {uploadProgress.inserted} | 
                      ⚠ {uploadProgress.skipped} | 
                      ✗ {uploadProgress.failed}
                    </span>
                  </div>
                )}
              </div>
              {uploadProgress.total > 0 && (
                <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500 transition-all duration-300"
                    style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                  />
                </div>
              )}
            </div>
          )}
          {!uploading && uploadProgress.errors.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-md">
                <AlertCircle className="w-4 h-4 text-red-400" />
                <span className="text-sm text-red-400">
                  {uploadProgress.failed} data gagal, {uploadProgress.skipped} dilewati
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={downloadErrorLog}
                className="w-full border-border text-red-400 hover:bg-red-500/10"
              >
                <Download className="w-4 h-4 mr-2" />
                Download Error Log ({uploadProgress.errors.length} baris)
              </Button>
            </div>
          )}
          </div>
        </div>

        {data.length > 0 && (
        <>
          <div className="mb-4">
            <Input
              placeholder={`Cari ${title.toLowerCase()}...`}
              value={searchInput}
              onChange={(e) => setSearchInputs(prev => ({ ...prev, [searchKey]: e.target.value }))}
              className="bg-muted border-border text-foreground placeholder:text-muted-foreground"
              autoComplete="off"
            />
          </div>

          <div className="flex justify-end items-center gap-3">
            {deleting === entityName && deleteProgress.total > 0 && (
              <div className="flex items-center gap-2 text-sm text-red-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                Menghapus {deleteProgress.current} / {deleteProgress.total}
              </div>
            )}
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                if (confirm('Hapus semua data? Tindakan ini tidak dapat dibatalkan.')) {
                  onDeleteAll(entityName);
                }
              }}
              disabled={deleting === entityName}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Hapus Semua Data
            </Button>
          </div>

          <div className="border border-border rounded-lg overflow-hidden">
            <div className="overflow-x-auto max-h-64">
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
                    {columns.map((col) => (
                      <TableHead key={col} className="text-foreground whitespace-nowrap">
                        {col}
                      </TableHead>
                    ))}
                    <TableHead className="text-foreground whitespace-nowrap w-20">
                      Aksi
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.slice(0, 10).map((item, index) => (
                    <TableRow key={item.id || index} className="border-border">
                      {columns.map((col) => (
                        <TableCell key={col} className="text-foreground text-sm">
                          {item[col.toLowerCase().replace(/\s+/g, '_').replace('/', '_')] || '—'}
                        </TableCell>
                      ))}
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm('Hapus data ini?')) {
                              onDeleteSingle({ entityName, id: item.id });
                            }
                          }}
                          disabled={deleteSingleMutation.isPending}
                          className="h-7 w-7 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {filteredData.length > 10 && (
              <div className="p-2 bg-muted border-t border-border text-center text-sm text-muted-foreground">
                Menampilkan 10 dari {filteredData.length} data {searchInput && `(filtered from ${data.length} total)`}
              </div>
            )}
            {filteredData.length === 0 && searchInput && (
              <div className="p-4 bg-muted border-t border-border text-center text-sm text-muted-foreground">
                Tidak ada hasil untuk "{searchInput}"
              </div>
            )}
          </div>
        </>
        )}
      </div>
    </Card>
  );
});

UploadSection.displayName = 'UploadSection';

const EMPTY_PRODUCT = { sku: '', nama_produk: '', harga: '', brand: '' };

export default function MasterData({ user, userRole }) {
  const queryClient = useQueryClient();
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [newProduct, setNewProduct] = useState(EMPTY_PRODUCT);
  const [addingProduct, setAddingProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null); // { id, sku, nama_produk, harga, brand }
  const [savingEdit, setSavingEdit] = useState(false);
  const [uploading, setUploading] = useState(null);
  const [uploadProgress, setUploadProgress] = useState({ 
    current: 0, 
    total: 0, 
    inserted: 0,
    skipped: 0,
    failed: 0,
    errors: []
  });
  const [searchInputs, setSearchInputs] = useState({
    product: '',
    sap: '',
    jnt: ''
  });
  const [searchTerms, setSearchTerms] = useState({
    product: '',
    sap: '',
    jnt: ''
  });

  // Debounce search - separate timeout for each key
  const debounceTimers = React.useRef({});

  React.useEffect(() => {
    Object.keys(searchInputs).forEach(key => {
      // Clear existing timeout for this specific key
      if (debounceTimers.current[key]) {
        clearTimeout(debounceTimers.current[key]);
      }
      // Set new timeout for this specific key
      debounceTimers.current[key] = setTimeout(() => {
        setSearchTerms(prev => {
          if (prev[key] === searchInputs[key]) return prev;
          return { ...prev, [key]: searchInputs[key] };
        });
      }, 300);
    });

    // Cleanup on unmount
    return () => {
      Object.values(debounceTimers.current).forEach(timer => clearTimeout(timer));
    };
  }, [searchInputs]);

  // Queries — server-side paginated (50/page) dengan search ke server
  const PAGE_SIZE = 50;

  // --- Products ---
  const [productPage, setProductPage] = useState(1);
  const [productSearch, setProductSearch] = useState('');
  const [productSearchInput, setProductSearchInput] = useState('');

  const { data: productResult = {} } = useQuery({
    queryKey: ['products', productPage, productSearch],
    queryFn: () => api.getProducts({ page: productPage, limit: PAGE_SIZE, search: productSearch || undefined })
      .then(res => ({ products: res.products || [], total: res.total || 0 })),
    keepPreviousData: true,
  });
  const products = productResult.products || [];
  const productTotal = productResult.total || 0;
  const productTotalPages = Math.ceil(productTotal / PAGE_SIZE);

  // --- Kecamatan SAP ---
  const [sapPage, setSapPage] = useState(1);
  const [sapSearch, setSapSearch] = useState('');
  const [sapSearchInput, setSapSearchInput] = useState('');

  const { data: sapResult = {} } = useQuery({
    queryKey: ['kecamatanSAP', sapPage, sapSearch],
    queryFn: () => api.getSapKecamatans({ page: sapPage, limit: PAGE_SIZE, search: sapSearch || undefined })
      .then(res => ({ data: res.data || [], total: res.total || 0 })),
    keepPreviousData: true,
  });
  const kecamatanSAP = sapResult.data || [];
  const sapTotal = sapResult.total || 0;
  const sapTotalPages = Math.ceil(sapTotal / PAGE_SIZE);

  // --- Kecamatan JNT ---
  const [jntPage, setJntPage] = useState(1);
  const [jntSearch, setJntSearch] = useState('');
  const [jntSearchInput, setJntSearchInput] = useState('');

  const { data: jntResult = {} } = useQuery({
    queryKey: ['kecamatanJNT', jntPage, jntSearch],
    queryFn: () => api.getJntKecamatans({ page: jntPage, limit: PAGE_SIZE, search: jntSearch || undefined })
      .then(res => ({ data: res.data || [], total: res.total || 0 })),
    keepPreviousData: true,
  });
  const kecamatanJNT = jntResult.data || [];
  const jntTotal = jntResult.total || 0;
  const jntTotalPages = Math.ceil(jntTotal / PAGE_SIZE);

  // Debounce search handlers
  const productSearchTimer = React.useRef(null);
  const handleProductSearch = React.useCallback((val) => {
    setProductSearchInput(val);
    clearTimeout(productSearchTimer.current);
    productSearchTimer.current = setTimeout(() => { setProductSearch(val); setProductPage(1); }, 400);
  }, []);

  const sapSearchTimer = React.useRef(null);
  const handleSapSearch = React.useCallback((val) => {
    setSapSearchInput(val);
    clearTimeout(sapSearchTimer.current);
    sapSearchTimer.current = setTimeout(() => { setSapSearch(val); setSapPage(1); }, 400);
  }, []);

  const jntSearchTimer = React.useRef(null);
  const handleJntSearch = React.useCallback((val) => {
    setJntSearchInput(val);
    clearTimeout(jntSearchTimer.current);
    jntSearchTimer.current = setTimeout(() => { setJntSearch(val); setJntPage(1); }, 400);
  }, []);

  const sapColumns = React.useMemo(() => ['Kode', 'Kecamatan', 'Kota_Kab', 'Provinsi', 'Status_Tercover'], []);
  const jntColumns = React.useMemo(() => ['Provinsi', 'Kota_Kab', 'Kecamatan'], []);


  // Retry with exponential backoff
  const retryWithBackoff = async (fn, retries = 3, delay = 1000) => {
    for (let i = 0; i < retries; i++) {
      try {
        return await fn();
      } catch (error) {
        if (i === retries - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
      }
    }
  };

  // Helper for flexible Excel header matching (case-insensitive, space-trimmed, alias-supporting)
  const getFlexibleValue = (row, fieldType) => {
    if (!row || typeof row !== 'object') return '';

    const directMap = {
      sku: ['SKU', 'sku', 'Kode Produk', 'Kode Barang', 'Kode', 'Product Code', 'Item Code', 'SKU Produk'],
      nama_produk: ['Nama Produk', 'nama_produk', 'NAMA PRODUK', 'Nama Barang', 'Nama', 'Product Name', 'Name', 'Deskripsi', 'Produk', 'Item Name'],
      harga: ['Harga', 'harga', 'HARGA', 'Harga Jual', 'Price', 'Harga Satuan', 'Harga Setelah Diskon', 'Harga (Rp)', 'Amount'],
      brand: ['Brand', 'brand', 'BRAND', 'Merk', 'Brands', 'Merek'],
      kode: ['KODE KECAMATAN', 'Kode Kecamatan', 'kode_kecamatan', 'Kode', 'KODE', 'kode', 'ID Kecamatan', 'Kode SAP', 'KodeSap'],
      kecamatan: ['KECAMATAN', 'Kecamatan', 'kecamatan', 'Nama Kecamatan', 'Distrik', 'District'],
      kota_kab: ['KOTA/KAB', 'Kota/Kab', 'Kota/Kabupaten', 'Kota', 'KOTA', 'kota', 'Kabupaten', 'kota_kab', 'Kota Kab', 'City'],
      provinsi: ['PROVINSI', 'Provinsi', 'provinsi', 'Prov', 'Province'],
      status_tercover: ['Tercover / Tidak', 'status_tercover', 'STATUS_TERCOVER', 'Tercover', 'Status Tercover', 'Cover', 'Is Covered']
    };

    const directKeys = directMap[fieldType] || [fieldType];
    for (const k of directKeys) {
      if (row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== '') {
        return String(row[k]).trim();
      }
    }

    // Fallback: normalize all keys in row
    const normalizedRow = {};
    for (const k of Object.keys(row)) {
      const cleanKey = String(k).trim().toLowerCase().replace(/[^a-z0-9]/g, '');
      normalizedRow[cleanKey] = row[k];
    }

    const cleanCandidates = directKeys.map(k => String(k).trim().toLowerCase().replace(/[^a-z0-9]/g, ''));
    for (const cand of cleanCandidates) {
      if (normalizedRow[cand] !== undefined && normalizedRow[cand] !== null && String(normalizedRow[cand]).trim() !== '') {
        return String(normalizedRow[cand]).trim();
      }
    }

    return '';
  };

  const getItemKey = (item, entityName) => {
    if (entityName === 'KecamatanSAP') {
      const k = (item.kode || '').trim().toLowerCase();
      if (k) return `sap_kode:${k}`;
      const combo = `${item.provinsi || ''}-${item.kota_kab || ''}-${item.kecamatan || ''}`.trim().toLowerCase();
      return combo !== '--' ? `sap_combo:${combo}` : null;
    }
    
    if (entityName === 'KecamatanJNT') {
      const combo = `${item.provinsi || ''}-${item.kota_kab || ''}-${item.kecamatan || ''}`.trim().toLowerCase();
      return combo !== '--' ? `jnt_combo:${combo}` : null;
    }
    
    if (entityName === 'Product') {
      const sku = (item.sku || '').trim().toLowerCase();
      const name = (item.nama_produk || '').trim().toLowerCase();
      if (sku) return `prod_sku:${sku}`;
      if (name) return `prod_name:${name}`;
      return null;
    }

    return null;
  };

  // Check for duplicates
  const removeDuplicates = (data, entityName) => {
    const seen = new Set();
    const unique = [];
    const duplicates = [];

    data.forEach((item, index) => {
      const key = getItemKey(item, entityName);

      if (key && seen.has(key)) {
        duplicates.push({ ...item, _rowNumber: index + 2 });
      } else {
        if (key) seen.add(key);
        unique.push(item);
      }
    });

    return { unique, duplicates };
  };

  const handleUpload = async (entityName, file) => {
    setUploading(entityName);
    setUploadProgress({ current: 0, total: 100, inserted: 0, skipped: 0, failed: 0, errors: [] });
    
    try {
      let endpoint = '';
      if (entityName === 'Product') endpoint = 'products';
      else if (entityName === 'KecamatanSAP') endpoint = 'kecamatan-sap';
      else if (entityName === 'KecamatanJNT') endpoint = 'kecamatan-jnt';

      if (!endpoint) throw new Error("Tipe data tidak valid");

      const result = await api.uploadFile(endpoint, file);
      
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['kecamatanSAP'] });
      queryClient.invalidateQueries({ queryKey: ['kecamatanJNT'] });
      
      const summary = `
✅ Import Selesai!
━━━━━━━━━━━━━━━━
📊 Total Baris: ${result.total || 0}
✓ Berhasil: ${result.success || 0}
⚠ Dilewati: ${result.skipped || 0}
✗ Gagal: ${result.failed || 0}
      `;
      alert(summary);
      
    } catch (error) {
      console.error('Error uploading:', error);
      alert('❌ Error upload file: ' + error.message);
    } finally {
      setUploading(null);
    }
  };

  // Download error log
  const downloadErrorLog = () => {
    if (uploadProgress.errors.length === 0) return;
    
    // Create detailed CSV with all data fields
    const headers = ['Baris', 'Status', 'Alasan'];
    const firstError = uploadProgress.errors[0];
    if (firstError && firstError.data) {
      const dataKeys = Object.keys(firstError.data).filter(k => !k.startsWith('_'));
      headers.push(...dataKeys);
    }
    
    const rows = uploadProgress.errors.map(err => {
      const row = [
        err.row || '',
        err.reason?.includes('Duplikat') ? 'DILEWATI' : 'GAGAL',
        err.reason || ''
      ];
      
      if (err.data) {
        const dataKeys = Object.keys(firstError.data).filter(k => !k.startsWith('_'));
        dataKeys.forEach(key => {
          row.push(err.data[key] || '');
        });
      }
      
      return row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',');
    });
    
    const csv = [headers.join(','), ...rows].join('\n');
    
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `error_log_${Date.now()}.csv`;
    a.click();
  };

  const [deleting, setDeleting] = useState(null);
  const [deleteProgress, setDeleteProgress] = useState({ current: 0, total: 0 });

  const handleDeleteAll = async (entityName) => {
    setDeleting(entityName);
    
    try {
      let items = [];
      if (entityName === 'Product') {
        const res = await api.getProducts({ limit: 50000 });
        items = res.products || [];
      } else if (entityName === 'KecamatanSAP') {
        const res = await api.getSapKecamatans({ limit: 50000 });
        items = res.data || [];
      } else if (entityName === 'KecamatanJNT') {
        const res = await api.getJntKecamatans({ limit: 50000 });
        items = res.data || [];
      }
      
      if (items.length === 0) {
        alert('Tidak ada data untuk dihapus');
        setDeleting(null);
        return;
      }
      
      setDeleteProgress({ current: 0, total: items.length });
      
      let deleted = 0;
      let skipped = 0;
      const BATCH_SIZE = 20;
      
      // Delete in parallel batches
      for (let i = 0; i < items.length; i += BATCH_SIZE) {
        const batch = items.slice(i, i + BATCH_SIZE);
        
        const results = await Promise.allSettled(
          batch.map(item => {
            if (entityName === 'Product') return api.deleteProduct(item.id);
            if (entityName === 'KecamatanSAP') return api.deleteSapKecamatan(item.id);
            if (entityName === 'KecamatanJNT') return api.deleteJntKecamatan(item.id);
          })
        );
        
        results.forEach(r => r.status === 'fulfilled' ? deleted++ : skipped++);
        setDeleteProgress({ current: i + batch.length, total: items.length });
      }
      
      // Save to audit log
      try {
        // Audit logs not implemented directly here  failed_count: skipped,
      } catch (auditError) {
        console.error('Failed to save audit log:', auditError);
      }
      
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['kecamatanSAP'] });
      queryClient.invalidateQueries({ queryKey: ['kecamatanJNT'] });
      alert(`✅ Selesai!\nDihapus: ${deleted}\nDilewati: ${skipped}`);
      
    } catch (error) {
      alert('❌ Error: ' + error.message);
    } finally {
      setDeleting(null);
      setDeleteProgress({ current: 0, total: 0 });
    }
  };

  const deleteSingleMutation = useMutation({
    mutationFn: async ({ entityName, id }) => {
      if (entityName === 'Product') await api.deleteProduct(id);
      if (entityName === 'KecamatanSAP') await api.deleteSapKecamatan(id);
      if (entityName === 'KecamatanJNT') await api.deleteJntKecamatan(id);
    },
    onSuccess: (data, variables) => {
      const keyMap = {
        Product: 'products',
        KecamatanSAP: 'kecamatanSAP',
        KecamatanJNT: 'kecamatanJNT'
      };
      const key = keyMap[variables.entityName] || variables.entityName;
      queryClient.invalidateQueries({ queryKey: [key] });
    }
  });

  const downloadTemplate = (entityName) => {
    let rows = [];
    if (entityName === 'Product') {
      rows = [
        ['SKU', 'Nama Produk', 'Harga', 'Brand'],
        ['SKU-001', 'Contoh Produk A', 50000, 'BrandA'],
        ['SKU-002', 'Contoh Produk B', 75000, 'BrandB'],
      ];
    } else if (entityName === 'KecamatanSAP') {
      rows = [
        ['KODE KECAMATAN', 'KECAMATAN', 'KOTA/KAB', 'PROVINSI', 'Tercover / Tidak'],
        ['10010101', 'GAMBIR', 'JAKARTA PUSAT', 'DKI JAKARTA', 'Ya'],
        ['10010102', 'SAWAH BESAR', 'JAKARTA PUSAT', 'DKI JAKARTA', 'Tidak'],
      ];
    } else if (entityName === 'KecamatanJNT') {
      rows = [
        ['Provinsi', 'Kota', 'Kecamatan'],
        ['DKI JAKARTA', 'JAKARTA PUSAT', 'GAMBIR'],
        ['DKI JAKARTA', 'JAKARTA PUSAT', 'SAWAH BESAR'],
      ];
    }
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `template_${entityName.toLowerCase()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Master Data</h1>
        <p className="text-muted-foreground mt-1">
          Upload dan kelola database produk dan alamat tujuan
        </p>
      </div>

      <Tabs defaultValue="product" className="space-y-4">
        <TabsList className="bg-card border border-border flex-wrap h-auto">
          <TabsTrigger value="product" className="data-[state=active]:bg-emerald-500/20">
            <Package className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Produk</span>
            <span className="sm:hidden">Produk</span>
          </TabsTrigger>
          <TabsTrigger value="shipping" className="data-[state=active]:bg-emerald-500/20">
            <Truck className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Jasa Kirim</span>
            <span className="sm:hidden">Jasa</span>
          </TabsTrigger>
          <TabsTrigger value="sap" className="data-[state=active]:bg-emerald-500/20">
            <MapPin className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Alamat SAP</span>
            <span className="sm:hidden">SAP</span>
          </TabsTrigger>
          <TabsTrigger value="jnt" className="data-[state=active]:bg-emerald-500/20">
            <MapPin className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Alamat J&T</span>
            <span className="sm:hidden">J&T</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="product">
          <div className="flex justify-between items-center mb-2 flex-wrap gap-2">
            <Button
              size="sm"
              onClick={() => setShowAddProduct(v => !v)}
              className="bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              {showAddProduct ? <X className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
              {showAddProduct ? 'Tutup Form' : 'Tambah Produk Manual'}
            </Button>
            <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => downloadTemplate('Product')}
              className="border-border text-blue-400 hover:bg-blue-500/10"
            >
              <Download className="w-4 h-4 mr-2" />
              Download Template
            </Button>
            {products.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const rows = [
                    ['SKU', 'Nama Produk', 'Harga', 'Brand'],
                    ...products.map(p => [p.sku || '', p.nama_produk || '', p.harga || 0, p.brand || ''])
                  ];
                  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
                  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `produk_${Date.now()}.csv`;
                  a.click();
                }}
                className="border-border text-emerald-400 hover:bg-emerald-500/10"
              >
                <Download className="w-4 h-4 mr-2" />
                Download CSV ({products.length} produk)
              </Button>
            )}
            </div>
          </div>

          {showAddProduct && (
            <Card className="bg-muted border-border p-4 mb-4 space-y-3">
              <h4 className="text-foreground font-semibold">Tambah Produk Baru</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-muted-foreground text-xs">Nama Produk *</Label>
                  <Input
                    value={newProduct.nama_produk}
                    onChange={e => setNewProduct(p => ({ ...p, nama_produk: e.target.value }))}
                    placeholder="Nama produk"
                    className="mt-1 bg-card border-border text-foreground"
                  />
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">SKU</Label>
                  <Input
                    value={newProduct.sku}
                    onChange={e => setNewProduct(p => ({ ...p, sku: e.target.value }))}
                    placeholder="SKU produk"
                    className="mt-1 bg-card border-border text-foreground"
                  />
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Harga</Label>
                  <Input
                    type="number"
                    value={newProduct.harga}
                    onChange={e => setNewProduct(p => ({ ...p, harga: e.target.value }))}
                    placeholder="0"
                    className="mt-1 bg-card border-border text-foreground"
                  />
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Brand</Label>
                  <Input
                    value={newProduct.brand}
                    onChange={e => setNewProduct(p => ({ ...p, brand: e.target.value }))}
                    placeholder="Brand/merek"
                    className="mt-1 bg-card border-border text-foreground"
                  />
                </div>
              </div>
              <Button
                onClick={async () => {
                  if (!newProduct.nama_produk.trim()) {
                    alert('Nama produk wajib diisi');
                    return;
                  }
                  setAddingProduct(true);
                  await api.createProduct({
                    ...newProduct,
                    harga: parseFloat(newProduct.harga) || 0
                  });
                  queryClient.invalidateQueries(['products']);
                  setNewProduct(EMPTY_PRODUCT);
                  setShowAddProduct(false);
                  setAddingProduct(false);
                }}
                disabled={addingProduct}
                className="bg-emerald-500 hover:bg-emerald-600 text-white"
              >
                {addingProduct ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                Simpan Produk
              </Button>
            </Card>
          )}

          {/* Modal Edit Produk */}
          {editingProduct && (
            <Card className="bg-muted border-emerald-500/40 p-4 mb-4 space-y-3">
              <h4 className="text-foreground font-semibold">Edit Produk</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-muted-foreground text-xs">Nama Produk *</Label>
                  <Input
                    value={editingProduct.nama_produk}
                    onChange={e => setEditingProduct(p => ({ ...p, nama_produk: e.target.value }))}
                    placeholder="Nama produk"
                    className="mt-1 bg-card border-border text-foreground"
                  />
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">SKU</Label>
                  <Input
                    value={editingProduct.sku}
                    onChange={e => setEditingProduct(p => ({ ...p, sku: e.target.value }))}
                    placeholder="SKU produk"
                    className="mt-1 bg-card border-border text-foreground"
                  />
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Harga</Label>
                  <Input
                    type="number"
                    value={editingProduct.harga}
                    onChange={e => setEditingProduct(p => ({ ...p, harga: e.target.value }))}
                    placeholder="0"
                    className="mt-1 bg-card border-border text-foreground"
                  />
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Brand</Label>
                  <Input
                    value={editingProduct.brand}
                    onChange={e => setEditingProduct(p => ({ ...p, brand: e.target.value }))}
                    placeholder="Brand/merek"
                    className="mt-1 bg-card border-border text-foreground"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={async () => {
                    if (!editingProduct.nama_produk.trim()) {
                      alert('Nama produk wajib diisi');
                      return;
                    }
                    setSavingEdit(true);
                    await api.updateProduct(editingProduct.id, {
                      sku: editingProduct.sku,
                      nama_produk: editingProduct.nama_produk,
                      harga: parseFloat(editingProduct.harga) || 0,
                      brand: editingProduct.brand
                    });
                    queryClient.invalidateQueries(['products']);
                    setEditingProduct(null);
                    setSavingEdit(false);
                  }}
                  disabled={savingEdit}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white"
                >
                  {savingEdit ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Simpan Perubahan
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setEditingProduct(null)}
                  className="border-border text-muted-foreground"
                >
                  Batal
                </Button>
              </div>
            </Card>
          )}

          <ProductUploadSection
            data={products}
            searchKey="product"
            searchInputs={searchInputs}
            searchTerms={searchTerms}
            setSearchInputs={setSearchInputs}
            uploading={uploading}
            uploadProgress={uploadProgress}
            deleting={deleting}
            deleteProgress={deleteProgress}
            onUpload={handleUpload}
            onDeleteAll={handleDeleteAll}
            onDeleteSingle={deleteSingleMutation.mutate}
            downloadErrorLog={downloadErrorLog}
            deleteSingleMutation={deleteSingleMutation}
            onEdit={setEditingProduct}
          />
          {/* Server-side search + pagination untuk Produk */}
          <div className="flex items-center gap-3 mt-3 mb-1">
            <Input
              placeholder="Cari produk (nama / SKU / brand)..."
              value={productSearchInput}
              onChange={e => handleProductSearch(e.target.value)}
              className="bg-muted border-border text-foreground max-w-xs"
            />
            <span className="text-sm text-muted-foreground">
              {productTotal.toLocaleString('id-ID')} total produk
            </span>
          </div>
          <Pagination
            page={productPage}
            totalPages={productTotalPages}
            onPageChange={setProductPage}
            total={productTotal}
            pageSize={PAGE_SIZE}
          />
        </TabsContent>

        <TabsContent value="shipping">
          <ShippingServiceManagement />
        </TabsContent>

        <TabsContent value="sap">
          <div className="flex justify-end mb-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => downloadTemplate('KecamatanSAP')}
              className="border-border text-blue-400 hover:bg-blue-500/10"
            >
              <Download className="w-4 h-4 mr-2" />
              Download Template SAP
            </Button>
          </div>
          <UploadSection
            title="Database Kecamatan SAP"
            entityName="KecamatanSAP"
            data={kecamatanSAP}
            icon={MapPin}
            columns={sapColumns}
            searchKey="sap"
            searchInputs={searchInputs}
            searchTerms={searchTerms}
            setSearchInputs={setSearchInputs}
            uploading={uploading}
            uploadProgress={uploadProgress}
            deleting={deleting}
            deleteProgress={deleteProgress}
            onUpload={handleUpload}
            onDeleteAll={handleDeleteAll}
            onDeleteSingle={deleteSingleMutation.mutate}
            downloadErrorLog={downloadErrorLog}
            deleteSingleMutation={deleteSingleMutation}
          />
          {/* Server-side search + pagination untuk Kecamatan SAP */}
          <div className="flex items-center gap-3 mt-3 mb-1">
            <Input
              placeholder="Cari kecamatan / kota / kode SAP..."
              value={sapSearchInput}
              onChange={e => handleSapSearch(e.target.value)}
              className="bg-muted border-border text-foreground max-w-xs"
            />
            <span className="text-sm text-muted-foreground">
              {sapTotal.toLocaleString('id-ID')} total kecamatan SAP
            </span>
          </div>
          <Pagination
            page={sapPage}
            totalPages={sapTotalPages}
            onPageChange={setSapPage}
            total={sapTotal}
            pageSize={PAGE_SIZE}
          />
        </TabsContent>

        <TabsContent value="jnt">
          <div className="flex justify-end mb-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => downloadTemplate('KecamatanJNT')}
              className="border-border text-blue-400 hover:bg-blue-500/10"
            >
              <Download className="w-4 h-4 mr-2" />
              Download Template J&T
            </Button>
          </div>
          <UploadSection
            title="Database Kecamatan J&T/Lainnya"
            entityName="KecamatanJNT"
            data={kecamatanJNT}
            icon={MapPin}
            columns={jntColumns}
            searchKey="jnt"
            searchInputs={searchInputs}
            searchTerms={searchTerms}
            setSearchInputs={setSearchInputs}
            uploading={uploading}
            uploadProgress={uploadProgress}
            deleting={deleting}
            deleteProgress={deleteProgress}
            onUpload={handleUpload}
            onDeleteAll={handleDeleteAll}
            onDeleteSingle={deleteSingleMutation.mutate}
            downloadErrorLog={downloadErrorLog}
            deleteSingleMutation={deleteSingleMutation}
          />
          {/* Server-side search + pagination untuk Kecamatan JNT */}
          <div className="flex items-center gap-3 mt-3 mb-1">
            <Input
              placeholder="Cari kecamatan / kota / provinsi J&T..."
              value={jntSearchInput}
              onChange={e => handleJntSearch(e.target.value)}
              className="bg-muted border-border text-foreground max-w-xs"
            />
            <span className="text-sm text-muted-foreground">
              {jntTotal.toLocaleString('id-ID')} total kecamatan J&T
            </span>
          </div>
          <Pagination
            page={jntPage}
            totalPages={jntTotalPages}
            onPageChange={setJntPage}
            total={jntTotal}
            pageSize={PAGE_SIZE}
          />
        </TabsContent>
      </Tabs>

      <Card className="bg-card border-border p-6">
        <h3 className="font-semibold text-foreground mb-3">Format File Excel</h3>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p><strong className="text-emerald-400">Produk:</strong> SKU | Nama Produk | Harga | Brand</p>
          <p><strong className="text-emerald-400">Kecamatan SAP:</strong> KODE KECAMATAN | KECAMATAN | KOTA/KAB | PROVINSI | Tercover / Tidak</p>
          <p><strong className="text-emerald-400">Kecamatan J&T/Lainnya:</strong> Provinsi | Kota | Kecamatan</p>
        </div>
      </Card>
    </div>
  );
}
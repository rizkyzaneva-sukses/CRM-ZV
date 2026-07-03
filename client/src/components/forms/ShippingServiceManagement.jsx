import React, { useState } from 'react';
import { api } from '@/lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Truck, Plus, Loader2, Pencil, Trash2, CheckCircle, XCircle, ArrowDownAZ, ArrowUpAZ, Upload, Download } from 'lucide-react';
import { Checkbox } from "@/components/ui/checkbox";
import * as XLSX from 'xlsx';

export default function ShippingServiceManagement() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [sortOrder, setSortOrder] = useState('asc');
  const [uploading, setUploading] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    platform: '',
    brand: '',
    is_active: true
  });

  const { data: services = [], isLoading } = useQuery({
    queryKey: ['shippingServices'],
    queryFn: async () => {
      const data = await api.getShippingServices();
      return data.shipping_services || data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      if (editingService) {
        await api.updateShippingService(editingService.id, data);
      } else {
        await api.createShippingService(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['shippingServices']);
      setDialogOpen(false);
      setEditingService(null);
      setFormData({ name: '', code: '', is_active: true });
      alert('✅ Jasa pengiriman berhasil disimpan!');
    },
    onError: (error) => {
      alert('❌ Error: ' + error.message);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await api.deleteShippingService(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['shippingServices']);
      alert('✅ Jasa pengiriman berhasil dihapus!');
    },
    onError: (error) => {
      alert('❌ Error: ' + error.message);
    }
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }) => {
      await api.updateShippingService(id, { is_active });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['shippingServices']);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.code) {
      alert('Nama dan kode wajib diisi');
      return;
    }
    createMutation.mutate(formData);
  };

  const handleEdit = (service) => {
    setEditingService(service);
    setFormData({
      name: service.name,
      code: service.code,
      platform: service.platform || '',
      brand: service.brand || '',
      is_active: service.is_active
    });
    setDialogOpen(true);
  };

  const handleDelete = (service) => {
    if (confirm(`Hapus jasa pengiriman "${service.name}"?`)) {
      deleteMutation.mutate(service.id);
    }
  };

  const handleDeleteSelected = async () => {
    if (!confirm(`Hapus ${selectedIds.length} jasa pengiriman yang dipilih?`)) return;
    for (const id of selectedIds) {
      await api.deleteShippingService(id);
    }
    setSelectedIds([]);
    queryClient.invalidateQueries(['shippingServices']);
    alert(`✅ Berhasil menghapus ${selectedIds.length} jasa pengiriman`);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === sortedServices.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(sortedServices.map(s => s.id));
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleAddNew = () => {
    setEditingService(null);
    setFormData({ name: '', code: '', platform: '', brand: '', is_active: true });
    setDialogOpen(true);
  };

  const handleUploadCSV = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = '';
    setUploading(true);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawData = XLSX.utils.sheet_to_json(worksheet);
      if (rawData.length === 0) { alert('File kosong atau format tidak sesuai'); return; }
      // Ambil data existing untuk cek duplikat
      const res = await api.getShippingServices();
      const existing = res.shipping_services || res;
      let inserted = 0;
      let updated = 0;
      for (const row of rawData) {
        const platform = String(row['Platform'] || row['platform'] || '');
        const name = String(row['Nama'] || row['nama'] || '');
        const brand = String(row['Brand'] || row['brand'] || '');
        const code = String(row['Kode'] || row['kode'] || autoGenerateCode(name));
        if (!name) continue;
        // Cek duplikat berdasarkan code
        const duplicate = existing.find(s => s.code === code);
        if (duplicate) {
          await api.updateShippingService(duplicate.id, { name, code, platform, brand });
          updated++;
        } else {
          await api.createShippingService({ name, code, platform, brand, is_active: true });
          inserted++;
        }
      }
      queryClient.invalidateQueries(['shippingServices']);
      alert(`✅ Import selesai: ${inserted} ditambah, ${updated} diperbarui`);
    } catch (error) {
      alert('❌ Error: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const autoGenerateCode = (name) => {
    return name
      .toLowerCase()
      .replace(/&/g, 'n')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-');
  };

  const handleDownloadTemplate = () => {
    const templateData = [
      { Platform: 'Shopee', Nama: 'J&T Express', Brand: 'Zaneva' },
      { Platform: 'Tokopedia', Nama: 'JNE Regular', Brand: 'Zaneva' },
      { Platform: 'Manual', Nama: 'SAP COD', Brand: 'Zaneva' },
    ];
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, 'template_jasa_pengiriman.xlsx');
  };

  const sortedServices = [...services].sort((a, b) => {
    const nameA = (a.name || '').toLowerCase();
    const nameB = (b.name || '').toLowerCase();
    return sortOrder === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
  });

  return (
    <Card className="bg-card border-border p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
            <Truck className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground text-sm sm:text-base">Jasa Pengiriman</h3>
            <p className="text-xs sm:text-sm text-muted-foreground">{services.length} jasa pengiriman</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSortOrder(s => s === 'asc' ? 'desc' : 'asc')}
            className="border-border text-muted-foreground hover:text-foreground text-xs"
          >
            {sortOrder === 'asc' ? <ArrowDownAZ className="w-4 h-4 mr-1" /> : <ArrowUpAZ className="w-4 h-4 mr-1" />}
            {sortOrder === 'asc' ? 'A–Z' : 'Z–A'}
          </Button>
          <Label htmlFor="upload-shipping" className="cursor-pointer">
            <Button
              variant="outline"
              size="sm"
              className="border-border text-muted-foreground hover:text-foreground text-xs pointer-events-none"
              disabled={uploading}
              asChild
            >
              <span>
                {uploading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Upload className="w-4 h-4 mr-1" />}
                Upload CSV
              </span>
            </Button>
          </Label>
          <input id="upload-shipping" type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleUploadCSV} />
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadTemplate}
            className="border-border text-muted-foreground hover:text-foreground text-xs"
          >
            <Download className="w-4 h-4 mr-1" />
            Template
          </Button>
          {selectedIds.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDeleteSelected}
              className="border-red-500/50 text-red-400 hover:text-red-300 hover:bg-red-500/10 text-xs"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Hapus ({selectedIds.length})
            </Button>
          )}
          <Button
            onClick={handleAddNew}
            className="bg-emerald-600 hover:bg-emerald-700 text-sm"
            size="sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            Tambah
          </Button>
        </div>
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border">
                <TableHead className="w-10">
                  <Checkbox
                    checked={sortedServices.length > 0 && selectedIds.length === sortedServices.length}
                    onCheckedChange={toggleSelectAll}
                    className="border-border"
                  />
                </TableHead>
                <TableHead className="text-foreground text-xs sm:text-sm">Platform</TableHead>
                <TableHead className="text-foreground text-xs sm:text-sm">Nama</TableHead>
                <TableHead className="text-foreground text-xs sm:text-sm">Kode</TableHead>
                <TableHead className="text-foreground text-xs sm:text-sm">Brand</TableHead>
                <TableHead className="text-foreground text-xs sm:text-sm">Status</TableHead>
                <TableHead className="text-foreground text-xs sm:text-sm w-28">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <Loader2 className="w-6 h-6 text-emerald-500 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : sortedServices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground text-sm">
                    Belum ada jasa pengiriman
                  </TableCell>
                </TableRow>
              ) : (
                sortedServices.map((service) => (
                  <TableRow key={service.id} className="border-border">
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.includes(service.id)}
                        onCheckedChange={() => toggleSelect(service.id)}
                        className="border-border"
                      />
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{service.platform || '—'}</TableCell>
                    <TableCell className="text-foreground font-medium text-sm">
                      {service.name}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{service.code}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{service.brand || '—'}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleActiveMutation.mutate({ 
                          id: service.id, 
                          is_active: !service.is_active 
                        })}
                        className={`text-xs ${
                          service.is_active 
                            ? 'text-emerald-400 hover:text-emerald-300' 
                            : 'text-gray-400 hover:text-gray-300'
                        }`}
                      >
                        {service.is_active ? (
                          <>
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Aktif
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3 mr-1" />
                            Nonaktif
                          </>
                        )}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(service)}
                          className="h-7 w-7 text-muted-foreground hover:text-emerald-400 hover:bg-emerald-500/10"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(service)}
                          disabled={deleteMutation.isPending}
                          className="h-7 w-7 text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-card border-border max-w-[90vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground text-base sm:text-lg">
              {editingService ? 'Edit Jasa Pengiriman' : 'Tambah Jasa Pengiriman'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
            <div>
              <Label className="text-muted-foreground text-sm">Platform</Label>
              <Input
                value={formData.platform}
                onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
                placeholder="Contoh: Shopee, Tokopedia, Manual"
                className="mt-1 bg-muted border-border text-foreground text-sm"
              />
            </div>
            <div>
              <Label className="text-muted-foreground text-sm">Nama Jasa Pengiriman *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Contoh: JNE, J&T, SAP"
                className="mt-1 bg-muted border-border text-foreground text-sm"
                required
              />
            </div>
            <div>
              <Label className="text-muted-foreground text-sm">Kode (lowercase, no space) *</Label>
              <Input
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toLowerCase().replace(/\s/g, '-') })}
                placeholder="Contoh: jne, jnt, sap-cod"
                className="mt-1 bg-muted border-border text-foreground text-sm"
                required
              />
              <p className="text-xs text-muted-foreground mt-1">Kode akan otomatis lowercase tanpa spasi</p>
            </div>
            <div>
              <Label className="text-muted-foreground text-sm">Brand</Label>
              <Input
                value={formData.brand}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                placeholder="Contoh: Zaneva, Brand XYZ"
                className="mt-1 bg-muted border-border text-foreground text-sm"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                className="border-border text-muted-foreground text-sm"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700 text-sm"
              >
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  'Simpan'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
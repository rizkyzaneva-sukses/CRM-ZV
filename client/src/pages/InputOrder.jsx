import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { formatInJakarta } from '@/components/utils/dateUtils';
import { formatRupiah } from '@/components/utils/currencyUtils';
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import KecamatanSearch from '@/components/forms/KecamatanSearch';
import OrderItemsForm from '@/components/forms/OrderItemsForm';
import ShippingServiceCombobox from '@/components/forms/ShippingServiceCombobox';
import { Save, Loader2, Upload, Download, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import { normalizeShippingService, isSAPService } from '@/components/utils/shippingUtils';

const pembayaranOptions = [
  'BCA', 'BNI', 'BRI', 'MANDIRI', 'BCA (OBERBE)', 'BCA (BESYARI)', 'BCA (MUSWIM)'
];

const ketentuanOptions = [
  'Reseller', 'End User', 'NEW CUSTOMER - R', 'REAL RESELLER', 
  'REPEAT ORDER - R', 'REPEAT ORDER - E', 'NEW CUSTOMER - E'
];

export default function InputOrder({ user, userRole }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const editOrderId = urlParams.get('edit');

  const { data: shippingServices = [] } = useQuery({
    queryKey: ['shippingServices'],
    queryFn: async () => {
      const data = await api.getShippingServices();
      return data.shipping_services || [];
    },
  });

  // Fetch order data if in edit mode
  const { data: editOrder, isLoading: loadingEditOrder } = useQuery({
    queryKey: ['editOrder', editOrderId],
    queryFn: async () => {
      const data = await api.getOrder(editOrderId);
      return data.order || null;
    },
    enabled: !!editOrderId,
  });

  const { data: editOrderItems = [] } = useQuery({
    queryKey: ['editOrderItems', editOrderId],
    queryFn: () => api.getOrderItems({ order_id: editOrderId }).then(res => res.order_items || []),
    enabled: !!editOrderId,
  });

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ 
    current: 0, 
    total: 0, 
    inserted: 0,
    failed: 0,
    errors: []
  });

  const [form, setForm] = useState({
    order_date: format(new Date(), 'yyyy-MM-dd'),
    nama_pemesan: '',
    alamat: '',
    no_telepon: '',
    kode_pos: '',
    berat_kg: 1,
    jenis_transaksi: 'COD',
    instruksi_pengiriman: '',
    jasa_pengiriman: '',
    provinsi: '',
    kota_kab: '',
    kecamatan: '',
    kecamatan_kode: '',
    status_tercover: '',
    ketentuan: '',
    metode_pembayaran: '',
    transfer_atas_nama: '',
    total_belanja: 0,
    ongkir: 0,
    penanganan: 0,
  });

  const [items, setItems] = useState([
    { nama_produk: '', sku: '', qty: 1, harga_setelah_diskon: 0, jasa_pengiriman: '', berat_kg: 1 }
  ]);

  // Load edit data when available
  useEffect(() => {
    if (editOrder && !loadingEditOrder) {
      setForm({
        order_date: editOrder.order_date || format(new Date(), 'yyyy-MM-dd'),
        nama_pemesan: editOrder.nama_pemesan || '',
        alamat: editOrder.alamat || '',
        no_telepon: editOrder.no_telepon || '',
        kode_pos: editOrder.kode_pos || '',
        berat_kg: editOrder.berat_kg || 1,
        jenis_transaksi: editOrder.jenis_transaksi || 'COD',
        instruksi_pengiriman: editOrder.instruksi_pengiriman || '',
        jasa_pengiriman: editOrder.jasa_pengiriman || '',
        provinsi: editOrder.provinsi || '',
        kota_kab: editOrder.kota_kab || '',
        kecamatan: editOrder.kecamatan || '',
        kecamatan_kode: editOrder.kecamatan_kode || '',
        status_tercover: editOrder.status_tercover || '',
        ketentuan: editOrder.ketentuan || '',
        metode_pembayaran: editOrder.metode_pembayaran || '',
        transfer_atas_nama: editOrder.transfer_atas_nama || '',
        total_belanja: editOrder.total_belanja || 0,
        ongkir: editOrder.ongkir || 0,
        penanganan: editOrder.penanganan || 0,
      });
    }
  }, [editOrder, loadingEditOrder]);

  useEffect(() => {
    if (editOrderItems && editOrderItems.length > 0) {
      setItems(editOrderItems.map(item => ({
        id: item.id,
        nama_produk: item.nama_produk || '',
        sku: item.sku || '',
        qty: item.qty || 1,
        harga_setelah_diskon: item.harga_setelah_diskon || 0,
        brand: item.brand || '',
        jasa_pengiriman: item.jasa_pengiriman || '',
        berat_kg: item.berat_kg || 1,
        provinsi: item.provinsi || '',
        kota_kab: item.kota_kab || '',
        kecamatan: item.kecamatan || '',
        kecamatan_kode: item.kecamatan_kode || '',
        status_tercover: item.status_tercover || '',
        instruksi_pengiriman: item.instruksi_pengiriman || '',
      })));
    }
  }, [editOrderItems]);

  // Auto-detect dari item yang sudah ada jasa pengiriman, default SAP jika belum ada
  const activeJasaPengiriman = items.find(i => i.jasa_pengiriman)?.jasa_pengiriman || '';
  const isSAP = activeJasaPengiriman ? isSAPService(activeJasaPengiriman) : true;
  const serviceLabel = isSAP ? 'SAP' : 'J&T';

  // Calculate total
  const total = (form.total_belanja || 0) + (form.ongkir || 0) + (form.penanganan || 0);

  // Auto-calculate total_belanja from items
  useEffect(() => {
    const calculatedTotal = items.reduce((sum, item) => {
      return sum + (item.qty || 1) * (item.harga_setelah_diskon || 0);
    }, 0);
    setForm(prev => ({ ...prev, total_belanja: calculatedTotal }));
  }, [items]);

  // Auto-calculate penanganan for COD (3% suggestion) and clear metode_pembayaran
  useEffect(() => {
    if (form.jenis_transaksi === 'COD') {
      const subtotal = (form.total_belanja || 0) + (form.ongkir || 0);
      const suggested = Math.round(subtotal * 0.03);
      setForm(prev => ({ ...prev, penanganan: suggested, metode_pembayaran: '' }));
    }
  }, [form.jenis_transaksi, form.total_belanja, form.ongkir]);

  const generateOrderNumber = () => {
    const date = format(new Date(), 'yyyyMMdd');
    const random = Math.floor(1000 + Math.random() * 9000);
    return `CRM-${date}-${random}`;
  };

  const createOrderMutation = useMutation({
    mutationFn: async (data) => {
      let order;

      if (editOrderId) {
        // UPDATE MODE
        const orderData = {
          ...data,
          total,
          last_updated_by: user?.email,
        };
        
        await api.updateOrder(editOrderId, orderData);
        order = { id: editOrderId };

        // Delete existing items
        const res = await api.getOrderItems({ order_id: editOrderId });
        const existingItems = res.order_items || [];
        await Promise.all(existingItems.map(item => api.deleteOrderItem(item.id)));

        // Create new items
        for (const item of items) {
          if (item.nama_produk) {
            await api.request('/order-items', {
              method: 'POST',
              body: JSON.stringify({
                order_id: editOrderId,
                nama_produk: item.nama_produk,
                sku: item.sku || item.nama_produk,
                qty: item.qty,
                harga_setelah_diskon: item.harga_setelah_diskon,
                subtotal_item: (item.qty || 1) * (item.harga_setelah_diskon || 0),
                jasa_pengiriman: item.jasa_pengiriman || '',
                berat_kg: item.berat_kg || 1,
                provinsi: item.provinsi || '',
                kota_kab: item.kota_kab || '',
                kecamatan: item.kecamatan || '',
                kecamatan_kode: item.kecamatan_kode || '',
                status_tercover: item.status_tercover || '',
                instruksi_pengiriman: item.instruksi_pengiriman || '',
              })
            });
          }
        }
      } else {
        // CREATE MODE
        const orderData = {
          ...data,
          order_number: generateOrderNumber(),
          total,
          platform: 'CRM',
          status_pesanan: data.jenis_transaksi === 'CASH' ? 'WAITING_FINANCE' : 'READY_TO_PROCESS',
          finance_status: data.jenis_transaksi === 'CASH' ? 'PENDING' : null,
        };

        const created = await api.createOrder(orderData);
        order = created.order || created;

        // Create order items
        for (const item of items) {
          if (item.nama_produk) {
            await api.request('/order-items', {
              method: 'POST',
              body: JSON.stringify({
                order_id: order.id,
                nama_produk: item.nama_produk,
                sku: item.sku || item.nama_produk,
                qty: item.qty,
                harga_setelah_diskon: item.harga_setelah_diskon,
                subtotal_item: (item.qty || 1) * (item.harga_setelah_diskon || 0),
                jasa_pengiriman: item.jasa_pengiriman || '',
                berat_kg: item.berat_kg || 1,
                provinsi: item.provinsi || '',
                kota_kab: item.kota_kab || '',
                kecamatan: item.kecamatan || '',
                kecamatan_kode: item.kecamatan_kode || '',
                status_tercover: item.status_tercover || '',
                instruksi_pengiriman: item.instruksi_pengiriman || '',
              })
            });
          }
        }
      }

      // Auto create/update customer
      try {
        const dataCust = await api.getCustomers({ search: data.no_telepon });
        const existingCustomers = dataCust.customers || [];
        
        if (existingCustomers.length > 0) {
          // Update existing customer
          const customer = existingCustomers[0];
          await api.updateCustomer(customer.id, {
            last_order_date: data.order_date,
            total_orders: (customer.total_orders || 0) + 1,
          });
        } else {
          // Create new customer
          await api.createCustomer({
            nama: data.nama_pemesan,
            no_telepon: data.no_telepon,
            alamat: data.alamat,
            provinsi: data.provinsi,
            kota_kab: data.kota_kab,
            kecamatan: data.kecamatan,
            kode_pos: data.kode_pos,
            total_orders: 1,
            last_order_date: data.order_date,
          });
        }
      } catch (error) {
        console.error('Failed to create/update customer:', error);
      }

      return order;
    },
    onSuccess: (order) => {
      queryClient.invalidateQueries(['orders']);
      queryClient.invalidateQueries(['customers']);
      queryClient.invalidateQueries(['order', order.id]);
      alert(editOrderId ? '✅ Order berhasil diupdate!' : '✅ Order berhasil dibuat!');
      navigate(createPageUrl(`OrderDetail?id=${order.id}`));
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validation
    if (!form.nama_pemesan || !form.alamat || !form.no_telepon) {
      alert('Mohon lengkapi field yang wajib diisi');
      return;
    }

    const validItems = items.filter(i => i.nama_produk);
    if (validItems.length === 0) {
      alert('Minimal tambahkan 1 produk');
      return;
    }

    // Validate per-item shipping
    for (let i = 0; i < validItems.length; i++) {
      const item = validItems[i];
      if (!item.jasa_pengiriman) {
        alert(`Item "${item.nama_produk}" belum dipilih jasa pengirimannya`);
        return;
      }
    }

    // Validasi alamat (kecamatan) dari form utama jika ada item SAP
    const hasSAP = validItems.some(it => isSAPService(it.jasa_pengiriman));
    if (hasSAP && !form.kecamatan_kode) {
      alert('Jasa pengiriman SAP wajib memilih kecamatan dari daftar SAP di bagian Informasi Pemesan');
      return;
    }
    if (hasSAP && form.jenis_transaksi === 'COD' && form.status_tercover?.toLowerCase() === 'tidak') {
      const ok = window.confirm(
        `⚠️ PERINGATAN: Kecamatan TIDAK TERCOVER untuk COD SAP.\n\nApakah Anda yakin ingin melanjutkan?`
      );
      if (!ok) return;
    }

    if (editOrderId && !window.confirm('Apakah Anda yakin ingin menyimpan perubahan order ini?')) {
      return;
    }

    // Use first item's jasa_pengiriman & instruksi as order-level; alamat tetap dari form utama
    const firstItem = validItems[0];
    createOrderMutation.mutate({
      ...form,
      jasa_pengiriman: firstItem.jasa_pengiriman,
      instruksi_pengiriman: firstItem.instruksi_pengiriman || form.instruksi_pengiriman || '',
    });
  };

  const updateForm = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleBulkUpload = async (file) => {
    setUploading(true);
    setUploadProgress({ current: 0, total: 0, inserted: 0, failed: 0, errors: [] });
    
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawData = XLSX.utils.sheet_to_json(worksheet);

      if (rawData.length === 0) {
        alert('File kosong');
        return;
      }

      setUploadProgress(prev => ({ ...prev, total: rawData.length }));

      let inserted = 0;
      let failed = 0;
      const errors = [];

      for (let i = 0; i < rawData.length; i++) {
        const row = rawData[i];
        
        try {
          // Parse order data
          const orderData = {
            order_date: row['Tanggal Order'] || format(new Date(), 'yyyy-MM-dd'),
            nama_pemesan: String(row['Nama Pemesan'] || ''),
            alamat: String(row['Alamat'] || ''),
            no_telepon: String(row['No Telepon'] || ''),
            kode_pos: String(row['Kode Pos'] || ''),
            berat_kg: parseFloat(row['Berat (kg)'] || 1),
            jenis_transaksi: String(row['Jenis Transaksi'] || 'COD').toUpperCase(),
            jasa_pengiriman: String(row['Jasa Pengiriman'] || '').toLowerCase(),
            provinsi: String(row['Provinsi'] || ''),
            kota_kab: String(row['Kota/Kab'] || ''),
            kecamatan: String(row['Kecamatan'] || ''),
            kecamatan_kode: String(row['Kode Kecamatan'] || ''),
            ketentuan: String(row['Ketentuan'] || ''),
            metode_pembayaran: String(row['Metode Pembayaran'] || ''),
            transfer_atas_nama: String(row['Transfer Atas Nama'] || ''),
            total_belanja: parseFloat(row['Total Belanja'] || 0),
            ongkir: parseFloat(row['Ongkir'] || 0),
            penanganan: parseFloat(row['Penanganan'] || 0),
            instruksi_pengiriman: String(row['Instruksi'] || ''),
            order_number: generateOrderNumber(),
            platform: 'CRM',
            status_pesanan: (row['Jenis Transaksi'] || 'COD').toUpperCase() === 'CASH' ? 'WAITING_FINANCE' : 'READY_TO_PROCESS',
            finance_status: (row['Jenis Transaksi'] || 'COD').toUpperCase() === 'CASH' ? 'PENDING' : null,
          };

          orderData.total = orderData.total_belanja + orderData.ongkir + orderData.penanganan;

          // Validate required fields
          if (!orderData.nama_pemesan || !orderData.alamat || !orderData.no_telepon || !orderData.jasa_pengiriman) {
            throw new Error('Data tidak lengkap (nama/alamat/telepon/jasa pengiriman)');
          }

          const resOrder = await api.createOrder(orderData);
          const order = resOrder.order || resOrder;

          // Parse items (assumed format: "Product1:2:10000|Product2:1:5000")
          const itemsStr = row['Items'] || '';
          if (itemsStr) {
            const itemsParts = itemsStr.split('|');
            for (const part of itemsParts) {
              const [nama, qty, harga] = part.split(':');
              if (nama) {
                await api.request('/order-items', {
                  method: 'POST',
                  body: JSON.stringify({
                    order_id: order.id,
                    nama_produk: nama.trim(),
                    sku: nama.trim(),
                    qty: parseInt(qty) || 1,
                    harga_setelah_diskon: parseFloat(harga) || 0,
                    subtotal_item: (parseInt(qty) || 1) * (parseFloat(harga) || 0),
                  })
                });
              }
            }
          }

          // Auto create/update customer
          try {
            const dataCust = await api.getCustomers({ search: orderData.no_telepon });
            const existingCustomers = dataCust.customers || [];
            
            if (existingCustomers.length > 0) {
              const customer = existingCustomers[0];
              await api.updateCustomer(customer.id, {
                last_order_date: orderData.order_date,
                total_orders: (customer.total_orders || 0) + 1,
              });
            } else {
              await api.createCustomer({
                nama: orderData.nama_pemesan,
                no_telepon: orderData.no_telepon,
                alamat: orderData.alamat,
                provinsi: orderData.provinsi,
                kota_kab: orderData.kota_kab,
                kecamatan: orderData.kecamatan,
                kode_pos: orderData.kode_pos,
                total_orders: 1,
                last_order_date: orderData.order_date,
              });
            }
          } catch (error) {
            console.error('Failed to create/update customer:', error);
          }

          inserted++;
          setUploadProgress(prev => ({ ...prev, current: i + 1, inserted }));
        } catch (error) {
          failed++;
          errors.push({ row: i + 2, reason: error.message, data: row });
          setUploadProgress(prev => ({ ...prev, current: i + 1, failed, errors }));
        }

        // Delay every 5 records
        if ((i + 1) % 5 === 0 && i < rawData.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }

      // Save audit log
      try {
        // Audit logging could be triggered on backend or via api.js. 
      } catch (e) {
        console.error('Audit log failed:', e);
      }

      queryClient.invalidateQueries(['orders']);

      alert(`✅ Import Selesai!\n\n✓ Berhasil: ${inserted}\n✗ Gagal: ${failed}`);
      
    } catch (error) {
      alert('❌ Error: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const downloadErrorLog = () => {
    if (uploadProgress.errors.length === 0) return;
    
    const csv = [
      ['Baris', 'Alasan', 'Data'].join(','),
      ...uploadProgress.errors.map(err => [
        err.row,
        err.reason,
        JSON.stringify(err.data)
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `error_orders_${Date.now()}.csv`;
    a.click();
  };

  if (editOrderId && loadingEditOrder) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6 px-2 sm:px-0">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">
          {editOrderId ? 'Edit Order' : 'Input Order Baru'}
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-1">
          {editOrderId ? `Edit data order ${editOrder?.order_number || ''}` : 'Isi form manual atau upload file Excel'}
        </p>
      </div>

      <Tabs defaultValue="manual" className="space-y-4 sm:space-y-6">
        {!editOrderId && (
          <TabsList className="bg-card border border-border w-full sm:w-auto">
            <TabsTrigger value="manual" className="data-[state=active]:bg-emerald-500/20 flex-1 sm:flex-none text-sm">
              <Save className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              Input Manual
            </TabsTrigger>
            <TabsTrigger value="upload" className="data-[state=active]:bg-emerald-500/20 flex-1 sm:flex-none text-sm">
              <Upload className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              Upload Excel
            </TabsTrigger>
          </TabsList>
        )}

        <TabsContent value="manual">
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
        {/* Customer Info */}
        <Card className="bg-card border-border p-4 sm:p-6">
          <h2 className="text-base sm:text-lg font-semibold text-foreground mb-4">Informasi Pemesan</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground text-sm">Tanggal Order</Label>
              <Input
                type="date"
                value={form.order_date}
                onChange={(e) => updateForm('order_date', e.target.value)}
                className="mt-1 bg-muted border-border text-foreground focus:border-[#60A5FA]"
              />
            </div>
            <div>
              <Label className="text-muted-foreground text-sm">Nama Pemesan *</Label>
              <Input
                value={form.nama_pemesan}
                onChange={(e) => updateForm('nama_pemesan', e.target.value)}
                placeholder="Nama lengkap pemesan"
                className="mt-1 bg-muted border-border text-foreground placeholder:text-muted-foreground focus:border-[#60A5FA]"
              />
            </div>
            <div>
              <Label className="text-muted-foreground text-sm">No. Telepon *</Label>
              <Input
                value={form.no_telepon}
                onChange={(e) => updateForm('no_telepon', e.target.value)}
                placeholder="08xxxxxxxxxx"
                className="mt-1 bg-muted border-border text-foreground placeholder:text-muted-foreground focus:border-[#60A5FA]"
              />
            </div>
            <div>
              <Label className="text-muted-foreground text-sm">Kode Pos</Label>
              <Input
                value={form.kode_pos}
                onChange={(e) => updateForm('kode_pos', e.target.value)}
                placeholder="Kode pos"
                className="mt-1 bg-muted border-border text-foreground placeholder:text-muted-foreground focus:border-[#60A5FA]"
              />
            </div>
            <div className="md:col-span-2">
              <Label className="text-muted-foreground text-sm">Alamat Lengkap *</Label>
              <Textarea
                value={form.alamat}
                onChange={(e) => updateForm('alamat', e.target.value)}
                placeholder="Alamat lengkap pengiriman"
                rows={3}
                className="mt-1 bg-muted border-border text-foreground placeholder:text-muted-foreground focus:border-[#60A5FA]"
              />
            </div>
            <div>
              <Label className="text-muted-foreground text-sm">Berat Total (kg)</Label>
              <Input
                type="number"
                min="0.1"
                step="0.1"
                value={form.berat_kg}
                onChange={(e) => updateForm('berat_kg', parseFloat(e.target.value) || 1)}
                placeholder="Berat total semua barang"
                className="mt-1 bg-muted border-border text-foreground placeholder:text-muted-foreground focus:border-[#60A5FA]"
              />
            </div>
            <div className="md:col-span-2">
              <KecamatanSearch
                isSAP={isSAP}
                serviceLabel={serviceLabel}
                value={{
                  provinsi: form.provinsi,
                  kota_kab: form.kota_kab,
                  kecamatan: form.kecamatan,
                  kecamatan_kode: form.kecamatan_kode,
                  status_tercover: form.status_tercover,
                }}
                onChange={(data) => setForm(prev => ({
                  ...prev,
                  provinsi: data.provinsi,
                  kota_kab: data.kota_kab,
                  kecamatan: data.kecamatan,
                  kecamatan_kode: data.kecamatan_kode || '',
                  status_tercover: data.status_tercover || '',
                }))}
              />
            </div>
          </div>
        </Card>

        {/* Order Items with per-item shipping */}
        <Card className="bg-card border-border p-4 sm:p-6">
          <OrderItemsForm items={items} onChange={setItems} shippingServices={shippingServices} />
        </Card>

        {/* Transaction Info */}
        <Card className="bg-card border-border p-4 sm:p-6">
          <h2 className="text-base sm:text-lg font-semibold text-foreground mb-4">Informasi Transaksi</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground text-sm">Jenis Transaksi *</Label>
              <Select 
                value={form.jenis_transaksi} 
                onValueChange={(v) => updateForm('jenis_transaksi', v)}
              >
                <SelectTrigger className="mt-1 bg-muted border-border text-foreground focus:border-[#60A5FA]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border" position="popper" sideOffset={4}>
                  <SelectItem value="COD" className="text-foreground focus:bg-accent focus:text-accent-foreground">COD</SelectItem>
                  <SelectItem value="CASH" className="text-foreground focus:bg-accent focus:text-accent-foreground">CASH</SelectItem>
                </SelectContent>
              </Select>
              {form.jenis_transaksi === 'CASH' && (
                <p className="text-xs text-amber-400 mt-1">Order CASH memerlukan approval Finance</p>
              )}
            </div>
            <div>
              <Label className="text-muted-foreground text-sm">Ketentuan</Label>
              <Select 
                value={form.ketentuan} 
                onValueChange={(v) => updateForm('ketentuan', v)}
              >
                <SelectTrigger className="mt-1 bg-muted border-border text-foreground focus:border-[#60A5FA]">
                  <SelectValue placeholder="Pilih ketentuan" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border" position="popper" sideOffset={4}>
                  {ketentuanOptions.map((opt) => (
                    <SelectItem 
                      key={opt} 
                      value={opt}
                      className="text-foreground focus:bg-accent focus:text-accent-foreground"
                    >
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-muted-foreground text-sm">Metode Pembayaran</Label>
              <Select 
                value={form.metode_pembayaran} 
                onValueChange={(v) => updateForm('metode_pembayaran', v)}
              >
                <SelectTrigger className="mt-1 bg-muted border-border text-foreground focus:border-[#60A5FA]">
                  <SelectValue placeholder="Pilih metode pembayaran" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border" position="popper" sideOffset={4}>
                  {pembayaranOptions.map((opt) => (
                    <SelectItem 
                      key={opt} 
                      value={opt}
                      className="text-foreground focus:bg-accent focus:text-accent-foreground"
                    >
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-muted-foreground text-sm">Transfer Atas Nama</Label>
              <Input
                value={form.transfer_atas_nama || ''}
                onChange={(e) => updateForm('transfer_atas_nama', e.target.value)}
                placeholder="Nama rekening transfer"
                className="mt-1 bg-muted border-border text-foreground placeholder:text-muted-foreground focus:border-[#60A5FA]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-4">
            <div>
              <Label className="text-muted-foreground text-xs sm:text-sm">Total Belanja</Label>
              <div className="mt-1 p-2 sm:p-2.5 bg-muted border border-border rounded-md">
                <p className="text-sm sm:text-base font-semibold text-foreground">
                  {formatRupiah(form.total_belanja)}
                </p>
              </div>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs sm:text-sm">Ongkir</Label>
              <Input
                type="number"
                min="0"
                value={form.ongkir}
                onChange={(e) => updateForm('ongkir', parseFloat(e.target.value) || 0)}
                className="mt-1 bg-muted border-border text-foreground focus:border-[#60A5FA] text-sm"
              />
            </div>
            <div>
              <Label className="text-muted-foreground text-xs sm:text-sm">
                Penanganan 
                {form.jenis_transaksi === 'COD' && <span className="text-xs text-muted-foreground ml-1">(3%)</span>}
              </Label>
              <Input
                type="number"
                min="0"
                value={form.penanganan}
                onChange={(e) => updateForm('penanganan', parseFloat(e.target.value) || 0)}
                className="mt-1 bg-muted border-border text-foreground focus:border-[#60A5FA] text-sm"
              />
            </div>
            <div>
              <Label className="text-muted-foreground text-xs sm:text-sm">Total</Label>
              <div className="mt-1 p-2 sm:p-2.5 bg-emerald-500/20 border border-emerald-500/30 rounded-md">
                <p className="text-sm sm:text-lg font-bold text-emerald-400">
                  {formatRupiah(total)}
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Submit */}
        <div className="flex flex-col sm:flex-row justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(createPageUrl('Dashboard'))}
            className="border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground hover:text-foreground w-full sm:w-auto"
          >
            Batal
          </Button>
          <Button
            type="submit"
            disabled={createOrderMutation.isPending}
            className="bg-emerald-600 hover:bg-emerald-700 text-white w-full sm:w-auto"
          >
            {createOrderMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            {editOrderId ? 'Update Order' : 'Simpan Order'}
          </Button>
        </div>
      </form>
        </TabsContent>

        {!editOrderId && (
        <TabsContent value="upload">
          <Card className="bg-card border-border p-4 sm:p-6">
            <h2 className="text-base sm:text-lg font-semibold text-foreground mb-4">Upload File Excel</h2>
            
            <div className="space-y-4">
              <div>
                <Label className="text-muted-foreground text-sm">
                  Pilih File (.xlsx, .csv)
                </Label>
                <Input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={(e) => {
                    if (e.target.files[0]) {
                      handleBulkUpload(e.target.files[0]);
                      e.target.value = '';
                    }
                  }}
                  disabled={uploading}
                  className="mt-2 bg-muted border-border text-foreground"
                />
              </div>

              {uploading && uploadProgress.total > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 px-4 py-2 bg-muted border border-emerald-500/30 rounded-md">
                    <Loader2 className="w-4 h-4 text-emerald-500 animate-spin" />
                    <div className="flex-1 flex items-center gap-4 text-sm">
                      <span className="text-emerald-400 font-semibold">
                        {uploadProgress.current} / {uploadProgress.total}
                      </span>
                      <span className="text-muted-foreground">
                        ✓ {uploadProgress.inserted} | ✗ {uploadProgress.failed}
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500 transition-all duration-300"
                      style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {!uploading && uploadProgress.errors.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-md">
                    <AlertCircle className="w-4 h-4 text-red-400" />
                    <span className="text-sm text-red-400">
                      {uploadProgress.failed} data gagal
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

              <Card className="bg-muted border-border p-4">
                <h3 className="font-semibold text-foreground mb-3 text-sm">Format File Excel</h3>
                <div className="space-y-2 text-xs text-muted-foreground">
                  <p><strong className="text-emerald-400">Kolom Wajib:</strong></p>
                  <p>• Tanggal Order | Nama Pemesan | Alamat | No Telepon</p>
                  <p>• Jasa Pengiriman | Jenis Transaksi | Provinsi | Kota/Kab | Kecamatan</p>
                  <p>• Total Belanja | Ongkir | Penanganan</p>
                  
                  <p className="pt-2"><strong className="text-emerald-400">Kolom Opsional:</strong></p>
                  <p>• Kode Pos | Kode Kecamatan | Berat (kg) | Ketentuan</p>
                  <p>• Metode Pembayaran | Instruksi</p>
                  
                  <p className="pt-2"><strong className="text-emerald-400">Format Items:</strong></p>
                  <p>• Kolom "Items" format: <code className="text-emerald-400">Produk1:qty:harga|Produk2:qty:harga</code></p>
                  <p className="text-muted-foreground italic">Contoh: Shampoo:2:50000|Conditioner:1:45000</p>
                </div>
              </Card>
            </div>
          </Card>
        </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
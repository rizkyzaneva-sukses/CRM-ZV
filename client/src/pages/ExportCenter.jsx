import React, { useState } from 'react';
import { api } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Download, 
  FileSpreadsheet, 
  Truck,
  Package,
  Loader2,
  CheckCircle,
  Calendar
} from 'lucide-react';
import { normalizeShippingService } from '@/components/utils/shippingUtils';
import { formatInJakarta } from '@/components/utils/dateUtils';

const SAP_SENDER = {
  nama: 'Zaneva',
  alamat: 'Jl. HR. Danurasmaya No.12, Cibabat, Kec. Cimahi Utara, Kota Cimahi, Jawa Barat 40513',
  telepon: '6289601245330'
};

const JNT_SENDER = {
  nama: 'ZANEVA HIJAB',
  telepon: '6289601245330',
  kota: 'CIMAHI',
  alamat: 'Jl. Pesantren Gg. HR. Danu Rasmaya RT. 003 RW. 007 No. 12, Cibabat, Cimahi Utara. Kota Cimahi 4051'
};

export default function ExportCenter({ user, customRole }) {
  const isFinance = customRole === 'FINANCE' || customRole === 'OWNER' || customRole === 'INVENTORI';
  const [exporting, setExporting] = useState(null);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  // Get orders by date range — filter dikirim ke server, bukan client-side
  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ['ordersExport', user?.email, isFinance, startDate, endDate],
    queryFn: async () => {
      const params = { limit: 2000, date_from: startDate, date_to: endDate };
      if (!isFinance) params.created_by = user?.email;
      const data = await api.getOrders(params);
      return data.orders || [];
    },
    enabled: !!user,
  });

  // allOrderItems TIDAK di-load saat halaman buka — di-fetch on-demand saat export diklik
  // Lihat fungsi fetchItemsForOrders di masing-masing export handler

  // Filter orders for each export type
  const sapOrders = orders.filter(o => 
    o.status_pesanan === 'READY_TO_PROCESS' && 
    normalizeShippingService(o.jasa_pengiriman) === 'sap' &&
    !o.no_resi
  );

  const jntOrders = orders.filter(o => 
    o.status_pesanan === 'READY_TO_PROCESS' && 
    normalizeShippingService(o.jasa_pengiriman) === 'jnt' &&
    !o.no_resi
  );

  const otherExpedisiOrders = orders.filter(o => {
    const normalized = normalizeShippingService(o.jasa_pengiriman);
    return o.status_pesanan === 'READY_TO_PROCESS' && 
      normalized !== 'sap' &&
      normalized !== 'jnt' &&
      !o.no_resi;
  });

  const resiOrders = orders.filter(o => o.no_resi);

  // Fetch items untuk sekumpulan order IDs secara batch
  const fetchItemsForOrders = async (orderIds) => {
    const results = await Promise.all(
      orderIds.map(id => api.getOrderItems({ order_id: id, limit: 50 }).then(r => r.order_items || []))
    );
    const map = {};
    orderIds.forEach((id, i) => { map[id] = results[i]; });
    return map;
  };

  const getItemDescriptionFromMap = (orderId, itemsMap) => {
    const items = itemsMap[orderId] || [];
    return items.map(item => `${item.nama_produk} (${item.qty})`).join(', ') || '-';
  };

  const getTotalQtyFromMap = (orderId, itemsMap) => {
    const items = itemsMap[orderId] || [];
    return items.reduce((sum, item) => sum + (item.qty || 0), 0);
  };

  // Export to CSV function
  const downloadCSV = (data, filename, headers) => {
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(h => {
          const value = row[h] ?? '';
          // Escape quotes and wrap in quotes if contains comma
          const strValue = String(value);
          if (strValue.includes(',') || strValue.includes('"') || strValue.includes('\n')) {
            return `"${strValue.replace(/"/g, '""')}"`;
          }
          return strValue;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  };

  const exportSAP = async () => {
    setExporting('sap');
    try {
      const headers = [
        'ID TIPE PICKUP', 'KODE LAYANAN', 'KODE ISI BARANG', 'ID KECAMATAN PENERIMA',
        'DESKRIPSI ITEM', 'KILO', 'KOLI', 'PANJANG', 'LEBAR', 'TINGGI',
        'INSTRUKSI SPESIAL', 'COD / NONCOD', 'NILAI COD', 'NILAI BARANG',
        'NAMA PENGIRIM', 'ALAMAT PENGIRIM', 'TELEPHONE PENGIRIM',
        'NAMA PENERIMA', 'ALAMAT PENERIMA', 'TELEPHONE PENERIMA',
        'TIPE DISKON', 'PERSENTASE DISKON', 'NILAI ASURANSI',
        'KODE PACKING', 'BIAYA LAINYA ( CHARGE )', 'REFERENSI', 'NOMOR AWB'
      ];

      // Validate SAP orders have kecamatan_kode
      const invalidOrders = sapOrders.filter(o => !o.kecamatan_kode);
      if (invalidOrders.length > 0) {
        alert(`Error: ${invalidOrders.length} order tidak memiliki kode kecamatan SAP. Harap perbaiki terlebih dahulu.`);
        setExporting(null);
        return;
      }

      // Fetch items on-demand
      const itemsMap = await fetchItemsForOrders(sapOrders.map(o => o.id));

      const data = sapOrders.map((order, index) => {
        const nilaiBarang = order.total_belanja || 0;
        const nilaiAsuransi = nilaiBarang > 500000 ? 0.3 : '';

        return {
          'ID TIPE PICKUP': 1,
          'KODE LAYANAN': 'UDRREG',
          'KODE ISI BARANG': 'SHTPC',
          'ID KECAMATAN PENERIMA': order.kecamatan_kode,
          'DESKRIPSI ITEM': getItemDescriptionFromMap(order.id, itemsMap),
          'KILO': order.berat_kg || 1,
          'KOLI': 1,
          'PANJANG': 1,
          'LEBAR': 1,
          'TINGGI': 1,
          'INSTRUKSI SPESIAL': order.instruksi_pengiriman || '',
          'COD / NONCOD': order.jenis_transaksi === 'COD' ? 2 : 1,
          'NILAI COD': order.jenis_transaksi === 'COD' ? order.total : '',
          'NILAI BARANG': nilaiBarang,
          'NAMA PENGIRIM': SAP_SENDER.nama,
          'ALAMAT PENGIRIM': SAP_SENDER.alamat,
          'TELEPHONE PENGIRIM': SAP_SENDER.telepon,
          'NAMA PENERIMA': order.nama_pemesan,
          'ALAMAT PENERIMA': order.alamat,
          'TELEPHONE PENERIMA': order.no_telepon,
          'TIPE DISKON': 39,
          'PERSENTASE DISKON': 0,
          'NILAI ASURANSI': nilaiAsuransi,
          'KODE PACKING': '',
          'BIAYA LAINYA ( CHARGE )': '',
          'REFERENSI': '',
          'NOMOR AWB': ''
        };
      });

      downloadCSV(data, `template_sap_${new Date().toISOString().split('T')[0]}.csv`, headers);
    } finally {
      setExporting(null);
    }
  };

  const exportJNT = async () => {
    setExporting('jnt');
    try {
      const headers = [
        'Berat', 'Nama Pengirim', 'Telepon Pengirim', 'Provinsi Pengirim', 'Kota Pengirim',
        'Daerah Pengirim', 'Alamat Pengirim', 'Informasi Alamat Pengirim', 'Apakah Dropship?',
        ' Nama Dropshiper', 'Telfon Dropshiper', 'Nama Penerima', 'Telepon Penerima',
        'Provinsi Penerima', 'Kota Penerima', 'Kecamatan', 'Alamat Penerima',
        'Informasi Alamat Penerima', 'Cara Pembayaran', 'Nama Barang', 'Kategori Barang',
        'Nilai Barang', 'Jenis asuransi', 'Apakah Input Asuransi?',
        'Jumlah', 'Jenis Barang', 'Keterangan', 'Nomor pesanan e-commerce',
        'COD', 'Jenis Layanan', 'Biaya Pengiriman', 'Biaya Lainnya'
      ];

      // Fetch items on-demand
      const itemsMap = await fetchItemsForOrders(jntOrders.map(o => o.id));

      const data = jntOrders.map(order => ({
        'Berat': order.berat_kg || 1,
        'Nama Pengirim': JNT_SENDER.nama,
        'Telepon Pengirim': JNT_SENDER.telepon,
        'Provinsi Pengirim': 'JAWA BARAT',
        'Kota Pengirim': JNT_SENDER.kota,
        'Daerah Pengirim': 'CIMAHI UTARA',
        'Alamat Pengirim': JNT_SENDER.alamat,
        'Informasi Alamat Pengirim': '',
        'Apakah Dropship?': 0,
        ' Nama Dropshiper': '',
        'Telfon Dropshiper': '',
        'Nama Penerima': order.nama_pemesan,
        'Telepon Penerima': order.no_telepon,
        'Provinsi Penerima': order.provinsi || '',
        'Kota Penerima': order.kota_kab || '',
        'Kecamatan': order.kecamatan || '',
        'Alamat Penerima': order.alamat,
        'Informasi Alamat Penerima': 0,
        'Cara Pembayaran': 'BULANAN',
        'Nama Barang': getItemDescriptionFromMap(order.id, itemsMap),
        'Kategori Barang': '',
        'Nilai Barang': order.total_belanja || 0,
        'Jenis asuransi': 0,
        'Apakah Input Asuransi?': 0,
        'Jumlah': getTotalQtyFromMap(order.id, itemsMap),
        'Jenis Barang': 'BARANG',
        'Keterangan': 'TOLONG HUBUNGI SEBELUM DIKIRIM!',
        'Nomor pesanan e-commerce': '',
        'COD': order.jenis_transaksi === 'COD' ? order.total : '',
        'Jenis Layanan': 'EZ',
        'Biaya Pengiriman': '',
        'Biaya Lainnya': ''
      }));

      downloadCSV(data, `template_jnt_${new Date().toISOString().split('T')[0]}.csv`, headers);
    } finally {
      setExporting(null);
    }
  };

  const exportCRM = async () => {
    setExporting('crm');
    try {
      const headers = [
        'No Pesanan', 'Status Pesanan', 'No. Resi', 'Waktu Pesanan Dibuat',
        'Metode Pembayaran', 'Nomor Referensi SKU', 'Harga Setelah Diskon',
        'ONGKIR', 'HARGA AKHIR', 'Jumlah', 'Kota/Kabupaten', 'Provinsi',
        'Platform', 'Username (Pembeli)', 'Nama Penerima', 'No. Telepon',
        'Alamat Pengiriman', 'Jasa Pengiriman', 'PLN/INPUT', 'Tgl Kirim'
      ];

      // Fetch items on-demand untuk semua resiOrders
      const itemsMap = await fetchItemsForOrders(resiOrders.map(o => o.id));

      // Create rows per item with proper ongkir division
      const data = [];
      for (const order of resiOrders) {
        const items = itemsMap[order.id] || [];
        const totalQty = items.reduce((sum, item) => sum + (item.qty || 1), 0) || 1;
        const ongkirPerItem = (order.ongkir || 0) / totalQty;
        
        if (items.length === 0) {
          // If no items, create one row with order info
          const hargaSetelahDiskon = 0;
          let hargaAkhir = hargaSetelahDiskon + ongkirPerItem;
          if (order.jenis_transaksi === 'COD') {
            hargaAkhir += hargaAkhir * 0.03; // Add 3% handling fee for COD
          }
          
          data.push({
            'No Pesanan': order.order_number,
            'Status Pesanan': 'Perlu Dikirim',
            'No. Resi': order.no_resi,
            'Waktu Pesanan Dibuat': order.created_date,
            'Metode Pembayaran': order.jenis_transaksi === 'CASH' ? 'TRANSFER' : 'COD',
            'Nomor Referensi SKU': '-',
            'Harga Setelah Diskon': hargaSetelahDiskon,
            'ONGKIR': ongkirPerItem,
            'HARGA AKHIR': Math.round(hargaAkhir),
            'Jumlah': 1,
            'Kota/Kabupaten': order.kota_kab || '',
            'Provinsi': order.provinsi || '',
            'Platform': 'CRM',
            'Username (Pembeli)': order.nama_pemesan,
            'Nama Penerima': order.nama_pemesan,
            'No. Telepon': order.no_telepon,
            'Alamat Pengiriman': order.alamat,
            'Jasa Pengiriman': order.jasa_pengiriman || '',
            'PLN/INPUT': order.created_by,
            'Tgl Kirim': ''
            });
            } else {
            for (const item of items) {
            const hargaSetelahDiskon = item.harga_setelah_diskon || 0;
            let hargaAkhir = hargaSetelahDiskon + ongkirPerItem;
            if (order.jenis_transaksi === 'COD') {
              hargaAkhir += hargaAkhir * 0.03; // Add 3% handling fee for COD
            }
            
            data.push({
              'No Pesanan': order.order_number,
              'Status Pesanan': 'Perlu Dikirim',
              'No. Resi': order.no_resi,
              'Waktu Pesanan Dibuat': order.created_date,
              'Metode Pembayaran': order.jenis_transaksi === 'CASH' ? 'TRANSFER' : 'COD',
              'Nomor Referensi SKU': item.sku || item.nama_produk,
              'Harga Setelah Diskon': hargaSetelahDiskon,
              'ONGKIR': Math.round(ongkirPerItem),
              'HARGA AKHIR': Math.round(hargaAkhir),
              'Jumlah': item.qty || 1,
              'Kota/Kabupaten': order.kota_kab || '',
              'Provinsi': order.provinsi || '',
              'Platform': 'CRM',
              'Username (Pembeli)': order.nama_pemesan,
              'Nama Penerima': order.nama_pemesan,
              'No. Telepon': order.no_telepon,
              'Alamat Pengiriman': order.alamat,
              'Jasa Pengiriman': item.jasa_pengiriman || order.jasa_pengiriman || '',
              'PLN/INPUT': order.created_by,
              'Tgl Kirim': ''
            });
          }
        }
      }

      downloadCSV(data, `template_crm_${new Date().toISOString().split('T')[0]}.csv`, headers);
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Export Center</h1>
        <p className="text-muted-foreground mt-1">
          Download template untuk upload ke ekspedisi atau CRM
        </p>
      </div>

      {isFinance && (
        <Card className="bg-card border-border p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-emerald-400" />
            </div>
            <h3 className="font-semibold text-foreground">Filter Tanggal</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground">Tanggal Mulai</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1 bg-muted border-border text-foreground"
              />
            </div>
            <div>
              <Label className="text-muted-foreground">Tanggal Akhir</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-1 bg-muted border-border text-foreground"
              />
            </div>
          </div>
          <p className="text-sm text-emerald-400 mt-3">
            📊 Menampilkan order dari {formatInJakarta(startDate, 'dd/MM/yyyy')} - {formatInJakarta(endDate, 'dd/MM/yyyy')}
          </p>
        </Card>
      )}

      {!isFinance && (
        <Card className="bg-card border-border p-4">
          <p className="text-sm text-emerald-400">
            📅 Data Order Hari Ini: {formatInJakarta(new Date(), 'dd/MM/yyyy')}
          </p>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* SAP Template */}
        <Card className="bg-card border-border p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <Truck className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Template SAP</h3>
              <p className="text-sm text-muted-foreground">{sapOrders.length} order</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            {isFinance ? 'Order periode terpilih' : 'Order hari ini'} dengan jasa SAP yang Ready to Process dan belum ada resi
          </p>
          <Button
            onClick={exportSAP}
            disabled={exporting === 'sap' || sapOrders.length === 0}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            {exporting === 'sap' ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            Download
          </Button>
        </Card>

        {/* JNT Template */}
        <Card className="bg-card border-border p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
              <Package className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Template J&T</h3>
              <p className="text-sm text-muted-foreground">{jntOrders.length} order</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            {isFinance ? 'Order periode terpilih' : 'Order hari ini'} dengan jasa J&T yang Ready to Process dan belum ada resi
          </p>
          <Button
            onClick={exportJNT}
            disabled={exporting === 'jnt' || jntOrders.length === 0}
            className="w-full bg-amber-600 hover:bg-amber-700 text-white"
          >
            {exporting === 'jnt' ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            Download
          </Button>
        </Card>

        {/* CRM Template */}
        <Card className="bg-card border-border p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
              <FileSpreadsheet className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Template CRM</h3>
              <p className="text-sm text-muted-foreground">{resiOrders.length} order</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            {isFinance ? 'Order periode terpilih' : 'Order hari ini'} yang sudah memiliki No. Resi, per baris per item produk
          </p>
          <Button
            onClick={exportCRM}
            disabled={exporting === 'crm' || resiOrders.length === 0}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {exporting === 'crm' ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            Download
          </Button>
        </Card>
      </div>

      {/* Info */}
      <Card className="bg-card border-border p-6">
        <h3 className="font-semibold text-foreground mb-3">Informasi Export</h3>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
            <span><strong>Template SAP:</strong> Untuk order {isFinance ? 'periode terpilih' : 'hari ini'} dengan jasa pengiriman SAP yang status Ready to Process dan belum ada resi</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
            <span><strong>Template J&T:</strong> Untuk order {isFinance ? 'periode terpilih' : 'hari ini'} dengan jasa J&T yang status Ready to Process dan belum ada resi</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
            <span><strong>Template CRM:</strong> Untuk order {isFinance ? 'periode terpilih' : 'hari ini'} yang sudah memiliki No. Resi, per baris per item produk</span>
          </li>
        </ul>
      </Card>
    </div>
  );
}
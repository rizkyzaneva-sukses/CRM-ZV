import React, { useState, useEffect, useMemo } from 'react';
import { api } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import StatsCard from '@/components/dashboard/StatsCard';
import OrdersTable from '@/components/dashboard/OrdersTable';
import OrderFilters from '@/components/forms/OrderFilters';
import SalesChart from '@/components/dashboard/SalesChart';
import StatusPieChart from '@/components/dashboard/StatusPieChart';
import ShippingPerformance from '@/components/dashboard/ShippingPerformance';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { 
  Package, 
  Clock, 
  CheckCircle, 
  Truck,
  Download 
} from 'lucide-react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, parseISO } from 'date-fns';
import { getTodayJakarta, formatInJakarta } from '@/components/utils/dateUtils';

export default function Dashboard({ user, customRole }) {
  const isInventori = customRole === 'INVENTORI';

  const [filters, setFilters] = useState({
    search: '',
    dateFrom: '',
    dateTo: '',
    status: 'all',
    jasa: 'all',
  });

  const isStaff = customRole === 'STAFF';
  const today = getTodayJakarta();

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['orders', user?.email, customRole],
    queryFn: async () => {
      if (isStaff) {
        const data = await api.getOrders({ created_by: user?.email, limit: 500 });
        return data.orders || [];
      } else {
        const data = await api.getOrders({ limit: 1000 });
        return data.orders || [];
      }
    },
    enabled: !!user,
  });

  const { data: allOrderItems = [] } = useQuery({
    queryKey: ['allOrderItems'],
    queryFn: () => api.getOrderItems({ limit: 5000 }).then(res => res.order_items || []),
  });

  const { data: shippingServices = [] } = useQuery({
    queryKey: ['shippingServices'],
    queryFn: () => api.getShippingServices().then(res => res.shipping_services || []),
  });

  const stats = useMemo(() => {
    const todayOrders = orders.filter(o => o.order_date === today);
    const waitingFinance = orders.filter(o => o.status_pesanan === 'WAITING_FINANCE');
    const readyToProcess = orders.filter(o => o.status_pesanan === 'READY_TO_PROCESS');
    const resiUpdated = orders.filter(o => o.status_pesanan === 'RESI_UPDATED');

    return {
      today: todayOrders.length,
      waitingFinance: waitingFinance.length,
      readyToProcess: readyToProcess.length,
      resiUpdated: resiUpdated.length,
    };
  }, [orders, today]);

  // Daily sales data (last 7 days)
  const dailySalesData = useMemo(() => {
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
      const dayOrders = orders.filter(o => o.order_date === date);
      const total = dayOrders.reduce((sum, o) => sum + (o.total || 0), 0);
      last7Days.push({
        name: format(subDays(new Date(), i), 'dd MMM'),
        total: total,
        count: dayOrders.length
      });
    }
    return last7Days;
  }, [orders]);

  // Weekly sales data (last 4 weeks)
  const weeklySalesData = useMemo(() => {
    const weeks = [];
    for (let i = 3; i >= 0; i--) {
      const weekStart = startOfWeek(subDays(new Date(), i * 7), { weekStartsOn: 1 });
      const weekEnd = endOfWeek(subDays(new Date(), i * 7), { weekStartsOn: 1 });
      const weekOrders = orders.filter(o => {
        if (!o.order_date) return false;
        const orderDate = parseISO(o.order_date);
        return orderDate >= weekStart && orderDate <= weekEnd;
      });
      const total = weekOrders.reduce((sum, o) => sum + (o.total || 0), 0);
      weeks.push({
        name: `Week ${i === 0 ? 'Ini' : i + 1}`,
        total: total,
        count: weekOrders.length
      });
    }
    return weeks.reverse();
  }, [orders]);

  // Monthly sales data (last 6 months)
  const monthlySalesData = useMemo(() => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = startOfMonth(subDays(new Date(), i * 30));
      const monthEnd = endOfMonth(subDays(new Date(), i * 30));
      const monthOrders = orders.filter(o => {
        if (!o.order_date) return false;
        const orderDate = parseISO(o.order_date);
        return orderDate >= monthStart && orderDate <= monthEnd;
      });
      const total = monthOrders.reduce((sum, o) => sum + (o.total || 0), 0);
      months.push({
        name: format(monthStart, 'MMM'),
        total: total,
        count: monthOrders.length
      });
    }
    return months;
  }, [orders]);

  // Status distribution
  const statusData = useMemo(() => {
    const statusCount = {};
    orders.forEach(o => {
      const status = o.status_pesanan || 'DRAFT';
      statusCount[status] = (statusCount[status] || 0) + 1;
    });
    return Object.entries(statusCount).map(([name, value]) => ({ name, value }));
  }, [orders]);

  // Shipping service performance
  const shippingData = useMemo(() => {
    const shippingCount = {};
    orders.forEach(o => {
      const jasa = o.jasa_pengiriman || 'unknown';
      shippingCount[jasa] = (shippingCount[jasa] || 0) + 1;
    });
    return Object.entries(shippingCount)
      .map(([id, value]) => ({ 
        id, 
        name: id.toUpperCase(), 
        value 
      }))
      .sort((a, b) => b.value - a.value);
  }, [orders]);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      if (filters.search) {
        const search = filters.search.toLowerCase();
        const matchSearch = 
          (order.nama_pemesan || '').toLowerCase().includes(search) ||
          (order.no_telepon || '').toLowerCase().includes(search) ||
          (order.order_number || '').toLowerCase().includes(search);
        if (!matchSearch) return false;
      }

      if (filters.dateFrom && order.order_date < filters.dateFrom) {
        return false;
      }
      if (filters.dateTo && order.order_date > filters.dateTo) {
        return false;
      }

      if (filters.status !== 'all' && order.status_pesanan !== filters.status) {
        return false;
      }

      if (filters.jasa !== 'all' && order.jasa_pengiriman !== filters.jasa) {
        return false;
      }

      return true;
    });
  }, [orders, filters]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleClearFilters = () => {
    setFilters({
      search: '',
      dateFrom: '',
      dateTo: '',
      status: 'all',
      jasa: 'all',
    });
  };

  const handleDownloadOrders = () => {
    if (filteredOrders.length === 0) {
      alert('Tidak ada data untuk didownload');
      return;
    }

    const csvHeaders = [
      'No Pesanan',
      'Nomor Referensi SKU',
      'Jumlah',
      'Waktu Pesanan Dibuat',
      'Status Pesanan',
      'No. Resi',
      'Metode Pembayaran',
      'Harga Setelah Diskon',
      'ONGKIR',
      'HARGA AKHIR',
      'Kota/Kabupaten',
      'Provinsi',
      'Platform',
      'Username (Pembeli)',
      'Nama Penerima',
      'No. Telepon',
      'Alamat Pengiriman',
      'PLN/INPUT',
      'Tgl Kirim'
    ].join(',');

    const csvRows = [];
    filteredOrders.forEach(order => {
      const items = allOrderItems.filter(item => item.order_id === order.id);
      const shippingService = shippingServices.find(s => s.code === order.jasa_pengiriman);
      const platformName = shippingService ? shippingService.name : (order.jasa_pengiriman || '');
      
      if (items.length === 0) {
        csvRows.push([
          order.order_number || '',
          '',
          '',
          order.created_date ? formatInJakarta(order.created_date, 'dd/MM/yyyy HH:mm') : '',
          order.status_pesanan || '',
          order.no_resi || '',
          order.metode_pembayaran || '',
          '',
          order.ongkir || 0,
          order.total || 0,
          order.kota_kab || '',
          order.provinsi || '',
          platformName,
          order.nama_pemesan || '',
          order.nama_pemesan || '',
          order.no_telepon || '',
          `"${(order.alamat || '').replace(/"/g, '""')}"`,
          order.created_by || '',
          order.order_date || ''
        ].join(','));
      } else {
        items.forEach(item => {
          const itemJasa = item.jasa_pengiriman || order.jasa_pengiriman || '';
          const itemShippingService = shippingServices.find(s => s.code === itemJasa);
          const itemPlatformName = itemShippingService ? itemShippingService.name : itemJasa;
          csvRows.push([
            order.order_number || '',
            item.sku || '',
            item.qty || 0,
            order.created_date ? formatInJakarta(order.created_date, 'dd/MM/yyyy HH:mm') : '',
            order.status_pesanan || '',
            order.no_resi || '',
            order.metode_pembayaran || '',
            item.harga_setelah_diskon || 0,
            order.ongkir || 0,
            order.total || 0,
            order.kota_kab || '',
            order.provinsi || '',
            itemPlatformName,
            order.nama_pemesan || '',
            order.nama_pemesan || '',
            order.no_telepon || '',
            `"${(order.alamat || '').replace(/"/g, '""')}"`,
            order.created_by || '',
            order.order_date || ''
          ].join(','));
        });
      }
    });

    const csv = [csvHeaders, ...csvRows].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const dateLabel = filters.dateFrom ? `_${filters.dateFrom}${filters.dateTo ? '_sd_' + filters.dateTo : ''}` : '';
    a.download = `orders${dateLabel}_${formatInJakarta(new Date(), 'yyyyMMdd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Tampilan khusus untuk role INVENTORI
  if (isInventori) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Daftar semua order</p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <OrderFilters
              filters={filters}
              onFilterChange={handleFilterChange}
              onClear={handleClearFilters}
            />
            <Button
              onClick={handleDownloadOrders}
              disabled={filteredOrders.length === 0}
              className="bg-emerald-600 hover:bg-emerald-700 text-white whitespace-nowrap"
            >
              <Download className="w-4 h-4 mr-2" />
              Download ({filteredOrders.length})
            </Button>
          </div>

          <OrdersTable orders={filteredOrders} loading={isLoading} customRole={customRole} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          {isStaff ? 'Overview order Anda' : 'Overview semua order'}
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Order Hari Ini"
          value={stats.today}
          icon={Package}
          color="emerald"
        />
        <StatsCard
          title="Waiting Finance"
          value={stats.waitingFinance}
          icon={Clock}
          color="amber"
        />
        <StatsCard
          title="Ready to Process"
          value={stats.readyToProcess}
          icon={CheckCircle}
          color="blue"
        />
        <StatsCard
          title="Resi Updated"
          value={stats.resiUpdated}
          icon={Truck}
          color="purple"
        />
      </div>

      {/* Sales Charts */}
      <Tabs defaultValue="daily" className="space-y-4">
        <TabsList className="bg-card border border-border">
          <TabsTrigger 
            value="daily"
            className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white"
          >
            Harian (7 Hari)
          </TabsTrigger>
          <TabsTrigger 
            value="weekly"
            className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white"
          >
            Mingguan
          </TabsTrigger>
          <TabsTrigger 
            value="monthly"
            className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white"
          >
            Bulanan
          </TabsTrigger>
        </TabsList>

        <TabsContent value="daily">
          <SalesChart 
            data={dailySalesData} 
            title="Penjualan Harian (7 Hari Terakhir)" 
          />
        </TabsContent>

        <TabsContent value="weekly">
          <SalesChart 
            data={weeklySalesData} 
            title="Penjualan Mingguan" 
          />
        </TabsContent>

        <TabsContent value="monthly">
          <SalesChart 
            data={monthlySalesData} 
            title="Penjualan Bulanan (6 Bulan Terakhir)" 
          />
        </TabsContent>
      </Tabs>

      {/* Performance Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StatusPieChart 
          data={statusData} 
          title="Distribusi Status Pesanan" 
        />
        <ShippingPerformance 
          data={shippingData} 
          title="Performa Jasa Pengiriman" 
        />
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <OrderFilters
            filters={filters}
            onFilterChange={handleFilterChange}
            onClear={handleClearFilters}
          />
          <Button
            onClick={handleDownloadOrders}
            disabled={filteredOrders.length === 0}
            className="bg-emerald-600 hover:bg-emerald-700 text-white whitespace-nowrap"
          >
            <Download className="w-4 h-4 mr-2" />
            Download ({filteredOrders.length})
          </Button>
        </div>

        <OrdersTable orders={filteredOrders} loading={isLoading} customRole={customRole} />
      </div>
    </div>
  );
}
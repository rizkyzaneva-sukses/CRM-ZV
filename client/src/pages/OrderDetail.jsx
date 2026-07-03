import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import StatusBadge from "@/components/ui/StatusBadge";
import { 
  ArrowLeft, 
  Download, 
  CheckCircle, 
  XCircle,
  Loader2,
  Package,
  User,
  MapPin,
  CreditCard,
  Truck,
  Printer
} from 'lucide-react';
import { formatInJakarta } from '@/components/utils/dateUtils';

export default function OrderDetail({ user, customRole }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const orderId = urlParams.get('id');

  const isFinance = customRole === 'FINANCE' || customRole === 'OWNER';
  const isStaff = customRole === 'STAFF';

  const { data: order, isLoading: orderLoading } = useQuery({
    queryKey: ['order', orderId],
    queryFn: async () => {
      const data = await api.getOrder(orderId);
      return data.order || null;
    },
    enabled: !!orderId,
  });

  const { data: orderItems = [] } = useQuery({
    queryKey: ['orderItems', orderId],
    queryFn: () => api.getOrderItems({ order_id: orderId }).then(res => res.order_items || []),
    enabled: !!orderId,
  });

  const approveMutation = useMutation({
    mutationFn: async (status) => {
      await api.updateOrder(orderId, {
        finance_status: status,
        status_pesanan: status === 'APPROVED' ? 'READY_TO_PROCESS' : 'REJECTED',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['order', orderId]);
      queryClient.invalidateQueries(['orders']);
    },
  });

  // Check access
  const hasAccess = isFinance || order?.created_by === user?.email;

  if (orderLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Order tidak ditemukan</p>
        <Button
          onClick={() => navigate(createPageUrl('Dashboard'))}
          className="mt-4"
        >
          Kembali ke Dashboard
        </Button>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="text-center py-12">
        <p className="text-red-400">Anda tidak memiliki akses ke order ini</p>
        <Button
          onClick={() => navigate(createPageUrl('Dashboard'))}
          className="mt-4"
        >
          Kembali ke Dashboard
        </Button>
      </div>
    );
  }

  const canApprove = isFinance && order.status_pesanan === 'WAITING_FINANCE';

  const handlePrintInvoice = () => {
    window.print();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Print Styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          * { color: black !important; background: white !important; border-color: #ccc !important; }
        }
      `}</style>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(createPageUrl('Dashboard'))}
            className="no-print text-muted-foreground hover:text-foreground hover:bg-accent hover:text-accent-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali
          </Button>
          <div>
            <h1 className="text-xl font-bold text-foreground">{order.order_number}</h1>
            <StatusBadge status={order.status_pesanan} />
          </div>
        </div>
        
        <div className="flex gap-2 no-print">
          <Button
            onClick={handlePrintInvoice}
            variant="outline"
            className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
          >
            <Printer className="w-4 h-4 mr-2" />
            Print Invoice
          </Button>
          {canApprove && (
            <>
              <Button
                onClick={() => approveMutation.mutate('APPROVED')}
                disabled={approveMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Approve
              </Button>
              <Button
                onClick={() => approveMutation.mutate('REJECTED')}
                disabled={approveMutation.isPending}
                variant="destructive"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Reject
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Order Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Customer Info */}
        <Card className="bg-card border-border p-5">
          <div className="flex items-center gap-2 mb-4">
            <User className="w-5 h-5 text-emerald-400" />
            <h3 className="font-semibold text-foreground">Informasi Pemesan</h3>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground">Nama</p>
              <p className="text-foreground font-medium">{order.nama_pemesan}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Telepon</p>
              <p className="text-foreground">{order.no_telepon}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Tanggal Order</p>
              <p className="text-foreground">
                {order.order_date ? formatInJakarta(order.order_date, 'dd/MM/yyyy') : '—'}
              </p>
            </div>
          </div>
        </Card>

        {/* Shipping Info */}
        <Card className="bg-card border-border p-5">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="w-5 h-5 text-blue-400" />
            <h3 className="font-semibold text-foreground">Alamat Pengiriman</h3>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground">Alamat</p>
              <p className="text-foreground">{order.alamat}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Kecamatan</p>
              <p className="text-foreground">
                {order.kecamatan}, {order.kota_kab}, {order.provinsi}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Kode Pos</p>
              <p className="text-foreground">{order.kode_pos || '—'}</p>
            </div>
          </div>
        </Card>

        {/* Delivery Info */}
        <Card className="bg-card border-border p-5">
          <div className="flex items-center gap-2 mb-4">
            <Truck className="w-5 h-5 text-purple-400" />
            <h3 className="font-semibold text-foreground">Informasi Pengiriman</h3>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground">Jasa Pengiriman</p>
              <p className="text-foreground uppercase font-medium">{order.jasa_pengiriman}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Berat</p>
              <p className="text-foreground">{order.berat_kg} kg</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">No. Resi</p>
              <p className={`font-medium ${order.no_resi ? 'text-emerald-400' : 'text-muted-foreground'}`}>
                {order.no_resi || '— Belum ada resi'}
              </p>
            </div>
            {order.instruksi_pengiriman && (
              <div>
                <p className="text-xs text-muted-foreground">Instruksi</p>
                <p className="text-foreground">{order.instruksi_pengiriman}</p>
              </div>
            )}
          </div>
        </Card>

        {/* Payment Info */}
        <Card className="bg-card border-border p-5">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard className="w-5 h-5 text-amber-400" />
            <h3 className="font-semibold text-foreground">Informasi Pembayaran</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between">
              <p className="text-muted-foreground">Jenis Transaksi</p>
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                order.jenis_transaksi === 'COD' 
                  ? 'bg-purple-500/20 text-purple-400' 
                  : 'bg-blue-500/20 text-blue-400'
              }`}>
                {order.jenis_transaksi}
              </span>
            </div>
            <div className="flex justify-between">
              <p className="text-muted-foreground">Metode Pembayaran</p>
              <p className="text-foreground">{order.metode_pembayaran || '—'}</p>
            </div>
            {order.transfer_atas_nama && (
              <div className="flex justify-between">
                <p className="text-muted-foreground">Transfer Atas Nama</p>
                <p className="text-foreground font-medium">{order.transfer_atas_nama}</p>
              </div>
            )}
            {order.ketentuan && (
              <div className="flex justify-between">
                <p className="text-muted-foreground">Ketentuan</p>
                <p className="text-foreground">{order.ketentuan}</p>
              </div>
            )}
            <div className="flex justify-between">
              <p className="text-muted-foreground">Total Belanja</p>
              <p className="text-foreground">Rp {(order.total_belanja || 0).toLocaleString('id-ID')}</p>
            </div>
            <div className="flex justify-between">
              <p className="text-muted-foreground">Ongkir</p>
              <p className="text-foreground">Rp {(order.ongkir || 0).toLocaleString('id-ID')}</p>
            </div>
            <div className="flex justify-between">
              <p className="text-muted-foreground">Penanganan</p>
              <p className="text-foreground">Rp {(order.penanganan || 0).toLocaleString('id-ID')}</p>
            </div>
            <div className="border-t border-border pt-3 flex justify-between">
              <p className="text-foreground font-semibold">Total</p>
              <p className="text-emerald-400 font-bold text-lg">
                Rp {(order.total || 0).toLocaleString('id-ID')}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Order Items */}
      <Card className="bg-card border-border p-5">
        <div className="flex items-center gap-2 mb-4">
          <Package className="w-5 h-5 text-emerald-400" />
          <h3 className="font-semibold text-foreground">Produk / Item</h3>
        </div>
        
        {orderItems.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">Tidak ada item</p>
        ) : (
          <div className="space-y-2">
            {orderItems.map((item, index) => (
              <div 
                key={item.id || index}
                className="p-3 bg-muted rounded-lg"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-foreground font-medium">{item.nama_produk}</p>
                    {item.sku && <p className="text-xs text-muted-foreground">SKU: {item.sku}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-foreground">x{item.qty}</p>
                    {item.harga_setelah_diskon > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Rp {item.harga_setelah_diskon.toLocaleString('id-ID')}
                      </p>
                    )}
                  </div>
                </div>
                {item.jasa_pengiriman && (
                  <div className="mt-2 pt-2 border-t border-border flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span>
                      <span className="text-purple-400 font-medium uppercase">{item.jasa_pengiriman}</span>
                      {item.berat_kg && <span className="ml-1">· {item.berat_kg} kg</span>}
                    </span>
                    {item.kecamatan && (
                      <span>{item.kecamatan}, {item.kota_kab}</span>
                    )}
                    {item.instruksi_pengiriman && (
                      <span className="italic text-muted-foreground">{item.instruksi_pengiriman}</span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Audit Info */}
      <Card className="bg-card border-border p-5">
        <h3 className="font-semibold text-foreground mb-4">Informasi Audit</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Penginput</p>
            <p className="text-foreground">{order.created_by || '—'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Dibuat</p>
            <p className="text-foreground">
              {order.created_date ? formatInJakarta(order.created_date, 'dd/MM/yyyy HH:mm') : '—'}
            </p>
          </div>
          {order.finance_verified_by && (
            <>
              <div>
                <p className="text-muted-foreground">Finance</p>
                <p className="text-foreground">{order.finance_verified_by}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Status Finance</p>
                <p className={`font-medium ${
                  order.finance_status === 'APPROVED' ? 'text-emerald-400' : 'text-red-400'
                }`}>
                  {order.finance_status}
                </p>
              </div>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}
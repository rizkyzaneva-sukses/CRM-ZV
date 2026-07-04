import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { api } from '@/lib/api';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import StatusBadge from "@/components/ui/StatusBadge";
import { Eye, FileText, Pencil, Trash2, SquarePen, Check, X } from 'lucide-react';
import { formatInJakarta } from '@/components/utils/dateUtils';
import { formatRupiah } from '@/components/utils/currencyUtils';


export default function OrdersTable({ orders, loading, customRole }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const canEditDelete = customRole === 'OWNER' || customRole === 'FINANCE';
  const [editingResiId, setEditingResiId] = useState(null);
  const [resiInput, setResiInput] = useState('');

  const updateResiMutation = useMutation({
    mutationFn: ({ orderId, no_resi }) => api.updateResi(orderId, no_resi),
    onSuccess: () => {
      queryClient.invalidateQueries(['orders']);
      setEditingResiId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (orderId) => {
      await api.deleteOrder(orderId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['orders']);
      alert('✅ Order berhasil dihapus!');
    },
    onError: (error) => {
      alert('❌ Error: ' + error.message);
    }
  });
  if (loading) {
    return (
      <div className="bg-card border border-border rounded-xl p-8 text-center">
        <p className="text-muted-foreground">Loading orders...</p>
      </div>
    );
  }

  if (!orders || orders.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-8 text-center">
        <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-muted-foreground">No orders found</p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-foreground font-semibold">No Pesanan</TableHead>
              <TableHead className="text-foreground font-semibold">Tanggal</TableHead>
              <TableHead className="text-foreground font-semibold">Nama</TableHead>
              <TableHead className="text-foreground font-semibold">Jasa Kirim</TableHead>
              <TableHead className="text-foreground font-semibold">Transaksi</TableHead>
              <TableHead className="text-foreground font-semibold text-right">Total</TableHead>
              <TableHead className="text-foreground font-semibold">Status</TableHead>
              <TableHead className="text-foreground font-semibold">No Resi</TableHead>
              <TableHead className="text-foreground font-semibold">Penginput</TableHead>
              <TableHead className="text-foreground font-semibold text-right w-32">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
              <TableRow 
                key={order.id} 
                className="border-border hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                <TableCell className="text-foreground font-medium">
                  {order.order_number || '—'}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {order.order_date ? formatInJakarta(order.order_date, 'dd MMM yyyy') : '—'}
                </TableCell>
                <TableCell className="text-foreground">{order.nama_pemesan}</TableCell>
                <TableCell className="text-muted-foreground">{order.jasa_pengiriman}</TableCell>
                <TableCell>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    order.jenis_transaksi === 'COD' 
                      ? 'bg-purple-500/20 text-purple-400' 
                      : 'bg-blue-500/20 text-blue-400'
                  }`}>
                    {order.jenis_transaksi}
                  </span>
                </TableCell>
                <TableCell className="text-foreground text-right font-medium">
                  {formatRupiah(order.total)}
                </TableCell>
                <TableCell>
                  <StatusBadge status={order.status_pesanan} />
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {editingResiId === order.id ? (
                    <div className="flex items-center gap-1">
                      <Input
                        value={resiInput}
                        onChange={e => setResiInput(e.target.value)}
                        className="h-7 text-xs w-32 bg-muted border-border text-foreground"
                        autoFocus
                        onKeyDown={e => {
                          if (e.key === 'Enter') updateResiMutation.mutate({ orderId: order.id, no_resi: resiInput });
                          if (e.key === 'Escape') setEditingResiId(null);
                        }}
                      />
                      <Button size="icon" variant="ghost" className="h-6 w-6 text-emerald-400 hover:bg-emerald-500/10"
                        onClick={() => updateResiMutation.mutate({ orderId: order.id, no_resi: resiInput })}>
                        <Check className="w-3 h-3" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-6 w-6 text-red-400 hover:bg-red-500/10"
                        onClick={() => setEditingResiId(null)}>
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 group">
                      <span>{order.no_resi || '—'}</span>
                      {canEditDelete && (
                        <button
                          onClick={() => { setEditingResiId(order.id); setResiInput(order.no_resi || ''); }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-emerald-400"
                        >
                          <SquarePen className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {order.created_by || '—'}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Link to={createPageUrl(`OrderDetail?id=${order.id}`)}>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="text-muted-foreground hover:text-foreground hover:bg-accent hover:text-accent-foreground"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </Link>
                    {canEditDelete && (
                      <>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => navigate(createPageUrl(`InputOrder?edit=${order.id}`))}
                          className="text-muted-foreground hover:text-emerald-400 hover:bg-emerald-500/10"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            if (confirm(`Hapus order ${order.order_number}?`)) {
                              deleteMutation.mutate(order.id);
                            }
                          }}
                          disabled={deleteMutation.isPending}
                          className="text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
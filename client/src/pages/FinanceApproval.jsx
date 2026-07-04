import React, { useState } from 'react';
import { api } from '@/lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import Pagination from "@/components/ui/Pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import StatusBadge from "@/components/ui/StatusBadge";
import { 
  CheckCircle, 
  XCircle, 
  Eye,
  Loader2,
  AlertTriangle
} from 'lucide-react';
import { formatInJakarta } from '@/components/utils/dateUtils';
import { formatRupiah } from '@/components/utils/currencyUtils';

export default function FinanceApproval({ user, customRole }) {
  const queryClient = useQueryClient();
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 50;

  const isFinance = customRole === 'FINANCE' || customRole === 'OWNER' || customRole === 'ADMIN' || user?.role === 'admin';

  const { data: result = {}, isLoading } = useQuery({
    queryKey: ['pendingOrders', page],
    queryFn: async () => {
      const data = await api.getOrders({
        status: 'WAITING_FINANCE',
        status_pesanan: 'WAITING_FINANCE',
        page,
        limit: PAGE_SIZE,
      });
      return { orders: data.orders || [], total: data.total || 0 };
    },
    enabled: isFinance,
    keepPreviousData: true,
  });


  const pendingOrders = result.orders || [];
  const total = result.total || 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);


  const bulkApproveMutation = useMutation({
    mutationFn: async (action) => {
      // Gunakan route bulk-finance yang khusus untuk approve/reject
      await api.bulkFinance(selectedOrders, action);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingOrders'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      setSelectedOrders([]);
    },
    onError: (err) => {
      alert('Gagal memproses bulk approval: ' + (err.message || 'Error server'));
    }
  });

  const singleApproveMutation = useMutation({
    mutationFn: async ({ orderId, action }) => {
      // Gunakan route finance yang khusus untuk approve/reject
      await api.financeAction(orderId, action);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingOrders'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (err) => {
      alert('Gagal memproses approval: ' + (err.message || 'Error server'));
    }
  });


  if (!isFinance) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
        <p className="text-foreground text-lg">Halaman ini hanya untuk Finance</p>
        <p className="text-muted-foreground mt-2">Anda tidak memiliki akses ke halaman ini</p>
      </div>
    );
  }

  const toggleSelectOrder = (orderId) => {
    setSelectedOrders(prev => 
      prev.includes(orderId) 
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedOrders.length === pendingOrders.length) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(pendingOrders.map(o => o.id));
    }
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
    setSelectedOrders([]); // clear selection when changing page
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Finance Approval</h1>
        <p className="text-muted-foreground mt-1">
          Approve atau reject order CASH yang pending
          {total > 0 && <span className="ml-2 text-emerald-400 font-medium">({total.toLocaleString('id-ID')} total)</span>}
        </p>
      </div>

      {/* Bulk Actions */}
      {selectedOrders.length > 0 && (
        <Card className="bg-card border-border p-4">
          <div className="flex items-center justify-between">
            <p className="text-foreground">
              <span className="font-semibold">{selectedOrders.length}</span> order dipilih
            </p>
            <div className="flex gap-2">
              <Button
                onClick={() => bulkApproveMutation.mutate('approve')}
                disabled={bulkApproveMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {bulkApproveMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4 mr-2" />
                )}
                Approve All
              </Button>
              <Button
                onClick={() => bulkApproveMutation.mutate('reject')}
                disabled={bulkApproveMutation.isPending}
                variant="destructive"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Reject All
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Pending Orders Table */}
      <Card className="bg-card border-border overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
          </div>
        ) : pendingOrders.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle className="w-12 h-12 text-emerald-500/30 mx-auto mb-4" />
            <p className="text-foreground text-lg">Tidak ada order pending</p>
            <p className="text-muted-foreground mt-2">Semua order CASH sudah diproses</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedOrders.length === pendingOrders.length && pendingOrders.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead className="text-foreground font-semibold">No Pesanan</TableHead>
                  <TableHead className="text-foreground font-semibold">Tanggal</TableHead>
                  <TableHead className="text-foreground font-semibold">Nama</TableHead>
                  <TableHead className="text-foreground font-semibold">Penginput</TableHead>
                  <TableHead className="text-foreground font-semibold text-right">Total</TableHead>
                  <TableHead className="text-foreground font-semibold">Transfer Atas Nama</TableHead>
                  <TableHead className="text-foreground font-semibold">Metode Pembayaran</TableHead>
                  <TableHead className="text-foreground font-semibold text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingOrders.map((order) => (
                  <TableRow 
                    key={order.id}
                    className="border-border hover:bg-accent hover:text-accent-foreground"
                  >
                    <TableCell>
                      <Checkbox
                        checked={selectedOrders.includes(order.id)}
                        onCheckedChange={() => toggleSelectOrder(order.id)}
                      />
                    </TableCell>
                    <TableCell className="text-foreground font-medium">
                      {order.order_number}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {order.order_date ? formatInJakarta(order.order_date, 'dd/MM/yyyy') : '—'}
                    </TableCell>
                    <TableCell className="text-foreground">{order.nama_pemesan}</TableCell>
                    <TableCell className="text-muted-foreground">{order.created_by}</TableCell>
                    <TableCell className="text-foreground text-right font-medium">
                      {formatRupiah(order.total)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{order.transfer_atas_nama || '—'}</TableCell>
                    <TableCell className="text-muted-foreground">{order.metode_pembayaran || '—'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link to={createPageUrl(`OrderDetail?id=${order.id}`)}>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="text-muted-foreground hover:text-foreground hover:bg-accent hover:text-accent-foreground"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </Link>
                        <Button
                          size="sm"
                          onClick={() => singleApproveMutation.mutate({ orderId: order.id, action: 'approve' })}
                          disabled={singleApproveMutation.isPending}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => singleApproveMutation.mutate({ orderId: order.id, action: 'reject' })}
                          disabled={singleApproveMutation.isPending}
                          variant="destructive"
                        >
                          <XCircle className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {/* Pagination */}
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={handlePageChange}
              total={total}
              pageSize={PAGE_SIZE}
            />
          </div>
        )}
      </Card>
    </div>
  );
}
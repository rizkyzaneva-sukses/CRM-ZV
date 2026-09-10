import React, { useState } from 'react';
import { api } from '@/lib/api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertTriangle, Trash2, Loader2 } from 'lucide-react';

export default function ResetData({ user, customRole }) {
  const isOwner = customRole === 'OWNER';
  const [confirmText, setConfirmText] = useState('');
  const queryClient = useQueryClient();

  const { data: orderCount = 0 } = useQuery({
    queryKey: ['orderCount'],
    queryFn: async () => {
      // Pakai `total` dari server, bukan panjang array yang sudah dipotong limit -
      // angka di kotak peringatan harus benar berapa pun jumlah datanya.
      const data = await api.getOrders({ limit: 1 });
      return data.total || 0;
    },
    enabled: isOwner,
  });

  const { data: itemCount = 0 } = useQuery({
    queryKey: ['itemCount'],
    queryFn: async () => {
      const data = await api.getOrderItems({ limit: 1 });
      return data.total || 0;
    },
    enabled: isOwner,
  });

  const resetMutation = useMutation({
    mutationFn: async () => {
      await api.resetAllData();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['orderCount']);
      queryClient.invalidateQueries(['itemCount']);
      queryClient.invalidateQueries(['orders']);
      setConfirmText('');
      alert('✅ Semua data berhasil di-reset (Factory Reset)!');
    },
    onError: (error) => {
      alert('❌ Error: ' + error.message);
    }
  });

  if (!isOwner) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="bg-card border-border p-8 text-center max-w-md">
          <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">Access Denied</h2>
          <p className="text-muted-foreground">
            Hanya OWNER yang dapat mengakses halaman Reset Data.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Factory Reset (Hapus Semua Data)</h1>
        <p className="text-muted-foreground mt-1">
          Hapus seluruh data sistem: Order, Produk, Customer, dan Master Data.
        </p>
      </div>

      <Card className="bg-card border-red-500/50 p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-lg bg-red-500/20 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-6 h-6 text-red-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-red-400 mb-2">⚠️ PERINGATAN KERAS</h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>Aksi ini akan <strong className="text-red-400">MENGHAPUS PERMANEN</strong> semua data:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li><strong className="text-foreground">Semua Data Order & Items</strong></li>
                <li><strong className="text-foreground">Semua Data Produk</strong></li>
                <li><strong className="text-foreground">Semua Data Customer</strong></li>
                <li><strong className="text-foreground">Semua Master Data (Kecamatan, Ekspedisi)</strong></li>
              </ul>
              <p className="text-red-400 font-medium mt-3">
                ⚠️ Data yang dihapus TIDAK DAPAT dikembalikan!
              </p>
            </div>
          </div>
        </div>
      </Card>

      <Card className="bg-card border-border p-6">
        <h3 className="font-semibold text-foreground mb-4">Konfirmasi Reset</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Ketik <strong className="text-red-400">RESET SEMUA DATA</strong> untuk mengkonfirmasi:
        </p>
        <Input
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder="Ketik RESET SEMUA DATA"
          className="bg-muted border-border text-foreground mb-4"
        />
        <Button
          onClick={() => resetMutation.mutate()}
          disabled={confirmText !== 'RESET SEMUA DATA' || resetMutation.isPending}
          className="w-full bg-red-600 hover:bg-red-700 text-white"
        >
          {resetMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Menghapus Data...
            </>
          ) : (
            <>
              <Trash2 className="w-4 h-4 mr-2" />
              Reset Semua Data
            </>
          )}
        </Button>
      </Card>
    </div>
  );
}
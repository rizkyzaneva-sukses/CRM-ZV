import React, { useState } from 'react';
import { api } from '@/lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Users, Plus, Edit, Search, Phone, MapPin, Package } from 'lucide-react';
import { formatInJakarta } from '@/components/utils/dateUtils';

export default function CustomerManagement({ user, customRole }) {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);

  const isStaff = customRole === 'STAFF';

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ['customers', user?.email, customRole],
    queryFn: async () => {
      if (isStaff) {
        const data = await api.getCustomers({ created_by: user?.email, limit: 500 });
        return data.customers || [];
      } else {
        const data = await api.getCustomers({ limit: 500 });
        return data.customers || [];
      }
    },
    enabled: !!user,
  });

  const { data: allOrders = [] } = useQuery({
    queryKey: ['allOrders', user?.email, customRole],
    queryFn: async () => {
      if (isStaff) {
        const data = await api.getOrders({ created_by: user?.email, limit: 2000 });
        return data.orders || [];
      } else {
        const data = await api.getOrders({ limit: 2000 });
        return data.orders || [];
      }
    },
    enabled: !!user,
  });

  const saveMutation = useMutation({
    mutationFn: async (customerData) => {
      if (editingCustomer) {
        return await api.updateCustomer(editingCustomer.id, customerData);
      } else {
        return await api.createCustomer(customerData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['customers']);
      setDialogOpen(false);
      setEditingCustomer(null);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const customerData = {
      nama: formData.get('nama'),
      no_telepon: formData.get('no_telepon'),
      alamat: formData.get('alamat'),
      provinsi: formData.get('provinsi'),
      kota_kab: formData.get('kota_kab'),
      kecamatan: formData.get('kecamatan'),
      kode_pos: formData.get('kode_pos'),
      email: formData.get('email'),
      notes: formData.get('notes'),
    };
    saveMutation.mutate(customerData);
  };

  const getCustomerOrders = (customerName, customerPhone) => {
    return allOrders.filter(order => 
      order.nama_pemesan === customerName || order.no_telepon === customerPhone
    );
  };

  const filteredCustomers = customers.filter(customer =>
    customer.nama?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.no_telepon?.includes(searchQuery) ||
    customer.alamat?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Customer Management</h1>
          <p className="text-muted-foreground mt-1">
            {isStaff ? 'Kelola customer Anda' : 'Kelola semua data customer dan riwayat pesanan'}
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              onClick={() => setEditingCustomer(null)}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Tambah Customer
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border text-foreground max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-foreground">
                {editingCustomer ? 'Edit Customer' : 'Tambah Customer Baru'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Nama Lengkap *</Label>
                  <Input
                    name="nama"
                    defaultValue={editingCustomer?.nama}
                    required
                    className="bg-muted border-border text-foreground"
                  />
                </div>
                <div>
                  <Label className="text-muted-foreground">No. Telepon *</Label>
                  <Input
                    name="no_telepon"
                    defaultValue={editingCustomer?.no_telepon}
                    required
                    className="bg-muted border-border text-foreground"
                  />
                </div>
              </div>

              <div>
                <Label className="text-muted-foreground">Alamat Lengkap *</Label>
                <Textarea
                  name="alamat"
                  defaultValue={editingCustomer?.alamat}
                  required
                  rows={3}
                  className="bg-muted border-border text-foreground"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Provinsi</Label>
                  <Input
                    name="provinsi"
                    defaultValue={editingCustomer?.provinsi}
                    className="bg-muted border-border text-foreground"
                  />
                </div>
                <div>
                  <Label className="text-muted-foreground">Kota/Kabupaten</Label>
                  <Input
                    name="kota_kab"
                    defaultValue={editingCustomer?.kota_kab}
                    className="bg-muted border-border text-foreground"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Kecamatan</Label>
                  <Input
                    name="kecamatan"
                    defaultValue={editingCustomer?.kecamatan}
                    className="bg-muted border-border text-foreground"
                  />
                </div>
                <div>
                  <Label className="text-muted-foreground">Kode Pos</Label>
                  <Input
                    name="kode_pos"
                    defaultValue={editingCustomer?.kode_pos}
                    className="bg-muted border-border text-foreground"
                  />
                </div>
              </div>

              <div>
                <Label className="text-muted-foreground">Email</Label>
                <Input
                  name="email"
                  type="email"
                  defaultValue={editingCustomer?.email}
                  className="bg-muted border-border text-foreground"
                />
              </div>

              <div>
                <Label className="text-muted-foreground">Catatan</Label>
                <Textarea
                  name="notes"
                  defaultValue={editingCustomer?.notes}
                  rows={2}
                  className="bg-muted border-border text-foreground"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  className="border-border text-muted-foreground"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={saveMutation.isPending}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {saveMutation.isPending ? 'Menyimpan...' : 'Simpan'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <Card className="bg-card border-border p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Cari customer berdasarkan nama, telepon, atau alamat..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-muted border-border text-foreground"
          />
        </div>
      </Card>

      {/* Customer List */}
      <Card className="bg-card border-border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border">
                <TableHead className="text-foreground">Nama</TableHead>
                <TableHead className="text-foreground">Kontak</TableHead>
                <TableHead className="text-foreground">Alamat</TableHead>
                <TableHead className="text-foreground text-center">Total Order</TableHead>
                <TableHead className="text-foreground">Last Order</TableHead>
                <TableHead className="text-foreground">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : filteredCustomers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Tidak ada customer
                  </TableCell>
                </TableRow>
              ) : (
                filteredCustomers.map((customer) => {
                  const orders = getCustomerOrders(customer.nama, customer.no_telepon);
                  const lastOrder = orders.length > 0 ? orders[0].order_date : null;
                  
                  return (
                    <TableRow key={customer.id} className="border-border">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                            <Users className="w-4 h-4 text-emerald-400" />
                          </div>
                          <div>
                            <p className="text-foreground font-medium">{customer.nama}</p>
                            {customer.email && (
                              <p className="text-xs text-muted-foreground">{customer.email}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Phone className="w-3 h-3" />
                          <span className="text-sm">{customer.no_telepon}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-start gap-2 text-muted-foreground text-sm max-w-xs">
                          <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
                          <span className="line-clamp-2">{customer.alamat}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Package className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400 font-medium">{orders.length}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {lastOrder ? formatInJakarta(lastOrder, 'dd/MM/yyyy') : '—'}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingCustomer(customer);
                            setDialogOpen(true);
                          }}
                          className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
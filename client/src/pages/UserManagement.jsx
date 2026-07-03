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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Users, Mail, UserPlus, Loader2, Pencil, Trash2, AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function UserManagement({ user, customRole }) {
  const queryClient = useQueryClient();
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePassword, setInvitePassword] = useState('');
  const [inviteRole, setInviteRole] = useState('STAFF');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingUser, setEditingUser] = useState(null);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState('STAFF');
  const [editPassword, setEditPassword] = useState('');
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const isOwner = customRole === 'OWNER';

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.getUsers().then(res => res.users),
  });



  const inviteMutation = useMutation({
    mutationFn: async ({ email, password, customRole }) => {
      await api.register({ email, password, full_name: email.split('@')[0], custom_role: customRole });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['users']);
      setInviteEmail('');
      setInvitePassword('');
      setInviteRole('STAFF');
      alert('✅ Undangan berhasil dikirim ke email!');
    },
    onError: (error) => {
      alert('❌ Error: ' + error.message);
    }
  });

  const handleInvite = (e) => {
    e.preventDefault();
    if (!inviteEmail) {
      alert('Email harus diisi');
      return;
    }
    if (!invitePassword) {
      alert('Password harus diisi');
      return;
    }
    inviteMutation.mutate({ email: inviteEmail, password: invitePassword, customRole: inviteRole });
  };

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const updateData = { full_name: data.full_name };
      if (data.custom_role) {
        updateData.custom_role = data.custom_role;
      }
      if (data.password) {
        updateData.password = data.password;
      }
      await api.updateUser(id, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['users']);
      setEditDialogOpen(false);
      setEditingUser(null);
      alert('✅ User berhasil diupdate!');
    },
    onError: (error) => {
      alert('❌ Error: ' + error.message);
    }
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (id) => {
      await api.deleteUser(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['users']);
      alert('✅ User berhasil dihapus!');
    },
    onError: (error) => {
      alert('❌ Error: ' + error.message);
    }
  });

  const handleEdit = (u) => {
    setEditingUser(u);
    setEditName(u.full_name || '');
    setEditRole(u.custom_role || 'STAFF');
    setEditPassword('');
    setEditDialogOpen(true);
  };

  const handleUpdateUser = (e) => {
    e.preventDefault();
    if (!editingUser) return;
    
    const data = { full_name: editName, custom_role: editRole };
    if (editPassword.trim() !== '') {
      data.password = editPassword.trim();
    }
    
    updateUserMutation.mutate({
      id: editingUser.id,
      data
    });
  };

  const handleDeleteUser = (u) => {
    if (confirm(`Hapus user ${u.full_name || u.email}?`)) {
      deleteUserMutation.mutate(u.id);
    }
  };



  const filteredUsers = users.filter(u => {
    const search = searchTerm.toLowerCase();
    return (
      u.full_name?.toLowerCase().includes(search) ||
      u.email?.toLowerCase().includes(search) ||
      u.role?.toLowerCase().includes(search)
    );
  });

  return (
    <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6 pb-20 lg:pb-6">
      <div className="px-1">
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">User Management</h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-1">
          Kelola pengguna dan hak akses
        </p>
      </div>

      {/* Invite User Card */}
      <Card className="bg-card border-border p-4 sm:p-6">
        <div className="flex items-center gap-2 sm:gap-3 mb-4">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
            <UserPlus className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground text-sm sm:text-base">Undang Pengguna Baru</h3>
            <p className="text-xs sm:text-sm text-muted-foreground">Kirim undangan via email</p>
          </div>
        </div>

        <form onSubmit={handleInvite} className="space-y-3 sm:space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <Label className="text-muted-foreground text-sm">Email</Label>
              <Input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="user@example.com"
                className="mt-1 bg-muted border-border text-foreground"
                required
              />
            </div>
            <div>
              <Label className="text-muted-foreground text-sm">Role</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger className="mt-1 bg-muted border-border text-foreground text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="STAFF">STAFF</SelectItem>
                  <SelectItem value="FINANCE">FINANCE</SelectItem>
                  <SelectItem value="INVENTORI">INVENTORI</SelectItem>
                  <SelectItem value="OWNER">OWNER</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-muted-foreground text-sm">Password</Label>
              <Input
                type="text"
                value={invitePassword}
                onChange={(e) => setInvitePassword(e.target.value)}
                placeholder="Password (wajib diisi)"
                className="mt-1 bg-muted border-border text-foreground"
                required
              />
            </div>
          </div>
          <Button
            type="submit"
            disabled={inviteMutation.isPending}
            className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-sm sm:text-base"
          >
            {inviteMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Mengirim...
              </>
            ) : (
              <>
                <Mail className="w-4 h-4 mr-2" />
                Kirim Undangan
              </>
            )}
          </Button>
        </form>
      </Card>

      {/* Users List */}
      <Card className="bg-card border-border p-4 sm:p-6">
        <div className="flex items-center gap-2 sm:gap-3 mb-4">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
            <Users className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-foreground text-sm sm:text-base">Daftar Pengguna</h3>
            <p className="text-xs sm:text-sm text-muted-foreground">{users.length} pengguna terdaftar</p>
          </div>
        </div>

        <div className="mb-4">
          <Input
            placeholder="Cari nama, email, atau role..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-muted border-border text-foreground placeholder:text-muted-foreground text-sm"
          />
        </div>

        <div className="border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="text-foreground text-xs sm:text-sm">Nama</TableHead>
                  <TableHead className="text-foreground text-xs sm:text-sm hidden sm:table-cell">Email</TableHead>
                  <TableHead className="text-foreground text-xs sm:text-sm">Role</TableHead>
                  <TableHead className="text-foreground text-xs sm:text-sm w-20 sm:w-32">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8">
                      <Loader2 className="w-6 h-6 text-emerald-500 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      {searchTerm ? 'Tidak ada hasil' : 'Belum ada pengguna'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((u) => (
                    <TableRow key={u.id} className="border-border">
                      <TableCell className="py-3">
                        <div>
                          <p className="text-foreground font-medium text-sm">{u.full_name || '—'}</p>
                          <p className="text-muted-foreground text-xs sm:hidden">{u.email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm hidden sm:table-cell">{u.email}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          u.custom_role === 'OWNER' ? 'bg-purple-500/20 text-purple-400' :
                          u.custom_role === 'FINANCE' ? 'bg-emerald-500/20 text-emerald-400' :
                          'bg-blue-500/20 text-blue-400'
                        }`}>
                          {u.custom_role || 'STAFF'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 sm:gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(u)}
                            className="h-7 w-7 sm:h-8 sm:w-8 text-muted-foreground hover:text-emerald-400 hover:bg-emerald-500/10"
                          >
                            <Pencil className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteUser(u)}
                            disabled={deleteUserMutation.isPending}
                            className="h-7 w-7 sm:h-8 sm:w-8 text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
                          >
                            <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
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
      </Card>



      {/* Edit User Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="bg-card border-border max-w-[90vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground text-base sm:text-lg">Edit User</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateUser} className="space-y-3 sm:space-y-4">
            <div>
              <Label className="text-muted-foreground text-sm">Nama</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Nama lengkap"
                className="mt-1 bg-muted border-border text-foreground text-sm"
              />
            </div>
            <div>
              <Label className="text-muted-foreground text-sm">Role</Label>
              <Select value={editRole} onValueChange={setEditRole}>
                <SelectTrigger className="mt-1 bg-muted border-border text-foreground text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="STAFF">STAFF</SelectItem>
                  <SelectItem value="FINANCE">FINANCE</SelectItem>
                  <SelectItem value="INVENTORI">INVENTORI</SelectItem>
                  <SelectItem value="OWNER">OWNER</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-muted-foreground text-sm">Ganti Password (opsional)</Label>
              <Input
                type="text"
                value={editPassword}
                onChange={(e) => setEditPassword(e.target.value)}
                placeholder="Kosongkan jika tidak ingin diubah"
                className="mt-1 bg-muted border-border text-foreground text-sm"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditDialogOpen(false)}
                className="border-border text-muted-foreground text-sm"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={updateUserMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700 text-sm"
              >
                {updateUserMutation.isPending ? (
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
    </div>
  );
}
import React, { useState } from 'react';
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, Users, Package, Wallet, Archive } from 'lucide-react';

export default function ManualBook() {
  const [activeTab, setActiveTab] = useState('overview');

  const roles = [
    {
      name: 'OWNER',
      icon: Users,
      color: 'purple',
      description: 'Pengelola bisnis utama dengan akses penuh',
      permissions: [
        'Akses semua menu dan fitur',
        'Kelola user dan role',
        'Lihat laporan keuangan lengkap',
        'Reset data order',
        'Audit log',
      ],
      features: [
        'Dashboard komprehensif',
        'Input order',
        'Kelola customer',
        'Finance approval',
        'User management',
        'Export center',
      ]
    },
    {
      name: 'STAFF',
      icon: Package,
      color: 'blue',
      description: 'Operator input order dan kelola pesanan',
      permissions: [
        'Input order baru',
        'Lihat dashboard order milik sendiri',
        'Kelola customer',
        'Akses manual book',
      ],
      features: [
        'Dashboard personal',
        'Input order',
        'Kelola customer',
        'Manual book',
      ]
    },
    {
      name: 'FINANCE',
      icon: Wallet,
      color: 'emerald',
      description: 'Pengelola keuangan dan approval order',
      permissions: [
        'Lihat semua order',
        'Approval keuangan',
        'Lihat laporan finansial',
        'Download order data',
        'Akses manual book',
      ],
      features: [
        'Dashboard lengkap',
        'Finance approval',
        'Export center',
        'Manual book',
      ]
    },
    {
      name: 'INVENTORI',
      icon: Archive,
      color: 'cyan',
      description: 'Pengelola inventory dan pengiriman',
      permissions: [
        'Upload resi pengiriman',
        'Print label resi',
        'Export data inventory',
        'Kelola status resi',
        'Akses manual book',
      ],
      features: [
        'Upload resi',
        'Print resi label',
        'Export center',
        'Manual book',
      ]
    }
  ];

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Manual Book</h1>
        <p className="text-muted-foreground mt-1">Panduan lengkap penggunaan CRM Order Control Center</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="overview" className="data-[state=active]:bg-emerald-600">
            <BookOpen className="w-4 h-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="roles" className="data-[state=active]:bg-emerald-600">
            <Users className="w-4 h-4 mr-2" />
            Roles & Permissions
          </TabsTrigger>
          <TabsTrigger value="features" className="data-[state=active]:bg-emerald-600">
            <Package className="w-4 h-4 mr-2" />
            Features
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <Card className="bg-card border border-border p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Tentang CRM Order Control Center</h2>
            <div className="space-y-4 text-muted-foreground">
              <p>
                CRM Order Control Center adalah sistem manajemen order terpadu untuk mengelola pesanan pelanggan, 
                dari input hingga pengiriman.
              </p>
              <p>
                Sistem ini dirancang untuk meningkatkan efisiensi operasional dengan pembagian tugas berdasarkan role 
                yang jelas dan terstruktur.
              </p>
              
              <div className="bg-card rounded-lg p-4 border border-border">
                <h3 className="text-foreground font-semibold mb-3">4 Role Utama dalam Sistem:</h3>
                <ul className="space-y-2 text-sm">
                  <li>• <strong>OWNER</strong> - Pengelola utama dengan akses penuh</li>
                  <li>• <strong>STAFF</strong> - Operator input order</li>
                  <li>• <strong>FINANCE</strong> - Pengelola keuangan dan approval</li>
                  <li>• <strong>INVENTORI</strong> - Pengelola inventory dan pengiriman</li>
                </ul>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Roles Tab */}
        <TabsContent value="roles" className="space-y-4">
          {roles.map((role) => {
            const Icon = role.icon;
            const colorClass = {
              'purple': 'bg-purple-500/20 text-purple-400 border-purple-500/20',
              'blue': 'bg-blue-500/20 text-blue-400 border-blue-500/20',
              'emerald': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/20',
              'cyan': 'bg-cyan-500/20 text-cyan-400 border-cyan-500/20'
            }[role.color];

            return (
              <Card key={role.name} className="bg-card border border-border p-6 overflow-hidden">
                <div className={`flex items-start gap-4 mb-4 p-4 rounded-lg border ${colorClass}`}>
                  <Icon className="w-6 h-6 flex-shrink-0" />
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-foreground">{role.name}</h3>
                    <p className="text-sm mt-1">{role.description}</p>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold text-foreground mb-3">Permissions</h4>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      {role.permissions.map((perm, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-emerald-400 mt-1">✓</span>
                          <span>{perm}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-foreground mb-3">Menu Akses</h4>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      {role.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-blue-400 mt-1">→</span>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </Card>
            );
          })}
        </TabsContent>

        {/* Features Tab */}
        <TabsContent value="features" className="space-y-4">
          <Card className="bg-card border border-border p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Menu & Fitur Utama</h3>
            <div className="space-y-4">
              
              <div className="bg-card rounded-lg p-4 border border-border">
                <h4 className="text-foreground font-semibold mb-2">📊 Dashboard</h4>
                <p className="text-muted-foreground text-sm">
                  Lihat overview pesanan hari ini, status pesanan, dan grafik penjualan. 
                  Staff hanya melihat order milik sendiri, sedangkan Owner dan Finance melihat semua order.
                </p>
              </div>

              <div className="bg-card rounded-lg p-4 border border-border">
                <h4 className="text-foreground font-semibold mb-2">➕ Input Order</h4>
                <p className="text-muted-foreground text-sm">
                  Operator (STAFF) dapat membuat order baru dengan data customer, produk, dan detail pengiriman.
                  Order akan melalui approval dari Finance sebelum diproses.
                </p>
              </div>

              <div className="bg-card rounded-lg p-4 border border-border">
                <h4 className="text-foreground font-semibold mb-2">👥 Customers</h4>
                <p className="text-muted-foreground text-sm">
                  Kelola data customer termasuk alamat, nomor telepon, dan riwayat order.
                </p>
              </div>

              <div className="bg-card rounded-lg p-4 border border-border">
                <h4 className="text-foreground font-semibold mb-2">✅ Finance Approval</h4>
                <p className="text-muted-foreground text-sm">
                  Tim Finance dapat mereview dan approve order yang sudah di-input oleh Staff.
                  Hanya order yang approved dapat diproses ke tahap pengiriman.
                </p>
              </div>

              <div className="bg-card rounded-lg p-4 border border-border">
                <h4 className="text-foreground font-semibold mb-2">📦 Inventory Center (INVENTORI)</h4>
                <p className="text-muted-foreground text-sm mb-2">
                  Menu khusus untuk role INVENTORI dengan fitur:
                </p>
                <ul className="text-muted-foreground text-sm space-y-1 ml-4">
                  <li>• <strong>Upload Resi</strong> - Upload file CSV/Excel dengan nomor resi</li>
                  <li>• <strong>Print Resi Label</strong> - Print label pengiriman untuk dikemas</li>
                  <li>• <strong>Export Center</strong> - Export data inventory dalam format CSV</li>
                </ul>
              </div>

              <div className="bg-card rounded-lg p-4 border border-border">
                <h4 className="text-foreground font-semibold mb-2">📥 Upload Resi</h4>
                <p className="text-muted-foreground text-sm">
                  Upload file resi (CSV atau Excel) untuk update status pengiriman order.
                  File harus berisi: Order Number, No Resi, dan Tanggal Update.
                </p>
              </div>

              <div className="bg-card rounded-lg p-4 border border-border">
                <h4 className="text-foreground font-semibold mb-2">🖨️ Print Resi Label</h4>
                <p className="text-muted-foreground text-sm">
                  Print label resi dengan format siap cetak (100mm x 150mm). 
                  Pilih order yang sudah memiliki nomor resi untuk di-print secara batch.
                </p>
              </div>

              <div className="bg-card rounded-lg p-4 border border-border">
                <h4 className="text-foreground font-semibold mb-2">📊 Export Center</h4>
                <p className="text-muted-foreground text-sm">
                  Export data order dalam format CSV dengan berbagai filter:
                </p>
                <ul className="text-muted-foreground text-sm space-y-1 ml-4 mt-2">
                  <li>• Semua Order</li>
                  <li>• Order dengan Resi</li>
                  <li>• Order tanpa Resi</li>
                  <li>• Order Siap Kirim</li>
                </ul>
              </div>

              <div className="bg-card rounded-lg p-4 border border-border">
                <h4 className="text-foreground font-semibold mb-2">📋 Master Data</h4>
                <p className="text-muted-foreground text-sm">
                  Kelola data master seperti list produk, jasa pengiriman, dan metode pembayaran.
                </p>
              </div>

              <div className="bg-card rounded-lg p-4 border border-border">
                <h4 className="text-foreground font-semibold mb-2">📝 Audit Log</h4>
                <p className="text-muted-foreground text-sm">
                  Lihat log semua aktivitas di sistem termasuk create, update, dan delete data.
                </p>
              </div>

              <div className="bg-card rounded-lg p-4 border border-border">
                <h4 className="text-foreground font-semibold mb-2">👤 User Management</h4>
                <p className="text-muted-foreground text-sm">
                  Owner dapat manage user, assign role, dan reset data order.
                </p>
              </div>

            </div>
          </Card>
        </TabsContent>
      </Tabs>

      <Card className="bg-emerald-500/10 border border-emerald-500/20 p-6">
        <h3 className="text-foreground font-semibold mb-2">💡 Tips Penggunaan</h3>
        <ul className="space-y-2 text-muted-foreground text-sm">
          <li>• Selalu pastikan data customer lengkap sebelum input order</li>
          <li>• Finance harus approve order sebelum proses pengiriman</li>
          <li>• Inventori segera update resi setelah paket dikirim</li>
          <li>• Gunakan Export Center untuk backup data secara berkala</li>
          <li>• Cek Audit Log untuk tracking semua perubahan data</li>
        </ul>
      </Card>
    </div>
  );
}
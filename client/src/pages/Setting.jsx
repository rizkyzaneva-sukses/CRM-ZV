import React, { useState } from 'react';
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Database, Trash2, Archive, ShieldAlert } from 'lucide-react';
import UserManagement from './UserManagement';
import ImportData from './ImportData';
import ResetData from './ResetData';
import DownloadAllData from '@/components/manualbook/DownloadAllData';

// Pusat fungsi administratif. Semua tab di sini khusus OWNER, jadi penjagaannya
// dilakukan sekali di level halaman - tab masing-masing tidak perlu mengulang.
export default function Setting({ user, customRole }) {
  const [activeTab, setActiveTab] = useState('users');
  const isOwner = customRole === 'OWNER';

  if (!isOwner) {
    return (
      <div className="max-w-6xl">
        <Card className="bg-card border border-border p-8 text-center">
          <ShieldAlert className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <h2 className="text-xl font-semibold text-foreground mb-2">Akses Ditolak</h2>
          <p className="text-muted-foreground">
            Halaman Setting hanya dapat diakses oleh role OWNER.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Setting</h1>
        <p className="text-muted-foreground mt-1">
          Kelola pengguna sistem dan ekspor seluruh basis data
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-card border border-border flex-wrap h-auto">
          <TabsTrigger value="users" className="data-[state=active]:bg-emerald-600">
            <Users className="w-4 h-4 mr-2" />
            User Management
          </TabsTrigger>
          <TabsTrigger value="download" className="data-[state=active]:bg-emerald-600">
            <Database className="w-4 h-4 mr-2" />
            Download All Data
          </TabsTrigger>
          <TabsTrigger value="import" className="data-[state=active]:bg-emerald-600">
            <Archive className="w-4 h-4 mr-2" />
            Import Data
          </TabsTrigger>
          <TabsTrigger value="reset" className="data-[state=active]:bg-emerald-600">
            <Trash2 className="w-4 h-4 mr-2" />
            Reset Data
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <UserManagement user={user} customRole={customRole} />
        </TabsContent>

        <TabsContent value="download">
          <DownloadAllData user={user} customRole={customRole} />
        </TabsContent>

        <TabsContent value="import">
          <ImportData user={user} customRole={customRole} />
        </TabsContent>

        <TabsContent value="reset">
          <ResetData user={user} customRole={customRole} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

import React, { useState } from 'react';
import { api } from '@/lib/api';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Upload, Printer, Download } from 'lucide-react';
import UploadResi from '@/components/inventori/UploadResi';
import PrintResi from '@/components/inventori/PrintResi';
import ExportCenter from '@/components/inventori/ExportCenter';

export default function Inventori({ user, customRole }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Inventory Center</h1>
        <p className="text-muted-foreground mt-1">Kelola resi pengiriman dan inventory order</p>
      </div>

      <Tabs defaultValue="upload" className="space-y-4">
        <TabsList className="bg-card border border-border">
          <TabsTrigger 
            value="upload"
            className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload Resi
          </TabsTrigger>
          <TabsTrigger 
            value="print"
            className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
          >
            <Printer className="w-4 h-4 mr-2" />
            Print Resi Label
          </TabsTrigger>
          <TabsTrigger 
            value="export"
            className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
          >
            <Download className="w-4 h-4 mr-2" />
            Export Center
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload">
          <UploadResi user={user} customRole={customRole} />
        </TabsContent>

        <TabsContent value="print">
          <PrintResi user={user} customRole={customRole} />
        </TabsContent>

        <TabsContent value="export">
          <ExportCenter user={user} customRole={customRole} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
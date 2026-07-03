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
  Upload, 
  FileSpreadsheet, 
  CheckCircle, 
  AlertTriangle,
  Loader2,
  X,
  Download
} from 'lucide-react';
import * as XLSX from 'xlsx';

export default function UploadResi({ user, customRole }) {
  const queryClient = useQueryClient();
  const isFinance = customRole === 'FINANCE' || customRole === 'OWNER';

  const [file, setFile] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [matchResults, setMatchResults] = useState(null);
  const [processing, setProcessing] = useState(false);

  // Get ready to process orders
  const { data: readyOrders = [] } = useQuery({
    queryKey: ['readyOrders', user?.email, isFinance],
    queryFn: async () => {
      const filter = { status_pesanan: 'READY_TO_PROCESS', limit: 1000 };
      if (!isFinance) {
        filter.created_by = user?.email;
      }
      const data = await api.getOrders(filter);
      return data.orders || [];
    },
    enabled: !!user,
  });

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setProcessing(true);

    try {
      // Read file directly with xlsx library
      const buffer = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(buffer);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawData = XLSX.utils.sheet_to_json(worksheet);

      if (rawData.length === 0) {
        alert('File kosong. Pastikan file memiliki data dengan kolom "No. Waybill" dan "Penerima".');
        resetUpload();
        return;
      }

      // Map columns to expected format
      const data = rawData.map(row => ({
        no_waybill: String(row['No. Waybill'] || row['No Waybill'] || row['Waybill'] || '').trim(),
        penerima: String(row['Penerima'] || row['Nama Penerima'] || '').trim()
      }));

      const filtered = data.filter(item => item.no_waybill && item.penerima);
      
      if (filtered.length === 0) {
        alert('Tidak ada data valid. Pastikan file memiliki kolom "No. Waybill" dan "Penerima" yang terisi.');
        resetUpload();
        return;
      }
      
      setPreviewData(filtered);
      
      // Match with orders
      const results = matchResiWithOrders(filtered, readyOrders);
      setMatchResults(results);
    } catch (error) {
      console.error('Error reading file:', error);
      alert('Error membaca file: ' + (error.message || 'Pastikan file format Excel/CSV dengan kolom yang benar'));
      resetUpload();
    } finally {
      setProcessing(false);
    }
  };

  const matchResiWithOrders = (resiData, orders) => {
    const matched = [];
    const unmatched = [];

    for (const resi of resiData) {
      // Find matching orders by name (case-insensitive)
      const matchingOrders = orders.filter(order => 
        order.nama_pemesan?.toLowerCase().trim() === resi.penerima?.toLowerCase().trim() &&
        !order.no_resi
      );

      if (matchingOrders.length === 1) {
        matched.push({
          resi,
          order: matchingOrders[0],
          status: 'matched'
        });
      } else if (matchingOrders.length > 1) {
        // Pick the most recent order
        const sorted = matchingOrders.sort((a, b) => 
          new Date(b.created_date) - new Date(a.created_date)
        );
        matched.push({
          resi,
          order: sorted[0],
          status: 'matched_multiple'
        });
      } else {
        unmatched.push({
          resi,
          status: 'not_found'
        });
      }
    }

    return { matched, unmatched };
  };

  const applyUpdateMutation = useMutation({
    mutationFn: async () => {
      if (!matchResults) return;

      for (const item of matchResults.matched) {
        await api.updateOrder(item.order.id, {
          no_resi: item.resi.no_waybill,
          status_pesanan: 'RESI_UPDATED',
        });
      }

      // Save exceptions
      for (const item of matchResults.unmatched) {
        await api.createResiException({
          no_waybill: item.resi.no_waybill,
          penerima: item.resi.penerima,
          reason: 'Nama penerima tidak ditemukan',
        });
      }

      // Send notification email
      const financeEmails = ['rizkyzaneva@gmail.com']; // Add finance/fulfillment emails
      const emailBody = `
📦 Resi Upload Notification

✅ Successfully updated: ${matchResults.matched.length} orders
${matchResults.unmatched.length > 0 ? `⚠️ Unmatched entries: ${matchResults.unmatched.length}` : ''}

Uploaded by: ${user?.email}
Time: ${new Date().toLocaleString('id-ID')}

${matchResults.matched.length > 0 ? `\nUpdated Orders:\n${matchResults.matched.map(m => `- ${m.order.order_number} (${m.order.nama_pemesan}): ${m.resi.no_waybill}`).join('\n')}` : ''}
      `.trim();

      try {
        for (const email of financeEmails) {
          await api.sendEmail({
            to: email,
            subject: `🚚 Resi Update: ${matchResults.matched.length} Orders Updated`,
            body: emailBody,
          });
        }
      } catch (error) {
        console.error('Failed to send notification email:', error);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['orders']);
      queryClient.invalidateQueries(['readyOrders']);
      alert(`Berhasil update ${matchResults.matched.length} order dan notifikasi terkirim`);
      resetUpload();
    },
  });

  const resetUpload = () => {
    setFile(null);
    setPreviewData(null);
    setMatchResults(null);
  };

  const downloadTemplate = () => {
    const templateData = [
      { 'No. Waybill': '126487623', 'Penerima': 'Wulandari' },
      { 'No. Waybill': '987654321', 'Penerima': 'Budi Santoso' },
    ];
    
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template Resi');
    XLSX.writeFile(wb, 'Template_Upload_Resi.csv');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Upload Resi</h1>
          <p className="text-muted-foreground mt-1">
            Upload file output dari SAP/J&T untuk mengisi No. Resi
          </p>
        </div>
        <Button
          variant="outline"
          onClick={downloadTemplate}
          className="border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        >
          <Download className="w-4 h-4 mr-2" />
          Download Template
        </Button>
      </div>

      {/* Upload Area */}
      {!file && (
        <Card className="bg-card border-border p-8">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <Upload className="w-8 h-8 text-emerald-400" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Upload File Resi
            </h3>
            <p className="text-muted-foreground mb-4">
              File Excel (.xlsx, .xls) atau CSV dengan kolom "No. Waybill" dan "Penerima"
            </p>
            <Label htmlFor="file-upload">
              <div className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg cursor-pointer transition-colors">
                <FileSpreadsheet className="w-5 h-5" />
                Pilih File
              </div>
              <Input
                id="file-upload"
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="hidden"
              />
            </Label>
          </div>
        </Card>
      )}

      {/* Processing */}
      {processing && (
        <Card className="bg-card border-border p-8">
          <div className="flex items-center justify-center gap-3">
            <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
            <p className="text-foreground">Memproses file...</p>
          </div>
        </Card>
      )}

      {/* Match Results */}
      {matchResults && (
        <>
          {/* Summary */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="bg-emerald-500/10 border-emerald-500/30 p-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-8 h-8 text-emerald-400" />
                <div>
                  <p className="text-2xl font-bold text-emerald-400">
                    {matchResults.matched.length}
                  </p>
                  <p className="text-sm text-muted-foreground">Matched</p>
                </div>
              </div>
            </Card>
            <Card className="bg-amber-500/10 border-amber-500/30 p-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-8 h-8 text-amber-400" />
                <div>
                  <p className="text-2xl font-bold text-amber-400">
                    {matchResults.unmatched.length}
                  </p>
                  <p className="text-sm text-muted-foreground">Unmatched</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Matched Table */}
          {matchResults.matched.length > 0 && (
            <Card className="bg-card border-border overflow-hidden">
              <div className="p-4 border-b border-border">
                <h3 className="font-semibold text-foreground">Data yang Matched</h3>
              </div>
              <div className="overflow-x-auto max-h-64">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border">
                      <TableHead className="text-foreground">No. Waybill</TableHead>
                      <TableHead className="text-foreground">Penerima (File)</TableHead>
                      <TableHead className="text-foreground">Order</TableHead>
                      <TableHead className="text-foreground">Nama (Order)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {matchResults.matched.map((item, index) => (
                      <TableRow key={index} className="border-border">
                        <TableCell className="text-emerald-400 font-mono">
                          {item.resi.no_waybill}
                        </TableCell>
                        <TableCell className="text-foreground">{item.resi.penerima}</TableCell>
                        <TableCell className="text-muted-foreground">{item.order.order_number}</TableCell>
                        <TableCell className="text-foreground">{item.order.nama_pemesan}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          )}

          {/* Unmatched Table */}
          {matchResults.unmatched.length > 0 && (
            <Card className="bg-card border-border overflow-hidden">
              <div className="p-4 border-b border-border">
                <h3 className="font-semibold text-amber-400">Data Tidak Cocok</h3>
                <p className="text-sm text-muted-foreground">Data ini akan disimpan untuk review manual</p>
              </div>
              <div className="overflow-x-auto max-h-48">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border">
                      <TableHead className="text-foreground">No. Waybill</TableHead>
                      <TableHead className="text-foreground">Penerima</TableHead>
                      <TableHead className="text-foreground">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {matchResults.unmatched.map((item, index) => (
                      <TableRow key={index} className="border-border">
                        <TableCell className="text-amber-400 font-mono">
                          {item.resi.no_waybill}
                        </TableCell>
                        <TableCell className="text-foreground">{item.resi.penerima}</TableCell>
                        <TableCell className="text-muted-foreground">Tidak ditemukan</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={resetUpload}
              className="border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            >
              <X className="w-4 h-4 mr-2" />
              Batal
            </Button>
            <Button
              onClick={() => applyUpdateMutation.mutate()}
              disabled={applyUpdateMutation.isPending || matchResults.matched.length === 0}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {applyUpdateMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4 mr-2" />
              )}
              Apply Update ({matchResults.matched.length} order)
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
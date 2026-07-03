import React, { useState } from 'react';
import { api } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  History, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Eye,
  Download,
  Search
} from 'lucide-react';
import { formatInJakarta } from '@/components/utils/dateUtils';

export default function AuditLog({ user, userRole }) {
  const [searchTerm, setSearchTerm] = useState('');

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['auditLog'],
    // Audit log endpoints can be implemented in the backend if really needed,
    // for now we'll just mock it or skip it since it wasn't requested.
    queryFn: () => [],
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.getUsers().then(res => res.users || []),
  });

  const getUserName = (email) => {
    const user = users.find(u => u.email === email);
    return user?.full_name || email || '-';
  };

  const filteredLogs = logs.filter(log => {
    const search = searchTerm.toLowerCase();
    return (
      log.action?.toLowerCase().includes(search) ||
      log.entity_name?.toLowerCase().includes(search) ||
      log.performed_by?.toLowerCase().includes(search)
    );
  });

  const getStatusIcon = (status) => {
    switch (status) {
      case 'SUCCESS': return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
      case 'PARTIAL': return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'FAILED': return <XCircle className="w-5 h-5 text-red-500" />;
      default: return null;
    }
  };

  const getStatusBadge = (status) => {
    const colors = {
      'SUCCESS': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      'PARTIAL': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      'FAILED': 'bg-red-500/20 text-red-400 border-red-500/30'
    };
    return (
      <span className={`px-2 py-1 rounded text-xs border ${colors[status] || 'bg-gray-500/20 text-gray-400'}`}>
        {status}
      </span>
    );
  };

  const downloadErrorDetails = (log) => {
    if (!log.error_details) return;
    
    try {
      const errors = JSON.parse(log.error_details);
      
      // Prepare CSV with proper escaping
      const csvRows = [['Baris', 'Alasan', 'Data']];
      
      errors.forEach(err => {
        const row = err.row || '-';
        const reason = (err.reason || '-').replace(/"/g, '""');
        
        // Convert data object to readable format with all fields
        let dataStr = '';
        if (err.data && typeof err.data === 'object') {
          const fields = [];
          for (const [key, value] of Object.entries(err.data)) {
            if (value !== undefined && value !== null) {
              fields.push(`${key}: ${value}`);
            }
          }
          dataStr = fields.join(' | ');
        } else {
          dataStr = String(err.data || '');
        }
        dataStr = dataStr.replace(/"/g, '""');
        
        csvRows.push([row, `"${reason}"`, `"${dataStr}"`]);
      });
      
      const csv = csvRows.map(row => row.join(',')).join('\n');
      
      // Add BOM for Excel UTF-8 support
      const BOM = '\uFEFF';
      const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `error_detail_${log.action}_${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      alert('Error downloading log: ' + error.message);
    }
  };

  const ErrorDetailsDialog = ({ log }) => {
    if (!log.error_details) return null;
    
    let errors = [];
    try {
      errors = JSON.parse(log.error_details);
    } catch (e) {
      return <p className="text-red-400">Error parsing details</p>;
    }

    return (
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
            <Eye className="w-4 h-4 mr-2" />
            Lihat Detail
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Detail Error - {log.action}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground">Total: <span className="text-emerald-400">{log.total_records}</span></p>
                <p className="text-muted-foreground">Berhasil: <span className="text-emerald-400">{log.success_count}</span></p>
              </div>
              <div>
                <p className="text-muted-foreground">Dilewati: <span className="text-yellow-400">{log.skipped_count}</span></p>
                <p className="text-muted-foreground">Gagal: <span className="text-red-400">{log.failed_count}</span></p>
              </div>
            </div>

            <div className="border-t border-border pt-3">
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-semibold text-foreground">Daftar Error ({errors.length})</h4>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => downloadErrorDetails(log)}
                  className="border-border text-muted-foreground"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download CSV
                </Button>
              </div>
              <div className="max-h-96 overflow-y-auto border border-border rounded-lg">
                <Table>
                  <TableHeader className="sticky top-0 bg-muted">
                    <TableRow className="border-border">
                      <TableHead className="text-foreground">Baris</TableHead>
                      <TableHead className="text-foreground">Alasan</TableHead>
                      <TableHead className="text-foreground">Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {errors.map((err, idx) => {
                      let dataDisplay = '-';
                      if (err.data && typeof err.data === 'object') {
                        const fields = [];
                        for (const [key, value] of Object.entries(err.data)) {
                          if (value !== undefined && value !== null) {
                            fields.push(`${key}: ${value}`);
                          }
                        }
                        dataDisplay = fields.join(' | ') || '-';
                      } else if (err.data) {
                        dataDisplay = String(err.data);
                      }
                      
                      return (
                        <TableRow key={idx} className="border-border">
                          <TableCell className="text-muted-foreground">{err.row || '-'}</TableCell>
                          <TableCell className="text-red-400 text-sm">{err.reason}</TableCell>
                          <TableCell className="text-muted-foreground text-xs max-w-md">
                            <div className="truncate" title={dataDisplay}>
                              {dataDisplay}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <History className="w-6 h-6" />
            Audit Log
          </h1>
          <p className="text-muted-foreground mt-1">
            Riwayat aktivitas import dan perubahan data
          </p>
        </div>
      </div>

      <Card className="bg-card border-border p-6">
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Cari berdasarkan aksi, entity, atau user..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-muted border-border text-foreground"
            />
          </div>
        </div>

        {isLoading ? (
          <p className="text-center text-muted-foreground py-8">Loading...</p>
        ) : filteredLogs.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Belum ada aktivitas</p>
        ) : (
          <div className="border border-border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border bg-muted">
                    <TableHead className="text-foreground">Waktu</TableHead>
                    <TableHead className="text-foreground">Aksi</TableHead>
                    <TableHead className="text-foreground">Entity</TableHead>
                    <TableHead className="text-foreground">Status</TableHead>
                    <TableHead className="text-foreground">Total</TableHead>
                    <TableHead className="text-foreground">Berhasil</TableHead>
                    <TableHead className="text-foreground">Gagal</TableHead>
                    <TableHead className="text-foreground">Oleh</TableHead>
                    <TableHead className="text-foreground">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => (
                    <TableRow key={log.id} className="border-border">
                      <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                          {formatInJakarta(log.created_date, 'dd/MM/yyyy HH:mm')}
                        </TableCell>
                      <TableCell className="text-foreground font-medium">
                        {log.action?.replace(/_/g, ' ')}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{log.entity_name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(log.status)}
                          {getStatusBadge(log.status)}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{log.total_records || 0}</TableCell>
                      <TableCell className="text-emerald-400">{log.success_count || 0}</TableCell>
                      <TableCell className="text-red-400">{log.failed_count || 0}</TableCell>
                      <TableCell className="text-muted-foreground text-sm truncate max-w-[150px]" title={log.performed_by}>
                        {getUserName(log.performed_by)}
                      </TableCell>
                      <TableCell>
                        {(log.failed_count > 0 || log.skipped_count > 0) && (
                          <ErrorDetailsDialog log={log} />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
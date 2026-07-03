import React, { useState } from 'react';
// No base44
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, Check, AlertCircle } from 'lucide-react';

export default function UploadResi({ orders }) {
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState(null);
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: async (file) => {
      // TODO: Implement file upload logic if this component is used
      return null;
    },
    onSuccess: () => {
      setUploadStatus({ type: 'success', message: 'File berhasil diupload' });
      setUploadedFile(null);
      setTimeout(() => setUploadStatus(null), 3000);
    },
    onError: (error) => {
      setUploadStatus({ type: 'error', message: 'Gagal upload file' });
    }
  });

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type === 'text/csv' || file.type === 'application/vnd.ms-excel') {
        setUploadedFile(file);
        setUploadStatus(null);
      } else {
        setUploadStatus({ type: 'error', message: 'Hanya file CSV atau Excel yang diperbolehkan' });
      }
    }
  };

  const handleUpload = () => {
    if (uploadedFile) {
      uploadMutation.mutate(uploadedFile);
    }
  };

  return (
    <Card className="bg-card border border-border p-6">
      <div className="space-y-4">
        <div className="border-border border-dashed border-border rounded-lg p-8 text-center hover:border-blue-500 transition">
          <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground mb-3">Drag & drop atau klik untuk upload file resi</p>
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFileChange}
            className="hidden"
            id="resi-upload"
          />
          <label htmlFor="resi-upload">
            <Button as="label" variant="outline" className="cursor-pointer">
              Pilih File
            </Button>
          </label>
        </div>

        {uploadedFile && (
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-foreground">File dipilih: <span className="font-semibold">{uploadedFile.name}</span></p>
          </div>
        )}

        {uploadStatus && (
          <div className={`flex items-center gap-3 p-4 rounded-lg ${
            uploadStatus.type === 'success' 
              ? 'bg-emerald-500/10 border border-emerald-500/20' 
              : 'bg-red-500/10 border border-red-500/20'
          }`}>
            {uploadStatus.type === 'success' ? (
              <Check className="w-5 h-5 text-emerald-500" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-500" />
            )}
            <p className={uploadStatus.type === 'success' ? 'text-emerald-400' : 'text-red-400'}>
              {uploadStatus.message}
            </p>
          </div>
        )}

        <Button
          onClick={handleUpload}
          disabled={!uploadedFile || uploadMutation.isPending}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
        >
          {uploadMutation.isPending ? 'Uploading...' : 'Upload File Resi'}
        </Button>

        <div className="bg-card rounded-lg p-4 border border-border">
          <h3 className="text-foreground font-semibold mb-2">Format File:</h3>
          <ul className="text-muted-foreground text-sm space-y-1">
            <li>• File harus dalam format CSV atau Excel</li>
            <li>• Kolom: Order Number, No Resi, Tanggal Update</li>
            <li>• Maksimal 1000 baris per file</li>
          </ul>
        </div>
      </div>
    </Card>
  );
}
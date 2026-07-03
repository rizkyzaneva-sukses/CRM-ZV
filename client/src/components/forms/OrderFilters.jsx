import React from 'react';
import { api } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, X } from 'lucide-react';

const statusOptions = [
  { value: 'all', label: 'Semua Status' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'WAITING_FINANCE', label: 'Waiting Finance' },
  { value: 'READY_TO_PROCESS', label: 'Ready to Process' },
  { value: 'RESI_UPDATED', label: 'Resi Updated' },
  { value: 'REJECTED', label: 'Rejected' },
];

export default function OrderFilters({ filters, onFilterChange, onClear }) {
  const { data: shippingServices = [] } = useQuery({
    queryKey: ['shippingServices'],
    queryFn: async () => {
      const data = await api.getShippingServices();
      const services = data.shipping_services || data || [];
      return services.filter(s => s.is_active);
    },
  });

  const jasaOptions = [
    { value: 'all', label: 'Semua Jasa Kirim' },
    ...shippingServices.map(s => ({ value: s.code, label: s.name }))
  ];
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex-1">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Cari nama / no telp / no pesanan..."
            value={filters.search || ''}
            onChange={(e) => onFilterChange('search', e.target.value)}
            className="pl-10 bg-muted border-border text-foreground placeholder:text-muted-foreground focus:border-[#60A5FA] focus:ring-[#60A5FA]"
          />
        </div>

        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={filters.dateFrom || ''}
            onChange={(e) => onFilterChange('dateFrom', e.target.value)}
            className="bg-muted border-border text-foreground focus:border-[#60A5FA] focus:ring-[#60A5FA]"
            placeholder="Dari"
          />
          <span className="text-muted-foreground text-sm shrink-0">—</span>
          <Input
            type="date"
            value={filters.dateTo || ''}
            onChange={(e) => onFilterChange('dateTo', e.target.value)}
            className="bg-muted border-border text-foreground focus:border-[#60A5FA] focus:ring-[#60A5FA]"
            placeholder="Sampai"
          />
        </div>

        <Select 
          value={filters.status || 'all'} 
          onValueChange={(value) => onFilterChange('status', value)}
        >
          <SelectTrigger className="bg-muted border-border text-foreground focus:border-[#60A5FA] focus:ring-[#60A5FA]">
            <SelectValue placeholder="Pilih Status" />
          </SelectTrigger>
          <SelectContent className="bg-card border-border">
            {statusOptions.map((opt) => (
              <SelectItem 
                key={opt.value} 
                value={opt.value}
                className="text-foreground focus:bg-accent focus:text-accent-foreground focus:text-foreground"
              >
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select 
          value={filters.jasa || 'all'} 
          onValueChange={(value) => onFilterChange('jasa', value)}
        >
          <SelectTrigger className="bg-muted border-border text-foreground focus:border-[#60A5FA] focus:ring-[#60A5FA]">
            <SelectValue placeholder="Pilih Jasa Kirim" />
          </SelectTrigger>
          <SelectContent className="bg-card border-border z-50">
            {jasaOptions.map((opt) => (
              <SelectItem 
                key={opt.value} 
                value={opt.value}
                className="text-foreground focus:bg-accent focus:text-accent-foreground focus:text-foreground cursor-pointer"
              >
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {(filters.search || filters.dateFrom || filters.dateTo || filters.status !== 'all' || filters.jasa !== 'all') && (
        <div className="mt-4 flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="text-muted-foreground hover:text-foreground hover:bg-accent hover:text-accent-foreground"
          >
            <X className="w-4 h-4 mr-2" />
            Clear Filters
          </Button>
        </div>
      )}
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { cn } from "@/lib/utils";
import { formatRupiah } from '@/components/utils/currencyUtils';

export default function ProductSearch({ onSelectProduct, selectedProducts = [] }) {

  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => api.getProducts({ limit: 1000 }).then(res => res.products || []),
  });

  const filteredProducts = products.filter(p => {
    const search = searchTerm.toLowerCase();
    return (
      (p.nama_produk || '').toLowerCase().includes(search) ||
      (p.sku || '').toLowerCase().includes(search)
    );
  });

  const handleSelect = (product) => {
    onSelectProduct(product);
    setOpen(false);
    setSearchTerm('');
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          type="button"
          className="w-full justify-between bg-muted border-border text-foreground hover:bg-card hover:text-foreground"
        >
          <span className="text-muted-foreground">🔍 Cari dari Database Produk...</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0 bg-card border-border" align="start">
        <Command className="bg-card">
          <CommandInput 
            placeholder="Cari produk..." 
            value={searchTerm}
            onValueChange={setSearchTerm}
            className="bg-muted text-foreground"
          />
          <CommandList>
            <CommandEmpty className="text-muted-foreground py-6 text-center text-sm">
              Produk tidak ditemukan
            </CommandEmpty>
            <CommandGroup className="max-h-64 overflow-auto">
              {filteredProducts.slice(0, 50).map((product) => (
                <CommandItem
                  key={product.id}
                  value={`${product.nama_produk} ${product.sku}`}
                  onSelect={() => handleSelect(product)}
                  className="text-foreground hover:bg-accent hover:text-accent-foreground cursor-pointer"
                >
                  <div className="flex-1">
                    <div className="font-medium">{product.nama_produk}</div>
                    <div className="text-xs text-muted-foreground">
                      {product.sku && `SKU: ${product.sku} • `}
                      {formatRupiah(product.harga)}
                    </div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
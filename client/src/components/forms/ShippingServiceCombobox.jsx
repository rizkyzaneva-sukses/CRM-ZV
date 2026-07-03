import React, { useState, useRef, useEffect } from 'react';
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ShippingServiceCombobox({ value, onChange, services }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef(null);

  const selectedService = services.find(s => s.code === value);

  const filtered = services.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setSearch('');
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleSelect = (service) => {
    console.log('[ShippingServiceCombobox] handleSelect', service.code, service.name);
    onChange(service.code);
    setOpen(false);
    setSearch('');
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2 bg-muted border border-border rounded-md text-sm text-foreground hover:border-emerald-500/50 focus:outline-none focus:border-emerald-500"
      >
        <span className={cn(!selectedService && "text-muted-foreground")}>
          {selectedService ? selectedService.name : "Pilih jasa pengiriman..."}
        </span>
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </button>

      {open && (
        <div className="absolute z-[9999] mt-1 w-full bg-card border border-border rounded-md shadow-lg">
          {/* Search input */}
          <div className="flex items-center border-b border-border px-3">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <input
              autoFocus
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari jasa pengiriman..."
              className="w-full px-2 py-2 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
            />
          </div>

          {/* List */}
          <div className="max-h-56 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-4">Tidak ditemukan.</p>
            ) : (
              filtered.map((service) => (
                <div
                  key={service.id}
                  onClick={() => handleSelect(service)}
                  className="flex items-center px-3 py-2 text-sm text-foreground cursor-pointer hover:bg-accent hover:text-accent-foreground select-none"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4 shrink-0",
                      value === service.code ? "opacity-100 text-emerald-400" : "opacity-0"
                    )}
                  />
                  {service.name}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
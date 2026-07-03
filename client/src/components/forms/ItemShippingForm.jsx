import React, { useMemo } from 'react';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import ShippingServiceCombobox from './ShippingServiceCombobox';

/**
 * Per-item shipping info: hanya jasa pengiriman + berat + instruksi.
 * Alamat tujuan diambil dari form order utama (satu alamat untuk semua item).
 */
export default function ItemShippingForm({ item, index, allServices, onChange }) {
  const filteredServices = React.useMemo(() => {
    if (!allServices || allServices.length === 0) return [];
    if (!item.brand) return allServices;
    const normalize = (str) => str.toLowerCase().replace(/[\s.'`]/g, '');
    const brandNorm = normalize(item.brand);
    const matched = allServices.filter(s =>
      s.brand && normalize(s.brand) === brandNorm
    );
    return matched.length > 0 ? matched : allServices;
  }, [allServices, item.brand]);

  const update = (field, value) => onChange(index, field, value);

  return (
    <div className="mt-3 pt-3 border-t border-border space-y-3">
      <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wide">Pengiriman Item Ini</p>

      <div>
        <Label className="text-muted-foreground text-xs">Jasa Pengiriman *</Label>
        <div className="mt-1">
          <ShippingServiceCombobox
            value={item.jasa_pengiriman || ''}
            onChange={(v) => update('jasa_pengiriman', v)}
            services={filteredServices}
          />
        </div>
        {item.brand && filteredServices.length < allServices.length && (
          <p className="text-xs text-muted-foreground mt-1">
            Jasa kirim untuk brand: <span className="text-emerald-400">{item.brand}</span>
          </p>
        )}
      </div>

      <div>
        <Label className="text-muted-foreground text-xs">Instruksi Pengiriman</Label>
        <Input
          value={item.instruksi_pengiriman || ''}
          onChange={(e) => update('instruksi_pengiriman', e.target.value)}
          placeholder="Instruksi khusus untuk kurir..."
          className="mt-1 bg-card border-border text-foreground placeholder:text-muted-foreground focus:border-[#60A5FA]"
        />
      </div>
    </div>
  );
}
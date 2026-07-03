import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Layers } from 'lucide-react';
import ProductSearch from './ProductSearch';
import ItemShippingForm from './ItemShippingForm';
import ShippingServiceCombobox from './ShippingServiceCombobox';

// Dummy item used as the "global" shipping holder
const EMPTY_GLOBAL_SHIPPING = {
  jasa_pengiriman: '',
  berat_kg: 1,
  instruksi_pengiriman: '',
};

export default function OrderItemsForm({ items, onChange, shippingServices = [] }) {
  const [sameShipping, setSameShipping] = useState(false);
  const [globalShipping, setGlobalShipping] = useState(EMPTY_GLOBAL_SHIPPING);

  const applyGlobalShipping = (shipping, currentItems) => {
    return currentItems.map(item => ({
      ...item,
      jasa_pengiriman: shipping.jasa_pengiriman,
      berat_kg: shipping.berat_kg,
      instruksi_pengiriman: shipping.instruksi_pengiriman,
    }));
  };

  const handleGlobalShippingChange = (field, value) => {
    const updated = { ...globalShipping, [field]: value };
    setGlobalShipping(updated);
    onChange(applyGlobalShipping(updated, items));
  };

  const handleGlobalShippingMany = (fields) => {
    const updated = { ...globalShipping, ...fields };
    setGlobalShipping(updated);
    onChange(applyGlobalShipping(updated, items));
  };

  const handleToggle = () => {
    const next = !sameShipping;
    setSameShipping(next);
    if (next) {
      // Apply current global shipping to all items
      onChange(applyGlobalShipping(globalShipping, items));
    }
  };

  const addItem = () => {
    const newItem = { nama_produk: '', sku: '', qty: 1, harga_setelah_diskon: 0, jasa_pengiriman: '', berat_kg: 1 };
    const itemWithShipping = sameShipping ? { ...newItem, ...globalShipping } : newItem;
    onChange([...items, itemWithShipping]);
  };

  const removeItem = (index) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const updateItem = (index, fieldOrFields, value) => {
    const newItems = items.map((item, i) => {
      if (i !== index) return item;
      // Support passing an object of fields at once
      if (typeof fieldOrFields === 'object') {
        return { ...item, ...fieldOrFields };
      }
      return { ...item, [fieldOrFields]: value };
    });
    onChange(newItems);
  };

  const handleSelectProduct = (product) => {
    const newItem = { 
      nama_produk: product.nama_produk,
      sku: product.sku || '',
      qty: 1,
      harga_setelah_diskon: product.harga || 0,
      brand: product.brand || '',
      jasa_pengiriman: '',
      berat_kg: 1,
    };
    const itemWithShipping = sameShipping ? { ...newItem, ...globalShipping } : newItem;
    onChange([...items, itemWithShipping]);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-foreground text-base font-semibold">Produk / Item</Label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleToggle}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
              sameShipping
                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                : 'bg-muted border-border text-muted-foreground hover:border-emerald-500/30'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            {sameShipping ? 'Pengiriman Sama: ON' : 'Pengiriman Sama: OFF'}
          </button>
          <Button
            type="button"
            onClick={addItem}
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Tambah Manual
          </Button>
        </div>
      </div>

      {/* Global shipping panel */}
      {sameShipping && (
        <div className="p-4 bg-emerald-500/5 border border-emerald-500/30 rounded-lg space-y-3">
          <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wide">
            🚚 Pengiriman untuk Semua Produk
          </p>
          <div>
            <Label className="text-muted-foreground text-xs">Jasa Pengiriman *</Label>
            <div className="mt-1">
              <ShippingServiceCombobox
                value={globalShipping.jasa_pengiriman}
                onChange={(v) => handleGlobalShippingChange('jasa_pengiriman', v)}
                services={shippingServices}
              />
            </div>
          </div>
          <div>
            <Label className="text-muted-foreground text-xs">Instruksi Pengiriman</Label>
            <Input
              value={globalShipping.instruksi_pengiriman || ''}
              onChange={(e) => handleGlobalShippingChange('instruksi_pengiriman', e.target.value)}
              placeholder="Instruksi khusus untuk kurir..."
              className="mt-1 bg-card border-border text-foreground placeholder:text-muted-foreground focus:border-[#60A5FA]"
            />
          </div>
        </div>
      )}

      <ProductSearch onSelectProduct={handleSelectProduct} />

      {items.length === 0 && (
        <div className="p-6 bg-muted border border-border rounded-lg text-center">
          <p className="text-muted-foreground">Belum ada item. Klik "Tambah Item" untuk menambahkan produk.</p>
        </div>
      )}

      <div className="space-y-3">
        {items.map((item, index) => (
          <div 
            key={index} 
            className="p-4 bg-muted border border-border rounded-lg"
          >
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* Nama Produk */}
                  <div className="lg:col-span-2">
                    <Label className="text-muted-foreground text-xs">Nama Produk *</Label>
                    <Input
                      value={item.nama_produk}
                      onChange={(e) => updateItem(index, 'nama_produk', e.target.value)}
                      placeholder="Nama produk"
                      className="mt-1 bg-card border-border text-foreground placeholder:text-muted-foreground focus:border-[#60A5FA]"
                    />
                    {item.sku && (
                      <p className="text-xs text-muted-foreground mt-1">SKU: {item.sku}</p>
                    )}
                    {item.brand && (
                      <p className="text-xs text-emerald-400/70 mt-0.5">Brand: {item.brand}</p>
                    )}
                  </div>

                  {/* Qty */}
                  <div>
                    <Label className="text-muted-foreground text-xs">Qty *</Label>
                    <Input
                      type="number"
                      min="1"
                      value={item.qty}
                      onChange={(e) => updateItem(index, 'qty', parseInt(e.target.value) || 1)}
                      className="mt-1 bg-card border-border text-foreground focus:border-[#60A5FA]"
                    />
                  </div>

                  {/* Harga Total */}
                  <div>
                    <Label className="text-muted-foreground text-xs">Harga Total</Label>
                    <Input
                      type="number"
                      min="0"
                      value={item.harga_setelah_diskon || ''}
                      onChange={(e) => updateItem(index, 'harga_setelah_diskon', parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      className="mt-1 bg-card border-border text-foreground placeholder:text-muted-foreground focus:border-[#60A5FA]"
                    />
                  </div>
                </div>

                {/* Per-item shipping form - hidden when using global shipping */}
                {!sameShipping && (
                  <ItemShippingForm
                    item={item}
                    index={index}
                    allServices={shippingServices}
                    onChange={updateItem}
                  />
                )}
                {sameShipping && item.jasa_pengiriman && (
                  <div className="mt-2 text-xs text-emerald-400/70 italic">
                    📦 Menggunakan pengiriman global: {item.jasa_pengiriman}
                  </div>
                )}
              </div>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeItem(index)}
                className="text-red-400 hover:text-red-300 hover:bg-red-500/20 mt-5"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
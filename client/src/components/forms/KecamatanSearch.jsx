import React, { useState, useEffect, useMemo } from 'react';
import { api } from '@/lib/api';
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { X } from 'lucide-react';

export default function KecamatanSearch({ 
  isSAP, 
  serviceLabel = '',
  value = {},
  onChange,
}) {
  const provinsi = value.provinsi || '';
  const kotaKab = value.kota_kab || '';
  const kecamatan = value.kecamatan || '';
  const kecamatanKode = value.kecamatan_kode || '';
  const statusTercover = value.status_tercover || '';

  const [allData, setAllData] = useState([]);
  const [loadingData, setLoadingData] = useState(false);

  const entityName = isSAP ? 'KecamatanSAP' : 'KecamatanJNT';

  // Load all data on mount / when service type changes
  useEffect(() => {
    const loadAllData = async () => {
      setLoadingData(true);
      try {
        let allRecords = [];
        let skip = 0;
        const batchSize = 5000;
        let hasMore = true;
        
        while (hasMore) {
          let batch = [];
          if (isSAP) {
            const data = await api.getSapKecamatans({ limit: batchSize, skip });
            batch = data.data || [];
          } else {
            const data = await api.getJntKecamatans({ limit: batchSize, skip });
            batch = data.data || [];
          }
          allRecords = [...allRecords, ...batch];
          if (batch.length < batchSize) hasMore = false;
          else skip += batchSize;
        }
        setAllData(allRecords);
      } catch (error) {
        console.error('Error loading data:', error);
        setAllData([]);
      } finally {
        setLoadingData(false);
      }
    };
    loadAllData();
  }, [isSAP]);

  // Derived lists - all independent, filtered by other fields if they are set
  const provinsiList = useMemo(() => {
    // If kota or kecamatan is selected, filter provinsi list accordingly
    let filtered = allData;
    if (kotaKab) filtered = filtered.filter(d => d.kota_kab === kotaKab);
    if (kecamatan) filtered = filtered.filter(d => d.kecamatan === kecamatan);
    return [...new Set(filtered.map(d => d.provinsi).filter(Boolean))].sort();
  }, [allData, kotaKab, kecamatan]);

  const kotaList = useMemo(() => {
    let filtered = allData;
    if (provinsi) filtered = filtered.filter(d => d.provinsi === provinsi);
    if (kecamatan) filtered = filtered.filter(d => d.kecamatan === kecamatan);
    return [...new Set(filtered.map(d => d.kota_kab).filter(Boolean))].sort();
  }, [allData, provinsi, kecamatan]);

  const kecamatanList = useMemo(() => {
    let filtered = allData;
    if (provinsi) filtered = filtered.filter(d => d.provinsi === provinsi);
    if (kotaKab) filtered = filtered.filter(d => d.kota_kab === kotaKab);
    return filtered;
  }, [allData, provinsi, kotaKab]);

  const handleProvinsiChange = (newProvinsi) => {
    const kotaStillValid = kotaKab && allData.some(d => d.provinsi === newProvinsi && d.kota_kab === kotaKab);
    const kecStillValid = kotaStillValid && kecamatan && allData.some(d => d.provinsi === newProvinsi && d.kota_kab === kotaKab && d.kecamatan === kecamatan);
    onChange({
      provinsi: newProvinsi,
      kota_kab: kotaStillValid ? kotaKab : '',
      kecamatan: kecStillValid ? kecamatan : '',
      kecamatan_kode: kecStillValid ? kecamatanKode : '',
      status_tercover: kecStillValid ? statusTercover : '',
    });
  };

  const handleKotaChange = (newKota) => {
    // Auto-fill provinsi if not yet set
    let newProvinsi = provinsi;
    if (!newProvinsi) {
      const match = allData.find(d => d.kota_kab === newKota);
      if (match) newProvinsi = match.provinsi;
    }
    const kecStillValid = kecamatan && allData.some(d => d.provinsi === newProvinsi && d.kota_kab === newKota && d.kecamatan === kecamatan);
    onChange({
      provinsi: newProvinsi,
      kota_kab: newKota,
      kecamatan: kecStillValid ? kecamatan : '',
      kecamatan_kode: kecStillValid ? kecamatanKode : '',
      status_tercover: kecStillValid ? statusTercover : '',
    });
  };

  const handleKecamatanChange = (kecamatanValue) => {
    const selectedItem = kecamatanList.find(item => 
      isSAP ? item.kode === kecamatanValue : item.kecamatan === kecamatanValue
    );
    if (selectedItem) {
      onChange({
        provinsi: selectedItem.provinsi,
        kota_kab: selectedItem.kota_kab,
        kecamatan: selectedItem.kecamatan,
        kecamatan_kode: selectedItem.kode || '',
        status_tercover: selectedItem.status_tercover || '',
      });
    }
  };

  const handleClear = () => {
    onChange({ provinsi: '', kota_kab: '', kecamatan: '', kecamatan_kode: '', status_tercover: '' });
  };

  return (
    <div className="space-y-3">
      <Label className="text-muted-foreground">
        Alamat Tujuan{' '}
        {isSAP
          ? <span className="text-red-400">* ({serviceLabel || 'SAP'})</span>
          : <span className="text-blue-400">({serviceLabel || 'J&T'})</span>
        }
      </Label>
      
      {kecamatan ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2 p-3 bg-muted border border-emerald-500/30 rounded-lg">
            <div className="flex-1">
              <p className="text-foreground font-medium">{kecamatan}</p>
              <p className="text-sm text-muted-foreground">
                {kotaKab}, {provinsi}
                {isSAP && kecamatanKode && (
                  <span className="ml-2 text-emerald-400">({kecamatanKode})</span>
                )}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="text-muted-foreground hover:text-red-400"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          {isSAP && statusTercover?.toLowerCase() === 'tidak' && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <span className="text-red-400 text-sm font-semibold">
                ⚠️ Kecamatan ini TIDAK TERCOVER untuk COD SAP
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Provinsi Dropdown */}
          <div>
            <Label className="text-xs text-muted-foreground">
              Provinsi {serviceLabel || (isSAP ? 'SAP' : 'J&T')} <span className="text-red-400">*</span>
            </Label>
            <SearchableSelect
              options={provinsiList}
              value={provinsi}
              onValueChange={handleProvinsiChange}
              placeholder="Pilih Provinsi"
              searchPlaceholder="Cari provinsi..."
              emptyText="Provinsi tidak ditemukan"
              disabled={loadingData}
              loading={loadingData}
              className="mt-1"
            />
          </div>

          {/* Kota/Kabupaten Dropdown */}
          <div>
            <Label className="text-xs text-muted-foreground">
              Kota/Kabupaten <span className="text-red-400">*</span>
            </Label>
            <SearchableSelect
              options={kotaList}
              value={kotaKab}
              onValueChange={handleKotaChange}
              placeholder="Pilih Kota/Kab"
              searchPlaceholder="Cari kota/kabupaten..."
              emptyText="Kota/Kabupaten tidak ditemukan"
              disabled={loadingData}
              loading={loadingData}
              className="mt-1"
            />
          </div>

          {/* Kecamatan Dropdown */}
          <div>
            <Label className="text-xs text-muted-foreground">
              Kecamatan <span className="text-red-400">*</span>
            </Label>
            <SearchableSelect
              options={kecamatanList.map(item => ({
                value: isSAP ? item.kode : item.kecamatan,
                label: item.kecamatan,
                status_tercover: item.status_tercover,
              }))}
              value={isSAP ? kecamatanKode : kecamatan}
              onValueChange={handleKecamatanChange}
              placeholder="Pilih Kecamatan"
              searchPlaceholder="Cari kecamatan..."
              emptyText="Kecamatan tidak ditemukan"
              disabled={loadingData}
              loading={loadingData}
              className="mt-1"
              renderOption={(opt) => (
                <div className="flex items-center justify-between gap-2 w-full">
                  <span>{opt.label}</span>
                  {isSAP && opt.status_tercover?.toLowerCase() === 'tidak' && (
                    <span className="text-xs text-red-400 ml-2">⚠️</span>
                  )}
                </div>
              )}
            />
            {isSAP && kecamatanList.length > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                {kecamatanList.length} kecamatan tersedia
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
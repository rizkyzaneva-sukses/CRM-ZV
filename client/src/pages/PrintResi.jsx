import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Printer, Loader2, CheckCircle, Truck, Package, Calendar } from 'lucide-react';
import ResiLabel from '@/components/resi/ResiLabel';
import { normalizeShippingService } from '@/components/utils/shippingUtils';
import { formatInJakarta, getTodayJakarta } from '@/components/utils/dateUtils';

const SENDER_PHONES = {
  'dita.zaneva@gmail.com': '089519039004',
  'yuni.zaneva@gmail.com': '089665969788',
  'trinda.zaneva@gmail.com': '08999474785',
  'mariss.zaneva@gmail.com': '089514332654',
  'cs1.zaneva@gmail.com': '0895389734443',
  'ayu.zaneva@gmail.com': '081322298649',
};

const getSenderPhone = (creator) => SENDER_PHONES[creator?.email] || creator?.no_telepon || '6289601245330';

const PAGE_STYLE = `
  body { margin: 0; padding: 0; background: #f0f0f0; }
  .page { width: 105mm; min-height: 148mm; margin: 0 auto; background: white; font-family: Arial, sans-serif; page-break-after: always; page-break-inside: avoid; box-sizing: border-box; display: flex; flex-direction: column; }
  @media print { @page { size: A6; margin: 0; } body { margin: 0; } .page { margin: 0; width: 105mm; } }
`;

const buildLabelHtml = (order, items, senderName, senderPhone, barcodeResiId, barcodeIdId, resiNumber) => `
  <div class="page">
    <div style="display:flex;align-items:center;justify-content:space-between;padding:4mm 5mm;border-bottom:2px solid #333;background:#f9f9f9;">
      <div style="font-size:20px;font-weight:bold;color:#DC9F22;text-transform:uppercase;letter-spacing:1px;">${order.jasa_pengiriman}</div>
      <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/697c43e2fd72710ff21fd6b8/84d44c01e_1-ZANEVA4.png" alt="Zaneva" style="height:12mm;" />
    </div>
    <div style="padding:4mm 5mm;flex:1;display:flex;flex-direction:column;">
      <div style="text-align:center;margin-bottom:4mm;padding-bottom:4mm;border-bottom:1px solid #333;">
        <div style="font-size:11px;font-weight:bold;color:#333;margin-bottom:2mm;">NO. RESI</div>
        <svg id="${barcodeResiId}" style="width:100%;display:block;"></svg>
        <div style="font-size:16px;font-weight:bold;letter-spacing:1px;margin-top:2mm;">${resiNumber}</div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:4mm;margin-bottom:3mm;">
        <div>
          <div style="font-weight:bold;font-size:10px;color:#0066CC;margin-bottom:1mm;text-transform:uppercase;">PENERIMA</div>
          <div style="font-weight:bold;font-size:13px;line-height:1.4;margin-bottom:1mm;">${order.nama_pemesan}</div>
          <div style="font-size:12px;color:#333;">${order.no_telepon}</div>
        </div>
        <div>
          <div style="font-weight:bold;font-size:10px;color:#0066CC;margin-bottom:1mm;text-transform:uppercase;">PENGIRIM</div>
          <div style="font-weight:bold;font-size:13px;line-height:1.4;margin-bottom:1mm;">${senderName}</div>
          <div style="font-size:12px;color:#333;">${senderPhone}</div>
        </div>
      </div>
      ${order.order_date ? `<div style="font-size:10px;color:#555;margin-bottom:3mm;"><b>Tgl Order:</b> ${order.order_date}</div>` : ''}
      <div style="margin-bottom:3mm;padding-bottom:3mm;border-bottom:1px solid #ddd;">
        <div style="font-weight:bold;font-size:10px;color:#0066CC;margin-bottom:1mm;text-transform:uppercase;">ALAMAT TUJUAN</div>
        <div style="font-size:12px;line-height:1.5;word-wrap:break-word;color:#333;">${order.alamat} ${order.kecamatan}, ${order.kota_kab}, ${order.provinsi} ${order.kode_pos || ''}</div>
      </div>
      ${order.instruksi_pengiriman ? `
      <div style="margin-bottom:3mm;padding-bottom:3mm;border-bottom:1px solid #ddd;">
        <div style="font-weight:bold;font-size:10px;color:#0066CC;margin-bottom:1mm;text-transform:uppercase;">INSTRUKSI</div>
        <div style="font-size:11px;line-height:1.4;font-style:italic;color:#333;">${order.instruksi_pengiriman}</div>
      </div>` : ''}
      <div style="margin-bottom:3mm;">
        <div style="font-weight:bold;font-size:10px;color:#0066CC;margin-bottom:1mm;text-transform:uppercase;">BARANG</div>
        <div style="font-size:11px;line-height:1.5;">${items.map(item => `<div style="color:#333;">• ${item.nama_produk} (x${item.qty})</div>`).join('')}</div>
      </div>
      <div style="text-align:center;padding-top:3mm;border-top:1px solid #ddd;margin-top:auto;">
        <div style="font-size:10px;color:#0066CC;margin-bottom:1mm;font-weight:bold;text-transform:uppercase;">ID ORDER</div>
        <svg id="${barcodeIdId}" style="width:100%;display:block;"></svg>
        <div style="font-size:12px;font-weight:bold;letter-spacing:1px;margin-top:1mm;color:#333;">${order.order_number}</div>
      </div>
    </div>
  </div>
`;

const buildBarcodeScript = (entries) => entries.map(({ resiId, resiVal, idId, idVal }) => `
  JsBarcode("#${resiId}", "${resiVal}", {format:"CODE128", width:2.5, height:60, displayValue:false, margin:0});
  document.getElementById("${resiId}").style.width="100%";
  JsBarcode("#${idId}", "${idVal}", {format:"CODE128", width:1.5, height:35, displayValue:false, margin:0});
  document.getElementById("${idId}").style.width="100%";
`).join('');

const openPrintWindow = (title, pagesHtml, barcodeScript) => {
  const win = window.open('', '', 'width=700,height=900');
  win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${title}</title>
    <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"><\/script>
    <style>${PAGE_STYLE}</style></head>
    <body onload="window.print();">${pagesHtml}<script>${barcodeScript}<\/script></body></html>`);
  win.document.close();
};



export default function PrintResi({ user, customRole }) {
  const isFinance = customRole === 'FINANCE' || customRole === 'OWNER' || customRole === 'INVENTORI';
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [selectedSapJntOrders, setSelectedSapJntOrders] = useState([]);
  const [printingOrderId, setPrintingOrderId] = useState(null);
  const [showPrinted, setShowPrinted] = useState(true);
  const [showUnprinted, setShowUnprinted] = useState(true);
  const [showPrintedSapJnt, setShowPrintedSapJnt] = useState(true);
  const [showUnprintedSapJnt, setShowUnprintedSapJnt] = useState(true);
  const queryClient = useQueryClient();

  // Filter tanggal — default: hari ini untuk STAFF, 7 hari terakhir untuk Finance
  const today = getTodayJakarta();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const [dateFrom, setDateFrom] = useState(isFinance ? sevenDaysAgo : today);
  const [dateTo, setDateTo] = useState(today);

  const toggleOrderSelection = (orderId) => {
    setSelectedOrders(prev =>
      prev.includes(orderId)
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    );
  };

  const toggleSapJntOrderSelection = (orderId) => {
    setSelectedSapJntOrders(prev =>
      prev.includes(orderId)
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    );
  };

  // Get orders for SAP & J&T — filter server-side by tanggal
  const { data: sapJntOrders = [] } = useQuery({
    queryKey: ['sapJntOrders', user?.email, isFinance, dateFrom, dateTo],
    queryFn: async () => {
      const params = { limit: 500, date_from: dateFrom, date_to: dateTo };
      if (!isFinance) params.created_by = user?.email;
      const data = await api.getOrders(params);
      const allOrders = data.orders || [];
      return allOrders.filter(o => {
        const normalized = normalizeShippingService(o.jasa_pengiriman);
        return (o.status_pesanan === 'READY_TO_PROCESS' || o.status_pesanan === 'RESI_UPDATED') && 
          (normalized === 'sap' || normalized === 'jnt');
      });
    },
    enabled: !!user,
  });

  // Get orders for non-SAP, non-J&T — filter server-side by tanggal
  const { data: orders = [] } = useQuery({
    queryKey: ['otherExpedisiOrders', user?.email, isFinance, dateFrom, dateTo],
    queryFn: async () => {
      const params = { limit: 500, date_from: dateFrom, date_to: dateTo };
      if (!isFinance) params.created_by = user?.email;
      const data = await api.getOrders(params);
      const allOrders = data.orders || [];
      return allOrders.filter(o => {
        const normalized = normalizeShippingService(o.jasa_pengiriman);
        return (o.status_pesanan === 'READY_TO_PROCESS' || o.status_pesanan === 'RESI_UPDATED') && 
          normalized !== 'sap' && normalized !== 'jnt';
      });
    },
    enabled: !!user,
  });

  // Get print logs
  const { data: printLogs = [] } = useQuery({
    queryKey: ['printLogs'],
    queryFn: () => api.getPrintLogs({ limit: 1000 }).then(res => res.print_logs || []),
  });

  // allOrderItems TIDAK di-load saat halaman buka — hanya di-fetch on-demand saat print
  // Lihat fungsi getItemsForOrderAsync di bawah

  // Get all users (for penginput info)
  const { data: allUsers = [] } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => api.getUsers().then(res => res.users || []),
  });

  // Fetch items on-demand saat print
  const getItemsForOrderAsync = async (orderId) => {
    const res = await api.getOrderItems({ order_id: orderId, limit: 50 });
    return res.order_items || [];
  };

  const getOrderCreator = (orderCreatedBy) => {
    const found = allUsers.find(u => u.email === orderCreatedBy);
    // Jika tidak ketemu di allUsers, kembalikan object minimal dengan email sebagai full_name
    if (!found && orderCreatedBy) {
      return { email: orderCreatedBy, full_name: orderCreatedBy.split('@')[0] };
    }
    return found;
  };

  const getOrderPrintStatus = (orderId) => {
    return printLogs.find(log => log.order_id === orderId);
  };

  const unprinted = orders.filter(o => !getOrderPrintStatus(o.id));
  const printed = orders.filter(o => getOrderPrintStatus(o.id));

  const filteredOrders = [
    ...(showUnprinted ? unprinted : []),
    ...(showPrinted ? printed : [])
  ];

  const unprintedSapJnt = sapJntOrders.filter(o => !getOrderPrintStatus(o.id) && o.no_resi);
  const unprintedSapJntNoResi = sapJntOrders.filter(o => !getOrderPrintStatus(o.id) && !o.no_resi);
  const printedSapJnt = sapJntOrders.filter(o => getOrderPrintStatus(o.id));

  const filteredSapJntOrders = [
    ...(showUnprintedSapJnt ? unprintedSapJnt : []),
    ...(showPrintedSapJnt ? printedSapJnt : [])
  ];

  // Generate nomor resi otomatis untuk ekspedisi non-SAP/non-J&T
  const generateAutoResi = (order) => {
    const ts = Date.now().toString().slice(-6);
    const prefix = (order.jasa_pengiriman || 'EXP').toUpperCase().slice(0, 3).replace(/\s/g,'');
    return `${prefix}${ts}${Math.floor(Math.random()*900+100)}`;
  };

  // Print mutation untuk SAP/J&T — hanya jika sudah punya no_resi dari upload
  const generateResiMutation = useMutation({
    mutationFn: async (order) => {
      if (!order.no_resi) {
        throw new Error(`Order ${order.order_number} belum memiliki nomor resi. Upload resi terlebih dahulu.`);
      }
      await api.createPrintLog({
        order_id: order.id,
        order_number: order.order_number,
        no_resi: order.no_resi,
      });
      return order;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['printLogs'] });
    },
  });

  // Print mutation untuk ekspedisi lain — generate resi otomatis jika belum ada
  const generateOtherResiMutation = useMutation({
    mutationFn: async (order) => {
      let resi = order.no_resi;
      if (!resi) {
        resi = generateAutoResi(order);
        await api.updateResi(order.id, resi);
      }
      await api.createPrintLog({
        order_id: order.id,
        order_number: order.order_number,
        no_resi: resi,
      });
      return { ...order, no_resi: resi };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['printLogs'] });
      queryClient.invalidateQueries({ queryKey: ['otherExpedisiOrders'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  const handleBatchGenerateAndPrint = async () => {
    const ordersToProcess = orders.filter(o => selectedOrders.includes(o.id));
    if (ordersToProcess.length === 0) return;

    setPrintingOrderId('batch');
    try {
      const updatedOrders = await Promise.all(
        ordersToProcess.map(order => generateOtherResiMutation.mutateAsync(order))
      );

      // Fetch items for all orders in batch (on-demand)
      const itemsMap = {};
      await Promise.all(updatedOrders.map(async order => {
        itemsMap[order.id] = await getItemsForOrderAsync(order.id);
      }));

      // Create batch print window
      setTimeout(() => {
        const pagesHtml = updatedOrders.map((order, idx) => {
          const creator = getOrderCreator(order.created_by);
          return buildLabelHtml(order, itemsMap[order.id] || [], creator?.full_name || 'Zaneva', getSenderPhone(creator), `resi${idx}`, `id${idx}`, order.no_resi);
        }).join('');
        const barcodeScript = buildBarcodeScript(updatedOrders.map((order, idx) => ({
          resiId: `resi${idx}`, resiVal: order.no_resi, idId: `id${idx}`, idVal: order.order_number
        })));
        openPrintWindow('Batch Print Resi', pagesHtml, barcodeScript);
        setSelectedOrders([]);
        setSelectedSapJntOrders([]);
      }, 500);
    } finally {
      setPrintingOrderId(null);
    }
  };

  const handleReprintFromLog = async (log) => {
    const allOrdersList = [...sapJntOrders, ...orders];
    const order = allOrdersList.find(o => o.order_number === log.order_number);
    if (!order) {
      alert('Order tidak ditemukan atau sudah tidak dalam status READY_TO_PROCESS');
      return;
    }
    const creator = getOrderCreator(order.created_by);
    const items = await getItemsForOrderAsync(order.id);
    const pageHtml = buildLabelHtml(order, items, creator?.full_name || 'Zaneva', getSenderPhone(creator), 'resi0', 'id0', log.no_resi);
    const barcodeScript = buildBarcodeScript([{ resiId: 'resi0', resiVal: log.no_resi, idId: 'id0', idVal: order.order_number }]);
    openPrintWindow(`Reprint - ${log.order_number}`, pageHtml, barcodeScript);
  };

  const handleBatchGenerateAndPrintSapJnt = async () => {
    const ordersToProcess = sapJntOrders.filter(o => selectedSapJntOrders.includes(o.id));
    if (ordersToProcess.length === 0) return;

    setPrintingOrderId('batch-sapjnt');
    try {
      const updatedOrders = await Promise.all(
        ordersToProcess.map(order => generateResiMutation.mutateAsync(order))
      );

      const itemsMap = {};
      await Promise.all(updatedOrders.map(async order => {
        itemsMap[order.id] = await getItemsForOrderAsync(order.id);
      }));

      setTimeout(() => {
        const pagesHtml = updatedOrders.map((order, idx) => {
          const creator = getOrderCreator(order.created_by);
          return buildLabelHtml(order, itemsMap[order.id] || [], creator?.full_name || 'Zaneva', getSenderPhone(creator), `resi${idx}`, `id${idx}`, order.no_resi);
        }).join('');
        const barcodeScript = buildBarcodeScript(updatedOrders.map((order, idx) => ({
          resiId: `resi${idx}`, resiVal: order.no_resi, idId: `id${idx}`, idVal: order.order_number
        })));
        openPrintWindow('Batch Print Resi SAP/J&T', pagesHtml, barcodeScript);
        setSelectedSapJntOrders([]);
      }, 500);
    } finally {
      setPrintingOrderId(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Print Resi Label</h1>
          <p className="text-muted-foreground mt-1">
            Generate dan print resi untuk semua ekspedisi
          </p>
        </div>
        {/* Filter Tanggal */}
        <div className="flex items-end gap-3 flex-wrap">
          <div>
            <Label className="text-muted-foreground text-xs">Dari Tanggal</Label>
            <Input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="mt-1 bg-muted border-border text-foreground"
            />
          </div>
          <div>
            <Label className="text-muted-foreground text-xs">Sampai Tanggal</Label>
            <Input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="mt-1 bg-muted border-border text-foreground"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setDateFrom(today); setDateTo(today); }}
            className="border-border text-muted-foreground hover:text-foreground"
          >
            Hari Ini
          </Button>
        </div>
      </div>

      <Tabs defaultValue="sapjnt" className="space-y-4">
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="sapjnt" className="data-[state=active]:bg-emerald-500/20">
            <Truck className="w-4 h-4 mr-2" />
            SAP & J&T ({sapJntOrders.length})
            {unprintedSapJntNoResi.length > 0 && <span className="ml-1 text-amber-400">({unprintedSapJntNoResi.length} belum ada resi)</span>}
          </TabsTrigger>
          <TabsTrigger value="other" className="data-[state=active]:bg-emerald-500/20">
            <Package className="w-4 h-4 mr-2" />
            Ekspedisi Lain ({orders.length})
          </TabsTrigger>
        </TabsList>

        {/* TAB SAP & J&T */}
        <TabsContent value="sapjnt">
          <Card className="bg-card border-border p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-foreground">SAP & J&T Orders</h2>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border hover:border-emerald-500/50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showUnprintedSapJnt}
                    onChange={(e) => setShowUnprintedSapJnt(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-muted-foreground">Belum Cetak ({unprintedSapJnt.length})</span>
                </label>
                <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border hover:border-emerald-500/50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showPrintedSapJnt}
                    onChange={(e) => setShowPrintedSapJnt(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-muted-foreground">Sudah Cetak ({printedSapJnt.length})</span>
                </label>
              </div>
            </div>

            {filteredSapJntOrders.length === 0 ? (
              <p className="text-muted-foreground py-6 text-center">Tidak ada order SAP/J&T untuk ditampilkan.</p>
            ) : (
              <>
                <div className="overflow-x-auto mb-6 border border-border rounded-lg">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted">
                        <th className="px-4 py-3 text-left">
                          <input
                            type="checkbox"
                            checked={filteredSapJntOrders.length > 0 && selectedSapJntOrders.length === unprintedSapJnt.length && unprintedSapJnt.length > 0}
                            onChange={() => {
                              if (selectedSapJntOrders.length === unprintedSapJnt.length) {
                                setSelectedSapJntOrders([]);
                              } else {
                                setSelectedSapJntOrders(unprintedSapJnt.map(o => o.id));
                              }
                            }}
                            className="w-4 h-4 cursor-pointer"
                          />
                        </th>
                        <th className="px-4 py-3 text-left font-semibold text-muted-foreground">No Order</th>
                        <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Tanggal Order</th>
                        <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Penerima</th>
                        <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Ekspedisi</th>
                        <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Resi</th>
                        <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Status</th>
                        <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSapJntOrders.map((order) => {
                        const printLog = getOrderPrintStatus(order.id);
                        const isPrinted = !!printLog;
                        const hasResi = !!order.no_resi;
                        return (
                          <tr key={order.id} className={`border-b border-border hover:bg-muted/50 ${!hasResi && !isPrinted ? 'opacity-60' : ''}`}>
                            <td className="px-4 py-3">
                              <input
                                type="checkbox"
                                checked={selectedSapJntOrders.includes(order.id)}
                                onChange={() => toggleSapJntOrderSelection(order.id)}
                                className="w-4 h-4 cursor-pointer"
                                disabled={isPrinted || !hasResi}
                              />
                            </td>
                            <td className="px-4 py-3 font-semibold text-foreground">{order.order_number}</td>
                            <td className="px-4 py-3 text-muted-foreground">{order.order_date ? formatInJakarta(order.order_date, 'dd MMM yyyy') : '-'}</td>
                            <td className="px-4 py-3 text-muted-foreground">{order.nama_pemesan}</td>
                            <td className="px-4 py-3 text-muted-foreground">{order.jasa_pengiriman}</td>
                            <td className="px-4 py-3 font-mono text-foreground">{order.no_resi || <span className="text-amber-400 text-xs">Belum ada resi</span>}</td>
                            <td className="px-4 py-3">
                              {isPrinted ? (
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 rounded text-xs font-medium">
                                  ✓ Sudah Cetak
                                </span>
                              ) : !hasResi ? (
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-500/20 border border-orange-500/50 text-orange-400 rounded text-xs font-medium">
                                  ⚠ Upload Resi Dulu
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-500/20 border border-amber-500/50 text-amber-400 rounded text-xs font-medium">
                                  ⏳ Belum Cetak
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {isPrinted && (
                                <Button
                                  onClick={() => {
                                    setSelectedSapJntOrders([order.id]);
                                    setTimeout(handleBatchGenerateAndPrintSapJnt, 100);
                                  }}
                                  variant="ghost"
                                  size="sm"
                                  className="text-blue-400 hover:bg-blue-500/20 text-xs"
                                >
                                  Reprint
                                </Button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {unprintedSapJnt.filter(o => selectedSapJntOrders.includes(o.id)).length > 0 && (
                  <Button
                    onClick={handleBatchGenerateAndPrintSapJnt}
                    disabled={printingOrderId === 'batch-sapjnt'}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    {printingOrderId === 'batch-sapjnt' ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing {selectedSapJntOrders.length} Orders
                      </>
                    ) : (
                      <>
                        <Printer className="w-4 h-4 mr-2" />
                        Print {selectedSapJntOrders.length} Resi Label
                      </>
                    )}
                  </Button>
                )}
              </>
            )}
          </Card>
        </TabsContent>

        {/* TAB EKSPEDISI LAIN */}
        <TabsContent value="other">
          <Card className="bg-card border-border p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-foreground">Ekspedisi Lainnya</h2>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border hover:border-emerald-500/50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showUnprinted}
                    onChange={(e) => setShowUnprinted(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-muted-foreground">Belum Cetak ({unprinted.length})</span>
                </label>
                <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border hover:border-emerald-500/50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showPrinted}
                    onChange={(e) => setShowPrinted(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-muted-foreground">Sudah Cetak ({printed.length})</span>
                </label>
              </div>
            </div>

            {filteredOrders.length === 0 ? (
              <p className="text-muted-foreground py-6 text-center">Tidak ada order untuk ditampilkan.</p>
            ) : (
              <>
                <div className="overflow-x-auto mb-6 border border-border rounded-lg">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted">
                        <th className="px-4 py-3 text-left">
                          <input
                            type="checkbox"
                            checked={filteredOrders.length > 0 && selectedOrders.length === unprinted.length && unprinted.length > 0}
                            onChange={() => {
                              if (selectedOrders.length === unprinted.length) {
                                setSelectedOrders([]);
                              } else {
                                setSelectedOrders(unprinted.map(o => o.id));
                              }
                            }}
                            className="w-4 h-4 cursor-pointer"
                          />
                        </th>
                        <th className="px-4 py-3 text-left font-semibold text-muted-foreground">No Order</th>
                        <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Tanggal Order</th>
                        <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Penerima</th>
                        <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Ekspedisi</th>
                        <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Resi</th>
                        <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Status</th>
                        <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOrders.map((order) => {
                        const printLog = getOrderPrintStatus(order.id);
                        const isPrinted = !!printLog;
                        const hasResi = !!order.no_resi;
                        return (
                          <tr key={order.id} className="border-b border-border hover:bg-muted/50">
                            <td className="px-4 py-3">
                              <input
                                type="checkbox"
                                checked={selectedOrders.includes(order.id)}
                                onChange={() => toggleOrderSelection(order.id)}
                                className="w-4 h-4 cursor-pointer"
                                disabled={isPrinted}
                              />
                            </td>
                            <td className="px-4 py-3 font-semibold text-foreground">{order.order_number}</td>
                            <td className="px-4 py-3 text-muted-foreground">{order.order_date ? formatInJakarta(order.order_date, 'dd MMM yyyy') : '-'}</td>
                            <td className="px-4 py-3 text-muted-foreground">{order.nama_pemesan}</td>
                            <td className="px-4 py-3 text-muted-foreground">{order.jasa_pengiriman}</td>
                            <td className="px-4 py-3 font-mono text-foreground">{order.no_resi || <span className="text-muted-foreground text-xs italic">Auto-generate saat cetak</span>}</td>
                            <td className="px-4 py-3">
                              {isPrinted ? (
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 rounded text-xs font-medium">
                                  ✓ Sudah Cetak
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-500/20 border border-amber-500/50 text-amber-400 rounded text-xs font-medium">
                                  ⏳ Belum Cetak
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {isPrinted && (
                                <Button
                                  onClick={() => {
                                    setSelectedOrders([order.id]);
                                    setTimeout(handleBatchGenerateAndPrint, 100);
                                  }}
                                  variant="ghost"
                                  size="sm"
                                  className="text-blue-400 hover:bg-blue-500/20 text-xs"
                                >
                                  Reprint
                                </Button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {unprinted.filter(o => selectedOrders.includes(o.id)).length > 0 && (
                  <Button
                    onClick={handleBatchGenerateAndPrint}
                    disabled={printingOrderId === 'batch'}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    {printingOrderId === 'batch' ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing {selectedOrders.length} Orders
                      </>
                    ) : (
                      <>
                        <Printer className="w-4 h-4 mr-2" />
                        Print {selectedOrders.length} Resi Label
                      </>
                    )}
                  </Button>
                )}
              </>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      <Card className="bg-card border-border p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Log Print Resi</h2>
        {printLogs.length === 0 ? (
          <p className="text-muted-foreground">Belum ada print log.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="text-left py-3 px-3">Order Number</th>
                  <th className="text-left py-3 px-3">No. Resi</th>
                  <th className="text-left py-3 px-3">Printed By</th>
                  <th className="text-left py-3 px-3">Tanggal Print</th>
                  <th className="text-left py-3 px-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {printLogs.map(log => (
                  <tr key={log.id} className="border-b border-border hover:bg-muted">
                    <td className="py-3 px-3 text-foreground">{log.order_number}</td>
                    <td className="py-3 px-3 text-foreground font-mono">{log.no_resi}</td>
                    <td className="py-3 px-3 text-muted-foreground">{log.printed_by}</td>
                    <td className="py-3 px-3 text-muted-foreground">
                      {formatInJakarta(log.created_date, 'dd MMM yyyy HH:mm')}
                    </td>
                    <td className="py-3 px-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleReprintFromLog(log)}
                        className="text-blue-400 hover:bg-blue-500/20 text-xs"
                      >
                        <Printer className="w-3 h-3 mr-1" />
                        Re-print
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
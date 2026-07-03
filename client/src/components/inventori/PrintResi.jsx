import React, { useState, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Printer } from 'lucide-react';
import JsBarcode from 'jsbarcode';

export default function PrintResi({ orders }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [paperSize, setPaperSize] = useState('a6');
  const [customWidth, setCustomWidth] = useState('10');
  const [customHeight, setCustomHeight] = useState('15');

  const filteredOrders = orders.filter(order => 
    order.order_number?.includes(searchQuery) || 
    order.nama_pemesan?.toLowerCase().includes(searchQuery.toLowerCase())
  ).filter(o => o.no_resi);

  const toggleOrder = (orderId) => {
    setSelectedOrders(prev =>
      prev.includes(orderId)
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    );
  };

  const handlePrint = () => {
    if (selectedOrders.length === 0) {
      alert('Pilih minimal 1 order untuk diprint');
      return;
    }

    const ordersToprint = orders.filter(o => selectedOrders.includes(o.id));
    const printWindow = window.open('', '_blank');
    
    // Tentukan ukuran berdasarkan pilihan
    let pageSize = 'A6';
    let labelHeight = '240mm';
    
    if (paperSize === 'custom') {
      pageSize = `${customWidth}cm ${customHeight}cm`;
      labelHeight = `${parseFloat(customHeight) * 10}mm`;
    }
    
    let printContent = '<html><head><style>';
    printContent += `
      @page { size: ${pageSize}; margin: 0; }
      body { font-family: Arial, sans-serif; margin: 0; padding: 0; }
      .label { 
        page-break-after: always; 
        width: 100%;
        height: ${labelHeight};
        padding: 6mm;
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
      }
      .label-header {
        text-align: center;
        border-bottom: 2px solid #000;
        padding-bottom: 2mm;
        margin-bottom: 3mm;
        font-size: 14pt;
        font-weight: bold;
      }
      .logo-text {
        display: inline-block;
        font-size: 16pt;
        font-weight: bold;
      }
      .logo-part1 {
        color: #B8860B;
      }
      .logo-circle {
        display: inline-block;
        background: #B8860B;
        color: white;
        width: 20pt;
        height: 20pt;
        border-radius: 50%;
        line-height: 20pt;
        text-align: center;
        margin: 0 3pt;
        font-weight: bold;
        font-size: 12pt;
      }
      .logo-part2 {
        color: #B8860B;
      }
      .resi-label {
        text-align: center;
        font-weight: bold;
        font-size: 11pt;
        margin-bottom: 2mm;
      }
      .section {
        margin-bottom: 3mm;
        font-size: 10pt;
      }
      .section-title {
        font-weight: bold;
        text-transform: uppercase;
        border-bottom: 1px solid #999;
        padding-bottom: 0.5mm;
        margin-bottom: 1mm;
        color: #0066CC;
        font-size: 9pt;
      }
      .section-content {
        line-height: 1.3;
        font-size: 10pt;
      }
      .row {
        display: flex;
        gap: 8mm;
        margin-bottom: 1mm;
      }
      .column {
        flex: 1;
      }
      .label-info {
        font-size: 10pt;
        line-height: 1.4;
      }
      .label-info strong {
        display: inline-block;
        width: 35mm;
        font-weight: bold;
      }
      .barcode-container {
        text-align: center;
        margin: 2mm 0;
      }
      .barcode-img {
        height: 18mm;
        width: auto;
        max-width: 100%;
      }
      .barcode-number {
        font-size: 11pt;
        font-weight: bold;
        margin-top: 1mm;
        letter-spacing: 1px;
      }
      .items-list {
        font-size: 10pt;
        line-height: 1.3;
      }
      .footer-barcode {
        margin-top: auto;
        text-align: center;
        padding-top: 2mm;
        border-top: 1px dashed #999;
      }
      .order-label {
        font-size: 9pt;
        color: #0066CC;
        font-weight: bold;
        margin-bottom: 1mm;
      }
      .divider {
        border-bottom: 1px solid #000;
        margin: 2mm 0;
      }
    `;
    printContent += '</style></head><body>';

    ordersToprint.forEach(order => {
      printContent += `
        <div class="label">
          <div class="label-header">
            <div class="logo-text">
              <span class="logo-part1">WAHANA-(BESYARI)</span>
              <span class="logo-circle">Z</span>
              <span class="logo-part2">ZANEVA</span>
            </div>
          </div>
          
          <div class="resi-label">NO. RESI</div>
          
          <div class="barcode-container">
            <svg id="barcode-resi-${order.id}" style="height: 18mm;"></svg>
            <div class="barcode-number">${order.no_resi}</div>
          </div>
          
          <div class="divider"></div>
          
          <div class="row">
            <div class="column">
              <div class="section-title">Penerima</div>
              <div class="label-info">
                <strong>Nama:</strong> ${order.nama_pemesan}<br>
                <strong>Alamat:</strong> ${order.alamat}, ${order.kota_kab}<br>
                <strong>No Telp:</strong> ${order.no_telepon}
              </div>
            </div>
            <div class="column">
              <div class="section-title">Pengirim</div>
              <div class="label-info">
                <strong>PT Zaneva</strong><br>
                Bekasi, Indonesia
              </div>
            </div>
          </div>
          
          ${order.instruksi_pengiriman ? `
            <div class="section" style="margin-bottom: 2mm;">
              <div class="section-title">Instruksi</div>
              <div class="section-content">${order.instruksi_pengiriman}</div>
            </div>
          ` : ''}
          
          <div class="section" style="margin-bottom: 2mm;">
            <div class="section-title">Barang</div>
            <div class="items-list">• Aman Terbungkus</div>
          </div>
          
          <div class="footer-barcode">
            <div class="order-label">ID ORDER</div>
            <svg id="barcode-order-${order.id}" style="height: 18mm;"></svg>
            <div class="barcode-number">${order.order_number}</div>
          </div>
        </div>
      `;
    });

    printContent += `
    <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"><\/script>
    <script>
      ${ordersToprint.map(order => `
        JsBarcode("#barcode-resi-${order.id}", "${order.no_resi}", {format: "CODE128", height: 50});
        JsBarcode("#barcode-order-${order.id}", "${order.order_number}", {format: "CODE128", height: 50});
      `).join('\n')}
    <\/script>
    </body></html>`;
    
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <Card className="bg-card border border-border p-6 space-y-4">
      <div className="flex flex-col gap-4">
        <div className="flex gap-3">
          <div className="flex-1">
            <Input
              placeholder="Cari order number atau nama penerima..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-card border-border text-foreground"
            />
          </div>
          <Button
            onClick={() => {
              const filteredIds = filteredOrders.map(o => o.id);
              setSelectedOrders(filteredIds);
            }}
            variant="outline"
            className="border-border text-foreground hover:bg-accent hover:text-accent-foreground"
          >
            Select All
          </Button>
          <Button
            onClick={handlePrint}
            disabled={selectedOrders.length === 0}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Printer className="w-4 h-4 mr-2" />
            Print ({selectedOrders.length})
          </Button>
        </div>

        <div className="flex gap-4 items-end">
          <div>
            <label className="block text-sm text-muted-foreground mb-2">Ukuran Kertas</label>
            <select
              value={paperSize}
              onChange={(e) => setPaperSize(e.target.value)}
              className="bg-card border border-border text-foreground rounded px-3 py-2"
            >
              <option value="a6">A6 (10.5cm x 14.8cm)</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          
          {paperSize === 'custom' && (
            <>
              <div>
                <label className="block text-sm text-muted-foreground mb-2">Lebar (cm)</label>
                <Input
                  type="number"
                  value={customWidth}
                  onChange={(e) => setCustomWidth(e.target.value)}
                  className="bg-card border-border text-foreground w-20"
                  min="5"
                  max="30"
                  step="0.1"
                />
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-2">Tinggi (cm)</label>
                <Input
                  type="number"
                  value={customHeight}
                  onChange={(e) => setCustomHeight(e.target.value)}
                  className="bg-card border-border text-foreground w-20"
                  min="5"
                  max="30"
                  step="0.1"
                />
              </div>
            </>
          )}
        </div>
      </div>

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {filteredOrders.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">Tidak ada order dengan resi</p>
        ) : (
          filteredOrders.map(order => (
            <div
              key={order.id}
              onClick={() => toggleOrder(order.id)}
              className={`p-3 rounded-lg cursor-pointer transition border ${
                selectedOrders.includes(order.id)
                  ? 'bg-blue-600/20 border-blue-500'
                  : 'bg-card border-border hover:border-[#3A5A7A]'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-foreground font-semibold">{order.order_number}</p>
                  <p className="text-muted-foreground text-sm">{order.nama_pemesan} - {order.no_resi}</p>
                </div>
                <input
                  type="checkbox"
                  checked={selectedOrders.includes(order.id)}
                  onChange={() => {}}
                  className="w-5 h-5"
                />
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
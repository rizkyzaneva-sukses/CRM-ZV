import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

const SENDER_PHONES = {
  'dita.zaneva@gmail.com': '089519039004',
  'yuni.zaneva@gmail.com': '089665969788',
  'trinda.zaneva@gmail.com': '08999474785',
  'mariss.zaneva@gmail.com': '089514332654',
  'cs1.zaneva@gmail.com': '0895389734443',
  'ayu.zaneva@gmail.com': '081322298649',
};

export default function ResiLabel({ order, items, operator, creator }) {
  const idBarcodeRef = useRef(null);
  const resiBarcodeRef = useRef(null);
  const zanevaLogoUrl = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/697c43e2fd72710ff21fd6b8/84d44c01e_1-ZANEVA4.png';
  const senderPhone = SENDER_PHONES[creator?.email] || creator?.no_telepon || '6289601245330';

  useEffect(() => {
    if (idBarcodeRef.current && order.order_number) {
      try {
        JsBarcode(idBarcodeRef.current, order.order_number, {
          format: 'CODE128',
          width: 1.5,
          height: 40,
          displayValue: false
        });
      } catch (err) {
        console.error('Error generating ID barcode:', err);
      }
    }

    if (resiBarcodeRef.current && order.no_resi) {
      try {
        const containerWidth = resiBarcodeRef.current.parentElement?.offsetWidth || 400;
        JsBarcode(resiBarcodeRef.current, order.no_resi, {
          format: 'CODE128',
          width: Math.max(1.5, Math.floor(containerWidth / order.no_resi.length / 1.5)),
          height: 90,
          displayValue: false,
          margin: 0
        });
      } catch (err) {
        console.error('Error generating resi barcode:', err);
      }
    }
  }, [order.order_number, order.no_resi]);

  return (
    <div className="bg-white" style={{ width: '150mm', height: '100mm', fontFamily: 'Arial, sans-serif', display: 'flex', flexDirection: 'column' }}>
      
      {/* Header - Logo + Ekspedisi */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4mm 5mm', borderBottom: '3px solid #333', backgroundColor: '#f9f9f9' }}>
        <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#DC9F22', textTransform: 'uppercase', letterSpacing: '2px' }}>
          {order.jasa_pengiriman}
        </div>
        <img src={zanevaLogoUrl} alt="Zaneva" style={{ height: '16mm' }} />
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, padding: '5mm', display: 'flex', flexDirection: 'column' }}>
        
        {/* No. Resi + Barcode Besar */}
        <div style={{ textAlign: 'center', marginBottom: '4mm', paddingBottom: '3mm', borderBottom: '1px solid #ddd' }}>
          <div style={{ fontSize: '9px', fontWeight: 'bold', color: '#666', marginBottom: '2mm' }}>NO. RESI</div>
          <svg ref={resiBarcodeRef} style={{ width: '100%', maxWidth: '100%', display: 'block', marginBottom: '1mm' }}></svg>
          <div style={{ fontSize: '14px', fontWeight: 'bold', letterSpacing: '1px' }}>{order.no_resi}</div>
        </div>

        {/* Info Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3mm', marginBottom: '3mm', fontSize: '9px' }}>
          {/* Penerima */}
          <div>
            <div style={{ fontWeight: 'bold', fontSize: '8px', color: '#666', marginBottom: '1mm' }}>PENERIMA</div>
            <div style={{ fontWeight: 'bold', fontSize: '10px', lineHeight: '1.2' }}>{order.nama_pemesan}</div>
            <div style={{ fontSize: '8px', color: '#666' }}>{order.no_telepon}</div>
          </div>

          {/* Pengirim */}
          <div>
            <div style={{ fontWeight: 'bold', fontSize: '8px', color: '#666', marginBottom: '1mm' }}>PENGIRIM</div>
            <div style={{ fontWeight: 'bold', fontSize: '9px' }}>{creator?.full_name || 'Zaneva'}</div>
            <div style={{ fontSize: '8px', color: '#666' }}>{senderPhone}</div>
          </div>
        </div>

        {/* Tanggal Order */}
        {order.order_date && (
          <div style={{ fontSize: '8px', color: '#666', marginBottom: '2mm' }}>
            <span style={{ fontWeight: 'bold' }}>Tgl Order:</span> {order.order_date}
          </div>
        )}

        {/* Alamat Penerima */}
        <div style={{ marginBottom: '2mm', paddingBottom: '2mm', borderBottom: '1px solid #ddd' }}>
          <div style={{ fontWeight: 'bold', fontSize: '8px', color: '#666', marginBottom: '1mm' }}>ALAMAT TUJUAN</div>
          <div style={{ fontSize: '9px', lineHeight: '1.3', wordWrap: 'break-word' }}>
            {order.alamat} {order.kecamatan}, {order.kota_kab}, {order.provinsi} {order.kode_pos}
          </div>
        </div>

        {/* Instruksi Pengiriman */}
        {order.instruksi_pengiriman && (
          <div style={{ marginBottom: '2mm', paddingBottom: '2mm', borderBottom: '1px solid #ddd' }}>
            <div style={{ fontWeight: 'bold', fontSize: '8px', color: '#666', marginBottom: '1mm' }}>INSTRUKSI</div>
            <div style={{ fontSize: '8px', lineHeight: '1.2', fontStyle: 'italic', color: '#555' }}>
              {order.instruksi_pengiriman}
            </div>
          </div>
        )}

        {/* Produk */}
        <div style={{ fontSize: '8px', flex: 1, marginBottom: '2mm' }}>
          <div style={{ fontWeight: 'bold', fontSize: '8px', color: '#666', marginBottom: '1mm' }}>BARANG</div>
          <div style={{ maxHeight: '15mm', overflow: 'hidden' }}>
            {items.map((item, idx) => (
              <div key={idx} style={{ lineHeight: '1.2', marginBottom: '1mm' }}>
                • {item.nama_produk} (x{item.qty})
              </div>
            ))}
          </div>
        </div>

        {/* Order ID */}
        <div style={{ textAlign: 'center', paddingTop: '2mm', borderTop: '1px solid #ddd' }}>
          <div style={{ fontSize: '8px', color: '#666', marginBottom: '1mm' }}>ID ORDER</div>
          <svg ref={idBarcodeRef} style={{ margin: '0 auto', display: 'block', marginBottom: '0.5mm' }}></svg>
          <div style={{ fontSize: '11px', fontWeight: 'bold', letterSpacing: '0.5px' }}>{order.order_number}</div>
        </div>
      </div>
    </div>
  );
}
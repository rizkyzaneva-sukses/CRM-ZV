import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const SHIPPING_COLORS = {
  'jne': '#f59e0b',
  'jnt': '#ef4444',
  'sicepat': '#3b82f6',
  'sap-cash': '#10b981',
  'sap-cod': '#8b5cf6',
  'marketplace': '#ec4899',
  'oberbe': '#14b8a6',
  'besyari': '#f97316',
  'muswim': '#6366f1',
  'zaneva': '#84cc16'
};

export default function ShippingPerformance({ data, title }) {
  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#22304A" />
            <XAxis 
              type="number" 
              stroke="#B8C3E0" 
              tick={{ fill: '#B8C3E0' }}
            />
            <YAxis 
              type="category" 
              dataKey="name" 
              stroke="#B8C3E0" 
              tick={{ fill: '#B8C3E0' }}
              width={100}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#0F172A', 
                border: '1px solid #22304A',
                borderRadius: '8px',
                color: '#EAF0FF'
              }}
              formatter={(value) => [`${value} order`, 'Jumlah']}
            />
            <Legend wrapperStyle={{ color: '#B8C3E0' }} />
            <Bar dataKey="value" fill="#10b981" radius={[0, 8, 8, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={SHIPPING_COLORS[entry.id] || '#64748b'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
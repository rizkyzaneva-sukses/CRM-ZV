import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatRupiah } from '@/components/utils/currencyUtils';

export default function SalesChart({ data, title, dataKey = "total" }) {


  const formatCurrency = (value) => {
    return `Rp ${(value / 1000).toFixed(0)}k`;
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#22304A" />
            <XAxis 
              dataKey="name" 
              stroke="#B8C3E0" 
              tick={{ fill: '#B8C3E0' }}
            />
            <YAxis 
              stroke="#B8C3E0" 
              tick={{ fill: '#B8C3E0' }}
              tickFormatter={formatCurrency}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#0F172A', 
                border: '1px solid #22304A',
                borderRadius: '8px',
                color: '#EAF0FF'
              }}
              formatter={(value) => [formatRupiah(value), 'Total']}
            />
            <Legend wrapperStyle={{ color: '#B8C3E0' }} />
            <Bar dataKey={dataKey} fill="#10b981" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
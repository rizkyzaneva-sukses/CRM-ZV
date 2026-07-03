import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const COLORS = {
  'DRAFT': '#94a3b8',
  'WAITING_FINANCE': '#f59e0b',
  'READY_TO_PROCESS': '#3b82f6',
  'RESI_UPDATED': '#10b981',
  'REJECTED': '#ef4444'
};

const STATUS_LABELS = {
  'DRAFT': 'Draft',
  'WAITING_FINANCE': 'Waiting Finance',
  'READY_TO_PROCESS': 'Ready to Process',
  'RESI_UPDATED': 'Resi Updated',
  'REJECTED': 'Rejected'
};

export default function StatusPieChart({ data, title }) {
  const chartData = data.map(item => ({
    ...item,
    name: STATUS_LABELS[item.name] || item.name
  }));

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[entry.name] || '#64748b'} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#0F172A', 
                border: '1px solid #22304A',
                borderRadius: '8px',
                color: '#EAF0FF'
              }}
            />
            <Legend 
              wrapperStyle={{ color: '#B8C3E0' }}
              iconType="circle"
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
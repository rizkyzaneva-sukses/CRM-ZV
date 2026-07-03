import React from 'react';
import { cn } from "@/lib/utils";

const statusConfig = {
  DRAFT: { label: 'Draft', className: 'bg-slate-600/30 text-slate-300 border-slate-500' },
  WAITING_FINANCE: { label: 'Waiting Finance', className: 'bg-amber-500/20 text-amber-400 border-amber-500' },
  READY_TO_PROCESS: { label: 'Ready to Process', className: 'bg-blue-500/20 text-blue-400 border-blue-500' },
  RESI_UPDATED: { label: 'Resi Updated', className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500' },
  REJECTED: { label: 'Rejected', className: 'bg-red-500/20 text-red-400 border-red-500' },
};

export default function StatusBadge({ status }) {
  const config = statusConfig[status] || statusConfig.DRAFT;
  
  return (
    <span className={cn(
      "px-2.5 py-1 text-xs font-medium rounded-full border",
      config.className
    )}>
      {config.label}
    </span>
  );
}
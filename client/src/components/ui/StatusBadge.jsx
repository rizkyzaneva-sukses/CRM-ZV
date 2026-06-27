import React from 'react';

const statusConfig = {
  DRAFT: { label: 'Draft', className: 'badge-gray' },
  WAITING_FINANCE: { label: 'Waiting Finance', className: 'badge-yellow' },
  READY_TO_PROCESS: { label: 'Ready to Process', className: 'badge-blue' },
  RESI_UPDATED: { label: 'Resi Updated', className: 'badge-green' },
  REJECTED: { label: 'Rejected', className: 'badge-red' },
};

export default function StatusBadge({ status }) {
  const config = statusConfig[status] || { label: status, className: 'badge-gray' };
  return <span className={`badge ${config.className}`}>{config.label}</span>;
}

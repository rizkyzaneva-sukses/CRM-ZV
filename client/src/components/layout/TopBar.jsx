import React from 'react';
import { User } from 'lucide-react';

const roleBadgeColors = {
  OWNER: 'badge-red',
  FINANCE: 'badge-blue',
  STAFF: 'badge-green',
  INVENTORI: 'badge-yellow',
};

export default function TopBar({ user, customRole, pageName }) {
  return (
    <header className="h-16 bg-gray-900/80 backdrop-blur border-b border-gray-800 flex items-center justify-between px-6">
      <h2 className="text-lg font-semibold text-gray-200">{pageName}</h2>
      <div className="flex items-center gap-3">
        <span className={`badge ${roleBadgeColors[customRole] || 'badge-gray'}`}>
          {customRole}
        </span>
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <User size={16} />
          <span>{user?.full_name || user?.email}</span>
        </div>
      </div>
    </header>
  );
}

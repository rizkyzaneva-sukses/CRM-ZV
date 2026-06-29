import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../App';
import {
  LayoutDashboard, Package, Users, Truck, Printer, Download,
  Database, DollarSign, FileText, UserCog, LogOut, FileUp
} from 'lucide-react';

const allMenuItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard, roles: ['OWNER','STAFF','FINANCE','INVENTORI'] },
  { path: '/InputOrder', label: 'Input Order', icon: Package, roles: ['OWNER','STAFF','FINANCE'] },
  { path: '/CustomerManagement', label: 'Customers', icon: Users, roles: ['OWNER','STAFF','FINANCE'] },
  { path: '/FinanceApproval', label: 'Finance Approval', icon: DollarSign, roles: ['OWNER','FINANCE'] },
  { path: '/UploadResi', label: 'Upload Resi', icon: Truck, roles: ['OWNER','FINANCE','INVENTORI'] },
  { path: '/PrintResi', label: 'Print Resi', icon: Printer, roles: ['OWNER','FINANCE','INVENTORI'] },
  { path: '/ExportCenter', label: 'Export Center', icon: Download, roles: ['OWNER','FINANCE','INVENTORI'] },
  { path: '/MasterData', label: 'Master Data', icon: Database, roles: ['OWNER','FINANCE'] },
  { path: '/AuditLog', label: 'Audit Log', icon: FileText, roles: ['OWNER','FINANCE','INVENTORI'] },
  { path: '/UserManagement', label: 'User Management', icon: UserCog, roles: ['OWNER'] },
  { path: '/ImportData', label: 'Import Data', icon: FileUp, roles: ['OWNER'] },
];

export default function Sidebar({ currentPath, customRole }) {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const menuItems = allMenuItems.filter(item => item.roles.includes(customRole));

  return (
    <aside className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col">
      <div className="p-6 border-b border-gray-800">
        <h1 className="text-xl font-bold text-indigo-400">Zaneva CRM</h1>
        <p className="text-xs text-gray-500 mt-1">Order Control Center</p>
      </div>
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {menuItems.map(item => {
          const Icon = item.icon;
          const isActive = currentPath === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-600/30'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
              }`}
            >
              <Icon size={18} />
              {item.label}
            </button>
          );
        })}
      </nav>
      <div className="p-3 border-t border-gray-800">
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:bg-red-900/30 hover:text-red-400 transition-colors"
        >
          <LogOut size={18} />
          Logout
        </button>
      </div>
    </aside>
  );
}

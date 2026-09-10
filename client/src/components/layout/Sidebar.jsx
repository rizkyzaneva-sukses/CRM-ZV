import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  Plus, 
  Upload, 
  Download, 
  User,
  FileText,
  CheckCircle,
  History,
  Users,
  BookOpen,
  Printer,
  Settings
} from 'lucide-react';

const menuItems = [
  { name: 'Dashboard', icon: LayoutDashboard, page: 'Dashboard' },
  { name: 'Input Order', icon: Plus, page: 'InputOrder' },
  { name: 'Customers', icon: User, page: 'CustomerManagement' },
  { name: 'Upload Resi', icon: Upload, page: 'UploadResi' },
  { name: 'Print Resi', icon: Printer, page: 'PrintResi' },
  { name: 'Export Center', icon: Download, page: 'ExportCenter' },
  { name: 'Master Data', icon: FileText, page: 'MasterData' },
  { name: 'Audit Log', icon: History, page: 'AuditLog' },
];

const financeMenuItems = [
  { name: 'Finance Approval', icon: CheckCircle, page: 'FinanceApproval' },
];

const inventoriMenuItems = [
  { name: 'Dashboard', icon: LayoutDashboard, page: 'Dashboard' },
  { name: 'Upload Resi', icon: Upload, page: 'UploadResi' },
  { name: 'Print Resi', icon: Printer, page: 'PrintResi' },
  { name: 'Export Center', icon: Download, page: 'ExportCenter' },
];

const commonMenuItems = [
  { name: 'Manual Book', icon: BookOpen, page: 'ManualBook' },
];

// User Management, Download All Data, Import Data, dan Reset Data kini jadi tab
// di dalam halaman Setting - satu pintu untuk semua fungsi administratif.
const adminMenuItems = [
  { name: 'Setting', icon: Settings, page: 'Setting' },
];

export default function Sidebar({ currentPage, customRole }) {
  const isFinance = customRole === 'FINANCE';
  const isOwner = customRole === 'OWNER';
  const isStaff = customRole === 'STAFF';
  const isInventori = customRole === 'INVENTORI';

  const staffMenuItems = menuItems.filter(item => 
    item.name === 'Dashboard' || item.name === 'Input Order' || item.name === 'Customers'
  );

  let allMenuItems = [];

  if (isStaff) {
    allMenuItems = [...staffMenuItems, ...commonMenuItems];
  } else if (isInventori) {
    allMenuItems = [...inventoriMenuItems, ...commonMenuItems];
  } else if (isFinance) {
    allMenuItems = [...menuItems, ...financeMenuItems, ...commonMenuItems];
  } else if (isOwner) {
    allMenuItems = [...menuItems, ...financeMenuItems, ...adminMenuItems, ...commonMenuItems];
  } else {
    // Role tak dikenal (mis. custom_role kosong) sebelumnya menghasilkan sidebar
    // kosong tanpa penjelasan. Beri akses paling minim, bukan layar buntu.
    allMenuItems = [...staffMenuItems, ...commonMenuItems];
  }

  return (
    <aside className="hidden lg:flex flex-col w-64 bg-card border-r border-border min-h-screen">
      <div className="p-6 border-b border-border">
        <h1 className="text-xl font-bold text-foreground">CRM Order</h1>
        <p className="text-sm text-muted-foreground mt-1">Control Center</p>
      </div>
      
      <nav className="flex-1 p-4 space-y-1">
        {allMenuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.page;
          
          return (
            <Link
              key={item.page}
              to={createPageUrl(item.page)}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200",
                isActive 
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" 
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground hover:text-foreground"
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.name}</span>
            </Link>
          );
        })}
      </nav>
      
      <div className="p-4 border-t border-border">
        <div className="px-4 py-3 rounded-lg bg-muted">
          <p className="text-xs text-muted-foreground">Role</p>
          <p className="text-sm font-medium text-foreground">
            {customRole}
          </p>
        </div>
      </div>
    </aside>
  );
}
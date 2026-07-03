import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  Plus, 
  Upload, 
  Download,
  CheckCircle,
  FileText,
  History,
  Users,
  Trash2
} from 'lucide-react';

const menuItems = [
  { name: 'Dashboard', icon: LayoutDashboard, page: 'Dashboard' },
  { name: 'Input', icon: Plus, page: 'InputOrder' },
  { name: 'Customers', icon: Users, page: 'CustomerManagement' },
  { name: 'Upload', icon: Upload, page: 'UploadResi' },
  { name: 'Export', icon: Download, page: 'ExportCenter' },
  { name: 'Data', icon: FileText, page: 'MasterData' },
  { name: 'Audit', icon: History, page: 'AuditLog' },
];

const financeMenuItems = [
  { name: 'Approval', icon: CheckCircle, page: 'FinanceApproval' },
];

const commonMenuItems = [
  { name: 'Manual', icon: FileText, page: 'ManualBook' },
];

const adminMenuItems = [
  { name: 'Users', icon: Users, page: 'UserManagement' },
];

export default function MobileNav({ currentPage, customRole }) {
  const isFinance = customRole === 'FINANCE';
  const isOwner = customRole === 'OWNER';
  const isStaff = customRole === 'STAFF';

  const staffMenuItems = menuItems.filter(item => 
    item.name === 'Dashboard' || item.name === 'Input' || item.name === 'Customers'
  );

  const allMenuItems = [
    ...(isStaff ? staffMenuItems : menuItems),
    ...((isFinance || isOwner) ? financeMenuItems : []),
    ...(isOwner ? adminMenuItems : []),
    ...commonMenuItems,
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50">
      <div className="flex justify-around items-center py-2">
        {allMenuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.page;
          
          return (
            <Link
              key={item.page}
              to={createPageUrl(item.page)}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all",
                isActive 
                  ? "text-emerald-400" 
                  : "text-muted-foreground"
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs font-medium">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
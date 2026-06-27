import React from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../App';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

const pageNames = {
  '/': 'Dashboard',
  '/InputOrder': 'Input Order',
  '/OrderDetail': 'Order Detail',
  '/CustomerManagement': 'Customers',
  '/UploadResi': 'Upload Resi',
  '/PrintResi': 'Print Resi',
  '/ExportCenter': 'Export Center',
  '/MasterData': 'Master Data',
  '/FinanceApproval': 'Finance Approval',
  '/AuditLog': 'Audit Log',
  '/UserManagement': 'User Management',
};

export default function Layout({ children }) {
  const location = useLocation();
  const { user, customRole } = useAuth();
  const currentPageName = pageNames[location.pathname] || 'CRM';

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar currentPath={location.pathname} customRole={customRole} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar user={user} customRole={customRole} pageName={currentPageName} />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

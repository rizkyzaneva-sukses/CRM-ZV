import React, { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { api } from './lib/api';

// Pages
import Dashboard from './pages/Dashboard';
import InputOrder from './pages/InputOrder';
import OrderDetail from './pages/OrderDetail';
import CustomerManagement from './pages/CustomerManagement';
import UploadResi from './pages/UploadResi';
import PrintResi from './pages/PrintResi';
import ExportCenter from './pages/ExportCenter';
import MasterData from './pages/MasterData';
import FinanceApproval from './pages/FinanceApproval';
import AuditLog from './pages/AuditLog';
import UserManagement from './pages/UserManagement';
import ImportData from './pages/ImportData';
import Login from './pages/Login';

// Components
import Layout from './components/layout/Layout';

const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

function ProtectedRoute({ children, roles }) {
  const { user, customRole } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(customRole)) return <Navigate to="/" replace />;
  return children;
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
      <Route path="/InputOrder" element={<ProtectedRoute><Layout><InputOrder /></Layout></ProtectedRoute>} />
      <Route path="/OrderDetail" element={<ProtectedRoute><Layout><OrderDetail /></Layout></ProtectedRoute>} />
      <Route path="/CustomerManagement" element={<ProtectedRoute><Layout><CustomerManagement /></Layout></ProtectedRoute>} />
      <Route path="/UploadResi" element={<ProtectedRoute><Layout><UploadResi /></Layout></ProtectedRoute>} />
      <Route path="/PrintResi" element={<ProtectedRoute><Layout><PrintResi /></Layout></ProtectedRoute>} />
      <Route path="/ExportCenter" element={<ProtectedRoute roles={['OWNER','FINANCE','INVENTORI']}><Layout><ExportCenter /></Layout></ProtectedRoute>} />
      <Route path="/MasterData" element={<ProtectedRoute><Layout><MasterData /></Layout></ProtectedRoute>} />
      <Route path="/FinanceApproval" element={<ProtectedRoute roles={['OWNER','FINANCE']}><Layout><FinanceApproval /></Layout></ProtectedRoute>} />
      <Route path="/AuditLog" element={<ProtectedRoute><Layout><AuditLog /></Layout></ProtectedRoute>} />
      <Route path="/UserManagement" element={<ProtectedRoute roles={['OWNER']}><Layout><UserManagement /></Layout></ProtectedRoute>} />
      <Route path="/ImportData" element={<ProtectedRoute roles={['OWNER']}><Layout><ImportData /></Layout></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('crm_user')); } catch { return null; }
  });
  const [customRole, setCustomRole] = useState(user?.custom_role || 'STAFF');

  const login = async (email, password) => {
    const res = await api.login(email, password);
    localStorage.setItem('crm_token', res.token);
    localStorage.setItem('crm_user', JSON.stringify(res.user));
    setUser(res.user);
    setCustomRole(res.user.custom_role || 'STAFF');
    return res;
  };

  const logout = () => {
    localStorage.removeItem('crm_token');
    localStorage.removeItem('crm_user');
    setUser(null);
    setCustomRole('STAFF');
  };

  return (
    <AuthContext.Provider value={{ user, customRole, login, logout }}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthContext.Provider>
  );
}

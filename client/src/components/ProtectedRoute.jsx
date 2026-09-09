import { Outlet } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

const DefaultFallback = () => (
  <div className="fixed inset-0 flex items-center justify-center">
    <div className="w-8 h-8 border-border border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
  </div>
);

export default function ProtectedRoute({ fallback = <DefaultFallback />, unauthenticatedElement }) {
  // AuthProvider sudah menjalankan pengecekan sesi sekali saat mount, jadi komponen ini
  // cukup membaca hasilnya. Versi sebelumnya mengambil `authChecked` dan `checkUserAuth`
  // yang tidak pernah disediakan context: `!authChecked` selalu true sehingga fallback
  // tampil selamanya, dan pemanggilan checkUserAuth() melempar TypeError.
  const { isAuthenticated, isLoadingAuth, authError } = useAuth();

  if (isLoadingAuth) {
    return fallback;
  }

  if (authError?.type === 'user_not_registered') {
    return <UserNotRegisteredError />;
  }

  if (authError || !isAuthenticated) {
    return unauthenticatedElement;
  }

  return <Outlet />;
}

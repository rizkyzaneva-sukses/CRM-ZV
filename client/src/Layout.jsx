import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import Sidebar from '@/components/layout/Sidebar';
import MobileNav from '@/components/layout/MobileNav';
import TopBar from '@/components/layout/TopBar';
import { Loader2 } from 'lucide-react';

export default function Layout({ children, currentPageName }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await api.me();
        setUser(currentUser);
      } catch (error) {
        console.error('Error loading user:', error);
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, []);

  // Gunakan custom_role jika ada, atau default ke OWNER untuk admin, STAFF untuk user biasa
  let customRole = 'STAFF';
  if (user?.custom_role) {
    customRole = user.custom_role;
  } else if (user?.role === 'admin') {
    customRole = 'OWNER';
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <style>{`
        :root {
          --background: 222 47% 5%;
          --foreground: 220 40% 94%;
          --card: 222 47% 11%;
          --card-foreground: 220 40% 94%;
          --popover: 222 47% 11%;
          --popover-foreground: 220 40% 94%;
          --primary: 142 71% 45%;
          --primary-foreground: 142 100% 5%;
          --secondary: 222 47% 15%;
          --secondary-foreground: 220 40% 94%;
          --muted: 222 47% 15%;
          --muted-foreground: 220 25% 70%;
          --accent: 222 47% 15%;
          --accent-foreground: 220 40% 94%;
          --destructive: 0 84% 60%;
          --destructive-foreground: 0 0% 100%;
          --border: 222 40% 20%;
          --input: 222 47% 8%;
          --ring: 142 71% 45%;
        }
        
        body {
          background-color: #0B0F1A;
          color: #EAF0FF;
        }
        
        * {
          border-color: #22304A;
        }
        
        input, textarea, select {
          background-color: #0F172A !important;
          color: #EAF0FF !important;
        }
        
        input::placeholder, textarea::placeholder {
          color: #9AA6C3 !important;
        }
        
        .dark {
          color-scheme: dark;
        }
      `}</style>
      
      <div className="flex">
        <Sidebar currentPage={currentPageName} customRole={customRole} />
        
        <div className="flex-1 flex flex-col min-h-screen">
          <TopBar user={user} customRole={customRole} />
          
          <main className="flex-1 p-4 lg:p-6 pb-24 lg:pb-6 overflow-auto">
            {React.cloneElement(children, { user, customRole })}
          </main>
        </div>
      </div>
      
      <MobileNav currentPage={currentPageName} customRole={customRole} />
    </div>
  );
}
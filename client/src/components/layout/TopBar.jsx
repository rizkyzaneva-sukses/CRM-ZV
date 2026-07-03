import React from 'react';
import { Button } from "@/components/ui/button";
import { LogOut, User } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';

export default function TopBar({ user, customRole }) {
  const { logout } = useAuth();
  
  const handleLogout = () => {
    logout();
  };

  return (
    <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6">
      <div className="lg:hidden">
        <h1 className="text-lg font-bold text-foreground">CRM Order</h1>
      </div>
      
      <div className="hidden lg:block">
        <h2 className="text-lg font-semibold text-foreground">
          Welcome back, {user?.full_name || 'User'}
        </h2>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-muted rounded-lg">
          <User className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-foreground">{user?.email}</span>
        </div>
        
        <Button 
          variant="ghost" 
          size="sm"
          onClick={handleLogout}
          className="text-muted-foreground hover:text-foreground hover:bg-accent hover:text-accent-foreground"
        >
          <LogOut className="w-4 h-4" />
        </Button>
      </div>
    </header>
  );
}
import React from 'react';
import { LogOut } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  darkMode: boolean;
  toggleTheme: () => void;
  onLogout: () => void;
  userEmail?: string;
  role?: string;
}

export const Layout: React.FC<LayoutProps> = ({ 
  children, darkMode, toggleTheme, onLogout, userEmail, role 
}) => {
  return (
    <div className={`min-h-screen ${darkMode ? 'dark' : ''}`}>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 transition-colors">
        <nav className="bg-white dark:bg-slate-800 shadow-md px-4 py-3 flex justify-between items-center sticky top-0 z-50">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">T</span>
            </div>
            <span className="font-bold text-xl hidden sm:block">Time Track</span>
          </div>
          
          <div className="flex items-center space-x-4">
            {userEmail && (
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium">{userEmail}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 uppercase">{role}</p>
              </div>
            )}
            
            {userEmail && (
              <button 
                onClick={onLogout}
                className="flex items-center space-x-1 text-red-600 hover:text-red-700 font-medium text-sm"
              >
                <LogOut size={18} />
                <span className="hidden sm:inline">Logout</span>
              </button>
            )}
          </div>
        </nav>
        
        <main className="p-4 max-w-7xl mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
import React, { useState, useEffect } from 'react';
import { Serveuse, VueActive } from '../types';
import { RefreshCw, LogOut, Database, Wifi } from 'lucide-react';
import { getCurrency } from '../utils/format';

interface HeaderProps {
  currentServeuse: Serveuse | null;
  onOpenLogin?: () => void;
  onLogout: () => void;
  activeVue: VueActive;
  onChangeVue: (vue: VueActive) => void;
  isOnline: boolean;
  dbInfo: { type: string; connected: boolean };
  onRefreshData: () => void;
  currentCurrency?: string;
}

export const Header: React.FC<HeaderProps> = ({
  currentServeuse,
  onLogout,
  dbInfo,
  onRefreshData,
  currentCurrency
}) => {
  const [activeCurrency, setActiveCurrency] = useState<string>(currentCurrency || getCurrency());

  useEffect(() => {
    setActiveCurrency(currentCurrency || getCurrency());
  }, [currentCurrency]);

  useEffect(() => {
    const handleCurrencyChange = () => {
      setActiveCurrency(getCurrency());
    };
    window.addEventListener('currency_changed', handleCurrencyChange);
    return () => window.removeEventListener('currency_changed', handleCurrencyChange);
  }, []);

  const userRole = currentServeuse?.role || 'serveuse';

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Admin';
      case 'cuisine':
        return 'Cuisinier';
      default:
        return 'Serveuse';
    }
  };

  return (
    <header className="bg-white dark:bg-slate-900 border-b-2 border-red-600 dark:border-red-600 text-slate-800 dark:text-slate-100 sticky top-0 z-30 shadow-xs pt-[calc(0.5rem+env(safe-area-inset-top))]">
      <div className="max-w-7xl mx-auto px-2.5 sm:px-6 py-2 sm:py-2.5 flex items-center justify-between gap-2">
        
        {/* Brand & App Title */}
        <div className="flex items-center space-x-2.5">
          <img 
            src="/logo.svg" 
            alt="Milgos Logo" 
            onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/logo.png'; }}
            className="h-10 w-10 sm:h-12 sm:w-12 object-contain shrink-0 rounded-full bg-white p-0.5 shadow-sm ring-2 ring-red-500/40" 
          />
          <div>
            <div className="flex items-center space-x-1.5">
              <h1 className="font-black text-base sm:text-xl tracking-tight text-slate-900 dark:text-white leading-tight truncate max-w-[160px] xs:max-w-none">
                MILGO<span className="text-red-600 dark:text-red-500">'S</span>
              </h1>
              <span className="bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border border-red-200 dark:border-red-800/80 shrink-0 font-mono">
                {activeCurrency}
              </span>
            </div>
            <p className="text-[10px] sm:text-xs text-red-600/90 dark:text-red-400 font-bold tracking-wide hidden xs:block">FIRED UP CHICKEN • POS</p>
          </div>
        </div>

        {/* Top Right Controls & User Info */}
        <div className="flex items-center space-x-2 shrink-0">
          {/* DB Connection Status Pill */}
          <div 
            className={`flex items-center space-x-1.5 text-xs px-2.5 py-1 rounded-xl border font-mono transition-all ${
              dbInfo.connected
                ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                : 'bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300'
            }`}
            title={dbInfo.type}
          >
            <span className={`w-2 h-2 rounded-full shrink-0 ${dbInfo.connected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
            <span className="hidden md:inline truncate max-w-[120px] font-semibold">{dbInfo.connected ? 'Cloud Connecté' : 'Mode Cache'}</span>
          </div>

          {/* Sync / Refresh Button */}
          <button 
            onClick={onRefreshData}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-red-600 transition-all active:scale-95 touch-manipulation border border-slate-200 dark:border-slate-700"
            title="Rafraîchir la base de données"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* Active User Info & Logout Button */}
          <div className="flex items-center space-x-2 bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 p-1 pl-2.5 rounded-xl">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-red-100 dark:bg-red-950/80 border border-red-200 dark:border-red-800/60 flex items-center justify-center text-red-600 dark:text-red-400 text-xs font-black shrink-0">
                {currentServeuse ? (currentServeuse.nom ? currentServeuse.nom.substring(0, 2).toUpperCase() : 'US') : '??'}
              </div>
              <div className="text-left hidden xs:block">
                <div className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[80px] sm:max-w-[110px]">
                  {currentServeuse ? currentServeuse.nom : 'Utilisateur'}
                </div>
                <div className="text-[9px] text-red-600 dark:text-red-400 uppercase font-mono leading-none font-bold">
                  {getRoleLabel(userRole)}
                </div>
              </div>
            </div>

            <button
              onClick={onLogout}
              className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-all touch-manipulation active:scale-95 shadow-xs ml-1"
              title="Se déconnecter"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Déconnexion</span>
            </button>
          </div>
        </div>

      </div>
    </header>
  );
};



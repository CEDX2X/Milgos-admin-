import React, { useState, useEffect } from 'react';
import { Serveuse, VueActive, RoleServeuse } from '../types';
import { 
  RefreshCw, LogOut, Database, Wifi, WifiOff, Settings, Bell, CloudUpload, CheckCircle2,
  CircleDollarSign, ShoppingBag, ChefHat, Wine, UtensilsCrossed, Package, Users, BarChart3,
  Volume2, X, Sparkles
} from 'lucide-react';
import { getCurrency } from '../utils/format';
import { getNotificationPermission, requestNotificationPermission, playPreparationChime } from '../utils/notifications';
import { useSyncStatus } from '../utils/useSyncStatus';
import { hasPermissionForVue } from '../utils/permissions';

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
  userRole?: RoleServeuse;
  activeOrdersCount?: number;
  unpaidOrdersCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentServeuse,
  onLogout,
  activeVue,
  onChangeVue,
  dbInfo,
  onRefreshData,
  currentCurrency,
  userRole: propUserRole,
  activeOrdersCount = 0,
  unpaidOrdersCount = 0
}) => {
  const [activeCurrency, setActiveCurrency] = useState<string>(currentCurrency || getCurrency());
  const [notifState, setNotifState] = useState<string>(getNotificationPermission());
  const [isScrolled, setIsScrolled] = useState<boolean>(false);
  const { isOnline: browserOnline, isSyncing, pendingCount, triggerSync } = useSyncStatus();

  useEffect(() => {
    const handleScroll = () => {
      const scrollPos = window.scrollY || document.documentElement.scrollTop;
      setIsScrolled(scrollPos > 24);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setNotifState(getNotificationPermission());
  }, [activeVue]);

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

  const userRole = propUserRole || currentServeuse?.role || 'serveuse';

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Admin';
      case 'caissier':
        return 'Caissier';
      case 'cuisine':
        return 'Cuisinier';
      case 'barman':
        return 'Barman';
      default:
        return 'Serveuse';
    }
  };

  // Navigation tabs for desktop header
  const desktopTabs: {
    id: VueActive;
    label: string;
    icon: React.ElementType;
    roles: RoleServeuse[];
    badge?: number;
  }[] = [
    {
      id: 'caisse',
      label: 'Caisse',
      icon: CircleDollarSign,
      roles: ['admin', 'caissier'],
      badge: unpaidOrdersCount > 0 ? unpaidOrdersCount : undefined
    },
    {
      id: 'commande',
      label: 'Prise de Commande',
      icon: ShoppingBag,
      roles: ['admin', 'serveuse']
    },
    {
      id: 'suivi',
      label: userRole === 'barman' ? 'Bar' : userRole === 'cuisine' ? 'Cuisine' : userRole === 'serveuse' ? 'Service Salle' : 'Cuisine & Bar',
      icon: userRole === 'barman' ? Wine : userRole === 'serveuse' ? UtensilsCrossed : ChefHat,
      roles: ['admin', 'serveuse', 'cuisine', 'barman', 'caissier'],
      badge: activeOrdersCount > 0 ? activeOrdersCount : undefined
    },
    {
      id: 'catalogue',
      label: 'Stock & Menu',
      icon: Package,
      roles: ['admin', 'serveuse']
    },
    {
      id: 'serveuses',
      label: 'Personnel',
      icon: Users,
      roles: ['admin']
    },
    {
      id: 'historique',
      label: 'Ventes',
      icon: BarChart3,
      roles: ['admin']
    }
  ];

  const visibleDesktopTabs = desktopTabs.filter(t => hasPermissionForVue(currentServeuse, t.id));

  const handleSyncClick = async () => {
    if (pendingCount > 0 && browserOnline) {
      await triggerSync();
    }
    onRefreshData();
  };

  const hasParamAccess = hasPermissionForVue(currentServeuse, 'parametres');
  const [isNotifModalOpen, setIsNotifModalOpen] = useState(false);

  const handleSettingsOrNotifClick = async () => {
    if (hasParamAccess) {
      onChangeVue('parametres');
    } else {
      setIsNotifModalOpen(true);
    }
  };

  return (
    <header className={`bg-white dark:bg-slate-900 border-b-2 border-red-600 dark:border-red-600 text-slate-800 dark:text-slate-100 sticky top-0 z-30 transition-all duration-200 pt-[calc(0.25rem+env(safe-area-inset-top))] ${
      isScrolled ? 'shadow-md py-0' : 'shadow-xs'
    }`}>
      <div className={`max-w-[1650px] mx-auto px-2.5 sm:px-6 flex items-center justify-between gap-2 transition-all duration-200 ${
        isScrolled ? 'py-1 sm:py-1.5' : 'py-2 sm:py-2.5'
      }`}>
        
        {/* Brand & App Title */}
        <div className="flex items-center space-x-2 sm:space-x-2.5 shrink-0">
          <img 
            src="/logo.png" 
            alt="Milgos Logo" 
            referrerPolicy="no-referrer"
            onError={(e) => { 
              const img = e.currentTarget as HTMLImageElement;
              if (img.src.includes('/logo.png')) {
                img.src = 'https://lh3.googleusercontent.com/d/1lsjEbs-loMm1NyLaLSeZbCxcudmxpqPG';
              }
            }}
            className={`object-contain shrink-0 rounded-full bg-white p-0.5 shadow-sm ring-2 ring-red-500/40 transition-all duration-200 ${
              isScrolled ? 'h-7 w-7 sm:h-8 sm:w-8' : 'h-9 w-9 sm:h-11 sm:w-11'
            }`} 
          />
          <div>
            <div className="flex items-center space-x-1.5">
              <h1 className={`font-black tracking-tight text-slate-900 dark:text-white leading-tight truncate max-w-[160px] xs:max-w-none transition-all duration-200 ${
                isScrolled ? 'text-sm sm:text-base' : 'text-base sm:text-lg'
              }`}>
                MILGO<span className="text-red-600 dark:text-red-500">'S</span>
              </h1>
              <span className="bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border border-red-200 dark:border-red-800/80 shrink-0 font-mono">
                {activeCurrency}
              </span>
            </div>
            {!isScrolled && (
              <p className="text-[10px] sm:text-xs text-red-600/90 dark:text-red-400 font-bold tracking-wide hidden xs:block transition-all animate-fade-in">
                FIRED UP CHICKEN • POS
              </p>
            )}
          </div>
        </div>

        {/* Desktop Navigation Tabs (Visible on Computer / Laptop screens) */}
        <nav aria-label="Navigation Bureau" className="hidden lg:flex items-center space-x-1 xl:space-x-1.5 mx-2 overflow-x-auto py-0.5">
          {visibleDesktopTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeVue === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => onChangeVue(tab.id)}
                className={`flex items-center space-x-2 px-3 py-1.5 xl:px-3.5 xl:py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap touch-manipulation active:scale-95 relative ${
                  isActive
                    ? 'bg-red-600 text-white shadow-sm shadow-red-600/25 ring-1 ring-red-700'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
                <span>{tab.label}</span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black font-mono ${
                    isActive 
                      ? 'bg-white text-red-600' 
                      : 'bg-red-600 text-white'
                  }`}>
                    {tab.badge > 99 ? '99+' : tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Top Right Controls & User Info */}
        <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
          
          {/* Offline / Pending Sync Indicator Badge */}
          {(!browserOnline || pendingCount > 0) && (
            <button
              onClick={handleSyncClick}
              disabled={isSyncing || !browserOnline}
              className={`flex items-center space-x-1 text-[11px] sm:text-xs px-2 sm:px-2.5 py-1 rounded-xl border font-bold transition-all shadow-xs ${
                !browserOnline
                  ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700 animate-pulse'
                  : isSyncing
                  ? 'bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700'
                  : 'bg-orange-100 hover:bg-orange-200 dark:bg-orange-950/80 dark:hover:bg-orange-900/80 text-orange-900 dark:text-orange-200 border-orange-300 dark:border-orange-700 cursor-pointer active:scale-95'
              }`}
              title={
                !browserOnline
                  ? `Mode Hors-Ligne activé (${pendingCount} action(s) stockée(s) en cache local)`
                  : isSyncing
                  ? 'Synchronisation des données en cours...'
                  : `${pendingCount} action(s) en attente de synchronisation. Cliquez pour envoyer au serveur.`
              }
            >
              {!browserOnline ? (
                <WifiOff className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
              ) : isSyncing ? (
                <RefreshCw className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 animate-spin shrink-0" />
              ) : (
                <CloudUpload className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400 shrink-0" />
              )}
              <span className="font-semibold">
                {!browserOnline ? 'Hors-ligne' : isSyncing ? 'Sync...' : `${pendingCount} en attente`}
              </span>
            </button>
          )}

          {/* DB Connection Status Pill */}
          <div 
            className={`hidden sm:flex items-center space-x-1.5 text-xs px-2 sm:px-2.5 py-1 rounded-xl border font-mono transition-all ${
              dbInfo.connected && browserOnline
                ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                : 'bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300'
            }`}
            title={dbInfo.type}
          >
            <span className={`w-2 h-2 rounded-full shrink-0 ${dbInfo.connected && browserOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
            <span className="truncate max-w-[120px] font-semibold">{dbInfo.connected && browserOnline ? 'Cloud Connecté' : 'Cache Local'}</span>
          </div>

          {/* Sync / Refresh Button */}
          <button 
            onClick={handleSyncClick}
            disabled={isSyncing}
            className={`p-1.5 sm:p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-red-600 transition-all active:scale-95 touch-manipulation border border-slate-200 dark:border-slate-700 ${isSyncing ? 'opacity-70 cursor-wait' : ''}`}
            title="Rafraîchir / Synchroniser les données"
          >
            <RefreshCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isSyncing ? 'animate-spin text-red-600' : ''}`} />
          </button>

          {/* Quick Settings & Push Notifications Button */}
          <button
            onClick={handleSettingsOrNotifClick}
            className={`p-1.5 sm:p-2 rounded-xl border transition-all active:scale-95 touch-manipulation relative flex items-center justify-center ${
              activeVue === 'parametres' && hasParamAccess
                ? 'bg-red-600 text-white border-red-600 shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-red-600 border-slate-200 dark:border-slate-700'
            }`}
            title={hasParamAccess ? 'Paramètres & Notifications' : 'Activer les Notifications Push'}
          >
            {hasParamAccess ? (
              <Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            ) : (
              <Bell className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-600 dark:text-purple-400 animate-bounce" />
            )}
            {notifState !== 'granted' && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full border-2 border-white dark:border-slate-900 animate-pulse" title="Notifications push non autorisées" />
            )}
          </button>

          {/* Active User Info & Logout Button */}
          <div className="flex items-center space-x-1.5 sm:space-x-2 bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 p-1 pl-2 rounded-xl">
            <div className="flex items-center space-x-1.5">
              <div className="w-6 h-6 rounded-lg bg-red-100 dark:bg-red-950/80 border border-red-200 dark:border-red-800/60 flex items-center justify-center text-red-600 dark:text-red-400 text-[11px] font-black shrink-0">
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
              className="flex items-center space-x-1 px-2 py-1 sm:px-2.5 sm:py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-all touch-manipulation active:scale-95 shadow-xs ml-0.5"
              title="Se déconnecter"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Déconnexion</span>
            </button>
          </div>
        </div>

      </div>

      {/* Notification Authorization Modal for Users without Param Access */}
      {isNotifModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-5 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/80 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Notifications Push</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Alertes en temps réel pour ce profil</p>
                </div>
              </div>
              <button 
                onClick={() => setIsNotifModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 dark:text-slate-400 font-medium">Statut actuel :</span>
                <span className={`px-2.5 py-1 rounded-full font-bold uppercase tracking-wider text-[10px] ${
                  notifState === 'granted' 
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300' 
                    : notifState === 'denied'
                    ? 'bg-red-100 text-red-700 dark:bg-red-950/80 dark:text-red-300'
                    : 'bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300'
                }`}>
                  {notifState === 'granted' ? 'Activé & Autorisé' : notifState === 'denied' ? 'Bloqué' : 'En attente d\'autorisation'}
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Autorisez les notifications push pour recevoir instantanément les nouvelles commandes, les rappels de cuisine et les alertes de préparation sur votre appareil.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
              <button
                onClick={async () => {
                  const res = await requestNotificationPermission(currentServeuse);
                  setNotifState(res);
                  if (res === 'granted') {
                    window.dispatchEvent(new CustomEvent('app_toast', { detail: { type: 'success', title: 'Notifications activées', message: 'Ce profil recevra désormais les alertes en temps réel.' } }));
                    playPreparationChime();
                  } else {
                    window.dispatchEvent(new CustomEvent('app_toast', { detail: { type: 'warning', title: 'Notifications', message: `Statut: ${res}. Vérifiez les paramètres de votre navigateur.` } }));
                  }
                }}
                className="flex-1 flex items-center justify-center space-x-2 px-4 py-3 bg-red-600 hover:bg-red-700 active:scale-95 text-white font-bold text-sm rounded-xl shadow-md transition-all touch-manipulation"
              >
                <Sparkles className="w-4 h-4" />
                <span>Autoriser les notifications</span>
              </button>
              <button
                onClick={() => {
                  playPreparationChime();
                }}
                className="px-4 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-sm rounded-xl transition-all flex items-center justify-center space-x-1.5"
                title="Tester le son"
              >
                <Volume2 className="w-4 h-4" />
                <span>Tester</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};




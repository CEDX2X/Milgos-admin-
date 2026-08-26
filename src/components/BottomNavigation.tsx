import React from 'react';
import { VueActive, RoleServeuse } from '../types';
import { ShoppingBag, ChefHat, Package, Users, BarChart3, Settings } from 'lucide-react';

interface BottomNavigationProps {
  userRole: RoleServeuse;
  activeVue: VueActive;
  onChangeVue: (vue: VueActive) => void;
  activeOrdersCount?: number;
}

interface NavTabItem {
  id: VueActive;
  label: string;
  shortLabel: string;
  icon: React.ElementType;
  roles: RoleServeuse[];
  badge?: number;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  userRole,
  activeVue,
  onChangeVue,
  activeOrdersCount = 0
}) => {
  const tabs: NavTabItem[] = [
    {
      id: 'commande',
      label: 'Commandes',
      shortLabel: 'Commandes',
      icon: ShoppingBag,
      roles: ['admin', 'serveuse']
    },
    {
      id: 'suivi',
      label: 'Cuisine',
      shortLabel: 'Cuisine',
      icon: ChefHat,
      roles: ['admin', 'serveuse', 'cuisine'],
      badge: activeOrdersCount > 0 ? activeOrdersCount : undefined
    },
    {
      id: 'catalogue',
      label: 'Stock & Menu',
      shortLabel: 'Stock',
      icon: Package,
      roles: ['admin', 'serveuse']
    },
    {
      id: 'serveuses',
      label: 'Personnel',
      shortLabel: 'Personnel',
      icon: Users,
      roles: ['admin']
    },
    {
      id: 'historique',
      label: 'Ventes',
      shortLabel: 'Ventes',
      icon: BarChart3,
      roles: ['admin']
    },
    {
      id: 'parametres',
      label: 'Paramètres',
      shortLabel: 'Settings',
      icon: Settings,
      roles: ['admin']
    }
  ];

  // Filter tabs allowed for current user role
  const visibleTabs = tabs.filter(tab => tab.roles.includes(userRole));

  return (
    <nav 
      aria-label="Navigation principale"
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border-t border-red-100 dark:border-slate-800 shadow-[0_-4px_20px_-2px_rgba(220,38,38,0.08)] px-1 sm:px-4 pt-1.5 pb-[calc(0.5rem+env(safe-area-inset-bottom))] flex items-center justify-around select-none"
    >
      <div className="max-w-5xl mx-auto w-full flex items-center justify-around gap-0.5 sm:gap-2">
        {visibleTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeVue === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onChangeVue(tab.id)}
              className={`relative flex flex-col items-center justify-center py-1 px-1 sm:px-3 rounded-xl transition-all duration-200 touch-manipulation active:scale-95 flex-1 min-h-[46px] ${
                isActive
                  ? 'text-red-600 dark:text-red-400 font-extrabold bg-red-50 dark:bg-red-950/70 ring-1 ring-red-500/40 shadow-xs'
                  : 'text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-red-50/50 dark:hover:bg-slate-800/50'
              }`}
            >
              {/* Active top bar indicator */}
              {isActive && (
                <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-7 sm:w-10 h-1 bg-gradient-to-r from-red-600 to-red-500 rounded-full shadow-sm shadow-red-500/50 animate-in fade-in zoom-in duration-200" />
              )}

              {/* Icon Container with optional Badge */}
              <div className="relative flex items-center justify-center">
                <Icon className={`w-5 h-5 sm:w-5 sm:h-5 transition-transform duration-200 ${isActive ? 'scale-110 text-red-600 dark:text-red-400' : 'scale-100 text-slate-400 dark:text-slate-400'}`} />

                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-red-600 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center animate-pulse border border-white dark:border-slate-900 shadow-xs font-mono">
                    {tab.badge > 9 ? '9+' : tab.badge}
                  </span>
                )}
              </div>

              {/* Tab Label */}
              <span className={`text-[9px] sm:text-xs mt-0.5 truncate tracking-tight ${isActive ? 'font-black text-red-700 dark:text-red-300' : 'font-medium text-slate-500 dark:text-slate-400'}`}>
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.shortLabel}</span>
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

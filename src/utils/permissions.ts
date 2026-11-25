import { Serveuse, VueActive } from '../types';

export const hasPermissionForVue = (user: Serveuse | null, vue: VueActive): boolean => {
  if (!user) return false;
  
  // If user has custom permissions array explicitly configured
  if (user.permissions && Array.isArray(user.permissions)) {
    return user.permissions.includes(vue);
  }

  // Fallback defaults based on role
  switch (user.role) {
    case 'admin':
      return true;
    case 'caissier':
      return ['caisse', 'commande', 'suivi', 'historique'].includes(vue);
    case 'cuisine':
    case 'barman':
      return ['suivi'].includes(vue);
    case 'serveuse':
    default:
      return ['commande', 'suivi', 'catalogue'].includes(vue);
  }
};

export const getDefaultVueForUser = (user: Serveuse | null): VueActive => {
  if (!user) return 'commande';

  const perms = user.permissions;
  if (perms && Array.isArray(perms) && perms.length > 0) {
    // Return the first allowed view from their custom permissions
    const validViews: VueActive[] = ['commande', 'suivi', 'caisse', 'catalogue', 'serveuses', 'historique', 'parametres'];
    for (const v of validViews) {
      if (perms.includes(v)) return v;
    }
  }

  // Fallback role-based default
  if (user.role === 'caissier') return 'caisse';
  if (user.role === 'cuisine' || user.role === 'barman') return 'suivi';
  return 'commande';
};

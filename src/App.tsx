import React, { useState, useEffect } from 'react';
import { Article, Serveuse, Commande, VueActive, StatistiquesVentes, StatutCommande, ModePaiement, Categorie } from './types';
import { posApi } from './services/api';
import { Header } from './components/Header';
import { BottomNavigation } from './components/BottomNavigation';
import { LoginView } from './components/LoginView';
import { OrderTakingView } from './components/OrderTakingView';
import { KitchenDisplayView } from './components/KitchenDisplayView';
import { CatalogManagerView } from './components/CatalogManagerView';
import { WaitstaffManagerView } from './components/WaitstaffManagerView';
import { SalesHistoryView } from './components/SalesHistoryView';
import { SettingsView } from './components/SettingsView';
import { ToastNotification, ToastMessage } from './components/ToastNotification';
import { getCurrency } from './utils/format';
import { sendOrderPaidNotification, initWebPushOnBoot } from './utils/notifications';

export default function App() {
  const [activeVue, setActiveVue] = useState<VueActive>('commande');
  const [articles, setArticles] = useState<Article[]>([]);
  const [categories, setCategories] = useState<Categorie[]>([]);
  const [serveuses, setServeuses] = useState<Serveuse[]>([]);
  const [commandes, setCommandes] = useState<Commande[]>([]);
  const [stats, setStats] = useState<StatistiquesVentes | null>(null);

  // Track paid order IDs to notify on background sync
  const knownPaidOrdersRef = React.useRef<Set<string>>(new Set());
  const isInitialLoadRef = React.useRef<boolean>(true);

  // Toast System
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: 'loading' | 'success' | 'error', title: string, description?: string, duration = 3500) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    setToasts(prev => [...prev, { id, type, title, description }]);

    if (type !== 'loading' && duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
    return id;
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const [currentServeuse, setCurrentServeuse] = useState<Serveuse | null>(() => {
    try {
      const saved = localStorage.getItem('orderease_session_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [dbInfo, setDbInfo] = useState<{ type: string; connected: boolean; uri?: string; counts?: any }>({
    type: 'Vérification...',
    connected: false
  });

  // Load initial data from API Express or PWA cache
  const loadAllData = async () => {
    try {
      const [artData, catData, srvData, cmdData, statsData, healthData] = await Promise.all([
        posApi.getArticles(),
        posApi.getCategories(),
        posApi.getServeuses(),
        posApi.getCommandes(),
        posApi.getStats(),
        posApi.getHealth()
      ]);

      setArticles(artData);
      setCategories(catData || []);
      setServeuses(srvData);
      setCommandes(cmdData);
      setStats(statsData);

      // Initialize paid orders cache on first load so we don't alert on past historical orders
      if (isInitialLoadRef.current && cmdData) {
        cmdData.forEach(c => {
          if (c.statut === 'Payée') {
            knownPaidOrdersRef.current.add(c.idCommande);
          }
        });
        isInitialLoadRef.current = false;
      }

      if (healthData && healthData.database) {
        setDbInfo({
          type: healthData.database.type,
          connected: healthData.database.connected,
          uri: healthData.database.uri,
          counts: healthData.database.counts
        });
      }

      // If active user session exists, update profile from fresh list
      if (currentServeuse && srvData.length > 0) {
        const fresh = srvData.find(s => s.idServeuse === currentServeuse.idServeuse || s.nom === currentServeuse.nom);
        if (fresh) {
          setCurrentServeuse(fresh);
          localStorage.setItem('orderease_session_user', JSON.stringify(fresh));
        }
      }
    } catch (err) {
      console.error('Data loading error:', err);
    }
  };

  useEffect(() => {
    loadAllData();
    initWebPushOnBoot();

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Periodic live sync every 10s for kitchen & order status board
    const interval = setInterval(() => {
      posApi.getCommandes().then((freshCmds) => {
        if (freshCmds && Array.isArray(freshCmds)) {
          // Check for newly paid orders coming from other POS terminals
          freshCmds.forEach((c) => {
            if (c.statut === 'Payée') {
              if (!knownPaidOrdersRef.current.has(c.idCommande)) {
                knownPaidOrdersRef.current.add(c.idCommande);
                if (!isInitialLoadRef.current) {
                  sendOrderPaidNotification({
                    idCommande: c.idCommande,
                    table: c.table,
                    total: c.montantTotal,
                    modePaiement: c.modePaiement,
                    nomServeuse: c.nomServeuse,
                    currencySymbol: getCurrency()
                  });
                }
              }
            }
          });
          setCommandes(freshCmds);
        }
      });
      posApi.getArticles().then(setArticles);
    }, 10000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const handleLoginSuccess = (user: Serveuse) => {
    setCurrentServeuse(user);
    localStorage.setItem('orderease_session_user', JSON.stringify(user));
    addToast('success', 'Connexion réussie', `Bienvenue ${user.nom} (${user.role})`);
    if (user.role === 'cuisine') {
      setActiveVue('suivi');
    } else {
      setActiveVue('commande');
    }
  };

  const handleLogout = () => {
    setCurrentServeuse(null);
    localStorage.removeItem('orderease_session_user');
    addToast('success', 'Déconnexion effectuée');
  };

  // --- ACTIONS (Database operations with Loader & Feedback Toasts) ---
  const handleValidateOrder = async (orderData: {
    idServeuse: string;
    nomServeuse: string;
    table: string;
    articles: { idArticle: string; nom: string; prixUnitaire: number; quantite: number; notes?: string }[];
    modePaiement: ModePaiement;
    notesServeuse: string;
  }) => {
    const loaderId = addToast('loading', 'Enregistrement de la commande...', `Envoi de la commande Table ${orderData.table} à la base de données`);
    try {
      const res = await posApi.createCommande(orderData);
      removeToast(loaderId);
      if (res.success) {
        addToast('success', 'Commande envoyée en cuisine !', `Numéro: ${res.commande?.idCommande || 'Nouvelle commande'} • Table ${orderData.table}`);
        
        // Trigger notification if order was directly paid on creation
        if (res.commande && (res.commande.statut === 'Payée' || orderData.modePaiement !== 'Non payé')) {
          knownPaidOrdersRef.current.add(res.commande.idCommande);
          sendOrderPaidNotification({
            idCommande: res.commande.idCommande,
            table: res.commande.table,
            total: res.commande.montantTotal,
            modePaiement: orderData.modePaiement,
            nomServeuse: orderData.nomServeuse,
            currencySymbol: getCurrency()
          });
        }

        await loadAllData();
      } else {
        addToast('error', 'Échec de la commande', res.message || res.errors?.join(' ') || 'Erreur lors de la sauvegarde de la commande.');
      }
      return res;
    } catch (err: any) {
      removeToast(loaderId);
      addToast('error', 'Erreur de communication', err.message || 'Impossible de sauvegarder la commande.');
      return { success: false, error: err.message };
    }
  };

  const handleUpdateStatut = async (idCommande: string, statut: StatutCommande, modePaiement?: ModePaiement) => {
    const loaderId = addToast('loading', 'Mise à jour du statut...', `Commande ${idCommande} ➔ ${statut}`);
    try {
      await posApi.updateStatutCommande(idCommande, statut, modePaiement);
      removeToast(loaderId);
      addToast('success', 'Statut mis à jour !', `Commande #${idCommande} passée à '${statut}' en base de données.`);

      // Trigger payment notification if marked as Payée
      if (statut === 'Payée') {
        knownPaidOrdersRef.current.add(idCommande);
        const existingCmd = commandes.find(c => c.idCommande === idCommande);
        sendOrderPaidNotification({
          idCommande,
          table: existingCmd?.table || 'Caisse',
          total: existingCmd?.montantTotal || 0,
          modePaiement: modePaiement || existingCmd?.modePaiement || 'Espèces',
          nomServeuse: existingCmd?.nomServeuse || currentServeuse?.nom,
          currencySymbol: getCurrency()
        });
      }

      await loadAllData();
    } catch (err: any) {
      removeToast(loaderId);
      addToast('error', 'Échec de mise à jour du statut', err.message || 'Erreur lors de la modification en base de données.');
    }
  };

  const handleCreateArticle = async (art: Partial<Article>) => {
    const loaderId = addToast('loading', 'Création de l\'article...', `Sauvegarde de '${art.nom}' en base de données...`);
    try {
      await posApi.createArticle(art);
      removeToast(loaderId);
      addToast('success', 'Article créé avec succès !', `'${art.nom}' a été ajouté au catalogue en base.`);
      await loadAllData();
    } catch (err: any) {
      removeToast(loaderId);
      addToast('error', 'Échec de la création', err.message || 'Impossible de sauvegarder l\'article.');
      throw err;
    }
  };

  const handleUpdateArticle = async (idArticle: string, updates: Partial<Article>) => {
    const loaderId = addToast('loading', 'Mise à jour de l\'article...', 'Enregistrement des modifications en base...');
    try {
      await posApi.updateArticle(idArticle, updates);
      removeToast(loaderId);
      addToast('success', 'Article modifié !', updates.nom ? `'${updates.nom}' mis à jour.` : `Article ${idArticle} mis à jour.`);
      await loadAllData();
    } catch (err: any) {
      removeToast(loaderId);
      addToast('error', 'Échec de la modification', err.message || 'Erreur lors de la mise à jour en base.');
      throw err;
    }
  };

  const handleAdjustStock = async (idArticle: string, delta?: number, nouveauStock?: number) => {
    const loaderId = addToast('loading', 'Mise à jour du stock...', 'Ajustement du stock en base de données...');
    try {
      await posApi.adjustStock(idArticle, delta, nouveauStock);
      removeToast(loaderId);
      addToast('success', 'Stock mis à jour !', 'Le niveau de stock a été réenregistré en base de données.');
      await loadAllData();
    } catch (err: any) {
      removeToast(loaderId);
      addToast('error', 'Erreur d\'ajustement de stock', err.message || 'Erreur de sauvegarde.');
    }
  };

  const handleDeleteArticle = async (idArticle: string) => {
    const loaderId = addToast('loading', 'Suppression de l\'article...', `Suppression de ${idArticle} en base...`);
    try {
      await posApi.deleteArticle(idArticle);
      removeToast(loaderId);
      addToast('success', 'Article supprimé !', 'Le produit a été définitivement retiré du catalogue.');
      await loadAllData();
    } catch (err: any) {
      removeToast(loaderId);
      addToast('error', 'Échec de la suppression', err.message || 'Impossible de supprimer l\'article.');
    }
  };

  const handleCreateServeuse = async (srv: Partial<Serveuse>) => {
    const loaderId = addToast('loading', 'Création du profil utilisateur...', `Sauvegarde de '${srv.nom}' (${srv.role}) en base...`);
    try {
      await posApi.createServeuse(srv);
      removeToast(loaderId);
      addToast('success', 'Profil utilisateur créé !', `Compte '${srv.nom}' enregistré avec succès.`);
      await loadAllData();
    } catch (err: any) {
      removeToast(loaderId);
      addToast('error', 'Échec de création du profil', err.message || 'Erreur lors de la sauvegarde du profil.');
      throw err;
    }
  };

  const handleUpdateServeuse = async (idServeuse: string, updates: Partial<Serveuse>) => {
    const loaderId = addToast('loading', 'Mise à jour du profil...', 'Modification enregistrée en base de données...');
    try {
      await posApi.updateServeuse(idServeuse, updates);
      removeToast(loaderId);
      addToast('success', 'Profil utilisateur mis à jour !', updates.nom ? `Compte '${updates.nom}' mis à jour.` : 'Modifications enregistrées.');
      await loadAllData();
    } catch (err: any) {
      removeToast(loaderId);
      addToast('error', 'Échec de modification du profil', err.message || 'Erreur de sauvegarde.');
      throw err;
    }
  };

  const handleDeleteServeuse = async (idServeuse: string) => {
    const loaderId = addToast('loading', 'Suppression du profil...', `Suppression de ${idServeuse} en base de données...`);
    try {
      await posApi.deleteServeuse(idServeuse);
      removeToast(loaderId);
      addToast('success', 'Profil supprimé !', 'Le compte utilisateur a été supprimé de la base.');
      if (currentServeuse && currentServeuse.idServeuse === idServeuse) {
        handleLogout();
      }
      await loadAllData();
    } catch (err: any) {
      removeToast(loaderId);
      addToast('error', 'Échec de la suppression du profil', err.message || 'Erreur lors de la suppression.');
    }
  };

  const handleClearApp = async (scope: 'commandes' | 'articles' | 'tout' = 'tout') => {
    const loaderId = addToast('loading', 'Réinitialisation de la base...', 'Effacement des données en base de données...');
    try {
      await posApi.clearApp(scope);
      removeToast(loaderId);
      addToast('success', 'Base de données nettoyée !', `Scope : ${scope}. Toutes les entrées visées ont été effacées.`);
      await loadAllData();
    } catch (err: any) {
      removeToast(loaderId);
      addToast('error', 'Échec de la réinitialisation', err.message || 'Erreur d\'effacement.');
    }
  };

  const handleSeedApp = async () => {
    const loaderId = addToast('loading', 'Génération des données de démonstration...', 'Population initiale de la base de données...');
    try {
      await posApi.seed();
      removeToast(loaderId);
      addToast('success', 'Données de démonstration chargées !', 'Articles, utilisateurs et commandes exemple injectés en base.');
      await loadAllData();
    } catch (err: any) {
      removeToast(loaderId);
      addToast('error', 'Échec de l\'injection de démonstration', err.message || 'Erreur lors du seed.');
    }
  };

  const [currency, setCurrencyState] = useState<string>(getCurrency());

  useEffect(() => {
    const handleCurrencyChange = () => {
      setCurrencyState(getCurrency());
    };
    window.addEventListener('currency_changed', handleCurrencyChange);
    return () => window.removeEventListener('currency_changed', handleCurrencyChange);
  }, []);

  // If no active session, show Login Page as default landing page
  if (!currentServeuse) {
    return (
      <LoginView
        serveusesList={serveuses}
        onLoginSuccess={handleLoginSuccess}
      />
    );
  }

  const activeKitchenOrdersCount = commandes.filter(c => c.statut !== 'Payée' && c.statut !== 'Annulée').length;

  return (
    <div className="h-[100dvh] min-h-[100dvh] w-full flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans overflow-hidden transition-colors duration-200">
      
      {/* Tablet Header Bar */}
      <Header
        currentServeuse={currentServeuse}
        onLogout={handleLogout}
        activeVue={activeVue}
        onChangeVue={setActiveVue}
        isOnline={isOnline}
        dbInfo={dbInfo}
        onRefreshData={loadAllData}
        currentCurrency={currency}
      />

      {/* Main Content Body */}
      <main className="flex-1 min-h-0 w-full overflow-y-auto touch-scroll-y relative pb-[calc(4.5rem+env(safe-area-inset-bottom))] sm:pb-24">
        {activeVue === 'commande' && (
          <OrderTakingView
            articles={articles}
            categories={categories}
            currentServeuse={currentServeuse}
            onValidateOrder={handleValidateOrder}
            onOpenLogin={handleLogout}
          />
        )}

        {activeVue === 'suivi' && (
          <KitchenDisplayView
            commandes={commandes}
            currentServeuse={currentServeuse}
            onUpdateStatut={handleUpdateStatut}
          />
        )}

        {activeVue === 'catalogue' && (
          <CatalogManagerView
            articles={articles}
            categories={categories}
            currentServeuse={currentServeuse}
            onCreateArticle={handleCreateArticle}
            onUpdateArticle={handleUpdateArticle}
            onAdjustStock={handleAdjustStock}
            onDeleteArticle={handleDeleteArticle}
            onCategoriesChange={loadAllData}
          />
        )}

        {activeVue === 'serveuses' && currentServeuse?.role === 'admin' && (
          <WaitstaffManagerView
            serveuses={serveuses}
            currentServeuse={currentServeuse}
            onCreateServeuse={handleCreateServeuse}
            onUpdateServeuse={handleUpdateServeuse}
            onDeleteServeuse={handleDeleteServeuse}
          />
        )}

        {activeVue === 'historique' && currentServeuse?.role === 'admin' && (
          <SalesHistoryView
            commandes={commandes}
            stats={stats}
          />
        )}

        {activeVue === 'parametres' && currentServeuse?.role === 'admin' && (
          <SettingsView
            currentServeuse={currentServeuse}
            dbInfo={dbInfo}
            onRefreshHealth={loadAllData}
            onClearApp={handleClearApp}
            onSeedApp={handleSeedApp}
            onCurrencyChange={() => setCurrencyState(getCurrency())}
            onLogout={handleLogout}
            articles={articles}
            categories={categories}
            onCategoriesChange={loadAllData}
          />
        )}
      </main>

      {/* Bottom Navigation Tab Bar */}
      <BottomNavigation
        userRole={currentServeuse.role}
        activeVue={activeVue}
        onChangeVue={setActiveVue}
        activeOrdersCount={activeKitchenOrdersCount}
      />

      {/* Global Toast Notification System */}
      <ToastNotification toasts={toasts} onDismiss={removeToast} />

    </div>
  );
}

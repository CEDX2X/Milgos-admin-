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
import { CashierRegisterView } from './components/CashierRegisterView';
import { ToastNotification, ToastMessage } from './components/ToastNotification';
import { OfflineSyncBanner } from './components/OfflineSyncBanner';
import { getCurrency } from './utils/format';
import { sendOrderPaidNotification, sendOrderStatusNotification, initWebPushOnBoot } from './utils/notifications';
import { filterOrderForRole } from './utils/orderCategory';
import { syncDeviceRegistration } from './utils/device';
import { hasPermissionForVue, getDefaultVueForUser } from './utils/permissions';

export default function App() {
  const [currentServeuse, setCurrentServeuse] = useState<Serveuse | null>(() => {
    try {
      const saved = localStorage.getItem('orderease_session_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [activeVue, setActiveVue] = useState<VueActive>(() => {
    try {
      const saved = localStorage.getItem('orderease_session_user');
      const user = saved ? JSON.parse(saved) : null;
      return getDefaultVueForUser(user);
    } catch {
      return 'commande';
    }
  });
  const [articles, setArticles] = useState<Article[]>([]);
  const [categories, setCategories] = useState<Categorie[]>([]);
  const [serveuses, setServeuses] = useState<Serveuse[]>([]);
  const [commandes, setCommandes] = useState<Commande[]>([]);
  const [stats, setStats] = useState<StatistiquesVentes | null>(null);

  // Track order statuses to notify in real-time across devices
  const knownPaidOrdersRef = React.useRef<Set<string>>(new Set());
  const previousOrderStatusesRef = React.useRef<Map<string, StatutCommande>>(new Map());
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

      // Initialize order statuses cache on first load so we don't alert on past historical orders
      if (isInitialLoadRef.current && cmdData) {
        cmdData.forEach(c => {
          previousOrderStatusesRef.current.set(c.idCommande, c.statut);
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
    let initialUser: Serveuse | null = null;
    try {
      const saved = localStorage.getItem('orderease_session_user');
      if (saved) initialUser = JSON.parse(saved);
    } catch {}
    initWebPushOnBoot(initialUser);
    syncDeviceRegistration(initialUser).catch(() => {});

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Periodic live sync every 5s for kitchen, bar & waitress real-time notifications
    const interval = setInterval(() => {
      posApi.getCommandes().then((freshCmds) => {
        if (freshCmds && Array.isArray(freshCmds)) {
          // Check for status changes across devices
          freshCmds.forEach((c) => {
            const previousStatut = previousOrderStatusesRef.current.get(c.idCommande);

            if (!isInitialLoadRef.current && previousStatut && previousStatut !== c.statut) {
              // Status changed!
              if (c.statut === 'En cuisine') {
                sendOrderStatusNotification({
                  idCommande: c.idCommande,
                  table: c.table,
                  statut: 'En cuisine',
                  nomServeuse: c.nomServeuse
                });
                addToast('success', '👨‍🍳 Commande en préparation', `Table ${c.table} #${c.idCommande} prise en charge par la cuisine/bar.`);
              } else if (c.statut === 'Prête') {
                sendOrderStatusNotification({
                  idCommande: c.idCommande,
                  table: c.table,
                  statut: 'Prête',
                  nomServeuse: c.nomServeuse
                });
                addToast('success', '🔔 Commande PRÊTE !', `Table ${c.table} #${c.idCommande} est prête à être servie !`, 7000);
              } else if (c.statut === 'Servie') {
                sendOrderStatusNotification({
                  idCommande: c.idCommande,
                  table: c.table,
                  statut: 'Servie',
                  nomServeuse: c.nomServeuse
                });
                addToast('success', '✅ Commande Servie', `Table ${c.table} #${c.idCommande} a été servie aux clients.`);
              } else if (c.statut === 'Payée' && !knownPaidOrdersRef.current.has(c.idCommande)) {
                knownPaidOrdersRef.current.add(c.idCommande);
                sendOrderPaidNotification({
                  idCommande: c.idCommande,
                  table: c.table,
                  total: c.montantTotal,
                  modePaiement: c.modePaiement,
                  nomServeuse: c.nomServeuse,
                  currencySymbol: getCurrency()
                });
                addToast('success', '💰 Commande Payée', `Table ${c.table} #${c.idCommande} réglée avec succès.`);
              }
            }

            // Update cache
            previousOrderStatusesRef.current.set(c.idCommande, c.statut);
          });
          setCommandes(freshCmds);
        }
      });
      posApi.getArticles().then(setArticles);
    }, 5000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const handleLoginSuccess = (user: Serveuse) => {
    setCurrentServeuse(user);
    localStorage.setItem('orderease_session_user', JSON.stringify(user));
    syncDeviceRegistration(user).catch(() => {});
    initWebPushOnBoot(user);
    addToast('success', 'Connexion réussie', `Bienvenue ${user.nom} (${user.role})`);
    setActiveVue(getDefaultVueForUser(user));
  };

  const handleLogout = () => {
    setCurrentServeuse(null);
    localStorage.removeItem('orderease_session_user');
    syncDeviceRegistration(null).catch(() => {});
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

  const handleUpdateStatut = async (
    idCommande: string, 
    statut: StatutCommande, 
    modePaiement?: ModePaiement,
    paymentDetails?: {
      idCaissier?: string;
      nomCaissier?: string;
      remise?: any;
      montantFinal?: number;
      montantRecu?: number;
      monnaieRendue?: number;
      datePaiement?: string;
    }
  ) => {
    const loaderId = addToast('loading', 'Mise à jour du statut...', `Commande ${idCommande} ➔ ${statut}`);
    try {
      await posApi.updateStatutCommande(idCommande, statut, modePaiement, paymentDetails);
      removeToast(loaderId);
      addToast('success', 'Statut mis à jour !', `Commande #${idCommande} passée à '${statut}' en base de données.`);

      // Trigger real-time notifications based on new status
      const existingCmd = commandes.find(c => c.idCommande === idCommande);
      const targetTable = existingCmd?.table || 'Table';
      const orderServeuse = existingCmd?.nomServeuse || currentServeuse?.nom;

      if (statut === 'En cuisine') {
        sendOrderStatusNotification({
          idCommande,
          table: targetTable,
          statut: 'En cuisine',
          nomServeuse: orderServeuse,
          department: currentServeuse?.role === 'barman' ? 'bar' : 'cuisine'
        });
      } else if (statut === 'Prête') {
        sendOrderStatusNotification({
          idCommande,
          table: targetTable,
          statut: 'Prête',
          nomServeuse: orderServeuse,
          department: currentServeuse?.role === 'barman' ? 'bar' : 'cuisine'
        });
      } else if (statut === 'Servie') {
        sendOrderStatusNotification({
          idCommande,
          table: targetTable,
          statut: 'Servie',
          nomServeuse: orderServeuse,
          department: currentServeuse?.role === 'barman' ? 'bar' : 'cuisine'
        });
      } else if (statut === 'Payée') {
        knownPaidOrdersRef.current.add(idCommande);
        sendOrderPaidNotification({
          idCommande,
          table: targetTable,
          total: paymentDetails?.montantFinal ?? existingCmd?.montantTotal ?? 0,
          modePaiement: modePaiement || existingCmd?.modePaiement || 'Espèces',
          nomServeuse: orderServeuse,
          currencySymbol: getCurrency()
        });
      }

      await loadAllData();
    } catch (err: any) {
      removeToast(loaderId);
      addToast('error', 'Échec de mise à jour du statut', err.message || 'Erreur lors de la modification en base de données.');
    }
  };

  const handleBatchUpdateStatut = async (
    idCommandes: string[],
    paymentData: {
      table?: string;
      modePaiement: ModePaiement;
      idCaissier?: string;
      nomCaissier?: string;
      remise?: any;
      montantFinal?: number;
      montantRecu?: number;
      monnaieRendue?: number;
      datePaiement?: string;
    }
  ) => {
    const loaderId = addToast('loading', 'Encaissement de la table...', `Règlement de ${idCommandes.length} commande(s) en cours...`);
    try {
      await posApi.batchPayTableCommandes(idCommandes, paymentData);
      removeToast(loaderId);
      addToast('success', 'Table encaissée avec succès !', `La table ${paymentData.table || ''} a été entièrement soldée (${(paymentData.montantFinal ?? 0).toLocaleString()} ${getCurrency()}).`);

      idCommandes.forEach(id => knownPaidOrdersRef.current.add(id));

      sendOrderPaidNotification({
        idCommande: idCommandes.join(', '),
        table: paymentData.table || 'Table',
        total: paymentData.montantFinal ?? 0,
        modePaiement: paymentData.modePaiement,
        nomServeuse: paymentData.nomCaissier,
        currencySymbol: getCurrency()
      });

      await loadAllData();
    } catch (err: any) {
      removeToast(loaderId);
      addToast('error', 'Échec de l\'encaissement groupé', err.message || 'Erreur lors du règlement de la table.');
      throw err;
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

  // Listen to background sync completions and auto-refresh local state
  useEffect(() => {
    const handleSyncComplete = () => {
      loadAllData();
    };
    window.addEventListener('orderease_sync_complete', handleSyncComplete);
    return () => window.removeEventListener('orderease_sync_complete', handleSyncComplete);
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

  const activeKitchenOrdersCount = commandes.filter(c => {
    if (c.statut === 'Payée' || c.statut === 'Annulée') return false;
    if (currentServeuse.role === 'barman' || currentServeuse.role === 'cuisine') {
      return filterOrderForRole(c, currentServeuse.role, articles).hasItemsForRole;
    }
    return true;
  }).length;

  const unpaidOrdersCount = commandes.filter(c => c.statut !== 'Payée' && c.statut !== 'Annulée').length;

  return (
    <div className="h-[100dvh] min-h-[100dvh] w-full flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans overflow-hidden transition-colors duration-200">
      
      {/* Header Bar with Desktop Navigation */}
      <Header
        currentServeuse={currentServeuse}
        onLogout={handleLogout}
        activeVue={activeVue}
        onChangeVue={setActiveVue}
        isOnline={isOnline}
        dbInfo={dbInfo}
        onRefreshData={loadAllData}
        currentCurrency={currency}
        userRole={currentServeuse.role}
        activeOrdersCount={activeKitchenOrdersCount}
        unpaidOrdersCount={unpaidOrdersCount}
      />

      {/* Offline Sync Banner */}
      <OfflineSyncBanner onDataRefreshed={loadAllData} />

      {/* Main Content Body (Adaptive padding: generous for mobile, compact for desktop) */}
      <main className="flex-1 min-h-0 w-full overflow-y-auto touch-scroll-y relative pb-[calc(4.5rem+env(safe-area-inset-bottom))] sm:pb-24 lg:pb-6">
        {activeVue === 'caisse' && hasPermissionForVue(currentServeuse, 'caisse') && (
          <CashierRegisterView
            commandes={commandes}
            articles={articles}
            currentServeuse={currentServeuse}
            onUpdateStatut={handleUpdateStatut}
            onBatchUpdateStatut={handleBatchUpdateStatut}
          />
        )}

        {activeVue === 'commande' && hasPermissionForVue(currentServeuse, 'commande') && (
          <OrderTakingView
            articles={articles}
            categories={categories}
            commandes={commandes}
            currentServeuse={currentServeuse}
            onValidateOrder={handleValidateOrder}
            onUpdateStatut={handleUpdateStatut}
            onNavigateToService={() => setActiveVue('suivi')}
            onOpenLogin={handleLogout}
          />
        )}

        {activeVue === 'suivi' && hasPermissionForVue(currentServeuse, 'suivi') && (
          <KitchenDisplayView
            commandes={commandes}
            articles={articles}
            currentServeuse={currentServeuse}
            onUpdateStatut={handleUpdateStatut}
          />
        )}

        {activeVue === 'catalogue' && hasPermissionForVue(currentServeuse, 'catalogue') && (
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

        {activeVue === 'serveuses' && hasPermissionForVue(currentServeuse, 'serveuses') && (
          <WaitstaffManagerView
            serveuses={serveuses}
            currentServeuse={currentServeuse}
            onCreateServeuse={handleCreateServeuse}
            onUpdateServeuse={handleUpdateServeuse}
            onDeleteServeuse={handleDeleteServeuse}
          />
        )}

        {activeVue === 'historique' && hasPermissionForVue(currentServeuse, 'historique') && (
          <SalesHistoryView
            commandes={commandes}
            stats={stats}
          />
        )}

        {activeVue === 'parametres' && hasPermissionForVue(currentServeuse, 'parametres') && (
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
        currentServeuse={currentServeuse}
        activeVue={activeVue}
        onChangeVue={setActiveVue}
        activeOrdersCount={activeKitchenOrdersCount}
        unpaidOrdersCount={unpaidOrdersCount}
      />

      {/* Global Toast Notification System */}
      <ToastNotification toasts={toasts} onDismiss={removeToast} />

    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { 
  Settings, Coins, Trash2, RotateCcw, Database, AlertTriangle, 
  CheckCircle2, RefreshCw, ShoppingBag, Package, Layers, 
  ShieldAlert, Cpu, Server, Smartphone, Code, CheckCircle, LogOut,
  Sun, Moon, Monitor, Palette, Bell, Volume2, Tag, FolderPlus, Plus, Grid,
  ChefHat, Wine, Sparkles, Lock
} from 'lucide-react';
import { getCurrency, setCurrency, formatPrice } from '../utils/format';
import { getThemeMode, applyTheme, ThemeMode } from '../utils/theme';
import { 
  getNotificationPermission, 
  requestNotificationPermission, 
  sendOrderPaidNotification,
  sendOrderStatusNotification,
  playPreparationChime,
  playReadyBellChime,
  NotificationPermissionState 
} from '../utils/notifications';

import { Serveuse, Categorie, Article, DeviceRegistration } from '../types';
import { posApi } from '../services/api';
import { getOrCreateDeviceId, getDeviceName, setDeviceName, syncDeviceRegistration } from '../utils/device';
import { Send, Users, Radio, SmartphoneCharging, Copy, Check } from 'lucide-react';

interface SettingsViewProps {
  currentServeuse?: Serveuse | null;
  dbInfo: { type: string; connected: boolean; uri?: string; counts?: any };
  onRefreshHealth: () => void;
  onClearApp: (scope: 'commandes' | 'articles' | 'tout') => Promise<void>;
  onSeedApp: () => Promise<void>;
  onCurrencyChange?: () => void;
  onLogout?: () => void;
  articles?: Article[];
  categories?: Categorie[];
  onCategoriesChange?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  currentServeuse,
  dbInfo,
  onRefreshHealth,
  onClearApp,
  onSeedApp,
  onCurrencyChange,
  onLogout,
  articles = [],
  categories = [],
  onCategoriesChange
}) => {
  const [selectedCurrency, setSelectedCurrency] = useState<string>(getCurrency());
  const [customCurrency, setCustomCurrency] = useState<string>('');
  const [currencySavedMessage, setCurrencySavedMessage] = useState<boolean>(false);
  
  // Categories State
  const [categoriesList, setCategoriesList] = useState<Categorie[]>(categories);
  const [newCatName, setNewCatName] = useState<string>('');
  const [newCatEmoji, setNewCatEmoji] = useState<string>('🍹');
  const [isCreatingCat, setIsCreatingCat] = useState<boolean>(false);
  const [catStatusMsg, setCatStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [catToDelete, setCatToDelete] = useState<Categorie | null>(null);
  const [isDeletingCat, setIsDeletingCat] = useState<boolean>(false);

  useEffect(() => {
    if (categories && categories.length > 0) {
      setCategoriesList(categories);
    } else {
      posApi.getCategories().then(res => {
        if (res && res.length > 0) setCategoriesList(res);
      }).catch(err => console.error("Error fetching categories:", err));
    }
  }, [categories]);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCatName.trim();
    if (!trimmed) {
      setCatStatusMsg({ type: 'error', text: 'Veuillez saisir un nom de catégorie.' });
      return;
    }
    if (categoriesList.some(c => c.nom.toLowerCase() === trimmed.toLowerCase())) {
      setCatStatusMsg({ type: 'error', text: `La catégorie "${trimmed}" existe déjà.` });
      return;
    }

    setIsCreatingCat(true);
    setCatStatusMsg(null);
    try {
      const res = await posApi.createCategory({
        nom: trimmed,
        emoji: newCatEmoji.trim() || '🏷️'
      });
      if (res.success) {
        setCatStatusMsg({ type: 'success', text: `Catégorie "${trimmed}" créée avec succès !` });
        setNewCatName('');
        const updated = await posApi.getCategories();
        setCategoriesList(updated);
        if (onCategoriesChange) onCategoriesChange();
        setTimeout(() => setCatStatusMsg(null), 4000);
      } else {
        setCatStatusMsg({ type: 'error', text: res.message || 'Erreur lors de la création de la catégorie.' });
      }
    } catch (err: any) {
      setCatStatusMsg({ type: 'error', text: err.message || 'Erreur serveur.' });
    } finally {
      setIsCreatingCat(false);
    }
  };

  const handleConfirmDeleteCategory = async () => {
    if (!catToDelete) return;
    setIsDeletingCat(true);
    try {
      await posApi.deleteCategory(catToDelete.nom);
      const updated = await posApi.getCategories();
      setCategoriesList(updated);
      setCatStatusMsg({ type: 'success', text: `Catégorie "${catToDelete.nom}" supprimée.` });
      if (onCategoriesChange) onCategoriesChange();
      setTimeout(() => setCatStatusMsg(null), 3000);
    } catch (err: any) {
      setCatStatusMsg({ type: 'error', text: 'Erreur lors de la suppression de la catégorie.' });
    } finally {
      setIsDeletingCat(false);
      setCatToDelete(null);
    }
  };

  const EMOJI_PRESETS = ['🍹', '🍺', '🍷', '☕', '🍔', '🍕', '🧀', '🥗', '🥩', '🍰', '🍦', '🍟', '🥪', '🥤', '🏷️', '✨'];
  
  // Theme State
  const [themeMode, setThemeMode] = useState<ThemeMode>(getThemeMode());

  const handleThemeChange = (mode: ThemeMode) => {
    setThemeMode(mode);
    applyTheme(mode);
  };

  // PWA Notifications State
  const [notifPermission, setNotifPermission] = useState<NotificationPermissionState>(getNotificationPermission());
  const [testNotifMsg, setTestNotifMsg] = useState<string | null>(null);

  const handleEnableNotifications = async () => {
    const perm = await requestNotificationPermission();
    setNotifPermission(perm);
    if (perm === 'granted') {
      setTestNotifMsg('✅ Notifications Push activées avec succès sur cet appareil !');
      // Trigger a welcoming sample ready notification
      sendOrderStatusNotification({
        idCommande: 'TEST-OK',
        table: 'T-01',
        statut: 'Servie',
        nomServeuse: currentServeuse?.nom || 'Serveuse',
        department: 'all'
      });
    } else if (perm === 'denied') {
      setTestNotifMsg('❌ Les notifications sont bloquées dans les paramètres de votre navigateur.');
    } else if (perm === 'unsupported') {
      setTestNotifMsg('⚠️ Votre navigateur ne prend pas en charge les notifications push.');
    }
  };

  const handleTestReadyNotification = async () => {
    // 1. Trigger local ready bell chime & vibration
    await sendOrderStatusNotification({
      idCommande: 'TEST-PRÊTE',
      table: 'T-04',
      statut: 'Servie',
      nomServeuse: currentServeuse?.nom || 'Serveuse',
      department: currentServeuse?.role === 'barman' ? 'bar' : 'cuisine'
    });

    // 2. Trigger server Web Push
    try {
      const res = await fetch('/api/push/test', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          type: 'ready', 
          table: 'T-04', 
          serveuse: currentServeuse?.nom || 'Serveuse' 
        })
      });
      const data = await res.json();
      setTestNotifMsg('🔔 Alerte Commande Prête émise (Cloche de service + Vibreur + Web Push) !');
    } catch {
      setTestNotifMsg('🔔 Cloche de service et vibreur émis localement !');
    }
  };

  const handleTestPreparationNotification = async () => {
    // 1. Trigger local preparation chime & vibration
    await sendOrderStatusNotification({
      idCommande: 'TEST-PREP',
      table: 'T-02',
      statut: 'En cuisine',
      nomServeuse: currentServeuse?.nom || 'Serveuse',
      department: currentServeuse?.role === 'barman' ? 'bar' : 'cuisine'
    });

    // 2. Trigger server Web Push
    try {
      await fetch('/api/push/test', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          type: 'prep', 
          table: 'T-02', 
          serveuse: currentServeuse?.nom || 'Serveuse' 
        })
      });
      setTestNotifMsg('👨‍🍳 Alerte En Préparation émise (Carillon ascendant + Vibreur + Web Push) !');
    } catch {
      setTestNotifMsg('👨‍🍳 Carillon de préparation et vibreur émis localement !');
    }
  };

  const handleTestPaymentNotification = async () => {
    // 1. Trigger local chime sound & vibration
    sendOrderPaidNotification({
      idCommande: 'TEST-001',
      table: 'T-05',
      total: 12500,
      modePaiement: 'Espèces',
      nomServeuse: currentServeuse?.nom || 'Caissier',
      currencySymbol: selectedCurrency
    });

    // 2. Trigger server Web Push for background / closed app testing
    try {
      const res = await fetch('/api/push/test', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setTestNotifMsg('💰 Notification Web Push (Serveur ➔ APNs iOS / Android) envoyée avec succès !');
      } else {
        setTestNotifMsg('Alerte émise. Si les notifications ne s’affichent pas sur iOS, ajoutez la PWA à l’écran d’accueil.');
      }
    } catch {
      setTestNotifMsg('Alerte sonore et vibreur émis localement !');
    }
  };

  // PIN Change State
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinStatusMsg, setPinStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isUpdatingPin, setIsUpdatingPin] = useState(false);

  const handleUpdatePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentServeuse) return;
    if (newPin.length < 4) {
      setPinStatusMsg({ type: 'error', text: 'Le nouveau PIN doit contenir 4 chiffres.' });
      return;
    }
    if (newPin !== confirmPin) {
      setPinStatusMsg({ type: 'error', text: 'Les deux nouveaux codes PIN ne correspondent pas.' });
      return;
    }

    setIsUpdatingPin(true);
    setPinStatusMsg(null);
    try {
      const res = await posApi.updatePin(currentServeuse.idServeuse, currentPin, newPin);
      if (res.success) {
        setPinStatusMsg({ type: 'success', text: res.message || 'Code PIN mis à jour avec succès !' });
        setCurrentPin('');
        setNewPin('');
        setConfirmPin('');
      } else {
        setPinStatusMsg({ type: 'error', text: res.message || 'Erreur lors de la mise à jour' });
      }
    } catch (err: any) {
      setPinStatusMsg({ type: 'error', text: 'Erreur serveur.' });
    } finally {
      setIsUpdatingPin(false);
    }
  };

  // Health inspection data
  const [healthData, setHealthData] = useState<any>(null);

  // Modal for sensitive reset actions
  const [isResetModalOpen, setIsResetModalOpen] = useState<boolean>(false);
  const [loadingAction, setLoadingAction] = useState<boolean>(false);

  // --- CONNECTED DEVICES & TARGETED NOTIFICATIONS BY ID ---
  const [myDeviceId] = useState<string>(getOrCreateDeviceId());
  const [myDeviceName, setMyDeviceName] = useState<string>(getDeviceName());
  const [isEditingDeviceName, setIsEditingDeviceName] = useState<boolean>(false);
  const [tempDeviceName, setTempDeviceName] = useState<string>(getDeviceName());
  const [deviceSaveSuccess, setDeviceSaveSuccess] = useState<boolean>(false);
  const [copiedDeviceId, setCopiedDeviceId] = useState<boolean>(false);

  const [registeredDevices, setRegisteredDevices] = useState<DeviceRegistration[]>([]);
  const [loadingDevices, setLoadingDevices] = useState<boolean>(false);
  const [allProfiles, setAllProfiles] = useState<Serveuse[]>([]);

  // Targeted Notification Form State
  const [targetType, setTargetType] = useState<'profile' | 'device' | 'role' | 'all'>('profile');
  const [selectedTargetProfile, setSelectedTargetProfile] = useState<string>(currentServeuse?.idServeuse || '');
  const [selectedTargetDevice, setSelectedTargetDevice] = useState<string>(myDeviceId);
  const [selectedTargetRole, setSelectedTargetRole] = useState<string>('cuisine');
  const [customNotifTitle, setCustomNotifTitle] = useState<string>('🔔 Alerte Directe OrderEase');
  const [customNotifBody, setCustomNotifBody] = useState<string>('Message test ciblé envoyé vers votre appareil.');
  const [isSendingTargetedNotif, setIsSendingTargetedNotif] = useState<boolean>(false);
  const [targetedNotifFeedback, setTargetedNotifFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadDevices = async () => {
    setLoadingDevices(true);
    try {
      const [devs, srvs] = await Promise.all([
        posApi.getDevices(),
        posApi.getServeuses()
      ]);
      setRegisteredDevices(devs);
      setAllProfiles(srvs);
      if (srvs.length > 0 && !selectedTargetProfile) {
        setSelectedTargetProfile(currentServeuse?.idServeuse || srvs[0].idServeuse);
      }
    } catch (err) {
      console.warn('Failed to load devices list:', err);
    } finally {
      setLoadingDevices(false);
    }
  };

  useEffect(() => {
    loadDevices();
    // Register / heartbeat this device on view load
    syncDeviceRegistration(currentServeuse || null).catch(() => {});
  }, [currentServeuse]);

  const handleSaveDeviceName = async () => {
    const trimmed = tempDeviceName.trim();
    if (!trimmed) return;
    setDeviceName(trimmed);
    setMyDeviceName(trimmed);
    setIsEditingDeviceName(false);
    setDeviceSaveSuccess(true);
    await syncDeviceRegistration(currentServeuse || null);
    await loadDevices();
    setTimeout(() => setDeviceSaveSuccess(false), 3000);
  };

  const handleCopyDeviceId = () => {
    navigator.clipboard?.writeText(myDeviceId);
    setCopiedDeviceId(true);
    setTimeout(() => setCopiedDeviceId(false), 2500);
  };

  const handleDeleteDevice = async (idAppareil: string) => {
    try {
      await posApi.deleteDevice(idAppareil);
      await loadDevices();
    } catch (e: any) {
      console.error("Error deleting device:", e);
    }
  };

  const handleSendTargetedPush = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customNotifTitle.trim() || !customNotifBody.trim()) {
      setTargetedNotifFeedback({ type: 'error', text: 'Veuillez saisir un titre et un message.' });
      return;
    }

    setIsSendingTargetedNotif(true);
    setTargetedNotifFeedback(null);

    try {
      const payload: any = {
        title: customNotifTitle.trim(),
        body: customNotifBody.trim(),
        tag: `targeted-${Date.now()}`
      };

      if (targetType === 'profile') {
        payload.targetIdProfil = selectedTargetProfile;
      } else if (targetType === 'device') {
        payload.targetIdAppareil = selectedTargetDevice;
      } else if (targetType === 'role') {
        payload.targetRole = selectedTargetRole;
      } else {
        payload.targetRole = 'all';
      }

      const res = await posApi.sendTargetedNotification(payload);
      if (res.success) {
        setTargetedNotifFeedback({
          type: 'success',
          text: `✅ Notification transmise avec succès ! (${res.count ?? 0} appareil(s) destinataire(s) ont reçu le push).`
        });
      } else {
        setTargetedNotifFeedback({
          type: 'error',
          text: res.message || "Erreur lors de l'envoi de la notification ciblée."
        });
      }
    } catch (err: any) {
      setTargetedNotifFeedback({
        type: 'error',
        text: err.message || 'Erreur de connexion serveur.'
      });
    } finally {
      setIsSendingTargetedNotif(false);
    }
  };

  const handleQuickTestToProfile = async (idProfil: string, nomProfil: string) => {
    setIsSendingTargetedNotif(true);
    setTargetedNotifFeedback(null);
    try {
      const res = await posApi.sendTargetedNotification({
        targetIdProfil: idProfil,
        title: `🔔 Signal Direct pour ${nomProfil} (${idProfil})`,
        body: `Alerte de test ciblée envoyée spécifiquement vers vos appareils enregistrés.`,
        tag: `quick-target-${Date.now()}`
      });
      if (res.success) {
        setTargetedNotifFeedback({
          type: 'success',
          text: `✅ Signal test envoyé vers le profil ${nomProfil} (${idProfil}) !`
        });
      }
    } catch {
      setTargetedNotifFeedback({
        type: 'error',
        text: "Erreur lors de l'envoi rapide."
      });
    } finally {
      setIsSendingTargetedNotif(false);
    }
  };

  useEffect(() => {
    setSelectedCurrency(getCurrency());
  }, []);

  useEffect(() => {
    fetch('/api/health')
      .then(res => res.json())
      .then(data => setHealthData(data))
      .catch(() => setHealthData(null));
  }, [dbInfo]);

  const handleApplyCurrency = (newCurrency: string) => {
    setCurrency(newCurrency);
    setSelectedCurrency(newCurrency);
    setCurrencySavedMessage(true);
    if (onCurrencyChange) onCurrencyChange();
    setTimeout(() => setCurrencySavedMessage(false), 3000);
  };

  const handleCustomCurrencySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customCurrency.trim()) {
      handleApplyCurrency(customCurrency.trim());
      setCustomCurrency('');
    }
  };

  const handleClearScope = async (scope: 'commandes' | 'articles' | 'tout') => {
    setLoadingAction(true);
    try {
      await onClearApp(scope);
      setIsResetModalOpen(false);
    } finally {
      setLoadingAction(false);
    }
  };

  const handleSeed = async () => {
    setLoadingAction(true);
    try {
      await onSeedApp();
      setIsResetModalOpen(false);
    } finally {
      setLoadingAction(false);
    }
  };

  const PRESET_CURRENCIES = [
    { code: 'FCFA', name: 'Franc CFA', desc: 'Devise courante Afrique de l\'Ouest & Centrale' },
    { code: 'CFA', name: 'CFA', desc: 'Symbole simplifié Franc CFA' },
    { code: '€', name: 'Euro (€)', desc: 'Euro Zone' },
    { code: '$', name: 'Dollar ($)', desc: 'Dollar Américain' },
    { code: 'XOF', name: 'XOF', desc: 'Code ISO BCEAO' },
    { code: 'XAF', name: 'XAF', desc: 'Code ISO BEAC' },
  ];

  const isAdmin = currentServeuse?.role === 'admin';

  // =========================================================================
  // VIEW FOR NON-ADMIN ROLES (Serveuse, Cuisine, Barman, Caissier)
  // Restricted strictly to Push Notifications authorization and sound alerts
  // =========================================================================
  if (!isAdmin) {
    return (
      <div className="w-full max-w-5xl 2xl:max-w-6xl mx-auto min-h-full flex flex-col bg-slate-50 text-slate-800 p-3 sm:p-5 lg:p-6 pb-20 sm:pb-8 space-y-6">
        
        {/* Header Banner */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative overflow-hidden transition-colors duration-200">
          <div className="absolute top-0 right-0 p-8 opacity-5 dark:opacity-10 pointer-events-none">
            <Bell className="w-48 h-48 text-purple-600 dark:text-purple-400" />
          </div>

          <div className="flex items-center space-x-3.5 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-600/20 shrink-0">
              <Bell className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="font-extrabold text-base sm:text-xl text-slate-900 dark:text-white">
                  Notifications Push & Alertes
                </h2>
                <span className="bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-bold text-[10px] uppercase px-2 py-0.5 rounded-full border border-purple-200 dark:border-purple-800">
                  {currentServeuse?.role === 'cuisine' ? '👨‍🍳 Cuisine' : currentServeuse?.role === 'barman' ? '🍹 Barman' : currentServeuse?.role === 'caissier' ? '💰 Caissier' : '💁‍♀️ Serveuse'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Autorisez votre appareil pour recevoir les sonneries et notifications instantanées
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 self-start sm:self-center shrink-0 relative z-10">
            <span className={`text-xs uppercase font-extrabold px-3.5 py-1.5 rounded-xl border flex items-center space-x-1.5 ${
              notifPermission === 'granted'
                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800'
                : notifPermission === 'denied'
                ? 'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800'
                : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-800 animate-pulse'
            }`}>
              <span className={`w-2 h-2 rounded-full ${notifPermission === 'granted' ? 'bg-emerald-500' : notifPermission === 'denied' ? 'bg-red-500' : 'bg-amber-500 animate-ping'}`} />
              <span>{notifPermission === 'granted' ? 'Push Activé sur cet appareil' : notifPermission === 'denied' ? 'Push Bloqué' : 'Push Non Autorisé'}</span>
            </span>
          </div>
        </div>

        {/* Main Push Notification Settings Card */}
        <div className="bg-white dark:bg-slate-900 border-2 border-purple-200 dark:border-purple-800/80 rounded-3xl p-4 sm:p-6 shadow-sm space-y-5 transition-colors duration-200 max-w-4xl">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center space-x-2.5">
              <div className="w-10 h-10 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-600/30">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white flex items-center space-x-2">
                  <span>Autorisation des Notifications Push</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Soyez averti instantanément avec signal sonore et vibreur lors des changements de commande
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {/* Permission Banner */}
            {notifPermission !== 'granted' ? (
              <div className="p-5 rounded-2xl bg-gradient-to-r from-purple-700 via-purple-600 to-indigo-700 text-white shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="space-y-1.5 text-center sm:text-left">
                  <div className="font-black text-base flex items-center justify-center sm:justify-start space-x-2">
                    <Sparkles className="w-5 h-5 text-amber-300" />
                    <span>Cliquez pour activer les notifications push sur votre appareil</span>
                  </div>
                  <p className="text-xs text-purple-100 leading-relaxed max-w-xl">
                    {currentServeuse?.role === 'serveuse' 
                      ? "Vous recevrez une sonnerie de cloche dès que la cuisine ou le bar signale qu'une commande est PRÊTE à être servie."
                      : currentServeuse?.role === 'cuisine' || currentServeuse?.role === 'barman'
                      ? "Vous recevrez une alerte sonore dès qu'une nouvelle commande est envoyée par une serveuse."
                      : "Vous recevrez les alertes de commandes et de règlements en direct."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleEnableNotifications}
                  className="w-full sm:w-auto bg-white hover:bg-purple-50 text-purple-900 font-black py-3 px-6 rounded-2xl text-sm shadow-xl active:scale-95 transition-all touch-manipulation flex items-center justify-center space-x-2 shrink-0"
                >
                  <Bell className="w-5 h-5 text-purple-600" />
                  <span>Autoriser les Notifications</span>
                </button>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center space-x-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <div className="text-sm font-extrabold text-emerald-900 dark:text-emerald-100">Notifications Push Actives</div>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-300 mt-0.5">Votre terminal est correctement enregistré pour recevoir les sonneries de cloche et les notifications push.</p>
                </div>
              </div>
            )}

            {testNotifMsg && (
              <div className="p-3.5 rounded-xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 text-purple-900 dark:text-purple-200 text-xs font-bold flex items-center justify-between animate-fade-in">
                <span>{testNotifMsg}</span>
                <button onClick={() => setTestNotifMsg(null)} className="text-purple-600 dark:text-purple-400 hover:opacity-80 font-mono text-base font-black px-2">×</button>
              </div>
            )}

            {/* Testing Buttons */}
            <div className="space-y-2 pt-2">
              <div className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center space-x-1.5">
                <Volume2 className="w-4 h-4 text-purple-600" />
                <span>Tester les alertes sonores de votre rôle :</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={handleTestReadyNotification}
                  className="p-3.5 rounded-2xl bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 dark:hover:bg-purple-900/60 border border-purple-200 dark:border-purple-800 text-purple-900 dark:text-purple-200 text-xs font-bold flex flex-col items-center text-center space-y-1.5 active:scale-95 transition-all touch-manipulation shadow-2xs"
                >
                  <div className="p-2 bg-purple-600 text-white rounded-xl shadow-xs">
                    <Bell className="w-4 h-4" />
                  </div>
                  <span className="font-extrabold text-sm">🔔 Commande Prête</span>
                  <span className="text-[10px] text-purple-600 dark:text-purple-400 font-normal">Cloche de restaurant + Vibreur</span>
                </button>

                <button
                  type="button"
                  onClick={handleTestPreparationNotification}
                  className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 dark:hover:bg-amber-900/60 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs font-bold flex flex-col items-center text-center space-y-1.5 active:scale-95 transition-all touch-manipulation shadow-2xs"
                >
                  <div className="p-2 bg-amber-600 text-white rounded-xl shadow-xs">
                    <ChefHat className="w-4 h-4" />
                  </div>
                  <span className="font-extrabold text-sm">👨‍🍳 En Préparation</span>
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 font-normal">Carillon ascendant + Vibreur</span>
                </button>

                <button
                  type="button"
                  onClick={handleTestPaymentNotification}
                  className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs font-bold flex flex-col items-center text-center space-y-1.5 active:scale-95 transition-all touch-manipulation shadow-2xs"
                >
                  <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-xs">
                    <Coins className="w-4 h-4" />
                  </div>
                  <span className="font-extrabold text-sm">💰 Paiement Encaissé</span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-normal">Double-ton caisse + Vibreur</span>
                </button>
              </div>
            </div>

            {/* Smartphone Compatibility Card */}
            <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/80 text-xs text-slate-700 dark:text-slate-300 space-y-2">
              <div className="flex items-center space-x-2 font-bold text-slate-900 dark:text-white">
                <Smartphone className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span>Guide de réception sur Smartphone (Android & iPhone)</span>
              </div>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-[11px]">
                • <strong>Android :</strong> Dès l'autorisation accordée, les notifications et alertes s'affichent automatiquement dans la barre supérieure du téléphone.<br />
                • <strong>iPhone / iPad (iOS 16.4+) :</strong> Pour recevoir les notifications lorsque l'écran est verrouillé, ouvrez l'application dans Safari, appuyez sur le bouton <strong>Partager</strong> ➔ puis <strong>Sur l'écran d'accueil</strong>.
              </p>
            </div>
          </div>
        </div>

        {/* User Session & Logout */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4 max-w-4xl transition-colors duration-200">
          <div className="flex items-center space-x-3.5 text-left w-full sm:w-auto">
            <div className="w-10 h-10 rounded-2xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
              <LogOut className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">Session Active</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Connecté en tant que <strong className="text-slate-800 dark:text-slate-200">{currentServeuse?.nom || 'Utilisateur'}</strong> ({currentServeuse?.role})
              </p>
            </div>
          </div>

          <button
            onClick={onLogout}
            className="w-full sm:w-auto px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-red-600/20 transition-all flex items-center justify-center space-x-2 touch-manipulation active:scale-95 shrink-0"
          >
            <LogOut className="w-4 h-4" />
            <span>Se Déconnecter</span>
          </button>
        </div>

      </div>
    );
  }

  // =========================================================================
  // VIEW FOR ADMINISTRATOR (Full access to all settings)
  // =========================================================================
  return (
    <div className="w-full max-w-[1700px] mx-auto min-h-full flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 p-3 sm:p-5 lg:p-6 pb-20 sm:pb-8 space-y-6">
      
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative overflow-hidden transition-colors duration-200">
        <div className="absolute top-0 right-0 p-8 opacity-5 dark:opacity-10 pointer-events-none">
          <Settings className="w-48 h-48 text-red-600 dark:text-red-400" />
        </div>

        <div className="flex items-center space-x-3.5 relative z-10">
          <div className="w-12 h-12 rounded-2xl bg-red-600 text-white flex items-center justify-center shadow-md shadow-red-600/20 shrink-0">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="font-extrabold text-base sm:text-xl text-slate-900 dark:text-white">Paramètres de la Caisse</h2>
              <span className="bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-bold text-[10px] uppercase px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                Configuration
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Apparence, devise d'affichage, sécurité et gestion des données
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 self-start sm:self-center shrink-0 relative z-10">
          <div className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-mono font-bold text-xs px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center space-x-1.5">
            <Coins className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Devise active : <strong className="text-red-600 dark:text-red-400 font-extrabold">{selectedCurrency}</strong></span>
          </div>
        </div>
      </div>

      {/* Grid: 1. Currency Config & 2. Sensitive Maintenance Zone */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Left 2 Cols: Theme, PIN & Currency Settings */}
        <div className="lg:col-span-2 space-y-5">

          {/* Card: Apparence & Thème (Clair / Sombre) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-6 shadow-xs space-y-4 transition-colors duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800/80 text-red-600 dark:text-red-400 flex items-center justify-center">
                  <Palette className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">Apparence & Confort Visuel</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Basculez entre le thème clair et le thème sombre pour optimiser la lisibilité</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => handleThemeChange('light')}
                className={`p-3.5 rounded-2xl border-2 transition-all flex flex-col items-center justify-center text-center space-y-2 touch-manipulation active:scale-95 ${
                  themeMode === 'light'
                    ? 'bg-red-50/80 dark:bg-red-950/40 border-red-500 text-red-950 dark:text-red-200 shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/80 text-slate-600 dark:text-slate-300 hover:border-slate-300'
                }`}
              >
                <div className={`p-2.5 rounded-xl ${themeMode === 'light' ? 'bg-red-600 text-white shadow-md shadow-red-600/20' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}>
                  <Sun className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-extrabold text-xs sm:text-sm">Thème Clair</div>
                  <div className="text-[10px] opacity-75">Maximum de luminosité</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleThemeChange('dark')}
                className={`p-3.5 rounded-2xl border-2 transition-all flex flex-col items-center justify-center text-center space-y-2 touch-manipulation active:scale-95 ${
                  themeMode === 'dark'
                    ? 'bg-red-950/60 border-red-500 text-red-200 shadow-sm ring-2 ring-red-500/20'
                    : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/80 text-slate-600 dark:text-slate-300 hover:border-slate-300'
                }`}
              >
                <div className={`p-2.5 rounded-xl ${themeMode === 'dark' ? 'bg-red-600 text-white shadow-md shadow-red-600/30' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}>
                  <Moon className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-extrabold text-xs sm:text-sm">Thème Sombre</div>
                  <div className="text-[10px] opacity-75">Confort nocturne</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleThemeChange('system')}
                className={`p-3.5 rounded-2xl border-2 transition-all flex flex-col items-center justify-center text-center space-y-2 touch-manipulation active:scale-95 ${
                  themeMode === 'system'
                    ? 'bg-slate-100 dark:bg-slate-800 border-red-500 text-slate-900 dark:text-slate-100 shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/80 text-slate-600 dark:text-slate-300 hover:border-slate-300'
                }`}
              >
                <div className={`p-2.5 rounded-xl ${themeMode === 'system' ? 'bg-red-600 text-white shadow-md shadow-red-600/20' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}>
                  <Monitor className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-extrabold text-xs sm:text-sm">Automatique</div>
                  <div className="text-[10px] opacity-75">Suivre l'appareil</div>
                </div>
              </button>
            </div>
          </div>

          {/* Card: Notifications PWA & Alertes en Direct (Cuisine / Bar / Serveuse) */}
          <div className="bg-white dark:bg-slate-900 border-2 border-purple-200 dark:border-purple-800/80 rounded-3xl p-4 sm:p-6 shadow-sm space-y-4 transition-colors duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-10 h-10 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-600/30">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white flex items-center space-x-2">
                    <span>Notifications Push & Alertes Sonores</span>
                    <span className="text-[10px] bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full font-bold">
                      Cuisine • Bar • Serveuse
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Alerte sonore de cloche, carillon et vibreur dès qu'une commande passe en préparation ou est prête
                  </p>
                </div>
              </div>
              <span className={`text-[10px] uppercase font-extrabold px-3 py-1 rounded-full border ${
                notifPermission === 'granted'
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800 animate-pulse'
                  : notifPermission === 'denied'
                  ? 'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800'
                  : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-800'
              }`}>
                {notifPermission === 'granted' ? '✅ Push Actif' : notifPermission === 'denied' ? '❌ Bloqué' : '⚠️ À Activer'}
              </span>
            </div>

            <div className="space-y-4">
              {/* Permission Banner */}
              {notifPermission !== 'granted' ? (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="space-y-1 text-center sm:text-left">
                    <div className="font-black text-sm flex items-center justify-center sm:justify-start space-x-1.5">
                      <Sparkles className="w-4 h-4 text-amber-300" />
                      <span>Autorisez les notifications push pour ce terminal</span>
                    </div>
                    <p className="text-xs text-purple-100">
                      Permet à la serveuse de recevoir un signal sonore dès que le cuisinier ou le barman prépare ou termine la commande.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleEnableNotifications}
                    className="w-full sm:w-auto bg-white hover:bg-purple-50 text-purple-900 font-extrabold py-2.5 px-5 rounded-xl text-xs shadow-lg active:scale-95 transition-all touch-manipulation flex items-center justify-center space-x-2 shrink-0"
                  >
                    <Bell className="w-4 h-4 text-purple-600" />
                    <span>Autoriser les Notifications</span>
                  </button>
                </div>
              ) : (
                <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Notifications Push autorisées et connectées au serveur.</span>
                </div>
              )}

              {testNotifMsg && (
                <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 text-purple-900 dark:text-purple-200 text-xs font-bold flex items-center justify-between">
                  <span>{testNotifMsg}</span>
                  <button onClick={() => setTestNotifMsg(null)} className="text-purple-600 dark:text-purple-400 hover:opacity-80 font-mono text-sm font-black">×</button>
                </div>
              )}

              {/* Testing Buttons */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center space-x-1.5">
                  <Volume2 className="w-4 h-4 text-purple-600" />
                  <span>Tester les sonneries et alertes en direct :</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={handleTestReadyNotification}
                    className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 dark:hover:bg-purple-900/60 border border-purple-200 dark:border-purple-800 text-purple-900 dark:text-purple-200 text-xs font-bold flex flex-col items-center text-center space-y-1 active:scale-95 transition-all touch-manipulation"
                  >
                    <div className="p-1.5 bg-purple-600 text-white rounded-lg">
                      <Bell className="w-4 h-4" />
                    </div>
                    <span>🔔 Commande Prête</span>
                    <span className="text-[10px] text-purple-600 dark:text-purple-400 font-normal">Cloche restaurant + Vibreur</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleTestPreparationNotification}
                    className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 dark:hover:bg-amber-900/60 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs font-bold flex flex-col items-center text-center space-y-1 active:scale-95 transition-all touch-manipulation"
                  >
                    <div className="p-1.5 bg-amber-600 text-white rounded-lg">
                      <ChefHat className="w-4 h-4" />
                    </div>
                    <span>👨‍🍳 En Préparation</span>
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-normal">Carillon ascendant + Vibreur</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleTestPaymentNotification}
                    className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs font-bold flex flex-col items-center text-center space-y-1 active:scale-95 transition-all touch-manipulation"
                  >
                    <div className="p-1.5 bg-emerald-600 text-white rounded-lg">
                      <Coins className="w-4 h-4" />
                    </div>
                    <span>💰 Paiement Encaissé</span>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-normal">Double-ton caisse + Vibreur</span>
                  </button>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700/80 text-xs text-slate-700 dark:text-slate-300 space-y-1.5">
                <div className="flex items-center space-x-2 font-bold text-slate-900 dark:text-white">
                  <Smartphone className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span>Compatibilité Smartphone (Android & iPhone PWA)</span>
                </div>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-[11px]">
                  • <strong>Android :</strong> Les notifications s'affichent automatiquement dans la barre système.<br />
                  • <strong>iPhone / iOS (16.4+) :</strong> Ajoutez l'application à l'écran d'accueil (Bouton Partager Safari ➔ <i>Sur l'écran d'accueil</i>) pour recevoir les pushs en arrière-plan lorsque votre iPhone est verrouillé.
                </p>
              </div>
            </div>
          </div>

          {/* Card: Appareils Connectés & Routage des Notifications par ID */}
          <div className="bg-white dark:bg-slate-900 border-2 border-indigo-200 dark:border-indigo-800/80 rounded-3xl p-4 sm:p-6 shadow-sm space-y-5 transition-colors duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/30">
                  <Radio className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white flex items-center space-x-2">
                    <span>Appareils & Routage par ID</span>
                    <span className="text-[10px] bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full font-bold">
                      Tri par ID
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Identification unique de chaque terminal (ID Appareil) et ciblage précis des notifications par ID de profil
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={loadDevices}
                disabled={loadingDevices}
                className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl transition-all active:scale-95 text-xs font-bold flex items-center space-x-1.5"
                title="Actualiser la liste des appareils"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingDevices ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Actualiser</span>
              </button>
            </div>

            {/* 1. Mon Appareil Actuel */}
            <div className="bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/80 rounded-2xl p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center space-x-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-extrabold text-indigo-950 dark:text-indigo-200">Ce Terminal (Appareil Actuel)</span>
                    <div className="text-[10px] text-indigo-700 dark:text-indigo-300">
                      ID assigné automatiquement et conservé en mémoire locale
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="text-[11px] font-mono font-black bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 px-2.5 py-1 rounded-lg border border-indigo-200 dark:border-indigo-700 flex items-center space-x-1.5 shadow-xs">
                    <span>{myDeviceId}</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyDeviceId}
                    className="p-1.5 bg-white dark:bg-slate-900 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-lg border border-indigo-200 dark:border-indigo-700 text-xs transition-all active:scale-95"
                    title="Copier l'ID Appareil"
                  >
                    {copiedDeviceId ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
                {/* Friendly Name */}
                <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-indigo-100 dark:border-indigo-900/60 flex items-center justify-between">
                  <div className="truncate mr-2">
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">Nom de l'appareil</span>
                    {isEditingDeviceName ? (
                      <input
                        type="text"
                        value={tempDeviceName}
                        onChange={(e) => setTempDeviceName(e.target.value)}
                        className="mt-0.5 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg font-bold text-xs text-slate-900 dark:text-white outline-none border border-indigo-400 w-full"
                        placeholder="Ex: Caisse Principale, Tablette Cuisine"
                        autoFocus
                      />
                    ) : (
                      <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">{myDeviceName}</span>
                    )}
                  </div>
                  <div>
                    {isEditingDeviceName ? (
                      <button
                        type="button"
                        onClick={handleSaveDeviceName}
                        className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-[10px]"
                      >
                        Sauver
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setTempDeviceName(myDeviceName);
                          setIsEditingDeviceName(true);
                        }}
                        className="px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-[10px] font-bold"
                      >
                        Renommer
                      </button>
                    )}
                  </div>
                </div>

                {/* Bound Profile */}
                <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-indigo-100 dark:border-indigo-900/60">
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Profil Connecté sur cet appareil</span>
                  <div className="flex items-center space-x-1.5 mt-0.5 font-bold text-slate-800 dark:text-slate-200 text-xs">
                    <span className="font-mono bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 rounded text-[10px]">
                      {currentServeuse?.idServeuse || 'INVITÉ'}
                    </span>
                    <span>{currentServeuse?.nom || 'Non connecté'}</span>
                    <span className="text-[10px] text-slate-400 font-normal">({currentServeuse?.role || 'serveuse'})</span>
                  </div>
                </div>
              </div>

              {deviceSaveSuccess && (
                <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-bold flex items-center space-x-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Nom de l'appareil synchronisé avec le serveur.</span>
                </div>
              )}
            </div>

            {/* 2. Émetteur de Notifications Push Ciblées par ID */}
            <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-4 space-y-3">
              <div className="flex items-center space-x-2">
                <Send className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <h4 className="font-extrabold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
                  Tester l'envoi ciblé par ID de profil ou appareil
                </h4>
              </div>

              {targetedNotifFeedback && (
                <div className={`p-3 rounded-xl text-xs font-bold flex items-center justify-between ${
                  targetedNotifFeedback.type === 'success'
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800'
                    : 'bg-red-50 dark:bg-red-950/60 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800'
                }`}>
                  <span>{targetedNotifFeedback.text}</span>
                  <button onClick={() => setTargetedNotifFeedback(null)} className="font-mono font-bold text-sm ml-2">×</button>
                </div>
              )}

              <form onSubmit={handleSendTargetedPush} className="space-y-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {/* Type of Target */}
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">Cibler par :</label>
                    <select
                      value={targetType}
                      onChange={(e) => setTargetType(e.target.value as any)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-2 font-bold text-slate-800 dark:text-slate-200 outline-none focus:border-indigo-500"
                    >
                      <option value="profile">👤 Profil spécifique (par ID)</option>
                      <option value="device">📱 Appareil spécifique (par ID)</option>
                      <option value="role">👥 Rôle métier</option>
                      <option value="all">📢 Tous les appareils</option>
                    </select>
                  </div>

                  {/* Target Value based on Selection */}
                  <div className="sm:col-span-2">
                    <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">
                      {targetType === 'profile' && 'Sélectionner le Profil destinataire :'}
                      {targetType === 'device' && "Sélectionner l'Appareil destinataire :"}
                      {targetType === 'role' && 'Sélectionner le Rôle destinataire :'}
                      {targetType === 'all' && 'Diffusion globale :'}
                    </label>

                    {targetType === 'profile' && (
                      <select
                        value={selectedTargetProfile}
                        onChange={(e) => setSelectedTargetProfile(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-2 font-bold text-slate-800 dark:text-slate-200 outline-none focus:border-indigo-500 font-mono"
                      >
                        {allProfiles.map((p) => (
                          <option key={p.idServeuse} value={p.idServeuse}>
                            {p.idServeuse} • {p.nom} ({p.role})
                          </option>
                        ))}
                      </select>
                    )}

                    {targetType === 'device' && (
                      <select
                        value={selectedTargetDevice}
                        onChange={(e) => setSelectedTargetDevice(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-2 font-bold text-slate-800 dark:text-slate-200 outline-none focus:border-indigo-500 font-mono"
                      >
                        {registeredDevices.map((d) => (
                          <option key={d.idAppareil} value={d.idAppareil}>
                            {d.idAppareil} • {d.nomAppareil} ({d.nomProfil})
                          </option>
                        ))}
                        {registeredDevices.length === 0 && (
                          <option value={myDeviceId}>{myDeviceId} • Ce terminal</option>
                        )}
                      </select>
                    )}

                    {targetType === 'role' && (
                      <select
                        value={selectedTargetRole}
                        onChange={(e) => setSelectedTargetRole(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-2 font-bold text-slate-800 dark:text-slate-200 outline-none focus:border-indigo-500"
                      >
                        <option value="cuisine">👨‍🍳 Cuisine</option>
                        <option value="barman">🍹 Barman</option>
                        <option value="serveuse">🛎️ Serveuses</option>
                        <option value="caissier">💰 Caissier</option>
                        <option value="admin">👑 Administrateur</option>
                      </select>
                    )}

                    {targetType === 'all' && (
                      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-500 font-medium">
                        Diffusion à l'ensemble des {registeredDevices.length || 1} appareil(s) enregistrés.
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">Titre de la notif :</label>
                    <input
                      type="text"
                      value={customNotifTitle}
                      onChange={(e) => setCustomNotifTitle(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 font-medium text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                      placeholder="Ex: 🔔 Commande Table T-03 Prête"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">Message :</label>
                    <input
                      type="text"
                      value={customNotifBody}
                      onChange={(e) => setCustomNotifBody(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 font-medium text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                      placeholder="Ex: Vos plats sont prêts au passe-plat."
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSendingTargetedNotif}
                  className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-extrabold rounded-xl shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center space-x-2 active:scale-95 touch-manipulation"
                >
                  <Send className={`w-3.5 h-3.5 ${isSendingTargetedNotif ? 'animate-bounce' : ''}`} />
                  <span>{isSendingTargetedNotif ? 'Envoi en cours...' : 'Envoyer la Notification Push Ciblée'}</span>
                </button>
              </form>
            </div>

            {/* 3. Registre des Appareils Enregistrés (Triés par ID) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1.5 font-bold text-xs text-slate-800 dark:text-slate-200">
                  <Users className="w-4 h-4 text-indigo-600" />
                  <span>Terminaux & Téléphones Enregistrés ({registeredDevices.length})</span>
                  <span className="text-[10px] font-normal text-slate-400 font-mono">Triés par ID Appareil</span>
                </div>
              </div>

              {registeredDevices.length === 0 ? (
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700 text-center text-xs text-slate-500">
                  Aucun autre appareil enregistré pour le moment. Ouvrez OrderEase sur d'autres smartphones pour les voir apparaître automatiquement triés par ID.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {registeredDevices.map((dev) => {
                    const isCurrent = dev.idAppareil === myDeviceId;
                    return (
                      <div
                        key={dev.idAppareil}
                        className={`p-3.5 rounded-2xl border transition-all ${
                          isCurrent
                            ? 'bg-indigo-50/50 dark:bg-indigo-950/30 border-indigo-300 dark:border-indigo-700 shadow-xs'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center space-x-1.5">
                              <span className="font-mono font-black text-xs text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-900/60 px-2 py-0.5 rounded-md">
                                {dev.idAppareil}
                              </span>
                              {isCurrent && (
                                <span className="bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-extrabold px-1.5 py-0.2 rounded">
                                  Ce terminal
                                </span>
                              )}
                            </div>
                            <h5 className="font-extrabold text-xs text-slate-900 dark:text-white mt-1">
                              {dev.nomAppareil || 'Appareil POS'}
                            </h5>
                          </div>

                          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                            dev.hasPushSubscription || dev.subscription
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'
                          }`}>
                            {dev.hasPushSubscription || dev.subscription ? 'Push Actif' : 'En attente'}
                          </span>
                        </div>

                        <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
                          <div>
                            <span className="text-slate-400 block text-[9px] uppercase font-bold">Profil Associé</span>
                            <span className="font-bold text-slate-700 dark:text-slate-300">
                              <strong className="font-mono text-indigo-600 dark:text-indigo-400 mr-1">{dev.idProfil || 'GUEST'}</strong>
                              {dev.nomProfil || 'Non assigné'}
                            </span>
                          </div>

                          <div className="flex items-center space-x-1.5">
                            {dev.idProfil && dev.idProfil !== 'GUEST' && (
                              <button
                                type="button"
                                onClick={() => handleQuickTestToProfile(dev.idProfil, dev.nomProfil)}
                                className="px-2 py-1 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 text-indigo-700 dark:text-indigo-300 rounded-lg text-[10px] font-bold transition-all"
                                title="Envoyer notification test à ce profil"
                              >
                                Test Push
                              </button>
                            )}
                            {!isCurrent && (
                              <button
                                type="button"
                                onClick={() => handleDeleteDevice(dev.idAppareil)}
                                className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-red-50 dark:hover:bg-red-950/40 transition-all"
                                title="Supprimer ce terminal du registre"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          
              {/* Card: Changement du Code PIN */}
          {currentServeuse && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-6 shadow-xs space-y-4 transition-colors duration-200">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center space-x-2.5">
                  <div className="w-9 h-9 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800/80 text-red-600 dark:text-red-400 flex items-center justify-center">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">Modification de mon Code PIN</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Changer le code PIN d'accès pour <strong className="text-slate-800 dark:text-slate-200">{currentServeuse.nom}</strong> ({currentServeuse.idServeuse})</p>
                  </div>
                </div>
              </div>

              {pinStatusMsg && (
                <div className={`p-3 rounded-2xl text-xs font-bold flex items-center space-x-2 ${
                  pinStatusMsg.type === 'success'
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800'
                    : 'bg-red-50 dark:bg-red-950/50 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800'
                }`}>
                  {pinStatusMsg.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                  )}
                  <span>{pinStatusMsg.text}</span>
                </div>
              )}

              <form onSubmit={handleUpdatePin} className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Code PIN Actuel :</label>
                  <input
                    type="password"
                    required
                    maxLength={4}
                    placeholder="••••"
                    value={currentPin}
                    onChange={(e) => setCurrentPin(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-mono text-center tracking-widest text-base outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Nouveau PIN (4 chiffres) :</label>
                  <input
                    type="password"
                    required
                    maxLength={4}
                    placeholder="••••"
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-mono text-center tracking-widest text-base outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Confirmer Nouveau PIN :</label>
                  <input
                    type="password"
                    required
                    maxLength={4}
                    placeholder="••••"
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-mono text-center tracking-widest text-base outline-none focus:border-red-500"
                  />
                </div>

                <div className="sm:col-span-3 pt-1">
                  <button
                    type="submit"
                    disabled={isUpdatingPin || !currentPin || newPin.length < 4}
                    className="py-2.5 px-5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-md shadow-red-600/20 transition-all active:scale-95 touch-manipulation"
                  >
                    {isUpdatingPin ? 'Mise à jour en cours...' : 'Mettre à jour mon Code PIN'}
                  </button>
                </div>
              </form>
            </div>
          )}
          
          {/* Card: Gestion des Catégories de Produits */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-6 shadow-xs space-y-5 transition-colors duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800/80 text-red-600 dark:text-red-400 flex items-center justify-center">
                  <Tag className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">Gestion des Catégories de Produits</h3>
                    <span className="bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 font-bold text-[10px] uppercase px-2 py-0.5 rounded-full border border-red-200 dark:border-red-800">
                      {categoriesList.length} Catégories
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Ajoutez de nouvelles catégories et personnalisez le catalogue de vente</p>
                </div>
              </div>
            </div>

            {catStatusMsg && (
              <div className={`p-3 rounded-2xl text-xs font-bold flex items-center space-x-2 transition-all ${
                catStatusMsg.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800'
                  : 'bg-red-50 dark:bg-red-950/50 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800'
              }`}>
                {catStatusMsg.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                )}
                <span>{catStatusMsg.text}</span>
              </div>
            )}

            {/* Formulaire Création Nouvelle Catégorie */}
            <form onSubmit={handleCreateCategory} className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-4 space-y-4">
              <div className="flex items-center space-x-2 text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
                <FolderPlus className="w-4 h-4 text-red-600 dark:text-red-400" />
                <span>Créer une nouvelle catégorie</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                {/* Nom Catégorie */}
                <div className="sm:col-span-8">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Nom de la catégorie <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="ex: Pizzas, Vins Rouges, Chichas, Glaces..."
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white outline-none focus:border-red-500 font-medium"
                  />
                </div>

                {/* Emoji personnalisé */}
                <div className="sm:col-span-4">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Icône / Emoji
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      maxLength={4}
                      value={newCatEmoji}
                      onChange={(e) => setNewCatEmoji(e.target.value)}
                      className="w-14 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-2 text-lg text-slate-900 dark:text-white outline-none focus:border-red-500"
                    />
                    <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-2 flex items-center space-x-1.5 text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
                        {newCatEmoji || '🏷️'} {newCatName || 'Aperçu'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sélection Rapide d'Emojis */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1.5">
                  Suggestions d'icônes rapides :
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {EMOJI_PRESETS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setNewCatEmoji(emoji)}
                      className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm transition-all active:scale-90 ${
                        newCatEmoji === emoji
                          ? 'bg-red-600 text-white shadow-xs scale-110'
                          : 'bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-1 flex justify-end">
                <button
                  type="submit"
                  disabled={isCreatingCat || !newCatName.trim()}
                  className="w-full sm:w-auto px-5 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-md shadow-red-600/20 transition-all flex items-center justify-center space-x-2 active:scale-95 touch-manipulation"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isCreatingCat ? 'Ajout en cours...' : 'Ajouter la Catégorie'}</span>
                </button>
              </div>
            </form>

            {/* Liste des catégories existantes */}
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Catégories Actives ({categoriesList.length})
                </label>
                <span className="text-[11px] text-slate-400">
                  Visibles dans la prise de commande et le catalogue
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {categoriesList.map((cat) => {
                  const articleCount = articles.filter(
                    (a) => a.categorie?.toLowerCase() === cat.nom.toLowerCase()
                  ).length;

                  return (
                    <div
                      key={cat.idCategorie || cat.nom}
                      className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-3 flex items-center justify-between transition-all hover:border-red-300 dark:hover:border-red-900/60"
                    >
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-lg shrink-0 shadow-2xs">
                          {cat.emoji || '🏷️'}
                        </div>
                        <div className="min-w-0">
                          <div className="font-extrabold text-xs text-slate-900 dark:text-white truncate">
                            {cat.nom}
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400">
                            {articleCount} {articleCount > 1 ? 'articles' : 'article'}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setCatToDelete(cat)}
                        title={`Supprimer la catégorie ${cat.nom}`}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Card: Devise d'affichage */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-6 shadow-xs space-y-4 transition-colors duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Coins className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">Paramétrage de la Devise</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Choisissez le symbole ou le code monétaire affiché sur tous les tarifs</p>
                </div>
              </div>

              {currencySavedMessage && (
                <div className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1 rounded-xl text-xs font-bold flex items-center space-x-1.5 animate-fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Devise appliquée !</span>
                </div>
              )}
            </div>

            {/* Presets Grid */}
            <div>
              <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2.5">
                Devises Prédéfinies
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {PRESET_CURRENCIES.map((curr) => {
                  const isSelected = selectedCurrency === curr.code;
                  return (
                    <button
                      key={curr.code}
                      onClick={() => handleApplyCurrency(curr.code)}
                      className={`p-3 rounded-2xl border text-left transition-all touch-manipulation active:scale-95 ${
                        isSelected
                          ? 'bg-red-50/80 dark:bg-red-950/60 border-red-500 ring-2 ring-red-500/20 shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700/80 text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`font-black text-sm font-mono ${isSelected ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-white'}`}>
                          {curr.code}
                        </span>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-red-600 dark:text-red-400" />}
                      </div>
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200">{curr.name}</div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">{curr.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Currency Form */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                Devise Personnalisée
              </label>
              <form onSubmit={handleCustomCurrencySubmit} className="flex gap-2">
                <input
                  type="text"
                  placeholder="ex: MAD, DZD, CHF, £, GNF..."
                  value={customCurrency}
                  onChange={(e) => setCustomCurrency(e.target.value)}
                  className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white outline-none focus:border-red-500"
                />
                <button
                  type="submit"
                  disabled={!customCurrency.trim()}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all touch-manipulation active:scale-95 whitespace-nowrap"
                >
                  Appliquer
                </button>
              </form>
            </div>

            {/* Live Preview Card */}
            <div className="bg-slate-900 dark:bg-slate-950 text-slate-100 p-4 rounded-2xl border border-slate-800 space-y-2 mt-4">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>Aperçu en Direct dans l'Interface</span>
                <span className="text-red-400 font-mono text-xs">{selectedCurrency}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/50">
                  <div className="text-[10px] text-slate-400">Prix unitaire</div>
                  <div className="text-sm font-black text-emerald-400 mt-0.5">{formatPrice(1500, selectedCurrency)}</div>
                </div>
                <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/50">
                  <div className="text-[10px] text-slate-400">Total Commande</div>
                  <div className="text-sm font-black text-red-400 mt-0.5">{formatPrice(12500, selectedCurrency)}</div>
                </div>
                <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/50">
                  <div className="text-[10px] text-slate-400">Chiffre d'Affaires</div>
                  <div className="text-sm font-black text-amber-400 mt-0.5">{formatPrice(185000, selectedCurrency)}</div>
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* Right 1 Col: Sensitive Zone (Actions Administrateur) */}
        <div className="space-y-5">
          <div className="bg-white dark:bg-slate-900 border-2 border-red-200 dark:border-red-900/60 rounded-3xl p-4 sm:p-5 shadow-xs space-y-4 relative overflow-hidden transition-colors duration-200">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <ShieldAlert className="w-32 h-32 text-red-600" />
            </div>

            <div className="flex items-center space-x-2.5 border-b border-red-100 dark:border-red-950/60 pb-3">
              <div className="w-9 h-9 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm sm:text-base text-red-950 dark:text-red-200">Zone Sensible Administrateur</h3>
                <p className="text-[11px] text-red-600/80 dark:text-red-400/80">Réinitialisation et gestion des données de caisse</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Ces commandes permettent d'effectuer des opérations irréversibles de nettoyage de la base de données.
            </p>

            <div className="space-y-2.5 pt-1">
              <button
                onClick={() => setIsResetModalOpen(true)}
                className="w-full p-3 bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs rounded-2xl shadow-sm transition-all flex items-center justify-center space-x-2 touch-manipulation active:scale-95"
              >
                <Trash2 className="w-4 h-4" />
                <span>Vider l'Application / Réinitialiser</span>
              </button>
            </div>

            <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 p-3 rounded-2xl text-[11px] text-amber-900 dark:text-amber-200 space-y-1">
              <div className="font-bold flex items-center space-x-1 text-amber-800 dark:text-amber-300">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>Attention</span>
              </div>
              <p className="text-amber-700 dark:text-amber-300/80">
                Les actions de vidage effacent immédiatement les enregistrements de la base de données de la caisse.
              </p>
            </div>
          </div>
        </div>

      </div>

      {/* Section Déconnexion au bas de la page des paramètres */}
      <div className="bg-white dark:bg-slate-900 border-2 border-red-200/80 dark:border-red-900/60 rounded-3xl p-4 sm:p-6 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4 transition-colors duration-200">
        <div className="flex items-center space-x-3.5 text-left w-full sm:w-auto">
          <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
            <LogOut className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">Session Administrateur & Caisse</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Connecté en tant que <span className="font-bold text-slate-800 dark:text-slate-200">{currentServeuse?.nom || 'Utilisateur'}</span>. Se déconnecter vous redirigera vers l'écran de connexion.
            </p>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="w-full sm:w-auto px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs sm:text-sm rounded-2xl shadow-md shadow-red-600/20 transition-all flex items-center justify-center space-x-2 touch-manipulation active:scale-95 shrink-0"
        >
          <LogOut className="w-4 h-4" />
          <span>Se Déconnecter</span>
        </button>
      </div>

      {/* Category Delete Confirmation Modal */}
      {catToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative text-slate-800 dark:text-slate-100">
            <button
              onClick={() => setCatToDelete(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              ✕
            </button>

            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 flex items-center justify-center text-red-600 shrink-0 text-xl">
                {catToDelete.emoji || '🏷️'}
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                  Supprimer la catégorie ?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {catToDelete.nom}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-5">
              Êtes-vous sûr de vouloir supprimer la catégorie <strong className="text-slate-900 dark:text-white">{catToDelete.nom}</strong> ?
              {articles.filter(a => a.categorie?.toLowerCase() === catToDelete.nom.toLowerCase()).length > 0 && (
                <span className="block mt-2 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-[11px] font-bold">
                  ⚠️ Attention : {articles.filter(a => a.categorie?.toLowerCase() === catToDelete.nom.toLowerCase()).length} article(s) utilisent actuellement cette catégorie.
                </span>
              )}
            </p>

            <div className="flex items-center justify-end space-x-2.5">
              <button
                type="button"
                onClick={() => setCatToDelete(null)}
                disabled={isDeletingCat}
                className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition-all"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteCategory}
                disabled={isDeletingCat}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-extrabold rounded-xl shadow-md shadow-red-600/20 transition-all flex items-center space-x-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeletingCat ? 'Suppression...' : 'Confirmer la suppression'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sensitive Clear / Reset Modal */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative text-slate-100">
            <button
              onClick={() => setIsResetModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 p-2 rounded-full hover:bg-slate-800"
            >
              ✕
            </button>

            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-lg text-white">Vider l'application / Réinitialiser</h3>
                <p className="text-xs text-slate-400">Sélectionnez l'action de nettoyage de base de données</p>
              </div>
            </div>

            {loadingAction && (
              <div className="bg-red-950/80 border border-red-700 text-red-100 p-3 rounded-xl text-xs font-bold flex items-center space-x-2 animate-pulse mb-3">
                <RefreshCw className="w-4 h-4 text-red-300 animate-spin" />
                <span>Opération en cours sur la base de données...</span>
              </div>
            )}

            <div className="space-y-3 mb-6">
              <button
                disabled={loadingAction}
                onClick={() => handleClearScope('commandes')}
                className="w-full text-left p-3.5 bg-slate-800/80 hover:bg-slate-800 border border-slate-700 rounded-2xl transition-all group flex items-start space-x-3"
              >
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 mt-0.5">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white group-hover:text-amber-300">Vider uniquement les commandes</div>
                  <p className="text-[11px] text-slate-400">Efface tout l'historique des commandes et remet à zéro le chiffre d'affaires des serveuses.</p>
                </div>
              </button>

              <button
                disabled={loadingAction}
                onClick={() => handleClearScope('articles')}
                className="w-full text-left p-3.5 bg-slate-800/80 hover:bg-slate-800 border border-slate-700 rounded-2xl transition-all group flex items-start space-x-3"
              >
                <div className="p-2 rounded-xl bg-orange-500/10 text-orange-400 mt-0.5">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white group-hover:text-orange-300">Vider le catalogue d'articles</div>
                  <p className="text-[11px] text-slate-400">Supprime tous les articles du stock pour commencer avec un catalogue totalement vierge.</p>
                </div>
              </button>

              <button
                disabled={loadingAction}
                onClick={() => handleClearScope('tout')}
                className="w-full text-left p-3.5 bg-red-950/40 hover:bg-red-900/40 border border-red-800/60 rounded-2xl transition-all group flex items-start space-x-3"
              >
                <div className="p-2 rounded-xl bg-red-500/20 text-red-400 mt-0.5">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-red-200 group-hover:text-red-100">Vider TOUT (Reset complet)</div>
                  <p className="text-[11px] text-red-300/80">Efface tous les articles et toutes les commandes pour une application totalement vide.</p>
                </div>
              </button>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setIsResetModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

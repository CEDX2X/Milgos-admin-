import React, { useState, useEffect } from 'react';
import { Article, CategorieArticle, Serveuse, ArticleCommande, ModePaiement, Categorie } from '../types';
import { 
  Search, Plus, Minus, Trash2, ShoppingBag, CheckCircle, AlertTriangle, 
  CreditCard, Banknote, Ticket, FileText, Sparkles, ArrowRight, ArrowLeft, 
  X, MapPin, ChefHat, Check, UtensilsCrossed 
} from 'lucide-react';
import { formatPrice } from '../utils/format';
import { ConfirmModal } from './ConfirmModal';
import { posApi } from '../services/api';

interface OrderTakingViewProps {
  articles: Article[];
  categories?: Categorie[];
  currentServeuse: Serveuse | null;
  onValidateOrder: (orderData: {
    idServeuse: string;
    nomServeuse: string;
    table: string;
    articles: { idArticle: string; nom: string; prixUnitaire: number; quantite: number; notes?: string }[];
    modePaiement: ModePaiement;
    notesServeuse: string;
  }) => Promise<{ success: boolean; message?: string; errors?: string[] }>;
  onOpenLogin: () => void;
}

const DEFAULT_CATEGORIES: (CategorieArticle | 'Toutes')[] = [
  'Toutes',
  'Cocktails',
  'Boissons',
  'Entrées',
  'Plats',
  'Desserts',
  'Snacks'
];

const PRESET_TABLES = [
  'Table 01', 'Table 02', 'Table 03', 'Table 04', 'Table 05',
  'Bar Central', 'Terrasse 1', 'Terrasse 2', 'Espace VIP 1', 'Buffet'
];

export const OrderTakingView: React.FC<OrderTakingViewProps> = ({
  articles,
  categories = [],
  currentServeuse,
  onValidateOrder,
  onOpenLogin
}) => {
  // Stepper State: 1 = Choix Table, 2 = Produits, 3 = Envoi Cuisine
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  const [selectedCategory, setSelectedCategory] = useState<string>('Toutes');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Cart state
  const [cartItems, setCartItems] = useState<ArticleCommande[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>('Table 01');
  const [customTableInput, setCustomTableInput] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<ModePaiement>('Non payé');
  const [notesServeuse, setNotesServeuse] = useState<string>('');

  // Status feedback
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Modal confirmation states
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState<boolean>(false);
  const [isClearCartModalOpen, setIsClearCartModalOpen] = useState<boolean>(false);

  // Dynamic table management state
  const [tables, setTables] = useState<string[]>(PRESET_TABLES);
  const [tableToDelete, setTableToDelete] = useState<string | null>(null);
  const [isAddTableModalOpen, setIsAddTableModalOpen] = useState<boolean>(false);
  const [newTableName, setNewTableName] = useState<string>('');
  const [addTableError, setAddTableError] = useState<string>('');

  useEffect(() => {
    let isMounted = true;
    posApi.getTables().then((tableList) => {
      if (isMounted && tableList && tableList.length > 0) {
        setTables(tableList);
      }
    }).catch(err => console.error("Error loading tables from API database", err));
    return () => { isMounted = false; };
  }, []);

  const effectiveTable = customTableInput.trim() || selectedTable || 'Table 01';

  const handleAddTableSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newTableName.trim();
    if (!trimmed) {
      setAddTableError('Veuillez entrer un nom de table.');
      return;
    }
    if (tables.some(t => t.toLowerCase() === trimmed.toLowerCase())) {
      setAddTableError('Cette table existe déjà dans la liste.');
      return;
    }

    try {
      await posApi.createTable(trimmed);
      const updatedTables = await posApi.getTables();
      setTables(updatedTables);
      setSelectedTable(trimmed);
      setCustomTableInput('');
      setIsAddTableModalOpen(false);
      setNewTableName('');
      setAddTableError('');
    } catch (err: any) {
      setAddTableError(err.message || 'Erreur lors de la création de la table.');
    }
  };

  const handleConfirmDeleteTable = async () => {
    if (!tableToDelete) return;
    try {
      await posApi.deleteTable(tableToDelete);
      const updatedTables = await posApi.getTables();
      setTables(updatedTables);
      if (selectedTable === tableToDelete) {
        setSelectedTable(updatedTables.length > 0 ? updatedTables[0] : '');
      }
    } catch (err: any) {
      console.error('Erreur suppression table:', err);
    } finally {
      setTableToDelete(null);
    }
  };

  // Dynamic categories list with emoji
  const displayCategories: { nom: string; emoji?: string }[] = React.useMemo(() => {
    const list: { nom: string; emoji?: string }[] = [{ nom: 'Toutes', emoji: '✨' }];
    if (categories && categories.length > 0) {
      categories.forEach(c => list.push({ nom: c.nom, emoji: c.emoji }));
    } else {
      DEFAULT_CATEGORIES.filter(c => c !== 'Toutes').forEach(c => list.push({ nom: c, emoji: '🏷️' }));
    }
    // Also include any categories found in articles not in the list
    articles.forEach(a => {
      if (a.categorie && !list.some(l => l.nom.toLowerCase() === a.categorie.toLowerCase())) {
        list.push({ nom: a.categorie, emoji: '🏷️' });
      }
    });
    return list;
  }, [categories, articles]);

  // Filter articles
  const filteredArticles = articles.filter((art) => {
    const matchesCat = selectedCategory === 'Toutes' || (art.categorie && art.categorie.toLowerCase() === selectedCategory.toLowerCase());
    const matchesSearch = art.nom.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          art.idArticle.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  // Add item to cart with stock validation check
  const handleAddToCart = (article: Article) => {
    if (!article.actif || article.stock <= 0) return;

    setCartItems((prev) => {
      const existing = prev.find((item) => item.idArticle === article.idArticle);
      const currentQty = existing ? existing.quantite : 0;

      if (currentQty >= article.stock) {
        setNotification({
          type: 'error',
          msg: `Stock maximal atteint pour '${article.nom}' : ${article.stock}`
        });
        setTimeout(() => setNotification(null), 3000);
        return prev;
      }

      if (existing) {
        return prev.map((item) =>
          item.idArticle === article.idArticle
            ? { ...item, quantite: item.quantite + 1, sousTotal: (item.quantite + 1) * item.prixUnitaire }
            : item
        );
      }
      return [
        ...prev,
        {
          idArticle: article.idArticle,
          nom: article.nom,
          prixUnitaire: article.prix,
          quantite: 1,
          sousTotal: article.prix
        }
      ];
    });
  };

  const handleUpdateQuantity = (idArticle: string, delta: number) => {
    setCartItems((prev) => {
      return prev.map((item) => {
        if (item.idArticle === idArticle) {
          const articleObj = articles.find((a) => a.idArticle === idArticle);
          const maxStock = articleObj ? articleObj.stock : 999;
          const newQty = item.quantite + delta;

          if (newQty > maxStock) {
            setNotification({
              type: 'error',
              msg: `Alerte Stock : Limite de ${maxStock} unité(s) atteinte pour ${item.nom}.`
            });
            setTimeout(() => setNotification(null), 2500);
            return item;
          }

          if (newQty <= 0) return null as any;

          return {
            ...item,
            quantite: newQty,
            sousTotal: Math.round(newQty * item.prixUnitaire)
          };
        }
        return item;
      }).filter(Boolean);
    });
  };

  const handleRemoveItem = (idArticle: string) => {
    setCartItems((prev) => prev.filter((item) => item.idArticle !== idArticle));
  };

  const executeClearCart = () => {
    setCartItems([]);
    setNotesServeuse('');
    setIsClearCartModalOpen(false);
  };

  const totalCartAmount = cartItems.reduce((sum, item) => sum + item.sousTotal, 0);
  const totalCartQuantity = cartItems.reduce((acc, i) => acc + i.quantite, 0);

  const executeOrderSubmission = async () => {
    if (!currentServeuse) {
      onOpenLogin();
      return;
    }

    if (cartItems.length === 0) {
      setNotification({ type: 'error', msg: 'Veuillez ajouter au moins un produit.' });
      setTimeout(() => setNotification(null), 3000);
      return;
    }

    setIsSubmitting(true);
    setNotification(null);

    const result = await onValidateOrder({
      idServeuse: currentServeuse.idServeuse,
      nomServeuse: currentServeuse.nom,
      table: effectiveTable,
      articles: cartItems.map(i => ({
        idArticle: i.idArticle,
        nom: i.nom,
        prixUnitaire: i.prixUnitaire,
        quantite: i.quantite,
        notes: i.notes || ''
      })),
      modePaiement: paymentMethod,
      notesServeuse
    });

    setIsSubmitting(false);
    setIsConfirmModalOpen(false);

    if (result.success) {
      setNotification({
        type: 'success',
        msg: `✅ Commande ${result.message || 'transmise avec succès'} en cuisine !`
      });
      executeClearCart();
      setCurrentStep(1); // Reset to Step 1 for next order
      setTimeout(() => setNotification(null), 4000);
    } else {
      setNotification({
        type: 'error',
        msg: `❌ Erreur : ${result.message || 'Échec de la commande'}. ${result.errors?.join(' ')}`
      });
    }
  };

  return (
    <div className="w-full min-h-full flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 relative transition-colors duration-200">
      
      {/* ================= STEPPER HEADER ================= */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-3 py-3 sm:px-6 shadow-xs sticky top-0 z-20">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          
          {/* Stepper Navigation */}
          <div className="flex items-center space-x-2 sm:space-x-4 w-full justify-between sm:justify-start">
            
            {/* STEP 1: Sélection Table */}
            <button
              onClick={() => setCurrentStep(1)}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl transition-all touch-manipulation group ${
                currentStep === 1
                  ? 'bg-red-50 dark:bg-red-950/80 text-red-600 dark:text-red-400 font-extrabold border border-red-200 dark:border-red-800 shadow-2xs'
                  : currentStep > 1
                  ? 'text-emerald-700 dark:text-emerald-400 font-bold hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                  : 'text-slate-500 dark:text-slate-400 font-medium hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs transition-all ${
                  currentStep === 1
                    ? 'bg-red-600 text-white shadow-md shadow-red-600/30 scale-105'
                    : currentStep > 1
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                {currentStep > 1 ? <Check className="w-4 h-4 stroke-[3]" /> : '1'}
              </div>
              <div className="text-left hidden xs:block">
                <span className="text-[10px] uppercase tracking-wider block opacity-75 font-semibold">Étape 1</span>
                <span className="text-xs sm:text-sm truncate">Sélection Table</span>
              </div>
            </button>

            <div className={`h-0.5 flex-1 max-w-[2.5rem] sm:max-w-[4rem] rounded-full transition-colors ${
              currentStep > 1 ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-800'
            }`} />

            {/* STEP 2: Choix Produits */}
            <button
              onClick={() => {
                if (!effectiveTable) {
                  setNotification({ type: 'error', msg: 'Veuillez d’abord choisir une table.' });
                  setTimeout(() => setNotification(null), 2500);
                  return;
                }
                setCurrentStep(2);
              }}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl transition-all touch-manipulation relative group ${
                currentStep === 2
                  ? 'bg-red-50 dark:bg-red-950/80 text-red-600 dark:text-red-400 font-extrabold border border-red-200 dark:border-red-800 shadow-2xs'
                  : currentStep > 2
                  ? 'text-emerald-700 dark:text-emerald-400 font-bold hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                  : 'text-slate-500 dark:text-slate-400 font-medium hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs transition-all relative ${
                  currentStep === 2
                    ? 'bg-red-600 text-white shadow-md shadow-red-600/30 scale-105'
                    : currentStep > 2
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                {currentStep > 2 ? <Check className="w-4 h-4 stroke-[3]" /> : '2'}
                {totalCartQuantity > 0 && currentStep !== 2 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900">
                    {totalCartQuantity}
                  </span>
                )}
              </div>
              <div className="text-left hidden xs:block">
                <span className="text-[10px] uppercase tracking-wider block opacity-75 font-semibold">Étape 2</span>
                <span className="text-xs sm:text-sm truncate">
                  Choix Produits {totalCartQuantity > 0 && `(${totalCartQuantity})`}
                </span>
              </div>
            </button>

            <div className={`h-0.5 flex-1 max-w-[2.5rem] sm:max-w-[4rem] rounded-full transition-colors ${
              currentStep > 2 ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-800'
            }`} />

            {/* STEP 3: Confirmation et Envoi */}
            <button
              onClick={() => {
                if (cartItems.length === 0) {
                  setNotification({ type: 'error', msg: 'Veuillez ajouter des produits au panier pour l’envoi en cuisine.' });
                  setTimeout(() => setNotification(null), 2500);
                  return;
                }
                setCurrentStep(3);
              }}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl transition-all touch-manipulation group ${
                currentStep === 3
                  ? 'bg-red-50 dark:bg-red-950/80 text-red-600 dark:text-red-400 font-extrabold border border-red-200 dark:border-red-800 shadow-2xs'
                  : 'text-slate-500 dark:text-slate-400 font-medium hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs transition-all ${
                  currentStep === 3
                    ? 'bg-red-600 text-white shadow-md shadow-red-600/30 scale-105'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                3
              </div>
              <div className="text-left hidden xs:block">
                <span className="text-[10px] uppercase tracking-wider block opacity-75 font-semibold">Étape 3</span>
                <span className="text-xs sm:text-sm truncate">Confirmation & Envoi</span>
              </div>
            </button>

          </div>

          {/* Table summary badge on top right */}
          <div className="hidden lg:flex items-center space-x-2 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800/80 px-3 py-1.5 rounded-xl text-xs font-extrabold text-red-700 dark:text-red-300 shrink-0">
            <MapPin className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
            <span>{effectiveTable}</span>
          </div>

        </div>
      </div>

      {/* Global Notifications */}
      {notification && (
        <div className="p-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
          <div
            className={`max-w-4xl mx-auto p-3 rounded-xl border text-xs font-bold flex items-center space-x-2 shadow-sm ${
              notification.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                : 'bg-red-50 dark:bg-red-950/60 border-red-300 dark:border-red-800 text-red-900 dark:text-red-200'
            }`}
          >
            {notification.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
            )}
            <span className="flex-1">{notification.msg}</span>
          </div>
        </div>
      )}

      {/* ================= STEP 1 CONTENT: CHOISIR LA TABLE ================= */}
      {currentStep === 1 && (
        <div className="max-w-4xl mx-auto w-full p-4 sm:p-6 space-y-6 flex-1">
          <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="px-2.5 py-1 bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 text-xs font-extrabold rounded-lg">
                    1 / 3
                  </span>
                  <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                    Choisir la Table
                  </h2>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Sélectionnez la table ou l'emplacement où servira la commande.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setNewTableName(`Table ${tables.length + 1}`);
                  setAddTableError('');
                  setIsAddTableModalOpen(true);
                }}
                className="px-3.5 py-2 rounded-xl bg-red-50 dark:bg-red-950/60 hover:bg-red-100 dark:hover:bg-red-900/80 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 text-xs font-bold flex items-center justify-center space-x-1.5 transition-all touch-manipulation active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Ajouter une table</span>
              </button>
            </div>

            {/* Table Selection Grid */}
            <div className="grid grid-cols-2 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {tables.map((tbl) => {
                const isSelected = selectedTable === tbl && !customTableInput;
                return (
                  <div
                    key={tbl}
                    onClick={() => {
                      setSelectedTable(tbl);
                      setCustomTableInput('');
                    }}
                    className={`relative p-4 rounded-2xl border flex flex-col items-center justify-center space-y-2 cursor-pointer transition-all touch-manipulation select-none ${
                      isSelected
                        ? 'bg-red-600 border-red-600 text-white shadow-lg shadow-red-600/20 scale-102 ring-2 ring-red-400'
                        : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/80 text-slate-800 dark:text-slate-200 hover:border-red-300 dark:hover:border-red-700 hover:bg-white dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                      isSelected
                        ? 'bg-white/20 text-white'
                        : 'bg-red-50 dark:bg-red-950/80 text-red-600 dark:text-red-400'
                    }`}>
                      <MapPin className="w-5 h-5" />
                    </div>
                    <span className="font-extrabold text-sm text-center line-clamp-1">{tbl}</span>
                    
                    {/* Delete cross */}
                    <button
                      type="button"
                      title={`Supprimer ${tbl}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setTableToDelete(tbl);
                      }}
                      className={`absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                        isSelected
                          ? 'bg-red-700 hover:bg-black text-red-100 hover:text-white'
                          : 'bg-slate-200 dark:bg-slate-700 hover:bg-red-500 text-slate-400 dark:text-slate-300 hover:text-white'
                      }`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Custom table input */}
            <div className="pt-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Ou saisir un nom de table / emplacement spécifique :
              </label>
              <input
                type="text"
                placeholder="Exemple: Terrasse VIP 03, Bar Comptoir..."
                value={customTableInput}
                onChange={(e) => setCustomTableInput(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100 dark:focus:ring-red-900/40"
              />
            </div>

            {/* Table Selected Status & Action */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                Table sélectionnée : <strong className="text-red-600 dark:text-red-400 text-sm font-black">{effectiveTable}</strong>
              </div>

              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="w-full sm:w-auto px-6 py-3.5 bg-red-600 hover:bg-red-700 text-white font-extrabold text-sm rounded-xl shadow-md shadow-red-600/30 flex items-center justify-center space-x-2 transition-all touch-manipulation active:scale-95"
              >
                <span>Suivant : Choisir les Produits</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ================= STEP 2 CONTENT: CHOISIR DES PRODUITS EN STOCK / MENU ================= */}
      {currentStep === 2 && (
        <div className="flex-1 flex flex-col lg:flex-row max-w-7xl mx-auto w-full p-3 sm:p-5 gap-4">
          
          {/* CATALOG SECTION */}
          <div className="flex-1 flex flex-col space-y-3">
            
            {/* Search & Category Filter Bar */}
            <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2.5">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400 dark:text-slate-500" />
                  <input
                    type="text"
                    placeholder="Rechercher un produit au menu ou en stock..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-red-500 focus:ring-2 focus:ring-red-100 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 outline-none"
                  />
                </div>
                
                {/* Category Filter Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
                  {displayCategories.map((cat) => (
                    <button
                      key={cat.nom}
                      onClick={() => setSelectedCategory(cat.nom)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center space-x-1.5 touch-manipulation ${
                        selectedCategory.toLowerCase() === cat.nom.toLowerCase()
                          ? 'bg-red-600 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {cat.emoji && <span className="text-sm">{cat.emoji}</span>}
                      <span>{cat.nom}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Product Cards Grid */}
            <div className="grid grid-cols-2 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 sm:gap-3.5">
              {filteredArticles.map((article) => {
                const isOutOfStock = article.stock <= 0;
                const isLowStock = article.stock > 0 && article.stock <= 5;
                const cartItem = cartItems.find((i) => i.idArticle === article.idArticle);
                const qtyInCart = cartItem ? cartItem.quantite : 0;

                return (
                  <div
                    key={article.idArticle}
                    onClick={() => !isOutOfStock && handleAddToCart(article)}
                    className={`bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-3 flex flex-col justify-between group transition-all touch-manipulation select-none cursor-pointer shadow-xs hover:shadow-md relative ${
                      isOutOfStock
                        ? 'opacity-60 pointer-events-none'
                        : qtyInCart > 0
                        ? 'ring-2 ring-red-500 border-red-500 shadow-sm'
                        : 'active:scale-98 active:ring-2 active:ring-red-500'
                    }`}
                  >
                    {/* Quantity badge in cart */}
                    {qtyInCart > 0 && (
                      <div className="absolute -top-2 -right-2 bg-red-600 text-white font-black text-xs w-6 h-6 rounded-full flex items-center justify-center shadow-lg border-2 border-white dark:border-slate-900 z-10 animate-pulse">
                        {qtyInCart}
                      </div>
                    )}

                    {/* Card Top / Image Area */}
                    <div className="w-full aspect-[4/3] bg-slate-100 dark:bg-slate-800/80 rounded-xl mb-2 relative flex items-center justify-center overflow-hidden border border-slate-100 dark:border-slate-800">
                      {article.image ? (
                        <img 
                          src={article.image} 
                          alt={article.nom} 
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                            const parent = (e.target as HTMLElement).parentElement;
                            if (parent) {
                              const fallbackSpan = document.createElement('span');
                              fallbackSpan.className = 'text-3xl';
                              fallbackSpan.innerText = article.emoji || '🍗';
                              parent.appendChild(fallbackSpan);
                            }
                          }}
                        />
                      ) : (
                        <span className="text-3xl group-hover:scale-110 transition-transform">{article.emoji || '🍗'}</span>
                      )}

                      {/* Stock Pill top right */}
                      {isOutOfStock ? (
                        <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 bg-red-600/90 text-white text-[9px] font-bold rounded uppercase tracking-wide">
                          Épuisé
                        </span>
                      ) : (
                        <span className={`absolute top-1.5 right-1.5 px-1.5 py-0.5 text-white text-[9px] font-bold rounded uppercase tracking-wide ${
                          isLowStock ? 'bg-amber-500/90' : 'bg-emerald-600/90'
                        }`}>
                          Stock: {article.stock}
                        </span>
                      )}
                    </div>

                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white line-clamp-2 leading-snug">
                          {article.nom}
                        </h3>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-tight font-semibold mt-0.5">
                          {article.categorie}
                        </p>
                      </div>

                      <div className="flex justify-between items-end mt-2">
                        <span className="text-red-600 dark:text-red-400 font-extrabold text-xs sm:text-sm leading-none">
                          {formatPrice(article.prix)}
                        </span>
                        <button 
                          type="button" 
                          className={`p-1.5 rounded-lg text-xs font-bold transition-colors shrink-0 ${
                            isOutOfStock 
                              ? 'bg-slate-100 dark:bg-slate-800 text-slate-400' 
                              : 'bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 group-hover:bg-red-600 group-hover:text-white'
                          }`}
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          </div>

          {/* CART SUMMARY SIDEBAR FOR STEP 2 */}
          <div className="w-full lg:w-80 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col space-y-3 shrink-0">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
              <div>
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">Panier Commande</h3>
                <p className="text-[10px] text-red-600 dark:text-red-400 font-bold">
                  Table : {effectiveTable}
                </p>
              </div>
              {cartItems.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsClearCartModalOpen(true)}
                  className="p-1.5 text-red-500 hover:text-red-700 text-xs font-bold flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Vider</span>
                </button>
              )}
            </div>

            {/* Cart list items */}
            <div className="flex-1 overflow-y-auto space-y-2 max-h-64 lg:max-h-none min-h-[120px]">
              {cartItems.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-4 text-slate-400">
                  <ShoppingBag className="w-8 h-8 text-slate-300 dark:text-slate-700 mb-2" />
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-400">Aucun produit au panier</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Cliquez sur les articles pour les ajouter</p>
                </div>
              ) : (
                cartItems.map((item) => (
                  <div key={item.idArticle} className="p-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/80 flex justify-between items-center text-xs">
                    <div className="min-w-0 pr-2">
                      <p className="font-bold text-slate-900 dark:text-white truncate">{item.nom}</p>
                      <p className="text-[10px] text-slate-400">{formatPrice(item.prixUnitaire)} x {item.quantite}</p>
                    </div>
                    <div className="flex items-center space-x-1.5 shrink-0">
                      <span className="font-extrabold text-red-600 dark:text-red-400 text-xs">{formatPrice(item.sousTotal)}</span>
                      <button
                        type="button"
                        onClick={() => handleUpdateQuantity(item.idArticle, -1)}
                        className="w-5 h-5 rounded bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold flex items-center justify-center"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateQuantity(item.idArticle, 1)}
                        className="w-5 h-5 rounded bg-red-600 text-white font-bold flex items-center justify-center"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Total and Step Navigation */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
              <div className="flex justify-between items-center text-base font-black">
                <span>Total :</span>
                <span className="text-red-600 dark:text-red-400">{formatPrice(totalCartAmount)}</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl flex items-center justify-center space-x-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Table</span>
                </button>

                <button
                  type="button"
                  disabled={cartItems.length === 0}
                  onClick={() => setCurrentStep(3)}
                  className="px-3 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white font-bold text-xs rounded-xl flex items-center justify-center space-x-1 shadow-md shadow-red-600/20"
                >
                  <span>Cuisine</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ================= STEP 3 CONTENT: ENVOYER EN CUISINE ================= */}
      {currentStep === 3 && (
        <div className="max-w-3xl mx-auto w-full p-4 sm:p-6 space-y-5 flex-1">
          <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
            
            <div className="flex items-center space-x-2 border-b border-slate-100 dark:border-slate-800 pb-4">
              <span className="px-2.5 py-1 bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 text-xs font-extrabold rounded-lg">
                3 / 3
              </span>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                Récapitulatif & Envoi en Cuisine
              </h2>
            </div>

            {/* Summary Details Box */}
            <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="flex justify-between items-center text-xs font-semibold">
                <span className="text-slate-500 dark:text-slate-400">Emplacement / Table :</span>
                <span className="text-red-600 dark:text-red-400 font-extrabold text-sm px-2 py-0.5 bg-red-50 dark:bg-red-950/80 rounded-md">
                  {effectiveTable}
                </span>
              </div>

              <div className="flex justify-between items-center text-xs font-semibold">
                <span className="text-slate-500 dark:text-slate-400">Serveuse / Responsable :</span>
                <span className="text-slate-900 dark:text-white font-bold">
                  {currentServeuse ? currentServeuse.nom : 'Session Active'}
                </span>
              </div>

              <div className="flex justify-between items-center text-xs font-semibold">
                <span className="text-slate-500 dark:text-slate-400">Nombre de produits :</span>
                <span className="text-slate-900 dark:text-white font-bold">{totalCartQuantity} article(s)</span>
              </div>
            </div>

            {/* Articles List */}
            <div>
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                Détail de la commande :
              </h4>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {cartItems.map((item) => (
                  <div key={item.idArticle} className="flex justify-between items-center p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 text-xs font-semibold">
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 font-black rounded-md">
                        {item.quantite}x
                      </span>
                      <span className="text-slate-900 dark:text-white">{item.nom}</span>
                    </div>
                    <span className="font-extrabold text-red-600 dark:text-red-400">{formatPrice(item.sousTotal)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Mode de règlement */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Mode de règlement (Statut de la commande) :
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'Non payé', label: 'En attente (Non payé)', icon: FileText },
                  { id: 'Espèces', label: 'Espèces', icon: Banknote },
                  { id: 'Carte Bancaire', label: 'Carte Bancaire', icon: CreditCard },
                  { id: 'Ticket / Pass', label: 'Ticket / Pass', icon: Ticket }
                ].map((m) => {
                  const IconComponent = m.icon;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPaymentMethod(m.id as ModePaiement)}
                      className={`p-2.5 rounded-xl text-xs font-bold flex flex-col items-center justify-center space-y-1 transition-all border touch-manipulation ${
                        paymentMethod === m.id
                          ? 'bg-red-600 border-red-600 text-white shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      <IconComponent className="w-4 h-4" />
                      <span className="truncate">{m.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Kitchen Notes */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Instructions ou remarques pour la cuisine :
              </label>
              <input
                type="text"
                placeholder="Exemple: Sans sauce piquante, bien cuit, sauce à part..."
                value={notesServeuse}
                onChange={(e) => setNotesServeuse(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs rounded-xl px-3.5 py-2.5 text-slate-800 dark:text-white outline-none focus:border-red-500"
              />
            </div>

            {/* Total */}
            <div className="flex justify-between items-center text-lg sm:text-2xl font-black pt-2 border-t border-slate-100 dark:border-slate-800">
              <span>TOTAL DE LA COMMANDE :</span>
              <span className="text-red-600 dark:text-red-400">{formatPrice(totalCartAmount)}</span>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="px-4 py-3.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl flex items-center justify-center space-x-2 transition-all"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Modifier les produits</span>
              </button>

              <button
                type="button"
                onClick={executeOrderSubmission}
                disabled={isSubmitting || cartItems.length === 0}
                className="px-4 py-3.5 bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white font-extrabold text-sm rounded-xl shadow-lg shadow-red-600/30 flex items-center justify-center space-x-2 transition-all active:scale-95"
              >
                <ChefHat className="w-5 h-5" />
                <span>{isSubmitting ? 'TRANSMISSION...' : 'ENVOYER EN CUISINE 🍗'}</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL FOR CLEARING CART */}
      <ConfirmModal
        isOpen={isClearCartModalOpen}
        title="Vider la commande ?"
        variant="danger"
        icon="trash"
        confirmText="Vider le panier"
        cancelText="Conserver"
        onConfirm={executeClearCart}
        onCancel={() => setIsClearCartModalOpen(false)}
        message={
          <p>
            Êtes-vous sûr de vouloir vider l'ensemble du panier en cours ({totalCartQuantity} article(s)) ?
          </p>
        }
      />

      {/* CONFIRMATION MODAL FOR TABLE DELETION */}
      <ConfirmModal
        isOpen={!!tableToDelete}
        title="Supprimer cette table ?"
        variant="danger"
        icon="warning"
        confirmText="Oui, Supprimer"
        cancelText="Annuler"
        onConfirm={handleConfirmDeleteTable}
        onCancel={() => setTableToDelete(null)}
        message={
          <div className="space-y-1">
            <p>
              Êtes-vous sûr de vouloir supprimer la table <strong className="text-slate-900">{tableToDelete}</strong> ?
            </p>
            <p className="text-xs text-slate-500">
              Cette table sera définitivement retirée de la liste.
            </p>
          </div>
        }
      />

      {/* MODAL FOR CREATING A NEW TABLE */}
      {isAddTableModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 flex items-center justify-center font-bold">
                  <Plus className="w-4 h-4" />
                </div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">Ajouter une table</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddTableModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddTableSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Nom ou numéro de la table :
                </label>
                <input
                  type="text"
                  autoFocus
                  placeholder="Ex: Table 06, Terrasse VIP..."
                  value={newTableName}
                  onChange={(e) => {
                    setNewTableName(e.target.value);
                    setAddTableError('');
                  }}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-red-500 focus:ring-2 focus:ring-red-100 rounded-xl px-3.5 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 outline-none font-semibold"
                />
                {addTableError && (
                  <p className="text-xs text-red-600 font-bold mt-1.5 flex items-center gap-1">
                    <span>⚠️</span> {addTableError}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddTableModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Valider</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

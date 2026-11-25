import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Article, CategorieArticle, Serveuse, ArticleCommande, ModePaiement, Categorie, Commande, StatutCommande } from '../types';
import { 
  Search, Plus, Minus, Trash2, ShoppingBag, CheckCircle, AlertTriangle, 
  FileText, Sparkles, ArrowRight, ArrowLeft, 
  X, MapPin, ChefHat, Check, UtensilsCrossed, Bell, CheckCircle2, Pencil, Settings2,
  ChevronLeft, ChevronRight, Printer
} from 'lucide-react';
import { formatPrice } from '../utils/format';
import { ConfirmModal } from './ConfirmModal';
import { posApi } from '../services/api';
import { ThermalReceipt } from './ThermalReceipt';
import { normalizeTableKey } from './CashierRegisterView';

export interface OrderSlipModalData {
  table: string;
  orderId: string;
  date: string;
  serveuseName: string;
  notesServeuse?: string;
  hasPreviousOrders: boolean;
  activeMode: 'ajouts' | 'integralite';
  addedArticles: { nom: string; prixUnitaire: number; quantite: number; sousTotal?: number; notes?: string }[];
  addedTotal: number;
  addedOrderIds: string[];
  fullArticles: { nom: string; prixUnitaire: number; quantite: number; sousTotal?: number; notes?: string }[];
  fullTotal: number;
  allOrderIds: string[];
}

interface OrderTakingViewProps {
  articles: Article[];
  categories?: Categorie[];
  commandes?: Commande[];
  currentServeuse: Serveuse | null;
  onValidateOrder: (orderData: {
    idServeuse: string;
    nomServeuse: string;
    table: string;
    articles: { idArticle: string; nom: string; prixUnitaire: number; quantite: number; notes?: string }[];
    modePaiement: ModePaiement;
    notesServeuse: string;
  }) => Promise<{ success: boolean; message?: string; errors?: string[]; commande?: Commande }>;
  onUpdateStatut?: (idCommande: string, statut: StatutCommande) => Promise<boolean>;
  onNavigateToService?: () => void;
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
  commandes = [],
  currentServeuse,
  onValidateOrder,
  onUpdateStatut,
  onNavigateToService,
  onOpenLogin
}) => {
  // Stepper State: 1 = Choix Table, 2 = Produits, 3 = Envoi Cuisine
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [servingOrderId, setServingOrderId] = useState<string | null>(null);

  // Ready orders waiting for serveuse
  const readyOrders = React.useMemo(() => {
    return (commandes || []).filter(c => c.statut === 'Prête');
  }, [commandes]);

  const handleQuickMarkServed = async (idCommande: string) => {
    if (!onUpdateStatut) return;
    setServingOrderId(idCommande);
    try {
      await onUpdateStatut(idCommande, 'Servie');
      setNotification({
        type: 'success',
        msg: `✅ Commande ${idCommande} marquée comme Servie à table !`
      });
      setTimeout(() => setNotification(null), 3500);
    } catch (e) {
      console.error(e);
    } finally {
      setServingOrderId(null);
    }
  };

  const [selectedCategory, setSelectedCategory] = useState<string>('Toutes');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Category Bar Scroll Navigation State & Ref
  const categoryScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState<boolean>(false);
  const [canScrollRight, setCanScrollRight] = useState<boolean>(true);

  const checkCategoryScroll = React.useCallback(() => {
    const el = categoryScrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 4);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 4);
  }, []);

  const handleScrollCategory = (direction: 'left' | 'right') => {
    const el = categoryScrollRef.current;
    if (!el) return;
    const scrollAmount = Math.max(el.clientWidth * 0.65, 240);
    el.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    });
    setTimeout(checkCategoryScroll, 350);
  };

  // Cart state
  const [cartItems, setCartItems] = useState<ArticleCommande[]>([]);
  const [orderType, setOrderType] = useState<'table' | 'takeaway'>('table');
  const [selectedTable, setSelectedTable] = useState<string>('Table 01');
  const [customTableInput, setCustomTableInput] = useState<string>('');
  const [tableSearchQuery, setTableSearchQuery] = useState<string>('');
  const [notesServeuse, setNotesServeuse] = useState<string>('');

  // Status feedback
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Modal confirmation states
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState<boolean>(false);
  const [isClearCartModalOpen, setIsClearCartModalOpen] = useState<boolean>(false);

  // Bon de Commande Modal (Visualisation & Impression avant paiement avec support Ajouts vs Intégralité)
  const [orderSlipModal, setOrderSlipModal] = useState<OrderSlipModalData | null>(null);

  // Dynamic table management state
  const [tables, setTables] = useState<string[]>(PRESET_TABLES);
  const [tableToDelete, setTableToDelete] = useState<string | null>(null);
  const [isAddTableModalOpen, setIsAddTableModalOpen] = useState<boolean>(false);
  const [isTableManagementMode, setIsTableManagementMode] = useState<boolean>(false);
  const [newTableName, setNewTableName] = useState<string>('');
  const [addTableError, setAddTableError] = useState<string>('');

  // Track tables with ongoing orders for quick visual status
  const activeTablesWithOrders = React.useMemo(() => {
    const set = new Set<string>();
    (commandes || []).forEach(c => {
      if (c.statut !== 'Payée' && c.statut !== 'Annulée' && c.table) {
        set.add(c.table);
      }
    });
    return set;
  }, [commandes]);

  useEffect(() => {
    let isMounted = true;
    posApi.getTables().then((tableList) => {
      if (isMounted && tableList && tableList.length > 0) {
        setTables(tableList);
      }
    }).catch(err => console.error("Error loading tables from API database", err));
    return () => { isMounted = false; };
  }, []);

  const effectiveTable = orderType === 'takeaway'
    ? 'À emporter'
    : (customTableInput.trim() || selectedTable || 'Table 01');

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

  useEffect(() => {
    if (currentStep === 2) {
      const timer = setTimeout(() => {
        checkCategoryScroll();
      }, 150);
      const el = categoryScrollRef.current;
      if (el) {
        el.addEventListener('scroll', checkCategoryScroll, { passive: true });
      }
      const handleResize = () => checkCategoryScroll();
      window.addEventListener('resize', handleResize);
      return () => {
        clearTimeout(timer);
        if (el) el.removeEventListener('scroll', checkCategoryScroll);
        window.removeEventListener('resize', handleResize);
      };
    }
  }, [currentStep, displayCategories, checkCategoryScroll]);

  // Helper for accent-insensitive search
  const normalizeSearch = (str: string) =>
    (str || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();

  // Smart articles filtering: accent-normalization, multi-field, and auto-fallback
  const { filteredArticles, isFallbackToAll, totalMatchesCount } = useMemo(() => {
    const raw = searchQuery.trim();
    const q = normalizeSearch(raw);
    const searchTerms = q.split(/\s+/).filter(Boolean);

    const matchesSearch = (art: Article) => {
      if (searchTerms.length === 0) return true;
      const nom = normalizeSearch(art.nom);
      const id = normalizeSearch(art.idArticle);
      const cat = normalizeSearch(art.categorie || '');
      const desc = normalizeSearch(art.description || '');
      return searchTerms.every(term =>
        nom.includes(term) || id.includes(term) || cat.includes(term) || desc.includes(term)
      );
    };

    // If no search query, filter purely by category
    if (searchTerms.length === 0) {
      const list = selectedCategory === 'Toutes'
        ? articles
        : articles.filter(art => art.categorie && art.categorie.toLowerCase() === selectedCategory.toLowerCase());
      return { filteredArticles: list, isFallbackToAll: false, totalMatchesCount: articles.length };
    }

    // If search query is active:
    const allMatches = articles.filter(matchesSearch);

    if (selectedCategory === 'Toutes') {
      return { filteredArticles: allMatches, isFallbackToAll: false, totalMatchesCount: allMatches.length };
    }

    const inCategoryMatches = allMatches.filter(
      art => art.categorie && art.categorie.toLowerCase() === selectedCategory.toLowerCase()
    );

    // If there are matches in the selected category, prioritize them
    if (inCategoryMatches.length > 0) {
      return { filteredArticles: inCategoryMatches, isFallbackToAll: false, totalMatchesCount: allMatches.length };
    }

    // If 0 matches in this category, but matches exist in other categories:
    // Fallback to allMatches so the user is never stranded with an empty list
    return { filteredArticles: allMatches, isFallbackToAll: true, totalMatchesCount: allMatches.length };
  }, [articles, searchQuery, selectedCategory]);

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
          sousTotal: article.prix,
          categorie: article.categorie
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

    // Capture items and target table before clearing
    const itemsSnapshot = cartItems.map(i => ({
      idArticle: i.idArticle,
      nom: i.nom,
      prixUnitaire: i.prixUnitaire,
      quantite: i.quantite,
      categorie: i.categorie,
      sousTotal: i.quantite * i.prixUnitaire,
      notes: i.notes || ''
    }));
    const addedTotalSnapshot = itemsSnapshot.reduce((acc, i) => acc + i.sousTotal, 0);
    const targetTable = effectiveTable;
    const targetNotes = notesServeuse;

    const result = await onValidateOrder({
      idServeuse: currentServeuse.idServeuse,
      nomServeuse: currentServeuse.nom,
      table: targetTable,
      articles: itemsSnapshot,
      modePaiement: 'Non payé',
      notesServeuse: targetNotes
    });

    setIsSubmitting(false);
    setIsConfirmModalOpen(false);

    if (result.success) {
      // Check if table already had active unpaid orders before this submission
      const targetTableKey = normalizeTableKey(targetTable);
      const previousOrders = (commandes || []).filter(
        c => c.statut !== 'Payée' && c.statut !== 'Annulée' && normalizeTableKey(c.table) === targetTableKey
      );
      const hasPrevious = previousOrders.length > 0;
      const createdCmdId = result.commande?.idCommande || `CMD-${Date.now().toString().slice(-6)}`;

      // Consolidate full articles list (all previous + newly sent items)
      const fullMap = new Map<string, { nom: string; prixUnitaire: number; quantite: number; sousTotal: number; notes?: string }>();
      let fullTotalSnapshot = addedTotalSnapshot;
      const allIds = [...previousOrders.map(c => c.idCommande), createdCmdId];

      previousOrders.forEach(po => {
        fullTotalSnapshot += po.montantTotal || 0;
        (po.articles || []).forEach(art => {
          const key = `${art.nom}`;
          const existing = fullMap.get(key);
          const st = art.sousTotal || (art.prixUnitaire * art.quantite);
          if (existing) {
            existing.quantite += art.quantite;
            existing.sousTotal += st;
          } else {
            fullMap.set(key, {
              nom: art.nom,
              prixUnitaire: art.prixUnitaire,
              quantite: art.quantite,
              sousTotal: st,
              notes: art.notes
            });
          }
        });
      });

      itemsSnapshot.forEach(art => {
        const key = `${art.nom}`;
        const existing = fullMap.get(key);
        if (existing) {
          existing.quantite += art.quantite;
          existing.sousTotal += (art.sousTotal || 0);
        } else {
          fullMap.set(key, {
            nom: art.nom,
            prixUnitaire: art.prixUnitaire,
            quantite: art.quantite,
            sousTotal: art.sousTotal || 0,
            notes: art.notes
          });
        }
      });

      // Open the Bon de Commande modal directly for viewing and printing
      setOrderSlipModal({
        table: targetTable,
        orderId: createdCmdId,
        date: new Date().toISOString(),
        serveuseName: currentServeuse.nom,
        notesServeuse: targetNotes,
        hasPreviousOrders: hasPrevious,
        activeMode: hasPrevious ? 'ajouts' : 'integralite',
        addedArticles: itemsSnapshot,
        addedTotal: addedTotalSnapshot,
        addedOrderIds: [createdCmdId],
        fullArticles: Array.from(fullMap.values()),
        fullTotal: fullTotalSnapshot,
        allOrderIds: allIds
      });

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

  // Open Bon de Commande for any already active table (e.g. from table cards)
  const handleOpenActiveTableBonCommande = (tbl: string) => {
    const tableKey = normalizeTableKey(tbl);
    const tableOrders = (commandes || []).filter(
      c => c.statut !== 'Payée' && c.statut !== 'Annulée' && normalizeTableKey(c.table) === tableKey
    );
    if (tableOrders.length === 0) return;

    const hasPrevious = tableOrders.length > 1;
    const allOrderIds = tableOrders.map(c => c.idCommande);

    // Initial order is tableOrders[0], additions are tableOrders.slice(1)
    const addedMap = new Map<string, { nom: string; prixUnitaire: number; quantite: number; sousTotal: number; notes?: string }>();
    let addedTotal = 0;
    const addedOrders = tableOrders.slice(1);
    const addedOrderIds = addedOrders.map(c => c.idCommande);

    addedOrders.forEach(o => {
      addedTotal += o.montantTotal || 0;
      (o.articles || []).forEach(art => {
        const key = `${art.nom}`;
        const existing = addedMap.get(key);
        const st = art.sousTotal || (art.prixUnitaire * art.quantite);
        if (existing) {
          existing.quantite += art.quantite;
          existing.sousTotal += st;
        } else {
          addedMap.set(key, {
            nom: art.nom,
            prixUnitaire: art.prixUnitaire,
            quantite: art.quantite,
            sousTotal: st,
            notes: art.notes
          });
        }
      });
    });

    const fullMap = new Map<string, { nom: string; prixUnitaire: number; quantite: number; sousTotal: number; notes?: string }>();
    let fullTotal = 0;
    tableOrders.forEach(o => {
      fullTotal += o.montantTotal || 0;
      (o.articles || []).forEach(art => {
        const key = `${art.nom}`;
        const existing = fullMap.get(key);
        const st = art.sousTotal || (art.prixUnitaire * art.quantite);
        if (existing) {
          existing.quantite += art.quantite;
          existing.sousTotal += st;
        } else {
          fullMap.set(key, {
            nom: art.nom,
            prixUnitaire: art.prixUnitaire,
            quantite: art.quantite,
            sousTotal: st,
            notes: art.notes
          });
        }
      });
    });

    setOrderSlipModal({
      table: tbl,
      orderId: allOrderIds[allOrderIds.length - 1],
      date: new Date().toISOString(),
      serveuseName: tableOrders[tableOrders.length - 1]?.nomServeuse || currentServeuse?.nom || 'Serveuse',
      notesServeuse: tableOrders[tableOrders.length - 1]?.notesServeuse,
      hasPreviousOrders: hasPrevious,
      activeMode: hasPrevious ? 'ajouts' : 'integralite',
      addedArticles: Array.from(addedMap.values()),
      addedTotal,
      addedOrderIds,
      fullArticles: Array.from(fullMap.values()),
      fullTotal,
      allOrderIds
    });
  };

  return (
    <div className="w-full min-h-full flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 relative transition-colors duration-200">
      
      {/* Ready Orders Alert Banner for Serveuse */}
      {readyOrders.length > 0 && (
        <div className="bg-gradient-to-r from-purple-700 via-purple-600 to-indigo-700 text-white px-3 sm:px-6 py-2.5 shadow-md flex flex-wrap items-center justify-between gap-2.5 z-30 animate-pulse">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <Bell className="w-4 h-4 text-white" />
            </div>
            <div className="truncate">
              <span className="font-extrabold text-xs sm:text-sm">
                🔔 {readyOrders.length} commande{readyOrders.length > 1 ? 's' : ''} PRÊTE{readyOrders.length > 1 ? 'S' : ''} au passe-plat / bar :
              </span>
              <span className="ml-1.5 text-xs text-purple-100 font-bold">
                {readyOrders.map(o => `${o.table} (#${o.idCommande})`).join(', ')}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            {readyOrders.slice(0, 2).map((cmd) => (
              <button
                key={cmd.idCommande}
                disabled={servingOrderId === cmd.idCommande}
                onClick={() => handleQuickMarkServed(cmd.idCommande)}
                className="px-2.5 py-1 bg-white text-purple-800 hover:bg-purple-50 font-black text-xs rounded-lg shadow-sm flex items-center space-x-1 transition-all active:scale-95 touch-manipulation"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>{cmd.table} : Servie ✅</span>
              </button>
            ))}
            {onNavigateToService && (
              <button
                onClick={onNavigateToService}
                className="px-2.5 py-1 bg-purple-900/60 hover:bg-purple-900 text-white font-bold text-xs rounded-lg border border-purple-400/40 transition-colors"
              >
                Ouvrir Service →
              </button>
            )}
          </div>
        </div>
      )}

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

          {/* Table / À emporter summary badge on top right */}
          <div className={`hidden lg:flex items-center space-x-2 border px-3 py-1.5 rounded-xl text-xs font-extrabold shrink-0 ${
            orderType === 'takeaway'
              ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-750 text-amber-800 dark:text-amber-300'
              : 'bg-red-50 dark:bg-red-950/60 border-red-200 dark:border-red-800/80 text-red-700 dark:text-red-300'
          }`}>
            {orderType === 'takeaway' ? (
              <ShoppingBag className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            ) : (
              <MapPin className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
            )}
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
        <div className="max-w-7xl 2xl:max-w-[1650px] mx-auto w-full p-4 sm:p-6 space-y-6 flex-1">
          <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
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
                  {isTableManagementMode 
                    ? "Mode édition : supprimez ou gérez les tables enregistrées." 
                    : "Sélectionnez une table disponible ou une commande à emporter."}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {/* Search table input for desktop & mobile */}
                <div className="relative min-w-[200px] flex-1 sm:flex-initial">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Rechercher une table..."
                    value={tableSearchQuery}
                    onChange={(e) => setTableSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:border-red-500 transition-colors"
                  />
                  {tableSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setTableSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white text-xs font-bold"
                    >
                      ×
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setIsTableManagementMode(!isTableManagementMode)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-all touch-manipulation active:scale-95 border ${
                    isTableManagementMode
                      ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                  title="Gérer les tables (Ajout / Suppression)"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>{isTableManagementMode ? 'Terminer gestion' : 'Gérer les tables'}</span>
                </button>

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
                  <span>Ajouter table</span>
                </button>
              </div>
            </div>

            {isTableManagementMode && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl flex items-center justify-between text-xs text-amber-900 dark:text-amber-200 animate-fade-in">
                <span className="font-semibold">
                  🛠️ Mode Gestion actif : Cliquez sur la corbeille d'une table pour la supprimer de la liste.
                </span>
                <button
                  type="button"
                  onClick={() => setIsTableManagementMode(false)}
                  className="px-2 py-1 bg-amber-600 text-white text-[11px] font-bold rounded-lg shrink-0 ml-2"
                >
                  Fermer
                </button>
              </div>
            )}

            {/* Table Selection Grid - Wide desktop multi-column */}
            <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-3 sm:gap-4">
              {/* Option À emporter Card */}
              {(!tableSearchQuery || 'à emporter'.includes(tableSearchQuery.toLowerCase())) && (
                <div
                  onClick={() => {
                    if (!isTableManagementMode) {
                      setOrderType('takeaway');
                      setCustomTableInput('');
                    }
                  }}
                  className={`relative p-4 rounded-2xl border flex flex-col items-center justify-center space-y-2 transition-all touch-manipulation select-none cursor-pointer hover:-translate-y-0.5 ${
                    orderType === 'takeaway'
                      ? 'bg-amber-500 border-amber-500 text-white shadow-lg shadow-amber-500/25 scale-102 ring-2 ring-amber-300'
                      : 'bg-amber-50/60 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 hover:border-amber-400 hover:bg-amber-100/60 dark:hover:bg-amber-900/40'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                    orderType === 'takeaway'
                      ? 'bg-white/20 text-white'
                      : 'bg-amber-100 dark:bg-amber-900/80 text-amber-700 dark:text-amber-300'
                  }`}>
                    <ShoppingBag className="w-5 h-5" />
                  </div>
                  <span className="font-black text-sm text-center">À emporter</span>
                  <span className={`text-[10px] font-bold ${orderType === 'takeaway' ? 'text-amber-100' : 'text-amber-700/80 dark:text-amber-400'}`}>
                    Sans table
                  </span>
                </div>
              )}

              {tables
                .filter(tbl => !tableSearchQuery || tbl.toLowerCase().includes(tableSearchQuery.toLowerCase()))
                .map((tbl) => {
                const isSelected = orderType === 'table' && selectedTable === tbl && !customTableInput;
                const hasActiveOrder = activeTablesWithOrders.has(tbl);

                return (
                  <div
                    key={tbl}
                    onClick={() => {
                      if (!isTableManagementMode) {
                        setOrderType('table');
                        setSelectedTable(tbl);
                        setCustomTableInput('');
                      }
                    }}
                    className={`relative p-4 rounded-2xl border flex flex-col items-center justify-center space-y-2 transition-all touch-manipulation select-none hover:-translate-y-0.5 ${
                      isTableManagementMode
                        ? 'bg-slate-50 dark:bg-slate-850 border-amber-300 dark:border-amber-700/80'
                        : isSelected
                        ? 'bg-red-600 border-red-600 text-white shadow-lg shadow-red-600/20 scale-102 ring-2 ring-red-400 cursor-pointer'
                        : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/80 text-slate-800 dark:text-slate-200 hover:border-red-300 dark:hover:border-red-700 hover:bg-white dark:hover:bg-slate-800 hover:shadow-sm cursor-pointer'
                    }`}
                  >
                    {/* Active order badge & Quick Print Bon de Commande */}
                    {hasActiveOrder && !isTableManagementMode && (
                      <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-none">
                        <span className="px-1.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-extrabold text-[9px] border border-amber-300 dark:border-amber-700 pointer-events-auto">
                          Active
                        </span>
                        <button
                          type="button"
                          title="Visualiser et imprimer le bon de commande"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenActiveTableBonCommande(tbl);
                          }}
                          className="pointer-events-auto p-1 rounded-md bg-amber-500 hover:bg-amber-600 text-white shadow-xs transition-all flex items-center space-x-0.5 text-[9px] font-black"
                        >
                          <Printer className="w-3 h-3" />
                          <span className="hidden sm:inline">Bon</span>
                        </button>
                      </div>
                    )}

                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                      !isTableManagementMode && isSelected
                        ? 'bg-white/20 text-white'
                        : 'bg-red-50 dark:bg-red-950/80 text-red-600 dark:text-red-400'
                    }`}>
                      <MapPin className="w-5 h-5" />
                    </div>
                    <span className="font-extrabold text-sm text-center line-clamp-1">{tbl}</span>
                    
                    {/* Delete button only in management mode */}
                    {isTableManagementMode && (
                      <button
                        type="button"
                        title={`Supprimer ${tbl}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setTableToDelete(tbl);
                        }}
                        className="absolute top-2 right-2 p-1.5 rounded-lg bg-red-50 dark:bg-red-950/80 hover:bg-red-600 text-red-600 hover:text-white border border-red-200 dark:border-red-800 transition-all touch-manipulation shadow-2xs"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
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
                onChange={(e) => {
                  setCustomTableInput(e.target.value);
                  if (e.target.value.trim()) {
                    setOrderType('table');
                  }
                }}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100 dark:focus:ring-red-900/40"
              />
            </div>

            {/* Table Selected Status & Action - With Field right next to choose products button */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3.5">
              
              {/* Type & Table Selector Field */}
              <div className="flex flex-wrap items-center gap-2 bg-slate-100/80 dark:bg-slate-800/80 p-1.5 sm:p-2 rounded-2xl border border-slate-200 dark:border-slate-700 flex-1">
                
                {/* Segmented Switcher */}
                <div className="flex items-center space-x-1 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200/80 dark:border-slate-750 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setOrderType('table');
                    }}
                    className={`px-3 py-2 rounded-lg text-xs font-black transition-all flex items-center space-x-1.5 ${
                      orderType === 'table'
                        ? 'bg-red-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Sur place (Table)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setOrderType('takeaway');
                      setCustomTableInput('');
                    }}
                    className={`px-3 py-2 rounded-lg text-xs font-black transition-all flex items-center space-x-1.5 ${
                      orderType === 'takeaway'
                        ? 'bg-amber-500 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>À emporter</span>
                  </button>
                </div>

                {/* Table details when Sur place */}
                {orderType === 'table' ? (
                  <div className="flex items-center space-x-2 pl-1 flex-1 min-w-[140px]">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 shrink-0 hidden sm:inline">Table :</span>
                    <select
                      value={customTableInput ? 'custom' : selectedTable}
                      onChange={(e) => {
                        if (e.target.value === 'custom') {
                          // keep custom
                        } else {
                          setOrderType('table');
                          setSelectedTable(e.target.value);
                          setCustomTableInput('');
                        }
                      }}
                      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-extrabold text-xs rounded-xl px-3 py-2 outline-none focus:border-red-500 w-full max-w-[160px]"
                    >
                      {tables.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                      {customTableInput && <option value="custom">{customTableInput}</option>}
                    </select>
                  </div>
                ) : (
                  <div className="text-xs font-bold text-amber-700 dark:text-amber-300 px-2.5 py-1.5 bg-amber-50 dark:bg-amber-950/60 rounded-xl border border-amber-200 dark:border-amber-800 flex items-center space-x-1.5">
                    <ShoppingBag className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <span>Commande à emporter</span>
                  </div>
                )}

              </div>

              {/* Button to proceed to choosing products */}
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="px-6 py-3.5 bg-red-600 hover:bg-red-700 text-white font-black text-sm rounded-xl shadow-md shadow-red-600/30 flex items-center justify-center space-x-2 transition-all touch-manipulation active:scale-95 shrink-0"
              >
                <span>Choisir les Produits</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ================= STEP 2 CONTENT: CHOISIR DES PRODUITS EN STOCK / MENU ================= */}
      {currentStep === 2 && (
        <div className="max-w-[1700px] mx-auto w-full p-3 sm:p-5 flex flex-col space-y-4 flex-1 pb-24 sm:pb-28">
          
          {/* Top Bar: Search & Category Navigation Bar */}
          <div className="bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            
            {/* Search Bar - Dedicated full-width row */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative flex-1 min-w-0">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                <input
                  type="text"
                  placeholder="Rechercher un plat, boisson, ingrédient (ex: Poulet, Burger, Pané, Cocktail)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-red-500 focus:ring-2 focus:ring-red-100 dark:focus:ring-red-950/40 rounded-xl pl-10 pr-10 py-2.5 text-xs sm:text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 outline-none transition-colors"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                    title="Effacer la recherche"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Real-time search status indicator */}
              {searchQuery.trim() && (
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-bold px-3 py-2 rounded-xl bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900/60 whitespace-nowrap">
                    {filteredArticles.length} résultat{filteredArticles.length !== 1 ? 's' : ''}
                  </span>
                  {selectedCategory !== 'Toutes' && (
                    <button
                      type="button"
                      onClick={() => setSelectedCategory('Toutes')}
                      className="text-xs font-bold px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors whitespace-nowrap cursor-pointer"
                      title="Voir les résultats dans tout le menu"
                    >
                      Tout le menu
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Notification if fallback to all categories during search */}
            {searchQuery.trim() && isFallbackToAll && selectedCategory !== 'Toutes' && (
              <div className="p-2.5 px-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-xs text-amber-800 dark:text-amber-300 flex items-center justify-between gap-2">
                <span>
                  Aucun résultat dans <strong>{selectedCategory}</strong>. Affichage des <strong>{totalMatchesCount}</strong> résultats trouvés dans le reste du menu.
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedCategory('Toutes')}
                  className="font-bold underline hover:text-amber-900 dark:hover:text-amber-200 shrink-0 cursor-pointer"
                >
                  Sélectionner "Toutes"
                </button>
              </div>
            )}

            {/* Category Navigation Bar with Prev/Next Buttons */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* Left Scroll Navigation Button */}
              <button
                type="button"
                onClick={() => handleScrollCategory('left')}
                disabled={!canScrollLeft}
                title="Catégories précédentes"
                className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center border transition-all shrink-0 touch-manipulation select-none ${
                  canScrollLeft
                    ? 'bg-white dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 shadow-xs hover:border-red-400 cursor-pointer active:scale-95'
                    : 'bg-slate-50 dark:bg-slate-800/40 text-slate-300 dark:text-slate-600 border-slate-200 dark:border-slate-800/60 cursor-not-allowed opacity-40'
                }`}
              >
                <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>

              {/* Scrollable Category Filter Pills */}
              <div 
                ref={categoryScrollRef}
                onScroll={checkCategoryScroll}
                className="flex-1 flex items-center gap-1.5 overflow-x-auto scroll-smooth scrollbar-none py-1 min-w-0"
              >
                {displayCategories.map((cat) => {
                  const isSelected = selectedCategory.toLowerCase() === cat.nom.toLowerCase();
                  return (
                    <button
                      key={cat.nom}
                      onClick={() => setSelectedCategory(cat.nom)}
                      className={`px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center space-x-1.5 touch-manipulation cursor-pointer shrink-0 ${
                        isSelected
                          ? 'bg-red-600 text-white shadow-xs shadow-red-600/30 ring-2 ring-red-600/20'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200/60 dark:border-slate-700/60'
                      }`}
                    >
                      {cat.emoji && <span className="text-xs sm:text-sm">{cat.emoji}</span>}
                      <span>{cat.nom}</span>
                    </button>
                  );
                })}
              </div>

              {/* Right Scroll Navigation Button */}
              <button
                type="button"
                onClick={() => handleScrollCategory('right')}
                disabled={!canScrollRight}
                title="Catégories suivantes"
                className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center border transition-all shrink-0 touch-manipulation select-none ${
                  canScrollRight
                    ? 'bg-white dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 shadow-xs hover:border-red-400 cursor-pointer active:scale-95'
                    : 'bg-slate-50 dark:bg-slate-800/40 text-slate-300 dark:text-slate-600 border-slate-200 dark:border-slate-800/60 cursor-not-allowed opacity-40'
                }`}
              >
                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>

          </div>

          {/* Product Cards Grid - Dense & Compact for Desktop / PC */}
          <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-2.5 sm:gap-3">
            {filteredArticles.length === 0 ? (
              <div className="col-span-full py-12 px-4 text-center bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl flex flex-col items-center justify-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-red-50 dark:bg-red-950/40 text-red-600 flex items-center justify-center">
                  <Search className="w-7 h-7" />
                </div>
                <div className="max-w-md">
                  <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-sm sm:text-base">
                    Aucun produit trouvé
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {searchQuery.trim()
                      ? `Aucun article ne correspond à "${searchQuery}" dans le menu.`
                      : `Aucun produit disponible dans la catégorie "${selectedCategory}".`}
                  </p>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    >
                      Effacer la recherche
                    </button>
                  )}
                  {selectedCategory !== 'Toutes' && (
                    <button
                      type="button"
                      onClick={() => setSelectedCategory('Toutes')}
                      className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs cursor-pointer"
                    >
                      Voir toutes les catégories
                    </button>
                  )}
                </div>
              </div>
            ) : (
              filteredArticles.map((article) => {
              const isOutOfStock = article.stock <= 0;
              const isLowStock = article.stock > 0 && article.stock <= 5;
              const cartItem = cartItems.find((i) => i.idArticle === article.idArticle);
              const qtyInCart = cartItem ? cartItem.quantite : 0;

              return (
                <div
                  key={article.idArticle}
                  onClick={() => !isOutOfStock && handleAddToCart(article)}
                  className={`bg-white dark:bg-slate-900 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 p-2 sm:p-2.5 flex flex-col justify-between group transition-all touch-manipulation select-none cursor-pointer shadow-2xs hover:shadow-md relative ${
                    isOutOfStock
                      ? 'opacity-60 pointer-events-none'
                      : qtyInCart > 0
                      ? 'ring-2 ring-red-500 border-red-500 shadow-sm'
                      : 'hover:border-red-300 dark:hover:border-red-800 active:scale-98'
                  }`}
                >
                  {/* Quantity badge in cart */}
                  {qtyInCart > 0 && (
                    <div className="absolute -top-1.5 -right-1.5 bg-red-600 text-white font-black text-[11px] w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center shadow-md border-2 border-white dark:border-slate-900 z-10 animate-pulse">
                      {qtyInCart}
                    </div>
                  )}

                  {/* Card Top / Compact Image Area */}
                  <div className="w-full h-20 sm:h-24 bg-slate-100 dark:bg-slate-800/80 rounded-lg sm:rounded-xl mb-1.5 relative flex items-center justify-center overflow-hidden border border-slate-100 dark:border-slate-800/60">
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
                            fallbackSpan.className = 'text-2xl';
                            fallbackSpan.innerText = article.emoji || '🍗';
                            parent.appendChild(fallbackSpan);
                          }
                        }}
                      />
                    ) : (
                      <span className="text-2xl group-hover:scale-110 transition-transform">{article.emoji || '🍗'}</span>
                    )}

                    {/* Stock Pill top right */}
                    {isOutOfStock ? (
                      <span className="absolute top-1 right-1 px-1.5 py-0.5 bg-red-600/90 text-white text-[8px] font-bold rounded uppercase tracking-wide">
                        Épuisé
                      </span>
                    ) : (
                      <span className={`absolute top-1 right-1 px-1.5 py-0.5 text-white text-[8px] font-bold rounded uppercase tracking-wide ${
                        isLowStock ? 'bg-amber-500/90' : 'bg-emerald-600/90'
                      }`}>
                        Stock: {article.stock}
                      </span>
                    )}
                  </div>

                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-bold text-xs sm:text-[13px] text-slate-900 dark:text-white line-clamp-1 leading-snug" title={article.nom}>
                        {article.nom}
                      </h3>
                      <p className="text-[9px] sm:text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-tight font-semibold truncate">
                        {article.categorie}
                      </p>
                    </div>

                    <div className="flex justify-between items-center mt-2 pt-1 border-t border-slate-50 dark:border-slate-800/60">
                      <span className="text-red-600 dark:text-red-400 font-black text-xs sm:text-sm leading-none">
                        {formatPrice(article.prix)}
                      </span>
                      <button 
                        type="button" 
                        className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold transition-colors shrink-0 ${
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
            }))}
          </div>

          {/* ================= MODULE D'ENVOI EN CUISINE & PANIER EN DESSOUS DES PRODUITS ================= */}
          <div id="kitchen-order-section" className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 sm:p-5 space-y-4">
            
            {/* Header of Kitchen Section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-red-100 dark:bg-red-950/80 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
                  <ChefHat className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="font-black text-base sm:text-lg text-slate-900 dark:text-white">
                      Envoi en Cuisine & Panier
                    </h3>
                    <span className={`text-[11px] font-black px-2.5 py-0.5 rounded-lg border flex items-center space-x-1 ${
                      orderType === 'takeaway'
                        ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700'
                        : 'bg-red-50 dark:bg-red-950/80 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800'
                    }`}>
                      {orderType === 'takeaway' ? (
                        <ShoppingBag className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                      ) : (
                        <MapPin className="w-3 h-3 text-red-600 dark:text-red-400" />
                      )}
                      <span>{effectiveTable}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(1)}
                      className="text-[11px] text-slate-500 hover:text-red-600 dark:hover:text-red-400 font-bold underline cursor-pointer"
                    >
                      Changer table
                    </button>
                  </div>
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    {currentServeuse ? `Serveuse : ${currentServeuse.nom}` : 'Session active'} • {totalCartQuantity} article(s) sélectionné(s)
                  </p>
                </div>
              </div>

              {cartItems.length > 0 && (
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsClearCartModalOpen(true)}
                    className="px-3 py-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Vider le panier</span>
                  </button>
                </div>
              )}
            </div>

            {/* Selected Products List */}
            {cartItems.length === 0 ? (
              <div className="py-6 px-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-center">
                <ShoppingBag className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-1.5" />
                <p className="text-xs font-bold text-slate-600 dark:text-slate-400">Aucun produit sélectionné pour l'instant</p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                  Cliquez sur les articles ci-dessus pour composer la commande de {effectiveTable}.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 max-h-60 overflow-y-auto pr-1">
                {cartItems.map((item) => (
                  <div 
                    key={item.idArticle} 
                    className="p-2.5 bg-slate-50 dark:bg-slate-800/70 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-slate-900 dark:text-white truncate" title={item.nom}>
                        {item.nom}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {formatPrice(item.prixUnitaire)}
                      </p>
                    </div>

                    <div className="flex items-center space-x-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleUpdateQuantity(item.idArticle, -1)}
                        className="w-5 h-5 rounded bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold flex items-center justify-center cursor-pointer hover:bg-slate-300"
                        title="Diminuer"
                      >
                        <Minus className="w-3 h-3" />
                      </button>

                      <span className="font-extrabold text-slate-900 dark:text-white min-w-[1.25rem] text-center text-xs">
                        {item.quantite}
                      </span>

                      <button
                        type="button"
                        onClick={() => handleUpdateQuantity(item.idArticle, 1)}
                        className="w-5 h-5 rounded bg-red-600 text-white font-bold flex items-center justify-center cursor-pointer hover:bg-red-700"
                        title="Augmenter"
                      >
                        <Plus className="w-3 h-3" />
                      </button>

                      <span className="font-black text-red-600 dark:text-red-400 text-xs min-w-[3.5rem] text-right">
                        {formatPrice(item.sousTotal)}
                      </span>

                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.idArticle)}
                        className="text-slate-400 hover:text-red-600 p-1 transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Bottom Controls: Kitchen Notes + Total and Submit Button */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center pt-2 border-t border-slate-100 dark:border-slate-800">
              
              {/* Left side: Notes for Kitchen */}
              <div className="lg:col-span-7 space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Instructions ou remarques spéciales pour la cuisine / bar :
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Exemple: Bien cuit, sans piment, sauce à part, servir ensemble..."
                    value={notesServeuse}
                    onChange={(e) => setNotesServeuse(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100 dark:focus:ring-red-950/40 transition-colors"
                  />
                </div>
                <p className="text-[10px] text-slate-400 dark:text-slate-500">
                  Cette note apparaîtra directement sur le bon de commande en cuisine.
                </p>
              </div>

              {/* Right side: Amount & Big Action Buttons */}
              <div className="lg:col-span-5 flex flex-col sm:flex-row lg:flex-row items-stretch sm:items-center justify-end gap-3.5 bg-slate-50 dark:bg-slate-800/50 p-3 sm:p-3.5 rounded-2xl border border-slate-200 dark:border-slate-750">
                <div className="text-right sm:text-right pr-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                    Total net ({totalCartQuantity} art.)
                  </span>
                  <span className="text-xl sm:text-2xl font-black text-red-600 dark:text-red-400">
                    {formatPrice(totalCartAmount)}
                  </span>
                </div>

                <button
                  type="button"
                  disabled={isSubmitting || cartItems.length === 0}
                  onClick={executeOrderSubmission}
                  className="px-5 py-3.5 bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white font-black text-xs sm:text-sm rounded-xl shadow-md shadow-red-600/30 flex items-center justify-center space-x-2 transition-all active:scale-95 cursor-pointer shrink-0"
                >
                  <ChefHat className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span>{isSubmitting ? 'TRANSMISSION...' : 'ENVOYER EN CUISINE 🍗'}</span>
                </button>
              </div>

            </div>

          </div>

          {/* Sticky Quick-Bar at bottom on Mobile & Desktop if cart has items */}
          {cartItems.length > 0 && (
            <div className="fixed bottom-3 left-3 right-3 sm:left-6 sm:right-6 lg:left-auto lg:right-6 lg:max-w-md z-40 bg-slate-900/95 text-white backdrop-blur-md rounded-2xl border border-slate-700 shadow-2xl p-2.5 sm:p-3 flex items-center justify-between gap-3 animate-in slide-in-from-bottom-3 duration-200">
              <div className="flex items-center space-x-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-red-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                  {totalCartQuantity}
                </div>
                <div className="truncate">
                  <p className="text-xs font-bold truncate text-slate-200">
                    {effectiveTable} • <span className="text-red-400 font-extrabold">{formatPrice(totalCartAmount)}</span>
                  </p>
                  <p className="text-[10px] text-slate-400 truncate">
                    {cartItems.length} référence(s) sélectionnée(s)
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById('kitchen-order-section');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg border border-slate-750 transition-colors"
                >
                  Détails
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={executeOrderSubmission}
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white text-xs font-black rounded-lg shadow-sm flex items-center space-x-1 transition-all active:scale-95"
                >
                  <ChefHat className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Envoi...' : 'Envoyer 🍗'}</span>
                </button>
              </div>
            </div>
          )}

        </div>
      )}

      {/* ================= STEP 3 CONTENT: ENVOYER EN CUISINE ================= */}
      {currentStep === 3 && (
        <div className="max-w-5xl 2xl:max-w-6xl mx-auto w-full p-4 sm:p-6 space-y-5 flex-1">
          <div className="bg-white dark:bg-slate-900 p-5 sm:p-7 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center space-x-2.5">
                <span className="px-2.5 py-1 bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 text-xs font-extrabold rounded-lg">
                  3 / 3
                </span>
                <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                  Récapitulatif & Envoi en Cuisine
                </h2>
              </div>

              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 hidden sm:inline">
                Vérifiez la commande avant transmission
              </span>
            </div>

            {/* Desktop 2-column layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Left Column: Context & Kitchen Notes */}
              <div className="lg:col-span-6 space-y-5">
                {/* Summary Details Box */}
                <div className="bg-slate-50 dark:bg-slate-800/60 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3.5">
                  <div className="flex justify-between items-center text-xs font-semibold">
                    <span className="text-slate-500 dark:text-slate-400">Emplacement / Type :</span>
                    <span className={`font-extrabold text-sm px-2.5 py-1 rounded-lg border flex items-center space-x-1.5 ${
                      orderType === 'takeaway'
                        ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700'
                        : 'bg-red-50 dark:bg-red-950/80 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800'
                    }`}>
                      {orderType === 'takeaway' ? (
                        <ShoppingBag className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      ) : (
                        <MapPin className="w-4 h-4 text-red-600 dark:text-red-400" />
                      )}
                      <span>{effectiveTable}</span>
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

                {/* Kitchen Notes */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                    Instructions ou remarques spéciales pour la cuisine :
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Exemple: Sans sauce piquante, bien cuit, sauce à part, servir ensemble..."
                    value={notesServeuse}
                    onChange={(e) => setNotesServeuse(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs rounded-xl p-3 text-slate-800 dark:text-white outline-none focus:border-red-500 resize-none transition-colors"
                  />
                </div>

                {/* Statut & Règlement Info */}
                <div className="bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 p-3.5 rounded-2xl flex items-center space-x-3 text-xs">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-800 dark:text-slate-200">
                      Envoi direct en cuisine / bar
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      Règlement et choix du mode de paiement effectués à la Caisse.
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Order Detail & CTA */}
              <div className="lg:col-span-6 space-y-4 bg-slate-50/70 dark:bg-slate-850/50 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Détail des articles commandés :
                  </h4>
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                    {cartItems.length} référence(s)
                  </span>
                </div>

                <div className="space-y-1.5 max-h-60 sm:max-h-72 overflow-y-auto pr-1">
                  {cartItems.map((item) => (
                    <div key={item.idArticle} className="flex justify-between items-center p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700/80 text-xs font-semibold shadow-2xs">
                      <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                        <span className="px-2 py-0.5 bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 font-black rounded-md shrink-0">
                          {item.quantite}x
                        </span>
                        <span className="text-slate-900 dark:text-white truncate">{item.nom}</span>
                      </div>
                      <span className="font-extrabold text-red-600 dark:text-red-400 shrink-0">{formatPrice(item.sousTotal)}</span>
                    </div>
                  ))}
                </div>

                {/* Total */}
                <div className="flex justify-between items-center text-lg sm:text-xl font-black pt-3 border-t border-slate-200 dark:border-slate-700">
                  <span>TOTAL À ENVOYER :</span>
                  <span className="text-red-600 dark:text-red-400 text-2xl font-black">{formatPrice(totalCartAmount)}</span>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    className="px-4 py-3.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl flex items-center justify-center space-x-2 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Modifier les produits</span>
                  </button>

                  <button
                    type="button"
                    onClick={executeOrderSubmission}
                    disabled={isSubmitting || cartItems.length === 0}
                    className="px-4 py-3.5 bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white font-extrabold text-sm rounded-xl shadow-lg shadow-red-600/30 flex items-center justify-center space-x-2 transition-all active:scale-95 cursor-pointer"
                  >
                    <ChefHat className="w-5 h-5" />
                    <span>{isSubmitting ? 'TRANSMISSION...' : 'ENVOYER EN CUISINE 🍗'}</span>
                  </button>
                </div>
              </div>

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

      {/* ========================================================================= */}
      {/* MODAL: BON DE COMMANDE AVANT PAIEMENT (CUISINE & ADDITIONS TABLE) */}
      {/* ========================================================================= */}
      {orderSlipModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white text-slate-900 rounded-3xl max-w-sm w-full p-4 sm:p-5 shadow-2xl relative animate-in fade-in zoom-in duration-200 my-auto">
            
            {/* Header controls (Screen only) */}
            <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-slate-200 print:hidden">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-black uppercase text-slate-700">
                  {orderSlipModal.activeMode === 'ajouts' && orderSlipModal.hasPreviousOrders 
                    ? "Bon d'ajout cuisine" 
                    : "Bon de commande table"
                  }
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg border bg-amber-50 text-amber-800 border-amber-300">
                  Avant Paiement
                </span>
              </div>

              <button
                onClick={() => setOrderSlipModal(null)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-full hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Option Switcher if table has additions (Only on screen, hidden on print) */}
            {orderSlipModal.hasPreviousOrders && (
              <div className="mb-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 p-2.5 rounded-2xl print:hidden">
                <div className="flex items-center justify-between mb-1.5 text-xs font-bold text-amber-900 dark:text-amber-200">
                  <span className="flex items-center space-x-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    <span>Options d'impression :</span>
                  </span>
                  <span className="text-[10px] text-amber-700 dark:text-amber-300">
                    Table active
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-1.5 bg-amber-100/60 dark:bg-amber-900/30 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setOrderSlipModal({ ...orderSlipModal, activeMode: 'ajouts' })}
                    className={`py-2 px-2 rounded-lg text-xs font-black transition-all flex flex-col items-center justify-center text-center ${
                      orderSlipModal.activeMode === 'ajouts'
                        ? 'bg-amber-500 text-white shadow-xs'
                        : 'text-amber-900 hover:bg-white/60'
                    }`}
                  >
                    <span>Éléments ajoutés</span>
                    <span className="text-[9px] font-medium opacity-90">
                      ({orderSlipModal.addedArticles.length} art. • {formatPrice(orderSlipModal.addedTotal)})
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setOrderSlipModal({ ...orderSlipModal, activeMode: 'integralite' })}
                    className={`py-2 px-2 rounded-lg text-xs font-black transition-all flex flex-col items-center justify-center text-center ${
                      orderSlipModal.activeMode === 'integralite'
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'text-amber-900 hover:bg-white/60'
                    }`}
                  >
                    <span>Intégralité</span>
                    <span className="text-[9px] font-medium opacity-90">
                      ({orderSlipModal.fullArticles.length} art. • {formatPrice(orderSlipModal.fullTotal)})
                    </span>
                  </button>
                </div>
              </div>
            )}

            {/* Printable Thermal Receipt Card */}
            <ThermalReceipt
              id="order-taking-slip"
              isProforma={true}
              isComplement={orderSlipModal.activeMode === 'ajouts' && orderSlipModal.hasPreviousOrders}
              totalCumuleTable={orderSlipModal.hasPreviousOrders ? orderSlipModal.fullTotal : undefined}
              titreReceipt={orderSlipModal.activeMode === 'ajouts' && orderSlipModal.hasPreviousOrders ? "BON D'AJOUT CUISINE" : "BON DE COMMANDE"}
              table={orderSlipModal.table}
              orderIds={orderSlipModal.activeMode === 'ajouts' && orderSlipModal.hasPreviousOrders ? orderSlipModal.addedOrderIds : orderSlipModal.allOrderIds}
              date={orderSlipModal.date}
              serveuseNames={orderSlipModal.serveuseName}
              articles={orderSlipModal.activeMode === 'ajouts' && orderSlipModal.hasPreviousOrders ? orderSlipModal.addedArticles : orderSlipModal.fullArticles}
              totalBrut={orderSlipModal.activeMode === 'ajouts' && orderSlipModal.hasPreviousOrders ? orderSlipModal.addedTotal : orderSlipModal.fullTotal}
              remise={0}
              totalNet={orderSlipModal.activeMode === 'ajouts' && orderSlipModal.hasPreviousOrders ? orderSlipModal.addedTotal : orderSlipModal.fullTotal}
              modePaiement="Non payé"
              notesCommande={orderSlipModal.notesServeuse}
            />

            {/* Screen Action Buttons */}
            <div className="mt-3 pt-2.5 border-t border-slate-200 flex gap-2 print:hidden">
              <button
                onClick={() => window.print()}
                className={`flex-1 py-2.5 text-white font-extrabold text-xs rounded-xl flex items-center justify-center space-x-1.5 transition-all shadow-xs ${
                  orderSlipModal.activeMode === 'ajouts' && orderSlipModal.hasPreviousOrders
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-slate-900 hover:bg-black'
                }`}
              >
                <Printer className="w-4 h-4" />
                <span>
                  {orderSlipModal.activeMode === 'ajouts' && orderSlipModal.hasPreviousOrders
                    ? "Imprimer le Bon d'Ajout"
                    : "Imprimer le Bon de Commande"
                  }
                </span>
              </button>

              <button
                onClick={() => setOrderSlipModal(null)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
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

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Article, CategorieArticle, Serveuse, Categorie } from '../types';
import { Package, Plus, Search, Edit3, Trash2, AlertTriangle, CheckCircle, RefreshCw, X, Upload, Image as ImageIcon, Link as LinkIcon, UploadCloud, Tag, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatPrice } from '../utils/format';
import { ConfirmModal } from './ConfirmModal';
import { posApi } from '../services/api';

interface CatalogManagerViewProps {
  articles: Article[];
  categories?: Categorie[];
  currentServeuse?: Serveuse | null;
  onCreateArticle: (art: Partial<Article>) => Promise<void>;
  onUpdateArticle: (idArticle: string, updates: Partial<Article>) => Promise<void>;
  onAdjustStock: (idArticle: string, delta?: number, nouveauStock?: number) => Promise<void>;
  onDeleteArticle: (idArticle: string) => Promise<void>;
  onCategoriesChange?: () => void;
}

export const CatalogManagerView: React.FC<CatalogManagerViewProps> = ({
  articles,
  categories = [],
  currentServeuse,
  onCreateArticle,
  onUpdateArticle,
  onAdjustStock,
  onDeleteArticle,
  onCategoriesChange
}) => {
  const isAdmin = currentServeuse?.role === 'admin';
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCat, setFilterCat] = useState<string>('Toutes');
  const [stockAlertOnly, setStockAlertOnly] = useState(false);

  // Category Bar Scroll Navigation State & Ref
  const categoryScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState<boolean>(false);
  const [canScrollRight, setCanScrollRight] = useState<boolean>(true);

  const checkCategoryScroll = useCallback(() => {
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

  useEffect(() => {
    const timer = setTimeout(checkCategoryScroll, 150);
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
  }, [checkCategoryScroll]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [articleToDelete, setArticleToDelete] = useState<Article | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Form fields
  const [nom, setNom] = useState('');
  const [categorie, setCategorie] = useState<string>('Boissons');
  const [prix, setPrix] = useState<number>(2500);
  const [stock, setStock] = useState<number>(30);
  const [emoji, setEmoji] = useState('🍹');
  const [image, setImage] = useState('');
  const [description, setDescription] = useState('');

  // Milgo's Menu Sync state
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const handleSyncMilgosMenu = async () => {
    setIsSyncing(true);
    try {
      const res = await posApi.syncMilgosMenu();
      if (res.success) {
        setSyncFeedback({ type: 'success', msg: res.message || "Menu officiel Milgo's synchronisé !" });
        if (onCategoriesChange) onCategoriesChange();
        setTimeout(() => {
          window.location.reload();
        }, 1200);
      } else {
        setSyncFeedback({ type: 'error', msg: res.message || "Erreur lors de la synchronisation" });
      }
    } catch (err: any) {
      setSyncFeedback({ type: 'error', msg: err.message || "Erreur réseau lors de la synchronisation" });
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncFeedback(null), 4000);
    }
  };

  // Image Upload State
  const [imageMode, setImageMode] = useState<'upload' | 'url'>('upload');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processImageFile = (file: File) => {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 500;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > MAX_SIZE) {
            height = Math.round((height * MAX_SIZE) / width);
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width = Math.round((width * MAX_SIZE) / height);
            height = MAX_SIZE;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const resizedDataUrl = canvas.toDataURL('image/jpeg', 0.75);
          setImage(resizedDataUrl);
        }
      };
      if (e.target?.result) {
        img.src = e.target.result as string;
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processImageFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processImageFile(e.dataTransfer.files[0]);
    }
  };

  const handleOpenCreateModal = () => {
    setEditingArticle(null);
    setNom('');
    setCategorie('Boissons');
    setPrix(2500);
    setStock(30);
    setEmoji('🍹');
    setImage('');
    setDescription('');
    setSaveError(null);
    setIsSaving(false);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (article: Article) => {
    setEditingArticle(article);
    setNom(article.nom);
    setCategorie(article.categorie);
    setPrix(article.prix);
    setStock(article.stock);
    setEmoji(article.emoji || '📦');
    setImage(article.image || '');
    setDescription(article.description || '');
    setSaveError(null);
    setIsSaving(false);
    setIsModalOpen(true);
  };

  const handleSaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nom.trim()) return;

    setIsSaving(true);
    setSaveError(null);

    try {
      if (editingArticle) {
        await onUpdateArticle(editingArticle.idArticle, {
          nom: nom.trim(),
          categorie,
          prix: Number(prix),
          stock: Number(stock),
          emoji,
          image,
          description
        });
      } else {
        await onCreateArticle({
          nom: nom.trim(),
          categorie,
          prix: Number(prix),
          stock: Number(stock),
          stockInitial: Number(stock),
          emoji,
          image,
          description,
          actif: true
        });
      }
      setIsModalOpen(false);
    } catch (err: any) {
      console.error('Erreur enregistrement article:', err);
      setSaveError(err.message || "Erreur lors de la sauvegarde de l'article en base de données.");
    } finally {
      setIsSaving(false);
    }
  };

  // Dynamic category options
  const categoryOptions = React.useMemo(() => {
    const list: { nom: string; emoji?: string }[] = [];
    if (categories && categories.length > 0) {
      categories.forEach(c => list.push({ nom: c.nom, emoji: c.emoji }));
    } else {
      ['Cocktails', 'Boissons', 'Entrées', 'Plats', 'Desserts', 'Snacks'].forEach(c => list.push({ nom: c, emoji: '🏷️' }));
    }
    // Also include any categories found in articles not in list
    articles.forEach(a => {
      if (a.categorie && !list.some(l => l.nom.toLowerCase() === a.categorie.toLowerCase())) {
        list.push({ nom: a.categorie, emoji: '🏷️' });
      }
    });
    return list;
  }, [categories, articles]);

  const filterCategories = React.useMemo(() => {
    return [{ nom: 'Toutes', emoji: '✨' }, ...categoryOptions];
  }, [categoryOptions]);

  // Helper for accent-insensitive search
  const normalizeSearch = (str: string) =>
    (str || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();

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

    const matchesAlert = (art: Article) => !stockAlertOnly || art.stock <= 5;

    // Filter by search terms and stock alert across all articles
    const allMatches = articles.filter(art => matchesSearch(art) && matchesAlert(art));

    if (searchTerms.length === 0) {
      const list = filterCat === 'Toutes'
        ? allMatches
        : allMatches.filter(art => art.categorie && art.categorie.toLowerCase() === filterCat.toLowerCase());
      return { filteredArticles: list, isFallbackToAll: false, totalMatchesCount: allMatches.length };
    }

    if (filterCat === 'Toutes') {
      return { filteredArticles: allMatches, isFallbackToAll: false, totalMatchesCount: allMatches.length };
    }

    const inCatMatches = allMatches.filter(
      art => art.categorie && art.categorie.toLowerCase() === filterCat.toLowerCase()
    );

    if (inCatMatches.length > 0) {
      return { filteredArticles: inCatMatches, isFallbackToAll: false, totalMatchesCount: allMatches.length };
    }

    return { filteredArticles: allMatches, isFallbackToAll: true, totalMatchesCount: allMatches.length };
  }, [articles, searchQuery, filterCat, stockAlertOnly]);

  return (
    <div className="w-full max-w-[1750px] mx-auto min-h-full flex flex-col bg-slate-50 text-slate-800 p-3 sm:p-5 lg:p-6 pb-20 sm:pb-8">
      
      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 shrink-0 bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center space-x-2">
          <Package className="w-5 h-5 text-red-600" />
          <h2 className="font-extrabold text-sm sm:text-base text-slate-900">Gestion du Catalogue & des Stocks</h2>
          <span className="bg-red-50 text-red-700 text-xs px-2.5 py-0.5 rounded-full font-bold border border-red-200">
            {articles.length} articles
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Synchronize Official Milgo's Menu */}
          {isAdmin && (
            <button
              onClick={handleSyncMilgosMenu}
              disabled={isSyncing}
              className="px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center space-x-1.5 border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 transition-all touch-manipulation active:scale-95 disabled:opacity-50"
              title="Recharger et synchroniser l'intégralité du menu officiel Milgo's (63 articles)"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Synchronisation...' : "Menu Milgo's"}</span>
            </button>
          )}

          {/* Stock Alert Filter Pill */}
          <button
            onClick={() => setStockAlertOnly(!stockAlertOnly)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 border transition-all ${
              stockAlertOnly
                ? 'bg-amber-100 border-amber-300 text-amber-900 shadow-xs'
                : 'bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            <span>Alerte Stock (&le;5)</span>
          </button>

          {/* Create New Product Button */}
          {isAdmin && (
            <button
              onClick={handleOpenCreateModal}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-extrabold rounded-xl shadow-xs flex items-center space-x-1.5 transition-all touch-manipulation active:scale-95 shadow-red-600/10"
            >
              <Plus className="w-4 h-4" />
              <span>Nouveau Produit</span>
            </button>
          )}
        </div>
      </div>

      {/* Sync Feedback Toast */}
      {syncFeedback && (
        <div className={`mb-3 p-3 rounded-xl border text-xs font-bold flex items-center space-x-2 animate-in fade-in ${
          syncFeedback.type === 'success' ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-red-50 border-red-300 text-red-800'
        }`}>
          {syncFeedback.type === 'success' ? <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />}
          <span>{syncFeedback.msg}</span>
        </div>
      )}

      {/* Search & Category Bar */}
      <div className="bg-white p-3 sm:p-3.5 rounded-2xl border border-slate-200 shadow-xs mb-4 shrink-0 space-y-2.5">
        {/* Row 1: Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="relative flex-1 min-w-0">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher par nom, catégorie ou référence (ex: Poulet, Burger, ART-001)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-10 py-2.5 text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full bg-slate-200 text-slate-600 hover:text-slate-900 text-xs font-bold transition-colors cursor-pointer"
                title="Effacer la recherche"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {searchQuery.trim() && (
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-bold px-2.5 py-1.5 rounded-lg bg-red-50 text-red-700 border border-red-200 whitespace-nowrap">
                {filteredArticles.length} résultat{filteredArticles.length !== 1 ? 's' : ''}
              </span>
              {filterCat !== 'Toutes' && (
                <button
                  type="button"
                  onClick={() => setFilterCat('Toutes')}
                  className="text-xs font-bold px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors whitespace-nowrap cursor-pointer"
                >
                  Tout le catalogue
                </button>
              )}
            </div>
          )}
        </div>

        {/* Fallback notification if searching outside category */}
        {searchQuery.trim() && isFallbackToAll && filterCat !== 'Toutes' && (
          <div className="p-2 px-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center justify-between gap-2">
            <span>
              Aucun résultat dans <strong>{filterCat}</strong>. Affichage des <strong>{totalMatchesCount}</strong> résultats trouvés dans le catalogue.
            </span>
            <button
              type="button"
              onClick={() => setFilterCat('Toutes')}
              className="font-bold underline hover:text-amber-950 shrink-0 cursor-pointer"
            >
              Afficher "Toutes"
            </button>
          </div>
        )}

        {/* Row 2: Category Bar with Navigation Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => handleScrollCategory('left')}
            disabled={!canScrollLeft}
            title="Catégories précédentes"
            className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center border transition-all shrink-0 touch-manipulation select-none ${
              canScrollLeft
                ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200 shadow-2xs hover:border-red-400 cursor-pointer active:scale-95'
                : 'bg-slate-50 text-slate-300 border-slate-200/60 cursor-not-allowed opacity-40'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div
            ref={categoryScrollRef}
            onScroll={checkCategoryScroll}
            className="flex-1 flex space-x-1.5 overflow-x-auto scroll-smooth scrollbar-none py-0.5 min-w-0"
          >
            {filterCategories.map((c) => {
              const isSelected = filterCat.toLowerCase() === c.nom.toLowerCase();
              return (
                <button
                  key={c.nom}
                  onClick={() => setFilterCat(c.nom)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center space-x-1 touch-manipulation cursor-pointer shrink-0 ${
                    isSelected
                      ? 'bg-red-600 text-white shadow-xs'
                      : 'bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {c.emoji && <span className="text-xs">{c.emoji}</span>}
                  <span>{c.nom}</span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => handleScrollCategory('right')}
            disabled={!canScrollRight}
            title="Catégories suivantes"
            className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center border transition-all shrink-0 touch-manipulation select-none ${
              canScrollRight
                ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200 shadow-2xs hover:border-red-400 cursor-pointer active:scale-95'
                : 'bg-slate-50 text-slate-300 border-slate-200/60 cursor-not-allowed opacity-40'
            }`}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Catalog Table & Cards Grid */}
      <div className="flex-1 overflow-y-auto pr-1">
        {filteredArticles.length === 0 ? (
          <div className="py-14 px-4 text-center bg-white border border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center space-y-3.5 my-4">
            <div className="w-16 h-16 rounded-3xl bg-red-50 border border-red-200 text-red-600 flex items-center justify-center shadow-xs">
              <Package className="w-8 h-8 opacity-80" />
            </div>
            <div className="max-w-sm">
              <h3 className="font-extrabold text-slate-900 text-base">
                {articles.length === 0 ? 'Votre catalogue est vide' : 'Aucun produit correspondant'}
              </h3>
              <p className="text-slate-500 text-xs mt-1">
                {articles.length === 0 
                  ? 'Commencez par ajouter vos boissons, plats et desserts pour lancer les prises de commandes.' 
                  : 'Essayez de modifier votre mot-clé ou de changer la catégorie sélectionnée.'}
              </p>
            </div>
            
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              {(searchQuery || filterCat !== 'Toutes' || stockAlertOnly) && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setFilterCat('Toutes');
                    setStockAlertOnly(false);
                  }}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all"
                >
                  Réinitialiser les filtres
                </button>
              )}
              {isAdmin && (
                <button
                  type="button"
                  onClick={handleOpenCreateModal}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-extrabold rounded-xl shadow-md shadow-red-600/20 transition-all flex items-center space-x-1.5 touch-manipulation active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span>Ajouter un produit</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3.5 sm:gap-4">
            {filteredArticles.map((art) => {
              const isOut = art.stock <= 0;
              const isLow = art.stock > 0 && art.stock <= 5;

              return (
                <div
                  key={art.idArticle}
                  className={`bg-white border p-3.5 rounded-2xl flex flex-col justify-between space-y-3 relative shadow-xs hover:shadow-md transition-all ${
                    !art.actif
                      ? 'border-slate-200 opacity-60'
                      : isOut
                      ? 'border-red-300 bg-red-50/30'
                      : isLow
                      ? 'border-amber-300 bg-amber-50/30'
                      : 'border-slate-200 hover:border-red-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-xl overflow-hidden shrink-0 relative">
                        {art.image ? (
                          <img 
                            src={art.image} 
                            alt={art.nom} 
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <span>{art.emoji || '📦'}</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-xs sm:text-sm text-slate-900 truncate">{art.nom}</h3>
                        <div className="text-[10px] text-slate-500 font-mono flex items-center space-x-1.5 mt-0.5">
                          <span>{art.idArticle}</span>
                          <span>•</span>
                          <span className="text-red-600 font-semibold truncate">{art.categorie}</span>
                        </div>
                      </div>
                    </div>

                    {/* Price pill */}
                    <div className="text-right shrink-0">
                      <div className="text-sm sm:text-base font-black text-red-600">
                        {formatPrice(art.prix)}
                      </div>
                      {isAdmin ? (
                        <button
                          onClick={() => onUpdateArticle(art.idArticle, { actif: !art.actif })}
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded mt-1 border ${
                            art.actif
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                              : 'bg-slate-100 border-slate-200 text-slate-500'
                          }`}
                        >
                          {art.actif ? 'Actif' : 'Inactif'}
                        </button>
                      ) : (
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded mt-1 border inline-block ${
                          art.actif
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                            : 'bg-slate-100 border-slate-200 text-slate-500'
                        }`}>
                          {art.actif ? 'Disponible' : 'Indisponible'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Stock Management & Quick Replenish */}
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex items-center justify-between gap-2">
                    <div>
                      <div className="text-[9px] uppercase font-bold text-slate-400">Stock disponible</div>
                      <div className={`text-base font-black ${isOut ? 'text-red-600' : isLow ? 'text-amber-600' : 'text-slate-900'}`}>
                        {art.stock} <span className="text-[10px] font-normal text-slate-500">unités</span>
                      </div>
                    </div>

                    {/* Replenish Buttons (Admin Only) */}
                    {isAdmin && (
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => onAdjustStock(art.idArticle, -1)}
                          className="w-7 h-7 bg-white hover:bg-slate-100 text-slate-800 font-bold rounded-lg border border-slate-200 flex items-center justify-center text-xs touch-manipulation shadow-2xs"
                          title="Diminuer stock -1"
                        >
                          -1
                        </button>
                        <button
                          onClick={() => onAdjustStock(art.idArticle, 1)}
                          className="w-7 h-7 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 font-bold rounded-lg flex items-center justify-center text-xs touch-manipulation shadow-2xs"
                          title="Réapprovisionner +1"
                        >
                          +1
                        </button>
                        <button
                          onClick={() => onAdjustStock(art.idArticle, 10)}
                          className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg flex items-center justify-center text-xs touch-manipulation shadow-2xs shadow-red-600/10"
                          title="Réapprovisionner +10"
                        >
                          +10
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Edit / Delete Row (Admin Only) */}
                  {isAdmin && (
                    <div className="flex items-center justify-between pt-1 text-xs">
                      <button
                        onClick={() => handleOpenEditModal(art)}
                        className="text-red-600 hover:text-red-800 flex items-center space-x-1 font-bold"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Modifier</span>
                      </button>

                      <button
                        onClick={() => setArticleToDelete(art)}
                        className="text-slate-400 hover:text-red-600 flex items-center space-x-1 font-semibold transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Supprimer</span>
                      </button>
                    </div>
                  )}

                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* CREATE / EDIT ARTICLE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl relative text-slate-800 my-auto max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-2 rounded-full hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-extrabold text-base sm:text-lg text-slate-900 mb-3">
              {editingArticle ? `Modifier '${editingArticle.nom}'` : 'Nouveau Produit au Catalogue'}
            </h3>

            {saveError && (
              <div className="mb-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold p-3 rounded-xl flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{saveError}</span>
              </div>
            )}

            <form onSubmit={handleSaveSubmit} className="space-y-3 text-xs">
              {/* Image Hero Preview Header */}
              <div className="relative w-full h-28 bg-slate-100 rounded-2xl overflow-hidden border border-slate-200 flex items-center justify-center group">
                {image ? (
                  <>
                    <img
                      src={image}
                      alt="Aperçu article"
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="p-2 bg-white/90 hover:bg-white text-slate-800 rounded-xl font-bold text-[11px] shadow-sm flex items-center space-x-1"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Changer photo</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setImage('')}
                        className="p-2 bg-red-600/90 hover:bg-red-600 text-white rounded-xl font-bold text-[11px] shadow-sm flex items-center space-x-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Supprimer</span>
                      </button>
                    </div>
                  </>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center justify-center text-center p-3 cursor-pointer hover:bg-slate-200/60 transition-colors w-full h-full"
                  >
                    <span className="text-2xl mb-1">{emoji || '🍹'}</span>
                    <span className="text-[11px] font-bold text-red-600 flex items-center space-x-1">
                      <UploadCloud className="w-3.5 h-3.5" />
                      <span>Ajouter une image / photo du produit</span>
                    </span>
                    <span className="text-[10px] text-slate-400">Cliquez ou glissez une photo ici</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Nom de l'article :</label>
                <input
                  type="text"
                  required
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  placeholder="ex: Cocktail Mojito Artisanal"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 outline-none focus:border-red-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Catégorie :</label>
                  <select
                    value={categorie}
                    onChange={(e) => {
                      const selectedVal = e.target.value;
                      setCategorie(selectedVal);
                      const found = categoryOptions.find(c => c.nom === selectedVal);
                      if (found?.emoji && (!emoji || emoji === '📦' || emoji === '🍹')) {
                        setEmoji(found.emoji);
                      }
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 outline-none focus:border-red-500 font-medium"
                  >
                    {categoryOptions.map((c) => (
                      <option key={c.nom} value={c.nom}>
                        {c.emoji ? `${c.emoji} ` : ''}{c.nom}
                      </option>
                    ))}
                    {!categoryOptions.some(c => c.nom === categorie) && (
                      <option value={categorie}>{categorie}</option>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Emoji / Icône :</label>
                  <input
                    type="text"
                    value={emoji}
                    onChange={(e) => setEmoji(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 outline-none text-center text-base"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Prix unitaire (FCFA) :</label>
                  <input
                    type="number"
                    step="50"
                    min="0"
                    required
                    value={prix}
                    onChange={(e) => setPrix(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 outline-none focus:border-red-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Stock Initial :</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={stock}
                    onChange={(e) => setStock(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 outline-none focus:border-red-500 font-medium"
                  />
                </div>
              </div>

              {/* Champ Image / Importation */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-2.5 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-slate-800 font-bold text-xs flex items-center space-x-1.5">
                    <ImageIcon className="w-4 h-4 text-red-600" />
                    <span>Image / Photo</span>
                  </label>
                  <div className="flex bg-slate-200/80 p-0.5 rounded-lg text-[10px] font-bold">
                    <button
                      type="button"
                      onClick={() => setImageMode('upload')}
                      className={`px-2 py-0.5 rounded-md transition-colors flex items-center space-x-1 ${imageMode === 'upload' ? 'bg-white text-red-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                      <Upload className="w-3 h-3" />
                      <span>Fichier</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageMode('url')}
                      className={`px-2 py-0.5 rounded-md transition-colors flex items-center space-x-1 ${imageMode === 'url' ? 'bg-white text-red-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                      <LinkIcon className="w-3 h-3" />
                      <span>URL</span>
                    </button>
                  </div>
                </div>

                {imageMode === 'upload' ? (
                  <div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                      accept="image/*"
                      className="hidden"
                    />
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-xl p-2.5 text-center cursor-pointer transition-all ${
                        isDragging
                          ? 'border-red-500 bg-red-50 scale-[0.99]'
                          : 'border-slate-300 hover:border-red-400 bg-white hover:bg-red-50/30'
                      }`}
                    >
                      <div className="flex items-center justify-center space-x-2">
                        <UploadCloud className="w-4 h-4 text-red-600" />
                        <span className="text-xs font-bold text-slate-700">
                          {image ? "Remplacer la photo de l'article" : "Sélectionner une photo"}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <input
                      type="url"
                      value={image}
                      onChange={(e) => setImage(e.target.value)}
                      placeholder="https://images.unsplash.com/photo-..."
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-slate-900 outline-none focus:border-red-500 font-mono text-[11px]"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Description :</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Notes facultatives..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-900 outline-none focus:border-red-500 font-medium"
                />
              </div>

              <button
                type="submit"
                disabled={isSaving}
                className={`w-full py-3 bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center space-x-2 touch-manipulation active:scale-95 shadow-red-600/20 ${
                  isSaving ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span>Sauvegarde en cours...</span>
                  </>
                ) : (
                  <span>{editingArticle ? 'Enregistrer les Modifications' : 'Créer l\'Article'}</span>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL FOR ARTICLE DELETION */}
      <ConfirmModal
        isOpen={!!articleToDelete}
        title="Supprimer l'article ?"
        variant="danger"
        icon="trash"
        confirmText="Supprimer l'article"
        cancelText="Annuler"
        isLoading={isDeleting}
        onConfirm={async () => {
          if (!articleToDelete) return;
          setIsDeleting(true);
          await onDeleteArticle(articleToDelete.idArticle);
          setIsDeleting(false);
          setArticleToDelete(null);
        }}
        onCancel={() => setArticleToDelete(null)}
        message={
          <div className="space-y-2">
            <p>
              Êtes-vous sûr de vouloir supprimer définitivement cet article de la carte ?
            </p>
            {articleToDelete && (
              <div className="bg-white p-2.5 rounded-xl border border-slate-200 text-slate-800 font-bold space-y-1">
                <div className="text-sm flex items-center gap-1.5">
                  <span>{articleToDelete.emoji || '🍹'}</span>
                  <span>{articleToDelete.nom}</span>
                </div>
                <div className="text-[11px] text-slate-500 font-mono font-normal">
                  ID: {articleToDelete.idArticle} • Prix: {formatPrice(articleToDelete.prix)}
                </div>
              </div>
            )}
            <p className="text-[11px] text-slate-500 italic">
              Cette action retirera le produit du catalogue tablette de prise de commande.
            </p>
          </div>
        }
      />

    </div>
  );
};

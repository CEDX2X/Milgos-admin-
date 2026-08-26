import React, { useState, useRef } from 'react';
import { Article, CategorieArticle, Serveuse, Categorie } from '../types';
import { Package, Plus, Search, Edit3, Trash2, AlertTriangle, CheckCircle, RefreshCw, X, Upload, Image as ImageIcon, Link as LinkIcon, UploadCloud, Tag } from 'lucide-react';
import { formatPrice } from '../utils/format';
import { ConfirmModal } from './ConfirmModal';

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

  const filteredArticles = articles.filter((art) => {
    const matchesCat = filterCat === 'Toutes' || (art.categorie && art.categorie.toLowerCase() === filterCat.toLowerCase());
    const matchesSearch = art.nom.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          art.idArticle.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesAlert = !stockAlertOnly || art.stock <= 5;
    return matchesCat && matchesSearch && matchesAlert;
  });

  return (
    <div className="w-full min-h-full flex flex-col bg-slate-50 text-slate-800 p-3 sm:p-6 pb-20 sm:pb-8">
      
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

      {/* Search & Category Bar */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4 shrink-0">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher par nom ou identifiant (ex: ART-001)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-red-500 shadow-xs"
          />
        </div>

        <div className="flex space-x-1 overflow-x-auto pb-1 scrollbar-none">
          {filterCategories.map((c) => (
            <button
              key={c.nom}
              onClick={() => setFilterCat(c.nom)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center space-x-1 ${
                filterCat.toLowerCase() === c.nom.toLowerCase() ? 'bg-red-600 text-white shadow-xs' : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900'
              }`}
            >
              {c.emoji && <span className="text-xs">{c.emoji}</span>}
              <span>{c.nom}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Catalog Table & Cards Grid */}
      <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-1 xs:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
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

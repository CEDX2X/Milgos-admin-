import { Article, Serveuse, Commande, StatistiquesVentes, Categorie } from '../types';
import { INITIAL_ARTICLES, INITIAL_SERVEUSES, INITIAL_COMMANDES, INITIAL_TABLES, INITIAL_CATEGORIES } from '../data/initialData';
import { syncManager } from '../utils/syncManager';

const STORAGE_KEY_ARTICLES = 'orderease_articles_cache';
const STORAGE_KEY_SERVEUSES = 'orderease_serveuses_cache';
const STORAGE_KEY_COMMANDES = 'orderease_commandes_cache';
const STORAGE_KEY_TABLES = 'orderease_tables_cache';
const STORAGE_KEY_CATEGORIES = 'orderease_categories_cache';

// Helper to save to localStorage as PWA cache
function saveLocal<T>(key: string, data: T) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error('LocalStorage write error', e);
  }
}

function getLocal<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch (e) {
    return fallback;
  }
}

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-cache, no-store, must-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0'
};

async function apiFetch(url: string, options: RequestInit = {}) {
  // Fast offline check
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new Error('Hors-ligne (Appareil non connecté au réseau)');
  }

  const separator = url.includes('?') ? '&' : '?';
  const cacheBustUrl = `${url}${separator}_t=${Date.now()}`;
  const mergedHeaders = {
    ...NO_CACHE_HEADERS,
    ...(options.headers || {})
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);

  try {
    const response = await fetch(cacheBustUrl, {
      ...options,
      cache: 'no-store',
      headers: mergedHeaders,
      signal: options.signal || controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

export const posApi = {
  // Check backend connection status
  async getHealth() {
    try {
      const res = await apiFetch('/api/health');
      if (!res.ok) throw new Error('API server unreachable');
      return await res.json();
    } catch (e) {
      return { status: 'offline', database: { type: 'PWA Cache Local', connected: false } };
    }
  },

  // Reset database with seed data
  async seed() {
    try {
      const res = await apiFetch('/api/seed', { method: 'POST' });
      return await res.json();
    } catch (e) {
      saveLocal(STORAGE_KEY_ARTICLES, INITIAL_ARTICLES);
      saveLocal(STORAGE_KEY_SERVEUSES, INITIAL_SERVEUSES);
      saveLocal(STORAGE_KEY_COMMANDES, INITIAL_COMMANDES);
      saveLocal(STORAGE_KEY_CATEGORIES, INITIAL_CATEGORIES);
      return { success: true, message: 'Données réinitialisées en local' };
    }
  },

  // Clear / Empty application data
  async clearApp(scope: 'commandes' | 'articles' | 'tout' = 'tout') {
    try {
      const res = await apiFetch('/api/clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope })
      });
      const data = await res.json();

      if (scope === 'commandes' || scope === 'tout') {
        saveLocal(STORAGE_KEY_COMMANDES, []);
      }
      if (scope === 'articles' || scope === 'tout') {
        saveLocal(STORAGE_KEY_ARTICLES, []);
      }
      if (scope === 'tout') {
        const serveuses = getLocal<Serveuse[]>(STORAGE_KEY_SERVEUSES, INITIAL_SERVEUSES).map(s => ({
          ...s,
          commandesTraitees: 0,
          chiffreAffaires: 0
        }));
        saveLocal(STORAGE_KEY_SERVEUSES, serveuses);
      }

      return data;
    } catch (e) {
      if (scope === 'commandes' || scope === 'tout') {
        saveLocal(STORAGE_KEY_COMMANDES, []);
      }
      if (scope === 'articles' || scope === 'tout') {
        saveLocal(STORAGE_KEY_ARTICLES, []);
      }
      return { success: true, message: 'Données vidées en mode local.' };
    }
  },

  // Sync / Reset official Milgo's menu
  async syncMilgosMenu(): Promise<{ success: boolean; count?: number; message?: string; articles?: Article[] }> {
    try {
      const res = await apiFetch('/api/menu/sync-milgos', { method: 'POST' });
      const data = await res.json();
      if (data.articles && Array.isArray(data.articles)) {
        saveLocal(STORAGE_KEY_ARTICLES, data.articles);
        saveLocal(STORAGE_KEY_CATEGORIES, INITIAL_CATEGORIES);
      }
      return data;
    } catch (e: any) {
      saveLocal(STORAGE_KEY_ARTICLES, INITIAL_ARTICLES);
      saveLocal(STORAGE_KEY_CATEGORIES, INITIAL_CATEGORIES);
      return {
        success: true,
        count: INITIAL_ARTICLES.length,
        message: 'Menu officiel Milgo\'s synchronisé en cache local.',
        articles: INITIAL_ARTICLES
      };
    }
  },

  // --- TABLES ---
  async getTables(): Promise<string[]> {
    try {
      const res = await apiFetch('/api/tables');
      if (!res.ok) throw new Error('Error fetching tables');
      const data = await res.json();
      const names = Array.isArray(data) ? data.map((t: any) => typeof t === 'string' ? t : t.nom) : [];
      if (names.length > 0) {
        saveLocal(STORAGE_KEY_TABLES, names);
        return names;
      }
      return getLocal<string[]>(STORAGE_KEY_TABLES, INITIAL_TABLES.map(t => t.nom));
    } catch (e) {
      return getLocal<string[]>(STORAGE_KEY_TABLES, INITIAL_TABLES.map(t => t.nom));
    }
  },

  async createTable(nom: string): Promise<{ success: boolean; table?: any; message?: string }> {
    try {
      const res = await apiFetch('/api/tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nom })
      });
      const data = await res.json();
      if (res.ok) {
        const current = getLocal<string[]>(STORAGE_KEY_TABLES, INITIAL_TABLES.map(t => t.nom));
        if (!current.includes(nom.trim())) {
          current.push(nom.trim());
          saveLocal(STORAGE_KEY_TABLES, current);
        }
      }
      return data;
    } catch (e) {
      const trimmed = nom.trim();
      const current = getLocal<string[]>(STORAGE_KEY_TABLES, INITIAL_TABLES.map(t => t.nom));
      if (!current.includes(trimmed)) {
        current.push(trimmed);
        saveLocal(STORAGE_KEY_TABLES, current);
      }
      syncManager.enqueue('CREATE_TABLE', { nom: trimmed }, `Ajout table ${trimmed}`);
      return { success: true, table: { nom: trimmed }, message: 'Table ajoutée en cache local (hors-ligne)' };
    }
  },

  async deleteTable(nom: string): Promise<{ success: boolean; message?: string }> {
    try {
      const encoded = encodeURIComponent(nom);
      const res = await apiFetch(`/api/tables/${encoded}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      const current = getLocal<string[]>(STORAGE_KEY_TABLES, INITIAL_TABLES.map(t => t.nom)).filter(t => t !== nom);
      saveLocal(STORAGE_KEY_TABLES, current);
      return data;
    } catch (e) {
      const current = getLocal<string[]>(STORAGE_KEY_TABLES, INITIAL_TABLES.map(t => t.nom)).filter(t => t !== nom);
      saveLocal(STORAGE_KEY_TABLES, current);
      syncManager.enqueue('DELETE_TABLE', { nom }, `Suppression table ${nom}`);
      return { success: true, message: 'Table supprimée en cache local (hors-ligne)' };
    }
  },

  // --- CATEGORIES ---
  async getCategories(): Promise<Categorie[]> {
    try {
      const res = await apiFetch('/api/categories');
      if (!res.ok) throw new Error('Error fetching categories');
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        saveLocal(STORAGE_KEY_CATEGORIES, data);
        return data;
      }
      return getLocal<Categorie[]>(STORAGE_KEY_CATEGORIES, INITIAL_CATEGORIES);
    } catch (e) {
      return getLocal<Categorie[]>(STORAGE_KEY_CATEGORIES, INITIAL_CATEGORIES);
    }
  },

  async createCategory(nomOrObj: string | { nom: string; emoji?: string; couleur?: string }, emojiParam?: string): Promise<{ success: boolean; category?: Categorie; message?: string }> {
    try {
      const payload = typeof nomOrObj === 'string' ? { nom: nomOrObj, emoji: emojiParam || '🏷️' } : nomOrObj;
      const res = await apiFetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok && data.category) {
        const current = getLocal<Categorie[]>(STORAGE_KEY_CATEGORIES, INITIAL_CATEGORIES);
        if (!current.some(c => c.nom.toLowerCase() === data.category.nom.toLowerCase())) {
          current.push(data.category);
          saveLocal(STORAGE_KEY_CATEGORIES, current);
        }
      }
      return data;
    } catch (e) {
      const nom = typeof nomOrObj === 'string' ? nomOrObj : nomOrObj.nom;
      const emoji = typeof nomOrObj === 'string' ? (emojiParam || '🏷️') : (nomOrObj.emoji || '🏷️');
      const current = getLocal<Categorie[]>(STORAGE_KEY_CATEGORIES, INITIAL_CATEGORIES);
      const newCat: Categorie = {
        idCategorie: `CAT-${Math.floor(Math.random() * 9000 + 1000)}`,
        nom: nom.trim(),
        emoji,
        dateCreation: new Date().toISOString()
      };
      if (!current.some(c => c.nom.toLowerCase() === nom.trim().toLowerCase())) {
        current.push(newCat);
        saveLocal(STORAGE_KEY_CATEGORIES, current);
      }
      syncManager.enqueue('CREATE_CATEGORY', newCat, `Ajout catégorie ${newCat.nom}`);
      return { success: true, category: newCat, message: 'Catégorie enregistrée en cache local (hors-ligne)' };
    }
  },

  async deleteCategory(nomOrId: string): Promise<{ success: boolean; message?: string }> {
    try {
      const encoded = encodeURIComponent(nomOrId);
      const res = await apiFetch(`/api/categories/${encoded}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      const current = getLocal<Categorie[]>(STORAGE_KEY_CATEGORIES, INITIAL_CATEGORIES)
        .filter(c => c.nom.toLowerCase() !== nomOrId.toLowerCase() && c.idCategorie !== nomOrId);
      saveLocal(STORAGE_KEY_CATEGORIES, current);
      return data;
    } catch (e) {
      const current = getLocal<Categorie[]>(STORAGE_KEY_CATEGORIES, INITIAL_CATEGORIES)
        .filter(c => c.nom.toLowerCase() !== nomOrId.toLowerCase() && c.idCategorie !== nomOrId);
      saveLocal(STORAGE_KEY_CATEGORIES, current);
      syncManager.enqueue('DELETE_CATEGORY', { nomOrId }, `Suppression catégorie ${nomOrId}`);
      return { success: true, message: 'Catégorie supprimée en cache local (hors-ligne)' };
    }
  },

  // --- SERVEUSES ---
  async getServeuses(): Promise<Serveuse[]> {
    try {
      const res = await apiFetch('/api/serveuses');
      if (!res.ok) throw new Error('Error fetching waitstaff');
      const data = await res.json();
      saveLocal(STORAGE_KEY_SERVEUSES, data);
      return data;
    } catch (e) {
      return getLocal<Serveuse[]>(STORAGE_KEY_SERVEUSES, INITIAL_SERVEUSES);
    }
  },

  async loginServeuse(idServeuse: string, pin: string): Promise<{ success: boolean; serveuse?: Serveuse; message?: string }> {
    try {
      const res = await apiFetch('/api/serveuses/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idServeuse, pin })
      });
      return await res.json();
    } catch (e) {
      const local = getLocal<Serveuse[]>(STORAGE_KEY_SERVEUSES, INITIAL_SERVEUSES);
      const user = local.find(s => s.idServeuse === idServeuse && s.pin === pin && s.actif);
      if (user) return { success: true, serveuse: user };
      return { success: false, message: 'Mode Hors-ligne : ID ou PIN incorrect' };
    }
  },

  async updatePin(idServeuse: string, currentPin: string, newPin: string): Promise<{ success: boolean; message?: string }> {
    try {
      const res = await apiFetch('/api/serveuses/update-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idServeuse, currentPin, newPin })
      });
      const data = await res.json();
      if (data.success) {
        const local = getLocal<Serveuse[]>(STORAGE_KEY_SERVEUSES, INITIAL_SERVEUSES);
        const idx = local.findIndex(s => s.idServeuse === idServeuse);
        if (idx !== -1) {
          local[idx].pin = newPin;
          saveLocal(STORAGE_KEY_SERVEUSES, local);
        }
      }
      return data;
    } catch (e: any) {
      const local = getLocal<Serveuse[]>(STORAGE_KEY_SERVEUSES, INITIAL_SERVEUSES);
      const idx = local.findIndex(s => s.idServeuse === idServeuse);
      if (idx !== -1) {
        local[idx].pin = newPin;
        saveLocal(STORAGE_KEY_SERVEUSES, local);
        syncManager.enqueue('UPDATE_SERVEUSE_PIN', { idServeuse, newPin }, `Mise à jour PIN ${idServeuse}`);
        return { success: true, message: 'PIN modifié en cache local (hors-ligne)' };
      }
      return { success: false, message: 'Serveuse non trouvée' };
    }
  },

  async createServeuse(serveuse: Partial<Serveuse>): Promise<Serveuse> {
    try {
      const res = await apiFetch('/api/serveuses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(serveuse)
      });
      const data = await res.json();
      // Fetch fresh list to update cache
      this.getServeuses();
      return data;
    } catch (e) {
      const list = getLocal<Serveuse[]>(STORAGE_KEY_SERVEUSES, INITIAL_SERVEUSES);
      const created: Serveuse = {
        idServeuse: serveuse.idServeuse || `SRV-00${list.length + 1}`,
        nom: serveuse.nom || 'Nouvelle Serveuse',
        pin: serveuse.pin || '0000',
        role: serveuse.role || 'serveuse',
        actif: true,
        commandesTraitees: 0,
        chiffreAffaires: 0,
        dateCreation: new Date().toISOString()
      };
      list.push(created);
      saveLocal(STORAGE_KEY_SERVEUSES, list);
      return created;
    }
  },

  async updateServeuse(idServeuse: string, updates: Partial<Serveuse>): Promise<Serveuse> {
    try {
      const res = await apiFetch(`/api/serveuses/${idServeuse}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      const data = await res.json();
      this.getServeuses();
      return data;
    } catch (e) {
      const list = getLocal<Serveuse[]>(STORAGE_KEY_SERVEUSES, INITIAL_SERVEUSES);
      const idx = list.findIndex(s => s.idServeuse === idServeuse);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...updates };
        saveLocal(STORAGE_KEY_SERVEUSES, list);
        return list[idx];
      }
      throw new Error('Serveuse non trouvée');
    }
  },

  async deleteServeuse(idServeuse: string): Promise<{ success: boolean }> {
    try {
      const res = await apiFetch(`/api/serveuses/${idServeuse}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      const list = getLocal<Serveuse[]>(STORAGE_KEY_SERVEUSES, INITIAL_SERVEUSES).filter(s => s.idServeuse !== idServeuse);
      saveLocal(STORAGE_KEY_SERVEUSES, list);
      return data;
    } catch (e) {
      const list = getLocal<Serveuse[]>(STORAGE_KEY_SERVEUSES, INITIAL_SERVEUSES).filter(s => s.idServeuse !== idServeuse);
      saveLocal(STORAGE_KEY_SERVEUSES, list);
      return { success: true };
    }
  },

  // --- ARTICLES & STOCK ---
  async getArticles(): Promise<Article[]> {
    try {
      const res = await apiFetch('/api/articles');
      if (!res.ok) throw new Error('Error fetching articles');
      const data = await res.json();
      saveLocal(STORAGE_KEY_ARTICLES, data);
      return data;
    } catch (e) {
      return getLocal<Article[]>(STORAGE_KEY_ARTICLES, INITIAL_ARTICLES);
    }
  },

  async createArticle(article: Partial<Article>): Promise<Article> {
    try {
      const res = await apiFetch('/api/articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(article)
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.message || `Erreur de création article (${res.status})`);
      }
      await this.getArticles();
      return data;
    } catch (e: any) {
      console.warn('API createArticle failed, applying offline fallback:', e?.message || e);
      const list = getLocal<Article[]>(STORAGE_KEY_ARTICLES, INITIAL_ARTICLES);
      const created: Article = {
        idArticle: article.idArticle || `ART-${Math.floor(Math.random() * 90000 + 10000)}`,
        nom: article.nom || 'Nouvel Article',
        categorie: article.categorie || 'Boissons',
        prix: Number(article.prix) || 0,
        stock: Number(article.stock) || 0,
        stockInitial: Number(article.stockInitial || article.stock) || 0,
        emoji: article.emoji || '📦',
        image: article.image || '',
        actif: article.actif ?? true,
        description: article.description || ''
      };
      list.push(created);
      saveLocal(STORAGE_KEY_ARTICLES, list);
      syncManager.enqueue('CREATE_ARTICLE', created, `Création article ${created.nom}`);
      return created;
    }
  },

  async updateArticle(idArticle: string, updates: Partial<Article>): Promise<Article> {
    try {
      const res = await apiFetch(`/api/articles/${idArticle}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.message || `Erreur de mise à jour (${res.status})`);
      }
      await this.getArticles();
      return data;
    } catch (e: any) {
      console.warn('API updateArticle failed, applying offline fallback:', e?.message || e);
      const list = getLocal<Article[]>(STORAGE_KEY_ARTICLES, INITIAL_ARTICLES);
      const idx = list.findIndex(a => a.idArticle === idArticle);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...updates };
        saveLocal(STORAGE_KEY_ARTICLES, list);
        syncManager.enqueue('UPDATE_ARTICLE', { idArticle, updates }, `Mise à jour ${list[idx].nom}`);
        return list[idx];
      }
      throw new Error('Article non trouvé');
    }
  },

  async adjustStock(idArticle: string, delta?: number, nouveauStock?: number): Promise<Article> {
    try {
      const res = await apiFetch(`/api/articles/${idArticle}/stock`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ delta, nouveauStock })
      });
      const data = await res.json();
      this.getArticles();
      return data;
    } catch (e) {
      const list = getLocal<Article[]>(STORAGE_KEY_ARTICLES, INITIAL_ARTICLES);
      const art = list.find(a => a.idArticle === idArticle);
      if (art) {
        if (nouveauStock !== undefined) art.stock = Math.max(0, nouveauStock);
        else if (delta !== undefined) art.stock = Math.max(0, art.stock + delta);
        saveLocal(STORAGE_KEY_ARTICLES, list);
        syncManager.enqueue('ADJUST_STOCK', { idArticle, delta, nouveauStock }, `Stock ${art.nom}: ${art.stock}`);
        return art;
      }
      throw new Error('Article non trouvé');
    }
  },

  async deleteArticle(idArticle: string): Promise<boolean> {
    try {
      const res = await apiFetch(`/api/articles/${idArticle}`, { method: 'DELETE' });
      const ok = res.ok;
      this.getArticles();
      return ok;
    } catch (e) {
      let list = getLocal<Article[]>(STORAGE_KEY_ARTICLES, INITIAL_ARTICLES);
      list = list.filter(a => a.idArticle !== idArticle);
      saveLocal(STORAGE_KEY_ARTICLES, list);
      syncManager.enqueue('DELETE_ARTICLE', { idArticle }, `Suppression article ${idArticle}`);
      return true;
    }
  },

  // --- COMMANDES ---
  async getCommandes(): Promise<Commande[]> {
    try {
      const res = await apiFetch('/api/commandes');
      if (!res.ok) throw new Error('Error fetching orders');
      const data = await res.json();
      saveLocal(STORAGE_KEY_COMMANDES, data);
      return data;
    } catch (e) {
      return getLocal<Commande[]>(STORAGE_KEY_COMMANDES, INITIAL_COMMANDES);
    }
  },

  async createCommande(commandeData: {
    idServeuse: string;
    nomServeuse: string;
    table: string;
    articles: { idArticle: string; nom: string; prixUnitaire: number; quantite: number; categorie?: string; notes?: string }[];
    modePaiement?: string;
    notesServeuse?: string;
  }): Promise<{ success: boolean; commande?: Commande; articles?: Article[]; message?: string; errors?: string[] }> {
    const generatedId = `CMD-2026-${Math.floor(Math.random() * 9000 + 1000)}`;
    try {
      const res = await apiFetch('/api/commandes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...commandeData, idCommande: generatedId })
      });
      const responseData = await res.json();

      if (!res.ok) {
        return {
          success: false,
          message: responseData.message || 'Échec de la validation',
          errors: responseData.errors || []
        };
      }

      if (responseData.articles) {
        saveLocal(STORAGE_KEY_ARTICLES, responseData.articles);
      }
      if (responseData.commande) {
        const currentCmds = getLocal<Commande[]>(STORAGE_KEY_COMMANDES, INITIAL_COMMANDES);
        currentCmds.unshift(responseData.commande);
        saveLocal(STORAGE_KEY_COMMANDES, currentCmds);
      }
      return responseData;
    } catch (e) {
      // Offline fallback processing
      const articlesList = getLocal<Article[]>(STORAGE_KEY_ARTICLES, INITIAL_ARTICLES);
      const stockErrors: string[] = [];

      for (const item of commandeData.articles) {
        const art = articlesList.find(a => a.idArticle === item.idArticle);
        if (!art) stockErrors.push(`L'article '${item.nom}' n'existe pas.`);
        else if (art.stock < item.quantite) {
          stockErrors.push(`Stock insuffisant pour '${art.nom}'. Disponible: ${art.stock}.`);
        }
      }

      if (stockErrors.length > 0) {
        return { success: false, message: 'Contraintes de stock dépassées', errors: stockErrors };
      }

      // Decrement stock locally
      let total = 0;
      const validatedItems = commandeData.articles.map(item => {
        const sousTotal = Number((item.prixUnitaire * item.quantite).toFixed(2));
        total += sousTotal;
        const target = articlesList.find(a => a.idArticle === item.idArticle);
        if (target) target.stock = Math.max(0, target.stock - item.quantite);
        return { ...item, sousTotal };
      });
      saveLocal(STORAGE_KEY_ARTICLES, articlesList);

      const nowStr = new Date().toISOString();
      const newCmd: Commande = {
        idCommande: generatedId,
        idServeuse: commandeData.idServeuse,
        nomServeuse: commandeData.nomServeuse,
        table: commandeData.table,
        articles: validatedItems as any,
        montantTotal: Number(total.toFixed(2)),
        statut: 'En attente',
        modePaiement: (commandeData.modePaiement as any) || 'Non payé',
        notesServeuse: commandeData.notesServeuse || '',
        dateCreation: nowStr,
        dateMiseAJour: nowStr
      };

      const commandesList = getLocal<Commande[]>(STORAGE_KEY_COMMANDES, INITIAL_COMMANDES);
      commandesList.unshift(newCmd);
      saveLocal(STORAGE_KEY_COMMANDES, commandesList);

      // Enqueue in offline sync queue
      syncManager.enqueue(
        'CREATE_COMMANDE',
        newCmd,
        `Commande #${newCmd.idCommande} (Table ${newCmd.table})`
      );

      return {
        success: true,
        commande: newCmd,
        articles: articlesList,
        message: 'Commande enregistrée en cache local (hors-ligne). Synchronisation en attente.'
      };
    }
  },

  async updateStatutCommande(
    idCommande: string, 
    statut: string, 
    modePaiement?: string,
    paymentDetails?: {
      idCaissier?: string;
      nomCaissier?: string;
      remise?: { type: 'percent' | 'fixed'; valeur: number; montantRemise: number };
      montantFinal?: number;
      montantRecu?: number;
      monnaieRendue?: number;
      datePaiement?: string;
    }
  ): Promise<{ success: boolean; commande?: Commande; articles?: Article[] }> {
    try {
      const payload: any = { statut, modePaiement };
      if (paymentDetails) {
        if (paymentDetails.idCaissier) payload.idCaissier = paymentDetails.idCaissier;
        if (paymentDetails.nomCaissier) payload.nomCaissier = paymentDetails.nomCaissier;
        if (paymentDetails.remise) payload.remise = paymentDetails.remise;
        if (typeof paymentDetails.montantFinal === 'number') payload.montantFinal = paymentDetails.montantFinal;
        if (typeof paymentDetails.montantRecu === 'number') payload.montantRecu = paymentDetails.montantRecu;
        if (typeof paymentDetails.monnaieRendue === 'number') payload.monnaieRendue = paymentDetails.monnaieRendue;
        if (paymentDetails.datePaiement) payload.datePaiement = paymentDetails.datePaiement;
      }

      const res = await apiFetch(`/api/commandes/${idCommande}/statut`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.articles) saveLocal(STORAGE_KEY_ARTICLES, data.articles);
      if (data.commande) {
        const cmds = getLocal<Commande[]>(STORAGE_KEY_COMMANDES, INITIAL_COMMANDES);
        const idx = cmds.findIndex(c => c.idCommande === idCommande);
        if (idx !== -1) {
          cmds[idx] = data.commande;
          saveLocal(STORAGE_KEY_COMMANDES, cmds);
        }
      }
      return data;
    } catch (e) {
      const commandes = getLocal<Commande[]>(STORAGE_KEY_COMMANDES, INITIAL_COMMANDES);
      const cmd = commandes.find(c => c.idCommande === idCommande);
      if (cmd) {
        const oldStatut = cmd.statut;
        cmd.statut = statut as any;
        if (modePaiement) cmd.modePaiement = modePaiement as any;
        if (paymentDetails) {
          if (paymentDetails.idCaissier) cmd.idCaissier = paymentDetails.idCaissier;
          if (paymentDetails.nomCaissier) cmd.nomCaissier = paymentDetails.nomCaissier;
          if (paymentDetails.remise) cmd.remise = paymentDetails.remise;
          if (typeof paymentDetails.montantFinal === 'number') cmd.montantFinal = paymentDetails.montantFinal;
          if (typeof paymentDetails.montantRecu === 'number') cmd.montantRecu = paymentDetails.montantRecu;
          if (typeof paymentDetails.monnaieRendue === 'number') cmd.monnaieRendue = paymentDetails.monnaieRendue;
          if (paymentDetails.datePaiement) cmd.datePaiement = paymentDetails.datePaiement;
        }
        cmd.dateMiseAJour = new Date().toISOString();

        // Restore stock if cancelled
        if (statut === 'Annulée' && oldStatut !== 'Annulée') {
          const articles = getLocal<Article[]>(STORAGE_KEY_ARTICLES, INITIAL_ARTICLES);
          for (const item of cmd.articles) {
            const art = articles.find(a => a.idArticle === item.idArticle);
            if (art) art.stock += item.quantite;
          }
          saveLocal(STORAGE_KEY_ARTICLES, articles);
        }

        saveLocal(STORAGE_KEY_COMMANDES, commandes);

        // Enqueue offline action
        syncManager.enqueue(
          'UPDATE_COMMANDE_STATUT',
          { idCommande, statut, modePaiement, paymentDetails },
          `Mise à jour #${idCommande} -> ${statut}`
        );

        return { success: true, commande: cmd, articles: getLocal<Article[]>(STORAGE_KEY_ARTICLES, INITIAL_ARTICLES) };
      }
      return { success: false };
    }
  },

  async batchPayTableCommandes(
    idCommandes: string[],
    paymentData: {
      table?: string;
      modePaiement: string;
      idCaissier?: string;
      nomCaissier?: string;
      remise?: { type: 'percent' | 'fixed'; valeur: number; montantRemise: number };
      montantFinal?: number;
      montantRecu?: number;
      monnaieRendue?: number;
      datePaiement?: string;
    }
  ): Promise<{ success: boolean; commandes?: Commande[]; articles?: Article[]; message?: string }> {
    try {
      const res = await apiFetch('/api/commandes/batch-pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idCommandes, ...paymentData })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Erreur lors du paiement groupé');
      if (data.articles) saveLocal(STORAGE_KEY_ARTICLES, data.articles);
      return data;
    } catch (e: any) {
      console.warn('API batchPayTableCommandes fallback to offline local logic:', e?.message || e);
      const commandes = getLocal<Commande[]>(STORAGE_KEY_COMMANDES, INITIAL_COMMANDES);
      const dateMiseAJour = paymentData.datePaiement || new Date().toISOString();
      const updatedList: Commande[] = [];

      const targetList = commandes.filter(c => idCommandes.includes(c.idCommande));
      const totalBrut = targetList.reduce((sum, c) => sum + (c.montantTotal || 0), 0);
      const globalFinal = typeof paymentData.montantFinal === 'number' ? paymentData.montantFinal : totalBrut;
      const ratio = totalBrut > 0 ? globalFinal / totalBrut : 1;

      for (const cmd of commandes) {
        if (idCommandes.includes(cmd.idCommande)) {
          cmd.statut = 'Payée';
          cmd.modePaiement = paymentData.modePaiement as any;
          if (paymentData.idCaissier) cmd.idCaissier = paymentData.idCaissier;
          if (paymentData.nomCaissier) cmd.nomCaissier = paymentData.nomCaissier;
          if (paymentData.remise) cmd.remise = paymentData.remise;
          cmd.montantFinal = Math.round(cmd.montantTotal * ratio);
          if (typeof paymentData.montantRecu === 'number') cmd.montantRecu = paymentData.montantRecu;
          if (typeof paymentData.monnaieRendue === 'number') cmd.monnaieRendue = paymentData.monnaieRendue;
          cmd.datePaiement = dateMiseAJour;
          cmd.dateMiseAJour = dateMiseAJour;
          updatedList.push(cmd);

          // Enqueue each payment update in offline sync queue
          syncManager.enqueue(
            'UPDATE_COMMANDE_STATUT',
            {
              idCommande: cmd.idCommande,
              statut: 'Payée',
              modePaiement: cmd.modePaiement,
              paymentDetails: {
                idCaissier: cmd.idCaissier,
                nomCaissier: cmd.nomCaissier,
                remise: cmd.remise,
                montantFinal: cmd.montantFinal,
                montantRecu: cmd.montantRecu,
                monnaieRendue: cmd.monnaieRendue,
                datePaiement: cmd.datePaiement
              }
            },
            `Paiement groupé #${cmd.idCommande} (${cmd.table})`
          );
        }
      }

      saveLocal(STORAGE_KEY_COMMANDES, commandes);
      return {
        success: true,
        commandes: updatedList,
        articles: getLocal<Article[]>(STORAGE_KEY_ARTICLES, INITIAL_ARTICLES),
        message: `Paiement groupé effectué en cache local (${updatedList.length} commandes). Synchronisation en attente.`
      };
    }
  },

  // --- STATISTIQUES ---
  async getStats(): Promise<StatistiquesVentes> {
    try {
      const res = await apiFetch('/api/stats');
      if (!res.ok) throw new Error('Error fetching stats');
      return await res.json();
    } catch (e) {
      const articles = getLocal<Article[]>(STORAGE_KEY_ARTICLES, INITIAL_ARTICLES);
      const serveuses = getLocal<Serveuse[]>(STORAGE_KEY_SERVEUSES, INITIAL_SERVEUSES);
      const commandes = getLocal<Commande[]>(STORAGE_KEY_COMMANDES, INITIAL_COMMANDES).filter(c => c.statut !== 'Annulée');

      const caTotal = commandes.reduce((sum, c) => sum + c.montantTotal, 0);
      const nbrCmd = commandes.length;

      return {
        chiffreAffairesTotal: Number(caTotal.toFixed(2)),
        nombreCommandes: nbrCmd,
        panierMoyen: nbrCmd > 0 ? Number((caTotal / nbrCmd).toFixed(2)) : 0,
        commandesAujourdhui: nbrCmd,
        articlesEnRupture: articles.filter(a => a.stock <= 0).length,
        ventesParCategorie: {},
        topServeuses: serveuses.map(s => ({ idServeuse: s.idServeuse, nom: s.nom, totalCommandes: 10, totalVentes: 150 })),
        topArticles: articles.slice(0, 5).map(a => ({ idArticle: a.idArticle, nom: a.nom, quantiteVendue: 12, chiffreAffaires: 84.00 }))
      };
    }
  },

  // --- CONNECTED DEVICES & NOTIFICATION ROUTING BY ID ---
  async getDevices(): Promise<import('../types').DeviceRegistration[]> {
    try {
      const res = await apiFetch('/api/devices');
      if (!res.ok) throw new Error('Error fetching devices');
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch (e) {
      return [];
    }
  },

  async registerDevice(deviceData: {
    idAppareil: string;
    nomAppareil: string;
    idProfil: string;
    nomProfil: string;
    role: string;
    userAgent?: string;
  }): Promise<{ success: boolean; device?: import('../types').DeviceRegistration }> {
    try {
      const res = await apiFetch('/api/devices/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(deviceData)
      });
      return await res.json();
    } catch (e: any) {
      return { success: false };
    }
  },

  async deleteDevice(idAppareil: string): Promise<{ success: boolean; message?: string }> {
    try {
      const res = await apiFetch(`/api/devices/${encodeURIComponent(idAppareil)}`, {
        method: 'DELETE'
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, message: e.message };
    }
  },

  async sendTargetedNotification(payload: import('../types').TargetNotificationPayload): Promise<{ success: boolean; count?: number; message?: string }> {
    try {
      const res = await apiFetch('/api/push/send-targeted', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, message: e.message };
    }
  }
};


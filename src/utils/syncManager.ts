import { Article, Commande, Serveuse, Categorie } from '../types';

export interface SyncAction {
  id: string;
  type:
    | 'CREATE_COMMANDE'
    | 'UPDATE_COMMANDE_STATUT'
    | 'CREATE_ARTICLE'
    | 'UPDATE_ARTICLE'
    | 'ADJUST_STOCK'
    | 'DELETE_ARTICLE'
    | 'CREATE_TABLE'
    | 'DELETE_TABLE'
    | 'CREATE_CATEGORY'
    | 'DELETE_CATEGORY'
    | 'UPDATE_SERVEUSE_PIN';
  payload: any;
  timestamp: string;
  label?: string;
  retryCount: number;
}

export interface SyncState {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncTime: string | null;
  queue: SyncAction[];
}

const STORAGE_KEY_QUEUE = 'orderease_offline_sync_queue';
const STORAGE_KEY_LAST_SYNC = 'orderease_last_sync_timestamp';

const STORAGE_KEY_ARTICLES = 'orderease_articles_cache';
const STORAGE_KEY_SERVEUSES = 'orderease_serveuses_cache';
const STORAGE_KEY_COMMANDES = 'orderease_commandes_cache';
const STORAGE_KEY_TABLES = 'orderease_tables_cache';
const STORAGE_KEY_CATEGORIES = 'orderease_categories_cache';

let isSyncInProgress = false;
const listeners = new Set<(state: SyncState) => void>();

function getStoredQueue(): SyncAction[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_QUEUE);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Failed to read offline sync queue:', e);
    return [];
  }
}

function saveStoredQueue(queue: SyncAction[]) {
  try {
    localStorage.setItem(STORAGE_KEY_QUEUE, JSON.stringify(queue));
  } catch (e) {
    console.error('Failed to write offline sync queue:', e);
  }
}

function notifyListeners() {
  const state = syncManager.getState();
  listeners.forEach(cb => {
    try {
      cb(state);
    } catch (e) {
      console.error('Sync listener error:', e);
    }
  });
}

export const syncManager = {
  getState(): SyncState {
    const queue = getStoredQueue();
    const lastSyncTime = localStorage.getItem(STORAGE_KEY_LAST_SYNC);
    return {
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      isSyncing: isSyncInProgress,
      pendingCount: queue.length,
      lastSyncTime,
      queue
    };
  },

  getQueue(): SyncAction[] {
    return getStoredQueue();
  },

  enqueue(
    type: SyncAction['type'],
    payload: any,
    label?: string
  ): SyncAction {
    const queue = getStoredQueue();
    const action: SyncAction = {
      id: `SYNC-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      type,
      payload,
      timestamp: new Date().toISOString(),
      label: label || `Action ${type}`,
      retryCount: 0
    };

    queue.push(action);
    saveStoredQueue(queue);
    console.log(`[Offline Sync] Action enqueued (${type}):`, label, action.id);

    // Dispatch global event for in-app toast / banner
    window.dispatchEvent(
      new CustomEvent('orderease_offline_action_queued', { detail: { action, pendingCount: queue.length } })
    );

    notifyListeners();

    // If online, attempt to drain the queue in the background
    if (navigator.onLine) {
      setTimeout(() => {
        this.processSyncQueue();
      }, 500);
    }

    return action;
  },

  clearQueue() {
    saveStoredQueue([]);
    notifyListeners();
  },

  async processSyncQueue(): Promise<{ success: boolean; count: number; error?: string }> {
    if (isSyncInProgress) {
      return { success: false, count: 0, error: 'Synchronisation déjà en cours' };
    }

    const queue = getStoredQueue();
    if (queue.length === 0) {
      return { success: true, count: 0 };
    }

    if (!navigator.onLine) {
      return { success: false, count: 0, error: 'Appareil actuellement hors-ligne' };
    }

    isSyncInProgress = true;
    notifyListeners();

    try {
      console.log(`[Offline Sync] Sending ${queue.length} actions to /api/sync/batch...`);
      const response = await fetch('/api/sync/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        },
        body: JSON.stringify({ actions: queue })
      });

      if (!response.ok) {
        throw new Error(`Serveur indisponible (HTTP ${response.status})`);
      }

      const data = await response.json();

      if (data.success) {
        const count = queue.length;
        // Clear synced items
        saveStoredQueue([]);
        const nowIso = new Date().toISOString();
        localStorage.setItem(STORAGE_KEY_LAST_SYNC, nowIso);

        // Update local caches with fresh server data if provided
        if (data.freshData) {
          if (data.freshData.articles) {
            localStorage.setItem(STORAGE_KEY_ARTICLES, JSON.stringify(data.freshData.articles));
          }
          if (data.freshData.commandes) {
            localStorage.setItem(STORAGE_KEY_COMMANDES, JSON.stringify(data.freshData.commandes));
          }
          if (data.freshData.tables) {
            localStorage.setItem(STORAGE_KEY_TABLES, JSON.stringify(data.freshData.tables));
          }
          if (data.freshData.categories) {
            localStorage.setItem(STORAGE_KEY_CATEGORIES, JSON.stringify(data.freshData.categories));
          }
          if (data.freshData.serveuses) {
            localStorage.setItem(STORAGE_KEY_SERVEUSES, JSON.stringify(data.freshData.serveuses));
          }
        }

        console.log(`[Offline Sync] ✅ Successfully synced ${count} actions!`);

        // Dispatch sync completion event
        window.dispatchEvent(
          new CustomEvent('orderease_sync_complete', {
            detail: {
              count,
              timestamp: nowIso,
              freshData: data.freshData
            }
          })
        );

        isSyncInProgress = false;
        notifyListeners();
        return { success: true, count };
      } else {
        throw new Error(data.message || 'Erreur inconnue lors de la synchronisation');
      }
    } catch (err: any) {
      console.warn('[Offline Sync] Sync failed:', err.message);
      // Increment retryCount for queued items
      const updatedQueue = getStoredQueue().map(item => ({
        ...item,
        retryCount: (item.retryCount || 0) + 1
      }));
      saveStoredQueue(updatedQueue);

      isSyncInProgress = false;
      notifyListeners();
      return { success: false, count: 0, error: err.message };
    }
  },

  subscribe(callback: (state: SyncState) => void): () => void {
    listeners.add(callback);
    callback(this.getState());
    return () => {
      listeners.delete(callback);
    };
  }
};

// Setup background network event listeners and periodic heartbeat
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('[Offline Sync] 🌐 Connection restored! Triggering auto-sync...');
    notifyListeners();
    setTimeout(() => {
      syncManager.processSyncQueue();
    }, 1000);
  });

  window.addEventListener('offline', () => {
    console.log('[Offline Sync] 📴 Device is now offline. Local cache mode enabled.');
    notifyListeners();
  });

  // Periodic heartbeat every 25 seconds
  setInterval(() => {
    if (navigator.onLine && syncManager.getQueue().length > 0 && !isSyncInProgress) {
      syncManager.processSyncQueue();
    }
  }, 25000);
}

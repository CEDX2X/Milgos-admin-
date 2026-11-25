import { useState, useEffect } from 'react';
import { syncManager, SyncState } from './syncManager';

export function useSyncStatus(): SyncState & {
  triggerSync: () => Promise<{ success: boolean; count: number; error?: string }>;
  clearQueue: () => void;
} {
  const [state, setState] = useState<SyncState>(syncManager.getState());

  useEffect(() => {
    const unsubscribe = syncManager.subscribe(setState);
    return unsubscribe;
  }, []);

  return {
    ...state,
    triggerSync: () => syncManager.processSyncQueue(),
    clearQueue: () => syncManager.clearQueue()
  };
}

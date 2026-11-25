import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, CheckCircle2, AlertTriangle, ChevronDown, ChevronUp, Clock, CloudUpload } from 'lucide-react';
import { useSyncStatus } from '../utils/useSyncStatus';

interface OfflineSyncBannerProps {
  onDataRefreshed?: () => void;
}

export const OfflineSyncBanner: React.FC<OfflineSyncBannerProps> = ({ onDataRefreshed }) => {
  const { isOnline, isSyncing, pendingCount, lastSyncTime, queue, triggerSync } = useSyncStatus();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'info' | 'warning'>('info');

  // Listen to sync events for dynamic toasts
  useEffect(() => {
    const handleSyncComplete = (e: any) => {
      const { count } = e.detail || {};
      setToastMessage(`${count || 0} modification(s) synchronisée(s) avec succès avec la base de données !`);
      setToastType('success');
      setShowToast(true);
      if (onDataRefreshed) onDataRefreshed();
      setTimeout(() => setShowToast(false), 4500);
    };

    const handleActionQueued = (e: any) => {
      const { action } = e.detail || {};
      if (!isOnline) {
        setToastMessage(`Sauvegardé en cache local : ${action?.label || 'Action enregistrée'}`);
        setToastType('info');
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3500);
      }
    };

    window.addEventListener('orderease_sync_complete', handleSyncComplete);
    window.addEventListener('orderease_offline_action_queued', handleActionQueued);

    return () => {
      window.removeEventListener('orderease_sync_complete', handleSyncComplete);
      window.removeEventListener('orderease_offline_action_queued', handleActionQueued);
    };
  }, [isOnline, onDataRefreshed]);

  const handleManualSync = async () => {
    const res = await triggerSync();
    if (res.success && res.count > 0) {
      if (onDataRefreshed) onDataRefreshed();
    }
  };

  // If online and no pending items, show brief toast if active, else null
  if (isOnline && pendingCount === 0 && !showToast) {
    return null;
  }

  return (
    <>
      {/* Toast Notification */}
      {showToast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 animate-bounce">
          <div className={`px-4 py-2.5 rounded-2xl shadow-xl flex items-center space-x-2 text-xs sm:text-sm font-bold border ${
            toastType === 'success' 
              ? 'bg-emerald-600 text-white border-emerald-400' 
              : 'bg-slate-900/95 text-white border-slate-700'
          }`}>
            {toastType === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-200 shrink-0" />
            ) : (
              <CloudUpload className="w-4 h-4 text-amber-300 shrink-0" />
            )}
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Persistent Banner when offline or with pending items */}
      <div className={`w-full transition-all border-b z-20 ${
        !isOnline
          ? 'bg-amber-500 text-slate-950 border-amber-600'
          : isSyncing
          ? 'bg-blue-600 text-white border-blue-700'
          : 'bg-orange-500 text-white border-orange-600'
      }`}>
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center space-x-2">
              {!isOnline ? (
                <WifiOff className="w-4 h-4 shrink-0 animate-pulse text-slate-950" />
              ) : isSyncing ? (
                <RefreshCw className="w-4 h-4 shrink-0 animate-spin" />
              ) : (
                <CloudUpload className="w-4 h-4 shrink-0" />
              )}
              
              <div className="text-xs sm:text-sm font-bold">
                {!isOnline ? (
                  <span>
                    <strong>Mode Hors-Ligne Actif :</strong> L'application reste utilisable. Vos actions sont sécurisées localement.
                    {pendingCount > 0 && <span className="ml-1 underline">({pendingCount} en attente)</span>}
                  </span>
                ) : isSyncing ? (
                  <span>Synchronisation des données hors-ligne avec le serveur en cours...</span>
                ) : (
                  <span>
                    Connexion rétablie ! <strong>{pendingCount} modification(s)</strong> prêtes à être envoyées.
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-2 ml-auto">
              {isOnline && pendingCount > 0 && (
                <button
                  onClick={handleManualSync}
                  disabled={isSyncing}
                  className="px-3 py-1 bg-white text-slate-900 hover:bg-slate-100 rounded-lg text-xs font-black transition-all shadow-xs flex items-center space-x-1.5 active:scale-95 touch-manipulation"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-blue-600' : 'text-slate-700'}`} />
                  <span>{isSyncing ? 'Envoi...' : 'Synchroniser maintenant'}</span>
                </button>
              )}

              {pendingCount > 0 && (
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="px-2 py-1 bg-black/10 hover:bg-black/20 rounded-lg text-xs font-bold transition-all flex items-center space-x-1"
                  title="Voir le détail de la file d'attente"
                >
                  <span>Détails</span>
                  {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>
          </div>

          {/* Collapsible Queue Details */}
          {isExpanded && pendingCount > 0 && (
            <div className="mt-2 pt-2 border-t border-black/10 text-xs">
              <div className="font-bold mb-1 opacity-90">File des opérations en attente de synchronisation :</div>
              <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
                {queue.map((item, idx) => (
                  <div key={item.id || idx} className="bg-black/15 rounded-lg px-2.5 py-1 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Clock className="w-3 h-3 opacity-70" />
                      <span className="font-medium">{item.label || item.type}</span>
                    </div>
                    <span className="text-[10px] font-mono opacity-80">
                      {new Date(item.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

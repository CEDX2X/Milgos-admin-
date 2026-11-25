import React, { useState, useMemo } from 'react';
import { Commande, StatutCommande, ModePaiement, Serveuse, Article } from '../types';
import { 
  ChefHat, Wine, Clock, CheckCircle2, DollarSign, XCircle, User, MapPin, ShoppingBag,
  AlertCircle, RefreshCw, Filter, UtensilsCrossed, Sparkles, Coffee 
} from 'lucide-react';
import { formatPrice } from '../utils/format';
import { ConfirmModal } from './ConfirmModal';
import { filterOrderForRole, isDrinkItem, isFoodItem } from '../utils/orderCategory';

interface KitchenDisplayViewProps {
  commandes: Commande[];
  articles?: Article[];
  currentServeuse?: Serveuse | null;
  onUpdateStatut: (idCommande: string, statut: StatutCommande, modePaiement?: ModePaiement) => Promise<void>;
}

export const KitchenDisplayView: React.FC<KitchenDisplayViewProps> = ({
  commandes,
  articles = [],
  currentServeuse,
  onUpdateStatut,
}) => {
  const [filterStatut, setFilterStatut] = useState<string>('Tous');
  const [adminDepartmentFilter, setAdminDepartmentFilter] = useState<'all' | 'cuisine' | 'bar'>('all');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [orderToCancel, setOrderToCancel] = useState<Commande | null>(null);

  const role = currentServeuse?.role || 'serveuse';
  const isBarman = role === 'barman';
  const isCuisine = role === 'cuisine';
  const isAdmin = role === 'admin';
  const isServeuse = role === 'serveuse';
  const isCaissier = role === 'caissier';

  // Filter orders relevant for the active role
  const roleRelevantCommandes = useMemo(() => {
    return commandes.filter((cmd) => {
      if (isBarman) {
        return filterOrderForRole(cmd, 'barman', articles).hasItemsForRole;
      }
      if (isCuisine) {
        return filterOrderForRole(cmd, 'cuisine', articles).hasItemsForRole;
      }
      // Admin / Serveuse: apply department sub-filter if selected
      if (adminDepartmentFilter === 'bar') {
        return filterOrderForRole(cmd, 'barman', articles).hasItemsForRole;
      }
      if (adminDepartmentFilter === 'cuisine') {
        return filterOrderForRole(cmd, 'cuisine', articles).hasItemsForRole;
      }
      return true;
    });
  }, [commandes, isBarman, isCuisine, adminDepartmentFilter, articles]);

  const readyOrdersCount = useMemo(() => {
    return roleRelevantCommandes.filter(c => c.statut === 'Prête').length;
  }, [roleRelevantCommandes]);

  const STATUS_COLUMNS: { id: StatutCommande; label: string; color: string }[] = [
    { id: 'En attente', label: '1. En attente', color: 'text-amber-600' },
    { id: 'En cuisine', label: isBarman ? '2. Au Bar (Préparation)' : '2. En cuisine (Préparation)', color: 'text-sky-600' },
    { id: 'Prête', label: '3. 🔔 Prête à Servir', color: 'text-purple-600' },
    { id: 'Servie', label: '4. ✅ Servie à Table', color: 'text-blue-600' },
    { id: 'Payée', label: '5. 💰 Payée', color: 'text-emerald-600' }
  ];

  const FILTER_OPTIONS = [
    { id: 'Tous', label: 'Toutes', count: roleRelevantCommandes.length },
    { id: 'En attente', label: 'En attente', count: roleRelevantCommandes.filter(c => c.statut === 'En attente').length },
    { id: 'En cuisine', label: isBarman ? 'En prépa Bar' : 'En cuisine', count: roleRelevantCommandes.filter(c => c.statut === 'En cuisine').length },
    { id: 'Prête', label: '🔔 Prêtes', count: readyOrdersCount },
    { id: 'Servie', label: 'Servies', count: roleRelevantCommandes.filter(c => c.statut === 'Servie').length },
    { id: 'Payée', label: 'Payées', count: roleRelevantCommandes.filter(c => c.statut === 'Payée').length },
    { id: 'Annulée', label: 'Annulées', count: roleRelevantCommandes.filter(c => c.statut === 'Annulée').length },
  ];

  const filteredCommandes = roleRelevantCommandes.filter((c) => {
    if (filterStatut === 'Tous') return true;
    return c.statut === filterStatut;
  });

  const handleStatusChange = async (idCommande: string, nextStatus: StatutCommande, modePaiement?: ModePaiement) => {
    setProcessingId(idCommande);
    try {
      await onUpdateStatut(idCommande, nextStatus, modePaiement);
    } finally {
      setProcessingId(null);
    }
  };

  const getElapsedTime = (dateStr: string) => {
    const diffMs = new Date().getTime() - new Date(dateStr).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'À l’instant';
    if (mins < 60) return `Il y a ${mins} min`;
    const hours = Math.floor(mins / 60);
    return `Il y a ${hours}h ${mins % 60}m`;
  };

  const getStatusBadgeStyle = (statut: string) => {
    switch (statut) {
      case 'En attente':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'En cuisine':
        return 'bg-sky-100 text-sky-800 border-sky-300';
      case 'Prête':
        return 'bg-purple-100 text-purple-800 border-purple-300 font-extrabold animate-pulse';
      case 'Servie':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'Payée':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'Annulée':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  };

  const renderOrderCard = (cmd: Commande) => {
    const roleFilter = isBarman ? 'barman' : isCuisine ? 'cuisine' : (adminDepartmentFilter === 'bar' ? 'barman' : adminDepartmentFilter === 'cuisine' ? 'cuisine' : 'admin');
    const orderInfo = filterOrderForRole(cmd, roleFilter as any, articles);
    const displayedItems = orderInfo.roleArticles;

    const isOrderReady = cmd.statut === 'Prête';

    return (
      <div
        key={cmd.idCommande}
        className={`bg-white border rounded-2xl p-3.5 sm:p-4 shadow-xs space-y-3 relative transition-all flex flex-col justify-between ${
          isOrderReady 
            ? 'border-purple-400 dark:border-purple-600 ring-2 ring-purple-400/30 shadow-md shadow-purple-500/10' 
            : 'border-slate-200 hover:border-red-300'
        }`}
      >
        <div>
          {/* Card Header */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div>
              <div className="flex items-center space-x-1.5">
                {cmd.table === 'À emporter' ? (
                  <ShoppingBag className="w-4 h-4 text-amber-600 shrink-0" />
                ) : (
                  <MapPin className="w-4 h-4 text-red-600 shrink-0" />
                )}
                <span className={`font-extrabold text-sm sm:text-base ${cmd.table === 'À emporter' ? 'text-amber-700' : 'text-slate-900'}`}>{cmd.table}</span>
                {isOrderReady && (
                  <span className="text-[10px] bg-purple-600 text-white font-extrabold px-2 py-0.5 rounded-full flex items-center space-x-1 animate-pulse">
                    <span>🔔 PRÊTE !</span>
                  </span>
                )}
              </div>
              <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                {cmd.idCommande}
              </div>
            </div>

            <div className="text-right">
              <div className="text-xs sm:text-sm font-black text-red-600">
                {isBarman || isCuisine ? (
                  <span>{formatPrice(orderInfo.roleSubtotal)}</span>
                ) : (
                  formatPrice(cmd.montantTotal)
                )}
              </div>
              <div className="text-[10px] text-slate-400 flex items-center justify-end space-x-1 mt-0.5">
                <Clock className="w-3 h-3 text-slate-400" />
                <span>{getElapsedTime(cmd.dateCreation)}</span>
              </div>
            </div>
          </div>

          {/* Department / Role tag banner */}
          {isBarman && (
            <div className="mt-2 bg-cyan-50 border border-cyan-200 text-cyan-800 px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center justify-between">
              <span className="flex items-center space-x-1">
                <Wine className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
                <span>Boissons à servir ({displayedItems.reduce((acc, i) => acc + (i.quantite || 1), 0)} art.)</span>
              </span>
              <span className="font-mono text-[10px]">{formatPrice(orderInfo.roleSubtotal)}</span>
            </div>
          )}

          {isCuisine && (
            <div className="mt-2 bg-amber-50 border border-amber-200 text-amber-900 px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center justify-between">
              <span className="flex items-center space-x-1">
                <ChefHat className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>Plats à préparer ({displayedItems.reduce((acc, i) => acc + (i.quantite || 1), 0)} art.)</span>
              </span>
              <span className="font-mono text-[10px]">{formatPrice(orderInfo.roleSubtotal)}</span>
            </div>
          )}

          {/* Serveuse Traceability Badge */}
          <div className="mt-2 bg-slate-50 px-2.5 py-1 rounded-lg text-[11px] text-slate-600 flex items-center justify-between border border-slate-100">
            <span className="flex items-center space-x-1">
              <User className="w-3 h-3 text-red-500" />
              <span>Serveuse :</span>
            </span>
            <strong className="text-slate-900 truncate max-w-[130px]">{cmd.nomServeuse} ({cmd.idServeuse})</strong>
          </div>

          {/* Status Badge */}
          <div className="mt-2 flex items-center justify-between">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStatusBadgeStyle(cmd.statut)}`}>
              {cmd.statut === 'Prête' ? '🔔 PRÊTE À SERVIR' : cmd.statut}
            </span>
            {cmd.modePaiement && cmd.modePaiement !== 'Non payé' && (
              <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                {cmd.modePaiement}
              </span>
            )}
          </div>

          {/* Article Items breakdown */}
          <div className="mt-3 space-y-1 bg-slate-50/70 p-2.5 rounded-xl border border-slate-100">
            {displayedItems.map((item, idx) => {
              const isDrink = isDrinkItem(item, articles);
              return (
                <div key={idx} className="flex justify-between items-center text-xs py-0.5">
                  <div className="flex items-center space-x-1.5 min-w-0 pr-2">
                    {/* Badge for Admin/Serveuse view to distinguish drinks and food */}
                    {(isAdmin || isServeuse) && (
                      <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded shrink-0 border ${
                        isDrink 
                          ? 'bg-cyan-50 text-cyan-700 border-cyan-200' 
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {isDrink ? '🍹 Bar' : '🍳 Cuisine'}
                      </span>
                    )}
                    <span className="text-slate-800 truncate font-medium">
                      <strong className="text-red-600 font-extrabold mr-1">{item.quantite}×</strong>
                      {item.nom}
                    </span>
                  </div>
                  <span className="text-slate-500 text-[11px] whitespace-nowrap font-mono">
                    {formatPrice(item.sousTotal || (item.prixUnitaire * item.quantite))}
                  </span>
                </div>
              );
            })}
          </div>

          {cmd.notesServeuse && (
            <div className="mt-2 bg-amber-50 border border-amber-200 p-2 rounded-lg text-[11px] text-amber-900 flex items-start space-x-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600" />
              <span>Note: {cmd.notesServeuse}</span>
            </div>
          )}
        </div>

        {/* Action buttons strictly tailored to Role */}
        <div className="pt-2 mt-3 border-t border-slate-100 flex flex-col gap-1.5">
          
          {/* ========================================================================= */}
          {/* 1. CUISINIER & BARMAN ACTIONS (Strict: Prep & Ready ONLY)                  */}
          {/* ========================================================================= */}
          {(isCuisine || isBarman) && (
            <>
              {cmd.statut === 'En attente' && (
                <button
                  disabled={processingId === cmd.idCommande}
                  onClick={() => handleStatusChange(cmd.idCommande, 'En cuisine')}
                  className={`w-full py-2.5 ${
                    isBarman ? 'bg-cyan-600 hover:bg-cyan-700' : 'bg-red-600 hover:bg-red-700'
                  } text-white font-bold text-xs rounded-xl flex items-center justify-center space-x-1.5 transition-colors touch-manipulation active:scale-95 shadow-sm ${
                    processingId === cmd.idCommande ? 'opacity-70 cursor-not-allowed' : ''
                  }`}
                >
                  {processingId === cmd.idCommande ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Mise en préparation...</span>
                    </>
                  ) : (
                    <>
                      {isBarman ? <Wine className="w-4 h-4" /> : <ChefHat className="w-4 h-4" />}
                      <span>{isBarman ? '🍹 Lancer la préparation Bar' : '👨‍🍳 Lancer la préparation Cuisine'}</span>
                    </>
                  )}
                </button>
              )}

              {cmd.statut === 'En cuisine' && (
                <button
                  disabled={processingId === cmd.idCommande}
                  onClick={() => handleStatusChange(cmd.idCommande, 'Prête')}
                  className={`w-full py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-black text-xs rounded-xl flex items-center justify-center space-x-2 transition-all touch-manipulation active:scale-95 shadow-md shadow-purple-600/20 ${
                    processingId === cmd.idCommande ? 'opacity-70 cursor-not-allowed' : ''
                  }`}
                >
                  {processingId === cmd.idCommande ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Alerte serveuse en cours...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>🔔 {isBarman ? 'Boissons PRÊTES ! (Alerter Serveuse)' : 'Plats PRÊTS ! (Alerter Serveuse)'}</span>
                    </>
                  )}
                </button>
              )}

              {cmd.statut === 'Prête' && (
                <div className="py-2.5 px-3 bg-purple-50 border border-purple-200 text-purple-900 rounded-xl text-xs font-bold text-center flex items-center justify-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-600 animate-ping"></span>
                  <span>⏳ Prête au passe-plat • En attente de récupération par la serveuse</span>
                </div>
              )}

              {cmd.statut === 'Servie' && (
                <div className="py-2 px-2.5 bg-blue-50 border border-blue-200 text-blue-800 rounded-xl text-[11px] font-bold text-center flex items-center justify-center space-x-1.5">
                  <span>✅ Commande servie à table par la serveuse</span>
                </div>
              )}

              {cmd.statut === 'Payée' && (
                <div className="py-2 px-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-[11px] font-bold text-center flex items-center justify-center space-x-1.5">
                  <span>💰 Commande payée & encaissée</span>
                </div>
              )}
            </>
          )}

          {/* ========================================================================= */}
          {/* 2. SERVEUSE ACTIONS (Serve at table only - No payment permission)         */}
          {/* ========================================================================= */}
          {isServeuse && (
            <>
              {cmd.statut === 'Prête' && (
                <button
                  disabled={processingId === cmd.idCommande}
                  onClick={() => handleStatusChange(cmd.idCommande, 'Servie')}
                  className={`w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-sm rounded-xl flex items-center justify-center space-x-2 transition-all touch-manipulation active:scale-95 shadow-lg shadow-emerald-600/25 ${
                    processingId === cmd.idCommande ? 'opacity-70 cursor-not-allowed' : ''
                  }`}
                >
                  {processingId === cmd.idCommande ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Validation du service...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5 text-white" />
                      <span>✅ Marquer comme SERVIE à table</span>
                    </>
                  )}
                </button>
              )}

              {(cmd.statut === 'En cuisine' || cmd.statut === 'En attente') && (
                <button
                  disabled={processingId === cmd.idCommande}
                  onClick={() => handleStatusChange(cmd.idCommande, 'Servie')}
                  className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center justify-center space-x-1.5 transition-colors touch-manipulation active:scale-95"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                  <span>Marquer directement comme Servie</span>
                </button>
              )}

              {cmd.statut === 'Servie' && (
                <div className="py-2 px-2.5 bg-blue-50 border border-blue-200 text-blue-800 rounded-xl text-xs font-bold text-center flex items-center justify-center space-x-1.5">
                  <CheckCircle2 className="w-4 h-4 text-blue-600" />
                  <span>✅ Servie à table aux clients</span>
                </div>
              )}

              {cmd.statut === 'Payée' ? (
                <div className="py-2 px-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold text-center flex items-center justify-center space-x-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>💰 Commande payée & encaissée à la caisse</span>
                </div>
              ) : cmd.statut !== 'Annulée' ? (
                <div className="py-1.5 px-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 rounded-xl text-[11px] font-medium text-center flex items-center justify-center space-x-1">
                  <span>⏳ En attente de paiement à la Caisse</span>
                </div>
              ) : null}

              {cmd.statut !== 'Annulée' && cmd.statut !== 'Payée' && (
                <button
                  disabled={processingId === cmd.idCommande}
                  onClick={() => setOrderToCancel(cmd)}
                  className="w-full py-1.5 bg-slate-100 hover:bg-red-50 text-slate-500 hover:text-red-600 font-semibold text-[11px] rounded-lg border border-slate-200 transition-colors flex items-center justify-center space-x-1 touch-manipulation"
                >
                  <XCircle className="w-3 h-3" />
                  <span>Annuler commande</span>
                </button>
              )}
            </>
          )}

          {/* ========================================================================= */}
          {/* 3. CAISSIER ACTIONS (Cashier Privilege: Payment & Cashing in)              */}
          {/* ========================================================================= */}
          {isCaissier && (
            <>
              {(cmd.statut === 'Servie' || cmd.statut === 'Prête' || cmd.statut === 'En cuisine' || cmd.statut === 'En attente') && (
                <button
                  disabled={processingId === cmd.idCommande}
                  onClick={() => handleStatusChange(cmd.idCommande, 'Payée', 'Espèces')}
                  className={`w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl flex items-center justify-center space-x-1.5 transition-colors touch-manipulation active:scale-95 shadow-md shadow-emerald-600/20 ${
                    processingId === cmd.idCommande ? 'opacity-70 cursor-not-allowed' : ''
                  }`}
                >
                  {processingId === cmd.idCommande ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Encaissement en cours...</span>
                    </>
                  ) : (
                    <>
                      <DollarSign className="w-4 h-4" />
                      <span>💰 Encaisser la commande (Caisse)</span>
                    </>
                  )}
                </button>
              )}

              {cmd.statut === 'Payée' && (
                <div className="py-2 px-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold text-center flex items-center justify-center space-x-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>💰 Commande encaissée avec succès</span>
                </div>
              )}

              {cmd.statut !== 'Annulée' && cmd.statut !== 'Payée' && (
                <button
                  disabled={processingId === cmd.idCommande}
                  onClick={() => setOrderToCancel(cmd)}
                  className="w-full py-1.5 bg-slate-100 hover:bg-red-50 text-slate-500 hover:text-red-600 font-semibold text-[11px] rounded-lg border border-slate-200 transition-colors flex items-center justify-center space-x-1 touch-manipulation"
                >
                  <XCircle className="w-3 h-3" />
                  <span>Annuler commande</span>
                </button>
              )}
            </>
          )}

          {/* ========================================================================= */}
          {/* 4. ADMIN ACTIONS (Supervision / Full Access)                              */}
          {/* ========================================================================= */}
          {isAdmin && (
            <>
              {cmd.statut === 'En attente' && (
                <button
                  disabled={processingId === cmd.idCommande}
                  onClick={() => handleStatusChange(cmd.idCommande, 'En cuisine')}
                  className="w-full py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl flex items-center justify-center space-x-1.5"
                >
                  <ChefHat className="w-3.5 h-3.5" />
                  <span>Lancer préparation (Admin)</span>
                </button>
              )}

              {cmd.statut === 'En cuisine' && (
                <button
                  disabled={processingId === cmd.idCommande}
                  onClick={() => handleStatusChange(cmd.idCommande, 'Prête')}
                  className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl flex items-center justify-center space-x-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Marquer comme PRÊTE (Admin)</span>
                </button>
              )}

              {(cmd.statut === 'Prête' || cmd.statut === 'En cuisine' || cmd.statut === 'En attente') && (
                <button
                  disabled={processingId === cmd.idCommande}
                  onClick={() => handleStatusChange(cmd.idCommande, 'Servie')}
                  className="w-full py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl flex items-center justify-center space-x-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Marquer comme SERVIE à table</span>
                </button>
              )}

              {(cmd.statut === 'Servie' || cmd.statut === 'Prête' || cmd.statut === 'En cuisine' || cmd.statut === 'En attente') && (
                <button
                  disabled={processingId === cmd.idCommande}
                  onClick={() => handleStatusChange(cmd.idCommande, 'Payée', 'Espèces')}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center justify-center space-x-1.5"
                >
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>Encaisser commande (Admin)</span>
                </button>
              )}

              {cmd.statut !== 'Annulée' && cmd.statut !== 'Payée' && (
                <button
                  disabled={processingId === cmd.idCommande}
                  onClick={() => setOrderToCancel(cmd)}
                  className="w-full py-1.5 bg-slate-100 hover:bg-red-50 text-slate-500 hover:text-red-600 font-semibold text-[11px] rounded-lg border border-slate-200 transition-colors flex items-center justify-center space-x-1 touch-manipulation"
                >
                  <XCircle className="w-3 h-3" />
                  <span>Annuler commande</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-[1750px] mx-auto min-h-full flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 p-3 sm:p-5 lg:p-6 pb-20 sm:pb-8">
      
      {/* Ready Orders Alert Banner for Waitstaff */}
      {readyOrdersCount > 0 && (
        <div className="mb-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-3 sm:p-4 rounded-2xl shadow-md flex items-center justify-between animate-pulse">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <span className="text-xl">🔔</span>
            </div>
            <div>
              <div className="font-black text-xs sm:text-sm">
                {readyOrdersCount} commande{readyOrdersCount > 1 ? 's' : ''} PRÊTE{readyOrdersCount > 1 ? 'S' : ''} au passe-plat / bar !
              </div>
              <p className="text-[11px] text-purple-100 font-medium">
                La cuisine/bar a terminé la préparation. La serveuse peut venir récupérer et servir à table.
              </p>
            </div>
          </div>
          <button
            onClick={() => setFilterStatut('Prête')}
            className="px-3.5 py-2 bg-white text-purple-700 hover:bg-purple-50 font-black text-xs rounded-xl shadow-xs shrink-0 transition-all active:scale-95 cursor-pointer"
          >
            Voir les commandes prêtes
          </button>
        </div>
      )}

      {/* Top Header & Filters Bar */}
      <div className="flex flex-col gap-3 mb-4 shrink-0 bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2.5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center border shrink-0 ${
              isBarman 
                ? 'bg-cyan-50 dark:bg-cyan-950/60 border-cyan-200 dark:border-cyan-800 text-cyan-600 dark:text-cyan-400'
                : isCuisine 
                ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400'
                : 'bg-red-50 dark:bg-red-950/60 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400'
            }`}>
              {isBarman ? <Wine className="w-5 h-5" /> : isCuisine ? <ChefHat className="w-5 h-5" /> : <UtensilsCrossed className="w-5 h-5" />}
            </div>

            <div>
              <div className="flex items-center space-x-2">
                <h2 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
                  {isBarman 
                    ? 'Écran de Préparation Bar (Boissons)' 
                    : isCuisine 
                    ? 'Écran de Préparation Cuisine (Nourriture)' 
                    : 'Suivi KDS des Commandes'}
                </h2>
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                  isBarman 
                    ? 'bg-cyan-100 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800' 
                    : isCuisine 
                    ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800' 
                    : 'bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800'
                }`}>
                  {roleRelevantCommandes.length} {isBarman ? 'au bar' : isCuisine ? 'en cuisine' : 'en cours'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isBarman 
                  ? 'Réception des boissons • Marquez en préparation puis PRÊT' 
                  : isCuisine 
                  ? 'Réception des plats • Marquez en préparation puis PRÊT' 
                  : 'Vue globale en direct • Glissez horizontalement entre les colonnes'}
              </p>
            </div>
          </div>

          {/* Department Filter Toggle for Admin and Serveuse */}
          {(isAdmin || isServeuse) && (
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 space-x-1 self-start sm:self-auto">
              <button
                onClick={() => setAdminDepartmentFilter('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  adminDepartmentFilter === 'all'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Toutes
              </button>
              <button
                onClick={() => setAdminDepartmentFilter('cuisine')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center space-x-1 ${
                  adminDepartmentFilter === 'cuisine'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <ChefHat className="w-3.5 h-3.5" />
                <span>Cuisine</span>
              </button>
              <button
                onClick={() => setAdminDepartmentFilter('bar')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center space-x-1 ${
                  adminDepartmentFilter === 'bar'
                    ? 'bg-cyan-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Wine className="w-3.5 h-3.5" />
                <span>Bar</span>
              </button>
            </div>
          )}
        </div>

        {/* Unified Status filter pills */}
        <div className="flex space-x-1.5 overflow-x-auto pb-1 scrollbar-none border-t border-slate-100 dark:border-slate-800 pt-2.5">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setFilterStatut(opt.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap touch-manipulation ${
                filterStatut === opt.id
                  ? isBarman ? 'bg-cyan-600 text-white shadow-xs' : 'bg-red-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>{opt.id === 'Tous' ? '📊 Vue Kanban (5 cols)' : opt.label}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                filterStatut === opt.id ? 'bg-black/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}>
                {opt.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content View */}
      {filterStatut === 'Tous' ? (
        /* HORIZONTAL SCROLLABLE KANBAN BOARD FOR "TOUTES" - Adaptive 5 columns on 2xl screens */
        <div className="flex-1 flex flex-row 2xl:grid 2xl:grid-cols-5 gap-3.5 sm:gap-4 overflow-x-auto 2xl:overflow-x-visible pb-4 pt-1 snap-x snap-mandatory scrollbar-thin">
          {STATUS_COLUMNS.map((col) => {
            const colOrders = roleRelevantCommandes.filter((c) => c.statut === col.id);
            const isColReady = col.id === 'Prête';

            return (
              <div 
                key={col.id} 
                className={`w-[85vw] sm:w-[350px] md:w-[330px] lg:w-[310px] xl:w-[330px] 2xl:w-full shrink-0 snap-start flex flex-col rounded-2xl border overflow-hidden bg-slate-100/90 dark:bg-slate-900 h-full max-h-full ${
                  isColReady 
                    ? 'border-purple-300 dark:border-purple-800/80 ring-1 ring-purple-300/50' 
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                
                {/* Column Header */}
                <div className={`p-3 border-b flex items-center justify-between shrink-0 ${
                  isColReady 
                    ? 'bg-purple-600 text-white border-purple-500' 
                    : 'bg-white dark:bg-slate-850 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-800'
                }`}>
                  <h3 className={`font-bold text-xs uppercase tracking-wider ${
                    isColReady ? 'text-white flex items-center space-x-1' : 'text-slate-800 dark:text-slate-200'
                  }`}>
                    <span>{col.label}</span>
                  </h3>
                  <span className={`font-extrabold text-xs px-2 py-0.5 rounded-full ${
                    isColReady 
                      ? 'bg-white text-purple-700' 
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200'
                  }`}>
                    {colOrders.length}
                  </span>
                </div>

                {/* Column Cards Container with reduced height for empty states */}
                <div className="flex-1 overflow-y-auto p-2.5 sm:p-3 space-y-3">
                  {colOrders.length === 0 ? (
                    <div className="py-4 px-3 rounded-xl bg-white/70 dark:bg-slate-800/60 border border-dashed border-slate-200 dark:border-slate-700/80 text-center text-slate-400 dark:text-slate-500 text-xs font-medium flex items-center justify-center space-x-1.5">
                      <span>Aucune commande</span>
                    </div>
                  ) : (
                    colOrders.map(renderOrderCard)
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* SINGLE STATUS CATEGORY GRID VIEW */
        <div className="flex-1 flex flex-col space-y-4 overflow-y-auto pr-1">
          <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className={`text-xs font-extrabold px-3 py-1 rounded-full border ${getStatusBadgeStyle(filterStatut)}`}>
                {filterStatut}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                {filteredCommandes.length} commande(s) affichée(s)
              </span>
            </div>
            <button
              onClick={() => setFilterStatut('Tous')}
              className="text-xs font-bold text-red-600 hover:text-red-800 dark:text-red-400 hover:underline"
            >
              ← Voir toutes les rubriques (Vue Kanban)
            </button>
          </div>

          {filteredCommandes.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 text-center my-auto">
              {isBarman ? (
                <Wine className="w-10 h-10 text-cyan-400 mx-auto mb-2 opacity-60" />
              ) : (
                <ChefHat className="w-10 h-10 text-slate-400 mx-auto mb-2 opacity-60" />
              )}
              <h3 className="text-slate-800 dark:text-white font-bold text-sm">
                Aucune commande {isBarman ? 'de boissons' : isCuisine ? 'de nourriture' : ''} dans le statut "{filterStatut}"
              </h3>
              <p className="text-slate-400 text-xs mt-1">
                Les nouvelles commandes s'afficheront ici automatiquement en temps réel.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3.5 sm:gap-4">
              {filteredCommandes.map(renderOrderCard)}
            </div>
          )}
        </div>
      )}

      {/* CONFIRMATION MODAL FOR ORDER CANCELLATION */}
      <ConfirmModal
        isOpen={!!orderToCancel}
        title="Annuler la commande ?"
        variant="danger"
        icon="warning"
        confirmText="Oui, Annuler la commande"
        cancelText="Conserver la commande"
        isLoading={!!processingId}
        onConfirm={async () => {
          if (!orderToCancel) return;
          const targetId = orderToCancel.idCommande;
          setOrderToCancel(null);
          await handleStatusChange(targetId, 'Annulée');
        }}
        onCancel={() => setOrderToCancel(null)}
        message={
          <div className="space-y-2">
            <p>
              Êtes-vous sûr de vouloir annuler cette commande ?
            </p>
            {orderToCancel && (
              <div className="bg-white border border-slate-200 p-3 rounded-xl space-y-1 text-slate-800 font-medium">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">ID Commande :</span>
                  <span className="font-mono font-bold text-red-600">{orderToCancel.idCommande}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Table :</span>
                  <span className="font-bold text-slate-900">{orderToCancel.table}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Serveuse :</span>
                  <span className="font-bold text-slate-900">{orderToCancel.nomServeuse}</span>
                </div>
                <div className="flex justify-between items-center text-xs font-black pt-1.5 border-t border-slate-100">
                  <span>Montant :</span>
                  <span className="text-red-600">{formatPrice(orderToCancel.montantTotal)}</span>
                </div>
              </div>
            )}
          </div>
        }
      />

    </div>
  );
};

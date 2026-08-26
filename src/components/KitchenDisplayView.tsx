import React, { useState } from 'react';
import { Commande, StatutCommande, ModePaiement, Serveuse } from '../types';
import { ChefHat, Clock, CheckCircle2, DollarSign, XCircle, User, MapPin, AlertCircle, RefreshCw } from 'lucide-react';
import { formatPrice } from '../utils/format';
import { ConfirmModal } from './ConfirmModal';

interface KitchenDisplayViewProps {
  commandes: Commande[];
  currentServeuse?: Serveuse | null;
  onUpdateStatut: (idCommande: string, statut: StatutCommande, modePaiement?: ModePaiement) => Promise<void>;
}

export const KitchenDisplayView: React.FC<KitchenDisplayViewProps> = ({
  commandes,
  currentServeuse,
  onUpdateStatut,
}) => {
  const [filterStatut, setFilterStatut] = useState<string>('Tous');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [orderToCancel, setOrderToCancel] = useState<Commande | null>(null);

  const canModifyStatus = currentServeuse?.role === 'cuisine' || currentServeuse?.role === 'admin';

  const STATUS_COLUMNS: { id: StatutCommande; label: string; color: string; bg: string }[] = [
    { id: 'En attente', label: 'En attente', color: 'text-amber-600', bg: 'bg-amber-950/40 border-amber-800/60' },
    { id: 'En cuisine', label: 'En cuisine / Préparation', color: 'text-sky-600', bg: 'bg-sky-950/40 border-sky-800/60' },
    { id: 'Servie', label: 'Servie en table', color: 'text-purple-600', bg: 'bg-purple-950/40 border-purple-800/60' },
    { id: 'Payée', label: 'Payée & Encaissée', color: 'text-emerald-600', bg: 'bg-emerald-950/40 border-emerald-800/60' }
  ];

  const FILTER_OPTIONS = [
    { id: 'Tous', label: 'Toutes', count: commandes.length },
    { id: 'En attente', label: 'En attente', count: commandes.filter(c => c.statut === 'En attente').length },
    { id: 'En cuisine', label: 'En cuisine', count: commandes.filter(c => c.statut === 'En cuisine').length },
    { id: 'Servie', label: 'Servie', count: commandes.filter(c => c.statut === 'Servie').length },
    { id: 'Payée', label: 'Payées', count: commandes.filter(c => c.statut === 'Payée').length },
    { id: 'Annulée', label: 'Annulées', count: commandes.filter(c => c.statut === 'Annulée').length },
  ];

  const filteredCommandes = commandes.filter((c) => {
    if (filterStatut === 'Tous') return true;
    return c.statut === filterStatut;
  });

  const handleStatusChange = async (idCommande: string, nextStatus: StatutCommande, modePaiement?: ModePaiement) => {
    setProcessingId(idCommande);
    await onUpdateStatut(idCommande, nextStatus, modePaiement);
    setProcessingId(null);
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
      case 'Servie':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'Payée':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'Annulée':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  };

  const renderOrderCard = (cmd: Commande) => (
    <div
      key={cmd.idCommande}
      className="bg-white border border-slate-200 hover:border-red-300 rounded-2xl p-3.5 sm:p-4 shadow-xs space-y-3 relative transition-all flex flex-col justify-between"
    >
      <div>
        {/* Card Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <div>
            <div className="flex items-center space-x-1.5">
              <MapPin className="w-4 h-4 text-red-600 shrink-0" />
              <span className="font-extrabold text-sm sm:text-base text-slate-900">{cmd.table}</span>
            </div>
            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
              {cmd.idCommande}
            </div>
          </div>

          <div className="text-right">
            <div className="text-xs sm:text-sm font-black text-red-600">
              {formatPrice(cmd.montantTotal)}
            </div>
            <div className="text-[10px] text-slate-400 flex items-center justify-end space-x-1 mt-0.5">
              <Clock className="w-3 h-3 text-slate-400" />
              <span>{getElapsedTime(cmd.dateCreation)}</span>
            </div>
          </div>
        </div>

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
            {cmd.statut}
          </span>
          {cmd.modePaiement && cmd.modePaiement !== 'Non payé' && (
            <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
              {cmd.modePaiement}
            </span>
          )}
        </div>

        {/* Article Items breakdown */}
        <div className="mt-3 space-y-1 bg-slate-50/50 p-2 rounded-xl border border-slate-100">
          {cmd.articles.map((item, idx) => (
            <div key={idx} className="flex justify-between items-center text-xs">
              <span className="text-slate-800 truncate pr-2 font-medium">
                <strong className="text-red-600 font-extrabold mr-1.5">{item.quantite}×</strong> {item.nom}
              </span>
              <span className="text-slate-400 text-[11px] whitespace-nowrap font-mono">{formatPrice(item.sousTotal)}</span>
            </div>
          ))}
        </div>

        {cmd.notesServeuse && (
          <div className="mt-2 bg-amber-50 border border-amber-200 p-2 rounded-lg text-[11px] text-amber-900 flex items-start space-x-1.5">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600" />
            <span>Note: {cmd.notesServeuse}</span>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="pt-2 mt-3 border-t border-slate-100 flex flex-col gap-1.5">
        {!canModifyStatus ? (
          <div className="text-center py-1.5 px-2 bg-slate-100 border border-slate-200 rounded-xl text-[10px] font-bold text-slate-500">
            Consultation seule (Changement statut réservé Cuisinier / Admin)
          </div>
        ) : (
          <>
            {cmd.statut === 'En attente' && (
              <button
                disabled={processingId === cmd.idCommande}
                onClick={() => handleStatusChange(cmd.idCommande, 'En cuisine')}
                className={`w-full py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl flex items-center justify-center space-x-1.5 transition-colors touch-manipulation active:scale-95 shadow-xs ${
                  processingId === cmd.idCommande ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              >
                {processingId === cmd.idCommande ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Mise à jour en base...</span>
                  </>
                ) : (
                  <>
                    <ChefHat className="w-3.5 h-3.5" />
                    <span>Passer en cuisine</span>
                  </>
                )}
              </button>
            )}

            {cmd.statut === 'En cuisine' && (
              <button
                disabled={processingId === cmd.idCommande}
                onClick={() => handleStatusChange(cmd.idCommande, 'Servie')}
                className={`w-full py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl flex items-center justify-center space-x-1.5 transition-colors touch-manipulation active:scale-95 shadow-xs ${
                  processingId === cmd.idCommande ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              >
                {processingId === cmd.idCommande ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Mise à jour en base...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Marquer comme servie</span>
                  </>
                )}
              </button>
            )}

            {(cmd.statut === 'Servie' || cmd.statut === 'En cuisine' || cmd.statut === 'En attente') && (
              <button
                disabled={processingId === cmd.idCommande}
                onClick={() => handleStatusChange(cmd.idCommande, 'Payée', 'Espèces')}
                className={`w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center justify-center space-x-1.5 transition-colors touch-manipulation active:scale-95 shadow-xs ${
                  processingId === cmd.idCommande ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              >
                {processingId === cmd.idCommande ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Mise à jour en base...</span>
                  </>
                ) : (
                  <>
                    <DollarSign className="w-3.5 h-3.5" />
                    <span>Encaisser commande</span>
                  </>
                )}
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

  return (
    <div className="w-full min-h-full flex flex-col bg-slate-50 text-slate-800 p-3 sm:p-6 pb-20 sm:pb-8">
      
      {/* Top Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 shrink-0 bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center space-x-2">
          <ChefHat className="w-5 h-5 text-red-600 shrink-0" />
          <h2 className="font-extrabold text-sm sm:text-base text-slate-900">Suivi des Commandes & Cuisine</h2>
          <span className="bg-red-50 text-red-700 text-xs px-2.5 py-0.5 rounded-full font-bold border border-red-200">
            {commandes.length} au total
          </span>
        </div>

        {/* Status filter pills */}
        <div className="flex space-x-1.5 overflow-x-auto pb-1 scrollbar-none">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setFilterStatut(opt.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                filterStatut === opt.id
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>{opt.label}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                filterStatut === opt.id ? 'bg-red-700 text-white' : 'bg-slate-200 text-slate-700'
              }`}>
                {opt.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content View */}
      {filterStatut === 'Tous' ? (
        /* KANBAN BOARD FOR "TOUTES" */
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 overflow-y-auto pr-1">
          {STATUS_COLUMNS.map((col) => {
            const colOrders = commandes.filter((c) => c.statut === col.id);

            return (
              <div key={col.id} className="flex flex-col bg-slate-100/80 rounded-2xl border border-slate-200 overflow-hidden min-h-[280px]">
                
                {/* Column Header */}
                <div className="p-3 bg-white border-b border-slate-200 flex items-center justify-between">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700">
                    {col.label}
                  </h3>
                  <span className="bg-slate-200 text-slate-800 font-extrabold text-xs px-2 py-0.5 rounded-full">
                    {colOrders.length}
                  </span>
                </div>

                {/* Column Cards */}
                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                  {colOrders.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 text-xs font-medium">
                      Aucune commande
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
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className={`text-xs font-extrabold px-3 py-1 rounded-full border ${getStatusBadgeStyle(filterStatut)}`}>
                {filterStatut}
              </span>
              <span className="text-xs text-slate-500 font-semibold">
                {filteredCommandes.length} commande(s) affichée(s)
              </span>
            </div>
            <button
              onClick={() => setFilterStatut('Tous')}
              className="text-xs font-bold text-red-600 hover:text-red-800 hover:underline"
            >
              ← Voir toutes les rubriques (Vue d'ensemble)
            </button>
          </div>

          {filteredCommandes.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center my-auto">
              <ChefHat className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-slate-700 font-bold text-sm">
                Aucune commande dans le statut "{filterStatut}"
              </h3>
              <p className="text-slate-400 text-xs mt-1">
                Les nouvelles commandes s'afficheront ici automatiquement dès leur enregistrement.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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

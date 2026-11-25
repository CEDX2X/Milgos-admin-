import React, { useState, useEffect } from 'react';
import { Commande, StatistiquesVentes } from '../types';
import { 
  BarChart3, DollarSign, ShoppingBag, TrendingUp, AlertTriangle, 
  Calendar, User, Search, Download, ChevronDown, 
  ChevronUp, MapPin, Clock, CreditCard, Tag, Utensils,
  Eye, X, Printer, CheckCircle, FileText, Check, List, Grid
} from 'lucide-react';
import { formatPrice } from '../utils/format';
import { ThermalReceipt } from './ThermalReceipt';

interface SalesHistoryViewProps {
  commandes: Commande[];
  stats: StatistiquesVentes | null;
}

export const SalesHistoryView: React.FC<SalesHistoryViewProps> = ({
  commandes,
  stats,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPayment, setFilterPayment] = useState<string>('Tous');
  const [filterStatut, setFilterStatut] = useState<string>('Tous');
  const [selectedOrder, setSelectedOrder] = useState<Commande | null>(null);
  const [viewLayout, setViewLayout] = useState<'list' | 'grid'>('list');

  // Close modal on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedOrder(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const filteredCommandes = commandes.filter((cmd) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = 
      cmd.idCommande.toLowerCase().includes(q) ||
      cmd.nomServeuse.toLowerCase().includes(q) ||
      cmd.table.toLowerCase().includes(q) ||
      cmd.articles.some(a => a.nom.toLowerCase().includes(q));

    const matchesPay = filterPayment === 'Tous' || cmd.modePaiement === filterPayment;
    const matchesStatut = filterStatut === 'Tous' || cmd.statut === filterStatut;

    return matchesSearch && matchesPay && matchesStatut;
  });

  const exportCSV = () => {
    const headers = ['ID Commande', 'Date', 'Serveuse ID', 'Serveuse Nom', 'Table', 'Montant Total (FCFA)', 'Statut', 'Mode Paiement', 'Nombre Articles'];
    const rows = filteredCommandes.map(c => [
      c.idCommande,
      new Date(c.dateCreation).toLocaleString('fr-FR'),
      c.idServeuse,
      `"${c.nomServeuse}"`,
      `"${c.table}"`,
      c.montantTotal,
      c.statut,
      c.modePaiement || 'Non payé',
      c.articles.length
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `orderease_ventes_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadgeStyle = (statut: string) => {
    switch (statut) {
      case 'Payée':
        return 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300';
      case 'Servie':
        return 'bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300';
      case 'Prête':
        return 'bg-purple-50 dark:bg-purple-950/60 border-purple-200 dark:border-purple-800 text-purple-800 dark:text-purple-300 font-extrabold';
      case 'Annulée':
        return 'bg-red-50 dark:bg-red-950/60 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400';
      case 'En cuisine':
        return 'bg-sky-50 dark:bg-sky-950/60 border-sky-200 dark:border-sky-800 text-sky-800 dark:text-sky-300';
      default:
        return 'bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300';
    }
  };

  const printCurrentOrder = () => {
    window.print();
  };

  return (
    <div className="w-full max-w-[1750px] mx-auto min-h-full flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 p-3 sm:p-5 lg:p-6 pb-20 sm:pb-8 space-y-4 sm:space-y-5">
      
      {/* Top KPI Banner */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 sm:p-4 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-1">
            <span className="font-semibold text-slate-600 dark:text-slate-300">Chiffre d'Affaires</span>
            <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-lg sm:text-2xl font-black text-red-600 dark:text-red-500 truncate">
            {formatPrice(stats ? stats.chiffreAffairesTotal : 0)}
          </div>
          <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Cumul toutes serveuses</div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 sm:p-4 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-1">
            <span className="font-semibold text-slate-600 dark:text-slate-300">Commandes Validées</span>
            <ShoppingBag className="w-4 h-4 text-red-600 dark:text-red-400" />
          </div>
          <div className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white">
            {stats ? stats.nombreCommandes : 0}
          </div>
          <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Total transactions</div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 sm:p-4 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-1">
            <span className="font-semibold text-slate-600 dark:text-slate-300">Panier Moyen</span>
            <TrendingUp className="w-4 h-4 text-red-600 dark:text-red-400" />
          </div>
          <div className="text-lg sm:text-2xl font-black text-red-600 dark:text-red-500 truncate">
            {formatPrice(stats ? stats.panierMoyen : 0)}
          </div>
          <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Moyenne par commande</div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 sm:p-4 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-1">
            <span className="font-semibold text-slate-600 dark:text-slate-300">Stock Critique</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-lg sm:text-2xl font-black text-amber-600 dark:text-amber-400">
            {stats ? stats.articlesEnRupture : 0}
          </div>
          <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Articles à réassortir</div>
        </div>
      </div>

      {/* Filter and Controls Toolbar */}
      <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0 border border-red-200 dark:border-red-900/60">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">Liste des Ventes & Transactions</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">{filteredCommandes.length} commande(s) trouvée(s)</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-64 min-w-[180px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher ID, serveuse, table..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-7 py-2 text-xs text-slate-800 dark:text-white placeholder-slate-400 outline-none focus:border-red-500 transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white text-xs font-bold"
                >
                  ×
                </button>
              )}
            </div>

            {/* Layout Toggle (List default vs Grid) */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-1 border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setViewLayout('list')}
                title="Affichage en liste"
                className={`p-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                  viewLayout === 'list'
                    ? 'bg-white dark:bg-slate-900 text-red-600 dark:text-red-400 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-[11px]">Liste</span>
              </button>
              <button
                type="button"
                onClick={() => setViewLayout('grid')}
                title="Affichage en cartes"
                className={`p-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                  viewLayout === 'grid'
                    ? 'bg-white dark:bg-slate-900 text-red-600 dark:text-red-400 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Grid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-[11px]">Cartes</span>
              </button>
            </div>

            {/* Export CSV Button */}
            <button
              onClick={exportCSV}
              className="px-3.5 py-2 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/80 text-emerald-800 dark:text-emerald-300 font-bold text-xs rounded-xl flex items-center space-x-1.5 transition-colors shadow-2xs shrink-0 cursor-pointer active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exporter CSV</span>
            </button>
          </div>
        </div>

        {/* Quick Filters row: Payment Mode & Order Status */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-400 mr-1">Statut :</span>
            {['Tous', 'Payée', 'En attente', 'En cuisine', 'Prête', 'Servie', 'Annulée'].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setFilterStatut(st)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  filterStatut === st
                    ? 'bg-red-600 text-white shadow-2xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-[11px] font-bold text-slate-400">Paiement :</span>
            <select
              value={filterPayment}
              onChange={(e) => setFilterPayment(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs rounded-xl px-2.5 py-1 outline-none focus:border-red-500 cursor-pointer"
            >
              <option value="Tous">Tous les modes</option>
              <option value="Espèces">Espèces</option>
              <option value="Carte Bancaire">Carte Bancaire</option>
              <option value="Mobile Money">Mobile Money</option>
              <option value="Ticket / Pass">Ticket / Pass</option>
              <option value="Non payé">Non payé</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Content: List View (Default) or Cards View */}
      {filteredCommandes.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-10 text-center flex flex-col items-center justify-center space-y-3">
          <ShoppingBag className="w-12 h-12 text-slate-300 dark:text-slate-600" />
          <div>
            <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">Aucune vente correspondante</h4>
            <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">Modifiez vos critères de recherche ou réinitialisez les filtres.</p>
          </div>
          {(searchQuery || filterPayment !== 'Tous' || filterStatut !== 'Tous') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setFilterPayment('Tous');
                setFilterStatut('Tous');
              }}
              className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl cursor-pointer transition-colors"
            >
              Réinitialiser les filtres
            </button>
          )}
        </div>
      ) : viewLayout === 'list' ? (
        /* ================= SALES LIST TABLE (REQUESTED) ================= */
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          
          {/* Desktop & Tablet Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                  <th className="py-3.5 px-4">Réf. Commande</th>
                  <th className="py-3.5 px-4">Date & Heure</th>
                  <th className="py-3.5 px-4">Emplacement</th>
                  <th className="py-3.5 px-4">Serveuse</th>
                  <th className="py-3.5 px-4">Articles</th>
                  <th className="py-3.5 px-4 text-right">Montant Total</th>
                  <th className="py-3.5 px-4 text-center">Paiement</th>
                  <th className="py-3.5 px-4 text-center">Statut</th>
                  <th className="py-3.5 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                {filteredCommandes.map((cmd) => {
                  const formattedDate = new Date(cmd.dateCreation).toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit'
                  });
                  const isTakeaway = cmd.table.toLowerCase().includes('emporter');

                  return (
                    <tr 
                      key={cmd.idCommande}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group"
                    >
                      {/* Reference */}
                      <td className="py-3 px-4">
                        <span className="font-mono font-black text-red-600 dark:text-red-500">
                          {cmd.idCommande}
                        </span>
                      </td>

                      {/* Date & Time */}
                      <td className="py-3 px-4 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        <div className="flex items-center space-x-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{formattedDate}</span>
                        </div>
                      </td>

                      {/* Emplacement / Table */}
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-extrabold border ${
                          isTakeaway 
                            ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800' 
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                        }`}>
                          {isTakeaway ? (
                            <ShoppingBag className="w-3.5 h-3.5 text-amber-600" />
                          ) : (
                            <MapPin className="w-3.5 h-3.5 text-red-500" />
                          )}
                          <span>{cmd.table}</span>
                        </span>
                      </td>

                      {/* Serveuse */}
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-1.5">
                          <div className="w-6 h-6 rounded-full bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 font-black text-[10px] flex items-center justify-center shrink-0">
                            {cmd.nomServeuse ? cmd.nomServeuse.charAt(0).toUpperCase() : 'S'}
                          </div>
                          <div className="min-w-0">
                            <span className="font-bold text-slate-900 dark:text-white truncate block">
                              {cmd.nomServeuse}
                            </span>
                            <span className="text-[10px] text-slate-400 block -mt-0.5">
                              {cmd.idServeuse}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Articles Count */}
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-md text-slate-700 dark:text-slate-300 text-xs font-semibold">
                          <Utensils className="w-3 h-3 text-slate-400" />
                          <span>{cmd.articles.reduce((acc, item) => acc + item.quantite, 0)} pièce(s)</span>
                        </span>
                      </td>

                      {/* Montant Total */}
                      <td className="py-3 px-4 text-right">
                        <span className="font-black text-sm text-slate-900 dark:text-white whitespace-nowrap">
                          {formatPrice(cmd.montantTotal)}
                        </span>
                      </td>

                      {/* Mode de Paiement */}
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-lg text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          <CreditCard className="w-3 h-3 text-slate-400" />
                          <span>{cmd.modePaiement || 'Non payé'}</span>
                        </span>
                      </td>

                      {/* Statut */}
                      <td className="py-3 px-4 text-center">
                        <span className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border inline-block ${getStatusBadgeStyle(cmd.statut)}`}>
                          {cmd.statut === 'Prête' ? '🔔 Prête' : cmd.statut}
                        </span>
                      </td>

                      {/* Action Button: Détails */}
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => setSelectedOrder(cmd)}
                          className="px-3 py-1.5 bg-red-50 hover:bg-red-100 dark:bg-red-950/60 dark:hover:bg-red-900/60 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/70 font-bold text-xs rounded-xl inline-flex items-center space-x-1.5 transition-all shadow-2xs hover:scale-105 active:scale-95 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Détails</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile List View (Optimized for handheld screens) */}
          <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
            {filteredCommandes.map((cmd) => {
              const formattedDate = new Date(cmd.dateCreation).toLocaleDateString('fr-FR', {
                day: '2-digit',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit'
              });
              const isTakeaway = cmd.table.toLowerCase().includes('emporter');

              return (
                <div key={cmd.idCommande} className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-mono font-black text-red-600 dark:text-red-500 text-sm">
                        {cmd.idCommande}
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center space-x-1 mt-0.5">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{formattedDate}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-base font-black text-slate-900 dark:text-white">
                        {formatPrice(cmd.montantTotal)}
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border inline-block mt-0.5 ${getStatusBadgeStyle(cmd.statut)}`}>
                        {cmd.statut === 'Prête' ? '🔔 Prête' : cmd.statut}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
                    <span className="flex items-center space-x-1 font-semibold">
                      {isTakeaway ? <ShoppingBag className="w-3.5 h-3.5 text-amber-500" /> : <MapPin className="w-3.5 h-3.5 text-red-500" />}
                      <span>{cmd.table}</span>
                    </span>

                    <span className="flex items-center space-x-1 font-semibold">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>{cmd.nomServeuse}</span>
                    </span>

                    <span className="bg-slate-100 dark:bg-slate-800 text-[11px] px-2 py-0.5 rounded-md font-bold text-slate-700 dark:text-slate-300">
                      {cmd.modePaiement || 'Non payé'}
                    </span>
                  </div>

                  {/* Explicit Details Button on each row */}
                  <button
                    type="button"
                    onClick={() => setSelectedOrder(cmd)}
                    className="w-full py-2 bg-red-50 hover:bg-red-100 dark:bg-red-950/60 dark:hover:bg-red-900/60 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/70 font-black text-xs rounded-xl flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-2xs"
                  >
                    <Eye className="w-4 h-4" />
                    <span>Afficher les détails de la commande</span>
                  </button>
                </div>
              );
            })}
          </div>

        </div>
      ) : (
        /* ================= CARDS GRID VIEW (ALTERNATIVE VIEW) ================= */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3.5 sm:gap-4">
          {filteredCommandes.map((cmd) => {
            const formattedDate = new Date(cmd.dateCreation).toLocaleDateString('fr-FR', {
              day: '2-digit',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit'
            });

            return (
              <div
                key={cmd.idCommande}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xs hover:border-red-300 dark:hover:border-red-800/80 transition-all flex flex-col justify-between space-y-3"
              >
                {/* Top Row */}
                <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div>
                    <div className="font-mono font-black text-red-600 dark:text-red-500 text-sm tracking-tight">
                      {cmd.idCommande}
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center space-x-1 mt-0.5">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>{formattedDate}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-base font-black text-slate-900 dark:text-white">
                      {formatPrice(cmd.montantTotal)}
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border inline-block mt-0.5 ${getStatusBadgeStyle(cmd.statut)}`}>
                      {cmd.statut === 'Prête' ? '🔔 Prête' : cmd.statut}
                    </span>
                  </div>
                </div>

                {/* Sub-row: Table & Serveuse */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-slate-50 dark:bg-slate-800/60 p-2 rounded-xl border border-slate-100 dark:border-slate-800">
                    <div className="text-[10px] text-slate-400 font-bold flex items-center space-x-1">
                      <MapPin className="w-3 h-3 text-red-500" />
                      <span>Emplacement</span>
                    </div>
                    <div className="font-extrabold text-slate-900 dark:text-slate-100 truncate mt-0.5">{cmd.table}</div>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-800/60 p-2 rounded-xl border border-slate-100 dark:border-slate-800">
                    <div className="text-[10px] text-slate-400 font-bold flex items-center space-x-1">
                      <User className="w-3 h-3 text-red-500" />
                      <span>Serveuse</span>
                    </div>
                    <div className="font-extrabold text-slate-900 dark:text-slate-100 truncate mt-0.5">
                      {cmd.nomServeuse}
                    </div>
                  </div>
                </div>

                {/* Payment Method info */}
                <div className="flex items-center justify-between text-xs pt-0.5">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center space-x-1">
                    <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                    <span>Règlement :</span>
                  </span>
                  <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[11px] px-2.5 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                    {cmd.modePaiement || 'Non payé'}
                  </span>
                </div>

                {/* Button to open Modal Details */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setSelectedOrder(cmd)}
                    className="w-full py-2 px-3 bg-red-50 hover:bg-red-100 dark:bg-red-950/60 dark:hover:bg-red-900/60 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/70 rounded-xl text-xs font-black flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-2xs"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Voir les détails ({cmd.articles.length} art.)</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ================= MODAL DÉTAILS DE LA COMMANDE (SIMPLIFIÉ & COMPACT) ================= */}
      {selectedOrder && (
        <div 
          id="order-details-modal"
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fade-in"
          onClick={() => setSelectedOrder(null)}
        >
          <div 
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl shadow-2xl max-w-lg w-full max-h-[82vh] flex flex-col overflow-hidden transition-all duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header épuré */}
            <div className="px-4 py-3.5 sm:px-5 sm:py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-800/40">
              <div className="min-w-0">
                <div className="flex items-center space-x-2">
                  <span className="font-mono font-black text-red-600 dark:text-red-500 text-sm sm:text-base">
                    {selectedOrder.idCommande}
                  </span>
                  <span className={`text-[10px] sm:text-[11px] font-extrabold px-2 py-0.5 rounded-full border ${getStatusBadgeStyle(selectedOrder.statut)}`}>
                    {selectedOrder.statut === 'Prête' ? '🔔 Prête' : selectedOrder.statut}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center space-x-2 mt-0.5 truncate">
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {selectedOrder.table}
                  </span>
                  <span>•</span>
                  <span>{selectedOrder.nomServeuse}</span>
                  <span>•</span>
                  <span>
                    {new Date(selectedOrder.dateCreation).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} ({new Date(selectedOrder.dateCreation).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })})
                  </span>
                </p>
              </div>

              <div className="flex items-center space-x-1.5 shrink-0">
                <button
                  type="button"
                  onClick={printCurrentOrder}
                  className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                  title="Imprimer"
                >
                  <Printer className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                  title="Fermer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Body compact */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-3 text-xs">
              {/* Ligne rapide Paiement & Nombre d'articles */}
              <div className="flex items-center justify-between text-[11px] bg-slate-50 dark:bg-slate-800/50 px-3 py-2 rounded-xl border border-slate-100 dark:border-slate-800">
                <div className="flex items-center space-x-1.5 text-slate-600 dark:text-slate-300">
                  <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                  <span>Règlement : <strong className="text-slate-800 dark:text-white font-bold">{selectedOrder.modePaiement || 'Non payé'}</strong></span>
                </div>
                <div className="text-slate-500 dark:text-slate-400 font-medium">
                  {selectedOrder.articles.reduce((acc, a) => acc + a.quantite, 0)} article(s) ({selectedOrder.articles.length} réf.)
                </div>
              </div>

              {/* Liste claire & aérée des articles */}
              <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {selectedOrder.articles.map((item, idx) => (
                  <div key={idx} className="py-2 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline space-x-2">
                        <span className="font-mono font-black text-red-600 dark:text-red-400 text-xs">
                          {item.quantite}×
                        </span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                          {item.nom}
                        </span>
                      </div>
                      {item.notes && (
                        <p className="text-[10px] text-amber-700 dark:text-amber-400 italic mt-0.5 pl-5">
                          Remarque : {item.notes}
                        </p>
                      )}
                    </div>
                    <div className="text-right font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                      {formatPrice(item.sousTotal || (item.prixUnitaire * item.quantite))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Note pour la cuisine éventuelle */}
              {selectedOrder.notesServeuse && (
                <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-xl text-[11px] text-amber-800 dark:text-amber-300">
                  <span className="font-bold">Consigne cuisine : </span>{selectedOrder.notesServeuse}
                </div>
              )}

              {/* Remise éventuelle */}
              {selectedOrder.remise && selectedOrder.remise.montantRemise > 0 && (
                <div className="flex justify-between items-center text-xs text-emerald-600 dark:text-emerald-400 pt-1 border-t border-slate-100 dark:border-slate-800">
                  <span>Remise accordée ({selectedOrder.remise.type === 'percent' ? `${selectedOrder.remise.valeur}%` : 'Montant fixe'}) :</span>
                  <span className="font-bold">-{formatPrice(selectedOrder.remise.montantRemise)}</span>
                </div>
              )}
            </div>

            {/* Modal Footer condensé avec Total et bouton Fermer */}
            <div className="px-4 py-3 sm:px-5 sm:py-3 bg-slate-50/80 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0 print:hidden">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Total Commande</span>
                <span className="font-black text-lg text-red-600 dark:text-red-500 font-mono">
                  {formatPrice(selectedOrder.montantFinal !== undefined ? selectedOrder.montantFinal : selectedOrder.montantTotal)}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-xs"
              >
                Fermer
              </button>
            </div>

            {/* Printable Thermal Receipt (Printed when clicking print) */}
            <div className="hidden print:block">
              <ThermalReceipt
                id="thermal-receipt-history"
                table={selectedOrder.table}
                orderIds={[selectedOrder.idCommande]}
                date={selectedOrder.datePaiement || selectedOrder.dateMiseAJour || selectedOrder.dateCreation}
                serveuseNames={selectedOrder.nomServeuse}
                caissierName={selectedOrder.nomCaissier}
                articles={selectedOrder.articles}
                totalBrut={selectedOrder.montantTotal}
                remise={selectedOrder.remise}
                totalNet={selectedOrder.montantFinal !== undefined ? selectedOrder.montantFinal : selectedOrder.montantTotal}
                modePaiement={selectedOrder.modePaiement || 'Espèces'}
                montantRecu={selectedOrder.montantRecu}
                monnaieRendue={selectedOrder.monnaieRendue}
              />
            </div>

          </div>
        </div>
      )}

    </div>
  );
};


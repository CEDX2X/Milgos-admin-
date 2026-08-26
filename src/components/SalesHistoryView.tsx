import React, { useState } from 'react';
import { Commande, StatistiquesVentes } from '../types';
import { BarChart3, DollarSign, ShoppingBag, TrendingUp, AlertTriangle, Calendar, User, Search, Download, FileSpreadsheet } from 'lucide-react';
import { formatPrice } from '../utils/format';

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

  const filteredCommandes = commandes.filter((cmd) => {
    const matchesSearch = cmd.idCommande.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          cmd.nomServeuse.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          cmd.table.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPay = filterPayment === 'Tous' || cmd.modePaiement === filterPayment;
    return matchesSearch && matchesPay;
  });

  const exportCSV = () => {
    const headers = ['ID Commande', 'Date', 'Serveuse ID', 'Serveuse Nom', 'Table', 'Montant Total (FCFA)', 'Statut', 'Mode Paiement'];
    const rows = commandes.map(c => [
      c.idCommande,
      new Date(c.dateCreation).toLocaleString('fr-FR'),
      c.idServeuse,
      `"${c.nomServeuse}"`,
      `"${c.table}"`,
      c.montantTotal,
      c.statut,
      c.modePaiement
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

  return (
    <div className="w-full min-h-full flex flex-col bg-slate-50 text-slate-800 p-3 sm:p-6 pb-20 sm:pb-8 space-y-4 sm:space-y-5">
      
      {/* Top KPI Banner */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        <div className="bg-white border border-slate-200 p-3.5 sm:p-4 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span className="font-semibold text-slate-600">Chiffre d'Affaires</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-lg sm:text-2xl font-black text-red-600 truncate">
            {formatPrice(stats ? stats.chiffreAffairesTotal : 0)}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Cumul toutes serveuses</div>
        </div>

        <div className="bg-white border border-slate-200 p-3.5 sm:p-4 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span className="font-semibold text-slate-600">Commandes Validées</span>
            <ShoppingBag className="w-4 h-4 text-red-600" />
          </div>
          <div className="text-lg sm:text-2xl font-black text-slate-900">
            {stats ? stats.nombreCommandes : 0}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Total transactions</div>
        </div>

        <div className="bg-white border border-slate-200 p-3.5 sm:p-4 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span className="font-semibold text-slate-600">Panier Moyen</span>
            <TrendingUp className="w-4 h-4 text-red-600" />
          </div>
          <div className="text-lg sm:text-2xl font-black text-red-600 truncate">
            {formatPrice(stats ? stats.panierMoyen : 0)}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Moyenne par commande</div>
        </div>

        <div className="bg-white border border-slate-200 p-3.5 sm:p-4 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span className="font-semibold text-slate-600">Stock Critique</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-lg sm:text-2xl font-black text-amber-600">
            {stats ? stats.articlesEnRupture : 0}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Articles à réassortir</div>
        </div>
      </div>

      {/* Filter and Export Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center space-x-2">
          <BarChart3 className="w-5 h-5 text-red-600 shrink-0" />
          <h3 className="font-extrabold text-xs sm:text-sm text-slate-900">Journal des Ventes & Transactions</h3>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher ID, serveuse, table..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-red-500"
            />
          </div>

          <button
            onClick={exportCSV}
            className="px-3 py-1.5 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-800 font-bold text-xs rounded-xl flex items-center space-x-1.5 transition-colors shadow-2xs shrink-0 touch-manipulation active:scale-95"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Exporter CSV</span>
          </button>
        </div>
      </div>

      {/* Sales Transactions Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-500 uppercase font-mono text-[10px] border-b border-slate-200">
              <tr>
                <th className="p-3">ID Commande</th>
                <th className="p-3">Date & Heure</th>
                <th className="p-3">Serveuse</th>
                <th className="p-3">Table</th>
                <th className="p-3">Détail Articles</th>
                <th className="p-3">Règlement</th>
                <th className="p-3">Statut</th>
                <th className="p-3 text-right">Montant</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCommandes.map((cmd) => (
                <tr key={cmd.idCommande} className="hover:bg-slate-50/80 transition-colors">
                  <td className="p-3 font-mono font-bold text-red-600 whitespace-nowrap">{cmd.idCommande}</td>
                  <td className="p-3 text-slate-500 whitespace-nowrap">
                    {new Date(cmd.dateCreation).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="p-3 font-bold text-slate-900 whitespace-nowrap">
                    {cmd.nomServeuse} <span className="text-[10px] text-slate-400 font-mono">({cmd.idServeuse})</span>
                  </td>
                  <td className="p-3 text-slate-700 font-semibold whitespace-nowrap">{cmd.table}</td>
                  <td className="p-3">
                    <div className="max-w-xs truncate text-[11px] text-slate-500">
                      {cmd.articles.map(a => `${a.quantite}× ${a.nom}`).join(', ')}
                    </div>
                  </td>
                  <td className="p-3 whitespace-nowrap">
                    <span className="bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-[10px] font-semibold text-slate-700">
                      {cmd.modePaiement}
                    </span>
                  </td>
                  <td className="p-3 whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      cmd.statut === 'Payée'
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        : cmd.statut === 'Servie'
                        ? 'bg-purple-50 border-purple-200 text-purple-800'
                        : cmd.statut === 'Annulée'
                        ? 'bg-red-50 border-red-200 text-red-600'
                        : 'bg-amber-50 border-amber-200 text-amber-800'
                    }`}>
                      {cmd.statut}
                    </span>
                  </td>
                  <td className="p-3 text-right font-black text-red-600 whitespace-nowrap">
                    {formatPrice(cmd.montantTotal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

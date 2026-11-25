import React, { useState, useMemo } from 'react';
import { Commande, ModePaiement, Serveuse, Article, RemiseCommande, StatutCommande } from '../types';
import { 
  CircleDollarSign, 
  Receipt, 
  CreditCard, 
  Banknote, 
  Smartphone, 
  Ticket as TicketIcon, 
  Clock, 
  Printer, 
  CheckCircle2, 
  Search, 
  AlertTriangle, 
  User, 
  MapPin, 
  ShoppingBag,
  ChevronRight, 
  ChevronDown,
  Percent, 
  FileText, 
  Lock, 
  RefreshCw, 
  X,
  History,
  Layers,
  Utensils,
  Check,
  Sparkles,
  ArrowRight,
  TrendingUp
} from 'lucide-react';
import { formatPrice } from '../utils/format';
import { ThermalReceipt } from './ThermalReceipt';

interface CashierRegisterViewProps {
  commandes: Commande[];
  articles?: Article[];
  currentServeuse: Serveuse;
  onUpdateStatut: (
    idCommande: string, 
    statut: string, 
    modePaiement?: string,
    paymentDetails?: {
      idCaissier?: string;
      nomCaissier?: string;
      remise?: RemiseCommande;
      montantFinal?: number;
      montantRecu?: number;
      monnaieRendue?: number;
      datePaiement?: string;
    }
  ) => Promise<void>;
  onBatchUpdateStatut?: (
    idCommandes: string[],
    paymentData: {
      table?: string;
      modePaiement: ModePaiement;
      idCaissier?: string;
      nomCaissier?: string;
      remise?: RemiseCommande;
      montantFinal?: number;
      montantRecu?: number;
      monnaieRendue?: number;
      datePaiement?: string;
    }
  ) => Promise<void>;
}

export interface ConsolidatedArticleItem {
  idArticle: string;
  nom: string;
  prixUnitaire: number;
  quantite: number;
  sousTotal: number;
  categorie?: string;
}

export interface TableGroup {
  table: string;
  commandes: Commande[];
  totalBrut: number;
  totalArticlesCount: number;
  firstOrderDate: string;
  lastOrderDate: string;
  serveuses: string[];
  consolidatedArticles: ConsolidatedArticleItem[];
  statuses: StatutCommande[];
  allServiesOrPretes: boolean;
}

export interface PrintableReceiptData {
  isTableReceipt: boolean;
  table: string;
  orderIds: string[];
  date: string;
  serveuseNames: string;
  caissierName: string;
  articles: ConsolidatedArticleItem[];
  totalBrut: number;
  remise?: RemiseCommande;
  totalNet: number;
  modePaiement: string;
  montantRecu?: number;
  monnaieRendue?: number;
  
  // Dual-mode Bon de Commande extensions (Intégralité vs Éléments ajoutés uniquement)
  isProforma?: boolean;
  isComplement?: boolean;
  titreReceipt?: string;
  totalCumuleTable?: number;
  tableGroup?: TableGroup;
  hasMultipleOrders?: boolean;
  selectedPrintOption?: 'integralite' | 'ajouts';
  allConsolidatedArticles?: ConsolidatedArticleItem[];
  allTotalBrut?: number;
  allOrderIds?: string[];
  addedArticles?: ConsolidatedArticleItem[];
  addedTotal?: number;
  addedOrderIds?: string[];
}

// Helper to normalize table names so "Table 1", "Table 01", "TABLE 1", "t1", etc. always group together
export function normalizeTableKey(table: string | undefined | null): string {
  if (!table || !table.trim()) return 'Sans table';
  const clean = table.trim().replace(/\s+/g, ' ');
  
  if (/^à?\s*emporter$/i.test(clean) || /^a\s*emporter$/i.test(clean) || /^emporter$/i.test(clean)) {
    return 'À emporter';
  }

  // Match patterns like "Table 1", "Table 01", "T1", "T01", "Table1"
  const tableNumMatch = clean.match(/^(?:table|tbl|t)\s*0*([0-9]+)$/i);
  if (tableNumMatch) {
    const num = parseInt(tableNumMatch[1], 10);
    return `Table ${num < 10 ? '0' + num : num}`;
  }
  
  // Capitalize first letter for custom table names (e.g. "Terrasse 1", "VIP A")
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

export const CashierRegisterView: React.FC<CashierRegisterViewProps> = ({
  commandes,
  articles = [],
  currentServeuse,
  onUpdateStatut,
  onBatchUpdateStatut
}) => {
  // Navigation tabs inside Cashier view
  const [activeTab, setActiveTab] = useState<'pending' | 'my_sales' | 'closure'>('pending');

  // Expanded tables in UI (tracking accordion state)
  const [expandedTables, setExpandedTables] = useState<Record<string, boolean>>({});

  // Pending Orders filter & search
  const [searchQuery, setSearchQuery] = useState('');
  const [prepStatusFilter, setPrepStatusFilter] = useState<'all' | 'Servie' | 'Prête' | 'En cuisine' | 'En attente'>('all');
  
  // Checkout Modal State (can be either a single Commande OR a TableGroup)
  const [checkoutTarget, setCheckoutTarget] = useState<{
    type: 'table' | 'order';
    table: string;
    commandes: Commande[];
    totalBrut: number;
    consolidatedArticles: ConsolidatedArticleItem[];
  } | null>(null);

  const [selectedPaymentMode, setSelectedPaymentMode] = useState<ModePaiement>('Espèces');
  const [discountType, setDiscountType] = useState<'none' | 'percent' | 'fixed'>('none');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [montantRecuInput, setMontantRecuInput] = useState<string>('');
  const [isProcessingPayment, setIsProcessingPayment] = useState<boolean>(false);

  // Receipt Modal State (single ticket or full table invoice)
  const [receiptData, setReceiptData] = useState<PrintableReceiptData | null>(null);
  const [isProformaReceipt, setIsProformaReceipt] = useState<boolean>(false);
  const [compactTicketMode, setCompactTicketMode] = useState<boolean>(true);

  // Cash Closure (Z de caisse) State
  const [fondDeCaisse, setFondDeCaisse] = useState<number>(20000);
  const [montantReelCompte, setMontantReelCompte] = useState<string>('');
  const [motifEcart, setMotifEcart] = useState<string>('');
  const [isClosureSaved, setIsClosureSaved] = useState<boolean>(false);
  const [showClosurePrintModal, setShowClosurePrintModal] = useState<boolean>(false);

  const isCaissier = currentServeuse.role === 'caissier';
  const isAdmin = currentServeuse.role === 'admin';

  // Toggle table card expand/collapse
  const toggleTableExpand = (table: string) => {
    setExpandedTables(prev => ({
      ...prev,
      [table]: !prev[table]
    }));
  };

  // 1. Raw Filter for all unpaid/active orders
  const pendingOrders = useMemo(() => {
    return commandes.filter((c) => {
      if (c.statut === 'Payée' || c.statut === 'Annulée') return false;
      const matchesSearch = 
        c.idCommande.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.table || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.nomServeuse || '').toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = prepStatusFilter === 'all' || c.statut === prepStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [commandes, searchQuery, prepStatusFilter]);

  // 2. Group Pending Orders by Table (Table Accounts)
  const tableGroups = useMemo<TableGroup[]>(() => {
    const map = new Map<string, Commande[]>();

    pendingOrders.forEach((cmd) => {
      const tableKey = normalizeTableKey(cmd.table);
      if (!map.has(tableKey)) {
        map.set(tableKey, []);
      }
      map.get(tableKey)!.push(cmd);
    });

    const groups: TableGroup[] = [];

    map.forEach((cmds, table) => {
      // Sort orders chronologically (oldest first)
      cmds.sort((a, b) => new Date(a.dateCreation).getTime() - new Date(b.dateCreation).getTime());

      let totalBrut = 0;
      let totalArticlesCount = 0;
      const serveuseSet = new Set<string>();
      const statusSet = new Set<StatutCommande>();
      const articleAggMap = new Map<string, ConsolidatedArticleItem>();

      cmds.forEach((c) => {
        totalBrut += c.montantTotal || 0;
        if (c.nomServeuse) serveuseSet.add(c.nomServeuse);
        if (c.statut) statusSet.add(c.statut);

        (c.articles || []).forEach((art) => {
          totalArticlesCount += art.quantite || 1;
          const key = `${art.idArticle}-${art.nom}`;
          const existing = articleAggMap.get(key);
          const sousTotal = art.sousTotal || (art.prixUnitaire * art.quantite);

          if (existing) {
            existing.quantite += art.quantite;
            existing.sousTotal += sousTotal;
          } else {
            articleAggMap.set(key, {
              idArticle: art.idArticle,
              nom: art.nom,
              prixUnitaire: art.prixUnitaire,
              quantite: art.quantite,
              sousTotal: sousTotal,
              categorie: art.categorie
            });
          }
        });
      });

      const statuses = Array.from(statusSet);
      const allServiesOrPretes = statuses.length > 0 && statuses.every(s => s === 'Servie' || s === 'Prête');

      groups.push({
        table,
        commandes: cmds,
        totalBrut,
        totalArticlesCount,
        firstOrderDate: cmds[0]?.dateCreation || new Date().toISOString(),
        lastOrderDate: cmds[cmds.length - 1]?.dateCreation || new Date().toISOString(),
        serveuses: Array.from(serveuseSet),
        consolidatedArticles: Array.from(articleAggMap.values()),
        statuses,
        allServiesOrPretes
      });
    });

    // Sort table groups: most active / largest amount or most urgent first
    return groups.sort((a, b) => b.totalBrut - a.totalBrut);
  }, [pendingOrders]);

  // Overall Pending Totals
  const totalPendingAmount = useMemo(() => {
    return pendingOrders.reduce((sum, c) => sum + (c.montantTotal || 0), 0);
  }, [pendingOrders]);

  // 3. Filter Cashier's Personal Payment Transactions
  const myProcessedOrders = useMemo(() => {
    return commandes.filter((c) => {
      if (c.statut !== 'Payée') return false;
      if (isAdmin) return true; // Admin can view all
      return c.idCaissier === currentServeuse.idServeuse;
    });
  }, [commandes, currentServeuse.idServeuse, isAdmin]);

  // 4. Closure Statistics (Today's session calculations)
  const closureStats = useMemo(() => {
    const sessionOrders = myProcessedOrders;
    
    let totalEspeces = 0;
    let totalCB = 0;
    let totalMobileMoney = 0;
    let totalPass = 0;
    let totalGlobal = 0;

    sessionOrders.forEach((c) => {
      const amount = typeof c.montantFinal === 'number' ? c.montantFinal : c.montantTotal;
      totalGlobal += amount;
      if (c.modePaiement === 'Espèces') totalEspeces += amount;
      else if (c.modePaiement === 'Carte Bancaire') totalCB += amount;
      else if (c.modePaiement === 'Mobile Money') totalMobileMoney += amount;
      else if (c.modePaiement === 'Ticket / Pass') totalPass += amount;
      else totalEspeces += amount;
    });

    const theoriqueEnCaisse = fondDeCaisse + totalEspeces;
    const reelNum = montantReelCompte ? Number(montantReelCompte) : null;
    const ecart = reelNum !== null ? reelNum - theoriqueEnCaisse : null;

    return {
      nombreTickets: sessionOrders.length,
      totalEspeces,
      totalCB,
      totalMobileMoney,
      totalPass,
      totalGlobal,
      theoriqueEnCaisse,
      reelNum,
      ecart
    };
  }, [myProcessedOrders, fondDeCaisse, montantReelCompte]);

  // Discount & Final Amount Calculations for active checkout modal
  const currentCheckoutCalculations = useMemo(() => {
    if (!checkoutTarget) return { totalBrut: 0, montantRemise: 0, totalNet: 0 };
    const totalBrut = checkoutTarget.totalBrut;
    let montantRemise = 0;

    if (discountType === 'percent' && discountValue > 0) {
      montantRemise = Math.round((totalBrut * discountValue) / 100);
    } else if (discountType === 'fixed' && discountValue > 0) {
      montantRemise = Math.min(totalBrut, discountValue);
    }

    const totalNet = Math.max(0, totalBrut - montantRemise);
    return { totalBrut, montantRemise, totalNet };
  }, [checkoutTarget, discountType, discountValue]);

  // Change Calculation
  const changeCalculation = useMemo(() => {
    const totalNet = currentCheckoutCalculations.totalNet;
    const recu = montantRecuInput ? Number(montantRecuInput) : 0;
    const monnaie = recu >= totalNet ? recu - totalNet : 0;
    const isInsufficient = recu > 0 && recu < totalNet;
    return { recu, monnaie, isInsufficient };
  }, [currentCheckoutCalculations.totalNet, montantRecuInput]);

  // Open Checkout Modal for a single command
  const handleOpenSingleOrderCheckout = (cmd: Commande) => {
    const consolidatedArticles: ConsolidatedArticleItem[] = cmd.articles.map(a => ({
      idArticle: a.idArticle,
      nom: a.nom,
      prixUnitaire: a.prixUnitaire,
      quantite: a.quantite,
      sousTotal: a.sousTotal || (a.prixUnitaire * a.quantite),
      categorie: a.categorie
    }));

    setCheckoutTarget({
      type: 'order',
      table: cmd.table,
      commandes: [cmd],
      totalBrut: cmd.montantTotal,
      consolidatedArticles
    });
    setSelectedPaymentMode('Espèces');
    setDiscountType('none');
    setDiscountValue(0);
    setMontantRecuInput(cmd.montantTotal.toString());
  };

  // Open Checkout Modal for an ENTIRE TABLE (Grouped checkout)
  const handleOpenTableCheckout = (group: TableGroup) => {
    setCheckoutTarget({
      type: 'table',
      table: group.table,
      commandes: group.commandes,
      totalBrut: group.totalBrut,
      consolidatedArticles: group.consolidatedArticles
    });
    setSelectedPaymentMode('Espèces');
    setDiscountType('none');
    setDiscountValue(0);
    setMontantRecuInput(group.totalBrut.toString());
  };

  const handleApplyQuickDiscountPercent = (pct: number) => {
    if (pct === 0) {
      setDiscountType('none');
      setDiscountValue(0);
    } else {
      setDiscountType('percent');
      setDiscountValue(pct);
    }
  };

  const handleApplyQuickCashRecu = (amount: number) => {
    setMontantRecuInput(amount.toString());
  };

  // Validate Payment (Single order or Grouped Table)
  const handleConfirmPayment = async () => {
    if (!checkoutTarget) return;
    setIsProcessingPayment(true);

    try {
      const { totalNet, totalBrut, montantRemise } = currentCheckoutCalculations;
      const recuNum = selectedPaymentMode === 'Espèces' ? (montantRecuInput ? Number(montantRecuInput) : totalNet) : totalNet;
      const monnaieNum = selectedPaymentMode === 'Espèces' ? Math.max(0, recuNum - totalNet) : 0;

      const remisePayload: RemiseCommande | undefined = discountType !== 'none' && montantRemise > 0 ? {
        type: discountType as 'percent' | 'fixed',
        valeur: discountValue,
        montantRemise
      } : undefined;

      const datePaiement = new Date().toISOString();
      const targetOrderIds = checkoutTarget.commandes.map(c => c.idCommande);

      if (checkoutTarget.type === 'table' && onBatchUpdateStatut) {
        // Grouped Table Settlement via batch update
        await onBatchUpdateStatut(targetOrderIds, {
          table: checkoutTarget.table,
          modePaiement: selectedPaymentMode,
          idCaissier: currentServeuse.idServeuse,
          nomCaissier: currentServeuse.nom,
          remise: remisePayload,
          montantFinal: totalNet,
          montantRecu: recuNum,
          monnaieRendue: monnaieNum,
          datePaiement
        });
      } else {
        // Individual command update or parallel fallback
        const ratio = totalBrut > 0 ? totalNet / totalBrut : 1;
        for (const cmd of checkoutTarget.commandes) {
          const partFinal = Math.round(cmd.montantTotal * ratio);
          await onUpdateStatut(
            cmd.idCommande,
            'Payée',
            selectedPaymentMode,
            {
              idCaissier: currentServeuse.idServeuse,
              nomCaissier: currentServeuse.nom,
              remise: remisePayload,
              montantFinal: partFinal,
              montantRecu: recuNum,
              monnaieRendue: monnaieNum,
              datePaiement
            }
          );
        }
      }

      // Generate printable unified receipt
      const serveuseNames = Array.from(new Set(checkoutTarget.commandes.map(c => c.nomServeuse).filter(Boolean))).join(', ');
      const printableSnapshot: PrintableReceiptData = {
        isTableReceipt: checkoutTarget.type === 'table' || checkoutTarget.commandes.length > 1,
        table: checkoutTarget.table,
        orderIds: targetOrderIds,
        date: datePaiement,
        serveuseNames: serveuseNames || currentServeuse.nom,
        caissierName: currentServeuse.nom,
        articles: checkoutTarget.consolidatedArticles,
        totalBrut,
        remise: remisePayload,
        totalNet,
        modePaiement: selectedPaymentMode,
        montantRecu: recuNum,
        monnaieRendue: monnaieNum
      };

      setCheckoutTarget(null);
      setIsProformaReceipt(false);
      setReceiptData(printableSnapshot);
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Open Proforma Ticket / Bon de Commande for an entire table (with options for All vs Added items)
  const handleOpenTableProforma = (group: TableGroup, defaultMode: 'integralite' | 'ajouts' = 'integralite') => {
    const serveuseNames = group.serveuses.join(', ');
    const hasMultiple = group.commandes.length > 1;

    // Build added articles list (Tournées #2 to end)
    const addedMap = new Map<string, ConsolidatedArticleItem>();
    let addedTotal = 0;
    const addedOrders = group.commandes.slice(1);
    const addedOrderIds = addedOrders.map(c => c.idCommande);

    addedOrders.forEach(c => {
      addedTotal += c.montantTotal || 0;
      (c.articles || []).forEach(art => {
        const key = `${art.idArticle}-${art.nom}`;
        const existing = addedMap.get(key);
        const sousTotal = art.sousTotal || (art.prixUnitaire * art.quantite);
        if (existing) {
          existing.quantite += art.quantite;
          existing.sousTotal += sousTotal;
        } else {
          addedMap.set(key, {
            idArticle: art.idArticle,
            nom: art.nom,
            prixUnitaire: art.prixUnitaire,
            quantite: art.quantite,
            sousTotal,
            categorie: art.categorie
          });
        }
      });
    });
    const addedArticles = Array.from(addedMap.values());
    const chosenMode = (hasMultiple && defaultMode === 'ajouts') ? 'ajouts' : 'integralite';
    const isComplement = chosenMode === 'ajouts';

    setReceiptData({
      isTableReceipt: true,
      table: group.table,
      orderIds: isComplement ? addedOrderIds : group.commandes.map(c => c.idCommande),
      date: new Date().toISOString(),
      serveuseNames: serveuseNames || currentServeuse.nom,
      caissierName: currentServeuse.nom,
      articles: isComplement ? addedArticles : group.consolidatedArticles,
      totalBrut: isComplement ? addedTotal : group.totalBrut,
      totalNet: isComplement ? addedTotal : group.totalBrut,
      modePaiement: 'En attente',
      isProforma: true,
      isComplement: isComplement,
      totalCumuleTable: group.totalBrut,
      titreReceipt: isComplement ? `BON D'AJOUT (${group.table})` : `BON DE COMMANDE (${group.table})`,
      tableGroup: group,
      hasMultipleOrders: hasMultiple,
      selectedPrintOption: chosenMode,
      allConsolidatedArticles: group.consolidatedArticles,
      allTotalBrut: group.totalBrut,
      allOrderIds: group.commandes.map(c => c.idCommande),
      addedArticles,
      addedTotal,
      addedOrderIds
    });
    setIsProformaReceipt(true);
  };

  // Switch between Intégralité and Éléments ajoutés in the proforma modal
  const handleSwitchProformaMode = (mode: 'integralite' | 'ajouts') => {
    if (!receiptData || !receiptData.tableGroup) return;
    const group = receiptData.tableGroup;

    if (mode === 'ajouts') {
      setReceiptData(prev => {
        if (!prev) return null;
        return {
          ...prev,
          selectedPrintOption: 'ajouts',
          isComplement: true,
          articles: prev.addedArticles || [],
          totalBrut: prev.addedTotal || 0,
          totalNet: prev.addedTotal || 0,
          orderIds: prev.addedOrderIds && prev.addedOrderIds.length > 0 ? prev.addedOrderIds : prev.orderIds,
          titreReceipt: `BON D'AJOUT (${prev.table})`,
          totalCumuleTable: group.totalBrut
        };
      });
    } else {
      setReceiptData(prev => {
        if (!prev) return null;
        return {
          ...prev,
          selectedPrintOption: 'integralite',
          isComplement: false,
          articles: prev.allConsolidatedArticles || group.consolidatedArticles,
          totalBrut: prev.allTotalBrut || group.totalBrut,
          totalNet: prev.allTotalBrut || group.totalBrut,
          orderIds: prev.allOrderIds || group.commandes.map(c => c.idCommande),
          titreReceipt: `BON DE COMMANDE (${prev.table})`,
          totalCumuleTable: undefined
        };
      });
    }
  };

  // Open Proforma Ticket for a single order / Tournée
  const handleOpenSingleOrderProforma = (cmd: Commande, group?: TableGroup, cIdx?: number) => {
    const isComplement = (cIdx !== undefined && cIdx > 0);
    const consolidatedArticles: ConsolidatedArticleItem[] = cmd.articles.map(a => ({
      idArticle: a.idArticle,
      nom: a.nom,
      prixUnitaire: a.prixUnitaire,
      quantite: a.quantite,
      sousTotal: a.sousTotal || (a.prixUnitaire * a.quantite),
      categorie: a.categorie
    }));

    setReceiptData({
      isTableReceipt: false,
      table: cmd.table,
      orderIds: [cmd.idCommande],
      date: cmd.dateCreation,
      serveuseNames: cmd.nomServeuse,
      caissierName: currentServeuse.nom,
      articles: consolidatedArticles,
      totalBrut: cmd.montantTotal,
      totalNet: cmd.montantTotal,
      modePaiement: cmd.modePaiement || 'Non payé',
      isProforma: true,
      isComplement: isComplement,
      totalCumuleTable: group ? group.totalBrut : undefined,
      titreReceipt: isComplement 
        ? `BON D'AJOUT #${cmd.idCommande.replace(/\D/g, '').padStart(6, '0')}` 
        : `BON DE COMMANDE #${cmd.idCommande.replace(/\D/g, '').padStart(6, '0')}`
    });
    setIsProformaReceipt(true);
  };

  // Reprint from History
  const handleReprintPaidOrder = (cmd: Commande) => {
    const consolidatedArticles: ConsolidatedArticleItem[] = cmd.articles.map(a => ({
      idArticle: a.idArticle,
      nom: a.nom,
      prixUnitaire: a.prixUnitaire,
      quantite: a.quantite,
      sousTotal: a.sousTotal || (a.prixUnitaire * a.quantite),
      categorie: a.categorie
    }));

    setReceiptData({
      isTableReceipt: false,
      table: cmd.table,
      orderIds: [cmd.idCommande],
      date: cmd.datePaiement || cmd.dateMiseAJour || cmd.dateCreation,
      serveuseNames: cmd.nomServeuse,
      caissierName: cmd.nomCaissier || currentServeuse.nom,
      articles: consolidatedArticles,
      totalBrut: cmd.montantTotal,
      remise: cmd.remise,
      totalNet: typeof cmd.montantFinal === 'number' ? cmd.montantFinal : cmd.montantTotal,
      modePaiement: cmd.modePaiement || 'Espèces',
      montantRecu: cmd.montantRecu,
      monnaieRendue: cmd.monnaieRendue
    });
    setIsProformaReceipt(false);
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  const getElapsedTime = (dateStr: string) => {
    const diffMs = new Date().getTime() - new Date(dateStr).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'À l’instant';
    if (mins < 60) return `Il y a ${mins} min`;
    const hours = Math.floor(mins / 60);
    return `Il y a ${hours}h ${mins % 60}m`;
  };

  return (
    <div className="w-full max-w-[1750px] mx-auto min-h-full flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 p-3 sm:p-5 lg:p-6 pb-24 sm:pb-10 space-y-4">
      
      {/* Top Banner & Tab Navigation */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <CircleDollarSign className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                Espace Caisse & Encaissement
              </h1>
              <span className="bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 text-[10px] font-black uppercase px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                Poste Caissier
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Opérateur : <strong className="text-slate-900 dark:text-white font-bold">{currentServeuse.nom}</strong> ({currentServeuse.idServeuse})
            </p>
          </div>
        </div>

        {/* Cashier Sub-tabs */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700/60 self-start sm:self-auto overflow-x-auto w-full md:w-auto">
          <button
            onClick={() => setActiveTab('pending')}
            className={`flex-1 md:flex-none px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-2 whitespace-nowrap ${
              activeTab === 'pending'
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs ring-1 ring-emerald-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Banknote className="w-4 h-4" />
            <span>À Encaisser</span>
            <span className="bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.2 rounded-full text-[10px] font-black">
              {tableGroups.length} table(s) • {pendingOrders.length} cmd
            </span>
          </button>

          <button
            onClick={() => setActiveTab('my_sales')}
            className={`flex-1 md:flex-none px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-2 whitespace-nowrap ${
              activeTab === 'my_sales'
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs ring-1 ring-emerald-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Mes Encaissements</span>
            <span className="bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-1.5 py-0.2 rounded-full text-[10px] font-black">
              {myProcessedOrders.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('closure')}
            className={`flex-1 md:flex-none px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-2 whitespace-nowrap ${
              activeTab === 'closure'
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs ring-1 ring-emerald-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Lock className="w-4 h-4" />
            <span>Clôture de Caisse (Z)</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: PENDING ORDERS & TABLE ACCOUNTS (CONSOLIDATED PER TABLE) */}
      {/* ========================================================================= */}
      {activeTab === 'pending' && (
        <div className="space-y-4">
          
          {/* Controls Bar with Search & Status Filters */}
          <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            
            {/* Search Input */}
            <div className="relative flex-1 max-w-lg">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher une table, un article ou une serveuse..."
                className="w-full pl-9.5 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white outline-none focus:border-emerald-500 dark:focus:border-emerald-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Preparation state filter buttons */}
            <div className="flex space-x-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
              {[
                { id: 'all', label: 'Toutes les tables' },
                { id: 'Servie', label: '✅ Servie' },
                { id: 'Prête', label: '🔔 Prête' },
                { id: 'En cuisine', label: '🍳 En cuisine' },
                { id: 'En attente', label: '⏳ En attente' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setPrepStatusFilter(f.id as any)}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                    prepStatusFilter === f.id
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Pending KPI Summary Header */}
          {tableGroups.length > 0 && (
            <div className="bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 p-3.5 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center space-x-2 text-emerald-900 dark:text-emerald-200">
                <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>
                  <strong>{tableGroups.length} table(s) active(s)</strong> totalisant <strong>{pendingOrders.length} commande(s)</strong> à encaisser.
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-slate-600 dark:text-slate-400">Total cumulé en salle :</span>
                <span className="font-black text-emerald-700 dark:text-emerald-400 text-sm sm:text-base font-mono">
                  {formatPrice(totalPendingAmount)}
                </span>
              </div>
            </div>
          )}

          {/* Empty State */}
          {tableGroups.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-12 text-center my-6">
              <CheckCircle2 className="w-14 h-14 text-emerald-500 dark:text-emerald-400 mx-auto mb-3" />
              <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-200">
                Toutes les tables sont encaissées !
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                Aucune table en attente de paiement ne correspond à vos filtres de recherche actuels.
              </p>
            </div>
          ) : (
            /* CONSOLIDATED TABLES GRID */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
              {tableGroups.map((group) => {
                const isExpanded = !!expandedTables[group.table];
                const hasMultipleOrders = group.commandes.length > 1;

                return (
                  <div
                    key={group.table}
                    className={`bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 border transition-all flex flex-col justify-between shadow-xs hover:shadow-md ${
                      group.allServiesOrPretes
                        ? 'border-emerald-300 dark:border-emerald-800/80 ring-1 ring-emerald-500/20'
                        : 'border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div>
                      {/* Table Card Top Header */}
                      <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <div className={`w-8 h-8 rounded-xl border flex items-center justify-center font-black ${
                              group.table === 'À emporter'
                                ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400'
                                : 'bg-red-50 dark:bg-red-950/60 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400'
                            }`}>
                              {group.table === 'À emporter' ? <ShoppingBag className="w-4 h-4" /> : <MapPin className="w-4 h-4" />}
                            </div>
                            <div>
                              <h3 className="font-black text-base sm:text-lg text-slate-900 dark:text-white leading-tight">
                                {group.table}
                              </h3>
                              <div className="text-[10px] text-slate-400 flex items-center space-x-1 mt-0.5">
                                <Clock className="w-3 h-3" />
                                <span>Ouverte {getElapsedTime(group.firstOrderDate)}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Cumulative Total Pill */}
                        <div className="text-right">
                          <div className="text-lg sm:text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                            {formatPrice(group.totalBrut)}
                          </div>
                          <span className={`inline-flex items-center space-x-1 text-[10px] font-black px-2 py-0.5 rounded-full border mt-1 ${
                            hasMultipleOrders
                              ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700 animate-pulse'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                          }`}>
                            <Layers className="w-3 h-3" />
                            <span>
                              {group.commandes.length} commande{hasMultipleOrders ? 's cumulées' : ''}
                            </span>
                          </span>
                        </div>
                      </div>

                      {/* Waitstaff & Kitchen Progress Chips */}
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-1.5 text-xs">
                        <div className="flex items-center space-x-1 text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 px-2.5 py-1 rounded-xl border border-slate-100 dark:border-slate-700/60">
                          <User className="w-3.5 h-3.5 text-red-500 shrink-0" />
                          <span className="text-[11px]">
                            Serveuse{group.serveuses.length > 1 ? 's' : ''} : <strong className="text-slate-900 dark:text-white">{group.serveuses.join(', ') || 'Non assignée'}</strong>
                          </span>
                        </div>

                        <div className="flex items-center space-x-1">
                          {group.statuses.map((st, i) => (
                            <span key={i} className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${
                              st === 'Servie'
                                ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                                : st === 'Prête'
                                ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800'
                                : st === 'En cuisine'
                                ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800'
                                : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                            }`}>
                              {st}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Consolidated Items Summary (What the table has ordered in total) */}
                      <div className="mt-3 bg-slate-50/70 dark:bg-slate-800/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-1 text-xs">
                        <div className="flex justify-between items-center text-[11px] font-bold text-slate-500 dark:text-slate-400 pb-1 border-b border-slate-200/60 dark:border-slate-700/50">
                          <span>Articles Consommés sur la Table ({group.totalArticlesCount})</span>
                          <span>Sous-total</span>
                        </div>

                        {group.consolidatedArticles.slice(0, isExpanded ? 50 : 4).map((art, idx) => (
                          <div key={idx} className="flex justify-between items-center py-0.5">
                            <span className="text-slate-700 dark:text-slate-300 truncate font-medium pr-2">
                              <strong className="text-red-600 dark:text-red-400 mr-1.5 font-black">{art.quantite}×</strong>
                              {art.nom}
                            </span>
                            <span className="text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                              {formatPrice(art.sousTotal)}
                            </span>
                          </div>
                        ))}

                        {group.consolidatedArticles.length > 4 && !isExpanded && (
                          <button
                            onClick={() => toggleTableExpand(group.table)}
                            className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold hover:underline pt-1 flex items-center space-x-1"
                          >
                            <span>+ {group.consolidatedArticles.length - 4} autre(s) article(s) cumulé(s)...</span>
                          </button>
                        )}
                      </div>

                      {/* Expandable Order Waves Breakdown (Détail des tournées) */}
                      <div className="mt-2.5">
                        <button
                          onClick={() => toggleTableExpand(group.table)}
                          className="w-full py-1.5 px-2.5 bg-slate-100/80 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-[11px] font-bold flex items-center justify-between transition-colors"
                        >
                          <span className="flex items-center space-x-1.5">
                            <Layers className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            <span>Détail des {group.commandes.length} tournée(s) de la table</span>
                          </span>
                          {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                        </button>

                        {isExpanded && (
                          <div className="mt-2 space-y-2 pl-2 border-l-2 border-emerald-500/40 dark:border-emerald-500/30 animate-in fade-in">
                            {group.commandes.map((cmd, cIdx) => (
                              <div
                                key={cmd.idCommande}
                                className="bg-white dark:bg-slate-900/90 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-[11px] space-y-1.5 shadow-2xs"
                              >
                                <div className="flex justify-between items-center font-bold">
                                  <span className="text-slate-800 dark:text-slate-200 flex items-center space-x-1">
                                    <span className={cIdx === 0 ? "text-slate-700 dark:text-slate-300 font-bold" : "text-amber-600 font-black"}>
                                      {cIdx === 0 ? 'Commande initiale' : `Ajout #${cIdx}`}
                                    </span>
                                    <span className="text-slate-400 font-mono text-[10px]">({cmd.idCommande})</span>
                                  </span>
                                  <div className="flex items-center space-x-2">
                                    <span className="text-red-600 dark:text-red-400 font-mono">
                                      {formatPrice(cmd.montantTotal)}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleOpenSingleOrderProforma(cmd, group, cIdx);
                                      }}
                                      className="p-1 px-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-black flex items-center space-x-1 text-[10px] font-bold border border-slate-200 dark:border-slate-700 transition-colors"
                                      title={cIdx > 0 ? "Imprimer le bon de cet ajout" : "Imprimer ce bon de commande"}
                                    >
                                      <Printer className="w-3 h-3 text-slate-500" />
                                      <span>Imprimer</span>
                                    </button>
                                  </div>
                                </div>

                                <div className="flex justify-between items-center text-[10px] text-slate-400">
                                  <span>{new Date(cmd.dateCreation).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} • {cmd.nomServeuse}</span>
                                  <span className="font-bold text-slate-600 dark:text-slate-300">{cmd.statut}</span>
                                </div>

                                {/* Order Items list */}
                                <div className="space-y-0.5 pt-1 text-[10px] text-slate-500 dark:text-slate-400">
                                  {cmd.articles.map((item, iIdx) => (
                                    <div key={iIdx} className="flex justify-between">
                                      <span>{item.quantite}× {item.nom}</span>
                                      <span>{formatPrice(item.sousTotal || (item.prixUnitaire * item.quantite))}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                    </div>

                    {/* Table Card Main Actions - Single Consolidated Ticket Checkout */}
                    <div className="pt-4 mt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-2">
                      
                      {/* Primary One-Click Table Checkout Button (Generates 1 Single Ticket) */}
                      <button
                        onClick={() => handleOpenTableCheckout(group)}
                        className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs sm:text-sm rounded-2xl flex items-center justify-center space-x-2 transition-all active:scale-98 shadow-sm hover:shadow-md"
                      >
                        <CircleDollarSign className="w-5 h-5" />
                        <span>Encaisser la table • Ticket unique ({formatPrice(group.totalBrut)})</span>
                      </button>

                      {/* Secondary Proforma / Bon de commande Printing Buttons */}
                      {group.commandes.length > 1 ? (
                        <div className="space-y-1.5">
                          <div className="text-[10.5px] font-bold text-amber-700 dark:text-amber-400 flex items-center justify-between px-1">
                            <span>Table avec ajout ({group.commandes.length} commandes)</span>
                            <span className="font-mono text-[9.5px]">Bon avant paiement</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => handleOpenTableProforma(group, 'ajouts')}
                              className="py-2 px-2 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200 font-bold text-xs rounded-xl flex items-center justify-center space-x-1.5 transition-colors"
                              title="Imprimer uniquement les éléments ajoutés"
                            >
                              <Printer className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                              <span className="truncate">Éléments ajoutés</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenTableProforma(group, 'integralite')}
                              className="py-2 px-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl flex items-center justify-center space-x-1.5 transition-colors"
                              title="Imprimer l'intégralité de la commande"
                            >
                              <Printer className="w-3.5 h-3.5 text-slate-500" />
                              <span className="truncate">Intégralité ({group.commandes.length})</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleOpenTableProforma(group, 'integralite')}
                          className="w-full py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl flex items-center justify-center space-x-1.5 transition-colors"
                        >
                          <Printer className="w-3.5 h-3.5 text-slate-500" />
                          <span>Imprimer le bon de commande</span>
                        </button>
                      )}

                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: MY PROCESSED PAYMENTS (HISTORY) */}
      {/* ========================================================================= */}
      {activeTab === 'my_sales' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                Historique des Encaissements
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Tickets soldés par votre session de caisse
              </p>
            </div>

            <div className="flex items-center space-x-3 bg-emerald-50 dark:bg-emerald-950/40 px-3.5 py-2 rounded-2xl border border-emerald-200 dark:border-emerald-800/80">
              <span className="text-xs text-emerald-800 dark:text-emerald-300 font-bold">Total Encaissé :</span>
              <span className="text-sm sm:text-base font-black text-emerald-700 dark:text-emerald-400 font-mono">
                {formatPrice(closureStats.totalGlobal)}
              </span>
            </div>
          </div>

          {myProcessedOrders.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-12 text-center my-6">
              <Receipt className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
              <h3 className="text-sm font-extrabold text-slate-700 dark:text-slate-300">
                Aucun encaissement enregistré pour l'instant
              </h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Les commandes que vous encaissez apparaîtront ici avec la possibilité de réimprimer les tickets.
              </p>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-200 uppercase font-black text-[10px] border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="py-3 px-4">Ticket / Table</th>
                      <th className="py-3 px-4">Heure</th>
                      <th className="py-3 px-4">Serveuse</th>
                      <th className="py-3 px-4">Mode</th>
                      <th className="py-3 px-4 text-right">Montant</th>
                      <th className="py-3 px-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {myProcessedOrders.map((cmd) => {
                      const amount = typeof cmd.montantFinal === 'number' ? cmd.montantFinal : cmd.montantTotal;
                      return (
                        <tr key={cmd.idCommande} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900 dark:text-white">{cmd.table}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{cmd.idCommande}</div>
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px]">
                            {new Date(cmd.datePaiement || cmd.dateMiseAJour || cmd.dateCreation).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="py-3 px-4 font-medium">{cmd.nomServeuse}</td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                              {cmd.modePaiement || 'Espèces'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-black text-slate-900 dark:text-white font-mono">
                            {formatPrice(amount)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={() => handleReprintPaidOrder(cmd)}
                              className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950 text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-lg font-bold text-[11px] transition-colors inline-flex items-center space-x-1"
                            >
                              <Printer className="w-3 h-3" />
                              <span>Réimprimer</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: CASH REGISTER CLOSURE (Z DE CAISSE) */}
      {/* ========================================================================= */}
      {activeTab === 'closure' && (
        <div className="space-y-4 max-w-4xl mx-auto w-full">
          
          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950 border border-purple-200 dark:border-purple-800 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                    Clôture de Caisse (Rapport Z)
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Récapitulatif de session et pointage des espèces
                  </p>
                </div>
              </div>

              <div className="text-right">
                <div className="text-xs text-slate-500 font-medium">Date de session</div>
                <div className="text-xs font-bold text-slate-900 dark:text-white font-mono">
                  {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
              </div>
            </div>

            {/* Mode breakdown KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                  <span>Espèces</span>
                  <Banknote className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white font-mono">
                  {formatPrice(closureStats.totalEspeces)}
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                  <span>Carte Bancaire</span>
                  <CreditCard className="w-4 h-4 text-sky-600" />
                </div>
                <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white font-mono">
                  {formatPrice(closureStats.totalCB)}
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                  <span>Mobile Money</span>
                  <Smartphone className="w-4 h-4 text-amber-600" />
                </div>
                <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white font-mono">
                  {formatPrice(closureStats.totalMobileMoney)}
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                  <span>Tickets / Pass</span>
                  <TicketIcon className="w-4 h-4 text-purple-600" />
                </div>
                <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white font-mono">
                  {formatPrice(closureStats.totalPass)}
                </div>
              </div>
            </div>

            {/* Reconciliation Section */}
            <div className="bg-slate-50 dark:bg-slate-800/40 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4">
              <h3 className="text-xs font-black uppercase text-slate-700 dark:text-slate-300 tracking-wider">
                Vérification et Pointage du Tiroir-Caisse
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Fond de caisse initial :
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={fondDeCaisse}
                      onChange={(e) => setFondDeCaisse(Math.max(0, Number(e.target.value)))}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">FCFA</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Théorique en caisse (Fond + Espèces) :
                  </label>
                  <div className="px-3 py-2 bg-slate-200/70 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-black text-slate-900 dark:text-white font-mono">
                    {formatPrice(closureStats.theoriqueEnCaisse)}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Montant Réel Compté (Espèces) :
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      placeholder="Ex: 85000"
                      value={montantReelCompte}
                      onChange={(e) => setMontantReelCompte(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">FCFA</span>
                  </div>
                </div>
              </div>

              {/* Écart Result Display */}
              {closureStats.ecart !== null && (
                <div className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                  closureStats.ecart === 0
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 text-emerald-800 dark:text-emerald-200'
                    : closureStats.ecart < 0
                    ? 'bg-red-50 dark:bg-red-950/60 border-red-200 text-red-800 dark:text-red-200'
                    : 'bg-sky-50 dark:bg-sky-950/60 border-sky-200 text-sky-800 dark:text-sky-200'
                }`}>
                  <div className="flex items-center space-x-2">
                    {closureStats.ecart === 0 ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                    )}
                    <div>
                      <div className="font-extrabold text-xs sm:text-sm">
                        {closureStats.ecart === 0
                          ? 'Caisse Parfaitement Équilibrée'
                          : closureStats.ecart < 0
                          ? 'Déficit de Caisse (Manquant)'
                          : 'Excédent de Caisse (Surplus)'}
                      </div>
                      <div className="text-[11px] opacity-80">
                        Différence entre le comptage physique et le journal des ventes
                      </div>
                    </div>
                  </div>

                  <div className="text-right font-black text-base sm:text-lg font-mono">
                    {closureStats.ecart > 0 ? `+${formatPrice(closureStats.ecart)}` : formatPrice(closureStats.ecart)}
                  </div>
                </div>
              )}

              {/* Justification if Discrepancy */}
              {closureStats.ecart !== null && closureStats.ecart !== 0 && (
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-red-700 dark:text-red-400">
                    Justification obligatoire de l'écart :
                  </label>
                  <textarea
                    rows={2}
                    value={motifEcart}
                    onChange={(e) => setMotifEcart(e.target.value)}
                    placeholder="Indiquer la raison de l'écart constaté (ex: erreur de rendu monnaie table 3, etc.)..."
                    className="w-full p-2.5 bg-white dark:bg-slate-900 border border-red-300 dark:border-red-800 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:border-red-500"
                  />
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
              <button
                onClick={() => setShowClosurePrintModal(true)}
                className="flex-1 py-3 bg-slate-900 hover:bg-black text-white font-extrabold text-xs rounded-xl flex items-center justify-center space-x-2 transition-all active:scale-98 shadow-xs"
              >
                <Printer className="w-4 h-4" />
                <span>Générer & Imprimer le Rapport Z de Clôture</span>
              </button>

              <button
                onClick={() => {
                  setIsClosureSaved(true);
                  setTimeout(() => setIsClosureSaved(false), 4000);
                }}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl flex items-center justify-center space-x-2 transition-all active:scale-98"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Enregistrer la Clôture</span>
              </button>
            </div>

            {isClosureSaved && (
              <div className="p-3 bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold text-center animate-in fade-in">
                ✓ Clôture de caisse enregistrée avec succès dans le journal d'audit !
              </div>
            )}

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: CHECKOUT & PAYMENT MODAL (SINGLE ORDER OR FULL TABLE) */}
      {/* ========================================================================= */}
      {checkoutTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-xl w-full p-4 sm:p-6 shadow-2xl relative animate-in fade-in zoom-in duration-200 text-slate-800 dark:text-slate-100 my-auto max-h-[92dvh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <CircleDollarSign className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900 dark:text-white">
                    Encaissement • {checkoutTarget.table}
                  </h3>
                  <div className="text-[11px] text-slate-400 font-mono">
                    {checkoutTarget.type === 'table' ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                        Règlement global de la table ({checkoutTarget.commandes.length} commande(s) cumulée(s))
                      </span>
                    ) : (
                      <span>Commande #{checkoutTarget.commandes[0]?.idCommande}</span>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setCheckoutTarget(null)}
                className="text-slate-400 hover:text-slate-700 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 py-4">
              
              {/* Order Items Breakdown Box */}
              <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 max-h-40 overflow-y-auto space-y-1 text-xs">
                <div className="flex justify-between items-center text-[11px] font-bold text-slate-400 pb-1 border-b border-slate-200/50 dark:border-slate-700/50">
                  <span>Détail des consommations à encaisser</span>
                  <span>Montant</span>
                </div>
                {checkoutTarget.consolidatedArticles.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center py-0.5">
                    <span className="text-slate-700 dark:text-slate-300">
                      <strong className="text-red-600 dark:text-red-400 font-black mr-1">{item.quantite}×</strong>
                      {item.nom}
                    </span>
                    <span className="font-mono text-slate-600 dark:text-slate-400">
                      {formatPrice(item.sousTotal || (item.prixUnitaire * item.quantite))}
                    </span>
                  </div>
                ))}
              </div>

              {/* Mode de Paiement Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Mode de paiement :
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'Espèces', icon: Banknote, label: 'Espèces' },
                    { id: 'Carte Bancaire', icon: CreditCard, label: 'Carte Bancaire' },
                    { id: 'Mobile Money', icon: Smartphone, label: 'Mobile Money' },
                    { id: 'Ticket / Pass', icon: TicketIcon, label: 'Ticket / Pass' },
                  ].map((mode) => {
                    const Icon = mode.icon;
                    const isSelected = selectedPaymentMode === mode.id;
                    return (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() => setSelectedPaymentMode(mode.id as ModePaiement)}
                        className={`p-2.5 rounded-xl border flex flex-col items-center justify-center space-y-1 transition-all ${
                          isSelected
                            ? 'bg-emerald-50 dark:bg-emerald-950/70 border-emerald-500 text-emerald-700 dark:text-emerald-300 font-extrabold shadow-xs ring-1 ring-emerald-500'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        <span className="text-[11px]">{mode.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Remises validées (Discount) */}
              <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center space-x-1">
                    <Percent className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Remise commerciale validée :</span>
                  </span>
                  {discountType !== 'none' && (
                    <button
                      onClick={() => handleApplyQuickDiscountPercent(0)}
                      className="text-red-500 hover:underline text-[10px] font-bold"
                    >
                      Annuler remise
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {[0, 5, 10, 15, 20].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => handleApplyQuickDiscountPercent(pct)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                        discountType === 'percent' && discountValue === pct
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {pct === 0 ? 'Aucune' : `-${pct}%`}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setCheckoutTarget(null)}
                className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl"
              >
                Annuler
              </button>

              <button
                type="button"
                disabled={isProcessingPayment}
                onClick={handleConfirmPayment}
                className="flex-2 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs sm:text-sm rounded-xl flex items-center justify-center space-x-2 transition-all active:scale-98 shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessingPayment ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Validation & Impression...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Valider Paiement ({formatPrice(currentCheckoutCalculations.totalNet)})</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: THERMAL RECEIPT MODAL (TICKET DE CAISSE OFFICIEL & ADDITION TABLE) */}
      {/* ========================================================================= */}
      {receiptData && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white text-slate-900 rounded-3xl max-w-sm w-full p-4 sm:p-5 shadow-2xl relative animate-in fade-in zoom-in duration-200 my-auto">
            
            {/* Header controls (Screen only) */}
            <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-slate-200 print:hidden">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-black uppercase text-slate-700">
                  {isProformaReceipt 
                    ? (receiptData.isComplement ? "Bon d'ajout cuisine" : 'Bon de commande table')
                    : (receiptData.isTableReceipt ? 'Ticket Table' : 'Ticket Caisse')
                  }
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg border bg-emerald-50 text-emerald-800 border-emerald-300">
                  Format Conforme POS
                </span>
              </div>

              <button
                onClick={() => setReceiptData(null)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-full hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Option Switcher if table has additions (Only on screen, hidden on print) */}
            {receiptData.hasMultipleOrders && isProformaReceipt && (
              <div className="mb-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 p-2.5 rounded-2xl print:hidden">
                <div className="flex items-center justify-between mb-1.5 text-xs font-bold text-amber-900 dark:text-amber-200">
                  <span className="flex items-center space-x-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    <span>Choix d'impression du bon :</span>
                  </span>
                  <span className="text-[10px] text-amber-700 dark:text-amber-300">
                    {receiptData.tableGroup?.commandes.length} commandes
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-1.5 bg-amber-100/60 dark:bg-amber-900/30 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => handleSwitchProformaMode('ajouts')}
                    className={`py-2 px-2 rounded-lg text-xs font-black transition-all flex flex-col items-center justify-center text-center ${
                      receiptData.selectedPrintOption === 'ajouts'
                        ? 'bg-amber-500 text-white shadow-xs'
                        : 'text-amber-900 dark:text-amber-200 hover:bg-white/60 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <span>Éléments ajoutés</span>
                    <span className="text-[9px] font-medium opacity-90">
                      ({receiptData.addedArticles?.length || 0} art. • {formatPrice(receiptData.addedTotal || 0)})
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSwitchProformaMode('integralite')}
                    className={`py-2 px-2 rounded-lg text-xs font-black transition-all flex flex-col items-center justify-center text-center ${
                      receiptData.selectedPrintOption === 'integralite'
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'text-amber-900 dark:text-amber-200 hover:bg-white/60 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <span>Intégralité</span>
                    <span className="text-[9px] font-medium opacity-90">
                      ({receiptData.allConsolidatedArticles?.length || 0} art. • {formatPrice(receiptData.allTotalBrut || 0)})
                    </span>
                  </button>
                </div>
              </div>
            )}

            {/* Printable Thermal Receipt Card */}
            <ThermalReceipt
              id="thermal-receipt"
              isProforma={isProformaReceipt}
              isComplement={receiptData.isComplement}
              totalCumuleTable={receiptData.totalCumuleTable}
              titreReceipt={receiptData.titreReceipt}
              table={receiptData.table}
              orderIds={receiptData.orderIds}
              date={receiptData.date}
              serveuseNames={receiptData.serveuseNames}
              caissierName={receiptData.caissierName}
              articles={receiptData.articles}
              totalBrut={receiptData.totalBrut}
              remise={receiptData.remise}
              totalNet={receiptData.totalNet}
              modePaiement={receiptData.modePaiement}
              montantRecu={receiptData.montantRecu}
              monnaieRendue={receiptData.monnaieRendue}
            />

            {/* Screen Action Buttons */}
            <div className="mt-3 pt-2.5 border-t border-slate-200 flex gap-2 print:hidden">
              <button
                onClick={handlePrintReceipt}
                className={`flex-1 py-2.5 text-white font-extrabold text-xs rounded-xl flex items-center justify-center space-x-1.5 transition-all shadow-xs ${
                  receiptData.isComplement
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-slate-900 hover:bg-black'
                }`}
              >
                <Printer className="w-4 h-4" />
                <span>
                  {receiptData.isComplement 
                    ? "Imprimer le Bon d'Ajout" 
                    : isProformaReceipt 
                    ? "Imprimer le Bon de Commande" 
                    : "Imprimer Ticket Caisse"}
                </span>
              </button>

              <button
                onClick={() => setReceiptData(null)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
              >
                Fermer
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: RAPPORT Z DE CLÔTURE DE CAISSE (IMPRESSION) */}
      {/* ========================================================================= */}
      {showClosurePrintModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white text-slate-900 rounded-3xl max-w-sm sm:max-w-md w-full p-4 sm:p-5 shadow-2xl relative animate-in fade-in zoom-in duration-200 my-auto">
            
            <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-slate-200 print:hidden">
              <span className="text-xs font-black uppercase text-purple-700">
                Aperçu Rapport Z
              </span>
              <button
                onClick={() => setShowClosurePrintModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-full hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div id="thermal-closure-receipt" className="printable-thermal font-mono font-bold text-[11px] leading-tight space-y-1 bg-white p-2 text-black">
              <div className="text-center pb-0.5">
                <img 
                  src="/logo.png" 
                  alt="Logo Milgos" 
                  referrerPolicy="no-referrer"
                  onError={(e) => { 
                    const img = e.currentTarget as HTMLImageElement;
                    if (img.src.includes('/logo.png')) {
                      img.src = 'https://lh3.googleusercontent.com/d/1lsjEbs-loMm1NyLaLSeZbCxcudmxpqPG';
                    }
                  }}
                  className="w-12 h-12 object-contain mx-auto mb-1" 
                />
                <h2 className="text-base font-black uppercase leading-none">MILGOS - RAPPORT Z</h2>
                <p className="text-[10px] text-black font-bold mt-0.5">Clôture Journalière • {new Date().toLocaleString('fr-FR')}</p>
              </div>

              <div className="border-t border-b border-dashed border-black py-1 text-[10px] space-y-0.5 font-bold text-black">
                <div className="flex justify-between">
                  <span>Caissier :</span>
                  <strong className="font-black">{currentServeuse.nom}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Tickets encaissés :</span>
                  <strong className="font-black">{closureStats.nombreTickets}</strong>
                </div>
              </div>

              <div className="space-y-0.5 text-[10px] font-bold text-black">
                <div className="font-black border-b border-black pb-0.5 text-[11px]">VENTES PAR MODE</div>
                <div className="flex justify-between">
                  <span>Espèces :</span>
                  <span>{formatPrice(closureStats.totalEspeces)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Carte Bancaire :</span>
                  <span>{formatPrice(closureStats.totalCB)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Mobile Money :</span>
                  <span>{formatPrice(closureStats.totalMobileMoney)}</span>
                </div>
                {closureStats.totalPass > 0 && (
                  <div className="flex justify-between">
                    <span>Tickets / Pass :</span>
                    <span>{formatPrice(closureStats.totalPass)}</span>
                  </div>
                )}
                <div className="flex justify-between font-black border-t border-black pt-0.5 text-xs">
                  <span>TOTAL ENCAISSÉ :</span>
                  <span>{formatPrice(closureStats.totalGlobal)}</span>
                </div>
              </div>

              <div className="border-t border-dashed border-black pt-1 space-y-0.5 text-[10px] font-bold text-black">
                <div className="flex justify-between">
                  <span>Fond initial :</span>
                  <span>{formatPrice(fondDeCaisse)}</span>
                </div>
                <div className="flex justify-between font-black">
                  <span>Théorique en caisse :</span>
                  <span>{formatPrice(closureStats.theoriqueEnCaisse)}</span>
                </div>
                {closureStats.reelNum !== null && (
                  <>
                    <div className="flex justify-between">
                      <span>Réel compté :</span>
                      <span>{formatPrice(closureStats.reelNum)}</span>
                    </div>
                    <div className="flex justify-between font-black text-xs text-black">
                      <span>Écart :</span>
                      <span>{closureStats.ecart !== null && closureStats.ecart > 0 ? `+${formatPrice(closureStats.ecart)}` : formatPrice(closureStats.ecart || 0)}</span>
                    </div>
                  </>
                )}
              </div>

              <div className="border-t border-black pt-2 mt-2 flex justify-between text-[9px] text-black font-bold">
                <div>Visa Caissier</div>
                <div>Visa Responsable</div>
              </div>
            </div>

            <div className="mt-3 pt-2.5 border-t border-slate-200 flex gap-2 print:hidden">
              <button
                onClick={handlePrintReceipt}
                className="flex-1 py-2.5 bg-purple-700 hover:bg-purple-800 text-white font-extrabold text-xs rounded-xl flex items-center justify-center space-x-1.5 transition-all shadow-xs"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimer Rapport Z</span>
              </button>

              <button
                onClick={() => setShowClosurePrintModal(false)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
              >
                Fermer
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

import React from 'react';

export interface ThermalReceiptItem {
  idArticle?: string;
  nom: string;
  prixUnitaire: number;
  quantite: number;
  sousTotal?: number;
  notes?: string;
}

export interface ThermalReceiptProps {
  id?: string;
  className?: string;
  isProforma?: boolean;
  isComplement?: boolean;
  totalCumuleTable?: number;
  titreReceipt?: string;
  notesCommande?: string;
  table?: string;
  orderIds?: string[] | string;
  date: string | Date;
  serveuseNames?: string;
  caissierName?: string;
  articles: ThermalReceiptItem[];
  totalBrut?: number;
  remise?: {
    type: 'percent' | 'fixed';
    valeur: number;
    montantRemise: number;
  };
  totalNet: number;
  modePaiement?: string;
  montantRecu?: number;
  monnaieRendue?: number;
}

/**
 * Format numbers with space separator (e.g., 8 000)
 */
export function formatReceiptNumber(val: number | undefined | null): string {
  if (val === undefined || val === null || isNaN(val)) return '0';
  return Math.round(val)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

/**
 * Format date in authentic French POS format: DD/MM/YYYY HH:mm:ss
 */
export function formatReceiptDateTime(val?: string | Date): string {
  try {
    const d = val ? new Date(val) : new Date();
    if (isNaN(d.getTime())) {
      const now = new Date();
      return `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    }
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  } catch {
    return '06/09/2026 16:57:17';
  }
}

/**
 * Format order ID as #001998
 */
export function formatReceiptTicketNumber(orderIds?: string[] | string): string {
  if (!orderIds) return '001998';
  const first = Array.isArray(orderIds) ? (orderIds[0] || '') : orderIds;
  const digits = first.replace(/\D/g, '');
  if (digits) {
    return digits.padStart(6, '0');
  }
  return first.replace(/^CMD-/, '') || '001998';
}

export const ThermalReceipt: React.FC<ThermalReceiptProps> = ({
  id = 'thermal-receipt',
  className = '',
  isProforma = false,
  isComplement = false,
  totalCumuleTable,
  titreReceipt,
  notesCommande,
  table,
  orderIds,
  date,
  serveuseNames,
  caissierName,
  articles = [],
  remise,
  totalNet,
  modePaiement,
  montantRecu,
  monnaieRendue
}) => {
  const formattedTicketNum = formatReceiptTicketNumber(orderIds);
  const formattedDate = formatReceiptDateTime(date);

  // Group multiple orders display if several
  const allOrderNumbers = Array.isArray(orderIds) && orderIds.length > 1
    ? orderIds.map(o => formatReceiptTicketNumber(o)).join(', #')
    : null;

  const defaultTitle = isComplement
    ? `BON D'AJOUT #${formattedTicketNum}`
    : isProforma
    ? `BON DE COMMANDE #${formattedTicketNum}`
    : `TICKET #${formattedTicketNum}`;

  return (
    <div
      id={id}
      className={`printable-thermal font-mono font-bold text-[11px] leading-tight text-black bg-white p-2.5 max-w-[72mm] mx-auto select-none ${className}`}
      style={{
        fontFamily: "'Courier New', Courier, monospace",
        color: '#000000',
        fontWeight: 700
      }}
    >
      {/* 1. BRAND LOGO AT TOP (Identical to header) */}
      <div className="text-center pb-1">
        <img
          src="/logo.png"
          alt="MILGO'S"
          referrerPolicy="no-referrer"
          onError={(e) => {
            const img = e.currentTarget as HTMLImageElement;
            if (img.src.includes('/logo.png')) {
              img.src = 'https://lh3.googleusercontent.com/d/1lsjEbs-loMm1NyLaLSeZbCxcudmxpqPG';
            }
          }}
          className="w-14 h-14 object-contain mx-auto mb-1 block"
        />

        {/* Brand Name & Location Info */}
        <h1 className="text-base font-black tracking-wider uppercase leading-none font-mono">
          MILGO'S
        </h1>
        <p className="text-[10.5px] font-bold mt-1 text-black">
          Douala Bonamoussadi carrefour KM
        </p>
        <p className="text-[10.5px] font-bold text-black">
          Tel: +237 698972946 / 681528459
        </p>
      </div>

      {/* 2. TICKET TITLE & NUMBER */}
      <div className="text-center my-2 space-y-0.5">
        <h2 className="text-base sm:text-lg font-black tracking-wider uppercase leading-tight font-mono text-black">
          {titreReceipt || defaultTitle}
        </h2>
        {allOrderNumbers && (
          <p className="text-[9.5px] font-bold text-black">
            (Commandes : #{allOrderNumbers})
          </p>
        )}
        {isComplement ? (
          <div className="my-1">
            <span className="text-[10px] font-black text-white bg-black px-2 py-0.5 uppercase tracking-wide inline-block">
              *** ÉLÉMENTS AJOUTÉS UNIQUEMENT ***
            </span>
          </div>
        ) : isProforma ? (
          <span className="text-[10px] font-black text-black block uppercase tracking-wide">
            *** BON DE COMMANDE AVANT PAIEMENT ***
          </span>
        ) : null}
      </div>

      {/* 3. DATE & CONTEXT (Table & Server if available) */}
      <div className="space-y-0.5 text-[10px] font-bold text-black py-0.5">
        <div className="text-left font-bold">
          Date: {formattedDate}
        </div>
        {(table && table !== 'Sans table') || serveuseNames ? (
          <div className="flex justify-between text-[10px] font-bold">
            {table && table !== 'Sans table' && (
              <span>Table : <strong className="font-black">{table}</strong></span>
            )}
            {serveuseNames && (
              <span>Serv : <strong className="font-bold">{serveuseNames}</strong></span>
            )}
          </div>
        ) : null}
        {notesCommande && (
          <div className="border border-black p-1 text-[9.5px] font-bold text-black mt-1">
            <span className="underline">NOTE CUISINE :</span> {notesCommande}
          </div>
        )}
      </div>

      {/* 4. DASHED SEPARATOR */}
      <div className="border-t border-dashed border-black my-1" />

      {/* 5. 4-COLUMN TABLE HEADER */}
      <div className="grid grid-cols-12 text-[10px] font-black uppercase tracking-tight py-0.5 text-black">
        <span className="col-span-6 text-left">PRODUIT</span>
        <span className="col-span-2 text-center">QTE</span>
        <span className="col-span-2 text-right">PRIX</span>
        <span className="col-span-2 text-right">MONTANT</span>
      </div>

      {/* 6. DASHED SEPARATOR */}
      <div className="border-t border-dashed border-black my-1" />

      {/* 7. ARTICLES LIST */}
      <div className="space-y-1.5 my-1 text-[10.5px] font-bold text-black">
        {articles.map((art, idx) => {
          const sousTotal = art.sousTotal !== undefined 
            ? art.sousTotal 
            : (art.prixUnitaire * art.quantite);
            
          return (
            <div key={idx} className="space-y-0.5 leading-tight font-bold">
              <div className="grid grid-cols-12 items-baseline font-bold text-black">
                {/* Product Name (wraps neatly if long) */}
                <span className="col-span-6 text-left pr-1 font-bold break-words">
                  {art.nom}
                </span>
                
                {/* Quantity */}
                <span className="col-span-2 text-center font-bold">
                  {art.quantite}
                </span>

                {/* Unit Price */}
                <span className="col-span-2 text-right tabular-nums whitespace-nowrap font-bold">
                  {formatReceiptNumber(art.prixUnitaire)}
                </span>

                {/* Montant (Sous-total) */}
                <span className="col-span-2 text-right tabular-nums whitespace-nowrap font-bold">
                  {formatReceiptNumber(sousTotal)}
                </span>
              </div>

              {/* Accompaniment / Notes (e.g., + Acc) */}
              {art.notes && (
                <div className="text-[10px] text-black font-bold pl-1 italic">
                  {art.notes.startsWith('+') ? art.notes : `+ ${art.notes}`}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 8. DASHED SEPARATOR */}
      <div className="border-t border-dashed border-black my-1" />

      {/* 9. TOTALS & FINANCIAL BREAKDOWN */}
      <div className="pt-0.5 space-y-1 text-black font-bold">
        {remise && remise.montantRemise > 0 && (
          <div className="flex justify-between items-baseline text-[10.5px] font-bold text-black">
            <span>REMISE ({remise.type === 'percent' ? `${remise.valeur}%` : 'Fixe'}) :</span>
            <span>-{formatReceiptNumber(remise.montantRemise)} FCFA</span>
          </div>
        )}

        <div className="flex justify-between items-baseline text-sm font-black pt-0.5 text-black">
          <span className="font-black tracking-wider">
            {isComplement ? 'TOTAL AJOUTS :' : isProforma ? 'TOTAL COMMANDE :' : 'TOTAL :'}
          </span>
          <span className="font-black tabular-nums whitespace-nowrap">
            {formatReceiptNumber(totalNet)} FCFA
          </span>
        </div>

        {/* If isComplement and cumulative table total is provided */}
        {isComplement && typeof totalCumuleTable === 'number' && totalCumuleTable > 0 && (
          <div className="flex justify-between items-baseline text-[11px] font-black pt-1 border-t border-dotted border-black text-black">
            <span>NOUVEAU TOTAL TABLE :</span>
            <span className="font-mono font-black tabular-nums">
              {formatReceiptNumber(totalCumuleTable)} FCFA
            </span>
          </div>
        )}

        {/* Payment details if completed checkout */}
        {!isProforma && !isComplement && modePaiement && modePaiement !== 'Non payé' && modePaiement !== 'En attente' && (
          <div className="pt-1 text-[10px] font-bold text-black border-t border-dotted border-black/40 space-y-0.5">
            <div className="flex justify-between">
              <span>Mode : {modePaiement}</span>
              {caissierName && <span>Caisse : {caissierName}</span>}
            </div>
            {typeof montantRecu === 'number' && montantRecu > 0 && (
              <div className="flex justify-between">
                <span>Reçu : {formatReceiptNumber(montantRecu)} FCFA</span>
                <span>Rendu : {formatReceiptNumber(monnaieRendue || 0)} FCFA</span>
              </div>
            )}
          </div>
        )}

        {/* Notice for Proforma / Addition / Ajout */}
        {(isProforma || isComplement) && (
          <div className="text-[9.5px] font-bold text-center text-black pt-1 border-t border-dotted border-black/40">
            (Bon de commande avant paiement • À régler à la caisse)
          </div>
        )}
      </div>

      {/* 10. FOOTER: MESSAGE DE REMERCIEMENT UNIQUEMENT */}
      <div className="text-center pt-2 mt-2 border-t border-dashed border-black text-black">
        <p className="text-[11px] font-bold leading-tight text-black">
          Merci de votre visite et a bientot !
        </p>
      </div>
    </div>
  );
};

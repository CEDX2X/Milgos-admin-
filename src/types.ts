export type RoleServeuse = 'serveuse' | 'admin' | 'cuisine';

export interface Serveuse {
  _id?: string;
  idServeuse: string; // ex: "SRV-001"
  nom: string;
  pin: string;
  role: RoleServeuse;
  actif: boolean;
  commandesTraitees?: number;
  chiffreAffaires?: number;
  dateCreation?: string;
}

export interface Categorie {
  _id?: string;
  idCategorie: string;
  nom: string;
  emoji?: string;
  couleur?: string;
  dateCreation?: string;
}

export type CategorieArticle = string;

export interface Article {
  _id?: string;
  idArticle: string; // ex: "ART-101"
  nom: string;
  categorie: CategorieArticle;
  prix: number;
  stock: number;
  stockInitial: number;
  image?: string;
  emoji?: string;
  actif: boolean;
  description?: string;
}

export type StatutCommande = 'En attente' | 'En cuisine' | 'Servie' | 'Payée' | 'Annulée';
export type ModePaiement = 'Espèces' | 'Carte Bancaire' | 'Ticket / Pass' | 'Non payé';

export interface ArticleCommande {
  idArticle: string;
  nom: string;
  prixUnitaire: number;
  quantite: number;
  sousTotal: number;
  notes?: string;
}

export interface Commande {
  _id?: string;
  idCommande: string; // ex: "CMD-2026-0042"
  idServeuse: string;
  nomServeuse: string;
  table: string; // ex: "Table 04", "Bar", "VIP 1"
  articles: ArticleCommande[];
  montantTotal: number;
  statut: StatutCommande;
  modePaiement: ModePaiement;
  notesServeuse?: string;
  dateCreation: string;
  dateMiseAJour?: string;
}

export interface StatistiquesVentes {
  chiffreAffairesTotal: number;
  nombreCommandes: number;
  panierMoyen: number;
  commandesAujourdhui: number;
  articlesEnRupture: number;
  ventesParCategorie: Record<string, number>;
  topServeuses: { idServeuse: string; nom: string; totalCommandes: number; totalVentes: number }[];
  topArticles: { idArticle: string; nom: string; quantiteVendue: number; chiffreAffaires: number }[];
}

export type VueActive = 'commande' | 'suivi' | 'catalogue' | 'serveuses' | 'historique' | 'parametres';

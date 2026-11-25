export type RoleServeuse = 'serveuse' | 'admin' | 'cuisine' | 'barman' | 'caissier';

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
  permissions?: string[];
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

export type StatutCommande = 'En attente' | 'En cuisine' | 'Prête' | 'Servie' | 'Payée' | 'Annulée';
export type ModePaiement = 'Espèces' | 'Carte Bancaire' | 'Mobile Money' | 'Ticket / Pass' | 'Non payé';

export interface RemiseCommande {
  type: 'percent' | 'fixed';
  valeur: number;
  montantRemise: number;
}

export interface ArticleCommande {
  idArticle: string;
  nom: string;
  prixUnitaire: number;
  quantite: number;
  sousTotal: number;
  categorie?: string;
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
  
  // Caissier & Encaissement Traceability
  idCaissier?: string;
  nomCaissier?: string;
  remise?: RemiseCommande;
  montantFinal?: number;
  montantRecu?: number;
  monnaieRendue?: number;
  datePaiement?: string;
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

export type VueActive = 'commande' | 'suivi' | 'caisse' | 'catalogue' | 'serveuses' | 'historique' | 'parametres';

export interface DeviceRegistration {
  idAppareil: string; // Identifiant unique de l'appareil (ex: "DEV-A84B1C")
  nomAppareil: string; // Nom convivial (ex: "iPhone 14 Alice", "Tablette Cuisine")
  idProfil: string; // Identifiant du profil connecté (ex: "SRV-001")
  nomProfil: string; // Nom de l'utilisateur (ex: "Alice Kouamé")
  role: RoleServeuse; // Rôle du profil
  hasPushSubscription: boolean;
  dateCreation: string;
  derniereActivite: string;
  userAgent?: string;
}

export interface TargetNotificationPayload {
  targetIdProfil?: string; // Filtrer par ID de profil (ex: "SRV-001")
  targetIdAppareil?: string; // Filtrer par ID d'appareil (ex: "DEV-A84B1C")
  targetRole?: RoleServeuse | 'all'; // Filtrer par rôle
  title: string;
  body: string;
  tag?: string;
  data?: any;
}


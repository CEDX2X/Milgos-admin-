import { Article, Serveuse, Commande, Categorie } from '../types';

export const INITIAL_CATEGORIES: Categorie[] = [
  { idCategorie: 'CAT-001', nom: 'Cocktails', emoji: '🍹' },
  { idCategorie: 'CAT-002', nom: 'Boissons', emoji: '🍺' },
  { idCategorie: 'CAT-003', nom: 'Entrées', emoji: '🧀' },
  { idCategorie: 'CAT-004', nom: 'Plats', emoji: '🍔' },
  { idCategorie: 'CAT-005', nom: 'Desserts', emoji: '🍰' },
  { idCategorie: 'CAT-006', nom: 'Snacks', emoji: '🍟' },
  { idCategorie: 'CAT-007', nom: 'Autre', emoji: '📦' }
];

export const INITIAL_TABLES = [
  { idTable: 'TBL-001', nom: 'Table 01' },
  { idTable: 'TBL-002', nom: 'Table 02' },
  { idTable: 'TBL-003', nom: 'Table 03' },
  { idTable: 'TBL-004', nom: 'Table 04' },
  { idTable: 'TBL-005', nom: 'Table 05' },
  { idTable: 'TBL-006', nom: 'Terrasse 1' },
  { idTable: 'TBL-007', nom: 'Terrasse 2' },
  { idTable: 'TBL-008', nom: 'Bar' },
];

export const INITIAL_SERVEUSES: Serveuse[] = [
  {
    idServeuse: 'admin1',
    nom: 'admin1',
    pin: '0000',
    role: 'admin',
    actif: true,
    commandesTraitees: 0,
    chiffreAffaires: 0
  }
];

export const INITIAL_ARTICLES: Article[] = [
  // Boissons & Cocktails
  {
    idArticle: 'ART-001',
    nom: 'Mojito Artisanal 25cl',
    categorie: 'Cocktails',
    prix: 3500,
    stock: 45,
    stockInitial: 60,
    image: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80',
    emoji: '🍹',
    actif: true,
    description: 'Rhum ambré, menthe fraîche, citron vert, eau gazeuse'
  },
  {
    idArticle: 'ART-002',
    nom: 'Spritz Aperol',
    categorie: 'Cocktails',
    prix: 3000,
    stock: 30,
    stockInitial: 50,
    image: 'https://images.unsplash.com/photo-1560512823-829485b8bf24?auto=format&fit=crop&w=600&q=80',
    emoji: '🍸',
    actif: true,
    description: 'Prosecco, Aperol, eau pétillante et tranche d orange'
  },
  {
    idArticle: 'ART-003',
    nom: 'Bière Pression Blonde 33cl',
    categorie: 'Boissons',
    prix: 2000,
    stock: 85,
    stockInitial: 120,
    image: 'https://images.unsplash.com/photo-1608270586620-248524c67de9?auto=format&fit=crop&w=600&q=80',
    emoji: '🍺',
    actif: true,
    description: 'Bière blonde artisanale bio fraîche'
  },
  {
    idArticle: 'ART-004',
    nom: 'Verre de Vin Rouge (Bordeaux)',
    categorie: 'Boissons',
    prix: 2500,
    stock: 3, // Stock faible pour tester l'alerte
    stockInitial: 40,
    image: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=600&q=80',
    emoji: '🍷',
    actif: true,
    description: 'AOP Bordeaux Supérieur 2021'
  },
  {
    idArticle: 'ART-005',
    nom: 'Limonade Citron-Gingembre',
    categorie: 'Boissons',
    prix: 1500,
    stock: 0, // Rupture de stock pour tester le blocage
    stockInitial: 30,
    image: 'https://images.unsplash.com/photo-1621263764928-df1444c5e859?auto=format&fit=crop&w=600&q=80',
    emoji: '🥤',
    actif: true,
    description: 'Limonade maison bio à la pulpe de citron'
  },
  {
    idArticle: 'ART-006',
    nom: 'Eau Minérale 50cl',
    categorie: 'Boissons',
    prix: 1000,
    stock: 120,
    stockInitial: 150,
    image: 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?auto=format&fit=crop&w=600&q=80',
    emoji: '💧',
    actif: true,
    description: 'Eau de source naturelle'
  },

  // Plats & Entrées
  {
    idArticle: 'ART-007',
    nom: 'Planche Mixte Charcuterie & Fromage',
    categorie: 'Entrées',
    prix: 6000,
    stock: 18,
    stockInitial: 25,
    image: 'https://images.unsplash.com/photo-1541529086526-db283c563270?auto=format&fit=crop&w=600&q=80',
    emoji: '🧀',
    actif: true,
    description: 'Jambon cru, rosette, comté AOP, brie et condiments'
  },
  {
    idArticle: 'ART-008',
    nom: 'Tapas Croquetas au Jambon (x6)',
    categorie: 'Entrées',
    prix: 3000,
    stock: 22,
    stockInitial: 40,
    image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=600&q=80',
    emoji: '🧆',
    actif: true,
    description: 'Croquettes espagnoles fondantes au béchamel et jambon'
  },
  {
    idArticle: 'ART-009',
    nom: 'Burger Gourmet Frites Maison',
    categorie: 'Plats',
    prix: 6500,
    stock: 12,
    stockInitial: 35,
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80',
    emoji: '🍔',
    actif: true,
    description: 'Pain brioché, steak haché 150g, cheddar affiné, sauce maison'
  },
  {
    idArticle: 'ART-010',
    nom: 'Bowl Végétalien Avocat & Quinoa',
    categorie: 'Plats',
    prix: 5500,
    stock: 15,
    stockInitial: 20,
    image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80',
    emoji: '🥗',
    actif: true,
    description: 'Avocat, quinoa, edamame, patates douces rôties, sésame'
  },

  // Desserts & Snacks
  {
    idArticle: 'ART-011',
    nom: 'Tiramisu au Café',
    categorie: 'Desserts',
    prix: 2500,
    stock: 8,
    stockInitial: 20,
    image: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?auto=format&fit=crop&w=600&q=80',
    emoji: '🍰',
    actif: true,
    description: 'Tiramisu traditionnel au mascarpone et cacao pur'
  },
  {
    idArticle: 'ART-012',
    nom: 'Gaufre Liégeoise Chocolat',
    categorie: 'Desserts',
    prix: 2000,
    stock: 25,
    stockInitial: 40,
    image: 'https://images.unsplash.com/photo-1562376552-0d160a2f238d?auto=format&fit=crop&w=600&q=80',
    emoji: '🧇',
    actif: true,
    description: 'Gaufre chaude avec coulis de chocolat noir'
  },
  {
    idArticle: 'ART-013',
    nom: 'Barquette Frites Croustillantes',
    categorie: 'Snacks',
    prix: 1500,
    stock: 50,
    stockInitial: 80,
    image: 'https://images.unsplash.com/photo-1576107232684-1279f390859f?auto=format&fit=crop&w=600&q=80',
    emoji: '🍟',
    actif: true,
    description: 'Frites fraîches dorées avec sauces au choix'
  }
];

export const INITIAL_COMMANDES: Commande[] = [
  {
    idCommande: 'CMD-2026-0001',
    idServeuse: 'SRV-001',
    nomServeuse: 'Sophie Martin',
    table: 'Table 03',
    articles: [
      { idArticle: 'ART-001', nom: 'Mojito Artisanal 25cl', prixUnitaire: 3500, quantite: 2, sousTotal: 7000 },
      { idArticle: 'ART-007', nom: 'Planche Mixte Charcuterie & Fromage', prixUnitaire: 6000, quantite: 1, sousTotal: 6000 }
    ],
    montantTotal: 13000,
    statut: 'Servie',
    modePaiement: 'Carte Bancaire',
    dateCreation: new Date(Date.now() - 3600000 * 2).toISOString(),
    dateMiseAJour: new Date(Date.now() - 3600000 * 1.5).toISOString()
  },
  {
    idCommande: 'CMD-2026-0002',
    idServeuse: 'SRV-002',
    nomServeuse: 'Camille Bernard',
    table: 'Table 08',
    articles: [
      { idArticle: 'ART-009', nom: 'Burger Gourmet Frites Maison', prixUnitaire: 6500, quantite: 2, sousTotal: 13000 },
      { idArticle: 'ART-003', nom: 'Bière Pression Blonde 33cl', prixUnitaire: 2000, quantite: 2, sousTotal: 4000 }
    ],
    montantTotal: 17000,
    statut: 'En cuisine',
    modePaiement: 'Non payé',
    dateCreation: new Date(Date.now() - 1800000).toISOString(),
    dateMiseAJour: new Date(Date.now() - 1200000).toISOString()
  },
  {
    idCommande: 'CMD-2026-0003',
    idServeuse: 'SRV-001',
    nomServeuse: 'Sophie Martin',
    table: 'Bar VIP 2',
    articles: [
      { idArticle: 'ART-002', nom: 'Spritz Aperol', prixUnitaire: 3000, quantite: 3, sousTotal: 9000 }
    ],
    montantTotal: 9000,
    statut: 'En attente',
    modePaiement: 'Espèces',
    dateCreation: new Date(Date.now() - 600000).toISOString()
  }
];

import { Article, Serveuse, Commande, Categorie } from '../types';

export const INITIAL_CATEGORIES: Categorie[] = [
  { idCategorie: 'CAT-001', nom: 'Fired Up Chicken', emoji: '🍗', couleur: '#dc2626' },
  { idCategorie: 'CAT-002', nom: 'Poulet Mayo', emoji: '🍗', couleur: '#ea580c' },
  { idCategorie: 'CAT-003', nom: 'Poulet Pané', emoji: '🍗', couleur: '#d97706' },
  { idCategorie: 'CAT-004', nom: 'Burgers', emoji: '🍔', couleur: '#ca8a04' },
  { idCategorie: 'CAT-005', nom: 'Pizzas', emoji: '🍕', couleur: '#e11d48' },
  { idCategorie: 'CAT-006', nom: 'Bowls', emoji: '🥣', couleur: '#16a34a' },
  { idCategorie: 'CAT-007', nom: 'Salades', emoji: '🥗', couleur: '#059669' },
  { idCategorie: 'CAT-008', nom: 'Petit-Déjeuner', emoji: '🍳', couleur: '#eab308' },
  { idCategorie: 'CAT-009', nom: 'Combo', emoji: '🍱', couleur: '#0284c7' },
  { idCategorie: 'CAT-010', nom: 'Family & Sharing', emoji: '👨‍👩‍👧‍👦', couleur: '#7c3aed' },
  { idCategorie: 'CAT-011', nom: 'Menu Enfants', emoji: '🧒', couleur: '#ec4899' },
  { idCategorie: 'CAT-012', nom: 'Desserts & Glaces', emoji: '🍨', couleur: '#db2777' },
  { idCategorie: 'CAT-013', nom: 'Accompagnements', emoji: '🍟', couleur: '#d97706' },
  { idCategorie: 'CAT-014', nom: 'Boissons', emoji: '🥤', couleur: '#2563eb' }
];

export const INITIAL_TABLES = [
  { idTable: 'TBL-001', nom: 'Table 01' },
  { idTable: 'TBL-002', nom: 'Table 02' },
  { idTable: 'TBL-003', nom: 'Table 03' },
  { idTable: 'TBL-004', nom: 'Table 04' },
  { idTable: 'TBL-005', nom: 'Table 05' },
  { idTable: 'TBL-006', nom: 'Terrasse 1' },
  { idTable: 'TBL-007', nom: 'Terrasse 2' },
  { idTable: 'TBL-008', nom: 'VIP 1' },
  { idTable: 'TBL-009', nom: 'Bar' },
  { idTable: 'TBL-010', nom: 'À Emporter' }
];

export const INITIAL_SERVEUSES: Serveuse[] = [
  {
    idServeuse: 'admin1',
    nom: 'admin1',
    pin: '0000',
    role: 'admin',
    actif: true,
    commandesTraitees: 0,
    chiffreAffaires: 0,
    dateCreation: new Date().toISOString()
  },
  {
    idServeuse: 'caissier1',
    nom: 'Caissier Principal',
    pin: '1234',
    role: 'caissier',
    actif: true,
    commandesTraitees: 0,
    chiffreAffaires: 0,
    dateCreation: new Date().toISOString()
  },
  {
    idServeuse: 'serveuse1',
    nom: 'Serveuse Marie',
    pin: '1234',
    role: 'serveuse',
    actif: true,
    commandesTraitees: 0,
    chiffreAffaires: 0,
    dateCreation: new Date().toISOString()
  },
  {
    idServeuse: 'cuisinier1',
    nom: 'Chef Paul (Cuisine)',
    pin: '1234',
    role: 'cuisine',
    actif: true,
    commandesTraitees: 0,
    chiffreAffaires: 0,
    dateCreation: new Date().toISOString()
  },
  {
    idServeuse: 'barman1',
    nom: 'Barman Alex (Bar)',
    pin: '1234',
    role: 'barman',
    actif: true,
    commandesTraitees: 0,
    chiffreAffaires: 0,
    dateCreation: new Date().toISOString()
  }
];

export const INITIAL_ARTICLES: Article[] = [
  // 1. FIRED UP CHICKEN
  {
    idArticle: 'ART-MIL-001',
    nom: '1/4 Poulet + Acc',
    categorie: 'Fired Up Chicken',
    prix: 2500,
    stock: 40,
    stockInitial: 50,
    image: 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?auto=format&fit=crop&w=600&q=80',
    emoji: '🍗',
    actif: true,
    description: '1/4 de poulet braisé savoureux avec 1 accompagnement au choix (Frites, Riz épicé ou Alloco).'
  },
  {
    idArticle: 'ART-MIL-002',
    nom: '1/2 Poulet + Acc',
    categorie: 'Fired Up Chicken',
    prix: 4500,
    stock: 30,
    stockInitial: 40,
    image: 'https://images.unsplash.com/photo-1527477321005-4d45d314bc33?auto=format&fit=crop&w=600&q=80',
    emoji: '🍗',
    actif: true,
    description: '1/2 poulet braisé juteux et mariné avec 1 accompagnement au choix.'
  },
  {
    idArticle: 'ART-MIL-003',
    nom: 'Poulet Entier + 2 Acc',
    categorie: 'Fired Up Chicken',
    prix: 7500,
    stock: 20,
    stockInitial: 30,
    image: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&w=600&q=80',
    emoji: '🍗',
    actif: true,
    description: 'Poulet entier braisé à la flamme servi avec 2 accompagnements au choix.'
  },
  {
    idArticle: 'ART-MIL-004',
    nom: '4 Ailes de poulet braisées + Acc',
    categorie: 'Fired Up Chicken',
    prix: 4500,
    stock: 35,
    stockInitial: 45,
    image: 'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?auto=format&fit=crop&w=600&q=80',
    emoji: '🍗',
    actif: true,
    description: '4 ailes de poulet braisées croustillantes servies avec accompagnement au choix.'
  },
  {
    idArticle: 'ART-MIL-005',
    nom: '6 Ailes de poulet braisées + Acc',
    categorie: 'Fired Up Chicken',
    prix: 7500,
    stock: 25,
    stockInitial: 35,
    image: 'https://images.unsplash.com/photo-1524182576066-1be961098794?auto=format&fit=crop&w=600&q=80',
    emoji: '🍗',
    actif: true,
    description: '6 ailes de poulet braisées généreuses avec accompagnement au choix.'
  },
  {
    idArticle: 'ART-MIL-006',
    nom: '12 Ailes de poulet braisées + Acc',
    categorie: 'Fired Up Chicken',
    prix: 9500,
    stock: 15,
    stockInitial: 25,
    image: 'https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?auto=format&fit=crop&w=600&q=80',
    emoji: '🍗',
    actif: true,
    description: '12 ailes de poulet braisées géantes à partager avec accompagnement.'
  },
  {
    idArticle: 'ART-MIL-007',
    nom: '2 Brochettes + Acc',
    categorie: 'Fired Up Chicken',
    prix: 2500,
    stock: 45,
    stockInitial: 60,
    image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=600&q=80',
    emoji: '🍢',
    actif: true,
    description: '2 brochettes de poulet grillées et épicées servies avec accompagnement.'
  },
  {
    idArticle: 'ART-MIL-008',
    nom: '4 Brochettes + Acc',
    categorie: 'Fired Up Chicken',
    prix: 4500,
    stock: 30,
    stockInitial: 40,
    image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=600&q=80',
    emoji: '🍢',
    actif: true,
    description: '4 brochettes de poulet grillées servies avec accompagnement.'
  },
  {
    idArticle: 'ART-MIL-009',
    nom: '10 Gésiers de Poulet + Acc',
    categorie: 'Fired Up Chicken',
    prix: 2500,
    stock: 35,
    stockInitial: 45,
    image: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80',
    emoji: '🍗',
    actif: true,
    description: '10 gésiers de poulet braisés et marinés avec accompagnement.'
  },
  {
    idArticle: 'ART-MIL-010',
    nom: 'Pattes de Poulet + Acc (10)',
    categorie: 'Fired Up Chicken',
    prix: 2000,
    stock: 25,
    stockInitial: 35,
    image: 'https://images.unsplash.com/photo-1562967914-608f82629710?auto=format&fit=crop&w=600&q=80',
    emoji: '🍗',
    actif: true,
    description: '10 pattes de poulet grillées et bien assaisonnées avec accompagnement.'
  },

  // 2. POULET MAYO
  {
    idArticle: 'ART-MIL-011',
    nom: '1/4 Poulet Mayo + Acc',
    categorie: 'Poulet Mayo',
    prix: 3500,
    stock: 35,
    stockInitial: 45,
    image: 'https://images.unsplash.com/photo-1532550907401-a500c9a57435?auto=format&fit=crop&w=600&q=80',
    emoji: '🍗',
    actif: true,
    description: '1/4 de poulet braisé nappé de la fameuse sauce mayo onctueuse avec accompagnement.'
  },
  {
    idArticle: 'ART-MIL-012',
    nom: '1/2 Poulet Mayo + Acc',
    categorie: 'Poulet Mayo',
    prix: 6000,
    stock: 25,
    stockInitial: 35,
    image: 'https://images.unsplash.com/photo-1532550907401-a500c9a57435?auto=format&fit=crop&w=600&q=80',
    emoji: '🍗',
    actif: true,
    description: 'Demi poulet tendre cuit à la flamme et enrobé de sauce mayo maison avec accompagnement.'
  },
  {
    idArticle: 'ART-MIL-013',
    nom: 'Poulet Entier Mayo + Acc',
    categorie: 'Poulet Mayo',
    prix: 9500,
    stock: 15,
    stockInitial: 25,
    image: 'https://images.unsplash.com/photo-1532550907401-a500c9a57435?auto=format&fit=crop&w=600&q=80',
    emoji: '🍗',
    actif: true,
    description: 'Poulet entier complet à la sauce mayo onctueuse avec accompagnement.'
  },

  // 3. POULET PANÉ
  {
    idArticle: 'ART-MIL-014',
    nom: '3 Pièces Panées + Acc',
    categorie: 'Poulet Pané',
    prix: 3000,
    stock: 40,
    stockInitial: 50,
    image: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&w=600&q=80',
    emoji: '🍗',
    actif: true,
    description: '3 morceaux de poulet pané croustillants façon Milgos avec accompagnement.'
  },
  {
    idArticle: 'ART-MIL-015',
    nom: '6 Pièces Panées + Acc',
    categorie: 'Poulet Pané',
    prix: 4500,
    stock: 30,
    stockInitial: 40,
    image: 'https://images.unsplash.com/photo-1562967914-608f82629710?auto=format&fit=crop&w=600&q=80',
    emoji: '🍗',
    actif: true,
    description: '6 morceaux de poulet pané dorés et croustillants avec accompagnement.'
  },
  {
    idArticle: 'ART-MIL-016',
    nom: 'Poulet Entier Pané + Acc',
    categorie: 'Poulet Pané',
    prix: 7500,
    stock: 20,
    stockInitial: 30,
    image: 'https://images.unsplash.com/photo-1562967914-608f82629710?auto=format&fit=crop&w=600&q=80',
    emoji: '🍗',
    actif: true,
    description: 'Poulet entier découpé et pané croustillant servi avec accompagnement.'
  },

  // 4. MILGO\'S BURGERS
  {
    idArticle: 'ART-MIL-017',
    nom: 'Crispy Simple',
    categorie: 'Burgers',
    prix: 3000,
    stock: 30,
    stockInitial: 40,
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80',
    emoji: '🍔',
    actif: true,
    description: 'Pain brioché, filet de poulet croustillant Milgos, salade croquante et sauce burger.'
  },
  {
    idArticle: 'ART-MIL-018',
    nom: 'Crispy Cheese',
    categorie: 'Burgers',
    prix: 4000,
    stock: 30,
    stockInitial: 40,
    image: 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=600&q=80',
    emoji: '🍔',
    actif: true,
    description: 'Burger poulet croustillant avec tranche de cheddar fondant et sauce onctueuse.'
  },
  {
    idArticle: 'ART-MIL-019',
    nom: 'Crispy Chicken & Avo',
    categorie: 'Burgers',
    prix: 5000,
    stock: 20,
    stockInitial: 30,
    image: 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=600&q=80',
    emoji: '🥑',
    actif: true,
    description: 'Burger poulet croustillant, lamelles d\'avocat frais, fromage et sauce spéciale.'
  },
  {
    idArticle: 'ART-MIL-020',
    nom: 'Crispy Double Stack',
    categorie: 'Burgers',
    prix: 6500,
    stock: 15,
    stockInitial: 25,
    image: 'https://images.unsplash.com/photo-1583032015879-661771146200?auto=format&fit=crop&w=600&q=80',
    emoji: '🍔',
    actif: true,
    description: 'Double portion de poulet croustillant, double fromage cheddar, oignons et sauce spéciale.'
  },

  // 5. PIZZAS
  {
    idArticle: 'ART-MIL-021',
    nom: 'Chicken Pizza (Standard)',
    categorie: 'Pizzas',
    prix: 4500,
    stock: 25,
    stockInitial: 35,
    image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=600&q=80',
    emoji: '🍕',
    actif: true,
    description: 'Pizza Standard au poulet mariné, mozzarella fondante, poivrons et sauce tomate.'
  },
  {
    idArticle: 'ART-MIL-022',
    nom: 'Chicken Pizza (Large)',
    categorie: 'Pizzas',
    prix: 8000,
    stock: 20,
    stockInitial: 30,
    image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=600&q=80',
    emoji: '🍕',
    actif: true,
    description: 'Grande pizza Large au poulet mariné généreux, mozzarella et garniture fraîche.'
  },
  {
    idArticle: 'ART-MIL-023',
    nom: 'Meat Lovers (Standard)',
    categorie: 'Pizzas',
    prix: 6500,
    stock: 20,
    stockInitial: 30,
    image: 'https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?auto=format&fit=crop&w=600&q=80',
    emoji: '🍕',
    actif: true,
    description: 'Pizza Standard garnie de viandes hachées, saucisses, mozzarella et sauce tomate.'
  },
  {
    idArticle: 'ART-MIL-024',
    nom: 'Meat Lovers (Large)',
    categorie: 'Pizzas',
    prix: 9000,
    stock: 15,
    stockInitial: 25,
    image: 'https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?auto=format&fit=crop&w=600&q=80',
    emoji: '🍕',
    actif: true,
    description: 'Grande pizza Large riche en viandes assorties et fromage fondu.'
  },
  {
    idArticle: 'ART-MIL-025',
    nom: 'Margherita (Standard)',
    categorie: 'Pizzas',
    prix: 3500,
    stock: 25,
    stockInitial: 35,
    image: 'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?auto=format&fit=crop&w=600&q=80',
    emoji: '🍕',
    actif: true,
    description: 'Pizza Standard classique sauce tomate, mozzarella et origan parfumé.'
  },
  {
    idArticle: 'ART-MIL-026',
    nom: 'Margherita (Large)',
    categorie: 'Pizzas',
    prix: 5500,
    stock: 20,
    stockInitial: 30,
    image: 'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?auto=format&fit=crop&w=600&q=80',
    emoji: '🍕',
    actif: true,
    description: 'Grande pizza Large Margherita avec mozzarella abondante et sauce tomate.'
  },
  {
    idArticle: 'ART-MIL-027',
    nom: 'Chicken Fold',
    categorie: 'Pizzas',
    prix: 2500,
    stock: 30,
    stockInitial: 40,
    image: 'https://images.unsplash.com/photo-1541592106381-b31e9677c0e5?auto=format&fit=crop&w=600&q=80',
    emoji: '🥟',
    actif: true,
    description: 'Chausson calzone replié et doré au four, farci au poulet et fromage fondu.'
  },
  {
    idArticle: 'ART-MIL-028',
    nom: 'Meat Fold',
    categorie: 'Pizzas',
    prix: 2500,
    stock: 30,
    stockInitial: 40,
    image: 'https://images.unsplash.com/photo-1541592106381-b31e9677c0e5?auto=format&fit=crop&w=600&q=80',
    emoji: '🥟',
    actif: true,
    description: 'Chausson calzone replié et doré au four, farci à la viande hachée et fromage.'
  },
  {
    idArticle: 'ART-MIL-029',
    nom: 'Chicken Triple Layer',
    categorie: 'Pizzas',
    prix: 12000,
    stock: 10,
    stockInitial: 15,
    image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=600&q=80',
    emoji: '🍕',
    actif: true,
    description: 'Création spectaculaire triple épaisseur au poulet, fromage multi-couches et sauces.'
  },
  {
    idArticle: 'ART-MIL-030',
    nom: 'Meat Triple Layer',
    categorie: 'Pizzas',
    prix: 12000,
    stock: 10,
    stockInitial: 15,
    image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=600&q=80',
    emoji: '🍕',
    actif: true,
    description: 'Création spectaculaire triple épaisseur aux viandes gourmandes et fromage fondant.'
  },

  // 6. BOWLS
  {
    idArticle: 'ART-MIL-031',
    nom: 'Milgo\'s DG (Standard)',
    categorie: 'Bowls',
    prix: 3500,
    stock: 30,
    stockInitial: 40,
    image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80',
    emoji: '🍲',
    actif: true,
    description: 'Le fameux Poulet DG Standard : poulet sauté, bananes plantains frites (alloco), légumes croquants et épices.'
  },
  {
    idArticle: 'ART-MIL-032',
    nom: 'Milgo\'s DG (Large)',
    categorie: 'Bowls',
    prix: 4500,
    stock: 25,
    stockInitial: 35,
    image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80',
    emoji: '🍲',
    actif: true,
    description: 'Grande portion de Poulet DG Large très copieuse et savoureuse.'
  },
  {
    idArticle: 'ART-MIL-033',
    nom: 'Milgo\'s Bowl (Ragoût avec brioches)',
    categorie: 'Bowls',
    prix: 4500,
    stock: 20,
    stockInitial: 30,
    image: 'https://images.unsplash.com/photo-1547496502-ffa22d388374?auto=format&fit=crop&w=600&q=80',
    emoji: '🥣',
    actif: true,
    description: 'Ragoût de poulet mijoté à la sauce onctueuse servi avec des brioches moelleuses.'
  },

  // 7. SALADES
  {
    idArticle: 'ART-MIL-034',
    nom: 'Milgo\'s Salade',
    categorie: 'Salades',
    prix: 3500,
    stock: 25,
    stockInitial: 35,
    image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=600&q=80',
    emoji: '🥗',
    actif: true,
    description: 'Salade signature avec émincés de poulet braisé, laitue croquante, tomates et vinaigrette maison.'
  },
  {
    idArticle: 'ART-MIL-035',
    nom: 'Salade Greek',
    categorie: 'Salades',
    prix: 2000,
    stock: 30,
    stockInitial: 40,
    image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80',
    emoji: '🥗',
    actif: true,
    description: 'Salade grecque fraîche avec fromage feta, olives noires, concombres et tomates mûres.'
  },
  {
    idArticle: 'ART-MIL-036',
    nom: 'Salade de Gésier',
    categorie: 'Salades',
    prix: 4000,
    stock: 20,
    stockInitial: 30,
    image: 'https://images.unsplash.com/photo-1505253716362-afaea1d3d1af?auto=format&fit=crop&w=600&q=80',
    emoji: '🥗',
    actif: true,
    description: 'Salade tiède gourmande aux gésiers de poulet braisés et légumes croquants.'
  },

  // 8. PETIT-DÉJEUNER
  {
    idArticle: 'ART-MIL-037',
    nom: 'BHB Simple',
    categorie: 'Petit-Déjeuner',
    prix: 1000,
    stock: 50,
    stockInitial: 60,
    image: 'https://images.unsplash.com/photo-1509722747041-616f39b57569?auto=format&fit=crop&w=600&q=80',
    emoji: '🥯',
    actif: true,
    description: 'Beignets - Haricots - Bouillie traditionnel chaud et revigorant.'
  },
  {
    idArticle: 'ART-MIL-038',
    nom: 'BHB Poulet',
    categorie: 'Petit-Déjeuner',
    prix: 2000,
    stock: 35,
    stockInitial: 45,
    image: 'https://images.unsplash.com/photo-1509722747041-616f39b57569?auto=format&fit=crop&w=600&q=80',
    emoji: '🍗',
    actif: true,
    description: 'Beignets - Haricots - Bouillie accompagné d\'une portion de poulet bien assaisonné.'
  },
  {
    idArticle: 'ART-MIL-039',
    nom: 'Omelette Simple',
    categorie: 'Petit-Déjeuner',
    prix: 1500,
    stock: 40,
    stockInitial: 50,
    image: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=600&q=80',
    emoji: '🍳',
    actif: true,
    description: 'Omelette nature aux œufs frais battus, oignons et fines herbes.'
  },
  {
    idArticle: 'ART-MIL-040',
    nom: 'Omelette Garni avec Brioche',
    categorie: 'Petit-Déjeuner',
    prix: 2500,
    stock: 30,
    stockInitial: 40,
    image: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=600&q=80',
    emoji: '🍳',
    actif: true,
    description: 'Omelette garnie (fromage / légumes) servie avec brioche chaude.'
  },

  // 9. COMBO
  {
    idArticle: 'ART-MIL-041',
    nom: 'Milgo\'s Classique (Combo)',
    categorie: 'Combo',
    prix: 4000,
    stock: 30,
    stockInitial: 40,
    image: 'https://images.unsplash.com/photo-1562967914-608f82629710?auto=format&fit=crop&w=600&q=80',
    emoji: '🍱',
    actif: true,
    description: 'Combo : 3 Pièces de poulet + 1 Accompagnement au choix + 1 Boisson.'
  },
  {
    idArticle: 'ART-MIL-042',
    nom: 'Milgo\'s Crispy Duo (Combo)',
    categorie: 'Combo',
    prix: 4500,
    stock: 25,
    stockInitial: 35,
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80',
    emoji: '🍱',
    actif: true,
    description: 'Combo : 1 Pièce de poulet + 1 Burger + 1 Accompagnement + 1 Boisson Milgos.'
  },
  {
    idArticle: 'ART-MIL-043',
    nom: 'Milgo\'s Wing (Combo)',
    categorie: 'Combo',
    prix: 7000,
    stock: 20,
    stockInitial: 30,
    image: 'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?auto=format&fit=crop&w=600&q=80',
    emoji: '🍱',
    actif: true,
    description: 'Combo : 8 Ailes de poulet braisées + 1 Accompagnement + Boissons Milgos.'
  },
  {
    idArticle: 'ART-MIL-044',
    nom: 'Milgo\'s Big Boy (Combo)',
    categorie: 'Combo',
    prix: 9000,
    stock: 15,
    stockInitial: 25,
    image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=600&q=80',
    emoji: '🍱',
    actif: true,
    description: 'Combo festif : 1/4 Poulet + 1 Burger + 2 Brochettes + 1 Accompagnement + Boissons Milgos.'
  },

  // 10. FAMILY & SHARING
  {
    idArticle: 'ART-MIL-045',
    nom: 'Family Fiest (Grand Festin)',
    categorie: 'Family & Sharing',
    prix: 45000,
    stock: 10,
    stockInitial: 15,
    image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=600&q=80',
    emoji: '👨‍👩‍👧‍👦',
    actif: true,
    description: '2 Poulets entiers, 2 Pizzas Large, 12 Ailes de poulet, 4 Burgers, 4 Accompagnements, 2 Salades Greek, 3 Boissons Milgos.'
  },
  {
    idArticle: 'ART-MIL-046',
    nom: 'Meal 4 Four (Pack 4 Personnes)',
    categorie: 'Family & Sharing',
    prix: 30000,
    stock: 15,
    stockInitial: 20,
    image: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80',
    emoji: '👨‍👩‍👧‍👦',
    actif: true,
    description: '1 Poulet entier, 1 Pizza Large, 2 Accompagnements, 6 Ailes de poulet, 2 Folds, 1 Salade Greek, 2 Boissons Milgos.'
  },

  // 11. MENU ENFANTS
  {
    idArticle: 'ART-MIL-047',
    nom: 'Milgo\'s Peppa Pig',
    categorie: 'Menu Enfants',
    prix: 3500,
    stock: 25,
    stockInitial: 35,
    image: 'https://images.unsplash.com/photo-1562967914-608f82629710?auto=format&fit=crop&w=600&q=80',
    emoji: '🍦',
    actif: true,
    description: 'Menu Enfant : 2 Pièces de poulet + 1 Accompagnement (frites) + 1 Boule de glace.'
  },
  {
    idArticle: 'ART-MIL-048',
    nom: 'Milgo\'s Chase',
    categorie: 'Menu Enfants',
    prix: 4000,
    stock: 25,
    stockInitial: 35,
    image: 'https://images.unsplash.com/photo-1562967914-608f82629710?auto=format&fit=crop&w=600&q=80',
    emoji: '🍦',
    actif: true,
    description: 'Menu Enfant : 2 Pièces de poulet + 1 Accompagnement + 2 Boules de glace.'
  },
  {
    idArticle: 'ART-MIL-049',
    nom: 'Milgo\'s Lourd',
    categorie: 'Menu Enfants',
    prix: 5000,
    stock: 20,
    stockInitial: 30,
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80',
    emoji: '🍔',
    actif: true,
    description: 'Menu Enfant gourmand : 1 Pièce de poulet + 1 Burger + 1 Accompagnement + 1 Boule de glace.'
  },

  // 12. DESSERTS & GLACES
  {
    idArticle: 'ART-MIL-050',
    nom: 'Ice Cream (1 Boule)',
    categorie: 'Desserts & Glaces',
    prix: 1000,
    stock: 40,
    stockInitial: 50,
    image: 'https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?auto=format&fit=crop&w=600&q=80',
    emoji: '🍨',
    actif: true,
    description: '1 Boule de glace artisanale : Parfum Chocolat, Vanille ou Fraise.'
  },
  {
    idArticle: 'ART-MIL-051',
    nom: 'Ice Cream (2 Boules)',
    categorie: 'Desserts & Glaces',
    prix: 1500,
    stock: 35,
    stockInitial: 45,
    image: 'https://images.unsplash.com/photo-1501443762994-82bd5dace89a?auto=format&fit=crop&w=600&q=80',
    emoji: '🍨',
    actif: true,
    description: '2 Boules de glace au choix : Chocolat, Vanille, Fraise.'
  },
  {
    idArticle: 'ART-MIL-052',
    nom: 'Ice Cream (3 Boules)',
    categorie: 'Desserts & Glaces',
    prix: 2500,
    stock: 30,
    stockInitial: 40,
    image: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=600&q=80',
    emoji: '🍨',
    actif: true,
    description: 'Coupe de 3 Boules de glace gourmande avec garniture.'
  },
  {
    idArticle: 'ART-MIL-053',
    nom: 'Milk Shake Oreo Krusher',
    categorie: 'Desserts & Glaces',
    prix: 4000,
    stock: 30,
    stockInitial: 40,
    image: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=600&q=80',
    emoji: '🥤',
    actif: true,
    description: 'Milkshake gourmand mixé avec de véritables biscuits Oreo et crème fouettée.'
  },
  {
    idArticle: 'ART-MIL-054',
    nom: 'Milk Shake Chocolat',
    categorie: 'Desserts & Glaces',
    prix: 4000,
    stock: 25,
    stockInitial: 35,
    image: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=600&q=80',
    emoji: '🥤',
    actif: true,
    description: 'Milkshake onctueux au chocolat noir et lait frais.'
  },
  {
    idArticle: 'ART-MIL-055',
    nom: 'Milk Shake Vanille',
    categorie: 'Desserts & Glaces',
    prix: 4000,
    stock: 25,
    stockInitial: 35,
    image: 'https://images.unsplash.com/photo-1579954115545-a95591f28bfc?auto=format&fit=crop&w=600&q=80',
    emoji: '🥤',
    actif: true,
    description: 'Milkshake crémeux à l\'arôme naturel de vanille bourbon.'
  },
  {
    idArticle: 'ART-MIL-056',
    nom: 'Milk Shake Fraise',
    categorie: 'Desserts & Glaces',
    prix: 4000,
    stock: 25,
    stockInitial: 35,
    image: 'https://images.unsplash.com/photo-1579954115545-a95591f28bfc?auto=format&fit=crop&w=600&q=80',
    emoji: '🥤',
    actif: true,
    description: 'Milkshake rafraîchissant à la purée de fraises fraîches.'
  },

  // 13. ACCOMPAGNEMENTS
  {
    idArticle: 'ART-MIL-057',
    nom: 'Riz Épicé Milgo\'s',
    categorie: 'Accompagnements',
    prix: 1000,
    stock: 60,
    stockInitial: 80,
    image: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=600&q=80',
    emoji: '🍚',
    actif: true,
    description: 'Riz chaud parfumé à la sauce Milgos signature épicée.'
  },
  {
    idArticle: 'ART-MIL-058',
    nom: 'Frites de Pommes Maison',
    categorie: 'Accompagnements',
    prix: 1000,
    stock: 80,
    stockInitial: 100,
    image: 'https://images.unsplash.com/photo-1576107232684-1279f390859f?auto=format&fit=crop&w=600&q=80',
    emoji: '🍟',
    actif: true,
    description: 'Frites de pommes de terre fraîches faites maison, croustillantes et dorées.'
  },
  {
    idArticle: 'ART-MIL-059',
    nom: 'Frites de Plantain (Alloco)',
    categorie: 'Accompagnements',
    prix: 1000,
    stock: 70,
    stockInitial: 90,
    image: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=600&q=80',
    emoji: '🍌',
    actif: true,
    description: 'Bananes plantains mûres frites, tendres et caramélisées.'
  },

  // 14. BOISSONS
  {
    idArticle: 'ART-MIL-060',
    nom: 'Boisson Milgo\'s Spéciale',
    categorie: 'Boissons',
    prix: 1000,
    stock: 50,
    stockInitial: 60,
    image: 'https://images.unsplash.com/photo-1621263764928-df1444c5e859?auto=format&fit=crop&w=600&q=80',
    emoji: '🍹',
    actif: true,
    description: 'Boisson rafraîchissante signature Milgos.'
  },
  {
    idArticle: 'ART-MIL-061',
    nom: 'Eau Minérale 50cl',
    categorie: 'Boissons',
    prix: 500,
    stock: 100,
    stockInitial: 120,
    image: 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?auto=format&fit=crop&w=600&q=80',
    emoji: '💧',
    actif: true,
    description: 'Bouteille d\'eau minérale 50cl pure et fraîche.'
  },
  {
    idArticle: 'ART-MIL-062',
    nom: 'Soda Canette 33cl',
    categorie: 'Boissons',
    prix: 1000,
    stock: 60,
    stockInitial: 80,
    image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=600&q=80',
    emoji: '🥤',
    actif: true,
    description: 'Canette fraîche : Coca-Cola, Fanta, Sprite, Schweppes ou Tonic.'
  },
  {
    idArticle: 'ART-MIL-063',
    nom: 'Bière Fraîche 33cl',
    categorie: 'Boissons',
    prix: 1500,
    stock: 45,
    stockInitial: 60,
    image: 'https://images.unsplash.com/photo-1608270586620-248524c67de9?auto=format&fit=crop&w=600&q=80',
    emoji: '🍺',
    actif: true,
    description: 'Bière blonde fraîche servie bien glacée.'
  }
];

export const INITIAL_COMMANDES: Commande[] = [
  {
    idCommande: 'CMD-2026-0001',
    idServeuse: 'serveuse1',
    nomServeuse: 'Serveuse Marie',
    table: 'Table 03',
    articles: [
      { idArticle: 'ART-MIL-001', nom: '1/4 Poulet + Acc', prixUnitaire: 2500, quantite: 2, sousTotal: 5000, categorie: 'Fired Up Chicken' },
      { idArticle: 'ART-MIL-058', nom: 'Frites de Pommes Maison', prixUnitaire: 1000, quantite: 1, sousTotal: 1000, categorie: 'Accompagnements' },
      { idArticle: 'ART-MIL-062', nom: 'Soda Canette 33cl', prixUnitaire: 1000, quantite: 2, sousTotal: 2000, categorie: 'Boissons' }
    ],
    montantTotal: 8000,
    statut: 'Servie',
    modePaiement: 'Carte Bancaire',
    dateCreation: new Date(Date.now() - 3600000 * 2).toISOString(),
    dateMiseAJour: new Date(Date.now() - 3600000 * 1.5).toISOString()
  },
  {
    idCommande: 'CMD-2026-0002',
    idServeuse: 'serveuse1',
    nomServeuse: 'Serveuse Marie',
    table: 'Table 04',
    articles: [
      { idArticle: 'ART-MIL-017', nom: 'Crispy Simple', prixUnitaire: 3000, quantite: 2, sousTotal: 6000, categorie: 'Burgers' },
      { idArticle: 'ART-MIL-021', nom: 'Chicken Pizza (Standard)', prixUnitaire: 4500, quantite: 1, sousTotal: 4500, categorie: 'Pizzas' },
      { idArticle: 'ART-MIL-060', nom: 'Boisson Milgo\'s Spéciale', prixUnitaire: 1000, quantite: 2, sousTotal: 2000, categorie: 'Boissons' }
    ],
    montantTotal: 12500,
    statut: 'En cuisine',
    modePaiement: 'Non payé',
    dateCreation: new Date(Date.now() - 1800000).toISOString(),
    dateMiseAJour: new Date(Date.now() - 1200000).toISOString()
  }
];


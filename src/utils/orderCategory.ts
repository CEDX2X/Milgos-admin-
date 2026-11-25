import { Article, ArticleCommande, Commande, RoleServeuse } from '../types';

const DRINK_KEYWORDS = [
  'boisson', 'boissons', 'cocktail', 'cocktails', 'biere', 'bieres', 'bière', 'bières',
  'vin', 'vins', 'alcool', 'alcools', 'soft', 'softs', 'jus', 'soda', 'sodas',
  'cafe', 'café', 'cafes', 'cafés', 'the', 'thé', 'thes', 'thés', 'eau', 'eaux',
  'spiritueux', 'aperitif', 'apéritif', 'aperitifs', 'apéritifs', 'liqueur', 'champagne',
  'bar', 'drink', 'drinks', 'beverage', 'beverages', 'rhum', 'vodka', 'whisky', 'gin',
  'mojito', 'spritz', 'pression', 'blonde', 'brune', 'bordeaux', 'limonade', 'smoothie',
  'canette', 'bouteille', 'verre', 'cocktail artisanal', 'coca', 'fanta', 'sprite'
];

/**
 * Checks whether a given category name corresponds to a drink / beverage
 */
export function isDrinkCategory(categoryName?: string): boolean {
  if (!categoryName) return false;
  const clean = categoryName.trim().toLowerCase();
  return DRINK_KEYWORDS.some((kw) => clean.includes(kw));
}

/**
 * Checks whether an article or order item is a drink
 */
export function isDrinkItem(
  item: { idArticle?: string; nom?: string; categorie?: string },
  articlesCatalog: Article[] = []
): boolean {
  // 1. Check explicit item.categorie
  if (item.categorie && isDrinkCategory(item.categorie)) {
    return true;
  }

  // 2. Check catalogue match if category not directly set
  if (item.idArticle && articlesCatalog.length > 0) {
    const catalogItem = articlesCatalog.find((a) => a.idArticle === item.idArticle);
    if (catalogItem?.categorie && isDrinkCategory(catalogItem.categorie)) {
      return true;
    }
  }

  // 3. Check item name heuristics
  if (item.nom) {
    const cleanNom = item.nom.trim().toLowerCase();
    return DRINK_KEYWORDS.some((kw) => cleanNom.includes(kw));
  }

  return false;
}

/**
 * Checks whether an article or order item is a food item (anything not a drink)
 */
export function isFoodItem(
  item: { idArticle?: string; nom?: string; categorie?: string },
  articlesCatalog: Article[] = []
): boolean {
  return !isDrinkItem(item, articlesCatalog);
}

export interface FilteredOrderResult {
  hasItemsForRole: boolean;
  roleArticles: ArticleCommande[];
  allArticlesCount: number;
  roleArticlesCount: number;
  roleSubtotal: number;
}

/**
 * Filters order items specifically for the active staff role:
 * - 'barman': receives ONLY drink items
 * - 'cuisine': receives ONLY food items
 * - 'admin' | 'serveuse': receives all items
 */
export function filterOrderForRole(
  commande: Commande,
  role: RoleServeuse,
  articlesCatalog: Article[] = []
): FilteredOrderResult {
  const allArticles = Array.isArray(commande.articles) ? commande.articles : [];

  if (role === 'barman') {
    const drinks = allArticles.filter((item) => isDrinkItem(item, articlesCatalog));
    const roleSubtotal = drinks.reduce((acc, i) => acc + (i.sousTotal || (i.prixUnitaire * i.quantite) || 0), 0);
    return {
      hasItemsForRole: drinks.length > 0,
      roleArticles: drinks,
      allArticlesCount: allArticles.reduce((acc, i) => acc + (i.quantite || 1), 0),
      roleArticlesCount: drinks.reduce((acc, i) => acc + (i.quantite || 1), 0),
      roleSubtotal
    };
  }

  if (role === 'cuisine') {
    const foods = allArticles.filter((item) => isFoodItem(item, articlesCatalog));
    const roleSubtotal = foods.reduce((acc, i) => acc + (i.sousTotal || (i.prixUnitaire * i.quantite) || 0), 0);
    return {
      hasItemsForRole: foods.length > 0,
      roleArticles: foods,
      allArticlesCount: allArticles.reduce((acc, i) => acc + (i.quantite || 1), 0),
      roleArticlesCount: foods.reduce((acc, i) => acc + (i.quantite || 1), 0),
      roleSubtotal
    };
  }

  // Admin and Serveuses see all items
  const subtotal = allArticles.reduce((acc, i) => acc + (i.sousTotal || (i.prixUnitaire * i.quantite) || 0), 0);
  return {
    hasItemsForRole: allArticles.length > 0,
    roleArticles: allArticles,
    allArticlesCount: allArticles.reduce((acc, i) => acc + (i.quantite || 1), 0),
    roleArticlesCount: allArticles.reduce((acc, i) => acc + (i.quantite || 1), 0),
    roleSubtotal: subtotal
  };
}

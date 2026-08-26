import { integer, pgTable, serial, text, timestamp, boolean, doublePrecision, jsonb } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const serveuses = pgTable('serveuses', {
  id: serial('id').primaryKey(),
  idServeuse: text('id_serveuse').notNull().unique(),
  nom: text('nom').notNull(),
  pin: text('pin').notNull(),
  role: text('role').notNull().default('serveuse'),
  actif: boolean('actif').notNull().default(true),
  commandesTraitees: integer('commandes_traitees').default(0),
  chiffreAffaires: doublePrecision('chiffre_affaires').default(0),
  createdAt: timestamp('created_at').defaultNow(),
});

export const articles = pgTable('articles', {
  id: serial('id').primaryKey(),
  idArticle: text('id_article').notNull().unique(),
  nom: text('nom').notNull(),
  categorie: text('categorie').notNull(),
  prix: doublePrecision('prix').notNull(),
  stock: integer('stock').notNull().default(0),
  stockInitial: integer('stock_initial').default(0),
  emoji: text('emoji').default('🍹'),
  actif: boolean('actif').notNull().default(true),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const commandes = pgTable('commandes', {
  id: serial('id').primaryKey(),
  idCommande: text('id_commande').notNull().unique(),
  idServeuse: text('id_serveuse').notNull(),
  nomServeuse: text('nom_serveuse').notNull(),
  table: text('table').notNull(),
  articles: jsonb('articles').notNull(),
  montantTotal: doublePrecision('montant_total').notNull(),
  statut: text('statut').notNull().default('En attente'),
  modePaiement: text('mode_paiement'),
  dateCreation: timestamp('date_creation').defaultNow(),
});

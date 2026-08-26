import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import webpush from "web-push";
import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getFirestore,
  initializeFirestore,
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  limit,
  query
} from "firebase/firestore";
import { createServer as createViteServer } from "vite";
import { INITIAL_ARTICLES, INITIAL_COMMANDES, INITIAL_SERVEUSES, INITIAL_TABLES, INITIAL_CATEGORIES } from "./src/data/initialData.js";

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// Prevent HTTP/Vercel CDN caching on all API endpoints
app.use("/api", (req, res, next) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("Surrogate-Control", "no-store");
  next();
});

// -------------------------------------------------------------
// Firebase Firestore Connection Setup (Web Client SDK)
// -------------------------------------------------------------
let firestoreDb: any = null;
let isFirestoreConnected = false;
let firebaseProjectId = "";

const FALLBACK_FIREBASE_CONFIG = {
  projectId: "elaborate-beaker-kcf5x",
  appId: "1:285605363724:web:0ad27bb8d0c5aef3f32e29",
  apiKey: "AIzaSyAQ509beLYjZumhwtBdwd3xaYccvO_oTWc",
  authDomain: "elaborate-beaker-kcf5x.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-forwardoneadmine-3e6d4147-39c0-481b-8262-2c2e894fb6b2",
  storageBucket: "elaborate-beaker-kcf5x.firebasestorage.app",
  messagingSenderId: "285605363724"
};

async function connectFirebase() {
  let config: any = null;

  // 1. Try process environment variables (FIREBASE_CONFIG or individual VARS)
  if (process.env.FIREBASE_CONFIG) {
    try {
      config = JSON.parse(process.env.FIREBASE_CONFIG);
    } catch (e) {
      console.warn("⚠️ Error parsing FIREBASE_CONFIG env var");
    }
  }

  if (!config && process.env.FIREBASE_PROJECT_ID) {
    config = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      apiKey: process.env.FIREBASE_API_KEY || FALLBACK_FIREBASE_CONFIG.apiKey,
      authDomain: process.env.FIREBASE_AUTH_DOMAIN || `${process.env.FIREBASE_PROJECT_ID}.firebaseapp.com`,
      firestoreDatabaseId: process.env.FIRESTORE_DATABASE_ID || FALLBACK_FIREBASE_CONFIG.firestoreDatabaseId,
      appId: process.env.FIREBASE_APP_ID || FALLBACK_FIREBASE_CONFIG.appId,
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || FALLBACK_FIREBASE_CONFIG.storageBucket,
      messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || FALLBACK_FIREBASE_CONFIG.messagingSenderId
    };
  }

  // 2. Try firebase-applet-config.json file
  if (!config) {
    const possiblePaths = ["./firebase-applet-config.json", "/firebase-applet-config.json", path.join(process.cwd(), "firebase-applet-config.json")];
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        try {
          config = JSON.parse(fs.readFileSync(p, "utf-8"));
          break;
        } catch (e) {
          console.warn(`⚠️ Could not parse ${p}`);
        }
      }
    }
  }

  // 3. Fallback to hardcoded configuration for production persistence guarantees
  if (!config) {
    config = FALLBACK_FIREBASE_CONFIG;
  }

  if (config && config.projectId && config.apiKey) {
    try {
      const firebaseConfig = {
        apiKey: config.apiKey,
        authDomain: config.authDomain,
        projectId: config.projectId,
        storageBucket: config.storageBucket,
        messagingSenderId: config.messagingSenderId,
        appId: config.appId
      };
      const firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
      const databaseId = config.firestoreDatabaseId || "(default)";
      try {
        firestoreDb = initializeFirestore(firebaseApp, {
          experimentalAutoDetectLongPolling: true,
        }, databaseId);
      } catch {
        firestoreDb = getFirestore(firebaseApp, databaseId);
      }
      firebaseProjectId = config.projectId;
      isFirestoreConnected = true;
      console.log(`🔥 Firebase Firestore connecté avec succès! Projet: ${config.projectId}, Database: ${databaseId}`);

      await seedFirestoreIfNeeded();
    } catch (err: any) {
      isFirestoreConnected = false;
      console.warn("⚠️ Initialisation Firebase Firestore :", err.message);
    }
  }
}

async function seedFirestoreIfNeeded() {
  if (!isFirestoreConnected || !firestoreDb) return;
  try {
    const statusRef = doc(firestoreDb, "system", "status");
    const statusSnap = await getDoc(statusRef);

    if (!statusSnap.exists()) {
      const q = query(collection(firestoreDb, "articles"), limit(1));
      const articlesSnap = await getDocs(q);
      if (articlesSnap.empty) {
        console.log("🌱 Ingestion initiale des données dans Firebase Firestore...");
        const batch = writeBatch(firestoreDb);

        for (const srv of INITIAL_SERVEUSES) {
          batch.set(doc(firestoreDb, "serveuses", srv.idServeuse), srv);
        }
        for (const art of INITIAL_ARTICLES) {
          batch.set(doc(firestoreDb, "articles", art.idArticle), art);
        }
        for (const cmd of INITIAL_COMMANDES) {
          batch.set(doc(firestoreDb, "commandes", cmd.idCommande), cmd);
        }
        for (const tbl of INITIAL_TABLES) {
          batch.set(doc(firestoreDb, "tables", tbl.idTable), { ...tbl, dateCreation: new Date().toISOString() });
        }
        for (const cat of INITIAL_CATEGORIES) {
          batch.set(doc(firestoreDb, "categories", cat.idCategorie), { ...cat, dateCreation: new Date().toISOString() });
        }
        batch.set(statusRef, { initialized: true, dateCreation: new Date().toISOString() });
        await batch.commit();
        console.log("✅ Firebase Firestore initialisé avec succès avec les données par défaut !");
      } else {
        await setDoc(statusRef, { initialized: true, dateCreation: new Date().toISOString() });
      }
    }
  } catch (e: any) {
    console.warn("⚠️ Seeding Firestore impossible, utilisation du mode fallback :", e.message);
  }
}

// Memory fallback store (used if Firestore is temporarily offline)
let memoryServeuses = [...INITIAL_SERVEUSES];
let memoryArticles = [...INITIAL_ARTICLES];
let memoryCommandes = [...INITIAL_COMMANDES];
let memoryTables = [...INITIAL_TABLES];
let memoryCategories = [...INITIAL_CATEGORIES];
let memoryPushSubscriptions: any[] = [];

// -------------------------------------------------------------
// Web Push VAPID Setup (iOS & Android Background Push)
// -------------------------------------------------------------
let vapidKeys = {
  publicKey: "",
  privateKey: ""
};

async function setupWebPush() {
  const vapidFilePath = path.join(process.cwd(), "vapid-keys.json");
  
  if (fs.existsSync(vapidFilePath)) {
    try {
      vapidKeys = JSON.parse(fs.readFileSync(vapidFilePath, "utf-8"));
    } catch {
      vapidKeys = webpush.generateVAPIDKeys();
      fs.writeFileSync(vapidFilePath, JSON.stringify(vapidKeys, null, 2));
    }
  } else {
    vapidKeys = webpush.generateVAPIDKeys();
    try {
      fs.writeFileSync(vapidFilePath, JSON.stringify(vapidKeys, null, 2));
    } catch (e) {
      console.warn("⚠️ Could not write vapid-keys.json, keeping in memory.");
    }
  }

  webpush.setVapidDetails(
    "mailto:admin@orderease.app",
    vapidKeys.publicKey,
    vapidKeys.privateKey
  );
  console.log(`🔔 Web Push VAPID initialisé avec succès ! Clef publique: ${vapidKeys.publicKey.substring(0, 15)}...`);
}

async function savePushSubscription(sub: any) {
  if (!sub || !sub.endpoint) return;
  
  if (isFirestoreConnected && firestoreDb) {
    try {
      const docId = Buffer.from(sub.endpoint).toString("hex").substring(0, 100);
      await setDoc(doc(firestoreDb, "push_subscriptions", docId), {
        subscription: sub,
        dateCreation: new Date().toISOString()
      });
    } catch (err: any) {
      console.warn("⚠️ Error saving push sub to Firestore:", err.message);
    }
  }

  if (!memoryPushSubscriptions.some(s => s.endpoint === sub.endpoint)) {
    memoryPushSubscriptions.push(sub);
  }
}

async function fetchPushSubscriptions(): Promise<any[]> {
  if (isFirestoreConnected && firestoreDb) {
    try {
      const snap = await getDocs(collection(firestoreDb, "push_subscriptions"));
      if (!snap.empty) {
        return snap.docs.map(d => d.data().subscription).filter(Boolean);
      }
    } catch (err: any) {
      console.warn("⚠️ Error fetching push subs from Firestore:", err.message);
    }
  }
  return memoryPushSubscriptions;
}

async function sendPushNotificationToAll(payload: { title: string; body: string; data?: any; tag?: string }) {
  try {
    const subscriptions = await fetchPushSubscriptions();
    if (subscriptions.length === 0) {
      console.log("ℹ️ Aucun abonné push enregistré pour le moment.");
      return;
    }

    console.log(`📡 Envoi de la notification Web Push à ${subscriptions.length} appareil(s)...`);
    const payloadStr = JSON.stringify(payload);

    const promises = subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(sub, payloadStr);
      } catch (err: any) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          console.log(`🧹 Nettoyage souscription expirée: ${sub.endpoint.substring(0, 30)}...`);
          if (isFirestoreConnected && firestoreDb) {
            try {
              const docId = Buffer.from(sub.endpoint).toString("hex").substring(0, 100);
              await deleteDoc(doc(firestoreDb, "push_subscriptions", docId));
            } catch {}
          }
          memoryPushSubscriptions = memoryPushSubscriptions.filter(s => s.endpoint !== sub.endpoint);
        } else {
          console.warn("⚠️ Error sending WebPush notification:", err.message || err);
        }
      }
    });

    await Promise.allSettled(promises);
  } catch (err: any) {
    console.error("❌ Error sending Web Push notification:", err);
  }
}

async function seedDatabase() {
  if (isFirestoreConnected && firestoreDb) {
    try {
      const batch = writeBatch(firestoreDb);

      const sSnap = await getDocs(collection(firestoreDb, "serveuses"));
      sSnap.docs.forEach((d) => batch.delete(d.ref));

      const aSnap = await getDocs(collection(firestoreDb, "articles"));
      aSnap.docs.forEach((d) => batch.delete(d.ref));

      const cSnap = await getDocs(collection(firestoreDb, "commandes"));
      cSnap.docs.forEach((d) => batch.delete(d.ref));

      const tSnap = await getDocs(collection(firestoreDb, "tables"));
      tSnap.docs.forEach((d) => batch.delete(d.ref));

      const catSnap = await getDocs(collection(firestoreDb, "categories"));
      catSnap.docs.forEach((d) => batch.delete(d.ref));

      for (const srv of INITIAL_SERVEUSES) {
        batch.set(doc(firestoreDb, "serveuses", srv.idServeuse), srv);
      }
      for (const art of INITIAL_ARTICLES) {
        batch.set(doc(firestoreDb, "articles", art.idArticle), art);
      }
      for (const cmd of INITIAL_COMMANDES) {
        batch.set(doc(firestoreDb, "commandes", cmd.idCommande), cmd);
      }
      for (const tbl of INITIAL_TABLES) {
        batch.set(doc(firestoreDb, "tables", tbl.idTable), { ...tbl, dateCreation: new Date().toISOString() });
      }
      for (const cat of INITIAL_CATEGORIES) {
        batch.set(doc(firestoreDb, "categories", cat.idCategorie), { ...cat, dateCreation: new Date().toISOString() });
      }
      await batch.commit();
    } catch (e: any) {
      console.warn("⚠️ Firestore re-seed error:", e.message);
    }
  }

  memoryServeuses = [...INITIAL_SERVEUSES];
  memoryArticles = [...INITIAL_ARTICLES];
  memoryCommandes = [...INITIAL_COMMANDES];
  memoryTables = [...INITIAL_TABLES];
  memoryCategories = [...INITIAL_CATEGORIES];
}

// Data fetching helper functions
async function fetchCategoriesList(): Promise<any[]> {
  if (isFirestoreConnected && firestoreDb) {
    try {
      const snap = await getDocs(collection(firestoreDb, "categories"));
      if (!snap.empty) {
        const list = snap.docs.map((d) => d.data());
        return list.sort((a: any, b: any) => (a.dateCreation || "").localeCompare(b.dateCreation || ""));
      } else {
        // Seed categories in Firestore
        const batch = writeBatch(firestoreDb);
        const now = new Date().toISOString();
        for (const cat of INITIAL_CATEGORIES) {
          batch.set(doc(firestoreDb, "categories", cat.idCategorie), { ...cat, dateCreation: now });
        }
        await batch.commit();
        return INITIAL_CATEGORIES.map(c => ({ ...c, dateCreation: now }));
      }
    } catch (err: any) {
      console.warn("⚠️ Firestore fetchCategories error:", err.message);
    }
  }
  return memoryCategories;
}

// Data fetching helper functions
async function fetchTablesList(): Promise<any[]> {
  if (isFirestoreConnected && firestoreDb) {
    try {
      const snap = await getDocs(collection(firestoreDb, "tables"));
      if (!snap.empty) {
        const list = snap.docs.map((d) => d.data());
        return list.sort((a: any, b: any) => (a.dateCreation || "").localeCompare(b.dateCreation || ""));
      } else {
        // Seed tables in Firestore
        const batch = writeBatch(firestoreDb);
        const now = new Date().toISOString();
        for (const tbl of INITIAL_TABLES) {
          batch.set(doc(firestoreDb, "tables", tbl.idTable), { ...tbl, dateCreation: now });
        }
        await batch.commit();
        return INITIAL_TABLES.map(t => ({ ...t, dateCreation: now }));
      }
    } catch (err: any) {
      console.warn("⚠️ Firestore fetchTables error:", err.message);
    }
  }
  return memoryTables;
}

// Data fetching helper functions
async function fetchArticlesList(): Promise<any[]> {
  if (isFirestoreConnected && firestoreDb) {
    try {
      const snap = await getDocs(collection(firestoreDb, "articles"));
      return snap.docs.map((d) => d.data());
    } catch (err: any) {
      console.warn("⚠️ Firestore fetchArticles error:", err.message);
    }
  }
  return memoryArticles;
}

async function fetchServeusesList(): Promise<any[]> {
  if (isFirestoreConnected && firestoreDb) {
    try {
      const snap = await getDocs(collection(firestoreDb, "serveuses"));
      let list = snap.docs.map((d) => d.data());
      const hasAdmin1 = list.some((s: any) => 
        (s.idServeuse && s.idServeuse.toLowerCase() === 'admin1') || 
        (s.nom && s.nom.toLowerCase() === 'admin1')
      );
      if (!hasAdmin1) {
        const admin1Obj = {
          idServeuse: 'admin1',
          nom: 'admin1',
          pin: '0000',
          role: 'admin',
          actif: true,
          commandesTraitees: 0,
          chiffreAffaires: 0,
          dateCreation: new Date().toISOString()
        };
        await setDoc(doc(firestoreDb, "serveuses", "admin1"), admin1Obj);
        list.push(admin1Obj);
      }
      return list;
    } catch (err: any) {
      console.warn("⚠️ Firestore fetchServeuses error:", err.message);
    }
  }
  return memoryServeuses;
}

async function fetchCommandesList(): Promise<any[]> {
  if (isFirestoreConnected && firestoreDb) {
    try {
      const snap = await getDocs(collection(firestoreDb, "commandes"));
      const list = snap.docs.map((d) => d.data());
      return list.sort((a: any, b: any) => new Date(b.dateCreation).getTime() - new Date(a.dateCreation).getTime());
    } catch (err: any) {
      console.warn("⚠️ Firestore fetchCommandes error:", err.message);
    }
  }
  return memoryCommandes.sort((a, b) => new Date(b.dateCreation).getTime() - new Date(a.dateCreation).getTime());
}

// -------------------------------------------------------------
// REST API ROUTES (Express)
// -------------------------------------------------------------

// Web Push VAPID Public Key Endpoint
app.get("/api/push/vapid-key", (req, res) => {
  res.json({ publicKey: vapidKeys.publicKey });
});

// Subscribe to Web Push Endpoint
app.post("/api/push/subscribe", async (req, res) => {
  try {
    const { subscription } = req.body;
    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ success: false, message: "Subscription payload required" });
    }
    await savePushSubscription(subscription);
    res.json({ success: true, message: "Souscription Web Push enregistrée avec succès !" });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Test Web Push Endpoint
app.post("/api/push/test", async (req, res) => {
  try {
    await sendPushNotificationToAll({
      title: "💰 Commande Payée TEST-001 !",
      body: "Table T-05 • Total: 12,500 FCFA (Espèces) • Signal Push iOS / Android en arrière-plan",
      tag: "test-order-paid",
      data: { url: "/", idCommande: "TEST-001" }
    });
    res.json({ success: true, message: "Notification Push de test diffusée avec succès à tous les téléphones enregistrés !" });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Health Check & System Info
app.get("/api/health", async (req, res) => {
  let articlesCount = memoryArticles.length;
  let serveusesCount = memoryServeuses.length;
  let commandesCount = memoryCommandes.length;
  let categoriesCount = memoryCategories.length;

  if (isFirestoreConnected && firestoreDb) {
    try {
      const aList = await fetchArticlesList();
      const sList = await fetchServeusesList();
      const cList = await fetchCommandesList();
      const catList = await fetchCategoriesList();
      articlesCount = aList.length;
      serveusesCount = sList.length;
      commandesCount = cList.length;
      categoriesCount = catList.length;
    } catch (e: any) {
      console.warn("⚠️ Health check Firestore read error:", e.message);
    }
  }

  res.json({
    status: "ok",
    app: "OrderEase POS Serveuses PWA",
    timestamp: new Date().toISOString(),
    database: {
      type: isFirestoreConnected ? "Firebase Firestore (Cloud Persistent Database)" : "In-Memory Store (Fallback)",
      connected: isFirestoreConnected,
      firebaseConnected: isFirestoreConnected,
      firebaseProjectId: firebaseProjectId || null,
      uri: isFirestoreConnected ? `firestore://${firebaseProjectId}` : "memory://orderease",
      counts: {
        articles: articlesCount,
        serveuses: serveusesCount,
        commandes: commandesCount,
        categories: categoriesCount
      }
    }
  });
});

// Seed API Endpoint
app.post("/api/seed", async (req, res) => {
  try {
    await seedDatabase();
    res.json({ success: true, message: "Base de données Firestore réinitialisée avec succès avec les données de démonstration" });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Clear / Empty App API Endpoint
app.post("/api/clear", async (req, res) => {
  const { scope = 'tout' } = req.body; // 'commandes' | 'articles' | 'tout'

  try {
    if (scope === 'commandes' || scope === 'tout') {
      if (isFirestoreConnected && firestoreDb) {
        const cSnap = await getDocs(collection(firestoreDb, "commandes"));
        const batch = writeBatch(firestoreDb);
        cSnap.docs.forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }
      memoryCommandes = [];
    }

    if (scope === 'articles' || scope === 'tout') {
      if (isFirestoreConnected && firestoreDb) {
        const aSnap = await getDocs(collection(firestoreDb, "articles"));
        const batch = writeBatch(firestoreDb);
        aSnap.docs.forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }
      memoryArticles = [];
    }

    if (scope === 'tout') {
      if (isFirestoreConnected && firestoreDb) {
        const sSnap = await getDocs(collection(firestoreDb, "serveuses"));
        const batch = writeBatch(firestoreDb);
        sSnap.docs.forEach((d) => {
          batch.update(d.ref, { commandesTraitees: 0, chiffreAffaires: 0 });
        });
        await batch.commit();
      }
      memoryServeuses.forEach((s) => {
        s.commandesTraitees = 0;
        s.chiffreAffaires = 0;
      });
    }

    res.json({
      success: true,
      message: scope === 'commandes' 
        ? "Toutes les commandes ont été vidées de Firestore." 
        : scope === 'articles' 
        ? "Le catalogue d'articles a été vidé." 
        : "L'application a été entièrement réinitialisée à zéro."
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// -------------------------------------------------------------
// 0. TABLES & CATEGORIES MANAGEMENT API
// -------------------------------------------------------------
app.get("/api/categories", async (req, res) => {
  try {
    const categories = await fetchCategoriesList();
    res.json(categories);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/categories", async (req, res) => {
  try {
    const { nom, emoji, couleur } = req.body;
    if (!nom || !nom.trim()) {
      return res.status(400).json({ success: false, message: "Le nom de la catégorie est requis." });
    }

    const trimmedName = nom.trim();
    const currentCategories = await fetchCategoriesList();
    if (currentCategories.some((c: any) => c.nom.toLowerCase() === trimmedName.toLowerCase())) {
      return res.status(400).json({ success: false, message: "Cette catégorie existe déjà." });
    }

    const idCategorie = `CAT-${Math.floor(Math.random() * 9000 + 1000)}`;
    const newCategory = {
      idCategorie,
      nom: trimmedName,
      emoji: (emoji && String(emoji).trim()) || "🏷️",
      couleur: (couleur && String(couleur).trim()) || "#dc2626",
      dateCreation: new Date().toISOString()
    };

    if (isFirestoreConnected && firestoreDb) {
      await setDoc(doc(firestoreDb, "categories", idCategorie), newCategory);
      return res.status(201).json({ success: true, category: newCategory });
    }

    memoryCategories.push(newCategory);
    res.status(201).json({ success: true, category: newCategory });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/categories/:nom", async (req, res) => {
  try {
    const { nom } = req.params;
    const decodedName = decodeURIComponent(nom);

    if (isFirestoreConnected && firestoreDb) {
      const snap = await getDocs(collection(firestoreDb, "categories"));
      const match = snap.docs.find(d => d.data().nom?.toLowerCase() === decodedName.toLowerCase() || d.data().idCategorie === decodedName);
      if (match) {
        await deleteDoc(doc(firestoreDb, "categories", match.id));
      }
    }

    memoryCategories = memoryCategories.filter(c => c.nom?.toLowerCase() !== decodedName.toLowerCase() && c.idCategorie !== decodedName);
    res.json({ success: true, message: `Catégorie '${decodedName}' supprimée de la base de données.` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/tables", async (req, res) => {
  try {
    const tables = await fetchTablesList();
    res.json(tables);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/tables", async (req, res) => {
  try {
    const { nom } = req.body;
    if (!nom || !nom.trim()) {
      return res.status(400).json({ success: false, message: "Le nom de la table est requis." });
    }

    const trimmedName = nom.trim();
    const currentTables = await fetchTablesList();
    if (currentTables.some((t: any) => t.nom.toLowerCase() === trimmedName.toLowerCase())) {
      return res.status(400).json({ success: false, message: "Cette table existe déjà." });
    }

    const idTable = `TBL-${Math.floor(Math.random() * 9000 + 1000)}`;
    const newTable = {
      idTable,
      nom: trimmedName,
      dateCreation: new Date().toISOString()
    };

    if (isFirestoreConnected && firestoreDb) {
      await setDoc(doc(firestoreDb, "tables", idTable), newTable);
      return res.status(201).json({ success: true, table: newTable });
    }

    memoryTables.push(newTable);
    res.status(201).json({ success: true, table: newTable });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/tables/:nom", async (req, res) => {
  try {
    const { nom } = req.params;
    const decodedName = decodeURIComponent(nom);

    if (isFirestoreConnected && firestoreDb) {
      const snap = await getDocs(collection(firestoreDb, "tables"));
      const match = snap.docs.find(d => d.data().nom === decodedName || d.data().idTable === decodedName);
      if (match) {
        await deleteDoc(doc(firestoreDb, "tables", match.id));
      }
    }

    memoryTables = memoryTables.filter(t => t.nom !== decodedName && t.idTable !== decodedName);
    res.json({ success: true, message: `Table '${decodedName}' supprimée de la base de données.` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// 1. SERVEUSES API
// -------------------------------------------------------------
app.get("/api/serveuses", async (req, res) => {
  try {
    const serveuses = await fetchServeusesList();
    res.json(serveuses);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/serveuses/login", async (req, res) => {
  const { idServeuse, pin } = req.body;
  try {
    const list = await fetchServeusesList();
    const queryTerm = String(idServeuse || '').trim().toLowerCase();
    const user = list.find((s: any) => 
      ((s.idServeuse && String(s.idServeuse).toLowerCase() === queryTerm) ||
       (s.nom && String(s.nom).toLowerCase() === queryTerm)) &&
      String(s.pin).trim() === String(pin).trim() &&
      s.actif !== false
    );

    if (!user) {
      return res.status(401).json({ success: false, message: "Nom d'utilisateur / ID ou code PIN incorrect" });
    }

    res.json({ success: true, serveuse: user });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/serveuses/update-pin", async (req, res) => {
  const { idServeuse, currentPin, newPin } = req.body;
  try {
    const list = await fetchServeusesList();
    const user = list.find((s: any) => s.idServeuse === idServeuse || s.nom === idServeuse);
    if (!user) {
      return res.status(404).json({ success: false, message: "Utilisateur non trouvé" });
    }
    if (String(user.pin).trim() !== String(currentPin).trim()) {
      return res.status(400).json({ success: false, message: "Le code PIN actuel est incorrect" });
    }

    const updatedPin = String(newPin).trim();
    if (isFirestoreConnected && firestoreDb) {
      await updateDoc(doc(firestoreDb, "serveuses", user.idServeuse), { pin: updatedPin });
    }
    const idx = memoryServeuses.findIndex(s => s.idServeuse === user.idServeuse);
    if (idx !== -1) {
      memoryServeuses[idx].pin = updatedPin;
    }

    res.json({ success: true, message: "Code PIN mis à jour avec succès !" });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post("/api/serveuses", async (req, res) => {
  try {
    const { nom, pin, role } = req.body;
    const newId = `SRV-00${Math.floor(Math.random() * 900 + 100)}`;
    const newServeuse = {
      idServeuse: req.body.idServeuse || newId,
      nom: nom || "Nouvelle Serveuse",
      pin: pin || "0000",
      role: role || "serveuse",
      actif: true,
      commandesTraitees: 0,
      chiffreAffaires: 0,
      dateCreation: new Date().toISOString()
    };

    if (isFirestoreConnected && firestoreDb) {
      await setDoc(doc(firestoreDb, "serveuses", newServeuse.idServeuse), newServeuse);
      return res.status(201).json(newServeuse);
    }

    memoryServeuses.push(newServeuse as any);
    res.status(201).json(newServeuse);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/serveuses/:id", async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  try {
    if (isFirestoreConnected && firestoreDb) {
      const ref = doc(firestoreDb, "serveuses", id);
      await updateDoc(ref, updates);
      const snap = await getDoc(ref);
      return res.json(snap.data());
    }

    const index = memoryServeuses.findIndex(s => s.idServeuse === id);
    if (index !== -1) {
      memoryServeuses[index] = { ...memoryServeuses[index], ...updates };
      return res.json(memoryServeuses[index]);
    }
    res.status(404).json({ message: "Serveuse non trouvée" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/serveuses/:id", async (req, res) => {
  const { id } = req.params;
  try {
    if (isFirestoreConnected && firestoreDb) {
      await deleteDoc(doc(firestoreDb, "serveuses", id));
      return res.json({ success: true, message: "Serveuse supprimée de Firestore" });
    }

    memoryServeuses = memoryServeuses.filter(s => s.idServeuse !== id);
    res.json({ success: true, message: "Serveuse supprimée" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// 2. ARTICLES (CATALOGUE & STOCK) API
// -------------------------------------------------------------
app.get("/api/articles", async (req, res) => {
  try {
    const articles = await fetchArticlesList();
    res.json(articles);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/articles", async (req, res) => {
  try {
    const { nom, categorie, prix, stock, emoji, image, description } = req.body || {};
    if (!nom || !String(nom).trim()) {
      return res.status(400).json({ error: "Le nom de l'article est obligatoire." });
    }

    const idArticle = `ART-${Math.floor(Math.random() * 90000 + 10000)}`;
    const newArticle = {
      idArticle,
      nom: String(nom).trim(),
      categorie: String(categorie || 'Boissons').trim(),
      prix: Number(prix) || 0,
      stock: Number(stock) || 0,
      stockInitial: Number(stock) || 0,
      emoji: String(emoji || '📦'),
      image: String(image || ''),
      actif: true,
      description: String(description || '')
    };

    if (isFirestoreConnected && firestoreDb) {
      await setDoc(doc(firestoreDb, "articles", idArticle), newArticle);
      const idx = memoryArticles.findIndex(a => a.idArticle === idArticle);
      if (idx === -1) memoryArticles.push(newArticle as any);
      else memoryArticles[idx] = newArticle as any;

      return res.status(201).json(newArticle);
    }

    memoryArticles.push(newArticle as any);
    res.status(201).json(newArticle);
  } catch (err: any) {
    console.error("Error creating article in Firestore:", err);
    res.status(500).json({ error: err.message || "Erreur lors de la sauvegarde de l'article." });
  }
});

app.put("/api/articles/:id", async (req, res) => {
  const { id } = req.params;
  const updates = req.body || {};
  try {
    const cleanUpdates: any = {};
    if (updates.nom !== undefined) cleanUpdates.nom = String(updates.nom).trim();
    if (updates.categorie !== undefined) cleanUpdates.categorie = String(updates.categorie).trim();
    if (updates.prix !== undefined) cleanUpdates.prix = Number(updates.prix) || 0;
    if (updates.stock !== undefined) cleanUpdates.stock = Number(updates.stock) || 0;
    if (updates.stockInitial !== undefined) cleanUpdates.stockInitial = Number(updates.stockInitial) || 0;
    if (updates.emoji !== undefined) cleanUpdates.emoji = String(updates.emoji);
    if (updates.image !== undefined) cleanUpdates.image = String(updates.image);
    if (updates.description !== undefined) cleanUpdates.description = String(updates.description);
    if (updates.actif !== undefined) cleanUpdates.actif = Boolean(updates.actif);

    if (isFirestoreConnected && firestoreDb) {
      const ref = doc(firestoreDb, "articles", id);
      await updateDoc(ref, cleanUpdates);
      const snap = await getDoc(ref);
      const updatedData = snap.data();
      const idx = memoryArticles.findIndex(a => a.idArticle === id);
      if (idx !== -1 && updatedData) memoryArticles[idx] = updatedData as any;
      return res.json(updatedData || cleanUpdates);
    }

    const index = memoryArticles.findIndex(a => a.idArticle === id);
    if (index !== -1) {
      memoryArticles[index] = { ...memoryArticles[index], ...cleanUpdates };
      return res.json(memoryArticles[index]);
    }
    res.status(404).json({ message: "Article non trouvé" });
  } catch (err: any) {
    console.error("Error updating article in Firestore:", err);
    res.status(500).json({ error: err.message || "Erreur lors de la mise à jour" });
  }
});

app.patch("/api/articles/:id/stock", async (req, res) => {
  const { id } = req.params;
  const { delta, nouveauStock } = req.body;
  try {
    if (isFirestoreConnected && firestoreDb) {
      const ref = doc(firestoreDb, "articles", id);
      const snap = await getDoc(ref);
      if (!snap.exists()) return res.status(404).json({ message: "Article non trouvé" });

      const current = snap.data();
      let updatedStock = current.stock || 0;

      if (nouveauStock !== undefined) {
        updatedStock = Math.max(0, Number(nouveauStock));
      } else if (delta !== undefined) {
        updatedStock = Math.max(0, updatedStock + Number(delta));
      }

      await updateDoc(ref, { stock: updatedStock });
      return res.json({ ...current, stock: updatedStock });
    }

    const article = memoryArticles.find(a => a.idArticle === id);
    if (article) {
      if (nouveauStock !== undefined) {
        article.stock = Math.max(0, Number(nouveauStock));
      } else if (delta !== undefined) {
        article.stock = Math.max(0, article.stock + Number(delta));
      }
      return res.json(article);
    }
    res.status(404).json({ message: "Article non trouvé" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/articles/:id", async (req, res) => {
  const { id } = req.params;
  try {
    if (isFirestoreConnected && firestoreDb) {
      await deleteDoc(doc(firestoreDb, "articles", id));
      return res.json({ success: true, message: "Article supprimé de Firestore" });
    }

    memoryArticles = memoryArticles.filter(a => a.idArticle !== id);
    res.json({ success: true, message: "Article supprimé" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// 3. COMMANDES & STOCK VALIDATION API
// -------------------------------------------------------------
app.get("/api/commandes", async (req, res) => {
  try {
    const commandes = await fetchCommandesList();
    res.json(commandes);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Order Creation & Stock Decrement Endpoint
app.post("/api/commandes", async (req, res) => {
  try {
    const { idServeuse, nomServeuse, table, articles, modePaiement, notesServeuse } = req.body;

    if (!articles || !Array.isArray(articles) || articles.length === 0) {
      return res.status(400).json({ success: false, message: "La commande doit contenir au moins un article." });
    }

    // Step 1: Verify Stock Availability for ALL items before committing order
    const articlesList = await fetchArticlesList();

    const stockErrors: string[] = [];
    for (const item of articles) {
      const dbArticle = articlesList.find((a: any) => a.idArticle === item.idArticle);
      if (!dbArticle) {
        stockErrors.push(`L'article '${item.nom}' n'existe plus dans le catalogue.`);
      } else if (!dbArticle.actif) {
        stockErrors.push(`L'article '${dbArticle.nom}' est actuellement désactivé.`);
      } else if (dbArticle.stock < item.quantite) {
        stockErrors.push(`Stock insuffisant pour '${dbArticle.nom}'. Demandé: ${item.quantite}, Disponible: ${dbArticle.stock}.`);
      }
    }

    if (stockErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Impossible de valider la commande en raison de contraintes de stock.",
        errors: stockErrors
      });
    }

    // Step 2: Calculate Subtotals and Total Amount
    let montantTotal = 0;
    const validatedArticles = articles.map((item: any) => {
      const sousTotal = Number((item.prixUnitaire * item.quantite).toFixed(2));
      montantTotal += sousTotal;
      return {
        idArticle: item.idArticle,
        nom: item.nom,
        prixUnitaire: item.prixUnitaire,
        quantite: item.quantite,
        sousTotal: sousTotal,
        notes: item.notes || ""
      };
    });

    const nowStr = new Date().toISOString();
    const idCommande = `CMD-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000 + 1000)}`;

    const newCommande = {
      idCommande,
      idServeuse: idServeuse || "SRV-000",
      nomServeuse: nomServeuse || "Serveuse Inconnue",
      table: table || "Bar",
      articles: validatedArticles,
      montantTotal: Number(montantTotal.toFixed(2)),
      statut: 'En attente' as const,
      modePaiement: modePaiement || 'Non payé',
      notesServeuse: notesServeuse || '',
      dateCreation: nowStr,
      dateMiseAJour: nowStr
    };

    // Step 3: Decrement Stock & Update Waitstaff Stats in Firestore
    if (isFirestoreConnected && firestoreDb) {
      const batch = writeBatch(firestoreDb);

      // Decrement stock
      for (const item of validatedArticles) {
        const artRef = doc(firestoreDb, "articles", item.idArticle);
        const artSnap = await getDoc(artRef);
        if (artSnap.exists()) {
          const currentStock = artSnap.data().stock || 0;
          batch.update(artRef, { stock: Math.max(0, currentStock - item.quantite) });
        }
      }

      // Update Serveuse sales
      const srvRef = doc(firestoreDb, "serveuses", newCommande.idServeuse);
      const srvSnap = await getDoc(srvRef);
      if (srvSnap.exists()) {
        const sData = srvSnap.data();
        batch.update(srvRef, {
          commandesTraitees: (sData.commandesTraitees || 0) + 1,
          chiffreAffaires: (sData.chiffreAffaires || 0) + newCommande.montantTotal
        });
      }

      // Save Commande
      batch.set(doc(firestoreDb, "commandes", idCommande), newCommande);
      await batch.commit();

      // Trigger Web Push to all devices if order was paid on creation
      if (newCommande.modePaiement !== 'Non payé') {
        sendPushNotificationToAll({
          title: `💰 Commande Payée #${idCommande} !`,
          body: `Table ${newCommande.table} • Total: ${newCommande.montantTotal.toLocaleString()} FCFA (${newCommande.modePaiement}) • ${newCommande.nomServeuse}`,
          tag: `order-paid-${idCommande}`,
          data: { url: '/', idCommande }
        });
      }

      const freshArticles = await fetchArticlesList();
      return res.status(201).json({
        success: true,
        message: "Commande enregistrée et stock décrémenté avec succès dans Firebase !",
        commande: newCommande,
        articles: freshArticles
      });
    }

    // In-Memory Fallback Mode
    for (const item of validatedArticles) {
      const target = memoryArticles.find(a => a.idArticle === item.idArticle);
      if (target) {
        target.stock = Math.max(0, target.stock - item.quantite);
      }
    }

    const targetServeuse = memoryServeuses.find(s => s.idServeuse === newCommande.idServeuse);
    if (targetServeuse) {
      targetServeuse.commandesTraitees = (targetServeuse.commandesTraitees || 0) + 1;
      targetServeuse.chiffreAffaires = (targetServeuse.chiffreAffaires || 0) + newCommande.montantTotal;
    }

    memoryCommandes.unshift(newCommande as any);

    res.status(201).json({
      success: true,
      message: "Commande enregistrée et stock décrémenté avec succès !",
      commande: newCommande,
      articles: memoryArticles
    });

  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Status change endpoint
app.patch("/api/commandes/:id/statut", async (req, res) => {
  const { id } = req.params;
  const { statut, modePaiement } = req.body;

  try {
    const commandesList = await fetchCommandesList();
    const commande = commandesList.find((c: any) => c.idCommande === id);

    if (!commande) {
      return res.status(404).json({ message: "Commande non trouvée" });
    }

    const ancienStatut = commande.statut;
    const dateMiseAJour = new Date().toISOString();

    const updates: any = { statut, dateMiseAJour };
    if (modePaiement) updates.modePaiement = modePaiement;

    // Restock items if order is cancelled
    const needsRestock = (statut === 'Annulée' && ancienStatut !== 'Annulée');

    if (isFirestoreConnected && firestoreDb) {
      const batch = writeBatch(firestoreDb);
      const cmdRef = doc(firestoreDb, "commandes", id);
      batch.update(cmdRef, updates);

      if (needsRestock) {
        for (const item of commande.articles) {
          const artRef = doc(firestoreDb, "articles", item.idArticle);
          const artSnap = await getDoc(artRef);
          if (artSnap.exists()) {
            batch.update(artRef, { stock: (artSnap.data().stock || 0) + item.quantite });
          }
        }
      }
      await batch.commit();
    } else {
      const memCmd = memoryCommandes.find(c => c.idCommande === id);
      if (memCmd) {
        memCmd.statut = statut;
        if (modePaiement) memCmd.modePaiement = modePaiement;
        memCmd.dateMiseAJour = dateMiseAJour;
      }

      if (needsRestock) {
        for (const item of commande.articles) {
          const target = memoryArticles.find(a => a.idArticle === item.idArticle);
          if (target) target.stock += item.quantite;
        }
      }
    }

    const updatedArticlesList = await fetchArticlesList();
    const updatedCommande = { ...commande, ...updates };

    // Trigger Web Push to all devices when order is marked as Payée
    if (statut === 'Payée') {
      sendPushNotificationToAll({
        title: `💰 Commande Payée #${id}!`,
        body: `Table ${updatedCommande.table || 'Caisse'} • Total: ${(updatedCommande.montantTotal || 0).toLocaleString()} FCFA (${updatedCommande.modePaiement || 'Espèces'}) • ${updatedCommande.nomServeuse || 'Serveuse'}`,
        tag: `order-paid-${id}`,
        data: { url: '/', idCommande: id }
      });
    }

    res.json({
      success: true,
      message: `Statut de la commande mis à jour: ${statut}`,
      commande: updatedCommande,
      articles: updatedArticlesList
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// 4. STATISTIQUES & VENTES API
// -------------------------------------------------------------
app.get("/api/stats", async (req, res) => {
  try {
    const articlesList = await fetchArticlesList();
    const serveusesList = await fetchServeusesList();
    const commandesList = await fetchCommandesList();

    const validCommandes = commandesList.filter(c => c.statut !== 'Annulée');
    const chiffreAffairesTotal = validCommandes.reduce((sum, c) => sum + c.montantTotal, 0);
    const nombreCommandes = validCommandes.length;
    const panierMoyen = nombreCommandes > 0 ? Number((chiffreAffairesTotal / nombreCommandes).toFixed(2)) : 0;

    const aujourdhuiStr = new Date().toISOString().split('T')[0];
    const commandesAujourdhui = validCommandes.filter(c => new Date(c.dateCreation).toISOString().startsWith(aujourdhuiStr)).length;
    const articlesEnRupture = articlesList.filter(a => a.stock <= 0).length;

    // Ventes par catégorie
    const ventesParCategorie: Record<string, number> = {};
    const topArticlesMap: Record<string, { idArticle: string; nom: string; quantiteVendue: number; chiffreAffaires: number }> = {};

    for (const cmd of validCommandes) {
      for (const item of cmd.articles) {
        const art = articlesList.find(a => a.idArticle === item.idArticle);
        const cat = art ? art.categorie : 'Autre';
        ventesParCategorie[cat] = (ventesParCategorie[cat] || 0) + item.sousTotal;

        if (!topArticlesMap[item.idArticle]) {
          topArticlesMap[item.idArticle] = {
            idArticle: item.idArticle,
            nom: item.nom,
            quantiteVendue: 0,
            chiffreAffaires: 0
          };
        }
        topArticlesMap[item.idArticle].quantiteVendue += item.quantite;
        topArticlesMap[item.idArticle].chiffreAffaires += item.sousTotal;
      }
    }

    const topArticles = Object.values(topArticlesMap).sort((a, b) => b.quantiteVendue - a.quantiteVendue).slice(0, 5);

    // Top Serveuses
    const topServeuses = serveusesList.map(s => {
      const srvCommandes = validCommandes.filter(c => c.idServeuse === s.idServeuse);
      const totalVentes = srvCommandes.reduce((sum, c) => sum + c.montantTotal, 0);
      return {
        idServeuse: s.idServeuse,
        nom: s.nom,
        totalCommandes: srvCommandes.length,
        totalVentes: Number(totalVentes.toFixed(2))
      };
    }).sort((a, b) => b.totalVentes - a.totalVentes);

    res.json({
      chiffreAffairesTotal: Number(chiffreAffairesTotal.toFixed(2)),
      nombreCommandes,
      panierMoyen,
      commandesAujourdhui,
      articlesEnRupture,
      ventesParCategorie,
      topServeuses,
      topArticles
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// VITE & SERVER INITIALIZATION
// -------------------------------------------------------------
async function startServer() {
  await connectFirebase();
  await setupWebPush();

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Serveur OrderEase POS connecté à Firebase Firestore & opérationnel sur http://0.0.0.0:${PORT}`);
  });
}

startServer();

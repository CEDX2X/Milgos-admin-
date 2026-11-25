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
  query,
  where
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
    const qMilgo = query(collection(firestoreDb, "articles"), where("idArticle", "==", "ART-MIL-001"));
    const milgoSnap = await getDocs(qMilgo);

    // If Milgo's articles don't exist yet in Firestore, seed or migrate them
    if (milgoSnap.empty) {
      console.log("🍗 Ingestion du menu officiel Milgo's dans Firebase Firestore...");
      const batch = writeBatch(firestoreDb);

      // Clean up old demo articles if any existed
      const existingArticlesSnap = await getDocs(collection(firestoreDb, "articles"));
      for (const d of existingArticlesSnap.docs) {
        if (!d.id.startsWith("ART-MIL-")) {
          batch.delete(d.ref);
        }
      }

      // Add all Milgo's categories
      for (const cat of INITIAL_CATEGORIES) {
        batch.set(doc(firestoreDb, "categories", cat.idCategorie), { ...cat, dateCreation: new Date().toISOString() });
      }

      // Add all Milgo's articles
      for (const art of INITIAL_ARTICLES) {
        batch.set(doc(firestoreDb, "articles", art.idArticle), art);
      }

      // Add initial serveuses if missing
      const srvSnap = await getDocs(collection(firestoreDb, "serveuses"));
      if (srvSnap.empty) {
        for (const srv of INITIAL_SERVEUSES) {
          batch.set(doc(firestoreDb, "serveuses", srv.idServeuse), srv);
        }
      }

      // Add initial tables if missing
      const tblSnap = await getDocs(collection(firestoreDb, "tables"));
      if (tblSnap.empty) {
        for (const tbl of INITIAL_TABLES) {
          batch.set(doc(firestoreDb, "tables", tbl.idTable), { ...tbl, dateCreation: new Date().toISOString() });
        }
      }

      const statusRef = doc(firestoreDb, "system", "status");
      batch.set(statusRef, { initialized: true, milgosMenuSeeded: true, dateCreation: new Date().toISOString() });

      await batch.commit();
      console.log("✅ Menu officiel Milgo's Fired Up Chicken synchronisé avec succès dans Firestore !");
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
let memoryDevices: any[] = [];

// -------------------------------------------------------------
// Web Push VAPID Setup (iOS & Android Background Push)
// -------------------------------------------------------------
let vapidKeys = {
  publicKey: "",
  privateKey: ""
};

async function setupWebPush() {
  const vapidFilePath = path.join(process.cwd(), "vapid-keys.json");
  let loaded = false;

  // 1. Try to load from Firestore first if connected (ensures keys persist across all server restarts)
  if (isFirestoreConnected && firestoreDb) {
    try {
      const vapidSnap = await getDoc(doc(firestoreDb, "system_settings", "vapid_keys"));
      if (vapidSnap.exists()) {
        const data = vapidSnap.data();
        if (data?.publicKey && data?.privateKey) {
          vapidKeys = { publicKey: data.publicKey, privateKey: data.privateKey };
          loaded = true;
          console.log("🔑 Clefs VAPID chargées depuis Firestore.");
        }
      }
    } catch (e: any) {
      console.warn("⚠️ Impossible de lire les clefs VAPID depuis Firestore:", e.message);
    }
  }

  // 2. Try to load from local file
  if (!loaded && fs.existsSync(vapidFilePath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(vapidFilePath, "utf-8"));
      if (parsed.publicKey && parsed.privateKey) {
        vapidKeys = parsed;
        loaded = true;
        console.log("🔑 Clefs VAPID chargées depuis vapid-keys.json.");
      }
    } catch {}
  }

  // 3. If still not loaded, generate new VAPID keys
  if (!loaded) {
    vapidKeys = webpush.generateVAPIDKeys();
    try {
      fs.writeFileSync(vapidFilePath, JSON.stringify(vapidKeys, null, 2));
    } catch {}
  }

  // 4. Persist to Firestore if connected
  if (isFirestoreConnected && firestoreDb) {
    try {
      await setDoc(doc(firestoreDb, "system_settings", "vapid_keys"), {
        publicKey: vapidKeys.publicKey,
        privateKey: vapidKeys.privateKey,
        dateMiseAJour: new Date().toISOString()
      }, { merge: true });
    } catch {}
  }

  webpush.setVapidDetails(
    "mailto:admin@orderease.app",
    vapidKeys.publicKey,
    vapidKeys.privateKey
  );
  console.log(`🔔 Web Push VAPID initialisé avec succès ! Clef publique: ${vapidKeys.publicKey.substring(0, 15)}...`);
}

// -------------------------------------------------------------
// CONNECTED DEVICES & TARGETED NOTIFICATIONS ROUTING BY ID
// -------------------------------------------------------------
async function saveDeviceRecord(device: {
  idAppareil: string;
  nomAppareil?: string;
  idProfil?: string;
  nomProfil?: string;
  role?: string;
  subscription?: any;
  userAgent?: string;
}) {
  if (!device.idAppareil) return;

  const now = new Date().toISOString();
  const existingDevice = (await fetchDevicesList()).find(d => d.idAppareil === device.idAppareil);

  const updatedRecord = {
    idAppareil: device.idAppareil,
    nomAppareil: device.nomAppareil || existingDevice?.nomAppareil || "Appareil POS",
    idProfil: device.idProfil || existingDevice?.idProfil || "GUEST",
    nomProfil: device.nomProfil || existingDevice?.nomProfil || "Non assigné",
    role: device.role || existingDevice?.role || "serveuse",
    subscription: device.subscription !== undefined ? device.subscription : (existingDevice?.subscription || null),
    hasPushSubscription: Boolean(device.subscription || existingDevice?.subscription),
    dateCreation: existingDevice?.dateCreation || now,
    derniereActivite: now,
    userAgent: device.userAgent || existingDevice?.userAgent || "Navigateur Web"
  };

  if (isFirestoreConnected && firestoreDb) {
    try {
      await setDoc(doc(firestoreDb, "registered_devices", device.idAppareil), updatedRecord, { merge: true });
    } catch (err: any) {
      console.warn("⚠️ Error saving device to Firestore:", err.message);
    }
  }

  const idx = memoryDevices.findIndex(d => d.idAppareil === device.idAppareil);
  if (idx !== -1) {
    memoryDevices[idx] = updatedRecord;
  } else {
    memoryDevices.push(updatedRecord);
  }

  return updatedRecord;
}

async function fetchDevicesList(): Promise<any[]> {
  if (isFirestoreConnected && firestoreDb) {
    try {
      const snap = await getDocs(collection(firestoreDb, "registered_devices"));
      if (!snap.empty) {
        const list = snap.docs.map(d => d.data());
        // Sort by ID Appareil ascending (DEV-...)
        return list.sort((a: any, b: any) => (a.idAppareil || "").localeCompare(b.idAppareil || ""));
      }
    } catch (err: any) {
      console.warn("⚠️ Error fetching devices from Firestore:", err.message);
    }
  }
  return [...memoryDevices].sort((a: any, b: any) => (a.idAppareil || "").localeCompare(b.idAppareil || ""));
}

async function deleteDeviceRecord(idAppareil: string) {
  if (isFirestoreConnected && firestoreDb) {
    try {
      await deleteDoc(doc(firestoreDb, "registered_devices", idAppareil));
    } catch (err: any) {
      console.warn("⚠️ Error deleting device from Firestore:", err.message);
    }
  }
  memoryDevices = memoryDevices.filter(d => d.idAppareil !== idAppareil);
}

async function savePushSubscription(sub: any, meta?: {
  idAppareil?: string;
  nomAppareil?: string;
  idProfil?: string;
  nomProfil?: string;
  role?: string;
  userAgent?: string;
}) {
  if (!sub || !sub.endpoint) return;
  
  if (isFirestoreConnected && firestoreDb) {
    try {
      const docId = Buffer.from(sub.endpoint).toString("hex").substring(0, 100);
      await setDoc(doc(firestoreDb, "push_subscriptions", docId), {
        subscription: sub,
        idAppareil: meta?.idAppareil || null,
        idProfil: meta?.idProfil || null,
        nomProfil: meta?.nomProfil || null,
        role: meta?.role || null,
        dateCreation: new Date().toISOString()
      });
    } catch (err: any) {
      console.warn("⚠️ Error saving push sub to Firestore:", err.message);
    }
  }

  if (!memoryPushSubscriptions.some(s => s.endpoint === sub.endpoint)) {
    memoryPushSubscriptions.push({
      subscription: sub,
      idAppareil: meta?.idAppareil,
      idProfil: meta?.idProfil,
      nomProfil: meta?.nomProfil,
      role: meta?.role
    });
  }

  // Also bind to registered device if device ID is present
  if (meta?.idAppareil) {
    await saveDeviceRecord({
      idAppareil: meta.idAppareil,
      nomAppareil: meta.nomAppareil,
      idProfil: meta.idProfil,
      nomProfil: meta.nomProfil,
      role: meta.role,
      subscription: sub,
      userAgent: meta.userAgent
    });
  }
}

async function fetchPushSubscriptions(): Promise<any[]> {
  if (isFirestoreConnected && firestoreDb) {
    try {
      const snap = await getDocs(collection(firestoreDb, "push_subscriptions"));
      if (!snap.empty) {
        return snap.docs.map(d => d.data());
      }
    } catch (err: any) {
      console.warn("⚠️ Error fetching push subs from Firestore:", err.message);
    }
  }
  return memoryPushSubscriptions;
}

/**
 * Sends targeted Web Push notification filtered by:
 * - targetIdProfil: ID of specific staff (e.g. "SRV-001")
 * - targetIdAppareil: ID of specific device (e.g. "DEV-A84B1C")
 * - targetRole: role filter (e.g. "cuisine", "barman", "caissier", "admin")
 *
 * NOTE: Administrators (role: 'admin') receive alerts so managers stay informed.
 */
async function sendPushNotificationTargeted(options: {
  targetIdProfil?: string;
  targetIdAppareil?: string;
  targetRole?: string | 'all';
  title: string;
  body: string;
  data?: any;
  tag?: string;
}): Promise<{ sent: number; total: number }> {
  try {
    const pushRecords = await fetchPushSubscriptions();
    if (pushRecords.length === 0) {
      return { sent: 0, total: 0 };
    }

    const { targetIdProfil, targetIdAppareil, targetRole, title, body, data, tag } = options;

    // Filter recipients by ID Appareil, ID Profil, or Role
    const matchingRecords = pushRecords.filter((rec: any) => {
      const sub = rec.subscription || rec;
      if (!sub || !sub.endpoint) return false;

      // 1. Direct device ID targeting
      if (targetIdAppareil) {
        return rec.idAppareil === targetIdAppareil;
      }

      // 2. Profile ID targeting (e.g. specific waitress SRV-001)
      if (targetIdProfil && targetIdProfil !== 'all') {
        if (rec.idProfil === targetIdProfil) return true;
        // Admins also receive supervisory notifications
        if (rec.role === 'admin') return true;
        return false;
      }

      // 3. Role targeting (e.g. kitchen or barman or cashier)
      if (targetRole && targetRole !== 'all') {
        if (rec.role === targetRole) return true;
        if (rec.role === 'admin') return true;
        return false;
      }

      return true; // Send to all if no filter
    });

    if (matchingRecords.length === 0) {
      return { sent: 0, total: pushRecords.length };
    }

    const payloadStr = JSON.stringify({ title, body, data, tag });

    let sentCount = 0;
    const promises = matchingRecords.map(async (rec) => {
      const sub = rec.subscription || rec;
      if (!sub || !sub.endpoint) return;

      try {
        await webpush.sendNotification(sub, payloadStr);
        sentCount++;
      } catch (err: any) {
        const statusCode = err.statusCode || (err.error && err.error.statusCode);
        const errMsg = String(err.message || err || '');
        const isDeadSubscription = 
          (typeof statusCode === 'number' && statusCode >= 400 && statusCode < 500) ||
          errMsg.includes('unexpected response code') ||
          errMsg.includes('NotRegistered') ||
          errMsg.includes('InvalidRegistration') ||
          errMsg.includes('expired') ||
          errMsg.includes('unsubscribed') ||
          errMsg.includes('410') ||
          errMsg.includes('404') ||
          errMsg.includes('400') ||
          errMsg.includes('401') ||
          errMsg.includes('403');

        if (isDeadSubscription) {
          // Clean up dead subscription
          if (isFirestoreConnected && firestoreDb) {
            try {
              const docId = Buffer.from(sub.endpoint).toString("hex").substring(0, 100);
              await deleteDoc(doc(firestoreDb, "push_subscriptions", docId));
            } catch {}
          }
          memoryPushSubscriptions = memoryPushSubscriptions.filter((s: any) => (s.subscription?.endpoint || s.endpoint) !== sub.endpoint);
        } else {
          console.warn("⚠️ WebPush delivery notice:", errMsg);
        }
      }
    });

    await Promise.allSettled(promises);
    return { sent: sentCount, total: matchingRecords.length };
  } catch (err: any) {
    console.error("❌ Erreur d'envoi Web Push ciblé :", err);
    return { sent: 0, total: 0 };
  }
}

async function sendPushNotificationToAll(payload: { title: string; body: string; data?: any; tag?: string }) {
  return sendPushNotificationTargeted({
    targetRole: 'all',
    title: payload.title,
    body: payload.body,
    data: payload.data,
    tag: payload.tag
  });
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
      let list = snap.docs.map((d) => d.data());
      const hasMilgo = list.some((a: any) => a.idArticle && a.idArticle.startsWith("ART-MIL-"));
      if (list.length === 0 || !hasMilgo) {
        console.log("🍗 Migration / Synchronisation du catalogue Milgo's dans Firestore...");
        const batch = writeBatch(firestoreDb);
        for (const art of INITIAL_ARTICLES) {
          batch.set(doc(firestoreDb, "articles", art.idArticle), art);
        }
        for (const cat of INITIAL_CATEGORIES) {
          batch.set(doc(firestoreDb, "categories", cat.idCategorie), { ...cat, dateCreation: new Date().toISOString() });
        }
        await batch.commit();
        const freshSnap = await getDocs(collection(firestoreDb, "articles"));
        list = freshSnap.docs.map((d) => d.data());
      }
      return list;
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

// Device Registry Endpoints (sorted by ID)
app.get("/api/devices", async (req, res) => {
  try {
    const devices = await fetchDevicesList();
    res.json(devices);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/devices/register", async (req, res) => {
  try {
    const { idAppareil, nomAppareil, idProfil, nomProfil, role, userAgent } = req.body;
    if (!idAppareil) {
      return res.status(400).json({ success: false, message: "ID Appareil requis" });
    }
    const saved = await saveDeviceRecord({
      idAppareil,
      nomAppareil,
      idProfil,
      nomProfil,
      role,
      userAgent
    });
    res.json({ success: true, device: saved });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete("/api/devices/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await deleteDeviceRecord(id);
    res.json({ success: true, message: `Appareil ${id} désenregistré.` });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Subscribe to Web Push Endpoint (links Device ID + Profile ID)
app.post("/api/push/subscribe", async (req, res) => {
  try {
    const { subscription, idAppareil, nomAppareil, idProfil, nomProfil, role, userAgent } = req.body;
    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ success: false, message: "Subscription payload required" });
    }
    await savePushSubscription(subscription, {
      idAppareil,
      nomAppareil,
      idProfil,
      nomProfil,
      role,
      userAgent
    });
    res.json({ 
      success: true, 
      message: `Souscription Web Push liée avec succès à l'appareil ${idAppareil || 'inconnu'} et au profil ${idProfil || 'invité'} !` 
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Targeted Push Notification Dispatch by ID / Role
app.post("/api/push/send-targeted", async (req, res) => {
  try {
    const { targetIdProfil, targetIdAppareil, targetRole, title, body, tag, data } = req.body;
    if (!title || !body) {
      return res.status(400).json({ success: false, message: "Titre et corps de notification requis." });
    }

    const result = await sendPushNotificationTargeted({
      targetIdProfil,
      targetIdAppareil,
      targetRole,
      title,
      body,
      tag: tag || `targeted-${Date.now()}`,
      data: data || { timestamp: Date.now() }
    });

    res.json({
      success: true,
      message: `Notification transmise à ${result.sent} appareil(s) cible(s) sur ${result.total} correspondants.`,
      count: result.sent
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Test Web Push Endpoint
app.post("/api/push/test", async (req, res) => {
  try {
    const { type, table, serveuse, idServeuse, idAppareil } = req.body || {};
    const tableLabel = table ? `Table ${table}` : 'Table T-04';
    const srv = serveuse ? ` • ${serveuse}` : '';

    if (type === 'prep') {
      await sendPushNotificationTargeted({
        targetIdProfil: idServeuse,
        targetIdAppareil: idAppareil,
        title: "👨‍🍳 Commande en préparation #TEST-PREP",
        body: `${tableLabel} • Prise en charge en cuisine/bar en cours !${srv}`,
        tag: "test-order-prep",
        data: { url: "/", idCommande: "TEST-PREP", statut: "En cuisine" }
      });
    } else if (type === 'ready') {
      await sendPushNotificationTargeted({
        targetIdProfil: idServeuse,
        targetIdAppareil: idAppareil,
        title: "🔔 Commande PRÊTE #TEST-PRÊTE !",
        body: `${tableLabel} est PRÊTE ! Venez la récupérer pour la servir à table.${srv}`,
        tag: "test-order-ready",
        data: { url: "/", idCommande: "TEST-PRÊTE", statut: "Prête" }
      });
    } else {
      await sendPushNotificationTargeted({
        targetIdProfil: idServeuse,
        targetIdAppareil: idAppareil,
        title: "💰 Commande Payée #TEST-001 !",
        body: "Table T-05 • Total: 12,500 FCFA (Espèces) • Signal Push ciblé par ID",
        tag: "test-order-paid",
        data: { url: "/", idCommande: "TEST-001", statut: "Payée" }
      });
    }
    res.json({ success: true, message: "Notification Push ciblée transmise avec succès !" });
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

// Force sync / reload authentic Milgo's menu items
app.post("/api/menu/sync-milgos", async (req, res) => {
  try {
    if (isFirestoreConnected && firestoreDb) {
      const batch = writeBatch(firestoreDb);
      // Clean previous non-milgo test articles
      const existingArticlesSnap = await getDocs(collection(firestoreDb, "articles"));
      for (const d of existingArticlesSnap.docs) {
        if (!d.id.startsWith("ART-MIL-")) {
          batch.delete(d.ref);
        }
      }
      for (const art of INITIAL_ARTICLES) {
        batch.set(doc(firestoreDb, "articles", art.idArticle), art);
      }
      for (const cat of INITIAL_CATEGORIES) {
        batch.set(doc(firestoreDb, "categories", cat.idCategorie), { ...cat, dateCreation: new Date().toISOString() });
      }
      await batch.commit();
    }
    memoryArticles = [...INITIAL_ARTICLES];
    memoryCategories = [...INITIAL_CATEGORIES];
    const freshArticles = await fetchArticlesList();
    res.json({
      success: true,
      message: `Menu officiel Milgo's synchronisé avec succès (${freshArticles.length} articles disponibles).`,
      count: freshArticles.length,
      articles: freshArticles
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
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
      const dbArticle = articlesList.find((a: any) => a.idArticle === item.idArticle);
      return {
        idArticle: item.idArticle,
        nom: item.nom,
        prixUnitaire: item.prixUnitaire,
        quantite: item.quantite,
        sousTotal: sousTotal,
        categorie: item.categorie || dbArticle?.categorie || '',
        notes: item.notes || ""
      };
    });

    const nowStr = new Date().toISOString();
    const idCommande = req.body.idCommande || `CMD-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000 + 1000)}`;

    // Check if order already exists (idempotent sync)
    const existingCmd = (await fetchCommandesList()).find((c: any) => c.idCommande === idCommande);
    if (existingCmd) {
      return res.status(200).json({
        success: true,
        message: "Commande déjà synchronisée.",
        commande: existingCmd,
        articles: await fetchArticlesList()
      });
    }

    const newCommande = {
      idCommande,
      idServeuse: idServeuse || "SRV-000",
      nomServeuse: nomServeuse || "Serveuse Inconnue",
      table: table || "Bar",
      articles: validatedArticles,
      montantTotal: Number(montantTotal.toFixed(2)),
      statut: (req.body.statut || 'En attente') as any,
      modePaiement: modePaiement || 'Non payé',
      notesServeuse: notesServeuse || '',
      dateCreation: req.body.dateCreation || nowStr,
      dateMiseAJour: req.body.dateMiseAJour || nowStr,
      ...(req.body.idCaissier ? { idCaissier: req.body.idCaissier } : {}),
      ...(req.body.nomCaissier ? { nomCaissier: req.body.nomCaissier } : {}),
      ...(req.body.remise ? { remise: req.body.remise } : {}),
      ...(typeof req.body.montantFinal === 'number' ? { montantFinal: req.body.montantFinal } : {}),
      ...(typeof req.body.montantRecu === 'number' ? { montantRecu: req.body.montantRecu } : {}),
      ...(typeof req.body.monnaieRendue === 'number' ? { monnaieRendue: req.body.monnaieRendue } : {}),
      ...(req.body.datePaiement ? { datePaiement: req.body.datePaiement } : {})
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
    }

    // Trigger Targeted Web Push notification on creation
    if (newCommande.modePaiement !== 'Non payé') {
      sendPushNotificationTargeted({
        targetIdProfil: newCommande.idServeuse,
        targetRole: 'caissier',
        title: `💰 Commande Payée #${idCommande} !`,
        body: `Table ${newCommande.table} • Total: ${newCommande.montantTotal.toLocaleString()} FCFA (${newCommande.modePaiement}) • ${newCommande.nomServeuse}`,
        tag: `order-status-${idCommande}`,
        data: { url: '/', idCommande, statut: 'Payée', table: newCommande.table }
      });
    } else {
      // Direct notification to kitchen & bar & admin
      sendPushNotificationTargeted({
        targetRole: 'cuisine',
        title: `👨‍🍳 Nouvelle commande Cuisine #${idCommande} - Table ${newCommande.table}`,
        body: `${newCommande.articles?.length || 1} produit(s) • Total: ${newCommande.montantTotal.toLocaleString()} FCFA • Serveuse: ${newCommande.nomServeuse}`,
        tag: `order-new-${idCommande}`,
        data: { url: '/', idCommande, statut: 'En attente', table: newCommande.table, idServeuse: newCommande.idServeuse }
      });
      sendPushNotificationTargeted({
        targetRole: 'barman',
        title: `🍹 Nouvelle commande Bar #${idCommande} - Table ${newCommande.table}`,
        body: `${newCommande.articles?.length || 1} boisson(s) • Table ${newCommande.table} • Serveuse: ${newCommande.nomServeuse}`,
        tag: `order-new-${idCommande}`,
        data: { url: '/', idCommande, statut: 'En attente', table: newCommande.table, idServeuse: newCommande.idServeuse }
      });
    }

    if (isFirestoreConnected && firestoreDb) {
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
  const { 
    statut, 
    modePaiement, 
    idCaissier, 
    nomCaissier, 
    remise, 
    montantFinal, 
    montantRecu, 
    monnaieRendue, 
    datePaiement 
  } = req.body;

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
    if (idCaissier) updates.idCaissier = idCaissier;
    if (nomCaissier) updates.nomCaissier = nomCaissier;
    if (remise) updates.remise = remise;
    if (typeof montantFinal === 'number') updates.montantFinal = montantFinal;
    if (typeof montantRecu === 'number') updates.montantRecu = montantRecu;
    if (typeof monnaieRendue === 'number') updates.monnaieRendue = monnaieRendue;
    if (datePaiement) updates.datePaiement = datePaiement;
    else if (statut === 'Payée' && !commande.datePaiement) updates.datePaiement = dateMiseAJour;

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
        Object.assign(memCmd, updates);
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

    // Trigger Targeted Web Push notifications by Profile ID & Role
    const serveuseName = updatedCommande.nomServeuse ? ` • Serveuse: ${updatedCommande.nomServeuse}` : '';
    const tableLabel = updatedCommande.table ? `Table ${updatedCommande.table}` : 'En salle';
    const targetIdProfil = updatedCommande.idServeuse;

    if (statut === 'En cuisine') {
      sendPushNotificationTargeted({
        targetIdProfil,
        title: `👨‍🍳 Commande en préparation #${id}`,
        body: `${tableLabel} • Prise en charge en cuisine / bar en cours !${serveuseName}`,
        tag: `order-status-${id}`,
        data: { url: '/', idCommande: id, statut: 'En cuisine', table: updatedCommande.table }
      });
    } else if (statut === 'Prête') {
      sendPushNotificationTargeted({
        targetIdProfil,
        title: `🔔 Commande PRÊTE #${id} !`,
        body: `${tableLabel} est PRÊTE ! Venez la récupérer pour la servir à table.${serveuseName}`,
        tag: `order-status-${id}`,
        data: { url: '/', idCommande: id, statut: 'Prête', table: updatedCommande.table }
      });
    } else if (statut === 'Servie') {
      sendPushNotificationTargeted({
        targetIdProfil,
        title: `✅ Commande Servie #${id}`,
        body: `${tableLabel} a été servie aux clients à table.${serveuseName}`,
        tag: `order-status-${id}`,
        data: { url: '/', idCommande: id, statut: 'Servie', table: updatedCommande.table }
      });
    } else if (statut === 'Payée') {
      const effectiveAmount = typeof updatedCommande.montantFinal === 'number' ? updatedCommande.montantFinal : (updatedCommande.montantTotal || 0);
      sendPushNotificationTargeted({
        targetIdProfil,
        targetRole: 'caissier',
        title: `💰 Commande Payée #${id} !`,
        body: `${tableLabel} • Total: ${effectiveAmount.toLocaleString()} FCFA (${updatedCommande.modePaiement || 'Espèces'})${updatedCommande.nomCaissier ? ` • Caissier: ${updatedCommande.nomCaissier}` : ''}${serveuseName}`,
        tag: `order-status-${id}`,
        data: { url: '/', idCommande: id, statut: 'Payée', table: updatedCommande.table }
      });
    } else if (statut === 'Annulée') {
      sendPushNotificationTargeted({
        targetIdProfil,
        title: `❌ Commande Annulée #${id}`,
        body: `${tableLabel} a été annulée.${serveuseName}`,
        tag: `order-status-${id}`,
        data: { url: '/', idCommande: id, statut: 'Annulée', table: updatedCommande.table }
      });
    } else if (statut === 'En attente') {
      sendPushNotificationTargeted({
        targetIdProfil,
        title: `⏳ Commande remise en attente #${id}`,
        body: `${tableLabel} est en attente.${serveuseName}`,
        tag: `order-status-${id}`,
        data: { url: '/', idCommande: id, statut: 'En attente', table: updatedCommande.table }
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

// Batch Pay Endpoint (Grouped Checkout for Tables)
app.post("/api/commandes/batch-pay", async (req, res) => {
  const { 
    idCommandes,
    table = "Table",
    modePaiement = "Espèces", 
    idCaissier, 
    nomCaissier, 
    remise, 
    montantFinal, 
    montantRecu, 
    monnaieRendue, 
    datePaiement 
  } = req.body;

  if (!idCommandes || !Array.isArray(idCommandes) || idCommandes.length === 0) {
    return res.status(400).json({ success: false, message: "Aucun identifiant de commande fourni pour l'encaissement groupé." });
  }

  try {
    const dateMiseAJour = datePaiement || new Date().toISOString();
    const allCommandes = await fetchCommandesList();
    const targetCommandes = allCommandes.filter((c: any) => idCommandes.includes(c.idCommande));

    if (targetCommandes.length === 0) {
      return res.status(404).json({ success: false, message: "Aucune commande correspondante trouvée." });
    }

    const totalBrut = targetCommandes.reduce((sum: number, c: any) => sum + (c.montantTotal || 0), 0);
    const globalFinal = typeof montantFinal === 'number' ? montantFinal : totalBrut;
    const ratio = totalBrut > 0 ? globalFinal / totalBrut : 1;

    const updatedCommandes: any[] = [];

    if (isFirestoreConnected && firestoreDb) {
      const batch = writeBatch(firestoreDb);

      for (const cmd of targetCommandes) {
        const cmdRef = doc(firestoreDb, "commandes", cmd.idCommande);
        const orderPartFinal = Math.round(cmd.montantTotal * ratio);
        const orderUpdates: any = {
          statut: 'Payée',
          modePaiement,
          idCaissier: idCaissier || cmd.idCaissier || "CAISSIER",
          nomCaissier: nomCaissier || cmd.nomCaissier || "Caisse",
          datePaiement: dateMiseAJour,
          dateMiseAJour,
          montantFinal: orderPartFinal,
          remise: remise || cmd.remise || null
        };
        batch.update(cmdRef, orderUpdates);
        updatedCommandes.push({ ...cmd, ...orderUpdates });
      }

      await batch.commit();
    } else {
      for (const cmd of targetCommandes) {
        const orderPartFinal = Math.round(cmd.montantTotal * ratio);
        const orderUpdates: any = {
          statut: 'Payée',
          modePaiement,
          idCaissier: idCaissier || cmd.idCaissier || "CAISSIER",
          nomCaissier: nomCaissier || cmd.nomCaissier || "Caisse",
          datePaiement: dateMiseAJour,
          dateMiseAJour,
          montantFinal: orderPartFinal,
          remise: remise || cmd.remise || null
        };
        const memCmd = memoryCommandes.find(c => c.idCommande === cmd.idCommande);
        if (memCmd) {
          Object.assign(memCmd, orderUpdates);
        }
        updatedCommandes.push({ ...cmd, ...orderUpdates });
      }
    }

    // Trigger Consolidated Push Notification
    sendPushNotificationToAll({
      title: `💰 Table ${table} Réglée (${globalFinal.toLocaleString()} FCFA) !`,
      body: `${idCommandes.length} commande(s) soldée(s) en caisse par ${nomCaissier || 'la caisse'} • Mode: ${modePaiement}`,
      tag: `order-status-table-${table}`,
      data: { url: '/', table, statut: 'Payée', total: globalFinal }
    });

    const freshArticles = await fetchArticlesList();

    res.json({
      success: true,
      message: `Table ${table} réglée avec succès (${idCommandes.length} commandes soldées).`,
      commandes: updatedCommandes,
      articles: freshArticles
    });
  } catch (err: any) {
    console.error("Batch payment error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// -------------------------------------------------------------
// 3.5 BATCH OFFLINE SYNC API
// Receives queued actions performed while offline and synchronizes them
// -------------------------------------------------------------
app.post("/api/sync/batch", async (req, res) => {
  const { actions } = req.body;
  if (!actions || !Array.isArray(actions)) {
    return res.status(400).json({ success: false, message: "Liste d'actions de synchronisation invalide." });
  }

  console.log(`[Offline Sync] Processing ${actions.length} queued offline actions...`);
  const results: any[] = [];

  try {
    for (const action of actions) {
      const { type, payload } = action;
      try {
        switch (type) {
          case 'CREATE_COMMANDE': {
            const { idCommande, idServeuse, nomServeuse, table, articles, modePaiement, notesServeuse, dateCreation, statut } = payload;
            const existingList = await fetchCommandesList();
            const existing = existingList.find((c: any) => c.idCommande === idCommande);

            if (!existing) {
              const articlesList = await fetchArticlesList();
              let montantTotal = 0;
              const validatedArticles = (articles || []).map((item: any) => {
                const sousTotal = Number((item.prixUnitaire * item.quantite).toFixed(2));
                montantTotal += sousTotal;
                return {
                  idArticle: item.idArticle,
                  nom: item.nom,
                  prixUnitaire: item.prixUnitaire,
                  quantite: item.quantite,
                  sousTotal,
                  categorie: item.categorie || '',
                  notes: item.notes || ''
                };
              });

              const nowStr = new Date().toISOString();
              const newCmd = {
                idCommande: idCommande || `CMD-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000 + 1000)}`,
                idServeuse: idServeuse || "SRV-000",
                nomServeuse: nomServeuse || "Serveuse Inconnue",
                table: table || "Bar",
                articles: validatedArticles,
                montantTotal: Number(montantTotal.toFixed(2)),
                statut: (statut || payload.statut || 'En attente'),
                modePaiement: modePaiement || 'Non payé',
                notesServeuse: notesServeuse || '',
                dateCreation: dateCreation || nowStr,
                dateMiseAJour: nowStr,
                ...(payload.idCaissier ? { idCaissier: payload.idCaissier } : {}),
                ...(payload.nomCaissier ? { nomCaissier: payload.nomCaissier } : {}),
                ...(payload.remise ? { remise: payload.remise } : {}),
                ...(typeof payload.montantFinal === 'number' ? { montantFinal: payload.montantFinal } : {}),
                ...(typeof payload.montantRecu === 'number' ? { montantRecu: payload.montantRecu } : {}),
                ...(typeof payload.monnaieRendue === 'number' ? { monnaieRendue: payload.monnaieRendue } : {}),
                ...(payload.datePaiement ? { datePaiement: payload.datePaiement } : {})
              };

              if (isFirestoreConnected && firestoreDb) {
                const batch = writeBatch(firestoreDb);
                for (const item of validatedArticles) {
                  const artRef = doc(firestoreDb, "articles", item.idArticle);
                  const artSnap = await getDoc(artRef);
                  if (artSnap.exists()) {
                    const currentStock = artSnap.data().stock || 0;
                    batch.update(artRef, { stock: Math.max(0, currentStock - item.quantite) });
                  }
                }
                const srvRef = doc(firestoreDb, "serveuses", newCmd.idServeuse);
                const srvSnap = await getDoc(srvRef);
                if (srvSnap.exists()) {
                  const sData = srvSnap.data();
                  batch.update(srvRef, {
                    commandesTraitees: (sData.commandesTraitees || 0) + 1,
                    chiffreAffaires: (sData.chiffreAffaires || 0) + newCmd.montantTotal
                  });
                }
                batch.set(doc(firestoreDb, "commandes", newCmd.idCommande), newCmd);
                await batch.commit();
              } else {
                for (const item of validatedArticles) {
                  const target = memoryArticles.find(a => a.idArticle === item.idArticle);
                  if (target) target.stock = Math.max(0, target.stock - item.quantite);
                }
                const srv = memoryServeuses.find(s => s.idServeuse === newCmd.idServeuse);
                if (srv) {
                  srv.commandesTraitees = (srv.commandesTraitees || 0) + 1;
                  srv.chiffreAffaires = (srv.chiffreAffaires || 0) + newCmd.montantTotal;
                }
                memoryCommandes.unshift(newCmd as any);
              }
              results.push({ id: action.id, status: 'created', idCommande: newCmd.idCommande });
            } else {
              results.push({ id: action.id, status: 'already_exists', idCommande });
            }
            break;
          }

          case 'UPDATE_COMMANDE_STATUT': {
            const { idCommande, statut, modePaiement, paymentDetails } = payload;
            const allCmds = await fetchCommandesList();
            const cmd = allCmds.find((c: any) => c.idCommande === idCommande);

            if (cmd) {
              const ancienStatut = cmd.statut;
              const dateMiseAJour = new Date().toISOString();
              const updates: any = { statut, dateMiseAJour };
              if (modePaiement) updates.modePaiement = modePaiement;
              if (paymentDetails) {
                if (paymentDetails.idCaissier) updates.idCaissier = paymentDetails.idCaissier;
                if (paymentDetails.nomCaissier) updates.nomCaissier = paymentDetails.nomCaissier;
                if (paymentDetails.remise) updates.remise = paymentDetails.remise;
                if (typeof paymentDetails.montantFinal === 'number') updates.montantFinal = paymentDetails.montantFinal;
                if (typeof paymentDetails.montantRecu === 'number') updates.montantRecu = paymentDetails.montantRecu;
                if (typeof paymentDetails.monnaieRendue === 'number') updates.monnaieRendue = paymentDetails.monnaieRendue;
                if (paymentDetails.datePaiement) updates.datePaiement = paymentDetails.datePaiement;
                else if (statut === 'Payée' && !cmd.datePaiement) updates.datePaiement = dateMiseAJour;
              }

              const needsRestock = (statut === 'Annulée' && ancienStatut !== 'Annulée');

              if (isFirestoreConnected && firestoreDb) {
                const batch = writeBatch(firestoreDb);
                const cmdRef = doc(firestoreDb, "commandes", idCommande);
                batch.update(cmdRef, updates);
                if (needsRestock) {
                  for (const item of cmd.articles) {
                    const artRef = doc(firestoreDb, "articles", item.idArticle);
                    const artSnap = await getDoc(artRef);
                    if (artSnap.exists()) {
                      batch.update(artRef, { stock: (artSnap.data().stock || 0) + item.quantite });
                    }
                  }
                }
                await batch.commit();
              } else {
                const mem = memoryCommandes.find(c => c.idCommande === idCommande);
                if (mem) Object.assign(mem, updates);
                if (needsRestock) {
                  for (const item of cmd.articles) {
                    const target = memoryArticles.find(a => a.idArticle === item.idArticle);
                    if (target) target.stock += item.quantite;
                  }
                }
              }
              results.push({ id: action.id, status: 'updated', idCommande });
            } else {
              results.push({ id: action.id, status: 'not_found', idCommande });
            }
            break;
          }

          case 'CREATE_ARTICLE': {
            const article = payload;
            const allArts = await fetchArticlesList();
            const idArticle = article.idArticle || `ART-${Math.floor(Math.random() * 90000 + 10000)}`;
            const newArt = {
              idArticle,
              nom: article.nom || 'Nouvel Article',
              categorie: article.categorie || 'Boissons',
              prix: Number(article.prix) || 0,
              stock: Number(article.stock) || 0,
              stockInitial: Number(article.stockInitial || article.stock) || 0,
              emoji: article.emoji || '📦',
              image: article.image || '',
              actif: article.actif ?? true,
              description: article.description || ''
            };
            if (isFirestoreConnected && firestoreDb) {
              await setDoc(doc(firestoreDb, "articles", idArticle), newArt);
            } else {
              const existingIdx = memoryArticles.findIndex(a => a.idArticle === idArticle);
              if (existingIdx !== -1) memoryArticles[existingIdx] = newArt;
              else memoryArticles.push(newArt);
            }
            results.push({ id: action.id, status: 'created', idArticle });
            break;
          }

          case 'UPDATE_ARTICLE': {
            const { idArticle, updates } = payload;
            if (isFirestoreConnected && firestoreDb) {
              const ref = doc(firestoreDb, "articles", idArticle);
              await updateDoc(ref, updates);
            } else {
              const art = memoryArticles.find(a => a.idArticle === idArticle);
              if (art) Object.assign(art, updates);
            }
            results.push({ id: action.id, status: 'updated', idArticle });
            break;
          }

          case 'ADJUST_STOCK': {
            const { idArticle, delta, nouveauStock } = payload;
            if (isFirestoreConnected && firestoreDb) {
              const ref = doc(firestoreDb, "articles", idArticle);
              const snap = await getDoc(ref);
              if (snap.exists()) {
                const current = snap.data().stock || 0;
                const nextStock = nouveauStock !== undefined ? Math.max(0, nouveauStock) : Math.max(0, current + (delta || 0));
                await updateDoc(ref, { stock: nextStock });
              }
            } else {
              const art = memoryArticles.find(a => a.idArticle === idArticle);
              if (art) {
                if (nouveauStock !== undefined) art.stock = Math.max(0, nouveauStock);
                else if (delta !== undefined) art.stock = Math.max(0, art.stock + delta);
              }
            }
            results.push({ id: action.id, status: 'stock_adjusted', idArticle });
            break;
          }

          case 'DELETE_ARTICLE': {
            const { idArticle } = payload;
            if (isFirestoreConnected && firestoreDb) {
              await deleteDoc(doc(firestoreDb, "articles", idArticle));
            } else {
              memoryArticles = memoryArticles.filter(a => a.idArticle !== idArticle);
            }
            results.push({ id: action.id, status: 'deleted', idArticle });
            break;
          }

          case 'CREATE_TABLE': {
            const { nom } = payload;
            if (nom && nom.trim()) {
              const trimmed = nom.trim();
              if (isFirestoreConnected && firestoreDb) {
                const tblId = `TBL-${trimmed.replace(/\s+/g, '-').toUpperCase()}`;
                await setDoc(doc(firestoreDb, "tables", tblId), { idTable: tblId, nom: trimmed, dateCreation: new Date().toISOString() });
              } else {
                if (!memoryTables.some(t => t.nom.toLowerCase() === trimmed.toLowerCase())) {
                  memoryTables.push({ idTable: `TBL-${Date.now()}`, nom: trimmed });
                }
              }
            }
            results.push({ id: action.id, status: 'table_created' });
            break;
          }

          case 'DELETE_TABLE': {
            const { nom } = payload;
            if (nom) {
              if (isFirestoreConnected && firestoreDb) {
                const snap = await getDocs(collection(firestoreDb, "tables"));
                for (const d of snap.docs) {
                  if (d.data().nom === nom) await deleteDoc(d.ref);
                }
              } else {
                memoryTables = memoryTables.filter(t => t.nom !== nom);
              }
            }
            results.push({ id: action.id, status: 'table_deleted' });
            break;
          }

          case 'CREATE_CATEGORY': {
            const { nom, emoji } = payload;
            if (nom && nom.trim()) {
              const catId = `CAT-${Math.floor(Math.random() * 9000 + 1000)}`;
              const newCat = { idCategorie: catId, nom: nom.trim(), emoji: emoji || '🏷️', dateCreation: new Date().toISOString() };
              if (isFirestoreConnected && firestoreDb) {
                await setDoc(doc(firestoreDb, "categories", catId), newCat);
              } else {
                if (!memoryCategories.some(c => c.nom.toLowerCase() === nom.trim().toLowerCase())) {
                  memoryCategories.push(newCat);
                }
              }
            }
            results.push({ id: action.id, status: 'category_created' });
            break;
          }

          case 'DELETE_CATEGORY': {
            const { nomOrId } = payload;
            if (nomOrId) {
              if (isFirestoreConnected && firestoreDb) {
                const snap = await getDocs(collection(firestoreDb, "categories"));
                for (const d of snap.docs) {
                  const data = d.data();
                  if (data.idCategorie === nomOrId || data.nom.toLowerCase() === nomOrId.toLowerCase()) {
                    await deleteDoc(d.ref);
                  }
                }
              } else {
                memoryCategories = memoryCategories.filter(c => c.idCategorie !== nomOrId && c.nom.toLowerCase() !== nomOrId.toLowerCase());
              }
            }
            results.push({ id: action.id, status: 'category_deleted' });
            break;
          }

          case 'UPDATE_SERVEUSE_PIN': {
            const { idServeuse, newPin } = payload;
            if (isFirestoreConnected && firestoreDb) {
              await updateDoc(doc(firestoreDb, "serveuses", idServeuse), { pin: newPin });
            } else {
              const s = memoryServeuses.find(x => x.idServeuse === idServeuse);
              if (s) s.pin = newPin;
            }
            results.push({ id: action.id, status: 'pin_updated', idServeuse });
            break;
          }

          default:
            results.push({ id: action.id, status: 'unsupported_type', type });
        }
      } catch (innerErr: any) {
        console.warn(`[Offline Sync] Action ${action.type} error:`, innerErr.message);
        results.push({ id: action.id, status: 'error', error: innerErr.message });
      }
    }

    // Fetch refreshed data from database to send back to client
    const [freshArticles, freshCommandes, freshTables, freshCategories, freshServeuses] = await Promise.all([
      fetchArticlesList(),
      fetchCommandesList(),
      fetchTablesList(),
      fetchCategoriesList(),
      fetchServeusesList()
    ]);

    const tableNames = freshTables.map(t => typeof t === 'string' ? t : t.nom);

    res.json({
      success: true,
      processedCount: actions.length,
      results,
      freshData: {
        articles: freshArticles,
        commandes: freshCommandes,
        tables: tableNames,
        categories: freshCategories,
        serveuses: freshServeuses
      }
    });

  } catch (err: any) {
    console.error("[Offline Sync] Fatal error during batch sync:", err);
    res.status(500).json({ success: false, error: err.message });
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

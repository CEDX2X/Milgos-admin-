// Web Notifications & Audio Chime Utility for PWA (Android & iOS Web Push)

import { getOrCreateDeviceId, getDeviceName } from './device';
import { Serveuse } from '../types';

export type NotificationPermissionState = NotificationPermission | 'unsupported';

export function checkNotificationSupport(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getNotificationPermission(user?: Serveuse | null): NotificationPermissionState {
  if (typeof window !== 'undefined') {
    const userId = user?.idServeuse || 'all';
    const forced = localStorage.getItem(`orderease_forced_notif_${userId}`) || localStorage.getItem('orderease_forced_notif_all');
    if (forced === 'true') return 'granted';
  }
  if (!checkNotificationSupport()) return 'unsupported';
  return Notification.permission;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Subscribes the current device to backend Web Push (VAPID) so that notifications arrive
 * even when the PWA is CLOSED or in background on iOS 16.4+ and Android.
 * Automatically binds the unique Device ID and active Profile ID to the push subscription.
 */
export async function subscribeToWebPush(user?: Serveuse | null): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('[WebPush] Service Worker or PushManager not supported on this browser.');
    return false;
  }

  try {
    const reg = await navigator.serviceWorker.ready;
    if (!reg) {
      console.warn('[WebPush] Service Worker not ready.');
      return false;
    }

    // Fetch VAPID public key from backend
    const keyRes = await fetch('/api/push/vapid-key');
    if (!keyRes.ok) throw new Error('Failed to fetch VAPID key');
    const { publicKey } = await keyRes.json();

    if (!publicKey) throw new Error('No public VAPID key returned');

    const convertedKey = urlBase64ToUint8Array(publicKey);

    // Check existing subscription
    let subscription = await reg.pushManager.getSubscription();

    // If subscription exists, verify if applicationServerKey matches the server publicKey
    if (subscription) {
      const rawKey = subscription.options.applicationServerKey;
      let isMismatch = false;
      if (rawKey) {
        const rawArray = new Uint8Array(rawKey);
        if (rawArray.length !== convertedKey.length || !rawArray.every((v, i) => v === convertedKey[i])) {
          isMismatch = true;
        }
      }
      if (isMismatch) {
        console.log('[WebPush] VAPID key mismatch detected with existing subscription. Renewing subscription...');
        try {
          await subscription.unsubscribe();
          subscription = null;
        } catch (unsubErr) {
          console.warn('[WebPush] Unsubscribe error:', unsubErr);
        }
      }
    }

    if (!subscription) {
      try {
        subscription = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedKey
        });
        console.log('[WebPush] New Web Push subscription created:', subscription.endpoint);
      } catch (subErr) {
        console.warn('[WebPush] Direct subscribe failed, attempting clean unsubscribe and retry:', subErr);
        try {
          const staleSub = await reg.pushManager.getSubscription();
          if (staleSub) {
            await staleSub.unsubscribe();
          }
          subscription = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: convertedKey
          });
        } catch (retryErr) {
          console.error('[WebPush] Retry subscribe failed:', retryErr);
          return false;
        }
      }
    } else {
      console.log('[WebPush] Existing valid subscription reused:', subscription.endpoint);
    }

    if (!subscription) {
      return false;
    }

    // Retrieve active profile from localStorage if not explicitly passed
    let activeUser = user;
    if (!activeUser && typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('orderease_session_user');
        if (saved) activeUser = JSON.parse(saved);
      } catch {}
    }

    const idAppareil = getOrCreateDeviceId();
    const nomAppareil = getDeviceName();
    const idProfil = activeUser?.idServeuse || 'GUEST';
    const nomProfil = activeUser?.nom || 'Non connecté';
    const role = activeUser?.role || 'serveuse';

    // Register subscription on backend with device ID and profile ID
    const subRes = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        subscription,
        idAppareil,
        nomAppareil,
        idProfil,
        nomProfil,
        role,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown'
      })
    });

    return subRes.ok;
  } catch (err) {
    console.error('[WebPush] Error subscribing to Web Push:', err);
    return false;
  }
}

export async function requestNotificationPermission(user?: Serveuse | null): Promise<NotificationPermissionState> {
  if (typeof window !== 'undefined') {
    const userId = user?.idServeuse || 'all';
    localStorage.setItem(`orderease_forced_notif_${userId}`, 'true');
    localStorage.setItem('orderease_forced_notif_all', 'true');
    playPreparationChime();
  }

  if (!checkNotificationSupport()) {
    console.warn('[PWA Notification] Notifications API not supported in this browser, using in-app mode.');
    return 'granted';
  }

  try {
    const permission = await Notification.requestPermission();
    subscribeToWebPush(user).catch(err => console.warn('[WebPush] Auto-subscribe error:', err));
    return 'granted';
  } catch (err) {
    console.warn('[PWA Notification] Native request permission restricted/blocked in iframe, enabled in-app audio & visual alerts:', err);
    return 'granted';
  }
}

/**
 * Auto-registers or updates Web Push subscription on app boot if permission is granted
 */
export function initWebPushOnBoot(user?: Serveuse | null): void {
  if (getNotificationPermission() === 'granted') {
    subscribeToWebPush(user).catch(() => {});
  }
}


/**
 * Plays a pleasant preparation chime sound using Web Audio API.
 * Synthesizes an ascending two-tone chime when kitchen/bar starts preparation.
 */
export function playPreparationChime(): void {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    
    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const now = ctx.currentTime;

    // Note 1 (A5 - ~880 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(880, now);
    gain1.gain.setValueAtTime(0.25, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.3);

    // Note 2 (C#6 - ~1108 Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(1108.73, now + 0.12);
    gain2.gain.setValueAtTime(0.3, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.45);

  } catch (err) {
    console.warn('[PWA Audio] Could not play preparation chime:', err);
  }
}

/**
 * Plays an alert service bell chime (like a restaurant counter bell) using Web Audio API.
 * Triple harmonious bell chime when order is ready to serve.
 */
export function playReadyBellChime(): void {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    
    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const now = ctx.currentTime;

    // Bell chime 1 (High bell F6 - 1396.9 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(1396.91, now);
    gain1.gain.setValueAtTime(0.4, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.6);

    // Bell chime 2 (A6 - 1760 Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1760, now + 0.12);
    gain2.gain.setValueAtTime(0.45, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.7);

    // Bell chime 3 (C7 - 2093 Hz)
    const osc3 = ctx.createOscillator();
    const gain3 = ctx.createGain();
    osc3.type = 'sine';
    osc3.frequency.setValueAtTime(2093, now + 0.24);
    gain3.gain.setValueAtTime(0.5, now + 0.24);
    gain3.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
    osc3.connect(gain3);
    gain3.connect(ctx.destination);
    osc3.start(now + 0.24);
    osc3.stop(now + 0.9);

  } catch (err) {
    console.warn('[PWA Audio] Could not play ready bell chime:', err);
  }
}

/**
 * Plays a pleasant payment chime sound using Web Audio API.
 * Synthesizes a crisp double-beep tone without relying on external MP3 files.
 */
export function playPaymentChime(): void {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    
    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const now = ctx.currentTime;

    // First high note (E6 - ~1318 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(1318.51, now);
    gain1.gain.setValueAtTime(0.3, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.25);

    // Second higher note (B6 - ~1975 Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1975.53, now + 0.12);
    gain2.gain.setValueAtTime(0.35, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.5);

  } catch (err) {
    console.warn('[PWA Audio] Could not play audio chime:', err);
  }
}

/**
 * Trigger vibration motor if available (mobile devices)
 */
export function triggerPaymentVibration(): void {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate([150, 80, 150, 80, 250]);
    } catch {
      // Ignore vibration errors
    }
  }
}

export function triggerReadyVibration(): void {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate([200, 100, 200, 100, 400]);
    } catch {
      // Ignore vibration errors
    }
  }
}

export function triggerPreparationVibration(): void {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate([120, 80, 180]);
    } catch {
      // Ignore vibration errors
    }
  }
}

export interface SendOrderStatusNotificationOptions {
  idCommande: string;
  table: string;
  statut: 'En attente' | 'En cuisine' | 'Prête' | 'Servie' | 'Payée' | 'Annulée';
  nomServeuse?: string;
  department?: 'cuisine' | 'bar' | 'all';
}

/**
 * Sends a native Web / ServiceWorker notification when an order status changes.
 * Especially notifies the waitress when kitchen or bar marks order as in preparation or ready.
 */
export async function sendOrderStatusNotification(order: SendOrderStatusNotificationOptions): Promise<boolean> {
  let title = `Commande #${order.idCommande}`;
  let body = `Table ${order.table}`;
  const tag = `order-status-${order.idCommande}-${order.statut}`;

  if (order.statut === 'En cuisine') {
    playPreparationChime();
    triggerPreparationVibration();
    title = order.department === 'bar' 
      ? `🍹 Boissons en préparation #${order.idCommande}`
      : `👨‍🍳 Plats en préparation #${order.idCommande}`;
    body = `Table ${order.table} • Prise en charge en cuisine/bar en cours${order.nomServeuse ? ` • ${order.nomServeuse}` : ''}`;
  } else if (order.statut === 'Prête') {
    playReadyBellChime();
    triggerReadyVibration();
    title = order.department === 'bar'
      ? `🔔 Boissons PRÊTES #${order.idCommande} !`
      : `🔔 Plats PRÊTS #${order.idCommande} !`;
    body = `Table ${order.table} est PRÊTE ! La serveuse peut venir la servir à table${order.nomServeuse ? ` • ${order.nomServeuse}` : ''}`;
  } else if (order.statut === 'Servie') {
    title = `✅ Commande Servie #${order.idCommande}`;
    body = `Table ${order.table} servie aux clients avec succès${order.nomServeuse ? ` • ${order.nomServeuse}` : ''}`;
  } else if (order.statut === 'Payée') {
    playPaymentChime();
    triggerPaymentVibration();
    title = `💰 Commande Payée #${order.idCommande} !`;
    body = `Table ${order.table} réglée avec succès${order.nomServeuse ? ` • ${order.nomServeuse}` : ''}`;
  } else if (order.statut === 'Annulée') {
    title = `❌ Commande Annulée #${order.idCommande}`;
    body = `Table ${order.table} a été annulée.`;
  }

  if (!checkNotificationSupport()) {
    return false;
  }

  if (Notification.permission !== 'granted') {
    return false;
  }

  const options: NotificationOptions & { renotify?: boolean } = {
    body,
    icon: '/icon-192.png',
    badge: '/favicon.png',
    tag,
    renotify: true,
    data: {
      url: '/',
      idCommande: order.idCommande,
      statut: order.statut,
      timestamp: Date.now()
    }
  };

  try {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      const registration = await navigator.serviceWorker.ready;
      if (registration && 'showNotification' in registration) {
        await registration.showNotification(title, options);
        return true;
      }
    }

    new Notification(title, options);
    return true;
  } catch (err) {
    console.error('[PWA Notification] Error showing status notification:', err);
    try {
      new Notification(title, options);
      return true;
    } catch {
      return false;
    }
  }
}

export interface SendOrderPaidNotificationOptions {
  idCommande: string;
  table: string;
  total: number;
  modePaiement?: string;
  nomServeuse?: string;
  currencySymbol?: string;
}

/**
 * Sends a native Web / ServiceWorker notification for a paid order on Android & iOS PWA.
 */
export async function sendOrderPaidNotification(order: SendOrderPaidNotificationOptions): Promise<boolean> {
  // Always play chime sound and vibration for immediate in-app feedback
  playPaymentChime();
  triggerPaymentVibration();

  if (!checkNotificationSupport()) {
    console.log('[PWA Notification] Web Notifications API not supported.');
    return false;
  }

  if (Notification.permission !== 'granted') {
    console.log('[PWA Notification] Permission not granted yet (current status:', Notification.permission, ')');
    return false;
  }

  const formattedTotal = typeof order.total === 'number' 
    ? `${order.total.toLocaleString()} ${order.currencySymbol || 'FCFA'}` 
    : `${order.total} ${order.currencySymbol || 'FCFA'}`;

  const title = `💰 Commande Payée #${order.idCommande} !`;
  const body = `Table ${order.table} • Total: ${formattedTotal}${order.modePaiement ? ` (${order.modePaiement})` : ''}${order.nomServeuse ? ` • ${order.nomServeuse}` : ''}`;

  const options: NotificationOptions & { renotify?: boolean } = {
    body,
    icon: '/icon-192.png',
    badge: '/favicon.png',
    tag: `order-paid-${order.idCommande}`,
    renotify: true,
    data: {
      url: '/',
      idCommande: order.idCommande,
      timestamp: Date.now()
    }
  };

  try {
    // Check if Service Worker is active for robust background PWA notifications
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      const registration = await navigator.serviceWorker.ready;
      if (registration && 'showNotification' in registration) {
        await registration.showNotification(title, options);
        return true;
      }
    }

    // Fallback to standard Notification constructor
    new Notification(title, options);
    return true;
  } catch (err) {
    console.error('[PWA Notification] Error triggering notification:', err);
    try {
      new Notification(title, options);
      return true;
    } catch {
      return false;
    }
  }
}

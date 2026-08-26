// Web Notifications & Audio Chime Utility for PWA (Android & iOS Web Push)

export type NotificationPermissionState = NotificationPermission | 'unsupported';

export function checkNotificationSupport(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getNotificationPermission(): NotificationPermissionState {
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
 */
export async function subscribeToWebPush(): Promise<boolean> {
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

    // Check existing subscription
    let subscription = await reg.pushManager.getSubscription();

    if (!subscription) {
      const convertedKey = urlBase64ToUint8Array(publicKey);
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedKey
      });
      console.log('[WebPush] New Web Push subscription created:', subscription.endpoint);
    } else {
      console.log('[WebPush] Existing subscription reused:', subscription.endpoint);
    }

    // Register subscription on backend
    const subRes = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription })
    });

    return subRes.ok;
  } catch (err) {
    console.error('[WebPush] Error subscribing to Web Push:', err);
    return false;
  }
}

export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  if (!checkNotificationSupport()) {
    console.warn('[PWA Notification] Notifications API not supported in this browser.');
    return 'unsupported';
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      // Automatically register Web Push subscription so iOS receives notifications when closed!
      subscribeToWebPush().catch(err => console.warn('[WebPush] Auto-subscribe error:', err));
    }
    return permission;
  } catch (err) {
    console.error('[PWA Notification] Error requesting permission:', err);
    return Notification.permission;
  }
}

/**
 * Auto-registers or updates Web Push subscription on app boot if permission is granted
 */
export function initWebPushOnBoot(): void {
  if (getNotificationPermission() === 'granted') {
    subscribeToWebPush().catch(() => {});
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

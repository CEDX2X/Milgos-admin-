import { DeviceRegistration, Serveuse } from '../types';

const DEVICE_ID_KEY = 'orderease_device_id';
const DEVICE_NAME_KEY = 'orderease_device_name';

/**
 * Generates a clean, human-readable unique Device ID: DEV-XXXXXX
 */
function generateDeviceId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = 'DEV-';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Returns the persistent unique Device ID for this browser / PWA installation.
 * Creates and persists one if none exists yet.
 */
export function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined' || !window.localStorage) {
    return 'DEV-DEFAULT';
  }
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id || !id.startsWith('DEV-')) {
    id = generateDeviceId();
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

/**
 * Guesses a default readable device name based on User-Agent.
 */
function detectDeviceType(): string {
  if (typeof navigator === 'undefined') return 'Appareil Web';
  const ua = navigator.userAgent;
  if (/iPad/i.test(ua)) return 'iPad Tablet';
  if (/iPhone/i.test(ua)) return 'iPhone PWA';
  if (/Android/i.test(ua)) {
    if (/Mobile/i.test(ua)) return 'Mobile Android';
    return 'Tablette Android';
  }
  if (/Mac/i.test(ua)) return 'Mac Desktop';
  if (/Win/i.test(ua)) return 'PC Windows';
  if (/Linux/i.test(ua)) return 'Poste Linux';
  return 'Terminal POS';
}

/**
 * Returns the saved friendly device name or default.
 */
export function getDeviceName(): string {
  if (typeof window === 'undefined' || !window.localStorage) {
    return 'Terminal POS';
  }
  const saved = localStorage.getItem(DEVICE_NAME_KEY);
  if (saved && saved.trim()) return saved.trim();
  const defaultName = detectDeviceType();
  return defaultName;
}

/**
 * Updates and saves the friendly device name.
 */
export function setDeviceName(name: string): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    localStorage.setItem(DEVICE_NAME_KEY, name.trim());
  }
}

/**
 * Registers / Heartbeats this device with the server.
 * Binds Device ID to the active Profile ID (idServeuse, role, nom).
 */
export async function syncDeviceRegistration(user: Serveuse | null): Promise<DeviceRegistration | null> {
  const idAppareil = getOrCreateDeviceId();
  const nomAppareil = getDeviceName();

  const idProfil = user?.idServeuse || 'GUEST';
  const nomProfil = user?.nom || 'Non connecté';
  const role = user?.role || 'serveuse';

  try {
    const res = await fetch('/api/devices/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idAppareil,
        nomAppareil,
        idProfil,
        nomProfil,
        role,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown'
      })
    });

    if (res.ok) {
      const data = await res.json();
      return data.device || null;
    }
  } catch (err) {
    console.warn('[DeviceSync] Failed to register device with backend:', err);
  }
  return null;
}

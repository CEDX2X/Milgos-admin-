let currentCurrency = typeof window !== 'undefined' ? (localStorage.getItem('app_currency') || 'FCFA') : 'FCFA';

export function getCurrency(): string {
  return currentCurrency;
}

export function setCurrency(currency: string): void {
  const trimmed = currency.trim();
  currentCurrency = trimmed || 'FCFA';
  if (typeof window !== 'undefined') {
    localStorage.setItem('app_currency', currentCurrency);
    window.dispatchEvent(new Event('currency_changed'));
  }
}

export function formatPrice(amount: number | undefined | null, customCurrency?: string): string {
  const curr = customCurrency !== undefined ? customCurrency : currentCurrency;
  if (amount === undefined || amount === null || isNaN(amount)) {
    return `0 ${curr}`;
  }
  const rounded = Math.round(amount);
  const formatted = rounded.toLocaleString('fr-FR');
  return `${formatted} ${curr}`;
}


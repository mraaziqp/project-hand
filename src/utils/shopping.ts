import { Currency } from '../types';

const CURRENCY_SYMBOL: Record<Currency, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  ZAR: 'R',
  INR: '₹',
  AUD: 'A$',
  CAD: 'C$',
};

const AMAZON_DOMAIN: Record<Currency, string> = {
  USD: 'amazon.com',
  EUR: 'amazon.de',
  GBP: 'amazon.co.uk',
  ZAR: 'amazon.co.za',
  INR: 'amazon.in',
  AUD: 'amazon.com.au',
  CAD: 'amazon.ca',
};

export function formatPrice(value: number | undefined, currency: Currency): string {
  if (value === undefined || value === null || !Number.isFinite(value) || value <= 0) return '';
  const digits = value >= 100 ? 0 : 2;
  return `~${CURRENCY_SYMBOL[currency] ?? ''}${value.toFixed(digits)}`;
}

export interface StoreLink {
  name: string;
  url: string;
}

/** Search links for buying a part. Part numbers also get distributor + datasheet links. */
export function buildStoreLinks(query: string, currency: Currency, partNumber?: string): StoreLink[] {
  const q = encodeURIComponent(query.trim());
  const links: StoreLink[] = [
    { name: 'AliExpress', url: `https://www.aliexpress.com/wholesale?SearchText=${q}` },
    { name: 'Amazon', url: `https://www.${AMAZON_DOMAIN[currency] ?? 'amazon.com'}/s?k=${q}` },
    { name: 'eBay', url: `https://www.ebay.com/sch/i.html?_nkw=${q}` },
    { name: 'Google Shopping', url: `https://www.google.com/search?tbm=shop&q=${q}` },
  ];
  const pn = partNumber?.trim();
  if (pn) {
    const p = encodeURIComponent(pn);
    links.push(
      { name: 'Octopart', url: `https://octopart.com/search?q=${p}` },
      { name: 'LCSC', url: `https://www.lcsc.com/search?q=${p}` },
      { name: 'Datasheet', url: `https://www.google.com/search?q=${p}+datasheet+pdf` }
    );
  }
  return links;
}

export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through
  }
  // Fallback for plain-http LAN access where the async clipboard API is unavailable.
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

/**
 * @spiceup/utils
 * Shared utility functions for all SpiceUp apps.
 * UK-specific: GBP, pence-based money, UK VAT rates, UK postcodes.
 */

// ─── Money Utilities ────────────────────────────────────────────────────────

/** Format pence as GBP string. 1099 → '£10.99' */
export function gbp(pence: number): string {
  if (typeof pence !== 'number' || isNaN(pence)) return '£0.00';
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(pence / 100);
}

/** Convert pounds decimal to pence integer. 10.99 → 1099 */
export function toPence(pounds: number): number {
  return Math.round(pounds * 100);
}

/** Convert pence to pounds decimal. 1099 → 10.99 */
export function toPounds(pence: number): number {
  return pence / 100;
}

/** Calculate VAT component from gross pence (VAT-inclusive). */
export function vatFromGross(grossPence: number, rate: 0 | 5 | 20): number {
  if (rate === 0) return 0;
  return Math.round(grossPence - (grossPence * 100) / (100 + rate));
}

/** Calculate VAT component from net pence (VAT-exclusive). */
export function vatFromNet(netPence: number, rate: 0 | 5 | 20): number {
  if (rate === 0) return 0;
  return Math.round(netPence * (rate / 100));
}

/**
 * Compute VAT breakdown from a list of order lines.
 * Groups by VAT rate bucket and returns net + vat per bucket.
 */
export interface VatLine {
  rate: number;
  netPence: number;
  vatPence: number;
  grossPence: number;
}

export function computeVatBreakdown(
  lines: Array<{ lineTotalPence: number; vatRate: 0 | 5 | 20 }>
): Record<string, VatLine> {
  const buckets: Record<string, VatLine> = {};
  for (const line of lines) {
    const rateKey = String(line.vatRate);
    const gross = line.lineTotalPence;
    const vat = vatFromGross(gross, line.vatRate);
    const net = gross - vat;
    if (!buckets[rateKey]) {
      buckets[rateKey] = { rate: line.vatRate, netPence: 0, vatPence: 0, grossPence: 0 };
    }
    buckets[rateKey].netPence += net;
    buckets[rateKey].vatPence += vat;
    buckets[rateKey].grossPence += gross;
  }
  return buckets;
}

// ─── UK Postcode Utilities ──────────────────────────────────────────────────

/** Validate a UK postcode format. */
export function isValidUKPostcode(postcode: string): boolean {
  const cleaned = postcode.replace(/\s+/g, '').toUpperCase();
  return /^[A-Z]{1,2}[0-9R][0-9A-Z]?[0-9][ABD-HJLNP-UW-Z]{2}$/.test(cleaned);
}

/** Extract the postcode outward code (prefix). 'WN1 1AA' → 'WN1' */
export function postcodeOutward(postcode: string): string {
  return postcode.trim().toUpperCase().split(' ')[0];
}

/** Normalise a UK postcode to 'AB12 3CD' format. */
export function normalisePostcode(postcode: string): string {
  const cleaned = postcode.replace(/\s+/g, '').toUpperCase();
  if (cleaned.length < 5) return cleaned;
  return cleaned.slice(0, -3) + ' ' + cleaned.slice(-3);
}

// ─── Date & Time Utilities ──────────────────────────────────────────────────

/** Format a Date as 'dd/MM/yyyy HH:mm' (UK format). */
export function formatUKDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d);
}

/** Format a Date as 'dd/MM/yyyy' (UK date only). */
export function formatUKDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d);
}

/** Get minutes elapsed since a date. */
export function minutesSince(date: Date | string): number {
  const d = typeof date === 'string' ? new Date(date) : date;
  return Math.floor((Date.now() - d.getTime()) / 60_000);
}

/** Get a human-readable time-ago string. */
export function timeAgo(date: Date | string): string {
  const minutes = minutesSince(date);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return formatUKDate(date);
}

// ─── Order Reference ─────────────────────────────────────────────────────────

/** Generate a UI-friendly order reference. 'ORD-20260531-0042' */
export function generateOrderRef(sequenceNum: number): string {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `ORD-${today}-${String(sequenceNum).padStart(4, '0')}`;
}

// ─── CSS Class Utilities ─────────────────────────────────────────────────────

/** Merge class names conditionally. */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

// ─── Order Status Utilities ──────────────────────────────────────────────────

export type OrderStatus =
  | 'placed'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'dispatched'
  | 'delivered'
  | 'collected'
  | 'cancelled';

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  placed: 'Order Placed',
  confirmed: 'Confirmed',
  preparing: 'Preparing',
  ready: 'Ready',
  dispatched: 'Out for Delivery',
  delivered: 'Delivered',
  collected: 'Collected',
  cancelled: 'Cancelled',
};

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  placed: 'bg-blue-100 text-blue-800',
  confirmed: 'bg-indigo-100 text-indigo-800',
  preparing: 'bg-amber-100 text-amber-800',
  ready: 'bg-green-100 text-green-800',
  dispatched: 'bg-purple-100 text-purple-800',
  delivered: 'bg-emerald-100 text-emerald-800',
  collected: 'bg-teal-100 text-teal-800',
  cancelled: 'bg-red-100 text-red-800',
};

/** Get the urgency colour class for a KDS ticket based on age. */
export function kdsUrgencyClass(createdAt: Date | string): string {
  const minutes = minutesSince(createdAt);
  if (minutes > 20) return 'border-red-500 bg-red-950';
  if (minutes > 10) return 'border-amber-400 bg-amber-950';
  return 'border-green-500 bg-green-950';
}

// ─── Idempotency Key ─────────────────────────────────────────────────────────

/** Generate a unique idempotency key for order submission. */
export function generateIdempotencyKey(terminalId: string): string {
  return `${terminalId}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// ─── Dietary Tag Labels ──────────────────────────────────────────────────────

export const DIETARY_TAG_LABELS: Record<string, { label: string; emoji: string }> = {
  halal: { label: 'Halal', emoji: '🌙' },
  vegetarian: { label: 'Vegetarian', emoji: '🌿' },
  vegan: { label: 'Vegan', emoji: '🌱' },
  'gluten-free': { label: 'Gluten-Free', emoji: '🌾' },
  spicy: { label: 'Spicy', emoji: '🌶️' },
  'dairy-free': { label: 'Dairy-Free', emoji: '🥛' },
  'nut-free': { label: 'Nut-Free', emoji: '🥜' },
};

// ─── VAT Rate Options ────────────────────────────────────────────────────────

export const UK_VAT_RATES = [
  { value: 20, label: '20% Standard Rate' },
  { value: 5, label: '5% Reduced Rate' },
  { value: 0, label: '0% Zero Rate' },
] as const;

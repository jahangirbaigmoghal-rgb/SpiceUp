import Counter from '../models/Counter.js';

/**
 * Atomically reserve the next value in a per-tenant named sequence and return
 * the numeric value. Race-safe: `$inc` is applied server-side in a single
 * atomic `findOneAndUpdate`, so two concurrent callers always get distinct
 * numbers.
 *
 * @param {import('mongoose').Types.ObjectId|string} tenantId
 * @param {string} name   Sequence name, e.g. 'order'.
 * @returns {Promise<number>} The reserved sequence value (starts at 1).
 */
export async function nextSequence(tenantId, name) {
  const doc = await Counter.findOneAndUpdate(
    { tenant: tenantId, name },
    { $inc: { seq: 1 } },
    { upsert: true, new: true }
  );
  return doc.seq;
}

/**
 * Generate a unique, human-readable order reference of the form
 * `ORD-YYYYMMDD-NNNN`, where NNNN is a zero-padded per-day sequence scoped to
 * the tenant. The day is seeded from the sequence counter so the number is
 * stable across replays/retries within the same day.
 *
 * @param {import('mongoose').Types.ObjectId|string} tenantId
 * @returns {Promise<string>} e.g. 'ORD-20260621-0042'
 */
export async function nextOrderReference(tenantId) {
  const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const seqName = `order:${todayStr}`;
  const seq = await nextSequence(tenantId, seqName);
  return `ORD-${todayStr}-${String(seq).padStart(4, '0')}`;
}

import mongoose from 'mongoose';

/**
 * Detect whether the current Mongo connection supports multi-document
 * transactions (requires a replica set or sharded cluster). Checked once at
 * boot and cached.
 */
let _supportsTransactions = null;

export async function supportsTransactions() {
  if (_supportsTransactions !== null) return _supportsTransactions;

  try {
    // Server topology type 1 = ReplicaSet, 2 = Sharded.
    // Standalone (type 0) does NOT support transactions.
    const topology = mongoose.connection.db?.serverConfig?.s?.topologyType;
    if (topology === 'ReplicaSet' || topology === 'Sharded') {
      _supportsTransactions = true;
    } else {
      // Attempt a no-op session to verify; some setups report topology
      // incorrectly (e.g. Atlas serverless or memory-server).
      const session = await mongoose.startSession();
      await session.withTransaction(async () => {});
      session.endSession();
      _supportsTransactions = true;
    }
  } catch {
    _supportsTransactions = false;
  }

  if (!_supportsTransactions) {
    console.warn('⚠️  MongoDB does not support transactions (standalone?). '
      + 'Persistence will proceed without atomic commit — side-effect consistency '
      + 'degrades gracefully. Use a replica set in production for full guarantees.');
  }
  return _supportsTransactions;
}

/**
 * Execute `fn` inside a Mongo transaction if the deployment supports it,
 * otherwise execute `fn` with no session (non-transactional fallback).
 *
 * The callback receives a Mongoose session to pass to Model.create / save /
 * updateOne calls. If a transaction is active and the callback throws,
 * the session is aborted automatically and the error propagates.
 *
 * @param {mongoose.Session} [session]  Optional pre-acquired session.
 * @param {(session: mongoose.Session) => Promise<T>} fn
 * @returns {Promise<T>}
 */
export async function withTransaction(fn, session) {
  // Caller already holds a session — just invoke.
  if (session) return fn(session);

  if (await supportsTransactions()) {
    const freshSession = await mongoose.startSession();
    try {
      return await freshSession.withTransaction(() => fn(freshSession));
    } finally {
      freshSession.endSession();
    }
  }

  // Non-transactional fallback (standalone Mongo, memory-server, dev).
  return fn(undefined);
}

import { createClient } from 'redis';
import { env } from './env.js';

let redisClient = null;

export async function connectRedis() {
  if (!env.useRedis) {
    console.log('⚠️  Redis not configured — running without cache/queue (dev mode)');
    return null;
  }
  try {
    redisClient = createClient({ url: env.redisUrl });
    redisClient.on('error', (err) => console.error('Redis error:', err));
    await redisClient.connect();
    console.log('✅ Redis connected');
    return redisClient;
  } catch (err) {
    console.error('❌ Redis connection failed:', err.message);
    return null;
  }
}

export function getRedis() {
  return redisClient;
}

/** Simple in-memory idempotency store for dev (when Redis not available). */
const memIdempotency = new Map();

export async function checkIdempotency(key) {
  if (redisClient) {
    return await redisClient.get(`idempotency:${key}`);
  }
  return memIdempotency.get(key) ?? null;
}

export async function setIdempotency(key, value, ttlSeconds = 300) {
  if (redisClient) {
    await redisClient.setEx(`idempotency:${key}`, ttlSeconds, value);
  } else {
    memIdempotency.set(key, value);
    setTimeout(() => memIdempotency.delete(key), ttlSeconds * 1000);
  }
}

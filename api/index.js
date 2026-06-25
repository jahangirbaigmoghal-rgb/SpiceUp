import { app } from '@spiceup/server/app';
import { connectDb } from '@spiceup/server/db';
import { seedIfEmpty, repairDefaultUserPins, ensureAdminExists } from '@spiceup/server/seed';

let ready;
let error;

async function ensureReady() {
  if (!ready && !error) {
    try {
      ready = connectDb().then(async () => {
        await seedIfEmpty();
        await repairDefaultUserPins();
        await ensureAdminExists();
        console.log('✅ Seed complete — server ready');
      });
      await ready;
    } catch (err) {
      error = err;
      console.error('❌ Server init failed:', err);
    }
  }
  if (error) throw error;
}

export default async function handler(req, res) {
  try {
    await ensureReady();
    return app(req, res);
  } catch (err) {
    console.error('❌ Handler error:', err);
    return res.status(500).json({
      error: true,
      message: err.message,
      stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
    });
  }
}

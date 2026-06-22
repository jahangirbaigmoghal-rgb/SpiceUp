import { app } from '../server/src/app.js';
import { connectDb } from '../server/src/config/db.js';
import { seedIfEmpty, repairDefaultUserPins, ensureAdminExists } from '../server/src/seed_spiceup.js';
// force vercel cache invalidate 1


let ready;

async function ensureReady() {
  if (!ready) {
    ready = connectDb().then(async () => {
      await seedIfEmpty();
      await repairDefaultUserPins();
      await ensureAdminExists();
    });
  }
  return ready;
}

export default async function handler(req, res) {
  await ensureReady();
  return app(req, res);
}

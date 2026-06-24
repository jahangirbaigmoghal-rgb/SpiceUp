import { app } from '@spiceup/server/app';
import { connectDb } from '@spiceup/server/db';
import { seedIfEmpty, repairDefaultUserPins, ensureAdminExists } from '@spiceup/server/seed';

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

import { app } from '../server/src/app.js';
import { connectDb } from '../server/src/config/db.js';
import { seedIfEmpty } from '../server/src/seed.js';

let ready;

async function ensureReady() {
  if (!ready) {
    ready = connectDb().then(seedIfEmpty);
  }
  return ready;
}

export default async function handler(req, res) {
  await ensureReady();
  return app(req, res);
}

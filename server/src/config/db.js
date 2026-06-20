import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { env } from './env.js';

let memoryServer;

export async function connectDb() {
  const uri = env.useMemoryDb ? await getMemoryUri() : env.mongoUri;
  mongoose.set('strictQuery', true);
  const options = env.useMemoryDb ? {} : { dbName: 'takeawaypos' };
  await mongoose.connect(uri, options);
  console.log(`✅ MongoDB connected: ${env.useMemoryDb ? 'in-memory (dev)' : uri.split('@').pop()} [DB: takeawaypos]`);
}

async function getMemoryUri() {
  memoryServer = await MongoMemoryServer.create({ instance: { dbName: 'takeaway_pos_dev' } });
  return memoryServer.getUri();
}

export async function disconnectDb() {
  await mongoose.disconnect();
  if (memoryServer) await memoryServer.stop();
}

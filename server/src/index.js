import http from 'http';
import { app } from './app.js';
import { connectDb } from './config/db.js';
import { connectRedis } from './config/redis.js';
import { initSocket } from './config/socket.js';
import { env } from './config/env.js';

async function bootstrap() {
  try {
    // Connect to databases
    await connectDb();
    const { seedIfEmpty, repairDefaultUserPins, ensureAdminExists } = await import('./seed.js');
    await seedIfEmpty();
    await repairDefaultUserPins();  // Fix any corrupted PINs from the old double-hash bug
    await ensureAdminExists();
    await connectRedis();

    // Create HTTP server + attach Socket.io
    const httpServer = http.createServer(app);
    initSocket(httpServer);

    httpServer.listen(env.port, () => {
      console.log(`\n🚀 TakeawayPOS Pro Server running on port ${env.port}`);
      console.log(`   Environment: ${env.nodeEnv}`);
      console.log(`   API: http://localhost:${env.port}/api/health`);
      console.log(`   Socket.io: ws://localhost:${env.port}\n`);
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
}

bootstrap();

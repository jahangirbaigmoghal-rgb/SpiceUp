// Thin re-export so Vercel's bundler has a stable api/index.js entry point.
// The real handler (with DB connect + seed) lives in server/src/app.js so it
// works whether Vercel uses this file or auto-discovers app.js directly.
export { default } from '../server/src/app.js';

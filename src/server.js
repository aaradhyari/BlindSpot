/**
 * Blindspot — Server entry point
 */
import app from './app.js';
import env, { validateEnvironment } from './config/environment.js';

// Validate environment variables
validateEnvironment();

const server = app.listen(env.PORT, () => {
  console.log(`
┌─────────────────────────────────────────────────────────────┐
│                      BLINDSPOT SAAS                         │
│         Supply Chain Bottleneck Detection Engine            │
├─────────────────────────────────────────────────────────────┤
│  • Web Application : http://localhost:${env.PORT}                │
│  • Public API      : http://localhost:${env.PORT}/api/public/dashboard │
│  • Environment     : ${env.NODE_ENV.padEnd(36)} │
└─────────────────────────────────────────────────────────────┘
  `);
});

// Graceful shutdown handling
function gracefulShutdown(signal) {
  console.log(`\n[server] Received ${signal}. Shutting down gracefully...`);
  server.close(() => {
    console.log('[server] HTTP server closed.');
    process.exit(0);
  });

  // Force close after 10 seconds if hanging
  setTimeout(() => {
    console.error('[server] Forcefully shutting down after timeout.');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export default server;

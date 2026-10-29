/**
 * Blindspot — Express application setup
 */
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';

import env from './config/environment.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';

// Route imports
import authRoutes from './routes/auth.routes.js';
import publicRoutes from './routes/public.routes.js';
import packageRoutes from './routes/package.routes.js';
import workflowRoutes from './routes/workflow.routes.js';
import employeeRoutes from './routes/employee.routes.js';
import reportRoutes from './routes/report.routes.js';
import actionRoutes from './routes/action.routes.js';
import settingsRoutes from './routes/settings.routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const app = express();

// Security headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          'https://www.gstatic.com',
          'https://apis.google.com',
          'https://cdn.jsdelivr.net',
        ],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          'https://fonts.googleapis.com',
        ],
        fontSrc: [
          "'self'",
          'https://fonts.gstatic.com',
          'data:',
        ],
        imgSrc: [
          "'self'",
          'data:',
          'blob:',
          'https:',
        ],
        connectSrc: [
          "'self'",
          'https://*.firebaseio.com',
          'https://*.googleapis.com',
          'https://identitytoolkit.googleapis.com',
          'https://securetoken.googleapis.com',
        ],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: env.isProd ? [] : null,
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

// Compression
app.use(compression());

// CORS
app.use(
  cors({
    origin: env.ALLOWED_ORIGIN,
    credentials: true,
  })
);

// Body and cookie parsing
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());

// Static file serving
app.use(express.static(path.join(rootDir, 'public')));

// Public client Firebase configuration endpoint
app.get('/api/config', (req, res) => {
  res.json({
    firebase: {
      apiKey: env.FIREBASE_WEB_API_KEY,
      authDomain: env.FIREBASE_WEB_AUTH_DOMAIN,
      projectId: env.FIREBASE_WEB_PROJECT_ID,
      storageBucket: env.FIREBASE_WEB_STORAGE_BUCKET,
      messagingSenderId: env.FIREBASE_WEB_MESSAGING_SENDER_ID,
      appId: env.FIREBASE_WEB_APP_ID,
    },
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

import fs from 'node:fs';

// HTML View routes
const viewsDir = path.join(rootDir, 'views');
const wrapInViewShell = (raw) => {
  const mainMatch = raw.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  if (!mainMatch) return null;

  const shellPath = path.join(viewsDir, 'shell.html');
  if (!fs.existsSync(shellPath)) return null;
  const shell = fs.readFileSync(shellPath, 'utf8');

  const titleMatch = raw.match(/<title>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : 'Blindspot';

  // Remove scripts and stray toast containers from the captured content
  let content = mainMatch[1]
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<div id="toast-container"[^>]*>[\s\S]*?<\/div>/gi, '');

  const scripts = (raw.match(/<script\b[^>]*>[\s\S]*?<\/script>/gi) || []).join('\n');

  return shell
    .replace('{{TITLE}}', title)
    .replace('{{CONTENT}}', content)
    .replace('{{SCRIPTS}}', scripts);
};

const sendView = (viewName) => (req, res, next) => {
  const targetPath = fs.existsSync(path.join(viewsDir, viewName))
    ? path.join(viewsDir, viewName)
    : path.join(process.cwd(), 'views', viewName);

  try {
    const raw = fs.readFileSync(targetPath, 'utf8');

    // Public board (dashboard) keeps its bespoke layout; other pages use the shared shell.
    const useShell = viewName !== 'dashboard.html' && viewName !== 'login.html';
    const wrapped = useShell ? wrapInViewShell(raw) : null;

    if (wrapped) {
      res.type('html').send(wrapped);
    } else {
      res.type('html').send(raw);
    }
  } catch (err) {
    console.error(`[views] Failed to send ${viewName}:`, err.message);
    next(err);
  }
};

app.get('/', sendView('dashboard.html'));
app.get('/login', sendView('login.html'));
app.get('/admin', sendView('admin.html'));
app.get('/confirm', sendView('confirm.html'));
app.get('/pack', sendView('pack.html'));
app.get('/doc', sendView('doc.html'));
app.get('/del', sendView('del.html'));
app.get('/packages/:id', sendView('package-details.html'));
app.get('/package-details', sendView('package-details.html'));
app.get('/employees', sendView('employees.html'));
app.get('/reports', sendView('reports.html'));
app.get('/actions', sendView('actions.html'));
app.get('/settings', sendView('settings.html'));
app.get('/access-denied', sendView('access-denied.html'));

// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/packages', packageRoutes);
app.use('/api/workflow', workflowRoutes);
app.use('/api/admin/employees', employeeRoutes);
app.use('/api/admin/reports', reportRoutes);
app.use('/api/admin/actions', actionRoutes);
app.use('/api/admin/settings', settingsRoutes);

// Catch-all 404 handler
app.use(notFoundHandler);

// Central error handler
app.use(errorHandler);

export default app;

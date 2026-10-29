/**
 * Blindspot — Global error handler middleware
 */

/**
 * Central error handler — catches unhandled errors in route handlers.
 * Never leaks stack traces or internal details in production.
 */
export function errorHandler(err, req, res, _next) {
  const status = err.status || err.statusCode || 500;
  const isDev = process.env.NODE_ENV !== 'production';

  // Log full error in dev; minimal in prod
  if (status >= 500) {
    console.error('[error]', err);
  } else if (isDev) {
    console.warn('[error]', err.message);
  }

  res.status(status).json({
    error: status >= 500
      ? 'An internal error occurred. Please try again later.'
      : err.message || 'Request failed.',
    ...(isDev && status >= 500 ? { stack: err.stack } : {}),
  });
}

import path from 'node:path';
import fs from 'node:fs';

/**
 * 404 handler for unmatched routes.
 */
export function notFoundHandler(req, res) {
  if (req.accepts('html')) {
    const viewsDir = path.join(process.cwd(), 'views');
    if (fs.existsSync(path.join(viewsDir, 'not-found.html'))) {
      return res.status(404).sendFile('not-found.html', { root: viewsDir }, (err) => {
        if (err) res.status(404).send('404 Not Found');
      });
    }
  }
  res.status(404).json({ error: 'Resource not found.' });
}

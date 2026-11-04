import cookieParser from 'cookie-parser';
import express from 'express';
import helmet from 'helmet';
import { ensureDb } from './middleware/ensureDb.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { sameOriginOnly } from './middleware/sameOriginOnly.js';
import authRoutes from './routes/auth.routes.js';
import budgetRoutes from './routes/budgets.routes.js';
import categoryRoutes from './routes/categories.routes.js';
import exportRoutes from './routes/export.routes.js';
import healthRoutes from './routes/health.routes.js';
import reportRoutes from './routes/reports.routes.js';
import summaryRoutes from './routes/summary.routes.js';
import transactionRoutes from './routes/transactions.routes.js';

// Builds the Express app without starting a server, so the same app can be
// used by app.listen() locally, by Vercel in production, and by tests.
const app = express();

// Vercel (and most hosts) sit behind a proxy. This makes req.ip the real
// client IP, which rate limiting relies on.
app.set('trust proxy', 1);

app.use(helmet());
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

// Financial data must never be stored by browser or proxy caches.
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});
app.use('/api', sameOriginOnly);

app.use('/api/health', healthRoutes);

// Every route registered below this line gets a ready database connection.
app.use('/api', ensureDb);
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/summary', summaryRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/export', exportRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;

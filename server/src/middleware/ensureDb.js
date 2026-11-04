import { connectDB } from '../config/db.js';
import { AppError } from '../utils/AppError.js';

// Makes sure the database connection is ready before any route touches it.
// Needed for serverless, where a fresh instance starts with no connection.
export async function ensureDb(req, res, next) {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error('Database connection failed:', err.message);
    next(new AppError(503, 'The database is temporarily unavailable. Please try again shortly.'));
  }
}

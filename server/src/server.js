// Local development entry point. (In production on Vercel, api/index.js is used.)
import app from './app.js';
import { connectDB } from './config/db.js';
import { env } from './config/env.js';

try {
  await connectDB();
  console.log('Connected to MongoDB');
} catch (err) {
  console.error('Could not connect to MongoDB:', err.message);
  console.error('The API will still start; GET /api/health will report the problem.');
}

app.listen(env.PORT, () => {
  console.log(`API running at http://localhost:${env.PORT}`);
});

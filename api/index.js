// Vercel entry point. Vercel turns this file into a Serverless Function and
// vercel.json rewrites every /api/* request here. An Express app is itself a
// (req, res) handler, so we simply export it. Locally, server/src/server.js
// runs the same app with app.listen() instead.
import app from '../server/src/app.js';

export default app;

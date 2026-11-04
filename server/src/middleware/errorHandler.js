import { AppError } from '../utils/AppError.js';

export function notFound(req, res, next) {
  next(new AppError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

// Express recognises an error handler by its four arguments.
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  let error = err;

  // Errors thrown by express.json()
  if (err.type === 'entity.parse.failed') {
    error = new AppError(400, 'Request body is not valid JSON.');
  } else if (err.type === 'entity.too.large') {
    error = new AppError(413, 'Request body is too large.');
  }

  const isKnown = error instanceof AppError;
  const status = isKnown ? error.statusCode : 500;

  if (!isKnown) {
    // Full details stay in the server logs (Vercel → Logs), never in the response.
    console.error(err);
  }

  res.status(status).json({
    error: {
      message: isKnown ? error.message : 'Something went wrong. Please try again.',
      ...(isKnown && error.details && { details: error.details }),
    },
  });
}

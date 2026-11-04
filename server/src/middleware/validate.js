import { AppError } from '../utils/AppError.js';

// Validates request parts against Zod schemas: validate({ body, query, params }).
// Controllers read the cleaned values from req.valid.body / .query / .params.
// Unknown fields are removed and values are converted to the expected types.
export function validate(schemas) {
  return (req, res, next) => {
    req.valid = {};
    const details = [];

    for (const part of ['params', 'query', 'body']) {
      const schema = schemas[part];
      if (!schema) continue;

      if (part === 'body' && req.body === undefined) {
        throw new AppError(415, 'Send the request body as JSON (Content-Type: application/json).');
      }

      const result = schema.safeParse(req[part]);
      if (result.success) {
        req.valid[part] = result.data;
      } else {
        for (const issue of result.error.issues) {
          details.push({ field: issue.path.join('.') || part, message: issue.message });
        }
      }
    }

    if (details.length > 0) {
      throw new AppError(400, 'Please check the highlighted fields.', details);
    }
    next();
  };
}

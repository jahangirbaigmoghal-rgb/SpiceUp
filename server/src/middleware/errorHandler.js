export function notFound(req, res) {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` });
}

export function errorHandler(err, req, res, _next) {
  const statusCode = err.status ?? err.statusCode ?? 500;
  const isDev = process.env.NODE_ENV !== 'production';

  if (statusCode >= 500) {
    console.error(`❌ [${req.method} ${req.path}]`, err);
  }

  // Mongoose validation errors → 400
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ error: 'Validation failed', errors });
  }

  // Mongoose duplicate key → 409
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue ?? {})[0] ?? 'field';
    return res.status(409).json({ error: `Duplicate value for ${field}` });
  }

  // Zod validation errors → 400
  if (err.name === 'ZodError') {
    return res.status(400).json({
      error: 'Validation failed',
      errors: err.errors.map((e) => ({ field: e.path.join('.'), message: e.message })),
    });
  }

  res.status(statusCode).json({
    error: err.message ?? 'Internal server error',
    ...(isDev && { stack: err.stack }),
  });
}

// Global error handler — catches anything thrown/passed via next(err)
// Must have 4 params for Express to recognize it as error handler
export function errorHandler(err, req, res, next) {
  console.error('❌  Unhandled error:', err);

  const status = err.status || 500;
  const message = err.message || 'Internal server error';

  res.status(status).json({ data: null, error: message });
}
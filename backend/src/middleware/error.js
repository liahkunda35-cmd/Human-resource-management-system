export function errorHandler(err, _req, res, _next) {
  console.error('[api]', err.message)
  const status = err.status || 500
  const message =
    status >= 500
      ? 'An unexpected server error occurred.'
      : err.message || 'Request failed.'
  res.status(status).json({
    error: message,
    code: err.code || undefined,
  })
}

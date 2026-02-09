export default function errorHandler(err, req, res, _next) {
  console.error(err.stack || err.message);

  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: err.message });
  }

  if (err.code === 11000) {
    return res.status(409).json({ error: 'Duplicate entry' });
  }

  if (err.name === 'ZodError') {
    return res.status(400).json({
      error: 'Validation failed',
      details: err.errors,
    });
  }

  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
}

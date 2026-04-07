const express = require('express');
const amazonRouter = require('./routes/amazon');
const diagnosticRouter = require('./routes/diagnostic');
const { logger } = require('./utils/logger');

const app = express();
app.use(express.json({ limit: '2mb' }));

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'amazon-scraper-dynamic' });
});

app.use('/amazon', amazonRouter);
app.use('/diagnostic', diagnosticRouter);

app.use((err, _req, res, _next) => {
  logger.error('Unhandled error', { message: err.message, stack: err.stack });
  res.status(500).json({
    ok: false,
    error: err.message || 'Internal server error'
  });
});

const port = Number(process.env.PORT || 3000);
app.listen(port, () => {
  logger.info(`Server listening on port ${port}`);
});

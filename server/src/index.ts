import express from 'express';
import { pool } from './db.js';

const app = express();
const port = 4000;

app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));

app.get('/', (_request, response) => {
  response.json({
    message: 'Welcome to the BookNest API',
  });
});

app.get('/api/health', (_request, response) => {
  response.json({
    status: 'ok',
    message: 'BookNest backend is running',
  });
});

app.get('/api/db-health', async (_request, response) => {
  try {
    const result = await pool.query<{
      database: string;
      server_time: Date;
    }>(
      `SELECT
        current_database() AS database,
        CURRENT_TIMESTAMP AS server_time`,
    );

    const row = result.rows[0];

    response.json({
      status: 'ok',
      message: 'PostgreSQL connected successfully',
      database: row.database,
      serverTime: row.server_time,
    });
  } catch (error) {
    console.error(
      'Database check failed:',
      error instanceof Error ? error.message : 'Unknown error',
    );

    response.status(503).json({
      status: 'error',
      message: 'Database connection failed. Check the backend terminal.',
    });
  }
});

app.use((_request, response) => {
  response.status(404).json({
    message: 'API route not found',
  });
});

app.listen(port, '127.0.0.1', () => {
  console.log(`BookNest API: http://localhost:${port}`);
});
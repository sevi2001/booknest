import express from 'express';

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

app.use((_request, response) => {
  response.status(404).json({
    message: 'API route not found',
  });
});

app.listen(port, '127.0.0.1', () => {
  console.log(`BookNest API: http://localhost:${port}`);
});
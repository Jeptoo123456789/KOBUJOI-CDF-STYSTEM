import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const app = express();
const port = Number(process.env.PORT) || 3000;
const distDirectory = path.join(path.dirname(fileURLToPath(import.meta.url)), 'dist');

app.disable('x-powered-by');

app.get('/api/health', (_request, response) => {
  response.set('Cache-Control', 'no-store');
  response.status(200).json({ status: 'ok' });
});

app.use(express.static(distDirectory, { index: false }));
app.use('/api', (_request, response) => {
  response.status(404).json({ error: 'Not found' });
});
app.get('*', (_request, response) => {
  response.sendFile(path.join(distDirectory, 'index.html'));
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Kobujoi CDF server listening on port ${port}`);
});
import cors from 'cors';
import express from 'express';
import { getDataCounts, evaluateCharacter } from './character.js';

const app = express();
const PORT = Number(process.env.PORT ?? 3001);
app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, data: getDataCounts() });
});

app.post('/api/character/evaluate', (req, res) => {
  res.json(evaluateCharacter(req.body));
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});

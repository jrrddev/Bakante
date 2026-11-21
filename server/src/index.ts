import path from 'node:path';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import { BakanteDatabase } from './db.ts';
import { PROJECT_ROOT } from './paths.ts';
import { createApiRouter } from './routes.ts';

// Load .env from repo root or server directory
dotenv.config({ path: path.join(PROJECT_ROOT, '.env') });
dotenv.config();

const PORT = Number(process.env.PORT ?? 4000);
const tursoUrl = process.env.TURSO_DATABASE_URL?.trim();
const tursoAuthToken = process.env.TURSO_AUTH_TOKEN?.trim();

const db = tursoUrl
  ? new BakanteDatabase({ url: tursoUrl, authToken: tursoAuthToken })
  : new BakanteDatabase(':memory:');

// Seed in-memory schedule if running without Turso
if (!db.isTurso) {
  await db.resetToDemoSchedule();
}

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api', createApiRouter(db));

// Only bind a local port when running outside Vercel serverless functions
if (!process.env.VERCEL) {
  db.ensureInitialized()
    .then(() => {
      app.listen(PORT, () => {
        console.log(
          `Bakante API listening on http://localhost:${PORT} (storage: ${
            db.isTurso ? 'Turso LibSQL' : 'In-Memory'
          })`
        );
      });
    })
    .catch((err) => {
      console.error('Failed to initialize database:', err);
      process.exit(1);
    });
}

export default app;

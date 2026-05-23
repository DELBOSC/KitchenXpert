import path from 'path';
import dotenv from 'dotenv';

// MUST be imported first in src/index.ts (`import './config/load-env';`).
// Populates process.env from <repo>/.env BEFORE any module evaluates —
// notably jwt.service instantiates `new JWTService()` at module-eval time and
// reads JWT_ACCESS_SECRET in its constructor. Without this early load the
// backend crashes at boot. Monorepo convention: single .env at repo root (CLAUDE.md §3).
dotenv.config({ path: path.resolve(__dirname, '..', '..', '..', '..', '.env') });

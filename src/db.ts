import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'data.sqlite');

export const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');

type Migration = { id: string; run: (db: Database.Database) => void };

const migrations: Migration[] = [];

export function registerMigration(id: string, run: (db: Database.Database) => void) {
  migrations.push({ id, run });
}

export function applyMigrations() {
  db.exec(`CREATE TABLE IF NOT EXISTS migrations (id TEXT PRIMARY KEY, appliedAt TEXT NOT NULL);`);
  const applied = new Set(
    db.prepare('SELECT id FROM migrations ORDER BY appliedAt').all().map((row) => row.id as string)
  );
  const pending = migrations.filter((m) => !applied.has(m.id));
  db.transaction(() => {
    for (const m of pending) {
      m.run(db);
      db.prepare("INSERT INTO migrations (id, appliedAt) VALUES (?, datetime('now'))").run(m.id);
    }
  })();
}

export function ensureUuid(): string {
  return uuidv4();
}

export function initDataDir() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

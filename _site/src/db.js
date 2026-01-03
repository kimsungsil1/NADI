"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = void 0;
exports.registerMigration = registerMigration;
exports.applyMigrations = applyMigrations;
exports.ensureUuid = ensureUuid;
exports.initDataDir = initDataDir;
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const uuid_1 = require("uuid");
const DB_PATH = process.env.DB_PATH || path_1.default.join(process.cwd(), 'data.sqlite');
exports.db = new better_sqlite3_1.default(DB_PATH);
exports.db.pragma('journal_mode = WAL');
const migrations = [];
function registerMigration(id, run) {
    migrations.push({ id, run });
}
function applyMigrations() {
    exports.db.exec(`CREATE TABLE IF NOT EXISTS migrations (id TEXT PRIMARY KEY, appliedAt TEXT NOT NULL);`);
    const applied = new Set(exports.db.prepare('SELECT id FROM migrations ORDER BY appliedAt').all().map((row) => row.id));
    const pending = migrations.filter((m) => !applied.has(m.id));
    exports.db.transaction(() => {
        for (const m of pending) {
            m.run(exports.db);
            exports.db.prepare("INSERT INTO migrations (id, appliedAt) VALUES (?, datetime('now'))").run(m.id);
        }
    })();
}
function ensureUuid() {
    return (0, uuid_1.v4)();
}
function initDataDir() {
    const dir = path_1.default.dirname(DB_PATH);
    if (!fs_1.default.existsSync(dir)) {
        fs_1.default.mkdirSync(dir, { recursive: true });
    }
}

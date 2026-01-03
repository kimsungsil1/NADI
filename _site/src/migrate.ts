import { applyMigrations, initDataDir } from './db';
import './migrations/001_init';
import './migrations/002_seed';

initDataDir();
applyMigrations();
console.log('Migrations applied');

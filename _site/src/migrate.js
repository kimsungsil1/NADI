"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("./db");
require("./migrations/001_init");
require("./migrations/002_seed");
(0, db_1.initDataDir)();
(0, db_1.applyMigrations)();
console.log('Migrations applied');

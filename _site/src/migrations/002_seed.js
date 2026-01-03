"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("../db");
(0, db_1.registerMigration)('002_seed_topups', (db) => {
    const existing = db.prepare('SELECT COUNT(1) as c FROM topup_products').get();
    if (existing.c === 0) {
        const stmt = db.prepare('INSERT INTO topup_products (id, name, paidAmount, bonusRate, active) VALUES (?, ?, ?, ?, 1)');
        stmt.run((0, db_1.ensureUuid)(), '300,000원 충전 +10%', 300000, 0.1);
        stmt.run((0, db_1.ensureUuid)(), '500,000원 충전 +15%', 500000, 0.15);
        stmt.run((0, db_1.ensureUuid)(), '1,000,000원 충전 +20%', 1000000, 0.2);
    }
});
(0, db_1.registerMigration)('002_seed_services', (db) => {
    const existing = db.prepare('SELECT COUNT(1) as c FROM services').get();
    if (existing.c === 0) {
        const stmt = db.prepare('INSERT INTO services (id, name, price, durationMin, active) VALUES (?, ?, ?, ?, 1)');
        stmt.run((0, db_1.ensureUuid)(), '속눈썹 클래식', 70000, 60);
        stmt.run((0, db_1.ensureUuid)(), '속눈썹 볼륨', 90000, 75);
        stmt.run((0, db_1.ensureUuid)(), '눈썹 디자인', 80000, 50);
    }
});

import { registerMigration, ensureUuid } from '../db';

registerMigration('002_seed_topups', (db) => {
  const existing = db.prepare('SELECT COUNT(1) as c FROM topup_products').get() as { c: number };
  if (existing.c === 0) {
    const stmt = db.prepare(
      'INSERT INTO topup_products (id, name, paidAmount, bonusRate, active) VALUES (?, ?, ?, ?, 1)'
    );
    stmt.run(ensureUuid(), '300,000원 충전 +10%', 300000, 0.1);
    stmt.run(ensureUuid(), '500,000원 충전 +15%', 500000, 0.15);
    stmt.run(ensureUuid(), '1,000,000원 충전 +20%', 1000000, 0.2);
  }
});

registerMigration('002_seed_services', (db) => {
  const existing = db.prepare('SELECT COUNT(1) as c FROM services').get() as { c: number };
  if (existing.c === 0) {
    const stmt = db.prepare(
      'INSERT INTO services (id, name, price, durationMin, active) VALUES (?, ?, ?, ?, 1)'
    );
    stmt.run(ensureUuid(), '속눈썹 클래식', 70000, 60);
    stmt.run(ensureUuid(), '속눈썹 볼륨', 90000, 75);
    stmt.run(ensureUuid(), '눈썹 디자인', 80000, 50);
  }
});

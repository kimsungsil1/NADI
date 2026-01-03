"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("../db");
(0, db_1.registerMigration)('001_init', (db) => {
    db.exec(`
    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT NOT NULL UNIQUE,
      createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS services (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      price INTEGER NOT NULL,
      durationMin INTEGER NOT NULL,
      active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS availability_slots (
      id TEXT PRIMARY KEY,
      startsAt TEXT NOT NULL,
      endsAt TEXT NOT NULL,
      capacity INTEGER NOT NULL DEFAULT 1,
      active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id TEXT PRIMARY KEY,
      customerId TEXT NOT NULL,
      serviceId TEXT NOT NULL,
      startsAt TEXT NOT NULL,
      status TEXT NOT NULL,
      paymentMethod TEXT,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(customerId) REFERENCES customers(id),
      FOREIGN KEY(serviceId) REFERENCES services(id)
    );

    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      provider TEXT NOT NULL,
      orderId TEXT NOT NULL,
      amount INTEGER NOT NULL,
      status TEXT NOT NULL,
      type TEXT NOT NULL,
      bookingId TEXT,
      customerId TEXT NOT NULL,
      rawPayloadJson TEXT,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(orderId)
    );

    CREATE TABLE IF NOT EXISTS wallets (
      id TEXT PRIMARY KEY,
      customerId TEXT NOT NULL UNIQUE,
      balance INTEGER NOT NULL DEFAULT 0,
      updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(customerId) REFERENCES customers(id)
    );

    CREATE TABLE IF NOT EXISTS wallet_ledger (
      id TEXT PRIMARY KEY,
      walletId TEXT NOT NULL,
      type TEXT NOT NULL,
      amountSigned INTEGER NOT NULL,
      referenceType TEXT,
      referenceId TEXT,
      note TEXT,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(walletId) REFERENCES wallets(id)
    );

    CREATE TABLE IF NOT EXISTS topup_products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      paidAmount INTEGER NOT NULL,
      bonusRate REAL NOT NULL,
      active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS gift_cards (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      initialAmount INTEGER NOT NULL,
      balance INTEGER NOT NULL,
      status TEXT NOT NULL,
      issuedPaymentId TEXT,
      expiresAt TEXT,
      createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS gift_card_redemptions (
      id TEXT PRIMARY KEY,
      giftCardId TEXT NOT NULL,
      walletId TEXT NOT NULL,
      amountUsed INTEGER NOT NULL,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(giftCardId) REFERENCES gift_cards(id),
      FOREIGN KEY(walletId) REFERENCES wallets(id)
    );

    CREATE TABLE IF NOT EXISTS ai_results (
      id TEXT PRIMARY KEY,
      bookingId TEXT,
      customerId TEXT,
      prompt TEXT NOT NULL,
      resultJson TEXT NOT NULL,
      imagePath TEXT,
      createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS idempotency_keys (
      key TEXT PRIMARY KEY,
      createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
});

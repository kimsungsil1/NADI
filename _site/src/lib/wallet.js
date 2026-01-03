"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOrCreateWallet = getOrCreateWallet;
exports.addLedger = addLedger;
exports.ensureIdempotent = ensureIdempotent;
const db_1 = require("../db");
function getOrCreateWallet(customerId) {
    let wallet = db_1.db.prepare('SELECT * FROM wallets WHERE customerId = ?').get(customerId);
    if (!wallet) {
        const id = (0, db_1.ensureUuid)();
        db_1.db.prepare('INSERT INTO wallets (id, customerId, balance) VALUES (?, ?, 0)').run(id, customerId);
        wallet = db_1.db.prepare('SELECT * FROM wallets WHERE id = ?').get(id);
    }
    return wallet;
}
function addLedger(walletId, type, amountSigned, referenceType, referenceId, note) {
    const id = (0, db_1.ensureUuid)();
    db_1.db.transaction(() => {
        db_1.db.prepare('INSERT INTO wallet_ledger (id, walletId, type, amountSigned, referenceType, referenceId, note) VALUES (?, ?, ?, ?, ?, ?, ?)').run(id, walletId, type, amountSigned, referenceType, referenceId, note);
        db_1.db.prepare('UPDATE wallets SET balance = balance + ?, updatedAt = datetime("now") WHERE id = ?').run(amountSigned, walletId);
    })();
    return db_1.db.prepare('SELECT * FROM wallet_ledger WHERE id = ?').get(id);
}
function ensureIdempotent(key) {
    const exists = db_1.db.prepare('SELECT key FROM idempotency_keys WHERE key = ?').get(key);
    if (exists)
        return false;
    db_1.db.prepare('INSERT INTO idempotency_keys (key) VALUES (?)').run(key);
    return true;
}

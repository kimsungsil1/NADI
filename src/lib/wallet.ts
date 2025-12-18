import { db, ensureUuid } from '../db';

type LedgerType =
  | 'TOPUP_BONUS'
  | 'TOPUP_PAID'
  | 'BOOKING_DEBIT'
  | 'GIFTCARD_CREDIT'
  | 'REFUND'
  | 'ADJUSTMENT';

export function getOrCreateWallet(customerId: string) {
  let wallet = db.prepare('SELECT * FROM wallets WHERE customerId = ?').get(customerId);
  if (!wallet) {
    const id = ensureUuid();
    db.prepare('INSERT INTO wallets (id, customerId, balance) VALUES (?, ?, 0)').run(id, customerId);
    wallet = db.prepare('SELECT * FROM wallets WHERE id = ?').get(id);
  }
  return wallet as any;
}

export function addLedger(walletId: string, type: LedgerType, amountSigned: number, referenceType?: string, referenceId?: string, note?: string) {
  const id = ensureUuid();
  db.transaction(() => {
    db.prepare(
      'INSERT INTO wallet_ledger (id, walletId, type, amountSigned, referenceType, referenceId, note) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(id, walletId, type, amountSigned, referenceType, referenceId, note);
    db.prepare('UPDATE wallets SET balance = balance + ?, updatedAt = datetime("now") WHERE id = ?').run(
      amountSigned,
      walletId
    );
  })();
  return db.prepare('SELECT * FROM wallet_ledger WHERE id = ?').get(id);
}

export function ensureIdempotent(key: string) {
  const exists = db.prepare('SELECT key FROM idempotency_keys WHERE key = ?').get(key);
  if (exists) return false;
  db.prepare('INSERT INTO idempotency_keys (key) VALUES (?)').run(key);
  return true;
}

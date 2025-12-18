import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { config } from 'dotenv';
import { db, applyMigrations, initDataDir, ensureUuid } from './db';
import './migrations/001_init';
import './migrations/002_seed';
import { TossProvider } from './lib/tossProvider';
import { addLedger, ensureIdempotent, getOrCreateWallet } from './lib/wallet';

config();
initDataDir();
applyMigrations();
cleanupUploads();

const app = express();
const upload = multer({
  dest: path.join(process.cwd(), 'uploads'),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!['image/jpeg', 'image/png'].includes(file.mimetype)) {
      return cb(new Error('Only jpg/png allowed'));
    }
    cb(null, true);
  },
});

const allowedOrigin = process.env.CORS_ORIGIN?.split(',') || ['*'];
app.use(cors({ origin: allowedOrigin, credentials: true }));
app.use(express.json());
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

const tossProvider = new TossProvider(process.env.TOSS_SECRET_KEY || '', process.env.TOSS_CLIENT_KEY);
const retentionDays = Number(process.env.RETENTION_DAYS || 30);

function cleanupUploads() {
  const dir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(dir)) return;
  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  for (const file of fs.readdirSync(dir)) {
    const p = path.join(dir, file);
    const stat = fs.statSync(p);
    if (stat.mtimeMs < cutoff) {
      fs.unlinkSync(p);
    }
  }
}
setInterval(cleanupUploads, 24 * 60 * 60 * 1000);

function ensureAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const pass = req.headers['x-admin-password'];
  if (pass !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  next();
}

// Customers lookup
app.post('/api/customers/lookup', (req, res) => {
  const { phone, name } = req.body;
  if (!phone) return res.status(400).json({ error: 'phone required' });
  let customer = db.prepare('SELECT * FROM customers WHERE phone = ?').get(phone);
  if (!customer) {
    const id = ensureUuid();
    db.prepare('INSERT INTO customers (id, name, phone) VALUES (?, ?, ?)').run(id, name || '고객', phone);
    customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
  }
  res.json(customer);
});

// Services
app.get('/api/services', (_req, res) => {
  const rows = db.prepare('SELECT * FROM services WHERE active = 1').all();
  res.json(rows);
});

// Availability
app.get('/api/availability', (req, res) => {
  const { date } = req.query;
  if (!date) return res.status(400).json({ error: 'date required' });
  const rows = db
    .prepare('SELECT * FROM availability_slots WHERE active = 1 AND date(startsAt) = date(?)')
    .all(date as string);
  res.json(rows);
});

// Bookings create
app.post('/api/bookings', (req, res) => {
  const { customerId, serviceId, startsAt, paymentMethod } = req.body;
  if (!customerId || !serviceId || !startsAt) return res.status(400).json({ error: 'missing fields' });
  const id = ensureUuid();
  db.prepare(
    'INSERT INTO bookings (id, customerId, serviceId, startsAt, status, paymentMethod) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(id, customerId, serviceId, startsAt, 'PENDING', paymentMethod || null);
  res.json(db.prepare('SELECT * FROM bookings WHERE id = ?').get(id));
});

app.get('/api/bookings/:id', (req, res) => {
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
  if (!booking) return res.status(404).json({ error: 'not found' });
  res.json(booking);
});

app.post('/api/bookings/:id/pay-with-wallet', (req, res) => {
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
  if (!booking) return res.status(404).json({ error: 'not found' });
  const service = db.prepare('SELECT * FROM services WHERE id = ?').get(booking.serviceId);
  const wallet = getOrCreateWallet(booking.customerId);
  if (wallet.balance < service.price) return res.status(400).json({ error: 'insufficient balance' });
  addLedger(wallet.id, 'BOOKING_DEBIT', -service.price, 'booking', booking.id, 'Wallet payment');
  db.prepare('UPDATE bookings SET status = ?, paymentMethod = ? WHERE id = ?').run('CONFIRMED', 'wallet', booking.id);
  res.json({ bookingId: booking.id, newBalance: db.prepare('SELECT balance FROM wallets WHERE id = ?').get(wallet.id).balance });
});

// Wallet
app.get('/api/wallet', (req, res) => {
  const phone = req.query.phone as string;
  if (!phone) return res.status(400).json({ error: 'phone required' });
  const customer = db.prepare('SELECT * FROM customers WHERE phone = ?').get(phone);
  if (!customer) return res.json({ balance: 0, ledger: [] });
  const wallet = getOrCreateWallet(customer.id);
  const ledger = db.prepare('SELECT * FROM wallet_ledger WHERE walletId = ? ORDER BY createdAt DESC').all(wallet.id);
  res.json({ wallet, ledger });
});

app.get('/api/wallet/topups', (_req, res) => {
  const products = db.prepare('SELECT * FROM topup_products WHERE active = 1 ORDER BY paidAmount').all();
  res.json(products);
});

app.post('/api/wallet/topup/init', (req, res) => {
  const { customerId, topupProductId } = req.body;
  if (!customerId || !topupProductId) return res.status(400).json({ error: 'missing fields' });
  const product = db.prepare('SELECT * FROM topup_products WHERE id = ? AND active = 1').get(topupProductId);
  if (!product) return res.status(404).json({ error: 'product not found' });
  const orderId = `topup_${topupProductId}_${Date.now()}`;
  const orderName = product.name;
  tossProvider
    .createPayment({
      orderId,
      amount: product.paidAmount,
      orderName,
      successUrl: `${process.env.BASE_URL}/success.html`,
      failUrl: `${process.env.BASE_URL}/fail.html`,
    })
    .then((resp) => {
      const paymentId = ensureUuid();
      db.prepare(
        'INSERT INTO payments (id, provider, orderId, amount, status, type, bookingId, customerId, rawPayloadJson) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).run(paymentId, 'toss', orderId, product.paidAmount, 'INIT', 'WALLET_TOPUP', null, customerId, null);
      res.json({ ...resp, paymentId });
    })
    .catch((err) => res.status(500).json({ error: err.message }));
});

app.post('/api/wallet/redeem-giftcard', (req, res) => {
  const { code, customerId } = req.body;
  if (!code || !customerId) return res.status(400).json({ error: 'missing fields' });
  const gift = db.prepare('SELECT * FROM gift_cards WHERE code = ?').get(code);
  if (!gift || gift.status !== 'ACTIVE' || gift.balance <= 0) return res.status(400).json({ error: 'invalid gift card' });
  const wallet = getOrCreateWallet(customerId);
  const amount = gift.balance;
  const redemptionId = ensureUuid();
  db.transaction(() => {
    addLedger(wallet.id, 'GIFTCARD_CREDIT', amount, 'gift_card', gift.id, 'Gift card redemption');
    db.prepare('UPDATE gift_cards SET balance = 0, status = ? WHERE id = ?').run('USED', gift.id);
    db.prepare('INSERT INTO gift_card_redemptions (id, giftCardId, walletId, amountUsed) VALUES (?, ?, ?, ?)').run(
      redemptionId,
      gift.id,
      wallet.id,
      amount
    );
  })();
  res.json({ walletId: wallet.id, newBalance: db.prepare('SELECT balance FROM wallets WHERE id = ?').get(wallet.id).balance });
});

// Payment init for booking
app.post('/api/toss/init', (req, res) => {
  const { bookingId } = req.body;
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId);
  if (!booking) return res.status(404).json({ error: 'not found' });
  const service = db.prepare('SELECT * FROM services WHERE id = ?').get(booking.serviceId);
  const orderId = `booking_${booking.id}_${Date.now()}`;
  tossProvider
    .createPayment({
      orderId,
      amount: service.price,
      orderName: `Booking ${service.name}`,
      successUrl: `${process.env.BASE_URL}/success.html`,
      failUrl: `${process.env.BASE_URL}/fail.html`,
    })
    .then((resp) => {
      const paymentId = ensureUuid();
      db.prepare(
        'INSERT INTO payments (id, provider, orderId, amount, status, type, bookingId, customerId, rawPayloadJson) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).run(paymentId, 'toss', orderId, service.price, 'INIT', 'BOOKING', booking.id, booking.customerId, null);
      res.json({ ...resp, paymentId });
    })
    .catch((err) => res.status(500).json({ error: err.message }));
});

// Gift card purchase init
app.post('/api/giftcards/init', (req, res) => {
  const { customerId, amount } = req.body;
  if (!customerId || !amount) return res.status(400).json({ error: 'missing fields' });
  const orderId = `giftcard_${Date.now()}`;
  tossProvider
    .createPayment({
      orderId,
      amount,
      orderName: 'NADI 상품권',
      successUrl: `${process.env.BASE_URL}/success.html`,
      failUrl: `${process.env.BASE_URL}/fail.html`,
    })
    .then((resp) => {
      const paymentId = ensureUuid();
      db.prepare(
        'INSERT INTO payments (id, provider, orderId, amount, status, type, bookingId, customerId, rawPayloadJson) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).run(paymentId, 'toss', orderId, amount, 'INIT', 'GIFTCARD', null, customerId, null);
      res.json({ ...resp, paymentId });
    })
    .catch((err) => res.status(500).json({ error: err.message }));
});

// Webhook
app.post('/api/toss/webhook', express.json({ type: 'application/json' }), async (req, res) => {
  try {
    const event = await tossProvider.verifyWebhook(req.body, req.headers as any);
    const { orderId, status, eventType, metadata } = event;
    const payment = db.prepare('SELECT * FROM payments WHERE orderId = ?').get(orderId);
    if (!payment) return res.status(404).json({ error: 'payment not found' });
    const idempotentKey = `${orderId}-${status}`;
    if (!ensureIdempotent(idempotentKey)) {
      return res.json({ ok: true, duplicate: true });
    }
    db.prepare('UPDATE payments SET status = ?, rawPayloadJson = ? WHERE id = ?').run(
      status || eventType || 'PAID',
      JSON.stringify(event),
      payment.id
    );
    if (payment.type === 'WALLET_TOPUP') {
      const product = db.prepare('SELECT * FROM topup_products WHERE id = ?').get(metadata?.topupProductId);
      const bonusRate = product?.bonusRate || 0;
      const wallet = getOrCreateWallet(payment.customerId);
      addLedger(wallet.id, 'TOPUP_PAID', payment.amount, 'payment', payment.id, 'Paid top-up');
      addLedger(wallet.id, 'TOPUP_BONUS', Math.round(payment.amount * bonusRate), 'payment', payment.id, 'Bonus');
    }
    if (payment.type === 'BOOKING' && payment.bookingId) {
      db.prepare('UPDATE bookings SET status = ?, paymentMethod = ? WHERE id = ?').run('CONFIRMED', 'toss', payment.bookingId);
    }
    if (payment.type === 'GIFTCARD') {
      const code = `GC-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
      db.prepare(
        'INSERT INTO gift_cards (id, code, initialAmount, balance, status, issuedPaymentId) VALUES (?, ?, ?, ?, ?, ?)'
      ).run(ensureUuid(), code, payment.amount, payment.amount, 'ACTIVE', payment.id);
    }
    res.json({ ok: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/payment/success', (req, res) => {
  const { orderId } = req.query;
  const payment = db.prepare('SELECT * FROM payments WHERE orderId = ?').get(orderId);
  res.json({ payment });
});

app.get('/api/payment/fail', (_req, res) => {
  res.json({ status: 'fail' });
});

// AI endpoints (stubbed Gemini)
app.post('/api/ai/design', upload.single('selfie'), (req, res) => {
  const { prompt, bookingId, customerId } = req.body;
  const consent = req.body.consent === 'true' || req.body.consent === true;
  if (!consent) return res.status(400).json({ error: 'consent required' });
  const imagePath = req.file ? `/uploads/${req.file.filename}` : undefined;
  const fakeResult = {
    styleKeywords: ['soft', 'elegant'],
    suggestions: ['C curl 11mm', '자연스러운 두께'],
    avoid: ['과한 볼륨'],
  };
  const id = ensureUuid();
  db.prepare('INSERT INTO ai_results (id, bookingId, customerId, prompt, resultJson, imagePath) VALUES (?, ?, ?, ?, ?, ?)').run(
    id,
    bookingId || null,
    customerId || null,
    prompt,
    JSON.stringify(fakeResult),
    imagePath
  );
  res.json({ id, result: fakeResult, imagePath });
});

app.get('/api/ai/:bookingId', (req, res) => {
  const row = db.prepare('SELECT * FROM ai_results WHERE bookingId = ? ORDER BY createdAt DESC').get(req.params.bookingId);
  if (!row) return res.status(404).json({ error: 'not found' });
  res.json({ ...row, resultJson: JSON.parse(row.resultJson) });
});

// Admin minimal
app.get('/api/admin/overview', ensureAdmin, (_req, res) => {
  const bookings = db.prepare('SELECT * FROM bookings ORDER BY createdAt DESC').all();
  const payments = db.prepare('SELECT * FROM payments ORDER BY createdAt DESC').all();
  const wallets = db.prepare('SELECT * FROM wallets').all();
  const giftCards = db.prepare('SELECT * FROM gift_cards').all();
  res.json({ bookings, payments, wallets, giftCards });
});

app.post('/api/admin/availability', ensureAdmin, (req, res) => {
  const { startsAt, endsAt, capacity } = req.body;
  if (!startsAt || !endsAt) return res.status(400).json({ error: 'missing fields' });
  const id = ensureUuid();
  db.prepare('INSERT INTO availability_slots (id, startsAt, endsAt, capacity, active) VALUES (?, ?, ?, ?, 1)').run(
    id,
    startsAt,
    endsAt,
    capacity || 1
  );
  res.json({ id });
});

app.get('/health', (_req, res) => res.json({ ok: true }));

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`NADI backend running on ${port}`);
});

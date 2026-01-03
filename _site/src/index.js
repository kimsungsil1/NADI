"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const dotenv_1 = require("dotenv");
const db_1 = require("./db");
require("./migrations/001_init");
require("./migrations/002_seed");
const tossProvider_1 = require("./lib/tossProvider");
const wallet_1 = require("./lib/wallet");
(0, dotenv_1.config)();
function validateEnvVars() {
    const required = ['TOSS_SECRET_KEY', 'TOSS_CLIENT_KEY', 'ADMIN_PASSWORD', 'BASE_URL'];
    const missing = required.filter(v => !process.env[v]);
    if (missing.length > 0) {
        throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
}
validateEnvVars();
(0, db_1.initDataDir)();
(0, db_1.applyMigrations)();
cleanupUploads();
const app = (0, express_1.default)();
const storage = multer_1.default.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path_1.default.join(process.cwd(), 'uploads'));
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const sanitized = file.originalname.replace(/[^a-zA-Z0-9.]/g, '_');
        cb(null, uniqueSuffix + '-' + sanitized);
    }
});
const upload = (0, multer_1.default)({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        if (!['image/jpeg', 'image/png'].includes(file.mimetype)) {
            return cb(new Error('Only jpg/png allowed'));
        }
        cb(null, true);
    },
});
const allowedOrigin = process.env.CORS_ORIGIN?.split(',') || ['*'];
app.use((0, cors_1.default)({ origin: allowedOrigin, credentials: true }));
app.use(express_1.default.json());
app.use('/uploads', express_1.default.static(path_1.default.join(process.cwd(), 'uploads')));
const tossProvider = new tossProvider_1.TossProvider(process.env.TOSS_SECRET_KEY || '', process.env.TOSS_CLIENT_KEY);
const retentionDays = Number(process.env.RETENTION_DAYS || 30);
function cleanupUploads() {
    const dir = path_1.default.join(process.cwd(), 'uploads');
    if (!fs_1.default.existsSync(dir))
        return;
    const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
    for (const file of fs_1.default.readdirSync(dir)) {
        const p = path_1.default.join(dir, file);
        const stat = fs_1.default.statSync(p);
        if (stat.mtimeMs < cutoff) {
            fs_1.default.unlinkSync(p);
        }
    }
}
setInterval(cleanupUploads, 24 * 60 * 60 * 1000);
function ensureAdmin(req, res, next) {
    const pass = req.headers['x-admin-password'];
    if (pass !== process.env.ADMIN_PASSWORD) {
        return res.status(401).json({ error: 'unauthorized' });
    }
    next();
}
const asyncHandler = (fn) => (req, res, next) => {
    return Promise.resolve(fn(req, res, next)).catch(next);
};
// Customers lookup
app.post('/api/customers/lookup', (req, res) => {
    const { phone, name } = req.body;
    if (!phone)
        return res.status(400).json({ error: 'phone required' });
    let customer = db_1.db.prepare('SELECT * FROM customers WHERE phone = ?').get(phone);
    if (!customer) {
        const id = (0, db_1.ensureUuid)();
        db_1.db.prepare('INSERT INTO customers (id, name, phone) VALUES (?, ?, ?)').run(id, name || '고객', phone);
        customer = db_1.db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
    }
    res.json(customer);
});
// Services
app.get('/api/services', (_req, res) => {
    const rows = db_1.db.prepare('SELECT * FROM services WHERE active = 1').all();
    res.json(rows);
});
// Availability
app.get('/api/availability', (req, res) => {
    const { date } = req.query;
    if (!date)
        return res.status(400).json({ error: 'date required' });
    const rows = db_1.db
        .prepare('SELECT * FROM availability_slots WHERE active = 1 AND date(startsAt) = date(?)')
        .all(date);
    res.json(rows);
});
// Bookings create
app.post('/api/bookings', (req, res) => {
    const { customerId, serviceId, startsAt, paymentMethod } = req.body;
    if (!customerId || !serviceId || !startsAt)
        return res.status(400).json({ error: 'missing fields' });
    const id = (0, db_1.ensureUuid)();
    db_1.db.prepare('INSERT INTO bookings (id, customerId, serviceId, startsAt, status, paymentMethod) VALUES (?, ?, ?, ?, ?, ?)').run(id, customerId, serviceId, startsAt, 'PENDING', paymentMethod || null);
    res.json(db_1.db.prepare('SELECT * FROM bookings WHERE id = ?').get(id));
});
app.get('/api/bookings/:id', (req, res) => {
    const booking = db_1.db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
    if (!booking)
        return res.status(404).json({ error: 'not found' });
    res.json(booking);
});
app.post('/api/bookings/:id/pay-with-wallet', (req, res) => {
    const booking = db_1.db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
    if (!booking)
        return res.status(404).json({ error: 'not found' });
    const service = db_1.db.prepare('SELECT * FROM services WHERE id = ?').get(booking.serviceId);
    const wallet = (0, wallet_1.getOrCreateWallet)(booking.customerId);
    if (wallet.balance < service.price)
        return res.status(400).json({ error: 'insufficient balance' });
    (0, wallet_1.addLedger)(wallet.id, 'BOOKING_DEBIT', -service.price, 'booking', booking.id, 'Wallet payment');
    db_1.db.prepare('UPDATE bookings SET status = ?, paymentMethod = ? WHERE id = ?').run('CONFIRMED', 'wallet', booking.id);
    res.json({ bookingId: booking.id, newBalance: db_1.db.prepare('SELECT balance FROM wallets WHERE id = ?').get(wallet.id).balance });
});
// Wallet
app.get('/api/wallet', (req, res) => {
    const phone = req.query.phone;
    if (!phone)
        return res.status(400).json({ error: 'phone required' });
    const customer = db_1.db.prepare('SELECT * FROM customers WHERE phone = ?').get(phone);
    if (!customer)
        return res.json({ balance: 0, ledger: [] });
    const wallet = (0, wallet_1.getOrCreateWallet)(customer.id);
    const ledger = db_1.db.prepare('SELECT * FROM wallet_ledger WHERE walletId = ? ORDER BY createdAt DESC').all(wallet.id);
    res.json({ wallet, ledger });
});
app.get('/api/wallet/topups', (_req, res) => {
    const products = db_1.db.prepare('SELECT * FROM topup_products WHERE active = 1 ORDER BY paidAmount').all();
    res.json(products);
});
app.post('/api/wallet/topup/init', asyncHandler(async (req, res) => {
    const { customerId, topupProductId } = req.body;
    if (!customerId || !topupProductId)
        return res.status(400).json({ error: 'missing fields' });
    const product = db_1.db.prepare('SELECT * FROM topup_products WHERE id = ? AND active = 1').get(topupProductId);
    if (!product)
        return res.status(404).json({ error: 'product not found' });
    const orderId = `topup_${topupProductId}_${Date.now()}`;
    const orderName = product.name;
    const resp = await tossProvider
        .createPayment({
        orderId,
        amount: product.paidAmount,
        orderName,
        successUrl: `${process.env.BASE_URL}/success.html`,
        failUrl: `${process.env.BASE_URL}/fail.html`,
    });
    const paymentId = (0, db_1.ensureUuid)();
    db_1.db.prepare('INSERT INTO payments (id, provider, orderId, amount, status, type, bookingId, customerId, rawPayloadJson) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(paymentId, 'toss', orderId, product.paidAmount, 'INIT', 'WALLET_TOPUP', null, customerId, null);
    res.json({ ...resp, paymentId });
}));
app.post('/api/wallet/redeem-giftcard', (req, res) => {
    const { code, customerId } = req.body;
    if (!code || !customerId)
        return res.status(400).json({ error: 'missing fields' });
    const gift = db_1.db.prepare('SELECT * FROM gift_cards WHERE code = ?').get(code);
    if (!gift || gift.status !== 'ACTIVE' || gift.balance <= 0)
        return res.status(400).json({ error: 'invalid gift card' });
    const wallet = (0, wallet_1.getOrCreateWallet)(customerId);
    const amount = gift.balance;
    const redemptionId = (0, db_1.ensureUuid)();
    db_1.db.transaction(() => {
        (0, wallet_1.addLedger)(wallet.id, 'GIFTCARD_CREDIT', amount, 'gift_card', gift.id, 'Gift card redemption');
        db_1.db.prepare('UPDATE gift_cards SET balance = 0, status = ? WHERE id = ?').run('USED', gift.id);
        db_1.db.prepare('INSERT INTO gift_card_redemptions (id, giftCardId, walletId, amountUsed) VALUES (?, ?, ?, ?)').run(redemptionId, gift.id, wallet.id, amount);
    })();
    res.json({ walletId: wallet.id, newBalance: db_1.db.prepare('SELECT balance FROM wallets WHERE id = ?').get(wallet.id).balance });
});
// Payment init for booking
app.post('/api/toss/init', asyncHandler(async (req, res) => {
    const { bookingId } = req.body;
    const booking = db_1.db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId);
    if (!booking)
        return res.status(404).json({ error: 'not found' });
    const service = db_1.db.prepare('SELECT * FROM services WHERE id = ?').get(booking.serviceId);
    const orderId = `booking_${booking.id}_${Date.now()}`;
    const resp = await tossProvider
        .createPayment({
        orderId,
        amount: service.price,
        orderName: `Booking ${service.name}`,
        successUrl: `${process.env.BASE_URL}/success.html`,
        failUrl: `${process.env.BASE_URL}/fail.html`,
    });
    const paymentId = (0, db_1.ensureUuid)();
    db_1.db.prepare('INSERT INTO payments (id, provider, orderId, amount, status, type, bookingId, customerId, rawPayloadJson) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(paymentId, 'toss', orderId, service.price, 'INIT', 'BOOKING', booking.id, booking.customerId, null);
    res.json({ ...resp, paymentId });
}));
// Gift card purchase init
app.post('/api/giftcards/init', asyncHandler(async (req, res) => {
    const { customerId, amount } = req.body;
    if (!customerId || !amount)
        return res.status(400).json({ error: 'missing fields' });
    const orderId = `giftcard_${Date.now()}`;
    const resp = await tossProvider
        .createPayment({
        orderId,
        amount,
        orderName: 'NADI 상품권',
        successUrl: `${process.env.BASE_URL}/success.html`,
        failUrl: `${process.env.BASE_URL}/fail.html`,
    });
    const paymentId = (0, db_1.ensureUuid)();
    db_1.db.prepare('INSERT INTO payments (id, provider, orderId, amount, status, type, bookingId, customerId, rawPayloadJson) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(paymentId, 'toss', orderId, amount, 'INIT', 'GIFTCARD', null, customerId, null);
    res.json({ ...resp, paymentId });
}));
// Webhook
app.post('/api/toss/webhook', express_1.default.json({ type: 'application/json' }), asyncHandler(async (req, res) => {
    const event = await tossProvider.verifyWebhook(req.body, req.headers);
    const { orderId, status, eventType, metadata } = event;
    const payment = db_1.db.prepare('SELECT * FROM payments WHERE orderId = ?').get(orderId);
    if (!payment)
        return res.status(404).json({ error: 'payment not found' });
    const idempotentKey = `${orderId}-${status}`;
    if (!(0, wallet_1.ensureIdempotent)(idempotentKey)) {
        return res.json({ ok: true, duplicate: true });
    }
    db_1.db.prepare('UPDATE payments SET status = ?, rawPayloadJson = ? WHERE id = ?').run(status || eventType || 'PAID', JSON.stringify(event), payment.id);
    if (payment.type === 'WALLET_TOPUP') {
        const product = db_1.db.prepare('SELECT * FROM topup_products WHERE id = ?').get(metadata?.topupProductId);
        const bonusRate = product?.bonusRate || 0;
        const wallet = (0, wallet_1.getOrCreateWallet)(payment.customerId);
        (0, wallet_1.addLedger)(wallet.id, 'TOPUP_PAID', payment.amount, 'payment', payment.id, 'Paid top-up');
        (0, wallet_1.addLedger)(wallet.id, 'TOPUP_BONUS', Math.round(payment.amount * bonusRate), 'payment', payment.id, 'Bonus');
    }
    if (payment.type === 'BOOKING' && payment.bookingId) {
        db_1.db.prepare('UPDATE bookings SET status = ?, paymentMethod = ? WHERE id = ?').run('CONFIRMED', 'toss', payment.bookingId);
    }
    if (payment.type === 'GIFTCARD') {
        const code = `GC-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
        db_1.db.prepare('INSERT INTO gift_cards (id, code, initialAmount, balance, status, issuedPaymentId) VALUES (?, ?, ?, ?, ?, ?)').run((0, db_1.ensureUuid)(), code, payment.amount, payment.amount, 'ACTIVE', payment.id);
    }
    res.json({ ok: true });
}));
app.get('/api/payment/success', (req, res) => {
    const { orderId } = req.query;
    const payment = db_1.db.prepare('SELECT * FROM payments WHERE orderId = ?').get(orderId);
    res.json({ payment });
});
app.get('/api/payment/fail', (_req, res) => {
    res.json({ status: 'fail' });
});
// AI endpoints (stubbed Gemini)
app.post('/api/ai/design', upload.single('selfie'), (req, res) => {
    const { prompt, bookingId, customerId } = req.body;
    const consent = req.body.consent === 'true' || req.body.consent === true;
    if (!consent)
        return res.status(400).json({ error: 'consent required' });
    const imagePath = req.file ? `/uploads/${req.file.filename}` : undefined;
    const fakeResult = {
        styleKeywords: ['soft', 'elegant'],
        suggestions: ['C curl 11mm', '자연스러운 두께'],
        avoid: ['과한 볼륨'],
    };
    const id = (0, db_1.ensureUuid)();
    db_1.db.prepare('INSERT INTO ai_results (id, bookingId, customerId, prompt, resultJson, imagePath) VALUES (?, ?, ?, ?, ?, ?)').run(id, bookingId || null, customerId || null, prompt, JSON.stringify(fakeResult), imagePath);
    res.json({ id, result: fakeResult, imagePath });
});
app.get('/api/ai/:bookingId', (req, res) => {
    const row = db_1.db.prepare('SELECT * FROM ai_results WHERE bookingId = ? ORDER BY createdAt DESC').get(req.params.bookingId);
    if (!row)
        return res.status(404).json({ error: 'not found' });
    res.json({ ...row, resultJson: JSON.parse(row.resultJson) });
});
// Admin minimal
app.get('/api/admin/overview', ensureAdmin, (_req, res) => {
    const bookings = db_1.db.prepare('SELECT * FROM bookings ORDER BY createdAt DESC').all();
    const payments = db_1.db.prepare('SELECT * FROM payments ORDER BY createdAt DESC').all();
    const wallets = db_1.db.prepare('SELECT * FROM wallets').all();
    const giftCards = db_1.db.prepare('SELECT * FROM gift_cards').all();
    res.json({ bookings, payments, wallets, giftCards });
});
app.post('/api/admin/availability', ensureAdmin, (req, res) => {
    const { startsAt, endsAt, capacity } = req.body;
    if (!startsAt || !endsAt)
        return res.status(400).json({ error: 'missing fields' });
    const id = (0, db_1.ensureUuid)();
    db_1.db.prepare('INSERT INTO availability_slots (id, startsAt, endsAt, capacity, active) VALUES (?, ?, ?, ?, 1)').run(id, startsAt, endsAt, capacity || 1);
    res.json({ id });
});
app.get('/health', (_req, res) => res.json({ ok: true }));
// Centralized error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`NADI backend running on ${port}`);
});

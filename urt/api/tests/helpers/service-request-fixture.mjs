import assert from 'node:assert/strict';
import crypto from 'node:crypto';

// Synthetic configuration and in-memory model boundaries: these checks never connect to real stores.
Object.assign(process.env, {
  NODE_ENV: 'test', MAIL_ENABLED: 'false', MONGO_URI: 'mongodb://127.0.0.1/fixture',
  REDIS_URI: 'redis://127.0.0.1:1', GOOGLE_CLIENT_ID: '',
  R2_ACCOUNT_ID: '', R2_ACCESS_KEY_ID: '', R2_SECRET_ACCESS_KEY: '', R2_BUCKET_NAME: '',
  ALLOWED_ORIGINS: 'http://localhost:5173', COOKIE_SECURE: 'false',
});
for (const [index, key] of ['ACCESS_KEYS', 'REFRESH_KEYS', 'SESSION_KEYS'].entries()) {
  process.env[key] = JSON.stringify([{ id: 'test', secret: String(index).repeat(64), activatedAt: 1 }]);
}
const { default: express } = await import('express');
const { default: mongoose } = await import('mongoose');
const { Business } = await import('../../dist/models/Business.model.js');
const { Customer } = await import('../../dist/models/Customer.model.js');
const { Technician } = await import('../../dist/models/Technician.model.js');
const { ServiceTicket } = await import('../../dist/models/ServiceTicket.model.js');
const { BusinessSubscription } = await import('../../dist/models/BusinessSubscription.model.js');
const { AuthService } = await import('../../dist/modules/auth/auth.service.js');
const { AppError } = await import('../../dist/middleware/error-handler.js');
const { verifyCsrfToken } = await import('../../dist/core/security/csrf.js');
const { publicBusinessRouter, businessRouter } = await import('../../dist/modules/business/business.routes.js');
const { publicTrackingRouter } = await import('../../dist/modules/ticket/ticket.routes.js');
const { serializeTicket } = await import('../../dist/modules/ticket/ticket.serializer.js');

export function serviceRequestFixture() {
  const contacts = [];
  const tickets = [];
  let signedIn = false;
  let subscribed = true;
  const shop = { _id: new mongoose.Types.ObjectId(), ownerId: new mongoose.Types.ObjectId(), slug: 'repair-a', name: 'Repair A', isActive: true, timezone: 'Asia/Makassar', currency: 'IDR' };
  const user = { id: new mongoose.Types.ObjectId().toString(), firstName: 'Customer', lastName: 'Fixture', phone: '+6281234567890', email: 'fixture@example.test', isEmailVerified: true };
  const csrf = 'c'.repeat(64);
  const invitationToken = 'fixture-invitation-token-for-browser-only';
  let recovery;
  const originals = [];
  function replace(object, key, implementation) {
    originals.push(() => { object[key] = original; });
    const original = object[key];
    object[key] = implementation;
  }
  replace(Business, 'findOne', async (query) => query.slug === shop.slug ? shop : null);
  replace(Business, 'findById', async (id) => String(id) === String(shop._id) ? shop : null);
  replace(BusinessSubscription, 'findOne', async () => subscribed ? { status: 'active' } : null);
  replace(Technician, 'findOne', async () => null);
  replace(AuthService, 'getProfile', async () => user);
  replace(Customer, 'findOne', async (query) => {
    assert.ok(query.userId, 'Anonymous contact details must never be used to discover or link records');
    return contacts.find((contact) => String(contact.businessId) === String(query.businessId) && String(contact.userId) === String(query.userId)) || null;
  });
  replace(Customer, 'create', async (data) => {
    const doc = Customer.hydrate({ _id: new mongoose.Types.ObjectId(), ...data });
    assert.equal(doc.validateSync(), undefined);
    doc.save = async () => doc;
    contacts.push(doc);
    return doc;
  });
  replace(ServiceTicket, 'exists', async ({ ticketCode }) => tickets.some((ticket) => ticket.ticketCode === ticketCode));
  replace(ServiceTicket, 'create', async (data) => {
    const doc = ServiceTicket.hydrate({ _id: new mongoose.Types.ObjectId(), createdAt: new Date(), ...data });
    assert.equal(doc.validateSync(), undefined);
    doc.populate = async () => doc;
    tickets.push(doc);
    // Exercise owner/customer serialization of a guest timeline without a User actor.
    assert.doesNotThrow(() => serializeTicket(doc, 'owner'));
    return doc;
  });
  replace(ServiceTicket, 'findOne', (query) => ({ select: async () => tickets.find((ticket) =>
    ticket.ticketCode === query.ticketCode && String(ticket.businessId) === String(query.businessId)) || null }));
  replace(AuthService, 'verifyAccessToken', async (token) => {
    if (token !== 'fixture-token') throw new AppError('Invalid token', 401, 'INVALID_TOKEN');
    return { id: user.id, role: 'user', deviceId: 'fixture-device' };
  });

  const app = express();
  app.use(express.json());
  app.get('/api/v1/auth/csrf-token', (_req, res) => {
    res.cookie('fixture-csrf', 'fixture', { httpOnly: true, sameSite: 'lax' });
    res.json({ data: { csrfToken: csrf } });
  });
  app.use((req, _res, next) => { req.session = { csrfToken: csrf }; next(); });
  app.use('/api/v1', verifyCsrfToken);
  app.post('/api/v1/auth/refresh-token', (_req, res) => signedIn
    ? res.json({ data: { accessToken: 'fixture-token', deviceId: 'fixture-device' } })
    : res.status(401).json({ code: 'INVALID_TOKEN' }));
  app.get('/api/v1/auth/profile', (_req, res) => res.json({ data: { user } }));
  app.get('/api/v1/auth/portals', (_req, res) => res.json({ data: { portals: ['customer'] } }));
  // UI boundaries only; actual recovery API, templates and SMTP delivery have a separate integration test.
  app.post('/api/v1/auth/:portal(owner|customer|technician)/forgot-password', (req, res) => {
    recovery = { portal: req.params.portal, email: req.body.email, code: '123456', token: crypto.randomBytes(32).toString('hex') };
    res.json({ data: {}, message: 'Jika akun mendukung pemulihan, email akan dikirim.' });
  });
  app.post('/api/v1/auth/:portal(owner|customer|technician)/verify-reset-otp', (req, res) =>
    recovery?.portal === req.params.portal && recovery.email === req.body.email && recovery.code === req.body.otp
      ? res.json({ data: { resetToken: recovery.token } }) : res.status(400).json({ error: 'Kode tidak valid' }));
  app.post('/api/v1/auth/:portal(owner|customer|technician)/reset-password', (req, res) => {
    if (recovery?.portal !== req.params.portal || recovery.token !== req.body.resetToken || req.body.password !== req.body.confirmPassword) return res.status(400).json({ error: 'Tautan tidak valid' });
    recovery.completed = true;
    res.json({ data: {}, message: 'Kata sandi diperbarui.' });
  });
  // Invitation UI boundary fixtures; real invitation API authorization is checked in auth-portals.test.mjs.
  app.post('/api/v1/technician-invitations/inspect', (req, res) => req.body.token === invitationToken
    ? res.json({ data: { name: 'Invited Technician', email: 'invited@example.test', businessName: shop.name, accountExists: false } })
    : res.status(400).json({ code: 'INVALID_TOKEN' }));
  app.post('/api/v1/technician-invitations/activate', (req, res) => req.body.token === invitationToken && req.body.password?.length >= 6 && req.body.password === req.body.confirmPassword
    ? res.status(201).json({ data: { email: 'invited@example.test', membership: { businessId: shop._id.toString(), role: 'technician' } } })
    : res.status(400).json({ code: 'VALIDATION_ERROR' }));
  app.get('/api/v1/me/businesses', (_req, res) => res.json({ data: { businesses: contacts.some((contact) => String(contact.userId) === user.id)
    ? [{ businessId: shop._id.toString(), slug: shop.slug, name: shop.name, roles: ['customer'] }] : [] } }));
  app.get('/api/v1/public/businesses/:slug', (req, res, next) => req.params.slug === shop.slug
    ? res.json({ data: { business: { ...shop, id: shop._id.toString() }, services: [] } }) : next());
  app.use('/api/v1/public/businesses', publicBusinessRouter);
  app.use('/api/v1/public/tracking', publicTrackingRouter);
  app.use('/api/v1/businesses', businessRouter);
  app.use((error, _req, res, _next) => res.status(error.statusCode || 500).json({ code: error.publicCode || 'ERROR' }));

  return {
    app, contacts, tickets, shop, user, csrf, invitationToken,
    get recovery() { return recovery; },
    signIn(value) { signedIn = value; },
    subscribe(value) { subscribed = value; },
    restore() { for (const restore of originals.reverse()) restore(); },
    verifyReceipt(receipt) {
      assert.match(receipt.ticketCode, /^URT-\d{4}-[A-Z0-9]+$/);
      const ticket = tickets.find((item) => item.ticketCode === receipt.ticketCode);
      assert.equal(ticket.trackingSecretHash, crypto.createHash('sha256').update(receipt.trackingSecret).digest('hex'));
      assert.notEqual(ticket.trackingSecretHash, receipt.trackingSecret);
      return ticket;
    },
  };
}

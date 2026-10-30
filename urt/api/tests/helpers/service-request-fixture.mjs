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
const { Service } = await import('../../dist/models/Service.model.js');
const { BusinessSubscription } = await import('../../dist/models/BusinessSubscription.model.js');
const { SubscriptionPayment } = await import('../../dist/models/SubscriptionPayment.model.js');
const { ServiceInvoice } = await import('../../dist/models/ServiceInvoice.model.js');
const { AuthService } = await import('../../dist/modules/auth/auth.service.js');
const { AppError } = await import('../../dist/middleware/error-handler.js');
const { verifyCsrfToken } = await import('../../dist/core/security/csrf.js');
const { publicBusinessRouter, businessRouter } = await import('../../dist/modules/business/business.routes.js');
const { publicTrackingRouter } = await import('../../dist/modules/ticket/ticket.routes.js');
const { publicApprovalRouter } = await import('../../dist/modules/ticket/approval-access.routes.js');
const { TicketApprovalAccess } = await import('../../dist/models/TicketApprovalAccess.model.js');
const { serializeTicket } = await import('../../dist/modules/ticket/ticket.serializer.js');

export function serviceRequestFixture() {
  const contacts = [];
  const tickets = [];
  const technicians = [];
  const approvalAccess = [];
  const catalog = [];
  let portal = 'customer';
  let signedIn = false;
  let subscribed = true;
  const shop = { _id: new mongoose.Types.ObjectId(), ownerId: new mongoose.Types.ObjectId(), slug: 'repair-a', name: 'Repair A', isActive: true, timezone: 'Asia/Makassar', currency: 'IDR' };
  const originalOwnerId = shop.ownerId;
  const user = { id: new mongoose.Types.ObjectId().toString(), firstName: 'Customer', lastName: 'Fixture', phone: '+6281234567890', email: 'fixture@example.test', isEmailVerified: true };
  const csrf = 'c'.repeat(64);
  const invitationToken = 'fixture-invitation-token-for-browser-only';
  const secondInvitationToken = 'fixture-second-invitation-token-for-browser-only';
  let inspectionUnavailable = false;
  let invitationAccountExists = false;
  let invitationLogin;
  let recovery;
  const originals = [];
  function replace(object, key, implementation) {
    originals.push(() => { object[key] = original; });
    const original = object[key];
    object[key] = implementation;
  }
  function matches(doc, filter) {
    return Object.entries(filter).every(([key, value]) => {
      const actual = key.split('.').reduce((item, part) => item?.[part], doc);
      if (key === '$or') return value.some((condition) => matches(doc, condition));
      if (value && typeof value === 'object' && !(value instanceof mongoose.Types.ObjectId) && !(value instanceof Date)) {
        return Object.entries(value).every(([operator, expected]) => {
          if (operator === '$ne') return expected === null ? actual != null : String(actual) !== String(expected);
          if (operator === '$exists') return (actual !== undefined) === expected;
          if (operator === '$nin') return !expected.some((item) => String(item) === String(actual));
          if (operator === '$in') return expected.some((item) => String(item) === String(actual));
          if (operator === '$gt') return actual > expected;
          if (operator === '$lte') return actual != null && actual <= expected;
          if (operator === '$regex') return new RegExp(expected, value.$options || '').test(String(actual));
          return operator === '$options';
        });
      }
      return value === null ? actual == null : String(actual) === String(value);
    });
  }
  function query(records, filter, { single = false, ticket = false } = {}) {
    let offset = 0, limit = Infinity, sorting = {}, populated = false;
    const populatePaths = new Set();
    const chain = {
      skip(value) { offset = value; return chain; },
      limit(value) { limit = value; return chain; },
      sort(value) { sorting = value; return chain; },
      select() { return chain; },
      populate(paths) { populated = true; for (const path of Array.isArray(paths) ? paths : [paths]) populatePaths.add(typeof path === 'string' ? path : path.path); return chain; },
      then(resolve, reject) {
        return Promise.resolve().then(() => {
          let result = records.filter((doc) => matches(doc, filter));
          result.sort((left, right) => {
            for (const [key, direction] of Object.entries(sorting)) {
              if (left[key] < right[key]) return -direction;
              if (left[key] > right[key]) return direction;
            }
            return 0;
          });
          result = result.slice(offset, offset + limit);
          if (ticket && populated) result = result.map((doc) => populateTicket(doc, populatePaths));
          return single ? result[0] || null : result;
        }).then(resolve, reject);
      },
    };
    return chain;
  }
  replace(Business, 'findOne', async (query) => query.slug === shop.slug ? shop : null);
  function populateTicket(doc, paths = new Set(['customerId', 'assignedTechnicianId'])) {
    const clone = ServiceTicket.hydrate(doc.toObject ? doc.toObject({ depopulate: true }) : doc);
    if (paths.has('customerId')) clone.customerId = contacts.find((contact) => String(contact._id) === String(clone.customerId)) || clone.customerId;
    if (paths.has('assignedTechnicianId')) clone.assignedTechnicianId = technicians.find((tech) => String(tech._id) === String(clone.assignedTechnicianId)) || clone.assignedTechnicianId;
    clone.save = async () => { assert.equal(clone.validateSync(), undefined); const original = tickets.find((item) => String(item._id) === String(clone._id)); original.set(clone.toObject({ depopulate: true })); return clone; };
    clone.populate = async () => clone;
    return clone;
  }
  replace(TicketApprovalAccess, 'create', async (data) => { approvalAccess.push(data); return data; });
  replace(TicketApprovalAccess, 'findOne', async (filter) => approvalAccess.find((doc) => matches(doc, filter)) || null);
  replace(Business, 'findById', async (id) => String(id) === String(shop._id) ? shop : null);
  replace(BusinessSubscription, 'findOne', async () => subscribed ? { status: 'active', currentPeriodStart: new Date(Date.now() - 86400000), currentPeriodEnd: new Date(Date.now() + 30 * 86400000), packageSnapshot: { name: 'Fixture Plan', maxTechnicians: 10 } } : null);
  replace(SubscriptionPayment, 'findOne', async () => null);
  replace(ServiceInvoice, 'aggregate', async () => []);
  replace(ServiceInvoice, 'find', () => query([], {}));
  replace(Technician, 'findOne', async (filter) => technicians.find((doc) => matches(doc, filter)) || null);
  replace(Technician, 'find', (filter) => query(technicians, filter));
  replace(Technician, 'countDocuments', async (filter) => technicians.filter((doc) => matches(doc, filter)).length);
  replace(Service, 'find', (filter) => query(catalog, filter));
  replace(Service, 'findOne', (filter) => query(catalog, filter, { single: true }));
  replace(Service, 'countDocuments', async (filter) => catalog.filter((doc) => matches(doc, filter)).length);
  replace(Service, 'create', async (input) => { const item = Service.hydrate({ _id: new mongoose.Types.ObjectId(), createdAt: new Date(), updatedAt: new Date(), ...input }); assert.equal(item.validateSync(), undefined); catalog.push(item); return item; });
  replace(Service, 'findOneAndUpdate', async (filter, update) => { const item = catalog.find((doc) => matches(doc, filter)); if (!item) return null; item.set(update.$set || {}); for (const key of Object.keys(update.$unset || {})) item[key] = undefined; item.updatedAt = new Date(); assert.equal(item.validateSync(), undefined); return item; });
  replace(AuthService, 'getProfile', async () => user);
  replace(Customer, 'findOne', async (query) => {
    assert.ok(query.userId || query._id, 'Anonymous contact details must never be used to discover or link records');
    return contacts.find((contact) => matches(contact, query)) || null;
  });
  replace(Customer, 'find', (filter) => query(contacts, filter));
  replace(Customer, 'countDocuments', async (filter) => contacts.filter((doc) => matches(doc, filter)).length);
  replace(Customer, 'findOneAndUpdate', async (filter, update) => {
    const doc = contacts.find((item) => matches(item, filter));
    if (!doc) return null;
    Object.assign(doc, update.$set || {});
    for (const key of Object.keys(update.$unset || {})) doc[key] = undefined;
    return doc;
  });
  replace(Customer, 'create', async (data) => {
    const doc = Customer.hydrate({ _id: new mongoose.Types.ObjectId(), createdAt: new Date(), ...data });
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
    doc.save = async () => { assert.equal(doc.validateSync(), undefined); return doc; };
    tickets.push(doc);
    // Exercise owner/customer serialization of a guest timeline without a User actor.
    assert.doesNotThrow(() => serializeTicket(doc, 'owner'));
    return doc;
  });
  replace(ServiceTicket, 'findOne', (filter) => query(tickets, filter, { single: true, ticket: true }));
  replace(ServiceTicket, 'find', (filter) => query(tickets, filter, { ticket: true }));
  replace(ServiceTicket, 'countDocuments', async (filter) => tickets.filter((doc) => matches(doc, filter)).length);
  replace(ServiceTicket, 'aggregate', async (pipeline) => {
    if (pipeline.some((stage) => stage.$addFields)) {
      return tickets.filter((doc) => matches(doc, pipeline[0].$match))
        .sort((a, b) => (a.nextDeadlineAt?.getTime() ?? Infinity) - (b.nextDeadlineAt?.getTime() ?? Infinity) || a.createdAt - b.createdAt || String(a._id).localeCompare(String(b._id)))
        .slice(pipeline.find((stage) => stage.$skip)?.$skip || 0, (pipeline.find((stage) => stage.$skip)?.$skip || 0) + pipeline.find((stage) => stage.$limit).$limit).map((doc) => doc.toObject());
    }
    const counts = new Map();
    for (const doc of tickets.filter((item) => matches(item, pipeline[0].$match))) {
      const key = String(doc.assignedTechnicianId);
      const count = counts.get(key) || { _id: doc.assignedTechnicianId, total: 0 };
      count.total += 1; counts.set(key, count);
    }
    return [...counts.values()];
  });
  replace(ServiceTicket, 'populate', async (docs) => docs.map((doc) => populateTicket(doc)));
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
  app.get('/api/v1/auth/portals', (_req, res) => res.json({ data: { portals: [portal] } }));
  app.post('/api/v1/auth/customer/login', (req, res) => {
    if (req.body.email !== user.email || req.body.password !== 'fixture-password') return res.status(401).json({ error: 'Email atau kata sandi tidak cocok.' });
    signedIn = true; portal = 'customer';
    res.json({ data: { user, accessToken: 'fixture-token', deviceId: 'fixture-device' } });
  });
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
  app.post('/api/v1/technician-invitations/inspect', (req, res) => {
    if (inspectionUnavailable) return res.status(503).json({ code: 'AUTH_UNAVAILABLE', error: 'Layanan belum dapat dijangkau. Coba lagi.' });
    if (![invitationToken, secondInvitationToken].includes(req.body.token)) return res.status(400).json({ code: 'INVALID_TOKEN' });
    return res.json({ data: { name: 'Invited Technician', email: req.body.token === secondInvitationToken ? 'second@example.test' : 'invited@example.test', businessName: shop.name, accountExists: invitationAccountExists } });
  });
  app.post('/api/v1/auth/technician/login', (req, res) => {
    invitationLogin = req.body;
    if (req.body.email !== 'invited@example.test' || req.body.password !== 'fixture-password' || req.body.invitationToken !== invitationToken) {
      return res.status(401).json({ code: 'INVALID_CREDENTIALS' });
    }
    res.json({ data: { user: { ...user, email: req.body.email }, accessToken: 'fixture-token', deviceId: 'fixture-device' } });
  });
  app.post('/api/v1/technician-invitations/activate', (req, res) => req.body.token === invitationToken && req.body.password?.length >= 6 && req.body.password === req.body.confirmPassword
    ? res.status(201).json({ data: { email: 'invited@example.test', membership: { businessId: shop._id.toString(), role: 'technician' } } })
    : res.status(400).json({ code: 'VALIDATION_ERROR' }));
  app.get('/api/v1/me/businesses', (_req, res) => res.json({ data: { businesses: portal !== 'customer' || contacts.some((contact) => String(contact.userId) === user.id)
    ? [{ businessId: shop._id.toString(), slug: shop.slug, name: shop.name, roles: [portal] }] : [] } }));
  app.get('/api/v1/public/businesses/:slug', (req, res, next) => req.params.slug === shop.slug
    ? res.json({ data: { business: { ...shop, id: shop._id.toString() }, services: [] } }) : next());
  app.use('/api/v1/public/businesses', publicBusinessRouter);
  app.use('/api/v1/public/tracking', publicTrackingRouter);
  app.use('/api/v1/public/service-approvals', publicApprovalRouter);
  app.use('/api/v1/businesses', businessRouter);
  app.use((error, _req, res, _next) => res.status(error.statusCode || 500).json({ code: error.publicCode || 'ERROR' }));

  return {
    app, contacts, tickets, technicians, catalog, shop, user, csrf, invitationToken, secondInvitationToken,
    addTechnician(data = {}) {
      const tech = Technician.hydrate({ _id: new mongoose.Types.ObjectId(), businessId: shop._id, userId: new mongoose.Types.ObjectId(), name: 'Technician Fixture', email: 'tech@example.test', status: 'active', createdAt: new Date(), ...data });
      technicians.push(tech);
      return tech;
    },
    invitationInspectionUnavailable(value) { inspectionUnavailable = value; },
    get invitationLogin() { return invitationLogin; },
    existingInvitationAccount(value) { invitationAccountExists = value; },
    get recovery() { return recovery; },
    signIn(value, role = 'customer') { signedIn = value; portal = role; shop.ownerId = role === 'owner' ? new mongoose.Types.ObjectId(user.id) : originalOwnerId; },
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

import assert from 'node:assert/strict';
import test from 'node:test';
import bcrypt from 'bcryptjs';
// Reuse synthetic environment setup; no real store or email connections are made.
import './helpers/service-request-fixture.mjs';
import express from 'express';
import session from 'express-session';
import mongoose from 'mongoose';
import { User } from '../dist/models/User.model.js';
import { Business } from '../dist/models/Business.model.js';
import { Customer } from '../dist/models/Customer.model.js';
import { Technician } from '../dist/models/Technician.model.js';
import { BusinessSubscription } from '../dist/models/BusinessSubscription.model.js';
import { AuthService } from '../dist/modules/auth/auth.service.js';
import { authSessionStore, accountSecurityStore, otpStore } from '../dist/lib/redis/index.js';
import { deviceService } from '../dist/lib/device/index.js';
import { mailService } from '../dist/lib/mail/index.js';
import { formatUserResponse } from '../dist/types/common.js';
import { authRoutes } from '../dist/modules/auth/index.js';
import { businessRouter } from '../dist/modules/business/business.routes.js';
import { technicianInvitationRouter } from '../dist/modules/technician/technician.routes.js';
import { verifyCsrfToken } from '../dist/core/security/csrf.js';
import { loginLimiter, authLimiter } from '../dist/core/security/rate-limiter.js';
import { AppError } from '../dist/middleware/error-handler.js';

test('role-specific signup/login and owner-issued technician activation preserve authorization', async () => {
  const users = [], technicians = [], businesses = [];
  const tokens = new Map();
  let subscriptionActive = true;
  const restorers = [];
  function replace(target, key, implementation) {
    const original = target[key]; target[key] = implementation;
    restorers.push(() => { target[key] = original; });
  }
  function matches(doc, query) {
    return Object.entries(query).every(([key, value]) => {
      if (value && typeof value === 'object' && '$gt' in value) return doc[key] > value.$gt;
      if (value && typeof value === 'object' && '$ne' in value) return String(doc[key]) !== String(value.$ne);
      if (key === '$or') return value.some((item) => matches(doc, item));
      return String(doc[key]) === String(value);
    });
  }
  function result(doc) { return { select: async () => doc, then: (ok, fail) => Promise.resolve(doc).then(ok, fail) }; }
  replace(User, 'findOne', (query) => result(users.find((doc) => matches(doc, query)) || null));
  replace(User, 'findById', (id) => result(users.find((doc) => String(doc._id) === String(id)) || null));
  replace(User, 'exists', async (query) => users.some((doc) => matches(doc, query)));
  replace(User, 'create', async (data) => {
    assert.ok(!users.some((doc) => doc.email === data.email));
    const user = new User(data);
    assert.equal(user.validateSync(), undefined);
    user.password = await bcrypt.hash(data.password, 4);
    users.push(user); return user;
  });
  replace(Business, 'exists', async (query) => businesses.some((doc) => matches(doc, query)));
  replace(Business, 'findById', async (id) => businesses.find((doc) => String(doc._id) === String(id)) || null);
  replace(Customer, 'exists', async () => false);
  replace(Customer, 'findOne', async () => null);
  replace(Technician, 'exists', async (query) => technicians.some((doc) => matches(doc, query)));
  replace(Technician, 'findOne', (query) => result(technicians.find((doc) => matches(doc, query)) || null));
  replace(Technician, 'countDocuments', async (query) => technicians.filter((doc) => matches(doc, query)).length);
  replace(Technician, 'create', async (data) => {
    const doc = Technician.hydrate({ _id: new mongoose.Types.ObjectId(), ...data });
    assert.equal(doc.validateSync(), undefined);
    doc.save = async () => doc;
    technicians.push(doc); return doc;
  });
  replace(BusinessSubscription, 'findOne', async () => subscriptionActive ? { packageSnapshot: { maxTechnicians: 10 } } : null);
  replace(accountSecurityStore, 'isAccountLocked', async () => ({ locked: false }));
  replace(accountSecurityStore, 'resetLoginAttempts', async () => {});
  replace(accountSecurityStore, 'incrementLoginAttempts', async () => 1);
  replace(otpStore, 'setEmailOtp', async () => {});
  replace(mailService, 'sendTemplate', async () => true);
  replace(AuthService, 'sendRegistrationEmails', async () => {});
  replace(deviceService, 'extractDeviceInfo', () => ({ deviceId: 'fixture-device' }));
  replace(AuthService, 'startSession', async (user) => {
    const token = `fixture-${tokens.size}`; tokens.set(token, user);
    return { user: formatUserResponse(user, true), accessToken: token, refreshToken: 'fixture-refresh', deviceId: 'fixture-device', expiresAt: Math.floor(Date.now() / 1000) + 600 };
  });
  replace(AuthService, 'verifyAccessToken', async (token) => {
    const user = tokens.get(token);
    if (!user) throw new AppError('Invalid token', 401);
    return { id: user.id, email: user.email, role: user.role, deviceId: 'fixture-device' };
  });
  // Guard against accidental access to the real Redis session store in these fixtures.
  replace(authSessionStore, 'get', async () => { throw new Error('Unexpected real session access'); });

  const app = express();
  app.use(express.json());
  app.use(session({ secret: 'test-only-session-secret-32-characters', resave: false, saveUninitialized: false }));
  app.use('/api/v1', verifyCsrfToken);
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/businesses', businessRouter);
  app.use('/api/v1/technician-invitations', technicianInvitationRouter);
  app.use((error, _req, res, _next) => res.status(error.statusCode || 500).json({ code: error.publicCode || 'ERROR' }));
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}/api/v1`;
  async function client() {
    const boot = await fetch(`${base}/auth/csrf-token`);
    let cookie = boot.headers.getSetCookie().map((value) => value.split(';')[0]).join('; ');
    let csrf = (await boot.json()).data.csrfToken;
    return async (path, body, token) => {
      const response = await fetch(base + path, { method: body ? 'POST' : 'GET', headers: {
        'Content-Type': 'application/json', Cookie: cookie, 'X-CSRF-Token': csrf,
        ...(token && { Authorization: `Bearer ${token}` }),
      }, ...(body && { body: JSON.stringify(body) }) });
      const replacement = response.headers.getSetCookie();
      if (replacement.length) cookie = replacement.map((value) => value.split(';')[0]).join('; ');
      const text = await response.text();
      const payload = text.startsWith('{') ? JSON.parse(text) : {};
      if (payload.data?.csrfToken) csrf = payload.data.csrfToken;
      return { status: response.status, ...payload };
    };
  }
  try {
    const request = await client();
    const signup = (email) => ({ firstName: 'Example', lastName: 'Person', email, password: 'fixture-password' });
    const owner = await request('/auth/owner/register', signup('owner@example.test'));
    assert.equal(owner.status, 201);
    assert.equal(users[0].registrationPortal, 'owner');
    const ownerLogin = await request('/auth/owner/login', { email: users[0].email, password: 'fixture-password' });
    assert.equal(ownerLogin.status, 200);
    assert.equal((await request('/auth/customer/login', { email: users[0].email, password: 'fixture-password' })).status, 403);
    assert.equal((await request('/auth/technician/login', { email: users[0].email, password: 'fixture-password' })).status, 403);
    const customer = await request('/auth/customer/register', signup('customer@example.test'));
    assert.equal(customer.status, 201);
    assert.equal(users[1].registrationPortal, 'customer');
    assert.equal((await request('/auth/customer/login', { email: users[1].email, password: 'fixture-password' })).status, 200);
    assert.equal((await request('/auth/owner/login', { email: users[1].email, password: 'fixture-password' })).status, 403);
    assert.equal((await request('/auth/technician/register', signup('forged@example.test'))).status, 404);
    assert.equal((await request('/auth/owner/register', { ...signup('forged@example.test'), registrationPortal: 'technician' })).status, 400);
    loginLimiter.resetKey('127.0.0.1'); authLimiter.resetKey('127.0.0.1');

    const shop = { _id: new mongoose.Types.ObjectId(), ownerId: users[0]._id, name: 'Fixture Shop', isActive: true };
    businesses.push(shop);
    const invitePath = `/businesses/${shop._id}/technicians/invitations`;
    const invited = await request(invitePath, { name: 'Invited Technician', email: 'technician@example.test' }, owner.data.accessToken);
    assert.equal(invited.status, 201);
    const rawToken = invited.data.token;
    assert.ok(rawToken);
    const expiresAt = technicians[0].invitationExpiresAt;
    technicians[0].invitationExpiresAt = new Date(0);
    assert.equal((await request('/technician-invitations/inspect', { token: rawToken })).status, 400);
    technicians[0].invitationExpiresAt = expiresAt;
    assert.equal((await request('/technician-invitations/activate', { token: 'invalid-token-value', password: 'fixture-password', confirmPassword: 'fixture-password' })).status, 400);
    assert.equal((await request('/technician-invitations/activate', { token: rawToken, password: 'fixture-password', confirmPassword: 'different' })).status, 400);
    subscriptionActive = false;
    assert.equal((await request('/technician-invitations/activate', { token: rawToken, password: 'technician-password', confirmPassword: 'technician-password' })).status, 403);
    assert.equal(users.length, 2);
    subscriptionActive = true;
    const activated = await request('/technician-invitations/activate', { token: rawToken, password: 'technician-password', confirmPassword: 'technician-password' });
    assert.equal(activated.status, 201);
    const techUser = users.find((user) => user.email === 'technician@example.test');
    assert.equal(techUser.registrationPortal, 'technician');
    assert.equal(techUser.isEmailVerified, true);
    assert.notEqual(techUser.password, 'technician-password');
    assert.equal(technicians[0].status, 'active');
    assert.equal(technicians[0].invitationTokenHash, undefined);
    assert.equal((await request('/technician-invitations/activate', { token: rawToken, password: 'technician-password', confirmPassword: 'technician-password' })).status, 400);
    const techLogin = await request('/auth/technician/login', { email: techUser.email, password: 'technician-password' });
    assert.equal(techLogin.status, 200);
    assert.equal((await request('/auth/owner/login', { email: techUser.email, password: 'technician-password' })).status, 403);
    assert.equal((await request('/auth/customer/login', { email: techUser.email, password: 'technician-password' })).status, 403);
    loginLimiter.resetKey('127.0.0.1'); authLimiter.resetKey('127.0.0.1');
    assert.equal((await request(invitePath, { name: 'Forbidden Invite', email: 'other@example.test' }, techLogin.data.accessToken)).status, 403);
    assert.equal((await request(invitePath, { name: 'Forbidden Invite', email: 'other@example.test' }, customer.data.accessToken)).status, 403);

    // An existing account must authenticate and retain the previous verified-email acceptance checks.
    const existing = await request(invitePath, { name: 'Existing Customer', email: users[1].email }, owner.data.accessToken);
    assert.equal(existing.status, 201);
    const existingToken = existing.data.token;
    assert.equal((await request('/technician-invitations/activate', { token: existingToken, password: 'takeover-password', confirmPassword: 'takeover-password' })).status, 409);
    assert.equal((await request('/auth/technician/login', { email: users[1].email, password: 'fixture-password', invitationToken: existingToken })).status, 200);
    assert.equal((await request('/technician-invitations/accept', { token: existingToken }, customer.data.accessToken)).status, 400);
    assert.equal((await request('/technician-invitations/accept', { token: existingToken }, owner.data.accessToken)).status, 403);
    users[1].isEmailVerified = true;
    const accepted = await request('/technician-invitations/accept', { token: existingToken }, customer.data.accessToken);
    assert.equal(accepted.status, 200);
    assert.equal(accepted.data.membership.role, 'technician');
    assert.equal(accepted.data.membership.businessId, shop._id.toString());
    assert.equal((await request('/auth/technician/login', { email: users[1].email, password: 'fixture-password' })).status, 200);
  } finally {
    server.closeAllConnections(); await new Promise((resolve) => server.close(resolve));
    for (const restore of restorers.reverse()) restore();
  }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import './helpers/service-request-fixture.mjs';
import express from 'express';
import session from 'express-session';
import mongoose from 'mongoose';
import { smtpFixture } from './helpers/smtp-fixture.mjs';
import { User } from '../dist/models/User.model.js';
import { Business } from '../dist/models/Business.model.js';
import { Customer } from '../dist/models/Customer.model.js';
import { Technician } from '../dist/models/Technician.model.js';
import { BusinessSubscription } from '../dist/models/BusinessSubscription.model.js';
import { accountSecurityStore, authSessionStore } from '../dist/lib/redis/index.js';
import { config } from '../dist/core/config/index.js';
import { transporter } from '../dist/lib/mail/config.js';
import { mailService } from '../dist/lib/mail/index.js';
import { authRoutes } from '../dist/modules/auth/index.js';
import { passwordRecovery } from '../dist/modules/auth/password-recovery.service.js';
import { verifyCsrfToken } from '../dist/core/security/csrf.js';
import { authLimiter, passwordResetLimiter } from '../dist/core/security/rate-limiter.js';

test('all roles receive SMTP email codes/links and can reset once with role-bound expiring grants', async () => {
  const smtp = await smtpFixture();
  const localTransport = nodemailer.createTransport({ host: '127.0.0.1', port: smtp.port, secure: false, ignoreTLS: true });
  const restorers = [], captured = [], revoked = [];
  let now = 100000, technicianActive = false;
  const invitationBusinessId = new mongoose.Types.ObjectId();
  const originalInvitationHash = crypto.createHash('sha256').update('original-fixture-invitation').digest('hex');
  const pendingTechnician = Technician.hydrate({ _id: new mongoose.Types.ObjectId(), businessId: invitationBusinessId, name: 'Pending Technician', email: 'pending@example.test', status: 'pending', invitationTokenHash: originalInvitationHash, invitationExpiresAt: new Date(Date.now() + 7 * 86400000) });
  pendingTechnician.save = async () => pendingTechnician;
  const grants = new Map(), current = new Map();
  const hash = (value) => crypto.createHash('sha256').update(value).digest('hex');
  function replace(target, key, value) { const old = target[key]; target[key] = value; restorers.push(() => { target[key] = old; }); }
  const users = await Promise.all(['owner', 'customer', 'technician'].map(async (portal) => {
    const doc = User.hydrate({ _id: new mongoose.Types.ObjectId(), firstName: 'Example', lastName: 'User', email: `${portal}@example.test`, password: await bcrypt.hash('previous-password', 4), registrationPortal: portal, status: 'active', authVersion: 0 });
    doc.save = async () => { doc.password = await bcrypt.hash(doc.password, 4); doc.authVersion += 1; return doc; };
    return doc;
  }));
  const query = (user) => ({ select: async () => user });
  replace(User, 'findOne', ({ email }) => query(users.find((user) => user.email === email) || null));
  replace(User, 'findById', (id) => query(users.find((user) => user.id === id) || null));
  replace(User, 'exists', async ({ email }) => users.some((user) => user.email === email));
  replace(User, 'create', async (data) => {
    const user = new User(data);
    assert.equal(user.validateSync(), undefined);
    user.password = await bcrypt.hash(data.password, 4);
    users.push(user);
    return user;
  });
  replace(Business, 'exists', async () => false);
  replace(Customer, 'exists', async () => false);
  replace(Technician, 'exists', async ({ userId }) => technicianActive && String(userId) === users[2].id || pendingTechnician.status === 'active' && String(userId) === String(pendingTechnician.userId));
  replace(Technician, 'findOne', (filter) => {
    const matches = Object.entries(filter).every(([key, value]) =>
      value && typeof value === 'object' && '$gt' in value ? pendingTechnician[key] > value.$gt : String(pendingTechnician[key]) === String(value));
    const doc = matches ? pendingTechnician : null;
    return { select: async () => doc, then: (ok, fail) => Promise.resolve(doc).then(ok, fail) };
  });
  replace(Technician, 'countDocuments', async () => 0);
  replace(Business, 'findById', async () => ({ _id: invitationBusinessId, name: 'Fixture Shop', isActive: true }));
  replace(BusinessSubscription, 'findOne', async () => ({ packageSnapshot: { maxTechnicians: 10 } }));
  replace(authSessionStore, 'revokeAll', async (id) => { revoked.push(id); });
  // Isolate Redis persistence; expiry, consumption, and identity checks are exercised through actual API/service calls.
  replace(accountSecurityStore, 'createPasswordReset', async (grant, token, code) => {
    const key = `${grant.portal}:${grant.email}`;
    const old = grants.get(current.get(key));
    if (old && old.expiresAt > now && now - old.createdAt < 60) return false;
    grants.delete(current.get(key)); current.set(key, hash(token));
    grants.set(hash(token), { ...grant, key, codeHash: hash(code), attempts: 0, createdAt: now, codeExpiresAt: now + 300, expiresAt: now + 900 });
    return true;
  });
  replace(accountSecurityStore, 'exchangePasswordResetCode', async (email, portal, code, token) => {
    const key = `${portal}:${email}`, oldHash = current.get(key), grant = grants.get(oldHash);
    if (!grant || grant.expiresAt <= now || grant.codeExpiresAt <= now || !grant.codeHash) return false;
    if (grant.codeHash !== hash(code)) {
      if (++grant.attempts >= 5) { grants.delete(oldHash); current.delete(key); }
      return false;
    }
    grants.delete(oldHash); grant.codeHash = undefined; current.set(key, hash(token)); grants.set(hash(token), grant); return true;
  });
  replace(accountSecurityStore, 'consumePasswordReset', async (token, portal) => {
    const grant = grants.get(hash(token));
    if (!grant || grant.portal !== portal || grant.expiresAt <= now || current.get(grant.key) !== hash(token)) return null;
    grants.delete(hash(token)); current.delete(grant.key); return grant;
  });
  replace(accountSecurityStore, 'discardPasswordReset', async (token) => {
    const grant = grants.get(hash(token));
    if (grant && current.get(grant.key) === hash(token)) current.delete(grant.key);
    grants.delete(hash(token));
  });
  const originalSmtp = { ...config.smtp };
  config.smtp.enabled = true; config.smtp.from = 'no-reply@example.test';
  replace(transporter, 'verify', localTransport.verify.bind(localTransport));
  replace(transporter, 'sendMail', localTransport.sendMail.bind(localTransport));
  const sendTemplate = mailService.sendTemplate;
  replace(mailService, 'sendTemplate', async (options) => { captured.push(options); return sendTemplate.call(mailService, options); });
  const app = express();
  app.use(express.json());
  app.use(session({ secret: 'isolated-password-recovery-session-secret', resave: false, saveUninitialized: false }));
  app.use('/api/v1', verifyCsrfToken); app.use('/api/v1/auth', authRoutes);
  app.use((error, _req, res, _next) => res.status(error.statusCode || 500).json({ code: error.publicCode }));
  const server = app.listen(0, '127.0.0.1'); await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}/api/v1/auth`;
  const boot = await fetch(`${base}/csrf-token`);
  const cookie = boot.headers.getSetCookie().map((value) => value.split(';')[0]).join('; ');
  const csrf = (await boot.json()).data.csrfToken;
  const resetLimits = () => { authLimiter.resetKey('127.0.0.1'); passwordResetLimiter.resetKey('127.0.0.1'); };
  async function request(portal, action, body) {
    const response = await fetch(`${base}/${portal}/${action}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: cookie, 'X-CSRF-Token': csrf }, body: JSON.stringify(body) });
    const payload = await response.json();
    await passwordRecovery.waitForDeliveries();
    return { status: response.status, body: payload };
  }
  async function start(portal) {
    now += 61;
    const before = smtp.messages.length;
    assert.equal((await request(portal, 'forgot-password', { email: `${portal}@example.test` })).status, 200);
    assert.equal(smtp.messages.length, before + 1);
    const email = captured.at(-1);
    assert.match(email.data.otp, /^\d{6}$/);
    assert.ok(smtp.messages.at(-1).includes(email.data.otp), 'Code must be in the actual SMTP message');
    assert.ok(email.data.resetUrl.includes(`/${portal}/reset-password#token=`));
    const token = new URL(email.data.resetUrl).hash.slice('#token='.length);
    assert.equal(grants.has(token), false, 'Stored token keys must be hashed');
    return { token, code: email.data.otp };
  }
  const resetBody = (token) => ({ resetToken: token, password: 'replacement-password', confirmPassword: 'replacement-password' });
  try {
    const unknown = await request('customer', 'forgot-password', { email: 'missing@example.test' });
    const wrongRole = await request('customer', 'forgot-password', { email: users[0].email });
    const inactiveTech = await request('technician', 'forgot-password', { email: users[2].email });
    assert.deepEqual(wrongRole, unknown); assert.deepEqual(inactiveTech, unknown); assert.equal(smtp.messages.length, 0);
    technicianActive = true;
    for (const [index, portal] of ['owner', 'customer', 'technician'].entries()) {
      resetLimits();
      const receipt = await start(portal);
      const sameResponse = await request(portal, 'forgot-password', { email: users[index].email });
      assert.deepEqual(sameResponse, unknown, 'Cooldown must not enumerate the account');
      assert.equal((await request(portal === 'owner' ? 'customer' : 'owner', 'reset-password', resetBody(receipt.token))).status, 400);
      let token = receipt.token;
      if (portal === 'customer') {
        const verified = await request(portal, 'verify-reset-otp', { email: users[index].email, otp: receipt.code });
        assert.equal(verified.status, 200); token = verified.body.data.resetToken;
        assert.equal((await request(portal, 'verify-reset-otp', { email: users[index].email, otp: receipt.code })).status, 400);
        assert.equal((await request(portal, 'reset-password', resetBody(receipt.token))).status, 400);
      }
      const simultaneous = await Promise.all([request(portal, 'reset-password', resetBody(token)), request(portal, 'reset-password', resetBody(token))]);
      assert.deepEqual(simultaneous.map((result) => result.status).sort(), [200, 400]);
      assert.equal(await users[index].comparePassword('replacement-password'), true);
      assert.equal(await users[index].comparePassword('previous-password'), false);
      assert.notEqual(users[index].password, 'replacement-password'); assert.ok(revoked.includes(users[index].id));
    }
    // Pending technicians receive a code that can create their first password without replacing the invitation.
    resetLimits();
    const beforeInvitation = smtp.messages.length;
    const pendingResponse = await request('technician', 'forgot-password', { email: pendingTechnician.email });
    assert.deepEqual(pendingResponse, unknown, 'Pending invitations must not expose account existence');
    assert.equal(smtp.messages.length, beforeInvitation + 1, 'A technician without an account must receive an email to create their first password');
    const invitationEmail = captured.at(-1);
    assert.equal(invitationEmail.template, 'reset-password');
    assert.match(invitationEmail.data.otp, /^\d{6}$/);
    assert.ok(smtp.messages.at(-1).includes(invitationEmail.data.otp), 'The pending technician code must be present in the delivered SMTP message');
    assert.equal(pendingTechnician.invitationTokenHash, originalInvitationHash, 'Recovery must preserve the original seven-day invitation');
    assert.deepEqual(await request('technician', 'forgot-password', { email: pendingTechnician.email }), unknown);
    assert.equal(smtp.messages.length, beforeInvitation + 1, 'Repeated requests must respect the invitation email cooldown');
    const codeResult = await request('technician', 'verify-reset-otp', { email: pendingTechnician.email, otp: invitationEmail.data.otp });
    assert.equal(codeResult.status, 200);
    const beforeActivation = users.length;
    pendingTechnician.status = 'inactive';
    assert.equal((await request('technician', 'reset-password', resetBody(codeResult.body.data.resetToken))).status, 400, 'Revoked invitations cannot create a new account');
    assert.equal(users.length, beforeActivation);
    pendingTechnician.status = 'pending';
    now += 61;
    await request('technician', 'forgot-password', { email: pendingTechnician.email });
    const newCode = captured.at(-1).data.otp;
    const verifiedSetup = await request('technician', 'verify-reset-otp', { email: pendingTechnician.email, otp: newCode });
    assert.equal(verifiedSetup.status, 200);
    assert.equal((await request('technician', 'reset-password', resetBody(verifiedSetup.body.data.resetToken))).status, 200);
    assert.equal(users.length, beforeActivation + 1);
    assert.equal(pendingTechnician.status, 'active');
    const activatedUser = users.find((user) => user.email === pendingTechnician.email);
    assert.equal(activatedUser.id, String(pendingTechnician.userId));
    assert.equal(await activatedUser.comparePassword('replacement-password'), true);
    assert.equal((await request('technician', 'reset-password', resetBody(verifiedSetup.body.data.resetToken))).status, 400);
    resetLimits();
    const expired = await start('owner'); now += 901;
    assert.equal((await request('owner', 'reset-password', resetBody(expired.token))).status, 400);
    const oldCode = await start('customer'); now += 301;
    assert.equal((await request('customer', 'verify-reset-otp', { email: users[1].email, otp: oldCode.code })).status, 400);
    assert.equal((await request('customer', 'reset-password', resetBody(oldCode.token))).status, 200);
    resetLimits();
    const attempts = await start('technician');
    for (let i = 0; i < 5; i++) assert.equal((await request('technician', 'verify-reset-otp', { email: users[2].email, otp: attempts.code === '111111' ? '222222' : '111111' })).status, 400);
    assert.equal((await request('technician', 'reset-password', resetBody(attempts.token))).status, 400);
    resetLimits(); smtp.reject(true);
    const failed = await request('owner', 'forgot-password', { email: users[0].email });
    assert.deepEqual(failed, unknown);
    assert.equal(grants.size, 0, 'Failed delivery must not leave usable reset credentials');
    config.smtp.enabled = false;
    assert.deepEqual(await request('owner', 'forgot-password', { email: users[0].email }), await request('owner', 'forgot-password', { email: 'missing@example.test' }));
    assert.equal((await request('customer', 'forgot-password', { email: users[1].email })).status, 503);
    resetLimits(); config.smtp.enabled = true; smtp.reject(false);
    for (let i = 0; i < 20; i++) assert.equal((await request('customer', 'forgot-password', { email: 'missing@example.test' })).status, 200);
    assert.equal((await request('customer', 'forgot-password', { email: 'missing@example.test' })).status, 429, 'Recovery must retain the existing rate limit');
  } finally {
    server.closeAllConnections(); await new Promise((resolve) => server.close(resolve));
    localTransport.close(); await smtp.close();
    Object.assign(config.smtp, originalSmtp);
    for (const restore of restorers.reverse()) restore();
  }
});

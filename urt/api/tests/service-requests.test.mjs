import assert from 'node:assert/strict';
import test from 'node:test';
import { serviceRequestFixture } from './helpers/service-request-fixture.mjs';

test('public intake creates trackable guest tickets and preserves authenticated ownership', async () => {
  const fixture = serviceRequestFixture();
  const server = fixture.app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}/api/v1`;
  const input = { customer: { name: 'Guest Customer', phone: '081234567890' }, device: { category: 'Laptop', brand: 'Asus' }, complaint: 'Screen is broken' };
  async function submit(body = input, headers = { 'X-CSRF-Token': fixture.csrf }) {
    return fetch(`${base}/public/businesses/repair-a/service-requests`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body),
    });
  }
  try {
    assert.equal((await submit(input, {})).status, 403);
    assert.equal((await submit({ ...input, device: { category: 'Laptop' } })).status, 400);
    assert.equal((await submit({ ...input, customerId: 'forged-customer' })).status, 400);
    fixture.subscribe(false);
    assert.equal((await submit()).status, 403);
    fixture.subscribe(true);
    const result = await submit();
    assert.equal(result.status, 201);
    const { data: receipt } = await result.json();
    fixture.verifyReceipt(receipt);
    assert.equal(receipt.ticketId, undefined);
    assert.equal(fixture.contacts[0].userId, undefined);
    assert.equal(fixture.contacts[0].phone, '+6281234567890');
    assert.equal(fixture.tickets[0].device.model, '');
    const lookup = async (trackingSecret) => fetch(`${base}/public/tracking`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': fixture.csrf },
      body: JSON.stringify({ businessSlug: receipt.businessSlug, ticketCode: receipt.ticketCode, trackingSecret }),
    });
    assert.equal((await lookup('incorrect')).status, 404);
    const tracked = await lookup(receipt.trackingSecret);
    assert.equal(tracked.status, 200);
    const progress = (await tracked.json()).data;
    assert.equal(progress.ticketCode, receipt.ticketCode);
    assert.equal(progress.customer, undefined);
    assert.equal(progress.trackingSecretHash, undefined);
    assert.equal(progress.timeline[0].actorId, undefined);

    const authHeaders = { 'X-CSRF-Token': fixture.csrf, Authorization: 'Bearer fixture-token' };
    const signedIn = await submit(input, authHeaders);
    assert.equal(signedIn.status, 201);
    fixture.verifyReceipt((await signedIn.json()).data);
    assert.equal(fixture.contacts.length, 2, 'Matching phone must not claim the unrelated guest record');
    assert.equal(String(fixture.contacts[1].userId), fixture.user.id);
    assert.equal(fixture.contacts[0].userId, undefined);
    assert.equal((await submit(input, authHeaders)).status, 201);
    assert.equal(fixture.contacts.length, 2, 'Authenticated requests reuse only their own contact');
    const legacy = await fetch(`${base}/businesses/${fixture.shop._id}/tickets`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify({ device: { category: 'Laptop', brand: 'Asus', model: 'Existing model' }, complaint: 'Existing authenticated submission', intakeMethod: 'online' }),
    });
    assert.equal(legacy.status, 201, 'The existing authenticated ticket API remains functional');
    assert.equal(fixture.contacts.length, 2);
    const legacyAnonymous = await fetch(`${base}/businesses/${fixture.shop._id}/tickets`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': fixture.csrf }, body: JSON.stringify(input),
    });
    assert.equal(legacyAnonymous.status, 401, 'Normal protected ticket endpoints still require authentication');
    assert.equal((await submit(input, { ...authHeaders, Authorization: 'Bearer invalid' })).status, 401);
    for (let i = 0; i < 20; i++) {
      const response = await submit({ ...input, device: {} });
      if (response.status === 429) break;
    }
    assert.equal((await submit()).status, 429);
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    fixture.restore();
  }
});

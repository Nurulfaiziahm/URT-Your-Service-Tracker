import assert from 'node:assert/strict';
import test from 'node:test';
import mongoose from 'mongoose';
import { serviceRequestFixture } from './helpers/service-request-fixture.mjs';
import { TicketService } from '../dist/modules/ticket/ticket.service.js';
import { ReportService } from '../dist/modules/report/report.service.js';
import { Service } from '../dist/models/Service.model.js';

test('only the owner can delete anonymous tickets; accounts, business scope and stale revisions are protected', async () => {
  const fixture = serviceRequestFixture();
  fixture.addTechnician({ userId: fixture.user.id });
  const server = fixture.app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}/api/v1`;
  const businessId = String(fixture.shop._id);
  const auth = { Authorization: 'Bearer fixture-token' };
  async function request(path, method = 'GET', body, headers = auth) {
    const response = await fetch(`${base}${path}`, { method, headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': fixture.csrf, ...headers }, ...(body && { body: JSON.stringify(body) }) });
    return { status: response.status, body: await response.json() };
  }
  const input = { customer: { name: 'Anonymous', phone: '081234567890' }, device: { category: 'Laptop', brand: 'Asus' }, complaint: 'Test intake' };
  try {
    const guest = await request('/public/businesses/repair-a/service-requests', 'POST', input, {});
    const registered = await request('/public/businesses/repair-a/service-requests', 'POST', input);
    assert.equal(guest.status, 201); assert.equal(registered.status, 201);
    const ticket = fixture.tickets[0], linkedTicket = fixture.tickets[1];
    const path = `/businesses/${businessId}/tickets/${ticket._id}`;
    const linkedPath = `/businesses/${businessId}/tickets/${linkedTicket._id}`;
    ticket.status = 'diagnosing';
    const difficulty = await Service.create({ businessId, entryType: 'difficulty', difficultyLevel: 'low', name: 'Jasa Rendah', category: 'Jasa', basePrice: 0 });
    await TicketService.submitEstimate(businessId, String(ticket._id), fixture.user.id, { expectedRevision: ticket.revision,
      lines: [{ type: 'labor', description: 'Repair', quantity: 1, unitPrice: 100000 }, { catalogItemId: String(difficulty._id), type: 'labor', description: difficulty.name, quantity: 1, unitPrice: 0 }], customerExplanation: 'Repair needed',
      targetCompletionDate: new Date(Date.now() + 3600000) });
    const access = await TicketService.createCustomerApprovalLink(businessId, String(ticket._id), fixture.user.id, 1);
    const proof = new URLSearchParams(new URL(access.approvalUrl).hash.slice(1)).get('token');
    const dashboard = () => ReportService.getDashboard(businessId, fixture.user.id, ['technician'], 'technician');
    assert.equal((await dashboard()).stats.urgentCount, 1);

    assert.equal((await request(path, 'DELETE', { expectedRevision: ticket.revision }, {})).status, 401);
    fixture.signIn(true, 'technician');
    assert.equal((await request(path, 'DELETE', { expectedRevision: ticket.revision })).status, 403);
    fixture.signIn(true, 'customer');
    assert.equal((await request(path, 'DELETE', { expectedRevision: ticket.revision })).status, 403);
    fixture.signIn(true, 'owner');
    const anonymousView = (await request(path)).body.data.ticket;
    const accountView = (await request(linkedPath)).body.data.ticket;
    assert.equal(anonymousView.allowedActions.includes('delete_ticket'), true);
    assert.equal(accountView.allowedActions.includes('delete_ticket'), false);
    assert.equal(anonymousView.customer.userId, undefined, 'Private linkage is used for permissions, not serialized to the customer object');
    assert.equal((await request(linkedPath, 'DELETE', { expectedRevision: linkedTicket.revision })).status, 403);
    assert.equal((await request(path, 'DELETE', { expectedRevision: ticket.revision + 1 })).status, 409);
    assert.equal((await request(path, 'DELETE', {})).status, 400);
    assert.equal((await request(path, 'DELETE', { expectedRevision: ticket.revision, userId: null })).status, 400);
    const actualBusinessId = ticket.businessId;
    ticket.businessId = new mongoose.Types.ObjectId();
    assert.equal((await request(path, 'DELETE', { expectedRevision: ticket.revision })).status, 404);
    ticket.businessId = actualBusinessId;

    const contact = fixture.contacts[0];
    contact.userId = new mongoose.Types.ObjectId();
    assert.equal((await request(path, 'DELETE', { expectedRevision: ticket.revision })).status, 403, 'Recheck current account linkage even if an old page showed a delete button');
    contact.userId = undefined;
    assert.equal((await request(path, 'DELETE', { expectedRevision: ticket.revision })).status, 200);
    assert.ok(ticket.deletedAt instanceof Date);
    assert.equal(String(ticket.deletedBy), fixture.user.id);
    assert.equal(ticket.nextDeadlineAt, undefined);
    assert.equal(ticket.timeline.at(-1).action, 'ticket_deleted');
    assert.equal((await request(path)).status, 404);
    assert.equal((await request(path, 'DELETE', { expectedRevision: ticket.revision })).status, 404);
    assert.equal((await request(`${path}/diagnosis`, 'PUT', { expectedRevision: ticket.revision, customerExplanation: 'Should not save' })).status, 404);
    assert.equal((await request(`/businesses/${businessId}/tickets?q=${ticket.ticketCode}`)).body.data.length, 0);
    assert.equal((await request(linkedPath)).status, 200);
    const after = await dashboard();
    assert.equal(after.stats.urgentCount, 0);
    assert.equal(after.deadlineTickets.length, 0);
    assert.equal(after.recentTickets.some((entry) => entry.id === String(ticket._id)), false);
    assert.equal((await request('/public/tracking', 'POST', { businessSlug: 'repair-a', ticketCode: guest.body.data.ticketCode, trackingSecret: guest.body.data.trackingSecret }, {})).status, 404);
    assert.equal((await request('/public/service-approvals/inspect', 'POST', { token: proof }, {})).status, 400);
    assert.equal(fixture.contacts.length, 2, 'Deleting a ticket does not delete a customer contact');
    assert.equal(linkedTicket.deletedAt, undefined);
  } finally {
    server.closeAllConnections(); await new Promise((resolve) => server.close(resolve)); fixture.restore();
  }
});

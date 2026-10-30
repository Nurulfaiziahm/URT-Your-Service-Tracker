import assert from 'node:assert/strict';
import test from 'node:test';
import './helpers/service-request-fixture.mjs';
import mongoose from 'mongoose';
import { ServiceTicket } from '../dist/models/ServiceTicket.model.js';
import { Technician } from '../dist/models/Technician.model.js';
import { Customer } from '../dist/models/Customer.model.js';
import { Business } from '../dist/models/Business.model.js';
import { TicketService } from '../dist/modules/ticket/ticket.service.js';
import { serializeTicket } from '../dist/modules/ticket/ticket.serializer.js';
import { serviceRequestFixture } from './helpers/service-request-fixture.mjs';
import { ReportService } from '../dist/modules/report/report.service.js';
import { Service } from '../dist/models/Service.model.js';

test('assigned technician receives intake, obtains price approval, and confirms repair and QC separately with stage deadlines', async (t) => {
  const now = Date.now(); t.mock.timers.enable({ apis: ['Date'], now });
  const businessId = new mongoose.Types.ObjectId(), technicianUserId = new mongoose.Types.ObjectId(), customerUserId = new mongoose.Types.ObjectId();
  const customer = new Customer({ businessId, userId: customerUserId, name: 'Customer', phone: '+6281234567890' });
  const technician = new Technician({ businessId, userId: technicianUserId, name: 'Technician', email: 'tech@example.test', status: 'active' });
  const ticket = new ServiceTicket({ businessId, customerId: customer, assignedTechnicianId: technician._id, ticketCode: 'URT-WORKFLOW', device: { category: 'Laptop', brand: 'Asus', model: 'X' }, complaint: 'Screen does not work', intakeMethod: 'online', status: 'submitted', revision: 1 });
  const restorers = [];
  function replace(target, key, value) { const previous = target[key]; target[key] = value; restorers.push(() => { target[key] = previous; }); }
  replace(Business, 'findById', async () => ({ _id: businessId, isActive: true, name: 'Fixture Shop' }));
  replace(Technician, 'findOne', async (query) => String(query.userId) === String(technicianUserId) ? technician : null);
  replace(ServiceTicket, 'findOne', () => ({ populate() { return this; }, then(ok, fail) { return Promise.resolve(ticket).then(ok, fail); } }));
  const difficulty = new Service({ businessId, entryType: 'difficulty', difficultyLevel: 'low', name: 'Jasa Rendah', category: 'Jasa', basePrice: 0 });
  replace(Service, 'find', async () => [difficulty]);
  ticket.save = async () => { assert.equal(ticket.validateSync(), undefined); return ticket; };
  ticket.populate = async () => ticket;
  const transition = (targetStatus, extra = {}) => TicketService.transitionTicket(String(businessId), String(ticket._id), String(technicianUserId), 'technician', { expectedRevision: ticket.revision, targetStatus, ...extra });
  try {
    await transition('waiting_diagnosis');
    assert.equal(ticket.status, 'waiting_diagnosis');
    await transition('diagnosing');
    const targetCompletionDate = new Date(now + 24 * 3600000);
    await TicketService.submitEstimate(String(businessId), String(ticket._id), String(technicianUserId), {
      expectedRevision: ticket.revision, customerExplanation: 'Replace damaged screen', lines: [{ type: 'part', description: 'New screen', quantity: 1, unitPrice: 150000 }, { catalogItemId: String(difficulty._id), type: 'labor', description: difficulty.name, quantity: 1, unitPrice: 0 }],
      repairDurationMinutes: 120, qcDurationMinutes: 30, targetCompletionDate,
    });
    assert.equal(ticket.estimateRevisions[0].repairDurationMinutes, 120);
    assert.equal(ticket.estimateRevisions[0].qcDurationMinutes, 30);
    assert.equal(ticket.estimateRevisions[0].totalAmount, 150000);
    await assert.rejects(transition('repairing'), /Cannot transition/);
    await TicketService.respondToEstimate(String(businessId), String(ticket._id), String(customerUserId), { expectedRevision: ticket.revision, estimateVersion: 1, decision: 'approved' });
    await transition('repairing');
    assert.equal(ticket.nextDeadlineAt.getTime(), now + 120 * 60000);
    await assert.rejects(transition('completed', { qcPassed: true }), /quality check/);
    await transition('quality_check', { workSummary: 'Screen replaced and working' });
    assert.equal(ticket.status, 'quality_check');
    assert.equal(ticket.nextDeadlineAt.getTime(), now + 30 * 60000);
    assert.equal(serializeTicket(ticket, 'customer').status, 'quality_check');
    t.mock.timers.setTime(now + 2 * 86400000);
    assert.equal(ticket.status, 'quality_check', 'Estimated time passing must not claim repair completion or a QC pass');
    await transition('completed', { qcPassed: true, qcNotes: 'Display and ports tested' });
    assert.equal(ticket.status, 'completed');
    assert.equal(ticket.nextDeadlineAt, undefined);
  } finally { for (const restore of restorers.reverse()) restore(); }
});

test('guest approval is scoped to assigned staff and current estimate, expires in seven days, and deadlines sort before pagination', async (t) => {
  const now = Date.now(); t.mock.timers.enable({ apis: ['Date'], now });
  const fixture = serviceRequestFixture();
  const tech = fixture.addTechnician({ userId: fixture.user.id });
  const otherTech = fixture.addTechnician();
  const businessId = String(fixture.shop._id);
  try {
    const customer = await Customer.create({ businessId, name: 'Guest', phone: '+6281234567890' });
    const difficulty = await Service.create({ businessId, entryType: 'difficulty', difficultyLevel: 'low', name: 'Jasa Rendah', category: 'Jasa', basePrice: 0 });
    const ticket = await ServiceTicket.create({ businessId, customerId: customer._id, assignedTechnicianId: tech._id, ticketCode: 'URT-GUEST', device: { category: 'Laptop', model: 'X' }, complaint: 'Keyboard fault', intakeMethod: 'online', status: 'diagnosing', revision: 1 });
    const ticketId = String(ticket._id);
    await TicketService.submitEstimate(businessId, ticketId, fixture.user.id, { expectedRevision: 1, customerExplanation: 'Replace keyboard', lines: [{ type: 'labor', description: 'Repair', quantity: 1, unitPrice: 150000 }, { catalogItemId: String(difficulty._id), type: 'labor', description: difficulty.name, quantity: 1, unitPrice: 0 }], repairDurationMinutes: 120, qcDurationMinutes: 30, targetCompletionDate: new Date(now + 86400000) });
    await assert.rejects(TicketService.createCustomerApprovalLink(businessId, ticketId, String(otherTech.userId), 1));
    await assert.rejects(TicketService.createCustomerApprovalLink(businessId, ticketId, fixture.user.id, 2), /perbarui/);
    const access = await TicketService.createCustomerApprovalLink(businessId, ticketId, fixture.user.id, 1);
    const token = new URLSearchParams(new URL(access.approvalUrl).hash.slice(1)).get('token');
    assert.equal(access.expiresAt.getTime(), now + 7 * 86400000);
    const preview = await TicketService.inspectCustomerApproval(token);
    assert.equal(preview.estimate.totalAmount, 150000);
    assert.equal(preview.estimate.qcDurationMinutes, 30);
    for (const key of ['customer', 'customerId', 'staffFindings', 'trackingSecretHash', 'assignedTechnicianId']) assert.equal(preview[key], undefined);
    await assert.rejects(TicketService.inspectCustomerApproval('f'.repeat(64)), /tidak valid/);
    ticket.estimateRevisions[0].version = 2;
    await assert.rejects(TicketService.inspectCustomerApproval(token), /diperbarui/);
    ticket.estimateRevisions[0].version = 1;
    t.mock.timers.setTime(now + 7 * 86400000);
    await assert.rejects(TicketService.inspectCustomerApproval(token), /kedaluwarsa/);
    t.mock.timers.setTime(now + 7 * 86400000 - 1);
    assert.equal((await TicketService.inspectCustomerApproval(token)).ticketCode, 'URT-GUEST');
    t.mock.timers.setTime(now);
    await assert.rejects(TicketService.respondToCustomerApproval(token, { expectedRevision: 1, decision: 'approved' }), /modified/);
    await TicketService.respondToCustomerApproval(token, { expectedRevision: ticket.revision, decision: 'approved' });
    assert.equal(ticket.status, 'approved');
    await assert.rejects(TicketService.respondToCustomerApproval(token, { expectedRevision: ticket.revision, decision: 'approved' }), /not currently awaiting/);
    await ServiceTicket.create({ businessId, customerId: customer._id, assignedTechnicianId: tech._id, ticketCode: 'URT-URGENT', device: { category: 'Laptop', model: 'Y' }, complaint: 'Urgent fault', intakeMethod: 'online', status: 'repairing', revision: 1, nextDeadlineAt: new Date(now + 3600000) });
    await ServiceTicket.create({ businessId, customerId: customer._id, assignedTechnicianId: otherTech._id, ticketCode: 'URT-OTHER', device: { category: 'Laptop', model: 'Z' }, complaint: 'Other fault', intakeMethod: 'online', status: 'repairing', revision: 1, nextDeadlineAt: new Date(now - 3600000) });
    const page = await TicketService.getTickets(businessId, fixture.user.id, 'technician', { page: 1, limit: 1 });
    assert.equal(page.total, 2);
    assert.equal(page.tickets[0].ticketCode, 'URT-URGENT');
    const dashboard = await ReportService.getDashboard(businessId, fixture.user.id, ['technician'], 'technician');
    assert.equal(dashboard.stats.urgentCount, 2);
    assert.deepEqual(dashboard.deadlineTickets.map((entry) => entry.ticketCode), ['URT-URGENT', 'URT-GUEST']);
  } finally { fixture.restore(); }
});

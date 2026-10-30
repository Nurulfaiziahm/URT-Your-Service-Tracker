import assert from 'node:assert/strict';
import test from 'node:test';
import { customerPortalReturn } from '../src/features/customer/customer-return.ts';
import { customerServiceUpdate, whatsappMessageLink } from '../src/features/tickets/whatsapp.ts';

test('customer back navigation retains the shop from service and private tracking links', () => {
  for (const pathname of ['/b/repair-a/customer', '/b/repair-a/customer/services/ticket', '/b/repair-a/services/new']) {
    assert.equal(customerPortalReturn({ pathname }), '/b/repair-a/customer');
  }
  assert.equal(customerPortalReturn({ pathname: '/tracking/TEST', hash: '#business=repair-a&access=private' }), '/b/repair-a/customer');
  assert.equal(customerPortalReturn({ pathname: '//external.example' }), '/customer');
  assert.equal(customerPortalReturn(), '/customer');
});

test('WhatsApp update targets the customer and includes only customer-facing service information', () => {
  const ticket = { status: 'awaiting_approval', ticketCode: 'URT-TEST', device: { category: 'Laptop', brand: 'Asus', model: 'X' }, complaint: 'Broken screen', customer: { name: 'Customer' }, diagnosis: { staffFindings: 'INTERNAL SECRET' }, estimateRevisions: [{ customerExplanation: 'Screen replacement required', lines: [{ description: 'Screen', quantity: 1, unitPrice: 150000 }], totalAmount: 150000, repairDurationMinutes: 120, qcDurationMinutes: 30 }] };
  const portal = 'https://urt.example/b/repair-a/customer';
  const approval = 'https://urt.example/service-approval#token=secret';
  const message = customerServiceUpdate(ticket, 'Menunggu Persetujuan', 'Technician', portal, approval);
  assert.match(message, /URT-TEST/);
  assert.match(message, /Screen replacement required/);
  assert.doesNotMatch(message, /INTERNAL SECRET/);
  assert.ok(message.includes(portal));
  assert.ok(message.includes(approval));
  assert.match(message, /150\.000/);
  assert.match(message, /2 jam/);
  assert.match(message, /30 menit/);
  const pickup = customerServiceUpdate({ ...ticket, status: 'completed' }, 'Siap Diambil', 'Technician', portal);
  assert.ok(pickup.includes(portal));
  assert.match(pickup, /siap diambil/);
  assert.equal(pickup.includes(approval), false);
  for (const status of ['submitted', 'diagnosing', 'approved', 'repairing', 'quality_check']) assert.equal(customerServiceUpdate({ ...ticket, status }, '', '', portal), '');
  assert.equal(customerServiceUpdate(ticket, '', '', portal), '', 'Approval messages require an approval link');
  const link = new URL(whatsappMessageLink('0812 3456-7890', message));
  assert.equal(link.origin, 'https://wa.me');
  assert.equal(link.pathname, '/6281234567890');
  assert.equal(link.searchParams.get('text'), message);
  assert.equal(whatsappMessageLink('+62 81234567890', message), link.href);
  assert.equal(whatsappMessageLink(undefined, message), undefined);
  assert.equal(whatsappMessageLink('not a phone', message), undefined);
});

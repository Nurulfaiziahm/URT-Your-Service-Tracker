import assert from 'node:assert/strict';
import test from 'node:test';
import { ticketDeadline, durationLabel } from '../src/features/tickets/service-timing.ts';

test('priority rises at the one-day boundary and overdue estimates never imply completion', () => {
  const now = Date.now();
  const ticket = { status: 'repairing', nextDeadlineAt: new Date(now + 86400000).toISOString() };
  assert.equal(ticketDeadline(ticket, now).level, 'high');
  assert.equal(ticketDeadline(ticket, now - 1).level, 'soon');
  assert.equal(ticketDeadline(ticket, now + 86400000).level, 'overdue');
  assert.equal(ticket.status, 'repairing');
  assert.equal(ticketDeadline({ ...ticket, status: 'completed' }, now + 86400000).level, 'normal');
  assert.equal(ticketDeadline({ status: 'submitted' }, now).dueAt, undefined);
  assert.equal(durationLabel(150), '2 jam 30 menit');
});

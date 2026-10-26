import assert from 'node:assert/strict';
import test from 'node:test';
import { Technician } from '../dist/models/Technician.model.js';

test('technician JSON provides the id used by frontend detail and edit links', () => {
  const technician = Technician.hydrate({
    _id: '507f1f77bcf86cd799439011',
    businessId: '507f1f77bcf86cd799439012',
    name: 'Example technician',
    email: 'example@example.com',
    status: 'active',
  });

  const list = JSON.parse(JSON.stringify({ data: [technician] }));
  const detail = JSON.parse(JSON.stringify({ data: { technician } }));

  for (const record of [list.data[0], detail.data.technician]) {
    assert.equal(record.id, '507f1f77bcf86cd799439011');
    assert.equal(record._id, record.id);
    assert.equal(
      `/owner/technicians/${record.id}/edit`,
      '/owner/technicians/507f1f77bcf86cd799439011/edit',
    );
  }
});

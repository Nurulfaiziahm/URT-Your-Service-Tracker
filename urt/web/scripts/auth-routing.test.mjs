import test from 'node:test';
import assert from 'node:assert/strict';
import { authDestination, authPortalFromPath } from '../src/features/auth/auth-routing.ts';

test('role login never follows a return path into another role', () => {
  for (const portal of ['owner', 'customer', 'technician']) {
    for (const other of ['owner', 'customer', 'technician'].filter((value) => value !== portal)) {
      assert.equal(authDestination(portal, { pathname: `/${other}/tickets` }), `/${portal}`);
    }
    assert.equal(authDestination(portal, { pathname: `/${portal}/profile` }), `/${portal}/profile`);
    assert.equal(authDestination(portal, { pathname: `/${portal}/login` }), `/${portal}`);
    assert.equal(authDestination(portal, { pathname: '//external.example/path' }), `/${portal}`);
  }
});

test('customer service and tracking returns retain business context and private fragments', () => {
  assert.equal(authPortalFromPath('/b/repair-a/customer/services/new'), 'customer');
  assert.equal(authDestination('customer', { pathname: '/b/repair-a/customer/services/new' }), '/b/repair-a/customer/services/new');
  assert.equal(authDestination('customer', { pathname: '/tracking/TEST', hash: '#access=fixture' }), '/tracking/TEST#access=fixture');
  assert.equal(authDestination('owner', { pathname: '/tracking/TEST' }), '/owner');
});

test('technician invitation returns preserve invitation proof without requiring signup', () => {
  assert.equal(authPortalFromPath('/invitations/technician'), 'technician');
  assert.equal(authDestination('technician', { pathname: '/invitations/technician', hash: '#token=fixture' }), '/invitations/technician#token=fixture');
  assert.equal(authDestination('customer', { pathname: '/invitations/technician' }), '/customer');
  for (const proof of [{ hash: '#token=fixture' }, { search: '?token=fixture' }]) {
    const from = { pathname: '/technician/register', ...proof };
    assert.equal(authDestination('technician', from), `/technician/register${proof.hash || proof.search}`);
    assert.equal(authDestination('owner', from), '/owner');
    assert.equal(authDestination('customer', from), '/customer');
  }
  assert.equal(authDestination('technician', { pathname: '/technician/register' }), '/technician');
});

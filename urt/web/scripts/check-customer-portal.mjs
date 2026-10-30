import assert from 'node:assert/strict';
import { PassThrough } from 'node:stream';
import { createElement as h } from 'react';
import { renderToPipeableStream } from 'react-dom/server';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';
import { configureStore } from '@reduxjs/toolkit';
import { createServer } from 'vite';

// Render the real routes against seeded API caches. No production data or network calls.
const vite = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom', cacheDir: 'node_modules/.vite-portal-checks' });
const stores = [];
try {
  const { AppRoutes } = await vite.ssrLoadModule('/src/app/router.tsx');
  const { default: auth } = await vite.ssrLoadModule('/src/features/auth/authSlice.ts');
  const { default: business } = await vite.ssrLoadModule('/src/features/business/businessSlice.ts');
  const { default: toasts } = await vite.ssrLoadModule('/src/components/feedback/toastSlice.ts');
  const { baseApi } = await vite.ssrLoadModule('/src/redux/baseApi.ts');
  await vite.ssrLoadModule('/src/features/dashboard/dashboardApi.ts');
  await vite.ssrLoadModule('/src/features/tickets/ticketsApi.ts');

  const shop = { id: 'shop-a', slug: 'repair-a', name: 'Repair A', timezone: 'Asia/Makassar', currency: 'IDR' };
  const user = { id: 'customer-a', firstName: 'Customer', lastName: 'A', email: 'customer@example.test', isEmailVerified: true };
  const ticket = {
    id: 'ticket-a', ticketCode: 'URT-TEST-A', status: 'submitted',
    device: { category: 'Laptop', brand: 'Brand', model: 'Model' },
    complaint: 'Screen repair', createdAt: '2026-01-01T00:00:00Z',
    allowedActions: [], timeline: [],
  };

  async function fixture({ signedIn = false, member = false } = {}) {
    const store = configureStore({
      reducer: { auth, business, toasts, [baseApi.reducerPath]: baseApi.reducer },
      middleware: (defaults) => defaults().concat(baseApi.middleware),
    });
    stores.push(store);
    store.dispatch(signedIn
      ? { type: 'auth/credentialsReceived', payload: { user, accessToken: 'test-only' } }
      : { type: 'auth/sessionEnded' });
    // A previously selected shop must never override the shop in the shared link.
    store.dispatch({ type: 'business/selectBusiness', payload: { businessId: 'shop-b', portal: 'customer' } });
    const seed = (endpoint, args, data) => store.dispatch(baseApi.util.upsertQueryData(endpoint, args, data));
    await seed('getAuthPortals', user.id, { data: { portals: ['customer'] } });
    await seed('getPublicBusiness', shop.slug, { success: true, data: { business: shop, services: [
      { id: 'service-a', name: 'Repair A screen service', category: 'Laptop', basePrice: 100000 },
    ] } });
    await seed('getMyBusinesses', undefined, { data: { businesses: member
      ? [{ businessId: shop.id, slug: shop.slug, name: shop.name, roles: ['customer'] }]
      : [{ businessId: 'shop-b', slug: 'repair-b', name: 'Repair B', roles: ['customer'] }] } });
    const dashboard = { stats: { activeTickets: 1, completedTickets: 0, awaitingApproval: 0 }, recentTickets: [ticket], business: shop };
    await seed('getCustomerDashboard', { businessId: 'shop-b' }, { data: {
      ...dashboard, recentTickets: [{ ...ticket, ticketCode: 'PRIVATE-SHOP-B-TICKET' }],
    } });
    await seed('getCustomerDashboard', { businessId: shop.id }, { data: member ? dashboard : {
      ...dashboard, recentTickets: [{ ...ticket, ticketCode: 'PRIVATE-OTHER-CUSTOMER' }],
    } });
    if (member) {
      await seed('getTicketById', { businessId: shop.id, ticketId: ticket.id }, { data: { ticket } });
      await seed('getTickets', { businessId: shop.id, params: { page: 1, status: 'completed' } }, {
        data: [{ ...ticket, status: 'completed' }],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      });
    }
    return store;
  }

  async function render(store, path) {
    return new Promise((resolve, reject) => {
      const output = new PassThrough();
      let html = '';
      output.on('data', (chunk) => { html += chunk; });
      output.on('end', () => resolve(html));
      output.on('error', reject);
      const stream = renderToPipeableStream(h(Provider, { store },
        h(MemoryRouter, { initialEntries: [path] }, h(AppRoutes))), {
        onAllReady() { stream.pipe(output); },
        onError: reject,
      });
    });
  }

  const guest = await render(await fixture(), '/b/repair-a/customer');
  assert.match(guest, /Repair A/);
  assert.match(guest, /Belum ada servis aktif/);
  assert.match(guest, /href="\/b\/repair-a\/customer\/services\/new"/);
  assert.match(guest, /Ajukan servis tanpa membuat akun/);
  assert.doesNotMatch(guest, /PRIVATE-SHOP-B-TICKET|PRIVATE-OTHER-CUSTOMER|URT-TEST-A/);
  console.log('PASS: shared link opens an empty guest customer portal');

  const guestForm = await render(await fixture(), '/b/repair-a/customer/services/new');
  assert.match(guestForm, /Nama lengkap/);
  assert.match(guestForm, /Tidak perlu membuat akun/);
  const newcomer = await fixture({ signedIn: true });
  const empty = await render(newcomer, '/b/repair-a/customer');
  assert.match(empty, /Belum ada servis aktif/);
  assert.doesNotMatch(empty, /PRIVATE-SHOP-B-TICKET|PRIVATE-OTHER-CUSTOMER/);
  const form = await render(newcomer, '/b/repair-a/customer/services/new');
  assert.match(form, /Mulai Servis di/);
  assert.match(form, /Repair A/);
  assert.match(form, /value="Customer A"/);
  assert.doesNotMatch(form, /type="password"/);
  assert.doesNotMatch(form, /Repair B|PRIVATE-SHOP-B-TICKET/);
  console.log('PASS: a first-time customer can open the linked-shop submission form despite another selection');

  const memberStore = await fixture({ signedIn: true, member: true });
  const member = await render(memberStore, '/b/repair-a/customer');
  assert.match(member, /URT-TEST-A/);
  assert.match(member, /href="\/b\/repair-a\/customer\/services\/ticket-a"/);
  assert.match(member, /href="\/b\/repair-a\/customer\/history"/);
  assert.doesNotMatch(member, /PRIVATE-SHOP-B-TICKET/);
  console.log('PASS: existing customer sees their linked-shop ticket and scoped navigation');

  const detail = await render(memberStore, '/b/repair-a/customer/services/ticket-a');
  assert.match(detail, /URT-TEST-A/);
  assert.match(detail, /href="\/b\/repair-a\/customer"/);
  const history = await render(memberStore, '/b/repair-a/customer/history');
  assert.match(history, /URT-TEST-A/);
  assert.match(history, /href="\/b\/repair-a\/customer\/services\/ticket-a"/);
  console.log('PASS: ticket detail and history use the linked shop despite another selection');

  const login = await render(await fixture(), {
    pathname: '/customer/login', state: { from: { pathname: '/b/repair-a/customer/services/new' } },
  });
  assert.match(login, /href="\/customer\/register"/);
  assert.doesNotMatch(login, /href="\/owner\/register"/);
  console.log('PASS: customer login offers customer registration');
} finally {
  for (const store of stores) store.dispatch({ type: 'baseApi/resetApiState' });
  await vite.close();
}

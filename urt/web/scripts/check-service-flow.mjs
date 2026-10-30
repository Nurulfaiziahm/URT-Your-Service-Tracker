import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { createServer } from 'vite';
import { serviceRequestFixture } from '../../api/tests/helpers/service-request-fixture.mjs';

const browserPath = process.env.URT_TEST_BROWSER || [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
].find(existsSync);
assert.ok(browserPath, 'Set URT_TEST_BROWSER to a Chromium browser executable');
const fixture = serviceRequestFixture();
const vite = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom', cacheDir: 'node_modules/.vite-service-flow' });
fixture.app.use(vite.middlewares);
fixture.app.get('*', async (req, res, next) => {
  try { res.type('html').send(await vite.transformIndexHtml(req.originalUrl, await readFile('index.html', 'utf8'))); }
  catch (error) { next(error); }
});
const server = fixture.app.listen(0, '127.0.0.1');
await new Promise((resolve) => server.once('listening', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const profile = await mkdtemp(join(tmpdir(), 'urt-service-browser-'));
const browser = spawn(browserPath, ['--headless=new', '--disable-gpu', '--disable-background-mode', '--no-first-run', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let socket;
let rpc;
try {
  let portFile;
  for (let i = 0; i < 100; i++) {
    try { portFile = await readFile(join(profile, 'DevToolsActivePort'), 'utf8'); break; }
    catch { await delay(100); }
  }
  assert.ok(portFile, 'Headless browser did not start');
  const [port, endpoint] = portFile.trim().split(/\r?\n/);
  socket = new WebSocket(`ws://127.0.0.1:${port}${endpoint}`);
  await new Promise((resolve, reject) => { socket.addEventListener('open', resolve); socket.addEventListener('error', reject); });
  let id = 0;
  const pending = new Map();
  const exceptions = [];
  socket.addEventListener('message', ({ data }) => {
    const message = JSON.parse(data);
    if (message.method === 'Runtime.exceptionThrown') exceptions.push(message.params.exceptionDetails.text);
    if (!message.id) return;
    const task = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) task?.reject(new Error(message.error.message));
    else task?.resolve(message.result);
  });
  rpc = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
    const requestId = ++id;
    pending.set(requestId, { resolve, reject });
    socket.send(JSON.stringify({ id: requestId, method, params, sessionId }));
  });
  const { targetId } = await rpc('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await rpc('Target.attachToTarget', { targetId, flatten: true });
  const call = (method, params) => rpc(method, params, sessionId);
  await call('Runtime.enable');
  async function screenshot(name) {
    const directory = 'node_modules/.cache/urt-layout';
    await mkdir(directory, { recursive: true });
    const { cssContentSize: size } = await call('Page.getLayoutMetrics');
    const result = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true,
      clip: { x: 0, y: 0, width: size.width, height: Math.min(size.height, 1800), scale: 1 } });
    await writeFile(`${directory}/${name}.png`, Buffer.from(result.data, 'base64'));
  }
  async function evaluate(expression) {
    const response = await call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    assert.equal(response.exceptionDetails, undefined, 'Browser evaluation failed');
    return response.result.value;
  }
  async function until(expression) {
    for (let i = 0; i < 200; i++) { if (await evaluate(`Boolean(document.body) && (${expression})`)) return; await delay(100); }
    throw new Error(`Browser condition timed out: ${expression}\n${await evaluate("document.querySelector('main')?.innerText.slice(0, 1800)")}`);
  }
  async function inspectStatusLayout(label) {
    for (const width of [320, 375, 390, 430, 768, 1024, 1280, 1440]) {
      await call('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: width <= 640 });
      const layout = await evaluate(`(() => {
        const root = document.documentElement;
        const steppers = [...document.querySelectorAll('[aria-label="Tahapan pengerjaan servis"]')].map((list) => {
          const container = list.parentElement;
          const width = container.getBoundingClientRect().width;
          const step = list.querySelector('li');
          const connector = step && getComputedStyle(step, '::after');
          return { width, steps: list.children.length, connectorWidth: connector && parseFloat(connector.width), connectorHeight: connector && parseFloat(connector.height) };
        });
        const badges = [...document.querySelectorAll('[data-status-badge]')].map((badge) => ({
          height: badge.getBoundingClientRect().height,
          labelHeight: badge.querySelector('span')?.getBoundingClientRect().height,
          labelScroll: badge.querySelector('span')?.scrollWidth,
          labelClient: badge.querySelector('span')?.clientWidth,
        }));
        return { pageWidth: root.scrollWidth, viewport: innerWidth, steppers, badges };
      })()`);
      assert.ok(layout.pageWidth <= layout.viewport + 1, `${label} at ${width}px has page overflow: ${layout.pageWidth}px`);
      for (const stepper of layout.steppers) {
        assert.equal(stepper.steps, 6, `${label} at ${width}px should render all service stages`);
        if (stepper.width <= 620) {
          assert.ok(stepper.connectorWidth <= 2.5 && stepper.connectorHeight > 2, `${label} at ${width}px should use aligned vertical connectors (${stepper.connectorWidth}x${stepper.connectorHeight})`);
        } else {
          assert.ok(stepper.connectorHeight <= 2.5 && stepper.connectorWidth > 2, `${label} at ${width}px should use horizontal connectors (${stepper.connectorWidth}x${stepper.connectorHeight})`);
        }
      }
      for (const badge of layout.badges) {
        assert.ok(badge.height >= 25 && badge.height <= 27, `${label} at ${width}px has inconsistent status badge height: ${badge.height}`);
        assert.ok(badge.labelHeight <= badge.height, `${label} at ${width}px has a wrapped status badge label`);
      }
    }
    await call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    console.log(`PASS: ${label} service status layout and badges at 320, 375, 390, 430, 768, 1024, 1280 and 1440px`);
  }
  async function inspectTableLayout(label) {
    for (const width of [320, 375, 390, 430, 768, 1024, 1280, 1440]) {
      await call('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: width <= 640 });
      const layout = await evaluate(`(() => ({
        pageWidth: document.documentElement.scrollWidth,
        viewport: innerWidth,
        tables: [...document.querySelectorAll('[data-responsive-table]')].flatMap((wrapper) => {
          const table = wrapper.querySelector('table');
          if (!table) return [];
          const body = table.tBodies[0];
          return [{
            wrapperWidth: wrapper.clientWidth,
            wrapperScrollWidth: wrapper.scrollWidth,
            tableDisplay: getComputedStyle(table).display,
            bodyDisplay: body && getComputedStyle(body).display,
            rows: [...(body?.rows || [])].map((row) => ({
              display: getComputedStyle(row).display,
              cells: [...row.cells].map((cell) => ({
                display: getComputedStyle(cell).display,
                label: cell.dataset.label,
                labelContent: getComputedStyle(cell, '::before').content,
                scrollWidth: cell.scrollWidth,
                clientWidth: cell.clientWidth,
                fullRow: cell.hasAttribute('data-full-row'),
              })),
            })),
          }];
        }),
      }))()`);
      assert.ok(layout.pageWidth <= layout.viewport + 1, `${label} at ${width}px has page overflow: ${layout.pageWidth}px`);
      for (const table of layout.tables) {
        if (width <= 640) {
          assert.ok(table.wrapperScrollWidth <= table.wrapperWidth + 1, `${label} at ${width}px has a horizontally scrollable table`);
          assert.equal(table.tableDisplay, 'block', `${label} at ${width}px did not transpose the table`);
          assert.equal(table.bodyDisplay, 'grid', `${label} at ${width}px did not stack table rows`);
          for (const row of table.rows) {
            assert.equal(row.display, 'block', `${label} at ${width}px did not turn a data row into a vertical block`);
            for (const cell of row.cells) {
              if (cell.fullRow) continue;
              assert.equal(cell.display, 'grid', `${label} at ${width}px did not show label/value cells`);
              assert.ok(cell.label, `${label} at ${width}px has a cell without its column heading`);
              assert.notEqual(cell.labelContent, 'none', `${label} at ${width}px does not render the ${cell.label} label`);
              assert.ok(cell.scrollWidth <= cell.clientWidth + 1, `${label} at ${width}px clips a cell value for ${cell.label}`);
            }
          }
        } else {
          assert.equal(table.tableDisplay, 'table', `${label} at ${width}px changed the desktop table structure`);
        }
      }
    }
    await call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    console.log(`PASS: ${label} tables transpose on mobile and remain horizontal tables at tablet/desktop widths`);
  }
  async function fill(name, value) {
    await evaluate(`(() => { const input = document.querySelector('[name="${name}"]'); const prototype = input.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(prototype, 'value').set.call(input, ${JSON.stringify(value)}); input.dispatchEvent(new Event('input', { bubbles:true })); })()`);
  }
  const next = () => evaluate("document.querySelector('form button[type=submit]').click()");
  async function completeDevice() {
    await until("Boolean(document.querySelector('[name=category]'))");
    await fill('category', 'Laptop'); await fill('brand', 'Asus'); await fill('complaint', 'Screen is broken');
    await next();
    await until("document.body.innerText.includes('Kirim & Dapatkan Nomor Tiket')");
    await evaluate("document.querySelector('form button[type=submit]').click(); document.querySelector('form button[type=submit]')?.click()");
    await until("document.body.innerText.includes('Tiket berhasil dibuat')");
  }

  for (const role of ['owner', 'customer', 'technician']) {
    await call('Page.navigate', { url: `${base}/${role}/login` });
    await until("Boolean(document.querySelector('input[name=email]'))");
    if (role === 'customer') await screenshot('customer-login-desktop');
    const registrations = await evaluate("Array.from(document.querySelectorAll('a')).map(link => link.getAttribute('href')).filter(href => href?.endsWith('/register'))");
    assert.ok(registrations.every((href) => href === `/${role}/register`));
    if (role === 'technician') assert.equal(registrations.length, 0);
    else assert.ok(registrations.length > 0);
    if (role !== 'owner') assert.equal(await evaluate("document.body.innerText.includes('PEMILIK USAHA')"), false);
    await call('Page.navigate', { url: `${base}/${role}` });
    await until(`location.pathname === '/${role}/login'`);
  }
  await call('Page.navigate', { url: `${base}/technician/register` });
  await until("document.body.innerText.includes('Tautan undangan tidak lengkap')");
  assert.equal(await evaluate("document.querySelectorAll('input[type=password]').length"), 0, 'Technician registration requires an invitation');
  await call('Page.navigate', { url: `${base}/login` });
  await until("document.body.innerText.includes('Pilih Portal Anda')");
  assert.equal(await evaluate("document.querySelectorAll('input[type=password]').length"), 0);
  console.log('PASS: separate login pages, role-correct protected redirects, and invitation-only technician signup');
  for (const role of ['owner', 'customer', 'technician']) {
    await call('Page.navigate', { url: `${base}/${role}/login` });
    await until("Boolean(document.querySelector('input[name=email]'))");
    assert.equal(await evaluate(`Boolean(document.querySelector('a[href="/${role}/forgot-password"]'))`), true);
    assert.equal(await evaluate(`getComputedStyle(document.querySelector('a[href="/${role}/forgot-password"]')).textAlign`), 'center');
    await call('Page.navigate', { url: `${base}/${role}/forgot-password` });
    await until("document.body.innerText.includes('Kirim Kode Pemulihan')");
    assert.equal(await evaluate("document.body.innerText.includes('Kembali ke Beranda')"), false);
    await fill('email', `${role}@example.test`); await next();
    await until(`location.pathname === '/${role}/reset-password' && Boolean(document.querySelector('[name=otp]'))`);
    assert.equal(fixture.recovery.portal, role);
    if (role === 'customer') {
      await fill('otp', fixture.recovery.code); await next();
    } else {
      await call('Page.navigate', { url: `${base}/${role}/reset-password#token=${fixture.recovery.token}` });
    }
    await until("Boolean(document.querySelector('[name=confirmPassword]'))");
    assert.equal(await evaluate("document.body.innerText.includes('Kembali ke Beranda')"), false);
    await fill('password', 'updated-fixture-password'); await fill('confirmPassword', 'updated-fixture-password'); await next();
    await until("document.body.innerText.includes('Kata Sandi Berhasil Diperbarui')");
    assert.equal(fixture.recovery.completed, true);
    assert.equal(await evaluate('location.hash'), '');
    await evaluate("Array.from(document.querySelectorAll('a')).find(link => link.textContent === 'Login').click()");
    await until(`location.pathname === '/${role}/login' && Boolean(document.querySelector('[name=email]'))`);
  }
  console.log('PASS: owner/customer/technician recovery UI, email-code entry, reset-link entry, role-specific login and no home links');
  fixture.invitationInspectionUnavailable(true);
  await call('Page.navigate', { url: `${base}/technician/register#token=${fixture.invitationToken}` });
  await until("Array.from(document.querySelectorAll('button')).some(button => button.textContent === 'Coba lagi')");
  assert.equal(await evaluate("document.body.innerText.includes('kedaluwarsa')"), false, 'An unavailable API must not mark an invitation as expired');
  fixture.invitationInspectionUnavailable(false);
  await evaluate("Array.from(document.querySelectorAll('button')).find(button => button.textContent === 'Coba lagi').click()");
  await until("Boolean(document.querySelector('[name=confirmPassword]'))");
  await evaluate(`location.hash = '#token=${fixture.secondInvitationToken}'`);
  await until("document.querySelector('form input[name=email]')?.value === 'second@example.test'");
  await evaluate(`location.hash = '#token=${fixture.invitationToken}'`);
  await until("document.querySelector('form input[name=email]')?.value === 'invited@example.test'");
  console.log('PASS: invitation inspection retries service errors and follows changed URL tokens');
  for (const path of [
    `/technician/invite/accept/${fixture.invitationToken}`,
    `/technician/invite/accept#token=${fixture.invitationToken}`,
    `/invitations/technician?token=${fixture.invitationToken}`,
    `/technician/register?token=${fixture.invitationToken}`,
  ]) {
    await call('Page.navigate', { url: base + path });
    await until("Boolean(document.querySelector('form input[name=confirmPassword]'))");
    assert.equal(await evaluate("document.querySelector('form input[name=email]')?.value"), 'invited@example.test');
  }
  await call('Page.navigate', { url: `${base}/technician/login` });
  await until("document.body.innerText.includes('Kirim tautan untuk membuat kata sandi')");
  await evaluate("Array.from(document.querySelectorAll('a')).find(link => link.textContent === 'Kirim tautan untuk membuat kata sandi').click()");
  await until("location.pathname === '/technician/forgot-password' && document.querySelector('h1')?.textContent === 'Lupa Kata Sandi' && Boolean(document.querySelector('form input[name=email]'))");
  await fill('email', 'invited@example.test');
  await next();
  await until("Boolean(document.querySelector('[name=otp]'))");
  assert.equal(await evaluate("document.body.innerText.includes('kode pemulihan 6 digit')"), true);
  await fill('otp', fixture.recovery.code); await next();
  await until("Boolean(document.querySelector('[name=confirmPassword]'))");
  await call('Page.navigate', { url: `${base}/technician/register#token=${fixture.invitationToken}` });
  await until("Boolean(document.querySelector('form input[name=email]'))");
  assert.equal(await evaluate('location.pathname'), '/technician/register', 'An invited technician must reach registration without being redirected to login');
  await until("Boolean(document.querySelector('[name=confirmPassword]'))");
  assert.equal(await evaluate("document.querySelector('form input[name=email]')?.value"), 'invited@example.test', 'The invitation must open a registration form with the invited email');
  assert.equal(await evaluate("document.querySelector('form input[name=email]')?.readOnly"), true, 'Registration must keep the email bound to the invitation');
  assert.equal(await evaluate("document.querySelector('h1')?.textContent"), 'Daftar Akun Teknisi');
  assert.equal(await evaluate("document.querySelectorAll('a[href=\"/owner/register\"]').length"), 0);
  await fill('password', 'fixture-technician-password');
  await fill('confirmPassword', 'different-password');
  await next();
  await until("document.body.innerText.includes('Konfirmasi kata sandi tidak cocok.')");
  await fill('confirmPassword', 'fixture-technician-password');
  await next();
  await until("document.body.innerText.includes('Akun Teknisi Berhasil Diaktifkan')");
  await evaluate("Array.from(document.querySelectorAll('a')).find(link => link.textContent === 'Login').click()");
  await until("location.pathname === '/technician/login' && Boolean(document.querySelector('[name=email]'))");
  assert.equal(await evaluate("document.querySelector('[name=email]').value"), 'invited@example.test');
  console.log('PASS: invitation-only registration, prefilled email, password confirmation, legacy links and technician login');
  fixture.existingInvitationAccount(true);
  await call('Page.navigate', { url: `${base}/technician/register#token=${fixture.invitationToken}` });
  await until("document.body.innerText.includes('Masuk & Terima Undangan')");
  assert.equal(await evaluate("document.querySelectorAll('input[type=password]').length"), 0);
  await evaluate("Array.from(document.querySelectorAll('a')).find(link => link.textContent === 'Masuk & Terima Undangan').click()");
  await until("location.pathname === '/technician/login' && Boolean(document.querySelector('[name=email]'))");
  assert.equal(await evaluate("document.querySelector('[name=email]').value"), 'invited@example.test');
  await fill('password', 'fixture-password');
  await next();
  await until("document.body.innerText.includes('Konfirmasi Penerimaan Undangan')");
  assert.equal(await evaluate('location.pathname'), '/technician/register');
  assert.equal(fixture.invitationLogin.invitationToken, fixture.invitationToken);
  fixture.existingInvitationAccount(false);
  console.log('PASS: existing accounts keep their credentials and return to invitation acceptance after login');
  await call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await call('Page.navigate', { url: `${base}/b/repair-a/customer/services/new` });
  await until("Boolean(document.querySelector('[name=name]'))");
  assert.equal(await evaluate("Array.from(document.querySelectorAll('a')).find(link => link.textContent === 'Masuk')?.getAttribute('href')"), '/customer/login');
  assert.equal(await evaluate("document.querySelectorAll('input[type=password]').length"), 0);
  await fill('name', 'Guest Customer'); await fill('phone', '081234567890');
  await next(); await completeDevice();
  assert.equal(fixture.tickets.length, 1, 'Double clicking must create exactly one ticket');
  assert.equal(fixture.contacts[0].userId, undefined);
  assert.equal(await evaluate("Array.from(document.querySelectorAll('a')).find(link => link.textContent === 'Buat Akun')?.getAttribute('href')"), '/customer/register');
  assert.ok(await evaluate(`document.body.innerText.includes(${JSON.stringify(fixture.tickets[0].ticketCode)})`));
  assert.equal(await evaluate('document.documentElement.scrollWidth <= window.innerWidth'), true, 'Mobile form should not overflow');
  await evaluate("Array.from(document.querySelectorAll('a')).find(link => link.textContent === 'Lacak Servis').click()");
  await until(`document.body.innerText.includes(${JSON.stringify(fixture.tickets[0].ticketCode)}) && !document.querySelector('#trackingSecret')`);
  await inspectStatusLayout('Customer tracking');
  await screenshot('customer-tracking-390-status');
  console.log('PASS: mobile guest form → actual API creation → ticket display → private tracking, without email/model/account');

  fixture.signIn(true);
  await call('Page.navigate', { url: `${base}/b/repair-a/customer/services/new` });
  await until("document.querySelector('[name=name]')?.value === 'Customer Fixture'");
  assert.equal(await evaluate("document.querySelector('[name=phone]').value"), fixture.user.phone);
  assert.equal(await evaluate("document.querySelector('[name=email]').value"), fixture.user.email);
  await next(); await completeDevice();
  assert.equal(fixture.tickets.length, 2);
  assert.equal(String(fixture.contacts[1].userId), fixture.user.id);
  assert.equal(fixture.contacts[0].userId, undefined);
  assert.deepEqual(exceptions, []);
  console.log('PASS: authenticated customer autofill → linked ticket, with no guest-record takeover or browser runtime exceptions');

  fixture.signIn(false);
  await call('Page.navigate', { url: `${base}/b/repair-a/customer` });
  await until("document.body.innerText.includes('Login Pelanggan')");
  await evaluate("Array.from(document.querySelectorAll('a')).find(link => link.textContent === 'Login Pelanggan').click()");
  await until("Boolean(document.querySelector('[name=password]'))");
  const registrationStyle = await evaluate("(() => { const link = document.querySelector('a[href=\"/customer/register\"]'); return {color:getComputedStyle(link).color,align:getComputedStyle(link.parentElement).textAlign}; })()");
  assert.deepEqual(registrationStyle, { color: 'rgb(37, 99, 235)', align: 'center' });
  assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true);
  await screenshot('customer-login-mobile');
  assert.equal(await evaluate("Array.from(document.querySelectorAll('a')).some(link => link.textContent.includes('Kembali ke Portal Pelanggan'))"), false);
  assert.equal(await evaluate("getComputedStyle(document.querySelector('.skip-link')).clipPath"), 'inset(50%)');
  await evaluate("document.querySelector('a[href=\"/customer/register\"]').click()");
  await until("document.querySelector('h1')?.textContent === 'Buat Akun Pelanggan'");
  assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true);
  await screenshot('customer-register-mobile');
  assert.equal(await evaluate("Array.from(document.querySelectorAll('a')).find(link => link.textContent === 'Masuk di sini')?.getAttribute('href')"), '/customer/login');
  await evaluate("Array.from(document.querySelectorAll('a')).find(link => link.textContent === 'Masuk di sini').click()");
  await until("location.pathname === '/customer/login' && document.querySelector('h1')?.textContent === 'Masuk Pelanggan' && Boolean(document.querySelector('[name=password]'))");
  await fill('email', fixture.user.email); await fill('password', 'fixture-password'); await next();
  await until("location.pathname === '/b/repair-a/customer' && Boolean(document.querySelector('[data-dashboard=customer]'))");
  await inspectStatusLayout('Customer portal dashboard');
  await inspectTableLayout('Customer portal history');
  console.log('PASS: centered blue customer registration link, no back button, hidden skip link and successful login into the shop portal');

  fixture.addTechnician({ userId: fixture.user.id, name: 'Technician Fixture' });
  fixture.signIn(true, 'technician');
  await call('Page.navigate', { url: `${base}/technician/queue` });
  await until("document.body.innerText.includes('Antrian Pengerjaan')");
  async function incoming(complaint) {
    const response = await fetch(`${base}/api/v1/public/businesses/repair-a/service-requests`, { method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': fixture.csrf },
      body: JSON.stringify({ customer: { name: 'Polling Customer', phone: '081234567890' }, device: { category: 'Laptop', brand: 'Asus' }, complaint }),
    });
    assert.equal(response.status, 201);
    return (await response.json()).data;
  }
  const firstUpdate = await incoming('Keyboard does not work');
  await until(`document.body.innerText.includes(${JSON.stringify(firstUpdate.ticketCode)})`);
  assert.equal(await evaluate('location.pathname'), '/technician/queue');
  await call('Page.navigate', { url: `${base}/technician` });
  await until(`document.body.innerText.includes(${JSON.stringify(firstUpdate.ticketCode)})`);
  const nextUpdate = await incoming('Battery does not charge');
  await until(`document.body.innerText.includes(${JSON.stringify(nextUpdate.ticketCode)})`);
  await call('Page.navigate', { url: `${base}/technician/tickets/${fixture.tickets[2]._id}` });
  await until("document.body.innerText.includes('Terima Perangkat')");
  await inspectStatusLayout('Technician ticket detail');
  assert.equal(await evaluate("Array.from(document.querySelectorAll('a')).some(link => link.textContent === 'Buka WhatsApp')"), false);
  const workflowTicket = fixture.tickets[2];
  async function ticketRequest(path, body, method = 'POST') {
    const response = await fetch(`${base}/api/v1/businesses/${fixture.shop._id}/tickets/${workflowTicket._id}/${path}`, {
      method, headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': fixture.csrf, Authorization: 'Bearer fixture-token' }, body: JSON.stringify({ expectedRevision: workflowTicket.revision, ...body }),
    });
    const result = await response.json();
    assert.equal(response.status, 200, JSON.stringify(result));
    return result.data;
  }
  await ticketRequest('transitions', { targetStatus: 'waiting_diagnosis' });
  await ticketRequest('transitions', { targetStatus: 'diagnosing' });
  await evaluate("document.documentElement.dataset.urtTestReload = 'pending'");
  await call('Page.reload');
  await until("!document.documentElement.dataset.urtTestReload && Boolean(document.querySelector('#customerExplanation'))");
  await fill('staffFindings', 'Keyboard rusak. Password pelanggan: PRIVATE-123');
  await until("document.querySelector('#customerExplanation')?.value.includes('masalah pada keyboard')");
  assert.equal(await evaluate("document.querySelector('#customerExplanation').value.includes('PRIVATE-123')"), false);
  await fill('staffFindings', 'Layar pecah. Password pelanggan: PRIVATE-123');
  await until("document.querySelector('#customerExplanation')?.value.includes('masalah pada layar')");
  const manualExplanation = 'Keyboard memerlukan penggantian. Kami akan mengajukan rincian biayanya.';
  await fill('customerExplanation', manualExplanation);
  await fill('staffFindings', 'Keyboard rusak, beberapa tombol macet. Password pelanggan: PRIVATE-123');
  assert.equal(await evaluate("document.querySelector('#customerExplanation').value"), manualExplanation);
  await evaluate("Array.from(document.querySelectorAll('button')).find(button => button.textContent === 'Gunakan Draf Otomatis').click()");
  await until("document.querySelector('#customerExplanation')?.value.includes('masalah pada keyboard')");
  await fill('staffFindings', '');
  assert.equal(await evaluate("document.querySelector('#customerExplanation').value"), '');
  await fill('staffFindings', 'Keyboard rusak. Password pelanggan: PRIVATE-123');
  const generatedDiagnosis = await evaluate("document.querySelector('#customerExplanation').value");
  await next();
  await until("document.body.innerText.includes('Hasil diagnosis berhasil disimpan.')");
  assert.equal(workflowTicket.diagnosis.customerExplanation, generatedDiagnosis);
  assert.ok(workflowTicket.diagnosis.staffFindings.includes('PRIVATE-123'));
  await evaluate("document.documentElement.dataset.urtTestReload = 'pending'");
  await call('Page.reload');
  await until("!document.documentElement.dataset.urtTestReload && Boolean(document.querySelector('#customerExplanation'))");
  assert.equal(await evaluate("document.querySelector('#customerExplanation').value"), generatedDiagnosis);
  await fill('staffFindings', 'IC charger rusak.');
  assert.equal(await evaluate("document.querySelector('#customerExplanation').value"), generatedDiagnosis, 'Saved explanations are preserved until the technician requests a fresh draft');
  console.log('PASS: diagnosis auto-draft follows notes, omits raw internal details, preserves edits, supports reset and saves the reviewed explanation');
  async function choose(name, value) {
    await evaluate(`(() => { const select = document.querySelector('[name="${name}"]'); select.value = ${JSON.stringify(value)}; select.dispatchEvent(new Event('change', { bubbles: true })); })()`);
  }
  fixture.signIn(true, 'owner');
  await call('Page.navigate', { url: `${base}/owner/services/new` });
  await until("Boolean(document.querySelector('[name=catalogName]'))");
  assert.equal(await evaluate("Boolean(document.querySelector('[name=entryType]'))"), false);
  await fill('catalogName', 'Keyboard replacement'); await fill('catalogCategory', 'Hardware'); await fill('catalogPrice', '140000'); await next();
  await until("location.pathname === '/owner/services' && document.body.innerText.includes('Keyboard replacement')");
  const catalogPart = fixture.catalog.find(item => item.name === 'Keyboard replacement');
  await call('Page.navigate', { url: `${base}/owner/services/${catalogPart.id}/edit` });
  await until("document.querySelector('[name=catalogPrice]')?.value === '140000'");
  await fill('catalogPrice', '150000'); await next();
  await until("document.body.innerText.includes('Perubahan katalog berhasil disimpan.')");
  assert.equal(catalogPart.basePrice, 150000);
  await call('Page.navigate', { url: `${base}/owner/services` });
  await until("Boolean(document.querySelector('[name=difficultyPrice-low]'))");
  await fill('difficultyPrice-low', '10000');
  await evaluate("document.querySelector('[name=difficultyPrice-low]').form.requestSubmit()");
  await until("document.querySelector('[name=difficultyPrice-low]').form.innerText.includes('10.000')");
  await fill('difficultyPrice-low', '20000');
  await evaluate("document.querySelector('[name=difficultyPrice-low]').form.requestSubmit()");
  await until("document.querySelector('[name=difficultyPrice-low]').form.innerText.includes('20.000')");
  await fill('difficultyPrice-complex', '80000');
  await evaluate("document.querySelector('[name=difficultyPrice-complex]').form.requestSubmit()");
  await until("document.querySelector('[name=difficultyPrice-complex]').form.innerText.includes('80.000')");
  assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true);
  assert.equal(await evaluate("document.querySelector('tbody').innerText.includes('Jasa Servis Rendah')"), false);
  await screenshot('owner-difficulty-pricing-mobile');
  const catalogLow = fixture.catalog.find(item => item.difficultyLevel === 'low');
  const catalogComplex = fixture.catalog.find(item => item.difficultyLevel === 'complex');
  fixture.signIn(true, 'technician');
  await call('Page.navigate', { url: `${base}/technician/tickets/${workflowTicket._id}/estimate` });
  await until(`Boolean(document.querySelector('[name=catalogItem] option[value="${catalogPart.id}"]'))`);
  await choose('catalogItem', catalogPart.id);
  await evaluate("Array.from(document.querySelectorAll('button')).find(button => button.textContent === 'Tambahkan ke Estimasi').click()");
  assert.equal(await evaluate("Boolean(document.querySelector('[name=catalogType]'))"), false);
  assert.equal(await evaluate("document.querySelector('[name=estimateDifficulty]').value"), '');
  assert.equal(await evaluate("document.querySelector('[name=estimateDifficulty]').required"), true);
  assert.equal(await evaluate("document.querySelector('[name=estimateDifficulty]').validity.valueMissing"), true);
  await evaluate("Array.from(document.querySelectorAll('button')).find(button => button.textContent === 'Simpan Draf Estimasi').click()");
  await until("document.body.innerText.includes('Pilih tingkat kesulitan servis terlebih dahulu.')");
  assert.equal(workflowTicket.estimateDraft, undefined);
  await evaluate("Array.from(document.querySelectorAll('button')).find(button => button.textContent === 'Ajukan Estimasi ke Pelanggan').click()");
  assert.equal(workflowTicket.status, 'diagnosing');
  await choose('estimateDifficulty', catalogComplex.id);
  await until("document.querySelector('[aria-label=\"Struk Estimasi\"]').innerText.includes('230.000')");
  await choose('estimateDifficulty', catalogLow.id);
  await until("Boolean(document.querySelector('[name=\"description-1\"]'))");
  assert.ok(await evaluate("document.querySelector('[aria-label=\"Struk Estimasi\"]').innerText.includes('170.000')"));
  assert.equal(await evaluate("document.querySelector('[name=\"description-0\"]').value"), 'Keyboard replacement');
  assert.equal(await evaluate("document.querySelector('[name=\"unitPrice-0\"]').value"), '150000');
  assert.equal(await evaluate("document.querySelector('[name=\"unitPrice-0\"]').readOnly"), true);
  assert.equal(await evaluate("document.querySelector('[name=\"quantity-1\"]').readOnly"), true);
  await fill('quantity-0', '2');
  assert.ok(await evaluate("document.querySelector('[aria-label=\"Struk Estimasi\"]').innerText.includes('320.000')"));
  await fill('quantity-0', '1');
  await evaluate("Array.from(document.querySelectorAll('button')).find(button => button.textContent === '+ tambahkan item').click()");
  await until("Boolean(document.querySelector('dialog[open] [name=name]'))");
  await fill('name', 'Pembersihan konektor'); await fill('category', 'Perawatan'); await fill('price', '10000');
  await evaluate("Array.from(document.querySelectorAll('dialog button')).find(button => button.textContent === 'Simpan & Tambahkan').click()");
  await until("!document.querySelector('dialog[open]') && Boolean(document.querySelector('[name=\"description-2\"]'))");
  assert.equal(workflowTicket.status, 'diagnosing', 'Creating a catalog item must not submit its surrounding estimate form');
  assert.ok(fixture.catalog.some(item => item.name === 'Pembersihan konektor'));
  await evaluate("document.querySelector('[aria-label=\"Hapus Item 3\"]').click()");
  await evaluate("Array.from(document.querySelectorAll('button')).find(button => button.textContent === 'Simpan Draf Estimasi').click()");
  await until("document.body.innerText.includes('Draf estimasi berhasil disimpan.')");
  await evaluate("document.documentElement.dataset.urtTestReload = 'pending'");
  await call('Page.reload');
  await until("!document.documentElement.dataset.urtTestReload && Boolean(document.querySelector('[name=\"description-1\"]'))");
  assert.equal(await evaluate("document.querySelector('[name=estimateDifficulty]').value"), catalogLow.id);
  assert.equal(await evaluate(`(() => { const description = document.querySelector('[name="description-0"]').getBoundingClientRect(); const quantity = document.querySelector('[name="quantity-0"]').getBoundingClientRect(); const item = document.querySelector('fieldset').getBoundingClientRect(); return description.width > item.width - 50 && description.bottom <= quantity.top; })()`), true);
  assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true);
  await screenshot('estimate-catalog-mobile');
  await call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  assert.equal(await evaluate(`(() => { const receipt = document.querySelector('[aria-label="Struk Estimasi"]').getBoundingClientRect(); const catalog = document.querySelector('[aria-label="Katalog Harga Owner"]').getBoundingClientRect(); return receipt.left >= catalog.right && receipt.width > 250; })()`), true);
  assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true);
  await screenshot('estimate-catalog-desktop');
  await call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await evaluate("Array.from(document.querySelectorAll('button')).find(button => button.textContent === 'Ajukan Estimasi ke Pelanggan').click()");
  await until("location.pathname.endsWith('/estimate/sent')");
  assert.equal(workflowTicket.estimateRevisions.at(-1).lines[0].description, 'Keyboard replacement');
  assert.equal(workflowTicket.estimateRevisions.at(-1).totalAmount, 170000);
  console.log('PASS: owner creates and edits catalog prices; technician selects locked prices and difficulty, adds missing items to shared catalog, saves and sends calculated total');
  await until("Array.from(document.querySelectorAll('a')).some(link => link.textContent === 'Buka WhatsApp')");
  const whatsapp = new URL(await evaluate("Array.from(document.querySelectorAll('a')).find(link => link.textContent === 'Buka WhatsApp').href"));
  assert.equal(whatsapp.origin, 'https://wa.me');
  assert.equal(whatsapp.pathname, '/6281234567890');
  assert.ok(whatsapp.searchParams.get('text').includes(firstUpdate.ticketCode));
  assert.ok(whatsapp.searchParams.get('text').includes('Keyboard does not work'));
  const approvalMessage = whatsapp.searchParams.get('text');
  assert.ok(approvalMessage.includes(`${base}/b/repair-a/customer`));
  assert.match(approvalMessage, /170\.000/);
  assert.match(approvalMessage, /Hasil diagnosis:/);
  assert.match(approvalMessage, /Tingkat kesulitan: Rendah/);
  const approvalUrl = approvalMessage.match(/Persetujuan biaya: (\S+)/)[1];
  const proof = new URL(approvalUrl).hash;
  fixture.signIn(false);
  await call('Page.navigate', { url: `${base}/service-approval${proof}` });
  await until("document.body.innerText.includes('Setujui Biaya Servis')");
  assert.ok(await evaluate("document.body.innerText.includes('2 jam') && document.body.innerText.includes('30 menit')"));
  await screenshot('service-approval-mobile');
  await evaluate("Array.from(document.querySelectorAll('button')).find(button => button.textContent === 'Setujui Biaya Servis').click()");
  await until("document.body.innerText.includes('Persetujuan berhasil dikirim')");
  assert.equal(workflowTicket.status, 'approved');
  fixture.signIn(true, 'technician');
  await ticketRequest('transitions', { targetStatus: 'repairing' });
  await call('Page.navigate', { url: `${base}/technician/queue` });
  await until("document.body.innerText.includes('Prioritas tinggi') && document.body.innerText.includes('Pengingat Tenggat (1)')");
  await screenshot('technician-priority-mobile');
  await ticketRequest('transitions', { targetStatus: 'quality_check', workSummary: 'Keyboard replaced' });
  await call('Page.navigate', { url: `${base}/technician/tickets/${workflowTicket._id}` });
  await until("document.body.innerText.includes('QC Lulus, Siap Diambil')");
  assert.equal(await evaluate("Array.from(document.querySelectorAll('a')).some(link => link.textContent === 'Buka WhatsApp')"), false);
  await ticketRequest('transitions', { targetStatus: 'completed', qcPassed: true, qcNotes: 'All keys tested' });
  await call('Page.reload');
  await until("Array.from(document.querySelectorAll('a')).some(link => link.textContent === 'Buka WhatsApp')");
  const pickupMessage = new URL(await evaluate("Array.from(document.querySelectorAll('a')).find(link => link.textContent === 'Buka WhatsApp').href")).searchParams.get('text');
  assert.ok(pickupMessage.includes(`${base}/b/repair-a/customer`));
  assert.match(pickupMessage, /siap diambil/);
  assert.equal(pickupMessage.includes('Persetujuan biaya:'), false);
  console.log('PASS: live technician assignments, WhatsApp pricing and portal links, guest approval, deadline priority, separate repair/QC and pickup message');

  fixture.signIn(true, 'owner');
  await call('Page.navigate', { url: `${base}/owner/services` });
  await until("document.querySelector('tbody')?.innerText.includes('Pembersihan konektor')");
  await inspectTableLayout('Owner service catalog');
  await evaluate("Array.from(document.querySelectorAll('tbody tr')).find(row => row.innerText.includes('Pembersihan konektor')).querySelectorAll('button')[1].click()");
  await until("Boolean(document.querySelector('dialog[open]'))");
  await evaluate("Array.from(document.querySelectorAll('dialog button')).find(button => button.textContent === 'Konfirmasi').click()");
  await until("!document.querySelector('dialog[open]') && !document.querySelector('tbody')?.innerText.includes('Pembersihan konektor')");
  assert.ok(fixture.catalog.find(item => item.name === 'Pembersihan konektor').deletedAt);
  assert.equal(workflowTicket.estimateRevisions.at(-1).totalAmount, 170000);
  console.log('PASS: technician-created catalog item appears for owner and can be deleted without changing a submitted estimate');
  await call('Page.navigate', { url: `${base}/owner/customers` });
  await until("document.body.innerText.includes('Penanganan Pelanggan') && Boolean(document.querySelector('tbody tr'))");
  assert.equal(await evaluate("document.querySelectorAll('a[href$=\"/edit\"]').length"), 0);
  assert.equal(await evaluate("Array.from(document.querySelectorAll('tbody tr')).filter(row => row.innerText.includes('Memiliki akun')).every(row => !row.innerText.includes('Hapus kontak'))"), true);
  const customerId = String(fixture.tickets[2].customerId);
  await call('Page.navigate', { url: `${base}/owner/customers/${customerId}` });
  await until("document.body.innerText.includes('Keyboard does not work') && document.body.innerText.includes('Technician Fixture')");
  assert.equal(await evaluate("document.querySelectorAll('form').length"), 0);
  await call('Page.navigate', { url: `${base}/owner/customers/${customerId}/edit` });
  await until(`location.pathname === '/owner/customers/${customerId}'`);
  assert.equal(await evaluate("document.body.innerText.includes('Edit Pelanggan')"), false);
  assert.deepEqual(exceptions, []);
  console.log('PASS: owner customer pages show assigned technician and complaint, with no editing and no delete action for account-linked customers');
  await call('Page.navigate', { url: `${base}/owner/tickets/${fixture.tickets[1]._id}` });
  await until(`document.body.textContent.includes('Detail Tiket Servis') && document.body.innerText.includes(${JSON.stringify(fixture.tickets[1].ticketCode)})`);
  assert.equal(await evaluate("Array.from(document.querySelectorAll('button')).some(button => button.textContent === 'Hapus Tiket Anonim')"), false);
  await call('Page.navigate', { url: `${base}/owner/tickets/${workflowTicket._id}` });
  await until(`document.body.textContent.includes('Detail Tiket Servis') && document.body.innerText.includes(${JSON.stringify(workflowTicket.ticketCode)})`);
  await inspectStatusLayout('Owner ticket detail');
  await inspectTableLayout('Owner ticket estimate details');
  await until("Array.from(document.querySelectorAll('button')).some(button => button.textContent === 'Hapus Tiket Anonim')");
  await evaluate("Array.from(document.querySelectorAll('button')).find(button => button.textContent === 'Hapus Tiket Anonim').click()");
  await until("Boolean(document.querySelector('dialog[open]'))");
  await screenshot('owner-delete-anonymous-mobile');
  await evaluate("Array.from(document.querySelectorAll('dialog button')).find(button => button.textContent === 'Batal').click()");
  assert.equal(workflowTicket.deletedAt, undefined);
  await evaluate("Array.from(document.querySelectorAll('button')).find(button => button.textContent === 'Hapus Tiket Anonim').click()");
  await evaluate("Array.from(document.querySelectorAll('dialog button')).find(button => button.textContent === 'Konfirmasi').click()");
  await until("location.pathname === '/owner/tickets' && document.body.innerText.includes('Tiket anonim berhasil dihapus.')");
  assert.ok(workflowTicket.deletedAt);
  assert.equal(await evaluate(`document.querySelector('tbody')?.innerText.includes(${JSON.stringify(workflowTicket.ticketCode)}) || false`), false);
  await call('Page.navigate', { url: `${base}/owner/tickets/${workflowTicket._id}` });
  await until("document.body.innerText.includes('Tiket Tidak Ditemukan')");
  assert.equal(fixture.tickets[1].deletedAt, undefined);
  assert.deepEqual(exceptions, []);
  console.log('PASS: only anonymous tickets expose owner deletion; confirmation can be cancelled, deletion returns to the list and registered tickets remain protected');
} catch (error) {
  console.error(error);
  throw error;
} finally {
  if (rpc && socket?.readyState === WebSocket.OPEN) {
    // Some Chromium builds close the connection before replying to Browser.close.
    await Promise.race([rpc('Browser.close').catch(() => {}), delay(3000)]);
    socket.close();
  }
  if (browser.exitCode === null) await Promise.race([new Promise((resolve) => browser.once('exit', resolve)), delay(3000)]);
  if (browser.exitCode === null) browser.kill();
  await vite.close();
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
  fixture.restore();
  assert.equal(dirname(profile), resolve(tmpdir()));
  assert.ok(basename(profile).startsWith('urt-service-browser-'));
  await rm(profile, { recursive: true, force: true, maxRetries: 8, retryDelay: 400 }).catch((error) => {
    if (!['EBUSY', 'EPERM'].includes(error.code)) throw error;
    console.warn('Browser profile cleanup deferred because Windows still holds a file lock.');
  });
}

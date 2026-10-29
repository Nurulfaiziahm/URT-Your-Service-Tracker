import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
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
const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', cacheDir: 'node_modules/.vite-service-flow' });
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
  async function evaluate(expression) {
    const response = await call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    assert.equal(response.exceptionDetails, undefined, 'Browser evaluation failed');
    return response.result.value;
  }
  async function until(expression) {
    for (let i = 0; i < 200; i++) { if (await evaluate(expression)) return; await delay(100); }
    throw new Error(`Browser condition timed out: ${expression}\n${await evaluate("document.querySelector('main')?.innerText.slice(0, 1800)")}`);
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
    const registrations = await evaluate("Array.from(document.querySelectorAll('a')).map(link => link.getAttribute('href')).filter(href => href?.endsWith('/register'))");
    assert.ok(registrations.every((href) => href === `/${role}/register`));
    if (role === 'technician') assert.equal(registrations.length, 0);
    else assert.ok(registrations.length > 0);
    if (role !== 'owner') assert.equal(await evaluate("document.body.innerText.includes('PEMILIK USAHA')"), false);
    await call('Page.navigate', { url: `${base}/${role}` });
    await until(`location.pathname === '/${role}/login'`);
  }
  await call('Page.navigate', { url: `${base}/technician/register` });
  await until("location.pathname === '/technician/login'");
  await call('Page.navigate', { url: `${base}/login` });
  await until("document.body.innerText.includes('Pilih Portal Anda')");
  assert.equal(await evaluate("document.querySelectorAll('input[type=password]').length"), 0);
  console.log('PASS: separate login pages, role-correct protected redirects, and no public technician signup');
  for (const role of ['owner', 'customer', 'technician']) {
    await call('Page.navigate', { url: `${base}/${role}/login` });
    await until("Boolean(document.querySelector('input[name=email]'))");
    assert.equal(await evaluate(`Boolean(document.querySelector('a[href="/${role}/forgot-password"]'))`), true);
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
    await evaluate("Array.from(document.querySelectorAll('a')).find(link => link.textContent === 'Kembali ke Login').click()");
    await until(`location.pathname === '/${role}/login' && Boolean(document.querySelector('[name=email]'))`);
  }
  console.log('PASS: owner/customer/technician recovery UI, email-code entry, reset-link entry, role-specific login and no home links');
  await call('Page.navigate', { url: `${base}/technician/invite/accept/${fixture.invitationToken}` });
  await until("Boolean(document.querySelector('[name=confirmPassword]'))");
  assert.equal(await evaluate("document.querySelectorAll('a[href=\"/owner/register\"]').length"), 0);
  await fill('password', 'fixture-technician-password');
  await fill('confirmPassword', 'fixture-technician-password');
  await next();
  await until("document.body.innerText.includes('Akun Teknisi Berhasil Diaktifkan')");
  await evaluate("Array.from(document.querySelectorAll('a')).find(link => link.textContent === 'Masuk Portal Teknisi').click()");
  await until("location.pathname === '/technician/login' && Boolean(document.querySelector('[name=email]'))");
  assert.equal(await evaluate("document.querySelector('[name=email]').value"), 'invited@example.test');
  console.log('PASS: invitation activation UI leads to technician login without public registration');
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

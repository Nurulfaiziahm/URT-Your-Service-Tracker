const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { test } = require('node:test');

function loadData(storage = new Map()) {
  const context = {
    window: {},
    document: { readyState: 'loading', addEventListener() {} },
    localStorage: {
      getItem: key => storage.get(key) || null,
      setItem: (key, value) => storage.set(key, value),
    },
    URL, URLSearchParams,
  };
  context.window.location = { search: '', href: 'http://localhost/teknisi/detail-tiket.html' };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync('js/data.js', 'utf8'), context);
  return context;
}

// A small DOM stub exercises the existing handlers without adding browser packages.
class Element {
  constructor(attrs = {}) {
    this.attrs = attrs;
    this.children = [];
    this.events = {};
    this.one = {};
    this.many = {};
    this.dataset = {};
    this.style = {};
    this.textContent = '';
    this.innerHTML = '';
    this.value = '';
    this.classList = { add() {}, remove() {}, toggle() {}, contains() { return false; } };
  }
  get href() { return this.attrs.href; }
  set href(value) { this.attrs.href = value; }
  getAttribute(name) { return this.attrs[name] ?? null; }
  setAttribute(name, value) { this.attrs[name] = value; }
  removeAttribute(name) { delete this.attrs[name]; }
  querySelector(selector) { return this.one[selector] || null; }
  querySelectorAll(selector) { return this.many[selector] || []; }
  appendChild(node) { this.children.push(node); return node; }
  replaceChildren(...nodes) { this.children = nodes; this.innerHTML = ''; }
  addEventListener(name, listener) { this.events[name] = listener; }
  click() { this.events.click?.({ preventDefault() {} }); }
  closest() { return null; }
  reportValidity() { return true; }
}

function page(path, storage, search = '') {
  const context = loadData(storage);
  const document = new Element();
  document.readyState = 'complete';
  document.getElementById = id => document.one[`#${id}`] || null;
  document.createElement = tag => { const element = new Element(); element.tagName = tag.toUpperCase(); return element; };
  document.addEventListener = (event, listener) => { if (event === 'DOMContentLoaded') document.ready = listener; };
  context.document = document;
  context.window.location = new URL(`http://localhost/${path}${search}`);
  context.setTimeout = () => {};
  context.clearTimeout = () => {};
  context.FormData = class {
    constructor(form) { this.fields = new Map(form.fields || []); }
    get(key) { return this.fields.get(key) ?? null; }
    has(key) { return this.fields.has(key); }
    entries() { return this.fields.entries(); }
  };
  const main = new Element();
  document.one.main = main;
  document.one['main .content, main, .content'] = main;
  return { context, app: context.window, document, main,
    run(file) { vm.runInContext(fs.readFileSync(file, 'utf8'), context); document.ready?.(); } };
}

test('ticket lookup accepts full IDs and exact short IDs, rejects suffix lookalikes', () => {
  const { window: app } = loadData();
  for (const id of ['001', '004', '0142']) {
    assert.equal(app.getTicketById(id).id, `URT-2026-${id}`);
  }
  for (const id of ['', '1', 'INVALID-001', 'URT-INVALID-999', 'OTHER-URT-2026-001']) {
    assert.equal(app.getTicketById(id), null, `must reject ${id}`);
  }
});

test('selected record rejects missing, invalid, partial, and foreign customer IDs', () => {
  for (const search of ['', '?id=1', '?id=INVALID-001', '?id=004']) {
    const p = page('pelanggan/detail-servis.html', undefined, search);
    assert.equal(p.app.getSelectedRecord('tickets', 'CUS-001'), null);
    assert.match(p.main.children[0].children[0].textContent, /Ticket not found/);
  }
  const p = page('owner/edit-teknisi.html', undefined, '?id=ardi-pratama');
  assert.equal(p.app.getSelectedRecord('technicians').id, 'TECH-002');
  assert.equal(p.app.getTechnicianById('ardi'), null);
});

test('every ticket-dependent link and GET form retains 001, 004, and 0142', () => {
  for (const id of ['001', '004', '0142']) {
    const p = page('teknisi/detail-tiket.html', undefined, `?id=${id}`);
    const ticket = p.app.getSelectedRecord('tickets');
    const paths = ['detail-tiket.html', 'estimasi.html', 'ringkasan-terkirim.html', 'tiket-selesai.html',
      '../pelanggan/detail-servis.html', '../pelanggan/persetujuan-servis.html',
      '../pelanggan/persetujuan-disetujui.html', '../pelanggan/persetujuan-ditolak.html', '../tracking_result.html'];
    const links = paths.map(href => new Element({ href }));
    const forms = [new Element({ action: 'estimasi.html' }), new Element({ action: 'ringkasan-terkirim.html' })];
    p.main.many['a[href]'] = links;
    p.main.many['form[action]'] = forms;
    p.app.preserveTicketLinks(p.main, ticket);
    for (const link of links) {
      const url = new URL(link.href);
      assert.equal(url.searchParams.get(url.pathname.endsWith('tracking_result.html') ? 'ticket' : 'id'), ticket.id);
    }
    for (const form of forms) assert.equal(form.children[0].value, ticket.id);
  }
});

test('completion updates and displays the same ticket across page loads', () => {
  for (const id of ['001', '004', '0142']) {
    const storage = new Map();
    const p = page('teknisi/detail-tiket.html', storage, `?id=${id}`);
    const ticket = p.app.getTicketById(id);
    const other = p.app.URT_DATA.tickets.find(t => t.id !== ticket.id);
    const originalStatus = other.status;
    const link = new Element({ href: 'tiket-selesai.html' });
    p.main.many['a[href]'] = [link];
    p.document.one['main a[href*="tiket-selesai.html"]'] = link;
    p.run('teknisi/js/teknisi.js');
    link.click();
    assert.equal(ticket.status, 'SELESAI');
    assert.equal(other.status, originalStatus);
    assert.equal(new URL(p.app.location.href).searchParams.get('id'), ticket.id);
    const result = page('teknisi/tiket-selesai.html', storage, `?id=${id}`);
    const heading = new Element(), tbody = new Element();
    result.document.one['main h1'] = heading;
    result.document.one['main table tbody'] = tbody;
    result.run('teknisi/js/teknisi.js');
    assert.match(heading.textContent, new RegExp(ticket.id));
    assert.ok(tbody.innerHTML.includes(ticket.device));
    assert.ok(tbody.innerHTML.includes(p.app.getCustomerById(ticket.customerId).name));
  }
});

test('customer history contains only the demo customer completed tickets', () => {
  const p = page('pelanggan/riwayat-servis.html');
  const tbody = new Element();
  p.document.one['.history-table tbody'] = tbody;
  p.run('pelanggan/js/customer.js');
  for (const ticket of p.app.URT_DATA.tickets) {
    assert.equal(tbody.innerHTML.includes(`#${ticket.id}<`), ticket.customerId === 'CUS-001' && ticket.status === 'SELESAI');
  }
});

test('approval amount, action, saved record, and result agree for two different tickets', () => {
  for (const [id, cost] of [['001', 350000], ['0050', 1200000]]) {
    const storage = new Map();
    const p = page('pelanggan/persetujuan-servis.html', storage, `?id=${id}`);
    const ticket = p.app.getTicketById(id);
    p.app.setTicketStatus(ticket, 'PERSETUJUAN', { estimatedCost: cost, costBreakdown: [{ item: 'Repair', amount: cost }] });
    const amount = new Element(), breakdown = new Element();
    const approve = new Element({ href: 'persetujuan-disetujui.html' });
    p.document.one['.action-card p strong'] = amount;
    p.document.one['.cost-table tbody'] = breakdown;
    p.document.one['.action-card a[href*="persetujuan-disetujui"]'] = approve;
    p.document.many['a[href*="persetujuan-disetujui"], a[href*="persetujuan-ditolak"]'] = [approve];
    p.main.many['a[href]'] = [approve];
    p.run('pelanggan/js/customer.js');
    const formatted = p.app.formatCurrency(cost);
    assert.equal(amount.textContent, formatted);
    assert.ok(breakdown.innerHTML.includes(formatted));
    assert.ok(approve.textContent.includes(formatted));
    approve.click();
    assert.equal(ticket.status, 'PERBAIKAN');
    assert.equal(new URL(p.app.location.href).searchParams.get('id'), ticket.id);
    const result = page('pelanggan/persetujuan-disetujui.html', storage, `?id=${id}`);
    const resultAmount = new Element(), summary = new Element();
    resultAmount.dataset.ticketBind = 'amount'; summary.dataset.ticketBind = 'summary';
    result.document.many['[data-ticket-bind]'] = [resultAmount, summary];
    result.run('pelanggan/js/customer.js');
    assert.equal(resultAmount.textContent, formatted);
    assert.ok(summary.textContent.includes(ticket.id));
  }
});

test('foreign ticket cannot be approved and opening a result does not perform an action', () => {
  const p = page('pelanggan/persetujuan-servis.html', undefined, '?id=0142');
  const original = p.app.getTicketById('0142').status;
  p.run('pelanggan/js/customer.js');
  assert.match(p.main.children[0].children[0].textContent, /Ticket not found/);
  assert.equal(p.app.getTicketById('0142').status, original);
  const result = page('pelanggan/persetujuan-disetujui.html', undefined, '?id=001');
  result.run('pelanggan/js/customer.js');
  assert.equal(result.app.getTicketById('001').status, 'PERSETUJUAN');
  assert.match(result.main.children[0].children[0].textContent, /Keputusan belum tercatat/);
});

test('public tracking rejects unknown IDs and uses the canonical stage for valid IDs', () => {
  for (const [id, step] of [['001', 2], ['004', 4], ['0142', 1], ['0141', 3], ['URT-INVALID-999', null], ['INVALID-001', null], ['', null]]) {
    const p = page('tracking_result.html', undefined, `?ticket=${id}`);
    const display = new Element(), card = new Element();
    const steps = Array.from({ length: 5 }, () => {
      const node = new Element();
      node.one['.step-circle'] = new Element();
      node.classList.add = cls => { if (cls === 'is-active') node.active = true; };
      return node;
    });
    p.document.one['#displayTicketId'] = display;
    p.document.one['.result-card'] = card;
    p.document.many['.tracker-stepper .tracker-step'] = steps;
    p.run('js/script.js');
    if (step === null) {
      assert.match(card.children[0].textContent, /Ticket not found/);
      assert.equal(display.textContent, '');
    } else {
      assert.equal(display.textContent, `#URT-2026-${id}`);
      assert.equal(steps.findIndex(node => node.active), step);
    }
  }
});

test('owner edit forms populate and save only the selected record, surviving reload', () => {
  const specs = [
    ['technicians', 'edit-teknisi.html', 'editTechnicianForm', 'TECH-001', 'TECH-002'],
    ['customers', 'edit-pelanggan.html', 'editCustomerForm', 'CUS-001', 'CUS-002'],
    ['services', 'edit-layanan.html', 'editServiceForm', 'SERVICE-001', 'SERVICE-002']
  ];
  for (const [collection, path, formId, first, second] of specs) {
    for (const id of [first, second]) {
      const storage = new Map();
      const p = page(`owner/${path}`, storage, `?id=${id}`);
      const record = p.app.URT_DATA[collection].find(item => item.id === id);
      const other = p.app.URT_DATA[collection].find(item => item.id !== id);
      const originalOther = other.name;
      const form = new Element();
      const fieldNames = collection === 'services' ? ['name', 'price', 'category', 'duration', 'description', 'status']
        : collection === 'customers' ? ['name', 'email', 'phone', 'city', 'address', 'notes'] : ['name', 'username', 'email', 'phone', 'status'];
      form.elements = fieldNames.map(name => ({ name, type: 'text', tagName: 'INPUT', value: 'WRONG DEFAULT' }));
      p.document.one[`#${formId}`] = form;
      p.run('owner/js/owner.js');
      assert.equal(form.elements[0].value, record.name);
      const newName = `Updated ${id}`;
      form.fields = form.elements.map(field => [field.name, field.name === 'name' ? newName : field.value]);
      form.events.submit({ preventDefault() {} });
      assert.equal(record.name, newName);
      assert.equal(other.name, originalOther);
      assert.equal(new URL(p.app.location.href).searchParams.get('id'), id);
      const reloaded = loadData(storage).window.URT_DATA[collection];
      assert.equal(reloaded.find(item => item.id === id).name, newName);
      assert.equal(reloaded.find(item => item.id === other.id).name, originalOther);
    }
  }
});

test('fixture and persisted stages use one vocabulary', () => {
  const { window: app } = loadData();
  for (const ticket of app.URT_DATA.tickets) assert.ok(app.TICKET_STATUSES[ticket.status], ticket.status);
  for (const file of ['js/script.js', 'teknisi/js/teknisi.js', 'pelanggan/js/customer.js', 'owner/js/owner.js']) {
    assert.doesNotMatch(fs.readFileSync(file, 'utf8'), /["'](?:DIAGNOSA|PENGERJAAN)["']/);
  }
});

test('diagnosis and estimate submissions retain the selected ticket and edited values', () => {
  const storage = new Map();
  const p = page('teknisi/detail-tiket.html', storage, '?id=0142');
  const form = new Element({ action: 'estimasi.html' });
  p.main.many['form[action]'] = [form];
  p.document.many['main form[action]'] = [form];
  p.run('teknisi/js/teknisi.js');
  form.fields = [['kerusakan', 'New diagnosis'], ['biaya', '350000'], ['sparepart', 'New part'], ['selesai', '2026-11-02']];
  form.events.submit({ preventDefault() {} });
  assert.equal(new URL(p.app.location.href).searchParams.get('id'), 'URT-2026-0142');
  const estimate = page('teknisi/estimasi.html', storage, '?id=0142');
  const article = new Element();
  article.one.h2 = new Element(); article.one['p strong'] = new Element();
  estimate.document.one['main article'] = article;
  for (const id of ['diagnosa', 'suku-cadang', 'qc', 'estimasi']) estimate.document.one[`#${id}`] = new Element();
  const sendForm = new Element({ action: 'ringkasan-terkirim.html' });
  estimate.main.many['form[action]'] = [sendForm];
  estimate.document.many['main form[action]'] = [sendForm];
  estimate.run('teknisi/js/teknisi.js');
  assert.equal(estimate.document.one['#diagnosa'].value, 'New diagnosis');
  assert.equal(estimate.document.one['#suku-cadang'].value, 'New part');
  sendForm.fields = [['diagnosa', 'Final diagnosis'], ['suku-cadang', 'Final part'], ['estimasi', '2026-11-03']];
  sendForm.events.submit({ preventDefault() {} });
  const ticket = loadData(storage).window.getTicketById('0142');
  assert.equal(ticket.estimatedCost, 350000);
  assert.equal(ticket.costBreakdown[0].amount, 350000);
  assert.equal(ticket.diagnosis, 'Final diagnosis');
  assert.equal(ticket.sparepart, 'Final part');
  assert.equal(ticket.status, 'PERSETUJUAN');
  assert.equal(new URL(estimate.app.location.href).searchParams.get('id'), ticket.id);
});

test('rejection preserves the ticket, amount, and customer on its result page', () => {
  const storage = new Map();
  const p = page('pelanggan/persetujuan-servis.html', storage, '?id=001');
  const reject = new Element({ href: 'persetujuan-ditolak.html' });
  p.main.many['a[href]'] = [reject];
  p.document.many['a[href*="persetujuan-disetujui"], a[href*="persetujuan-ditolak"]'] = [reject];
  p.run('pelanggan/js/customer.js');
  reject.click();
  const result = page('pelanggan/persetujuan-ditolak.html', storage, '?id=001');
  const values = Array.from({ length: 7 }, () => new Element());
  result.document.many['.dl-grid dd'] = values;
  result.run('pelanggan/js/customer.js');
  assert.equal(result.app.getTicketById('001').status, 'DITOLAK');
  assert.equal(values[0].textContent, result.app.getCurrentCustomer().name);
  assert.match(values[4].textContent, /Rp250\.000/);
  assert.equal(new URL(p.app.location.href).searchParams.get('id'), 'URT-2026-001');
});

test('technician filters render the canonical diagnosis and repair stages', () => {
  const p = page('teknisi/beranda-teknisi.html');
  const tbody = new Element();
  p.document.one['.stats-cards-grid'] = new Element();
  p.document.one['.clean-table tbody'] = tbody;
  for (const id of ['filterSemua', 'filterMenunggu', 'filterPengerjaan']) p.document.one[`#${id}`] = new Element();
  p.run('teknisi/js/teknisi.js');
  const assigned = p.app.getTicketsByTechnicianId('TECH-001');
  for (const [button, statuses] of [['filterMenunggu', ['MASUK', 'DIAGNOSIS', 'PERSETUJUAN']], ['filterPengerjaan', ['PERBAIKAN', 'QC']]]) {
    p.document.one[`#${button}`].click();
    for (const ticket of assigned) {
      assert.equal(tbody.innerHTML.includes(`#${ticket.id}<`), statuses.includes(ticket.status));
    }
  }
});

test('owner detail-to-edit links preserve the selected record', () => {
  for (const [kind, id] of [['teknisi', 'TECH-002'], ['pelanggan', 'CUS-002'], ['layanan', 'SERVICE-003']]) {
    const p = page(`owner/detail-${kind}.html`, undefined, `?id=${id}`);
    const link = new Element({ href: `edit-${kind}.html` });
    p.document.many['main a[href^="edit-"]'] = [link];
    p.run('owner/js/owner.js');
    assert.equal(new URL(link.href).searchParams.get('id'), id);
  }
});

test('failed persistence does not report a saved mutation or change another record', () => {
  const p = page('teknisi/detail-tiket.html', undefined, '?id=001');
  const ticket = p.app.getTicketById('001');
  let alerted = false;
  p.app.alert = () => { alerted = true; };
  p.context.localStorage.setItem = () => { throw new Error('Storage unavailable'); };
  assert.equal(p.app.setTicketStatus(ticket, 'SELESAI'), false);
  assert.equal(ticket.status, 'PERSETUJUAN');
  assert.equal(alerted, true);
});

test('owner specialty controls retain distinct submitted values in the real HTML', () => {
  const markup = fs.readFileSync('owner/edit-teknisi.html', 'utf8');
  const controls = [...markup.matchAll(/<input\b(?=[^>]*\bname="specialty")[^>]*>/g)].map(match => match[0]);
  assert.equal(controls.length, 6);
  const values = controls.map(control => control.match(/\bvalue="([^"]+)"/)?.[1]);
  assert.deepEqual(values, ['Laptop', 'Hardware', 'Software', 'Diagnosis', 'Pendingin', 'QC']);
});

test('approval and decision pages contain no stale record or price in their main content', () => {
  for (const name of ['persetujuan-servis', 'persetujuan-disetujui', 'persetujuan-ditolak']) {
    const html = fs.readFileSync(`pelanggan/${name}.html`, 'utf8');
    const main = html.slice(html.indexOf('<main'), html.indexOf('</main>'));
    assert.doesNotMatch(main, /URT-2026-001|Rp250\.000/, `${name} has a stale ticket placeholder`);
  }
});

test('a new service request creates one ticket and opens that ticket by ID', () => {
  const storage = new Map();
  const p = page('pelanggan/pengajuan-servis.html', storage);
  const form = new Element();
  p.document.one['#form-servis'] = form;
  p.run('pelanggan/js/customer.js');
  form.fields = [['nama', 'Nino Rachimas'], ['email', 'nino.rachimas@email.com'],
    ['nohp', '0812 3456 7890'], ['alamat', 'Jakarta Pusat'],
    ['jenis_perangkat', 'laptop'], ['model', 'Test Laptop'], ['keluhan', 'Fan noisy']];
  form.events.submit({ preventDefault() {} });
  const url = new URL(p.app.location.href);
  assert.equal(url.pathname, '/pelanggan/detail-servis.html');
  const ticket = p.app.getTicketById(url.searchParams.get('id'));
  assert.equal(ticket.customerId, 'CUS-001');
  assert.equal(ticket.device, 'Test Laptop');
  assert.equal(ticket.issue, 'Fan noisy');
  assert.equal(ticket.status, 'MASUK');
  const reloaded = loadData(storage).window;
  assert.equal(reloaded.getTicketById(ticket.id).device, 'Test Laptop');
  assert.equal(reloaded.URT_DATA.tickets.filter(item => item.id === ticket.id).length, 1);
  assert.equal(reloaded.getCustomerById(ticket.customerId).phone, '0812 3456 7890');
});

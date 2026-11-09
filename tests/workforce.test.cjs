const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function fixture(legacy = false) {
  let saved = null;
  const context = { structuredClone, Intl, localStorage: {
    getItem: () => saved,
    setItem: (key, value) => { saved = value; }
  } };
  context.window = context;
  vm.createContext(context);
  for (const file of ['data/demo-data.js', 'config/forms.config.js', 'services/storage.js', 'services/workforce.js', 'modules/renderers.js']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../assets/js', file), 'utf8'), context);
  }
  if (legacy) {
    const data = structuredClone(context.DEMO_SEED);
    delete data.employees;
    delete data.tasks;
    data.leads[0].owner = 'Custom Sales';
    data.leads[0].subjects = 'Math';
    delete data.leads[0].lead_source;
    saved = JSON.stringify(data);
  }
  context.Store.init();
  context.Workforce.setActor('EMP-001');
  return context;
}

function createTask(Workforce, overrides = {}) {
  return Workforce.save('tasks', {
    title: 'Follow up with family', lead_id: 'LD-1001', assignee_id: 'EMP-002',
    task_type: 'Follow-up', due_date: '2026-11-06', priority: 'Normal', status: 'To do',
    ...overrides
  });
}

test('legacy owners become Sales employees without resetting or duplicating data', () => {
  const { Store } = fixture(true);
  const lead = Store.list('leads')[0];
  assert.equal(Store.list('employees').find(employee => employee.id === lead.owner_id).full_name, 'Custom Sales');
  assert.equal(Array.from(lead.subjects)[0], 'Math');
  assert.equal(lead.lead_source, 'Not specified');
  assert.equal(Store.list('tasks').length, 0);
  const migrated = JSON.stringify(Store.data);
  Store.init();
  assert.equal(JSON.stringify(Store.data), migrated);
});

test('owner and assignee dropdowns include only active Sales employees', () => {
  const { Store, UI, FORM_CONFIG } = fixture();
  Store.add('employees', { full_name: 'Inactive Sales', role: 'Sales', status: 'Inactive' });
  for (const [entity, name] of [['leads', 'owner_id'], ['tasks', 'assignee_id']]) {
    const html = UI.field(FORM_CONFIG[entity].fields.find(field => field.name === name));
    assert.ok(html.includes('Linh Tran'));
    assert.ok(!html.includes('Admin Demo'));
    assert.ok(!html.includes('Inactive Sales'));
  }
});

test('teacher profiles keep audit dates and support multiple branches and subjects', () => {
  const { Store, Workforce } = fixture();
  const teacher = Store.list('teachers')[0];
  const createdAt = teacher.created_at;
  assert.ok(createdAt);
  assert.ok(teacher.updated_at);
  assert.ok(Array.isArray(teacher.branch_ids));
  assert.ok(Array.isArray(teacher.subjects));
  const saved = Workforce.save('teachers', {
    full_name: teacher.full_name, phone: teacher.phone, email: teacher.email,
    subjects: ['Physics', 'Math'], branch_ids: ['BR-001', 'BR-002'], status: teacher.status
  }, teacher.id);
  assert.equal(saved.created_at, createdAt);
  assert.ok(saved.updated_at);
  assert.deepEqual(Array.from(saved.branch_ids), ['BR-001', 'BR-002']);
  assert.deepEqual(Array.from(saved.subjects), ['Physics', 'Math']);
});

test('branch and subject catalogs are manager-controlled and reject duplicate names', () => {
  const { Workforce } = fixture();
  assert.throws(() => Workforce.save('branches', { name: 'Central Branch', status: 'Active' }), /already exists/);
  assert.throws(() => Workforce.save('subjects', { name: 'Math', status: 'Active' }), /already exists/);
  assert.equal(Workforce.save('branches', { name: 'North Branch', address: '1 North Road', phone: '024 5555 0303', status: 'Active' }).name, 'North Branch');
  Workforce.setActor('EMP-002');
  assert.throws(() => Workforce.save('branches', { name: 'Sales Branch', status: 'Active' }), /permission/);
});

test('learner age is calculated from date of birth and programs come from active class enrollments', () => {
  const { Store, Workforce, FORM_CONFIG, UI } = fixture();
  const learner = Store.list('students').find(record => record.id === 'ST-001');
  assert.equal(Workforce.ageFromDate('2010-11-10', new Date(2026, 10, 9)), 15);
  assert.equal(Workforce.ageFromDate('2010-10-10', new Date(2026, 10, 9)), 16);
  assert.equal(Workforce.ageFromDate('2030-01-01', new Date(2026, 10, 9)), null);
  assert.deepEqual(Array.from(Workforce.studentPrograms(learner.id)), ['IB']);
  assert.ok(!FORM_CONFIG.students.fields.some(field => field.name === 'program'));
  assert.ok(UI.form('students', learner).includes('Description'));
  assert.ok(!UI.form('students', learner).includes('Program'));
  const saved = Workforce.save('students', {
    ...learner, date_of_birth: '2010-11-10', gender: 'Female', description: 'Prefers morning classes.'
  }, learner.id);
  assert.equal(saved.date_of_birth, '2010-11-10');
  assert.equal(saved.description, 'Prefers morning classes.');
});

test('only managers create employees/tasks; assignments reject non-Sales employees', () => {
  const { Workforce } = fixture();
  assert.throws(() => createTask(Workforce, { assignee_id: 'EMP-001' }), /active Sales/);
  const task = createTask(Workforce);
  assert.equal(task.created_by, 'EMP-001');
  Workforce.setActor('EMP-002');
  assert.throws(() => createTask(Workforce), /permission/);
  assert.throws(() => Workforce.save('employees', { full_name: 'No', role: 'Sales', status: 'Active' }), /permission/);
});

test('Sales update their own progress but cannot change assignment or other tasks', () => {
  const { Workforce, Store, UI } = fixture();
  const task = createTask(Workforce);
  Workforce.setActor('EMP-002');
  Workforce.save('tasks', { status: 'In progress', result: 'Called parent' }, task.id);
  assert.equal(Store.list('tasks').find(record => record.id === task.id).result, 'Called parent');
  assert.throws(() => Workforce.save('tasks', { assignee_id: 'EMP-003' }, task.id), /Only a manager/);
  assert.throws(() => Workforce.save('tasks', { status: 'Cancelled' }, task.id), /Only a manager/);
  assert.match(UI.form('tasks', task), /<select disabled required[^>]*name="assignee_id"/);
  Workforce.setActor('EMP-003');
  assert.ok(!Workforce.records('tasks').some(record => record.id === task.id));
  assert.throws(() => Workforce.save('tasks', { result: 'Unauthorized' }, task.id), /permission/);
});

test('task-linked Sales may update a lead but may not claim or reassign its owner', () => {
  const { Workforce, Store } = fixture();
  createTask(Workforce, { assignee_id: 'EMP-003' });
  Workforce.setActor('EMP-003');
  assert.throws(() => Workforce.save('leads', { owner_id: 'EMP-003' }, 'LD-1001'), /Only a manager/);
  Workforce.save('leads', { status: 'Contacted' }, 'LD-1001');
  assert.equal(Store.list('leads')[0].owner_id, 'EMP-002');
});

test('conversion creates one customer and completes only conversion tasks', () => {
  const { Workforce, Store } = fixture();
  const conversion = createTask(Workforce, { task_type: 'Convert lead' });
  const followup = createTask(Workforce);
  Workforce.setActor('EMP-002');
  assert.throws(() => Workforce.save('tasks', { status: 'Completed' }, conversion.id), /Convert the lead/);
  Workforce.convertLead('LD-1001');
  Workforce.convertLead('LD-1001');
  assert.equal(Store.list('customers').filter(customer => customer.source_lead === 'LD-1001').length, 1);
  assert.equal(Store.list('tasks').find(task => task.id === conversion.id).status, 'Completed');
  assert.equal(Store.list('tasks').find(task => task.id === followup.id).status, 'To do');
});

test('saving Won from the lead form uses the same conversion workflow', () => {
  const { Workforce, Store } = fixture();
  const task = createTask(Workforce, { task_type: 'Convert lead' });
  Workforce.save('leads', { status: 'Won', subjects: 'Math' }, 'LD-1001');
  assert.ok(Array.isArray(Store.list('leads')[0].subjects));
  assert.equal(Store.list('tasks').find(record => record.id === task.id).status, 'Completed');
  assert.equal(Workforce.converted('LD-1001'), true);
});

test('employee changes require open work reassignment and protect the current manager', () => {
  const { Workforce } = fixture();
  assert.throws(() => Workforce.save('employees', { status: 'Inactive' }, 'EMP-001'), /current manager/);
  assert.throws(() => Workforce.save('employees', { role: 'Manager' }, 'EMP-002'), /Reassign/);
  Workforce.setActor('EMP-002');
  assert.equal(Workforce.records('employees').length, 0);
});

test('actor selection persists and completed/cancelled tasks are never overdue', () => {
  const { Workforce, Store } = fixture();
  Workforce.setActor('EMP-003');
  Store.init();
  assert.equal(Workforce.actor().id, 'EMP-003');
  assert.throws(() => Workforce.setActor('missing'), /active employee/);
  assert.equal(Workforce.overdue({ due_date: '2000-01-01', status: 'To do' }), true);
  assert.equal(Workforce.overdue({ due_date: '2000-01-01', status: 'Completed' }), false);
});

test('Admin has full record access and management actions without being a Sales assignee', () => {
  const { Workforce, Store, UI } = fixture();
  Workforce.setActor('EMP-ADMIN');
  assert.equal(Workforce.isAdmin(), true);
  assert.equal(Workforce.records('leads').length, Store.list('leads').length);
  assert.equal(Workforce.records('tasks').length, Store.list('tasks').length);
  for (const entity of Object.keys(Store.data).filter(key => Array.isArray(Store.data[key]))) {
    assert.equal(Workforce.canCreate(entity), true);
  }
  assert.ok(!Workforce.sales().some(employee => employee.id === 'EMP-ADMIN'));
  assert.ok(UI.form('employees').includes('value="Admin"'));
  assert.equal(createTask(Workforce).created_by, 'EMP-ADMIN');
  assert.equal(Workforce.save('employees', { full_name: 'Second Admin', role: 'Admin', status: 'Active' }).role, 'Admin');
});

test('Manager cannot create, grant or modify Admin access', () => {
  const { Workforce, Store, UI } = fixture();
  assert.throws(() => Workforce.save('employees', { full_name: 'New Admin', role: 'Admin', status: 'Active' }), /Only an Admin/);
  assert.throws(() => Workforce.save('employees', { role: 'Admin' }, 'EMP-003'), /Only an Admin/);
  assert.throws(() => Workforce.save('employees', { full_name: 'Changed' }, 'EMP-ADMIN'), /permission/);
  assert.equal(Workforce.canEdit('employees', Store.list('employees').find(employee => employee.id === 'EMP-ADMIN')), false);
  assert.ok(!UI.form('employees').includes('value="Admin"'));
});

test('Admin migration adds one user without resetting data and protects the last active Admin', () => {
  const { Store, Workforce } = fixture();
  Store.data.employees = Store.list('employees').filter(employee => employee.role !== 'Admin');
  Store.save();
  Store.init();
  assert.equal(Store.list('employees').length, 4);
  assert.equal(Store.data.current_employee_id, 'EMP-001');
  const snapshot = JSON.stringify(Store.data);
  Store.init();
  assert.equal(JSON.stringify(Store.data), snapshot);
  Workforce.setActor('EMP-ADMIN');
  assert.throws(() => Workforce.save('employees', { status: 'Inactive' }, 'EMP-ADMIN'), /active Admin/);
  assert.throws(() => Workforce.save('employees', { role: 'Manager' }, 'EMP-ADMIN'), /active Admin/);
});

test('contract values display thousands separators while other numeric fields remain numeric', () => {
  const { UI, FORM_CONFIG } = fixture();
  const money = FORM_CONFIG.contracts.fields.find(field => field.name === 'value');
  const sessions = FORM_CONFIG.enrollments.fields.find(field => field.name === 'sessions');
  const html = UI.field(money, 42000000);
  assert.equal(UI.formatThousands(42000000), '42.000.000');
  assert.equal(UI.formatThousands('1.234.567'), '1.234.567');
  assert.equal(UI.formatThousands('12a34'), '1.234');
  assert.match(html, /type="text" inputmode="numeric"/);
  assert.match(html, /data-format="thousands"/);
  assert.match(html, /value="42\.000\.000"/);
  assert.equal(sessions.type, 'number');
  assert.equal(sessions.format, undefined);
});

test('contract-follow tasks need a contract, not a lead, and reject premature completion', () => {
  const { Workforce } = fixture();
  const task = createTask(Workforce, { task_type: 'Follow contract', contract_id: 'CT-001', lead_id: '' });
  assert.equal(task.contract_id, 'CT-001');
  assert.equal(task.lead_id, '');
  assert.throws(() => createTask(Workforce, { task_type: 'Follow contract', contract_id: 'missing' }), /Select a contract/);
  assert.throws(() => Workforce.save('tasks', { status: 'Completed' }, task.id), /Complete the contract/);
});

test('assigned Sales follow a contract through completion without editing financial details', () => {
  const { Workforce, Store } = fixture();
  const task = createTask(Workforce, { task_type: 'Follow contract', contract_id: 'CT-001' });
  Workforce.setActor('EMP-002');
  assert.equal(Workforce.canCreate('contracts'), false);
  assert.equal(Workforce.records('contracts').length, 1);
  assert.throws(() => Workforce.save('contracts', { value: 1 }, 'CT-001'), /contract details/);
  Workforce.save('contracts', { status: 'Pending signature', notes: 'Waiting for signature' }, 'CT-001');
  assert.equal(Store.list('tasks').find(record => record.id === task.id).status, 'To do');
  Workforce.save('contracts', { status: 'Completed' }, 'CT-001');
  assert.equal(Store.list('tasks').find(record => record.id === task.id).status, 'Completed');
  assert.ok(Store.list('tasks').find(record => record.id === task.id).completed_at);
  assert.throws(() => Workforce.save('contracts', { status: 'Active' }, 'CT-001'), /reopen/);
  Workforce.setActor('EMP-003');
  assert.equal(Workforce.records('contracts').length, 0);
  assert.throws(() => Workforce.save('contracts', { status: 'Completed' }, 'CT-001'), /permission/);
});

test('contract completion/cancellation synchronize only matching open follow tasks', () => {
  const { Workforce, Store } = fixture();
  const follow = createTask(Workforce, { task_type: 'Follow contract', contract_id: 'CT-001' });
  const cancelled = createTask(Workforce, { task_type: 'Follow contract', contract_id: 'CT-001', status: 'Cancelled' });
  const leadTask = createTask(Workforce);
  Workforce.save('contracts', { status: 'Completed' }, 'CT-001');
  assert.equal(Store.list('tasks').find(task => task.id === follow.id).status, 'Completed');
  assert.equal(Store.list('tasks').find(task => task.id === cancelled.id).status, 'Cancelled');
  assert.equal(Store.list('tasks').find(task => task.id === leadTask.id).status, 'To do');
  Workforce.save('contracts', { status: 'Active' }, 'CT-001');
  assert.equal(Store.list('tasks').find(task => task.id === follow.id).status, 'In progress');
  Workforce.save('contracts', { status: 'Cancelled' }, 'CT-001');
  assert.equal(Store.list('tasks').find(task => task.id === follow.id).status, 'Cancelled');
  assert.throws(() => createTask(Workforce, { task_type: 'Follow contract', contract_id: 'CT-001' }), /cancelled contract/);
});

test('Sales cannot relink a contract task; target labels resolve customer and status', () => {
  const { Workforce } = fixture();
  const task = createTask(Workforce, { task_type: 'Follow contract', contract_id: 'CT-001' });
  const target = Workforce.taskTarget(task);
  assert.equal(target.entity, 'contracts');
  assert.ok(target.label.includes('Nguyen Family'));
  assert.equal(target.status, 'Active');
  Workforce.setActor('EMP-002');
  assert.throws(() => Workforce.save('tasks', { contract_id: 'other' }, task.id), /Only a manager/);
});

test('role workspaces select matching employees and prevent cross-role switching', () => {
  const { Workforce } = fixture();
  for (const role of ['Sales', 'Manager', 'Admin']) {
    Workforce.enterWorkspace(role);
    assert.equal(Workforce.actor().role, role);
    assert.ok(Workforce.workspaceEmployees().every(employee => employee.role === role));
    assert.throws(() => Workforce.setActor(role === 'Admin' ? 'EMP-002' : 'EMP-ADMIN'), /workspace/);
  }
});

test('each workspace remembers its own employee and never falls back to another role', () => {
  const { Workforce, Store } = fixture();
  Workforce.enterWorkspace('Sales');
  Workforce.setActor('EMP-003');
  Workforce.enterWorkspace('Manager');
  Workforce.enterWorkspace('Sales');
  assert.equal(Workforce.actor().id, 'EMP-003');
  Store.data.employees = Store.list('employees').filter(employee => employee.role !== 'Manager');
  Workforce.enterWorkspace('Manager');
  assert.equal(Workforce.actor(), undefined);
  assert.equal(Workforce.canCreate('tasks'), false);
});

test('legacy lead sources migrate to Not specified without inventing attribution', () => {
  const { Store } = fixture(true);
  assert.equal(Store.list('leads')[0].lead_source, 'Not specified');
  const snapshot = JSON.stringify(Store.data);
  Store.init();
  assert.equal(JSON.stringify(Store.data), snapshot);
});

test('Lead source is required, uses the configured catalog and reports Won conversion by source', () => {
  const { FORM_CONFIG, Workforce, Store } = fixture();
  const sourceField = FORM_CONFIG.leads.fields.find(field => field.name === 'lead_source');
  assert.ok(sourceField.required);
  assert.ok(sourceField.options.includes('Referral'));
  Store.list('leads')[0].lead_source = '';
  assert.throws(() => Workforce.save('leads', { status: 'Contacted' }, 'LD-1001'), /valid lead source/);
  assert.throws(() => Workforce.save('leads', { lead_source: 'Invented source' }, 'LD-1001'), /valid lead source/);
  Store.list('leads')[0].lead_source = 'Referral';
  const result = Workforce.leadSourceStats(Store.list('leads'));
  const referral = result.find(group => group.source === 'Referral');
  const facebook = result.find(group => group.source === 'Facebook Ads');
  assert.deepEqual({ leads: referral.leads, won: referral.won, conversion: referral.conversion }, { leads: 1, won: 0, conversion: 0 });
  assert.deepEqual({ leads: facebook.leads, won: facebook.won, conversion: facebook.conversion }, { leads: 1, won: 1, conversion: 100 });
  const unknown = Workforce.leadSourceStats([{ id: 'legacy', status: 'New' }])[0];
  assert.deepEqual({ source: unknown.source, conversion: unknown.conversion }, { source: 'Not specified', conversion: 0 });
});
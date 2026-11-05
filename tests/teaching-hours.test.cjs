const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function fixture() {
  let saved = null;
  const context = { structuredClone, localStorage: {
    getItem: () => saved,
    setItem: (key, value) => { saved = value; }
  } };
  context.window = context;
  vm.createContext(context);
  for (const file of ['data/demo-data.js', 'services/storage.js', 'services/workforce.js', 'services/teaching-hours.js']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../assets/js', file), 'utf8'), context);
  }
  context.Store.init();
  return context;
}

function session(overrides = {}) {
  return { class_id: 'CL-001', teacher_id: 'TCH-001', date: '2000-01-03', actual_start: '09:00', actual_end: '10:30', break_minutes: 10, status: 'Completed', ...overrides };
}

test('scheduled classes do not automatically become actual teaching hours', () => {
  const { TeachingHours, Store } = fixture();
  assert.equal(Store.list('teaching_sessions').length, 0);
  assert.equal(TeachingHours.summary().reduce((total, row) => total + row.minutes, 0), 0);
  const before = JSON.stringify(Store.data);
  Store.init();
  assert.equal(JSON.stringify(Store.data), before);
});

test('actual minutes subtract breaks and only completed sessions count', () => {
  const { TeachingHours } = fixture();
  TeachingHours.save(session());
  TeachingHours.save(session({ date: '2000-01-04', status: 'Draft' }));
  TeachingHours.save(session({ date: '2000-01-05', status: 'Cancelled' }));
  const row = TeachingHours.summary({ month: '2000-01', teacher: 'TCH-001' })[0];
  assert.equal(row.minutes, 80);
  assert.equal(row.completed, 1);
  assert.equal(row.draft, 1);
  assert.equal(row.cancelled, 1);
  assert.equal(TeachingHours.formatMinutes(row.minutes), '1 h 20 min');
});

test('invalid times, dates, breaks and future completion are rejected', () => {
  const { TeachingHours } = fixture();
  for (const change of [{ actual_end: '08:00' }, { actual_start: '25:00' }, { break_minutes: -1 }, { break_minutes: 90 }, { break_minutes: 1.5 }]) {
    assert.throws(() => TeachingHours.save(session(change)), /End time/);
  }
  assert.throws(() => TeachingHours.save(session({ date: '2000-02-30' })), /valid session date/);
  assert.throws(() => TeachingHours.save(session({ date: '2099-01-03' })), /future session/);
  assert.equal(TeachingHours.save(session({ date: '2099-01-03', status: 'Draft' })).status, 'Draft');
});

test('teacher/class overlap and duplicate completion are blocked; adjacent sessions are allowed', () => {
  const { TeachingHours } = fixture();
  const first = TeachingHours.save(session());
  assert.throws(() => TeachingHours.save(session()), /overlaps/);
  assert.throws(() => TeachingHours.save(session({ class_id: 'CL-002' })), /overlaps/);
  assert.throws(() => TeachingHours.save(session({ teacher_id: 'TCH-002' })), /overlaps/);
  assert.equal(TeachingHours.save(session(), first.id).id, first.id);
  assert.ok(TeachingHours.save(session({ actual_start: '10:30', actual_end: '11:00', break_minutes: 0 })).id);
});

test('substitute teachers receive their actual hours; monthly filters and corrections are exact', () => {
  const { TeachingHours, Store } = fixture();
  const actual = TeachingHours.save(session({ teacher_id: 'TCH-002', duration_minutes: 9999 }));
  assert.equal(actual.duration_minutes, 80);
  assert.equal(TeachingHours.summary({ month: '2000-01', teacher: 'TCH-001' })[0].minutes, 0);
  assert.equal(TeachingHours.summary({ month: '2000-01', teacher: 'TCH-002', class: 'CL-001' })[0].minutes, 80);
  assert.equal(TeachingHours.records({ month: '2000-02' }).length, 0);
  TeachingHours.save({ actual_end: '11:00' }, actual.id);
  assert.equal(TeachingHours.summary({ teacher: 'TCH-002' })[0].minutes, 110);
  Store.update('classes', 'CL-001', { teacher_id: 'TCH-003' });
  assert.equal(TeachingHours.summary({ teacher: 'TCH-002' })[0].minutes, 110);
  TeachingHours.save({ status: 'Cancelled' }, actual.id);
  assert.equal(TeachingHours.summary({ teacher: 'TCH-002' })[0].minutes, 0);
});

test('Admin/Manager record hours, Sales cannot read or modify them, and records persist', () => {
  const { TeachingHours, Workforce, Store } = fixture();
  Workforce.setActor('EMP-001');
  const actual = TeachingHours.save(session());
  assert.equal(actual.confirmed_by, 'EMP-001');
  Store.init();
  assert.equal(Store.list('teaching_sessions')[0].duration_minutes, 80);
  Workforce.setActor('EMP-002');
  assert.equal(Workforce.canCreate('teaching_sessions'), false);
  assert.equal(Workforce.canEdit('teaching_sessions', actual), false);
  assert.equal(Workforce.records('teaching_sessions').length, 0);
  assert.throws(() => TeachingHours.save(session()), /Only Admin or Manager/);
  assert.throws(() => TeachingHours.summary(), /Only Admin or Manager/);
});
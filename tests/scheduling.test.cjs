const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function fixture(legacy = false) {
  let saved = null;
  const context = {
    structuredClone,
    localStorage: {
      getItem: () => saved,
      setItem: (key, value) => { saved = value; }
    }
  };
  context.window = context;
  vm.createContext(context);
  for (const file of ['data/demo-data.js', 'services/storage.js', 'services/scheduling.js']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../assets/js', file), 'utf8'), context);
  }
  if (legacy) {
    const data = structuredClone(context.DEMO_SEED);
    delete data.teachers;
    delete data.rooms;
    data.classes.push({ id: 'CUSTOM', teacher: 'Custom Teacher' });
    data.schedules.push({ id: 'CUSTOM-SC', room: 'https://example.com/meeting' });
    saved = JSON.stringify(data);
  }
  context.Store.init();
  return context;
}

test('legacy migration preserves custom data and is idempotent', () => {
  const { Store } = fixture(true);
  assert.equal(Store.list('classes').length, 4);
  assert.ok(Store.list('teachers').some(record => record.full_name === 'Custom Teacher'));
  assert.equal(Store.list('schedules').at(-1).meeting_link, 'https://example.com/meeting');
  const migrated = JSON.stringify(Store.data);
  Store.init();
  assert.equal(JSON.stringify(Store.data), migrated);
});

test('new seed links teachers and rooms without duplicating them', () => {
  const { Store } = fixture();
  assert.equal(Store.list('teachers').length, 3);
  assert.equal(Store.list('rooms').length, 3);
  assert.equal(Store.list('classes')[0].teacher_id, 'TCH-001');
  assert.equal(Store.list('schedules')[0].room_id, 'RM-201');
  assert.match(Store.add('teachers', { full_name: 'New Teacher' }).id, /^TCH-/);
  assert.match(Store.add('rooms', { name: 'New Room' }).id, /^RM-/);
});

test('overlapping slots are blocked but adjacent slots and disjoint dates are allowed', () => {
  const { Store, Scheduling } = fixture();
  const base = { ...Store.list('schedules')[0] };
  assert.equal(Scheduling.validate('schedules', base, base.id), '');
  assert.match(Scheduling.validate('schedules', { ...base, start: '17:30', end: '19:00' }), /overlaps/);
  assert.equal(Scheduling.validate('schedules', { ...base, start: '18:30', end: '19:00' }), '');
  Store.update('schedules', base.id, { end_date: '2026-11-03' });
  assert.equal(Scheduling.validate('schedules', { ...base, start_date: '2026-11-10' }), '');
  assert.equal(Scheduling.sharedWeekday({ day: 'Monday', start_date: '2026-11-03', end_date: '2026-11-08' }, { day: 'Monday' }), false);
});

test('teacher and physical room conflicts are independent; online space can be shared', () => {
  const { Store, Scheduling } = fixture();
  const base = { ...Store.list('schedules')[0] };
  Store.add('classes', { id: 'CL-TEST', name: 'Other class', teacher_id: 'TCH-001', capacity: 2, status: 'Active' });
  assert.equal(Scheduling.conflicts({ ...base, class_id: 'CL-TEST', room_id: 'RM-105' }).length, 1);
  Store.update('classes', 'CL-TEST', { teacher_id: 'TCH-002' });
  assert.equal(Scheduling.conflicts({ ...base, class_id: 'CL-TEST', room_id: 'RM-201' }).length, 1);
  Store.update('schedules', base.id, { room_id: 'RM-ONLINE' });
  assert.equal(Scheduling.conflicts({ ...base, class_id: 'CL-TEST', room_id: 'RM-ONLINE' }).length, 0);
});

test('time, capacity and class reassignment rules protect existing schedules', () => {
  const { Store, Scheduling } = fixture();
  const base = { ...Store.list('schedules')[0] };
  assert.match(Scheduling.validate('schedules', { ...base, start: '19:00', end: '18:00' }), /End time/);
  assert.match(Scheduling.validate('schedules', { ...base, room_id: 'RM-105' }), /capacity/);
  assert.match(Scheduling.validate('rooms', { name: 'Room 201', type: 'Classroom', capacity: 5 }, 'RM-201'), /capacity/);
  assert.match(Scheduling.validate('rooms', { name: 'Invalid room', type: 'Classroom', capacity: -1 }), /positive/);
  Store.add('schedules', { ...base, id: 'SC-OTHER', class_id: 'CL-002', room_id: 'RM-105' });
  const otherClass = Store.list('classes').find(record => record.id === 'CL-002');
  assert.match(Scheduling.validate('classes', { ...otherClass, teacher_id: 'TCH-001' }, 'CL-002'), /already assigned/);
});

test('calendar events honor filters, cancellations and inclusive recurrence end dates', () => {
  const { Store, Scheduling } = fixture();
  const base = Store.list('schedules')[0];
  assert.equal(Scheduling.events({ room: 'RM-201', teacher: 'TCH-001', class: 'CL-001' }).length, 1);
  Store.update('schedules', base.id, { end_date: '2026-11-10' });
  const event = Scheduling.events({ class: 'CL-001' })[0];
  assert.equal(event.startRecur, '2026-11-03');
  assert.equal(event.endRecur, '2026-11-11');
  assert.equal(event.daysOfWeek[0], 2);
  Store.update('schedules', base.id, { status: 'Cancelled' });
  assert.equal(Scheduling.events({ class: 'CL-001' }).length, 0);
  assert.equal(Scheduling.validate('schedules', { ...base, status: 'Cancelled' }), '');
});
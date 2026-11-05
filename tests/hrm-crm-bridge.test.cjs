const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function fixture(){
  const values=new Map();
  const storage={getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value)};
  const context={localStorage:storage,window:{},document:{querySelector:()=>null},CSS:{escape:value=>value}};
  context.window=context;vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../assets/js/services/hrm-crm-bridge.js'),'utf8'),context);
  const crm={teachers:[
    {id:'TCH-1',full_name:'CRM Teacher One',status:'Active'},
    {id:'TCH-2',full_name:'CRM Teacher Two',status:'Active'},
    {id:'TCH-X',full_name:'Inactive Teacher',status:'Inactive'}
  ],classes:[
    {id:'CL-1',name:'English Group',subject:'English',mode:'Group'},
    {id:'CL-2',name:'Physics One-on-one',subject:'Physics',mode:'1-on-1'}
  ],teaching_sessions:[
    {id:'TS-1',teacher_id:'TCH-1',class_id:'CL-1',date:'2026-11-03',actual_start:'09:00',actual_end:'10:30',break_minutes:10,duration_minutes:80,status:'Completed'},
    {id:'TS-2',teacher_id:'TCH-1',class_id:'CL-2',date:'2026-11-04',actual_start:'09:00',actual_end:'10:00',break_minutes:0,duration_minutes:60,status:'Completed'},
    {id:'TS-DRAFT',teacher_id:'TCH-1',class_id:'CL-1',date:'2026-11-04',actual_start:'10:00',actual_end:'11:00',duration_minutes:60,status:'Draft'},
    {id:'TS-OTHER-MONTH',teacher_id:'TCH-1',class_id:'CL-1',date:'2026-10-03',actual_start:'09:00',actual_end:'10:00',duration_minutes:60,status:'Completed'},
    {id:'TS-2',teacher_id:'TCH-1',class_id:'CL-1',date:'2026-11-05',actual_start:'09:00',actual_end:'10:00',duration_minutes:60,status:'Completed'}
  ]};
  storage.setItem('edtech_crm_demo_v1',JSON.stringify(crm));
  return {bridge:context.HrmCrmBridge,crm,storage};
}

test('reads shared CRM source without modifying its session data',()=>{
  const {bridge,crm,storage}=fixture(),before=storage.getItem(bridge.crmKey);
  assert.equal(bridge.readCrm().connected,true);
  assert.deepEqual(Array.from(bridge.readCrm().data.teaching_sessions,session=>session.id),crm.teaching_sessions.map(session=>session.id));
  assert.equal(storage.getItem(bridge.crmKey),before);
  storage.setItem(bridge.crmKey,'{broken');
  assert.equal(bridge.readCrm().connected,false);
});

test('teacher mapping is explicit, active-only and one-to-one',()=>{
  const {bridge,crm}=fixture(),state=bridge.readState();
  assert.throws(()=>bridge.setTeacherLink(state,'TEA-1','TCH-X',crm),/active CRM teacher/);
  bridge.setTeacherLink(state,'TEA-1','TCH-1',crm);
  assert.throws(()=>bridge.setTeacherLink(state,'TEA-2','TCH-1',crm),/already linked/);
  assert.equal(bridge.setTeacherLink(state,'TEA-1','',crm).employeeLinks['TEA-1'],undefined);
});

test('imports only completed sessions for the month and resolves subject/class rates',()=>{
  const {bridge,crm}=fixture(),state=bridge.readState();
  bridge.setTeacherLink(state,'TEA-1','TCH-1',crm);
  state.salaryRates=[
    {employeeCode:'TEA-1',subject:'English',classType:'Group',hourlyRate:200000,effectiveFrom:'2026-01-01',active:true},
    {employeeCode:'TEA-1',subject:'Physics',classType:'1-on-1',hourlyRate:300000,effectiveFrom:'2026-01-01',active:true}
  ];
  const rows=bridge.sessions(crm,state,'2026-11');
  assert.equal(rows.length,2);
  assert.equal(rows.some(row=>row.sessionId==='TS-DRAFT'),false);
  assert.equal(rows.some(row=>row.sessionId==='TS-OTHER-MONTH'),false);
  assert.equal(rows.filter(row=>row.sessionId==='TS-2').length,1);
  assert.equal(rows.find(row=>row.sessionId==='TS-1').minutes,80);
  assert.equal(rows.find(row=>row.sessionId==='TS-1').rate,200000);
  assert.equal(rows.find(row=>row.sessionId==='TS-1').payrollAmount,null);
});

test('approvals require explicit mapping and matching rate; CRM session changes invalidate approval',()=>{
  const {bridge,crm}=fixture(),state=bridge.readState();
  assert.throws(()=>bridge.approve(state,crm,'TS-1'),/Link this CRM teacher/);
  bridge.setTeacherLink(state,'TEA-1','TCH-1',crm);
  assert.throws(()=>bridge.approve(state,crm,'TS-1'),/No active salary rate/);
  state.salaryRates=[{employeeCode:'TEA-1',subject:'English',classType:'Group',hourlyRate:200000,effectiveFrom:'2026-01-01',active:true}];
  bridge.approve(state,crm,'TS-1');
  assert.equal(bridge.sessions(crm,state,'2026-11').find(row=>row.sessionId==='TS-1').approvalStatus,'Approved');
  crm.teaching_sessions.find(session=>session.id==='TS-1').actual_end='11:00';
  assert.equal(bridge.sessions(crm,state,'2026-11').find(row=>row.sessionId==='TS-1').approvalStatus,'Changed since approval');
  assert.equal(bridge.payrollRows(state,crm,'2026-11').length,0);
});

test('payroll is blocked by any unapproved/unrated completed session and snapshots approved totals',()=>{
  const {bridge,crm,storage}=fixture(),state=bridge.readState();
  bridge.setTeacherLink(state,'TEA-1','TCH-1',crm);
  state.salaryRates=[
    {employeeCode:'TEA-1',subject:'English',classType:'Group',hourlyRate:200000,effectiveFrom:'2026-01-01',active:true},
    {employeeCode:'TEA-1',subject:'Physics',classType:'1-on-1',hourlyRate:300000,effectiveFrom:'2026-01-01',active:true}
  ];
  bridge.approveMany(state,crm,['TS-1','TS-2']);
  crm.teaching_sessions.push({id:'TS-UNAPPROVED',teacher_id:'TCH-1',class_id:'CL-1',date:'2026-11-06',actual_start:'11:00',actual_end:'12:00',duration_minutes:60,status:'Completed'});
  assert.throws(()=>bridge.createPayrollRun(state,crm,'2026-11'),/blocked/);
  crm.teaching_sessions=crm.teaching_sessions.filter(session=>session.id!=='TS-2'&&session.id!=='TS-UNAPPROVED');
  const run=bridge.createPayrollRun(state,crm,'2026-11',{ 'TEA-1':'HRM Teacher One' });
  assert.equal(run.status,'Draft');
  assert.equal(run.rows[0].employeeName,'HRM Teacher One');
  assert.equal(run.rows[0].minutes,80);
  assert.equal(run.rows[0].gross,Math.round(80/60*200000));
  assert.deepEqual(Array.from(run.sessionIds),['TS-1']);
  assert.ok(JSON.parse(storage.getItem(bridge.hrmKey)).payrollRuns.some(saved=>saved.id===run.id));
});
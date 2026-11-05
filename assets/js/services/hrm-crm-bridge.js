window.HrmCrmBridge={
  crmKey:"edtech_crm_demo_v1",
  hrmKey:"education_hrm_prototype_v1",
  defaultRates:[
    {id:"RATE-001",employeeCode:"TEA-001",subject:"English",classType:"1-on-1",hourlyRate:250000,effectiveFrom:"2026-01-01",active:true},
    {id:"RATE-002",employeeCode:"TEA-001",subject:"English",classType:"Group",hourlyRate:200000,effectiveFrom:"2026-01-01",active:true},
    {id:"RATE-003",employeeCode:"TEA-002",subject:"Physics",classType:"Group",hourlyRate:300000,effectiveFrom:"2026-01-01",active:true}
  ],
  readCrm(storage=localStorage){
    try{
      let data=JSON.parse(storage.getItem(this.crmKey)||"null");
      if(!data||!Array.isArray(data.teachers)||!Array.isArray(data.classes)||!Array.isArray(data.teaching_sessions))return {connected:false,data:null,error:"CRM data schema is unavailable."};
      return {connected:true,data,error:""};
    }catch(error){return {connected:false,data:null,error:"CRM LocalStorage is unavailable or invalid."}}
  },
  readState(storage=localStorage){
    try{
      let saved=JSON.parse(storage.getItem(this.hrmKey)||"null");
      return {version:1,employeeLinks:saved?.employeeLinks||{},approvals:saved?.approvals||{},salaryRates:saved?.salaryRates||this.defaultRates.slice(),payrollRuns:saved?.payrollRuns||[],updatedAt:saved?.updatedAt||""};
    }catch(error){return {version:1,employeeLinks:{},approvals:{},salaryRates:this.defaultRates.slice(),payrollRuns:[],updatedAt:""}}
  },
  saveState(state,storage=localStorage){state.updatedAt=new Date().toISOString();storage.setItem(this.hrmKey,JSON.stringify(state));return state},
  setTeacherLink(state,employeeCode,crmTeacherId,crmData){
    let teacher=crmData?.teachers?.find(record=>record.id===crmTeacherId&&record.status==="Active");
    if(crmTeacherId&&!teacher)throw Error("Select an active CRM teacher.");
    if(crmTeacherId){
      let duplicate=Object.entries(state.employeeLinks).find(([code,id])=>code!==employeeCode&&id===crmTeacherId);
      if(duplicate)throw Error(`CRM teacher is already linked to HRM employee ${duplicate[0]}.`);
      state.employeeLinks[employeeCode]=crmTeacherId;
    }else delete state.employeeLinks[employeeCode];
    return state;
  },
  saveSalaryRate(state,employee,values,id=null){
    if(!employee||employee.type!=="Teacher"||employee.status!=="Active"||!state.employeeLinks[employee.code])throw Error("Link this active HRM teacher to an active CRM teacher first.");
    if(!values.subject?.trim()||!["Group","1-on-1"].includes(values.classType)||!Number.isFinite(Number(values.hourlyRate))||Number(values.hourlyRate)<=0||!/^\d{4}-\d{2}-\d{2}$/.test(values.effectiveFrom||""))throw Error("Enter a subject, class type, positive hourly rate and effective date.");
    if(values.effectiveTo&&(!/^\d{4}-\d{2}-\d{2}$/.test(values.effectiveTo)||values.effectiveTo<values.effectiveFrom))throw Error("Rate end date must be on or after the effective date.");
    let duplicate=state.salaryRates.find(rate=>rate.id!==id&&rate.employeeCode===employee.code&&rate.subject===values.subject.trim()&&rate.classType===values.classType&&rate.effectiveFrom===values.effectiveFrom);
    if(duplicate)throw Error("A rate with this employee, subject, class type and effective date already exists.");
    let rate={...values,id:id||`RATE-${Date.now()}`,employeeCode:employee.code,subject:values.subject.trim(),hourlyRate:Number(values.hourlyRate),active:values.active!==false};
    if(id){let index=state.salaryRates.findIndex(item=>item.id===id);if(index<0)throw Error("Salary rate not found.");state.salaryRates[index]=rate}else state.salaryRates.push(rate);
    return rate;
  },
  minutes(session){
    let start=this.clockMinutes(session.actual_start),end=this.clockMinutes(session.actual_end),breakMinutes=Number(session.break_minutes||0);
    if(start!==null&&end>start&&Number.isInteger(breakMinutes)&&breakMinutes>=0&&breakMinutes<end-start)return end-start-breakMinutes;
    return Number.isInteger(session.duration_minutes)&&session.duration_minutes>0?session.duration_minutes:0;
  },
  clockMinutes(value){if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(value||""))return null;let [hours,minutes]=value.split(":").map(Number);return hours*60+minutes},
  fingerprint(session){return [session.teacher_id,session.class_id,session.date,session.actual_start,session.actual_end,Number(session.break_minutes||0),this.minutes(session)].join("|")},
  rateFingerprint(rate){return rate?JSON.stringify([rate.employeeCode,rate.subject,rate.classType,Number(rate.hourlyRate),rate.effectiveFrom||"",rate.effectiveTo||""]):""},
  findRate(state,employeeCode,classRecord,date){
    return state.salaryRates.filter(rate=>rate.employeeCode===employeeCode&&rate.active!==false&&rate.subject===classRecord?.subject&&rate.classType===classRecord?.mode&&(!rate.effectiveFrom||rate.effectiveFrom<=date)&&(!rate.effectiveTo||rate.effectiveTo>=date)).sort((first,second)=>(second.effectiveFrom||"").localeCompare(first.effectiveFrom||""))[0]||null;
  },
  sessions(crmData,state,month){
    if(!crmData||!Array.isArray(crmData.teaching_sessions))return [];
    let teacherCodeById=Object.fromEntries(Object.entries(state.employeeLinks).map(([code,id])=>[id,code]));
    let uniqueSessions=new Map();
    crmData.teaching_sessions.filter(session=>session.id&&session.status==="Completed"&&/^\d{4}-\d{2}$/.test(month||"")&&session.date?.slice(0,7)===month).forEach(session=>{if(!uniqueSessions.has(session.id))uniqueSessions.set(session.id,session)});
    return [...uniqueSessions.values()].map(session=>{
      let teacher=crmData.teachers.find(record=>record.id===session.teacher_id)||null,classRecord=crmData.classes.find(record=>record.id===session.class_id)||null,employeeCode=teacherCodeById[session.teacher_id]||"",rate=employeeCode?this.findRate(state,employeeCode,classRecord,session.date):null,approval=state.approvals[session.id],fingerprint=this.fingerprint(session),rateFingerprint=this.rateFingerprint(rate),approved=approval?.status==="Approved"&&approval.fingerprint===fingerprint&&approval.rateFingerprint===rateFingerprint;
      let approvalStatus=!employeeCode?"Unlinked HRM employee":!rate?"Rate missing":approved?"Approved":approval?.status==="Approved"?"Changed since approval":"Pending approval";
      return {sessionId:session.id,teacherId:session.teacher_id,teacherName:teacher?.full_name||"Unknown CRM teacher",employeeCode,classId:session.class_id,className:classRecord?.name||"Unknown class",subject:classRecord?.subject||"",classType:classRecord?.mode||"",date:session.date,start:session.actual_start,end:session.actual_end,breakMinutes:Number(session.break_minutes||0),minutes:this.minutes(session),fingerprint,rate:rate?.hourlyRate||null,approvalStatus,approved,payrollAmount:approved&&rate?Math.round(this.minutes(session)/60*rate.hourlyRate):null};
    }).sort((first,second)=>second.date.localeCompare(first.date)||first.start.localeCompare(second.start)||first.sessionId.localeCompare(second.sessionId));
  },
  approve(state,crmData,sessionId){
    let session=crmData?.teaching_sessions?.find(record=>record.id===sessionId&&record.status==="Completed");
    if(!session)throw Error("Only a completed CRM session can be approved.");
    let row=this.sessions(crmData,state,session.date.slice(0,7)).find(record=>record.sessionId===sessionId);
    if(!row?.employeeCode)throw Error("Link this CRM teacher to an HRM employee before approval.");
    if(!row.rate)throw Error("No active salary rate matches this employee, subject and class type.");
    state.approvals[sessionId]={status:"Approved",fingerprint:row.fingerprint,rateFingerprint:this.rateFingerprint(this.findRate(state,row.employeeCode,crmData.classes.find(record=>record.id===row.classId),row.date)),approvedAt:new Date().toISOString()};
    return state;
  },
  approveMany(state,crmData,sessionIds){let approved=[];sessionIds.forEach(id=>{this.approve(state,crmData,id);approved.push(id)});return approved},
  payrollRows(state,crmData,month){
    let rows=new Map();
    this.sessions(crmData,state,month).filter(session=>session.approved&&session.payrollAmount!==null).forEach(session=>{
      let row=rows.get(session.employeeCode)||{employeeCode:session.employeeCode,sessions:0,minutes:0,gross:0,sessionIds:[],details:[]};
      row.sessions++;row.minutes+=session.minutes;row.gross+=session.payrollAmount;row.sessionIds.push(session.sessionId);row.details.push({sessionId:session.sessionId,subject:session.subject,classType:session.classType,minutes:session.minutes,hourlyRate:session.rate,amount:session.payrollAmount});rows.set(session.employeeCode,row);
    });
    return [...rows.values()];
  },
  createPayrollRun(state,crmData,month,employeeNames={}){
    let sessions=this.sessions(crmData,state,month),blocked=sessions.filter(session=>session.approvalStatus!=="Approved");
    if(blocked.length)throw Error(`Payroll is blocked: ${blocked.length} completed CRM session(s) need teacher mapping, an active salary rate or approval.`);
    let rows=this.payrollRows(state,crmData,month).map(row=>({...row,employeeName:employeeNames[row.employeeCode]||row.employeeCode}));
    if(!rows.length)throw Error("No approved, rate-matched teaching sessions are available for this month.");
    if(state.payrollRuns.some(run=>run.month===month))throw Error("A payroll run already exists for this month. Reopen or cancel the existing run before creating another.");
    let run={id:`PR-${month}-${Date.now()}`,month,status:"Draft",createdAt:new Date().toISOString(),sessionIds:sessions.map(session=>session.sessionId),rows,totalGross:rows.reduce((sum,row)=>sum+row.gross,0)};
    state.payrollRuns=state.payrollRuns||[];state.payrollRuns.push(run);this.saveState(state);return run;
  },
  summary(rows){
    let map=new Map();
    rows.forEach(row=>{
      if(!row.employeeCode)return;
      let item=map.get(row.employeeCode)||{employeeCode:row.employeeCode,minutes:0,approvedMinutes:0,approvedAmount:0,sessions:0,pending:0,rateMissing:0,changed:0,unlinked:0};
      item.sessions++;
      if(row.approved&&row.payrollAmount!==null){item.approvedMinutes+=row.minutes;item.approvedAmount+=row.payrollAmount}
      if(row.approvalStatus==="Pending approval")item.pending++;
      if(row.approvalStatus==="Rate missing")item.rateMissing++;
      if(row.approvalStatus==="Changed since approval")item.changed++;
      item.minutes+=row.minutes;map.set(row.employeeCode,item);
    });
    return [...map.values()];
  }
};
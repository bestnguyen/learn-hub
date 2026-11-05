window.HrmIntegration={
  state:null,
  crm:null,
  employeeNames:{},
  editingEmployeeCode:"",
  escape(value){return String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]))},
  month(){return document.querySelector("#timesheetMonth")?.value||`${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,"0")}`},
  money(value){return new Intl.NumberFormat("vi-VN").format(Number(value)||0)+" ₫"},
  hours(minutes){return `${new Intl.NumberFormat("vi-VN",{maximumFractionDigits:2}).format((Number(minutes)||0)/60)} h`},
  employeeRows(){return [...document.querySelectorAll("#employeeRows tr")].map(row=>({row,code:row.dataset.employeeCode||row.children[1]?.textContent.trim(),name:row.children[0]?.querySelector("b")?.textContent.trim(),type:row.dataset.type,status:row.dataset.status}))},
  read(){this.crm=HrmCrmBridge.readCrm().data;this.state=HrmCrmBridge.readState();return this.crm},
  persist(){HrmCrmBridge.saveState(this.state)},
  renderConnection(){
    let badge=document.querySelector("#crmSettingsBadge"),message=document.querySelector("#crmSettingsMessage"),checked=document.querySelector("#crmSettingsLastSync");if(!badge)return;
    if(this.crm){let completed=this.crm.teaching_sessions.filter(session=>session.status==="Completed").length;badge.className="badge b-green";badge.textContent="Connected";message.textContent=`Read-only CRM source. ${completed} completed CRM session(s) currently exist; HRM imports them by session ID and stores approvals/rates in its own local data.`;checked.textContent=`Last checked: ${new Date().toLocaleString()}. Refresh again after recording or editing CRM sessions.`}
    else{badge.className="badge b-orange";badge.textContent="Unavailable";message.textContent=`${HrmCrmBridge.readCrm().error||"CRM data is unavailable."} Open both prototypes from the same browser origin (prefer the local HTTP server); HRM will not substitute demo hours.`;checked.textContent="No CRM data imported."}
  },
  populateCrmTeacherSelect(selected=""){
    let select=document.querySelector("#fCrmTeacher");if(!select)return;
    let teachers=this.crm?.teachers||[];
    select.innerHTML=`<option value="">Unlinked</option>${teachers.filter(teacher=>teacher.status==="Active").map(teacher=>`<option value="${this.escape(teacher.id)}">${this.escape(teacher.full_name)} · ${this.escape(teacher.id)}</option>`).join("")}`;
    select.value=selected;
  },
  renderEmployeeLinks(){
    this.employeeRows().forEach(({row,code,type})=>{
      if(!code)return;row.dataset.employeeCode=code;
      if(row.children.length===7){let cell=document.createElement("td");cell.dataset.crmTeacherLink="";row.insertBefore(cell,row.lastElementChild)}
      let cell=row.querySelector("[data-crm-teacher-link]");if(!cell)return;
      if(type!=="Teacher"){cell.textContent="—";return}
      let id=this.state.employeeLinks[code],teacher=this.crm?.teachers?.find(record=>record.id===id);
      cell.innerHTML=teacher?`<span class="badge b-green">${this.escape(teacher.full_name)}</span>`:'<span class="badge b-orange">Unlinked</span>';
    });
  },
  bindEmployeeForms(){
    const originalOpen=window.openEmployeeModal,originalEdit=window.editEmployee,originalSave=window.saveEmployee;
    window.openEmployeeModal=()=>{this.editingEmployeeCode="";originalOpen();this.populateCrmTeacherSelect();this.toggleCrmTeacherField()};
    window.editEmployee=(name,code,type,dept,salary)=>{this.editingEmployeeCode=code;originalEdit(name,code,type,dept,salary);this.populateCrmTeacherSelect(this.state.employeeLinks[code]||"");this.toggleCrmTeacherField()};
    window.saveEmployee=()=>{
      let form=document.querySelector("#employeeForm");if(!form.reportValidity())return;
      let code=document.querySelector("#fCode").value.trim(),type=document.querySelector("#fType").value,crmTeacher=type==="Teacher"?document.querySelector("#fCrmTeacher").value:"",oldCode=this.editingEmployeeCode;
      try{if(this.employeeRows().some(employee=>employee.code===code&&employee.code!==oldCode))throw Error("An employee already uses this employee code.");let next=JSON.parse(JSON.stringify(this.state));if(oldCode&&oldCode!==code){if(next.employeeLinks[oldCode]){next.employeeLinks[code]=next.employeeLinks[oldCode];delete next.employeeLinks[oldCode]}next.salaryRates.forEach(rate=>{if(rate.employeeCode===oldCode)rate.employeeCode=code})}HrmCrmBridge.setTeacherLink(next,code,crmTeacher,this.crm);if(oldCode&&oldCode!==code)delete next.employeeLinks[oldCode];originalSave();this.state=next;this.editingEmployeeCode="";this.persist();this.renderEmployeeLinks();this.refreshDashboard()}
      catch(error){toast(error.message)}
    };
    document.querySelector("#fType").addEventListener("change",()=>this.toggleCrmTeacherField());
    this.populateCrmTeacherSelect();this.renderEmployeeLinks();
  },
  toggleCrmTeacherField(){let teacher=document.querySelector("#fType").value==="Teacher";document.querySelector("#crmTeacherField").hidden=!teacher;document.querySelector("#fCrmTeacher").disabled=!teacher},
  timesheetPage(){
    let section=document.querySelector("#page-timesheet");
    section.innerHTML=`<div class="page-head"><div><div class="eyebrow">TEACHING OPERATIONS</div><h1>Teacher Timesheet</h1><div class="subtitle">CRM completed sessions are read-only; HRM stores its approval by unique session ID.</div></div><div class="actions"><label class="field" style="margin:0"><span class="panel-sub">Payroll month</span><input id="timesheetMonth" type="month" value="${this.escape(this.month())}"></label><button id="syncTeachingHours" class="btn">↻ Sync CRM</button><button id="approveSelected" class="btn primary">Approve selected</button></div></div><div id="crmIntegrationState" class="notice integration-state" role="status"></div><div class="grid stats"><div class="card stat"><div class="stat-top">Completed CRM hours</div><div id="tsHours" class="stat-value">0h</div><div class="stat-foot">Current month · actual sessions</div></div><div class="card stat"><div class="stat-top">Completed sessions</div><div id="tsSessions" class="stat-value">0</div><div class="stat-foot">Unique CRM session IDs</div></div><div class="card stat"><div class="stat-top">Needs review / setup</div><div id="tsPending" class="stat-value">0</div><div class="stat-foot">Not yet eligible for payroll</div></div><div class="card stat"><div class="stat-top">Approved gross estimate</div><div id="tsGross" class="stat-value">₫0</div><div class="stat-foot">Approved sessions with matched rates</div></div></div><div class="card table-card"><div class="toolbar"><div class="search"><input id="timesheetSearch" placeholder="Search teacher, session or class..."></div><div class="filters"><select id="timesheetStatus"><option value="">All statuses</option><option>Pending approval</option><option>Approved</option><option>Unlinked HRM employee</option><option>Rate missing</option><option>Changed since approval</option></select><select id="timesheetType"><option value="">All lesson types</option><option value="1-on-1">1-on-1</option><option value="Group">Group</option></select></div><small id="timesheetCount" class="panel-sub"></small></div><table><thead><tr><th><input id="selectAllTimesheets" type="checkbox" aria-label="Select visible sessions"></th><th>Session ID</th><th>Teacher</th><th>CRM teacher ID</th><th>Class / subject</th><th>Type</th><th>Date</th><th>Actual time</th><th>Break</th><th>Actual hours</th><th>Hourly rate</th><th>Gross estimate</th><th>HRM review</th><th>Action</th></tr></thead><tbody id="timesheetRows"></tbody></table></div><div class="notice" style="margin-top:14px">CRM completed sessions are imported read-only. Link HRM teachers explicitly, configure a subject/class-type rate, then approve. Payroll uses only approved sessions whose CRM session and rate still match this review.</div>`;
    document.querySelector("#timesheetMonth").addEventListener("change",()=>this.renderTimesheet());
    document.querySelector("#syncTeachingHours").addEventListener("click",()=>this.sync());
    document.querySelector("#approveSelected").addEventListener("click",()=>this.approveSelected());
    ["timesheetSearch","timesheetStatus","timesheetType"].forEach(id=>document.querySelector(`#${id}`).addEventListener(id==="timesheetSearch"?"input":"change",()=>this.renderTimesheet()));
    document.querySelector("#selectAllTimesheets").addEventListener("change",event=>document.querySelectorAll(".timesheet-select:not(:disabled)").forEach(input=>input.checked=event.target.checked));
    this.renderTimesheet();
  },
  currentRows(){return HrmCrmBridge.sessions(this.crm,this.state,this.month())},
  filteredRows(){let q=document.querySelector("#timesheetSearch").value.trim().toLowerCase(),status=document.querySelector("#timesheetStatus").value,type=document.querySelector("#timesheetType").value;return this.currentRows().filter(row=>(!q||`${row.sessionId} ${row.teacherName} ${row.employeeCode} ${row.className} ${row.subject}`.toLowerCase().includes(q))&&(!status||row.approvalStatus===status)&&(!type||row.classType===type))},
  renderTimesheet(){
    if(!this.crm)this.read();
    let rows=this.filteredRows(),all=this.currentRows(),approved=all.filter(row=>row.approved),pending=all.filter(row=>row.approvalStatus!=="Approved"),totalMinutes=all.reduce((sum,row)=>sum+row.minutes,0),gross=approved.reduce((sum,row)=>sum+(row.payrollAmount||0),0),state=document.querySelector("#crmIntegrationState");
    state.className=`notice integration-state ${this.crm?"ok":"warn"}`;state.textContent=this.crm?`Connected to CRM · ${all.length} unique completed session(s) in ${this.month()} · Last sync ${new Date().toLocaleTimeString()}`:`CRM is not available in this browser origin. Open HRM and CRM from the same local server origin. ${HrmCrmBridge.readCrm().error||""}`;
    document.querySelector("#tsHours").textContent=this.hours(totalMinutes);document.querySelector("#tsSessions").textContent=String(all.length);document.querySelector("#tsPending").textContent=String(pending.length);document.querySelector("#tsGross").textContent=this.money(gross);
    document.querySelector("#timesheetCount").textContent=`${rows.length} sessions`;
    document.querySelector("#timesheetRows").innerHTML=rows.map(row=>{
      let checkboxable=row.employeeCode&&row.rate&&!row.approved,action=!row.employeeCode?`<button class="btn small" data-link-employee="${this.escape(row.employeeCode)}" data-session-teacher="${this.escape(row.teacherId)}">Link HRM teacher</button>`:!row.rate?`<button class="btn small" data-add-rate="${this.escape(row.employeeCode)}" data-subject="${this.escape(row.subject)}" data-class-type="${this.escape(row.classType)}">Add salary rate</button>`:row.approved?'<span class="badge b-green">Approved</span>':`<button class="btn small soft" data-approve-session="${this.escape(row.sessionId)}">Approve</button>`;
      return `<tr data-session-id="${this.escape(row.sessionId)}"><td><input class="timesheet-select" type="checkbox" value="${this.escape(row.sessionId)}" ${checkboxable?"":"disabled"} aria-label="Select session ${this.escape(row.sessionId)}"></td><td><code>${this.escape(row.sessionId)}</code></td><td>${this.escape(row.teacherName)}</td><td>${this.escape(row.teacherId)}<div class="panel-sub">${this.escape(row.employeeCode||"Unlinked")}</div></td><td>${this.escape(row.className)}<div class="panel-sub">${this.escape(row.subject)}</div></td><td>${this.escape(row.classType)}</td><td>${this.escape(row.date)}</td><td>${this.escape(row.start)}–${this.escape(row.end)}</td><td>${row.breakMinutes} min</td><td><b>${this.hours(row.minutes)}</b></td><td>${row.rate?this.money(row.rate)+"/h":'<span class="payroll-hold">Missing</span>'}</td><td>${row.payrollAmount!==null?this.money(row.payrollAmount):"—"}</td><td>${this.statusBadge(row.approvalStatus)}</td><td>${action}</td></tr>`;
    }).join("")||`<tr><td colspan="14"><div class="empty">${this.crm?"No completed CRM teaching sessions for this month.":"Connect CRM to load teaching sessions."}</div></td></tr>`;
    document.querySelectorAll("[data-approve-session]").forEach(button=>button.addEventListener("click",()=>this.approve([button.dataset.approveSession])));
    document.querySelectorAll("[data-link-employee]").forEach(button=>button.addEventListener("click",()=>this.openTeacherLink(button.dataset.sessionTeacher)));
    document.querySelectorAll("[data-add-rate]").forEach(button=>button.addEventListener("click",()=>{navigate("payroll");document.querySelector("#salaryRatesTab").click();this.openRateModal({employeeCode:button.dataset.addRate,subject:button.dataset.subject,classType:button.dataset.classType})}));
    this.renderPayroll();
  },
  statusBadge(status){let klass=status==="Approved"?"b-green":status==="Pending approval"?"b-orange":status==="Rate missing"||status==="Changed since approval"?"b-red":"b-gray";return `<span class="badge ${klass}">${this.escape(status)}</span>`},
  sync(){this.crm=HrmCrmBridge.readCrm().data;this.renderConnection();this.renderEmployeeLinks();this.renderTimesheet();this.refreshDashboard();this.renderPayroll();toast(this.crm?"CRM teaching sessions refreshed (read-only)":"CRM unavailable. Open both apps from the same origin.")},
  approve(sessionIds){
    try{this.crm=HrmCrmBridge.readCrm().data;if(!this.crm)throw Error("CRM is unavailable; no sessions were approved.");let next=JSON.parse(JSON.stringify(this.state));HrmCrmBridge.approveMany(next,this.crm,sessionIds);this.state=next;this.persist();this.renderTimesheet();this.renderPayroll();this.refreshDashboard();toast(`${sessionIds.length} session(s) approved in HRM.`)}catch(error){toast(error.message)}
  },
  approveSelected(){let ids=[...document.querySelectorAll(".timesheet-select:checked")].map(input=>input.value);if(!ids.length){toast("Select eligible sessions first.");return}this.approve(ids)},
  openTeacherLink(teacherId){navigate("employees");let row=this.employeeRows().find(item=>this.state.employeeLinks[item.code]===teacherId)||this.employeeRows().find(item=>item.type==="Teacher"&&!this.state.employeeLinks[item.code]);if(!row){toast("Add an HRM Teacher profile first.");return}editEmployee(row.name,row.code,"Teacher",row.row.children[2].textContent,row.row.children[4].textContent);document.querySelector("#fCrmTeacher").value=teacherId;},
  employeeRows(){return [...document.querySelectorAll("#employeeRows tr")].map(row=>({row,code:row.dataset.employeeCode||row.children[1]?.textContent.trim(),name:row.children[0]?.querySelector("b")?.textContent.trim(),type:row.dataset.type,status:row.dataset.status}))},
  renderEmployeeLinks(){
    this.employeeRows().forEach(({row,code,type})=>{if(!code)return;row.dataset.employeeCode=code;let cell=row.querySelector("[data-crm-teacher-link]");if(!cell){cell=document.createElement("td");cell.dataset.crmTeacherLink="";row.insertBefore(cell,row.lastElementChild)}if(type!=="Teacher"){cell.textContent="—";return}let teacher=this.crm?.teachers?.find(record=>record.id===this.state.employeeLinks[code]);cell.innerHTML=teacher?`<span class="badge b-green">${this.escape(teacher.full_name)}</span>`:'<span class="badge b-orange">Unlinked</span>'});
  },
  wrapEmployeeForms(){
    let originalOpen=window.openEmployeeModal,originalEdit=window.editEmployee,originalSave=window.saveEmployee;
    window.openEmployeeModal=()=>{originalOpen();this.populateCrmTeacherSelect();this.toggleCrmTeacherField()};
    window.editEmployee=(name,code,type,dept,salary)=>{originalEdit(name,code,type,dept,salary);this.populateCrmTeacherSelect(this.state.employeeLinks[code]||"");this.toggleCrmTeacherField()};
    window.saveEmployee=()=>{
      let form=document.querySelector("#employeeForm");if(!form.reportValidity())return;
      let code=document.querySelector("#fCode").value.trim(),type=document.querySelector("#fType").value,crmTeacher=type==="Teacher"?document.querySelector("#fCrmTeacher").value:"";
      try{let next=JSON.parse(JSON.stringify(this.state));HrmCrmBridge.setTeacherLink(next,code,crmTeacher,this.crm);originalSave();this.state=next;this.persist();this.renderEmployeeLinks();this.refreshDashboard()}catch(error){toast(error.message)}
    };
    document.querySelector("#fType").addEventListener("change",()=>this.toggleCrmTeacherField());document.querySelector("#fCrmTeacher").addEventListener("change",()=>this.renderEmployeeLinks());this.renderEmployeeLinks();
  },
  populateCrmTeacherSelect(selected=""){
    let select=document.querySelector("#fCrmTeacher");if(!select)return;let assigned=new Set(Object.values(this.state.employeeLinks));
    select.innerHTML=`<option value="">Unlinked</option>${(this.crm?.teachers||[]).filter(teacher=>teacher.status==="Active"&&(!assigned.has(teacher.id)||teacher.id===selected)).map(teacher=>`<option value="${this.escape(teacher.id)}">${this.escape(teacher.full_name)} · ${this.escape(teacher.id)}</option>`).join("")}`;select.value=selected;
  },
  toggleCrmTeacherField(){let teacher=document.querySelector("#fType").value==="Teacher";document.querySelector("#crmTeacherField").hidden=!teacher;document.querySelector("#fCrmTeacher").disabled=!teacher},
  refreshDashboard(){
    let crm=this.crm,state=this.state,month=this.month();if(!crm)return;
    let rows=HrmCrmBridge.sessions(crm,state,month),hours=rows.reduce((sum,row)=>sum+row.minutes,0),completed=rows.length;
    let dashboard=document.querySelector("#page-dashboard .stats");if(dashboard){let values=dashboard.querySelectorAll(".stat-value");if(values[2])values[2].textContent=this.hours(hours);if(values[3])values[3].textContent=String(rows.filter(row=>row.approvalStatus!=="Approved").length)}
    let teacherActivity=document.querySelector("#dashboardTimesheetActions");if(teacherActivity)teacherActivity.innerHTML=rows.filter(row=>row.approvalStatus!=="Approved").slice(0,3).map(row=>`<div class="activity"><div class="activity-dot"></div><div><b>Timesheet approval · ${this.escape(row.teacherName)}</b><p>${this.escape(row.date)} · ${this.hours(row.minutes)} · ${this.escape(row.approvalStatus)}</p></div><span class="badge b-orange" style="margin-left:auto">Review</span></div>`).join("")||'<div class="activity"><div class="activity-dot"></div><div><b>No teaching sessions pending</b><p>CRM completed sessions are up to date.</p></div></div>';
      let subjectRows=new Map();rows.forEach(row=>subjectRows.set(row.subject,(subjectRows.get(row.subject)||0)+row.minutes));let subjectPanel=[...document.querySelectorAll("#page-dashboard .panel")].find(panel=>panel.querySelector(".panel-title")?.textContent==="Completed teaching hours by subject");if(subjectPanel){let max=Math.max(1,...subjectRows.values());subjectPanel.querySelectorAll(".bar-row").forEach(row=>row.remove());for(let [subject,minutes] of subjectRows){let row=document.createElement("div");row.className="bar-row";row.innerHTML=`<label>${this.escape(subject||"Unspecified")}</label><div class="progress"><span style="width:${minutes/max*100}%"></span></div><b>${this.hours(minutes)}</b>`;subjectPanel.appendChild(row)}if(!subjectRows.size)subjectPanel.insertAdjacentHTML("beforeend",'<div class="panel-sub">No completed CRM teaching sessions this month.</div>')}
  },
  renderPayroll(){
    let month=this.month(),crm=this.crm,state=this.state,crmSessions=crm?HrmCrmBridge.sessions(crm,state,month):[],ready=crm?HrmCrmBridge.payrollRows(state,crm,month):[],blocked=crmSessions.filter(row=>row.approvalStatus!=="Approved"),teacherGross=ready.reduce((sum,row)=>sum+row.gross,0),teacherCount=ready.length;
    let section=document.querySelector("#page-payroll"),stats=section.querySelector(".grid.stats");if(stats)stats.innerHTML=`<div class="card stat"><div class="stat-top">Payroll period</div><div class="stat-value" style="font-size:21px">${this.escape(month)}</div><div class="stat-foot">Teacher component · Draft only</div></div><div class="card stat"><div class="stat-top">Teachers ready</div><div class="stat-value">${teacherCount}</div><div class="stat-foot">With approved and rated sessions</div></div><div class="card stat"><div class="stat-top">Blocked sessions</div><div class="stat-value">${blocked.length}</div><div class="stat-foot">Mapping, rate or approval required</div></div><div class="card stat"><div class="stat-top">Teacher gross estimate</div><div class="stat-value">${this.money(teacherGross)}</div><div class="stat-foot">Office payroll remains separate</div></div>`;
    let body=section.querySelector("#payrollSummary tbody");if(body){[...body.rows].filter(row=>row.cells[1]?.textContent.trim()==="Teacher").forEach(row=>row.remove());let names=Object.fromEntries(this.employeeRows().map(employee=>[employee.code,employee.name]));ready.forEach(item=>{let row=document.createElement("tr");row.innerHTML=`<td>${this.escape(names[item.employeeCode]||item.employeeCode)}</td><td>Teacher</td><td>Hourly</td><td>${this.hours(item.minutes)} · ${item.sessions} sessions</td><td>${this.money(item.gross)}</td><td>₫0</td><td>₫0</td><td><b>${this.money(item.gross)}</b></td><td><span class="badge b-blue">Draft</span></td>`;body.prepend(row)})}
    let notice=section.querySelector(".notice");if(notice)notice.textContent=blocked.length?`Teacher payroll is blocked for ${blocked.length} CRM session(s). Link teacher IDs, configure a matching active hourly rate and approve every completed session before generating payroll. Office attendance/payroll remains unchanged.`:"Teacher component is calculated only from unique, approved CRM sessions with a matching hourly rate. Payroll run is a snapshot; office payroll remains a separate demo component.";
    let generate=section.querySelector("#generatePayrollButton");if(generate){generate.disabled=!crm||blocked.length>0||ready.length===0||state.payrollRuns.some(run=>run.month===month);generate.title=generate.disabled?"Resolve all completed session mapping/rate/approval issues first.":"Create a draft snapshot from approved teacher sessions."}
    let history=section.querySelector("#payrollRunHistory");if(history)history.innerHTML=(state.payrollRuns||[]).slice().reverse().map(run=>`<div class="activity"><div class="activity-dot"></div><div><b>${this.escape(run.month)} teacher payroll draft</b><p>${this.escape(run.id)} · ${run.rows.length} teacher(s) · ${this.money(run.totalGross)} gross</p></div><button class="link" data-view-run="${this.escape(run.id)}">Snapshot</button></div>`).join("")||'<div class="panel-sub">No teacher payroll runs yet.</div>';
  },
  renderRates(){
    let table=document.querySelector("#salaryRates table"),body=document.querySelector("#salaryRateRows");if(!table||!body)return;
    table.querySelector("thead").innerHTML="<tr><th>HRM teacher</th><th>Subject</th><th>Class type</th><th>Hourly rate</th><th>Effective period</th><th>Status</th><th>Action</th></tr>";
    let names=Object.fromEntries(this.employeeRows().map(employee=>[employee.code,employee.name]));
    body.innerHTML=this.state.salaryRates.map(rate=>`<tr><td>${this.escape(names[rate.employeeCode]||rate.employeeCode)}</td><td>${this.escape(rate.subject)}</td><td>${this.escape(rate.classType)}</td><td>${this.money(rate.hourlyRate)}</td><td>${this.escape(rate.effectiveFrom)}${rate.effectiveTo?` – ${this.escape(rate.effectiveTo)}`:" onward"}</td><td><span class="badge ${rate.active===false?"b-gray":"b-green"}">${rate.active===false?"Inactive":"Active"}</span></td><td><button class="link" data-edit-rate="${this.escape(rate.id)}">Edit</button></td></tr>`).join("")||'<tr><td colspan="7"><div class="empty">No salary rates configured.</div></td></tr>';
    body.querySelectorAll("[data-edit-rate]").forEach(button=>button.addEventListener("click",()=>this.openRateModal({},button.dataset.editRate)));
  },
  bindRatesTab(){
    let monthSelect=document.querySelector("#payrollMonth");
    if(monthSelect){let current=new Date(),months=Array.from({length:12},(_,index)=>{let date=new Date(current.getFullYear(),current.getMonth()-index,1);return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}`});monthSelect.innerHTML=months.map(month=>`<option value="${month}">${month}</option>`).join("");monthSelect.value=this.month();monthSelect.addEventListener("change",()=>{let input=document.querySelector("#timesheetMonth");if(input){input.value=monthSelect.value;this.renderTimesheet()}this.renderPayroll()})}
    let typeSelect=document.querySelector("#payrollSummary .filters select:first-child");if(typeSelect)typeSelect.remove();
    let generate=document.querySelector("#page-payroll .page-head .actions .btn.primary");if(generate){generate.id="generatePayrollButton";generate.disabled=true;generate.textContent="Generate teacher payroll draft";generate.onclick=()=>this.generatePayroll()}
    let rates=document.querySelector("#salaryRates"),toolbar=rates?.querySelector(".toolbar");if(toolbar){toolbar.innerHTML='<b>HRM salary rates · demo defaults require employee mapping</b><button id="addSalaryRate" class="btn small primary">＋ Add salary rate</button>';toolbar.querySelector("button").addEventListener("click",()=>this.openRateModal())}
    let tab=document.querySelector('[onclick="switchTab(this,\'salaryRates\')"]');if(tab){tab.id="salaryRatesTab";tab.addEventListener("click",()=>this.renderRates())}this.renderRates();this.renderPayroll();
  },
  openRateModal(prefill={},id=null){
    let rate=id?this.state.salaryRates.find(item=>item.id===id):null,employeeCode=rate?.employeeCode||prefill.employeeCode||"",select=document.querySelector("#rateEmployee"),assigned=new Set(Object.values(this.state.employeeLinks));
    select.innerHTML=this.employeeRows().filter(employee=>employee.type==="Teacher"&&(this.state.employeeLinks[employee.code]||employee.code===employeeCode)).map(employee=>`<option value="${this.escape(employee.code)}">${this.escape(employee.name)} · ${this.escape(this.state.employeeLinks[employee.code]||"Unlinked")}</option>`).join("");select.value=employeeCode;
    let subjects=[...new Set((this.crm?.classes||[]).map(record=>record.subject).filter(Boolean))];document.querySelector("#rateSubject").innerHTML=subjects.map(subject=>`<option>${this.escape(subject)}</option>`).join("");document.querySelector("#rateSubject").value=rate?.subject||prefill.subject||subjects[0]||"";
    document.querySelector("#rateClassType").value=rate?.classType||prefill.classType||"Group";document.querySelector("#rateHourly").value=rate?.hourlyRate||"";document.querySelector("#rateStart").value=rate?.effectiveFrom||`${this.month()}-01`;document.querySelector("#rateEnd").value=rate?.effectiveTo||"";document.querySelector("#rateActive").value=String(rate?.active!==false);this.rateEditId=id;document.querySelector("#rateModalTitle").textContent=id?"Edit salary rate":"Add salary rate";document.querySelector("#rateModal").classList.add("show");
  },
  saveRate(){
    let values={subject:document.querySelector("#rateSubject").value,classType:document.querySelector("#rateClassType").value,hourlyRate:document.querySelector("#rateHourly").value,effectiveFrom:document.querySelector("#rateStart").value,effectiveTo:document.querySelector("#rateEnd").value,active:document.querySelector("#rateActive").value==="true"};
    try{let next=JSON.parse(JSON.stringify(this.state)),employee=this.employeeRows().find(item=>item.code===document.querySelector("#rateEmployee").value);HrmCrmBridge.saveSalaryRate(next,employee,values,this.rateEditId);this.state=next;this.persist();document.querySelector("#rateModal").classList.remove("show");this.renderRates();this.renderTimesheet();toast("Salary rate saved in HRM.")}catch(error){toast(error.message)}
  },
  generatePayroll(){
    try{this.crm=HrmCrmBridge.readCrm().data;if(!this.crm)throw Error("CRM is unavailable; payroll cannot be generated.");let next=JSON.parse(JSON.stringify(this.state)),names=Object.fromEntries(this.employeeRows().map(employee=>[employee.code,employee.name])),run=HrmCrmBridge.createPayrollRun(next,this.crm,this.month(),names);this.state=next;this.renderPayroll();toast(`Draft teacher payroll ${run.id} created from ${run.sessionIds.length} unique CRM sessions.`)}catch(error){toast(error.message)}
  },
  renderRun(runId){let run=this.state.payrollRuns.find(item=>item.id===runId);if(!run)return;let lines=run.rows.map(row=>`${row.employeeName} · ${this.hours(row.minutes)} · ${this.money(row.gross)}`).join("\n");alert(`${run.month} · ${run.id}\nSnapshot: ${run.sessionIds.join(", ")}\n${lines}\nGross: ${this.money(run.totalGross)}`)},
  openTeacherLink(teacherId){navigate("employees");let employee=this.employeeRows().find(item=>this.state.employeeLinks[item.code]===teacherId)||this.employeeRows().find(item=>item.type==="Teacher"&&!this.state.employeeLinks[item.code]);if(!employee){toast("Add an HRM Teacher profile first.");return}editEmployee(employee.name,employee.code,"Teacher",employee.row.children[2].textContent,employee.row.children[4].textContent);document.querySelector("#fCrmTeacher").value=teacherId},
  installPayrollRunHandler(){let button=document.querySelector("#page-payroll .page-head .actions .btn.primary");if(button){button.id="generatePayrollButton";button.textContent="Generate teacher payroll draft";button.onclick=()=>this.generatePayroll()}},
  init(){
    this.crm=HrmCrmBridge.readCrm().data;this.state=HrmCrmBridge.readState();
    this.bindEmployeeForms();this.timesheetPage();this.bindRatesTab();this.installPayrollRunHandler();this.renderConnection();
    document.querySelector("#crmSettingsSync")?.addEventListener("click",()=>this.sync());
    window.addEventListener("storage",event=>{if(event.key===HrmCrmBridge.crmKey){this.sync()}else if(event.key===HrmCrmBridge.hrmKey){this.state=HrmCrmBridge.readState();this.renderEmployeeLinks();this.renderTimesheet();this.renderPayroll()}});
    document.addEventListener("click",event=>{let snapshot=event.target.closest("[data-view-run]");if(snapshot)this.renderRun(snapshot.dataset.viewRun)});
    this.renderEmployeeLinks();this.refreshDashboard();this.renderPayroll();
  }
};
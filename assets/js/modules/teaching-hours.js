window.TeachingHoursPage = {
  filters:{month:new Date().getFullYear()+"-"+String(new Date().getMonth()+1).padStart(2,"0"),teacher:"",class:"",status:""},
  tab:"summary",
  options(entity,label,selected){return Store.list(entity).map(record=>`<option value="${UI.esc(record.id)}" ${selected===record.id?"selected":""}>${UI.esc(record[label])}</option>`).join("")},
  page(){
    return `${pageIntro("Teaching hours","",addButton("teaching_sessions","Record teaching session"))}<div class="hours-filters"><div><label class="form-label" for="hours-month">Month</label><input id="hours-month" class="form-control" type="month" required value="${UI.esc(this.filters.month)}"></div><div><label class="form-label" for="hours-teacher">Actual teacher</label><select class="form-select" id="hours-teacher" data-hours-filter="teacher"><option value="">All teachers</option>${this.options("teachers","full_name",this.filters.teacher)}</select></div><div><label class="form-label" for="hours-class">Class</label><select class="form-select" id="hours-class" data-hours-filter="class"><option value="">All classes</option>${this.options("classes","name",this.filters.class)}</select></div><div><label class="form-label" for="hours-status">Status</label><select class="form-select" id="hours-status" data-hours-filter="status"><option value="">All statuses</option>${TeachingHours.statuses.map(status=>`<option ${status===this.filters.status?"selected":""}>${status}</option>`).join("")}</select></div><button class="btn btn-light" id="hours-clear" aria-label="Clear teaching hour filters" title="Clear teaching hour filters"><i class="bi bi-arrow-counterclockwise"></i></button></div><div id="hours-stats" class="hours-stats" aria-live="polite"></div><nav class="nav nav-tabs mb-3" aria-label="Teaching hours views"><button class="nav-link ${this.tab==="summary"?"active":""}" data-hours-tab="summary">Teacher summary</button><button class="nav-link ${this.tab==="sessions"?"active":""}" data-hours-tab="sessions">Teaching sessions</button></nav><div id="hours-records"></div>`;
  },
  draw(){
    let rows=TeachingHours.records(this.filters),summary=TeachingHours.summary(this.filters),minutes=summary.reduce((total,row)=>total+row.minutes,0),completed=rows.filter(row=>row.status==="Completed").length;
    document.querySelector("#hours-stats").innerHTML=UI.metric("Actual teaching",TeachingHours.formatMinutes(minutes),"bi-clock-history")+UI.metric("Completed sessions",completed,"bi-check-circle")+UI.metric("Draft / cancelled",`${rows.filter(row=>row.status==="Draft").length} / ${rows.filter(row=>row.status==="Cancelled").length}`,"bi-calendar-x");
    let columns=this.tab==="summary"?[
      {label:"Teacher",key:"full_name"},
      {label:"Completed sessions",key:"completed"},
      {label:"Actual hours",render:row=>`<button class="btn btn-link" data-hours-teacher="${UI.esc(row.id)}" title="View teaching sessions">${TeachingHours.formatMinutes(row.minutes)}<i class="bi bi-chevron-right ms-1"></i></button>`},
      {label:"Draft sessions",key:"draft"},
      {label:"Cancelled sessions",key:"cancelled"}
    ]:[
      {label:"Date",key:"date"},
      {label:"Class",render:row=>UI.esc(Store.list("classes").find(record=>record.id===row.class_id)?.name||row.class_id)},
      {label:"Actual teacher",render:row=>UI.esc(Store.list("teachers").find(record=>record.id===row.teacher_id)?.full_name||row.teacher_id)},
      {label:"Duration",render:row=>TeachingHours.formatMinutes(TeachingHours.minutes(row))},
      {label:"Time",render:row=>`${UI.esc(row.actual_start)} - ${UI.esc(row.actual_end)}`},
      {label:"Break (min)",key:"break_minutes"},
      {label:"Status",render:row=>UI.badge(row.status)}
    ];
    document.querySelector("#hours-records").innerHTML=`<div class="card ${this.tab==="summary"?"hours-summary":""}">${UI.table(this.tab==="summary"?"teachers":"teaching_sessions",columns,this.tab==="summary"?summary:rows,this.tab!=="summary")}</div>`;
    document.querySelectorAll("[data-hours-tab]").forEach(button=>{button.classList.toggle("active",button.dataset.hoursTab===this.tab);button.setAttribute("aria-current",button.dataset.hoursTab===this.tab?"page":"false")});
    document.querySelectorAll("[data-hours-teacher]").forEach(button=>button.addEventListener("click",()=>{this.filters.teacher=button.dataset.hoursTeacher;this.tab="sessions";document.querySelector("#hours-teacher").value=this.filters.teacher;this.draw()}));
  },
  mount(){
    let month=document.querySelector("#hours-month");
    month.addEventListener("change",()=>{if(!month.value||!month.reportValidity()){month.value=this.filters.month;return}this.filters.month=month.value;this.draw()});
    document.querySelectorAll("[data-hours-filter]").forEach(select=>select.addEventListener("change",()=>{this.filters[select.dataset.hoursFilter]=select.value;this.draw()}));
    document.querySelectorAll("[data-hours-tab]").forEach(button=>button.addEventListener("click",()=>{this.tab=button.dataset.hoursTab;this.draw()}));
    document.querySelector("#hours-clear").addEventListener("click",()=>{this.filters={month:TeachingHours.today().slice(0,7),teacher:"",class:"",status:""};month.value=this.filters.month;document.querySelectorAll("[data-hours-filter]").forEach(select=>select.value="");this.draw()});
    this.draw();
  },
  bindForm(){
    let form=document.querySelector("#dynamic-form"),classInput=form.querySelector('[name="class_id"]'),teacherInput=form.querySelector('[name="teacher_id"]');
    let teacherChosen=Boolean(teacherInput.value);
    teacherInput.addEventListener("change",()=>{teacherChosen=Boolean(teacherInput.value)});
    if(!editing.id)classInput.addEventListener("change",()=>{if(!teacherChosen)teacherInput.value=Store.list("classes").find(record=>record.id===classInput.value)?.teacher_id||""});
    let duration=document.createElement("output");duration.className="hours-duration";duration.setAttribute("aria-live","polite");form.appendChild(duration);
    let update=()=>{let data=Object.fromEntries(new FormData(form));duration.textContent=`Duration: ${TeachingHours.formatMinutes(TeachingHours.minutes(data))}`};
    form.addEventListener("input",update);form.addEventListener("change",update);update();
  }
};
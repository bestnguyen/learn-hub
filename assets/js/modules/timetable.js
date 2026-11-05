window.Timetable = {
  instance:null,
  filters:{teacher:"",room:"",class:""},
  mobile:false,
  date:null,
  view:null,
  destroy(){if(this.instance){this.date=this.instance.getDate();this.view=this.instance.view.type;this.instance.destroy();this.instance=null}},
  options(entity,display,selected){return Store.list(entity).map(record=>`<option value="${UI.esc(record.id)}" ${record.id===selected?"selected":""}>${UI.esc(record[display])}</option>`).join("")},
  page(){return `${pageIntro(titleFor("timetable"),"",addButton("schedules","Add schedule"))}<div class="timetable-filters"><div><label class="form-label" for="timetable-teacher">Teacher</label><select class="form-select" id="timetable-teacher" data-timetable-filter="teacher"><option value="">All teachers</option>${this.options("teachers","full_name",this.filters.teacher)}</select></div><div><label class="form-label" for="timetable-room">Room</label><select class="form-select" id="timetable-room" data-timetable-filter="room"><option value="">All rooms</option>${this.options("rooms","name",this.filters.room)}</select></div><div><label class="form-label" for="timetable-class">Class</label><select class="form-select" id="timetable-class" data-timetable-filter="class"><option value="">All classes</option>${this.options("classes","name",this.filters.class)}</select></div><div><label class="form-label" for="timetable-view">View</label><select class="form-select" id="timetable-view"><option value="timeGridWeek">Week</option><option value="timeGridDay">Day</option><option value="listWeek">Agenda</option></select></div><button type="button" class="btn btn-light" id="timetable-clear" aria-label="Clear timetable filters" title="Clear timetable filters"><i class="bi bi-arrow-counterclockwise"></i></button></div><div id="timetable-summary" class="timetable-summary" aria-live="polite"></div><div id="center-timetable"></div>`},
  refresh(){
    let events=Scheduling.events(this.filters),conflicts=events.filter(event=>event.classNames.length).length;
    document.querySelector("#timetable-summary").textContent=`${events.length} recurring schedules${conflicts?` | ${conflicts} with conflicts`:""}`;
    if(this.instance){this.instance.removeAllEvents();this.instance.addEventSource(events)}
  },
  mount(){
    if(!window.FullCalendar){document.querySelector("#center-timetable").innerHTML='<div class="alert alert-warning" role="alert">Timetable library could not load. Check your internet connection and reload.</div>';return}
    let mobile=window.matchMedia("(max-width: 767.98px)").matches,view=this.view&&this.mobile===mobile?this.view:mobile?"timeGridDay":"timeGridWeek";
    this.mobile=mobile;
    let events=Scheduling.events(this.filters),allEvents=Scheduling.events(),earliest=Math.min(7,...allEvents.map(event=>Number(event.startTime.slice(0,2)))),latest=Math.min(24,Math.max(22,...allEvents.map(event=>Math.ceil(Number(event.endTime.slice(0,2))+Number(event.endTime.slice(3,5))/60))));
    this.instance=new FullCalendar.Calendar(document.querySelector("#center-timetable"),{
      initialView:view,initialDate:this.date||undefined,firstDay:1,allDaySlot:false,nowIndicator:true,height:"auto",slotMinTime:`${String(earliest).padStart(2,"0")}:00:00`,slotMaxTime:`${String(latest).padStart(2,"0")}:00:00`,scrollTime:"08:00:00",expandRows:true,dayMaxEvents:true,
      headerToolbar:{left:"prev,next today",center:"title",right:""},buttonText:{today:"Today"},events,eventTimeFormat:{hour:"2-digit",minute:"2-digit",hour12:false},slotLabelFormat:{hour:"2-digit",minute:"2-digit",hour12:false},
      eventClick:info=>viewRecord("schedules",info.event.id),
      windowResize:()=>{let mobile=window.matchMedia("(max-width: 767.98px)").matches;if(this.mobile!==mobile){this.mobile=mobile;let view=mobile?"timeGridDay":"timeGridWeek";this.instance.changeView(view);document.querySelector("#timetable-view").value=view}}
    });
    this.instance.render();
    document.querySelector("#timetable-view").value=this.instance.view.type;
    document.querySelector("#timetable-view").addEventListener("change",event=>this.instance.changeView(event.target.value));
    document.querySelectorAll("[data-timetable-filter]").forEach(select=>select.addEventListener("change",()=>{this.filters[select.dataset.timetableFilter]=select.value;this.refresh()}));
    document.querySelector("#timetable-clear").addEventListener("click",()=>{this.filters={teacher:"",room:"",class:""};document.querySelectorAll("[data-timetable-filter]").forEach(select=>select.value="");this.refresh()});
    this.refresh();
  }
};
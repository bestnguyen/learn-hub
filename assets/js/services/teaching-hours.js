window.TeachingHours = {
  statuses:["Draft","Completed","Cancelled"],
  today(){let date=new Date();return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`},
  validDate(value){if(!/^\d{4}-\d{2}-\d{2}$/.test(value||""))return false;let date=new Date(`${value}T00:00:00Z`);return !Number.isNaN(date.getTime())&&date.toISOString().slice(0,10)===value},
  clockMinutes(value){if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(value||""))return null;let [hours,minutes]=value.split(":").map(Number);return hours*60+minutes},
  minutes(record){let start=this.clockMinutes(record.actual_start),end=this.clockMinutes(record.actual_end),rest=Number(record.break_minutes||0);if(start===null||end===null||end<=start||!Number.isInteger(rest)||rest<0||rest>=end-start)return 0;return end-start-rest},
  formatMinutes(value){let minutes=Math.max(0,Number(value)||0);return `${Math.floor(minutes/60)} h ${minutes%60} min`},
  validate(record,id=null){
    if(!Workforce.canManage())return "Only Admin or Manager can record teaching hours.";
    let existing=id?Store.list("teaching_sessions").find(session=>session.id===id):null;
    if(id&&!existing)return "Teaching session not found.";
    let classRecord=Store.list("classes").find(item=>item.id===record.class_id),teacher=Store.list("teachers").find(item=>item.id===record.teacher_id);
    if(!classRecord||classRecord.status!=="Active"&&existing?.class_id!==record.class_id)return "Select an active class.";
    if(!teacher||teacher.status!=="Active"&&existing?.teacher_id!==record.teacher_id)return "Select an active actual teacher.";
    if(!this.validDate(record.date))return "Enter a valid session date.";
    if(!this.statuses.includes(record.status))return "Select Draft, Completed or Cancelled.";
    if(!this.minutes(record))return "End time must follow start time within the same day. Break minutes must be a non-negative whole number below the session duration.";
    if(record.status==="Completed"){
      if(new Date(`${record.date}T${record.actual_end}:00`).getTime()>Date.now())return "A future session cannot be confirmed as completed.";
      let start=this.clockMinutes(record.actual_start),end=this.clockMinutes(record.actual_end);
      let overlap=Store.list("teaching_sessions").find(other=>other.id!==id&&other.status==="Completed"&&other.date===record.date&&(other.teacher_id===record.teacher_id||other.class_id===record.class_id)&&start<this.clockMinutes(other.actual_end)&&end>this.clockMinutes(other.actual_start));
      if(overlap)return `Actual teaching time overlaps with session ${overlap.id}. Check the teacher and class.`;
    }
    return "";
  },
  save(data,id=null){
    let existing=id?Store.list("teaching_sessions").find(session=>session.id===id):null,record={...existing,...data};
    let error=this.validate(record,id);if(error)throw Error(error);
    let now=new Date().toISOString();
    record.break_minutes=Number(record.break_minutes||0);record.duration_minutes=this.minutes(record);record.updated_at=now;record.updated_by=Workforce.actor().id;
    record.created_at=existing?.created_at||now;record.created_by=existing?.created_by||Workforce.actor().id;
    record.confirmed_at=record.status==="Completed"?now:"";record.confirmed_by=record.status==="Completed"?Workforce.actor().id:"";
    return id?Store.update("teaching_sessions",id,record):Store.add("teaching_sessions",record);
  },
  records(filters={}){
    if(!Workforce.canManage())throw Error("Only Admin or Manager can view teaching hours.");
    if(filters.month&&!/^\d{4}-(0[1-9]|1[0-2])$/.test(filters.month))throw Error("Select a valid month.");
    return Store.list("teaching_sessions").filter(record=>(!filters.month||record.date.slice(0,7)===filters.month)&&(!filters.teacher||record.teacher_id===filters.teacher)&&(!filters.class||record.class_id===filters.class)&&(!filters.status||record.status===filters.status)).sort((first,second)=>second.date.localeCompare(first.date)||first.actual_start.localeCompare(second.actual_start));
  },
  summary(filters={}){
    let records=this.records(filters),teachers=Store.list("teachers").filter(teacher=>!filters.teacher||teacher.id===filters.teacher);
    return teachers.map(teacher=>{
      let sessions=records.filter(record=>record.teacher_id===teacher.id),completed=sessions.filter(record=>record.status==="Completed");
      return {id:teacher.id,full_name:teacher.full_name,completed:completed.length,minutes:completed.reduce((total,record)=>total+this.minutes(record),0),draft:sessions.filter(record=>record.status==="Draft").length,cancelled:sessions.filter(record=>record.status==="Cancelled").length};
    });
  }
};
window.Scheduling = {
  days:["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"],
  teacherName(classRecord){return Store.list("teachers").find(record=>record.id===classRecord?.teacher_id)?.full_name||classRecord?.teacher||"Unassigned"},
  roomName(schedule){return Store.list("rooms").find(record=>record.id===schedule.room_id)?.name||schedule.room||"Unassigned"},
  classFor(schedule,override){return override?.id===schedule.class_id?override:Store.list("classes").find(record=>record.id===schedule.class_id)},
  active(schedule,override){return schedule.status!=="Cancelled"&&this.classFor(schedule,override)?.status!=="Inactive"},
  sharedWeekday(first,second){
    if(first.day!==second.day)return false;
    let start=[first.start_date||"1970-01-01",second.start_date||"1970-01-01"].sort().at(-1);
    let end=[first.end_date||"9999-12-31",second.end_date||"9999-12-31"].sort()[0];
    if(start>end)return false;
    let date=new Date(`${start}T00:00:00Z`),weekday=this.days.indexOf(first.day);
    if(weekday<0)return false;
    date.setUTCDate(date.getUTCDate()+(weekday-date.getUTCDay()+7)%7);
    return date.toISOString().slice(0,10)<=end;
  },
  conflicts(schedule,excludeId=null,override=null){
    if(!this.active(schedule,override))return [];
    let classRecord=this.classFor(schedule,override),room=Store.list("rooms").find(record=>record.id===schedule.room_id);
    return Store.list("schedules").filter(other=>{
      if(other.id===excludeId||!this.active(other,override)||!this.sharedWeekday(schedule,other)||schedule.start>=other.end||schedule.end<=other.start)return false;
      let otherClass=this.classFor(other,override);
      return schedule.class_id===other.class_id||Boolean(classRecord?.teacher_id&&classRecord.teacher_id===otherClass?.teacher_id)||Boolean(schedule.room_id&&schedule.room_id===other.room_id&&room?.type!=="Online");
    });
  },
  capacityError(schedule,override=null){
    let classRecord=this.classFor(schedule,override),room=Store.list("rooms").find(record=>record.id===schedule.room_id);
    if(room?.type!=="Online"&&Number(room?.capacity)>0&&Number(classRecord?.capacity)>Number(room.capacity))return `Class capacity exceeds ${room.name} capacity (${room.capacity}).`;
    return "";
  },
  validate(entity,record,id=null){
    if(entity==="teachers"||entity==="rooms"){
      let name=(entity==="teachers"?record.full_name:record.name)||"";
      if(!name.trim())return "Enter a name.";
      if(entity==="rooms"&&record.branch_id&&!Store.list("branches").some(branch=>branch.id===record.branch_id&&branch.status==="Active"))return "Select an active branch.";
      if(entity==="rooms"&&record.type!=="Online"&&(!Number.isInteger(Number(record.capacity))||Number(record.capacity)<1))return "Classroom capacity must be a positive whole number.";
      if(entity==="rooms"&&record.type!=="Online"){
        let oversized=Store.list("schedules").some(schedule=>schedule.room_id===id&&this.active(schedule)&&Number(this.classFor(schedule)?.capacity)>Number(record.capacity));
        if(oversized)return "Room capacity is below the capacity of an assigned class.";
      }
    }
    if(entity==="classes"){
      if(record.branch_id&&!Store.list("branches").some(branch=>branch.id===record.branch_id&&branch.status==="Active"))return "Select an active branch.";
      if(!["Online","Offline"].includes(record.type))return "Select an Online or Offline class type.";
      if(record.capacity&&(!Number.isInteger(Number(record.capacity))||Number(record.capacity)<1))return "Class capacity must be a positive whole number.";
      let teacher=Store.list("teachers").find(resource=>resource.id===record.teacher_id);
      if(!teacher||teacher.status!=="Active")return "Select an active teacher.";
      let proposed={...record,id};
      if(record.status!=="Inactive")for(const schedule of Store.list("schedules").filter(item=>item.class_id===id&&item.status!=="Cancelled")){
        let capacity=this.capacityError(schedule,proposed);if(capacity)return capacity;
        if(this.conflicts(schedule,schedule.id,proposed).length)return "This teacher is already assigned during an existing class schedule.";
      }
    }
    if(entity==="schedules"){
      if(!this.days.includes(record.day)||!record.start||!record.end||record.start>=record.end)return "End time must be later than start time.";
      if(record.end_date&&record.end_date<record.start_date)return "End date must be on or after the effective date.";
      if(record.status==="Cancelled")return "";
      let classRecord=this.classFor(record),room=Store.list("rooms").find(resource=>resource.id===record.room_id);
      if(!classRecord||classRecord.status!=="Active")return "Select an active class.";
      if(!Store.list("teachers").some(teacher=>teacher.id===classRecord.teacher_id&&teacher.status==="Active"))return "Assign an active teacher to this class first.";
      if(!room||room.status!=="Active")return "Select an active room or online space.";
      if(classRecord.branch_id&&room.branch_id&&classRecord.branch_id!==room.branch_id)return "Select a room from the class branch.";
      let capacity=this.capacityError(record);if(capacity)return capacity;
      let conflicts=this.conflicts(record,id);
      if(conflicts.length)return `Schedule overlaps with ${conflicts.map(other=>`${this.classFor(other)?.name||other.class_id} (${other.start}-${other.end}, ${this.roomName(other)})`).join(", ")}. Check class, teacher and room assignments.`;
    }
    return "";
  },
  events(filters={}){
    return Store.list("schedules").filter(schedule=>{
      let classRecord=this.classFor(schedule);
      return this.active(schedule)&&(!filters.teacher||classRecord?.teacher_id===filters.teacher)&&(!filters.room||schedule.room_id===filters.room)&&(!filters.class||schedule.class_id===filters.class);
    }).map(schedule=>{
      let classRecord=this.classFor(schedule),endRecur;
      if(schedule.end_date){let date=new Date(`${schedule.end_date}T00:00:00Z`);date.setUTCDate(date.getUTCDate()+1);endRecur=date.toISOString().slice(0,10)}
      return {id:schedule.id,title:`${classRecord?.name||"Class"} | ${this.teacherName(classRecord)} | ${this.roomName(schedule)}`,daysOfWeek:[this.days.indexOf(schedule.day)],startTime:schedule.start,endTime:schedule.end,startRecur:schedule.start_date||"1970-01-01",endRecur,classNames:this.conflicts(schedule,schedule.id).length?["schedule-conflict"]:[],extendedProps:{schedule}};
    });
  }
};
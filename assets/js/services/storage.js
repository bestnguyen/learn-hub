window.Store = {
  key:"edtech_crm_demo_v1",
  data:null,
  init(){try{this.data=JSON.parse(localStorage.getItem(this.key))||structuredClone(window.DEMO_SEED)}catch(e){this.data=JSON.parse(JSON.stringify(window.DEMO_SEED))}this.migrateResources();this.migrateWorkforce();this.save()},
  migrateResources(){
    this.data.teaching_sessions=this.data.teaching_sessions||[];
    this.data.teachers=this.data.teachers||[];this.data.rooms=this.data.rooms||[];
    const ensure=(entity,name)=>{
      let resource=this.list(entity).find(record=>(record.full_name||record.name).trim().toLowerCase()===name.toLowerCase());
      if(resource)return resource.id;
      let next=this.list(entity).length+1,prefix=entity==="teachers"?"TCH":"RM";
      while(this.list(entity).some(record=>record.id===`${prefix}-MIG-${next}`))next++;
      resource=entity==="teachers"?{full_name:name,phone:"",email:"",subjects:"",status:"Active"}:{name,type:name==="Online"?"Online":"Classroom",capacity:"",location:"",status:"Active"};
      resource.id=`${prefix}-MIG-${next}`;this.data[entity].push(resource);return resource.id;
    };
    this.list("classes").forEach(record=>{if(!record.teacher_id&&record.teacher?.trim())record.teacher_id=ensure("teachers",record.teacher.trim())});
    this.list("schedules").forEach(record=>{if(!record.room_id&&record.room?.trim()){let name=record.room.trim();if(/^https?:\/\//i.test(name)){record.meeting_link=record.meeting_link||name;name="Online"}record.room_id=ensure("rooms",name)}});
  },
  migrateWorkforce(){
    if(!this.data.employees)this.data.employees=structuredClone(window.DEMO_SEED.employees||[{id:"EMP-001",full_name:"Admin Demo",role:"Manager",status:"Active"}]);
    this.data.tasks=this.data.tasks||[];
    if(!this.list("employees").some(employee=>employee.role==="Admin")){
      let id="EMP-ADMIN",next=1;while(this.list("employees").some(employee=>employee.id===id))id=`EMP-ADMIN-${next++}`;
      this.data.employees.push({id,full_name:"System Admin",role:"Admin",status:"Active",email:"system.admin@example.com",phone:""});
    }
    this.list("leads").forEach(lead=>{
      if(!Array.isArray(lead.subjects))lead.subjects=lead.subjects?[lead.subjects]:[];
      if(!lead.lead_source)lead.lead_source="Not specified";
      if(lead.owner_id||!lead.owner?.trim())return;
      let name=lead.owner.trim(),employee=this.list("employees").find(record=>record.role==="Sales"&&record.full_name.trim().toLowerCase()===name.toLowerCase());
      if(!employee){let next=this.list("employees").length+1;while(this.list("employees").some(record=>record.id===`EMP-MIG-${next}`))next++;employee={id:`EMP-MIG-${next}`,full_name:name,role:"Sales",status:"Active",email:"",phone:""};this.data.employees.push(employee)}
      lead.owner_id=employee.id;
    });
    if(!this.list("employees").some(record=>record.id===this.data.current_employee_id&&record.status==="Active"))this.data.current_employee_id=(this.list("employees").find(record=>record.role==="Admin"&&record.status==="Active")||this.list("employees").find(record=>record.role==="Manager"&&record.status==="Active")||this.list("employees").find(record=>record.status==="Active"))?.id||"";
  },
  save(){localStorage.setItem(this.key,JSON.stringify(this.data))},
  reset(){this.data=JSON.parse(JSON.stringify(window.DEMO_SEED));this.migrateResources();this.migrateWorkforce();this.save()},
  list(entity){return this.data[entity]||[]},
  add(entity,record){const prefix={leads:"LD",customers:"CUS",students:"ST",contracts:"CT",classes:"CL",schedules:"SC",enrollments:"EN",teachers:"TCH",rooms:"RM",employees:"EMP",tasks:"TSK",teaching_sessions:"TS"}[entity]||"ID";const next=this.list(entity).length+1;record.id=record.id||`${prefix}-${String(Date.now()).slice(-5)}${next}`;this.data[entity].unshift(record);this.save();return record},
  update(entity,id,record){const arr=this.list(entity);const i=arr.findIndex(x=>x.id===id);if(i>=0){arr[i]={...arr[i],...record};this.save();return arr[i]}return null},
  remove(entity,id){this.data[entity]=this.list(entity).filter(x=>x.id!==id);this.save()}
};

window.Workforce = {
  taskStatuses:["To do","In progress","Blocked","Completed","Cancelled"],
  taskTypes:["Follow-up","Consultation","Trial","Convert lead","Follow contract"],
  contractStatuses:["Draft","Pending signature","Active","Completed","Cancelled"],
  workspaceRole:null,
  workspaceEmployees(){return Store.list("employees").filter(employee=>employee.status==="Active"&&(!this.workspaceRole||employee.role===this.workspaceRole))},
  enterWorkspace(role){
    if(!["Admin","Manager","Sales"].includes(role))throw Error("Unknown workspace role.");
    this.workspaceRole=role;
    let remembered=Store.data.workspace_employee_ids?.[role],employees=this.workspaceEmployees(),employee=employees.find(record=>record.id===remembered)||employees.find(record=>record.id===Store.data.current_employee_id)||employees[0];
    if(employee)this.setActor(employee.id);
  },
  actor(){return this.workspaceEmployees().find(record=>record.id===Store.data.current_employee_id)},
  isAdmin(){return this.actor()?.role==="Admin"},
  isManager(){return this.actor()?.role==="Manager"},
  canManage(){return this.isAdmin()||this.isManager()},
  sales(){return Store.list("employees").filter(record=>record.role==="Sales"&&record.status==="Active")},
  employeeName(id){return Store.list("employees").find(record=>record.id===id)?.full_name||"Unassigned"},
  setActor(id){if(!this.workspaceEmployees().some(record=>record.id===id))throw Error("Select an active employee for this workspace.");Store.data.current_employee_id=id;if(this.workspaceRole){Store.data.workspace_employee_ids=Store.data.workspace_employee_ids||{};Store.data.workspace_employee_ids[this.workspaceRole]=id}Store.save()},
  canCreate(entity){return ["employees","tasks","contracts","teaching_sessions","branches","subjects"].includes(entity)?this.canManage():Boolean(this.actor())},
  canAccessLead(lead){return Boolean(lead&&(this.canManage()||lead.owner_id===this.actor()?.id||Store.list("tasks").some(task=>task.lead_id===lead.id&&task.assignee_id===this.actor()?.id&&task.status!=="Cancelled")))},
  canAccessContract(contract){return Boolean(this.actor()&&contract&&(this.canManage()||Store.list("tasks").some(task=>task.task_type==="Follow contract"&&task.contract_id===contract.id&&task.assignee_id===this.actor().id&&task.status!=="Cancelled")))},
  canEdit(entity,record){
    if(!this.actor())return false;
    if(["branches","subjects"].includes(entity))return this.canManage();
    if(entity==="teaching_sessions")return this.canManage();
    if(entity==="employees")return this.canManage()&&(record?.role!=="Admin"||this.isAdmin());
    if(entity==="tasks")return Boolean(record&&(this.canManage()||record.assignee_id===this.actor().id&&record.status!=="Cancelled"));
    if(entity==="leads")return this.canAccessLead(record);
    if(entity==="contracts")return this.canManage()||this.canAccessContract(record)&&record.status!=="Cancelled";
    return true;
  },
  records(entity){
    let records=Store.list(entity);
    if(entity==="teaching_sessions")return this.canManage()?records:[];
    if(entity==="employees")return this.canManage()?records:[];
    if(entity==="tasks")return this.canManage()?records:records.filter(record=>record.assignee_id===this.actor()?.id);
    if(entity==="leads")return records.filter(record=>this.canAccessLead(record));
    if(entity==="contracts")return records.filter(record=>this.canAccessContract(record));
    return records;
  },
  converted(leadId){return Store.list("leads").some(lead=>lead.id===leadId&&lead.status==="Won")&&Store.list("customers").some(customer=>customer.source_lead===leadId)},
  leadSourceStats(leads=Store.list("leads")){
    let groups=new Map();
    leads.forEach(lead=>{let source=(lead.lead_source||"Not specified").trim()||"Not specified",group=groups.get(source)||{source,leads:0,won:0};group.leads++;if(lead.status==="Won")group.won++;groups.set(source,group)});
    return [...groups.values()].map(group=>({...group,conversion:group.leads?Math.round(group.won/group.leads*100):0})).sort((first,second)=>second.leads-first.leads||first.source.localeCompare(second.source));
  },
  taskTarget(task){
    if(task.task_type==="Follow contract"){
      let contract=Store.list("contracts").find(record=>record.id===task.contract_id),customer=Store.list("customers").find(record=>record.id===contract?.customer_id);
      return {entity:"contracts",id:task.contract_id,label:`${task.contract_id||"Contract"}${customer?` | ${customer.family_name}`:""}`,status:contract?.status||"Unavailable"};
    }
    let lead=Store.list("leads").find(record=>record.id===task.lead_id);
    return {entity:"leads",id:task.lead_id,label:lead?.full_name||task.lead_id||"Lead",status:lead?.status||"Unavailable"};
  },
  overdue(task){let today=new Date(),date=`${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-${String(today.getDate()).padStart(2,"0")}`;return Boolean(task.due_date&&task.due_date<date&&!["Completed","Cancelled"].includes(task.status))},
  ageFromDate(dateOfBirth,today=new Date()){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth||""))return null;
    let [year,month,day]=dateOfBirth.split("-").map(Number),birth=new Date(year,month-1,day);
    if(birth.getFullYear()!==year||birth.getMonth()!==month-1||birth.getDate()!==day||birth>new Date(today.getFullYear(),today.getMonth(),today.getDate()))return null;
    return today.getFullYear()-year-((today.getMonth()+1<month||today.getMonth()+1===month&&today.getDate()<day)?1:0);
  },
  studentPrograms(studentId){
    let enrollments=Store.list("enrollments").filter(enrollment=>enrollment.student_id===studentId&&["Active","On hold"].includes(enrollment.status));
    return [...new Set(enrollments.map(enrollment=>Store.list("classes").find(classRecord=>classRecord.id===enrollment.class_id)?.program).filter(Boolean))];
  },
  validate(entity,data,id=null){
    let existing=id?Store.list(entity).find(record=>record.id===id):null;
    if(id&&!existing)return "Record not found.";
    if(id?!this.canEdit(entity,existing):!this.canCreate(entity))return "You do not have permission for this action.";
    let record={...existing,...data};
    if(["branches","subjects"].includes(entity)){
      if(!this.canManage())return "Only a Manager or Admin can manage configuration.";
      if(!record.name?.trim()||!["Active","Inactive"].includes(record.status))return "Enter a name and status.";
      if(Store.list(entity).some(item=>item.id!==id&&item.name.trim().toLowerCase()===record.name.trim().toLowerCase()))return `A ${entity==="branches"?"branch":"subject"} with this name already exists.`;
    }
    if(entity==="students"){
      if(!record.full_name?.trim()||!Store.list("customers").some(customer=>customer.id===record.customer_id))return "Enter a learner name and select a family customer.";
      if(record.date_of_birth&&this.ageFromDate(record.date_of_birth)===null)return "Enter a valid date of birth that is not in the future.";
      if(record.gender&&!['Female','Male','Non-binary','Prefer not to say'].includes(record.gender))return "Select a valid gender option.";
    }
    if(entity==="employees"){
      if(!record.full_name?.trim()||!["Admin","Manager","Sales"].includes(record.role)||!["Active","Inactive"].includes(record.status))return "Enter an employee name, type and status.";
      if(record.role==="Admin"&&!this.isAdmin())return "Only an Admin can grant Admin access.";
      if(existing?.role==="Admin"&&existing.status==="Active"&&(record.role!=="Admin"||record.status!=="Active")&&!Store.list("employees").some(employee=>employee.id!==id&&employee.role==="Admin"&&employee.status==="Active"))return "At least one active Admin must remain.";
      if(id===this.actor()?.id&&(record.role!==existing.role||record.status!=="Active"))return `You cannot deactivate or change the type of the current ${existing.role.toLowerCase()}.`;
      if(existing?.role==="Sales"&&(record.role!=="Sales"||record.status!=="Active")){
        if(Store.list("leads").some(lead=>lead.owner_id===id&&!["Won","Lost"].includes(lead.status))||Store.list("tasks").some(task=>task.assignee_id===id&&!["Completed","Cancelled"].includes(task.status)))return "Reassign open leads and tasks before changing this Sales employee.";
      }
    }
    if(entity==="leads"){
      if(!record.full_name?.trim()||!record.phone?.trim())return "Enter the lead name and phone number.";
      if(!record.lead_source?.trim()||!(window.FORM_CONFIG?.leads?.fields.find(field=>field.name==="lead_source")?.options||[]).includes(record.lead_source))return "Select a valid lead source.";
      if(!this.canManage()&&(existing?record.owner_id!==existing.owner_id:record.owner_id!==this.actor()?.id))return "Only a manager or Admin can assign or change a Sales owner.";
      if(!this.sales().some(employee=>employee.id===record.owner_id))return "Select an active Sales owner.";
    }
    if(entity==="contracts"){
      if(!this.canManage()){
        if(Object.keys(data).some(key=>!["status","notes"].includes(key)&&data[key]!==existing[key]))return "Only a manager or Admin can change contract details.";
        if(record.status==="Cancelled")return "Only a manager or Admin can cancel a contract.";
        if(existing.status==="Completed"&&record.status!=="Completed")return "Only a manager or Admin can reopen a completed contract.";
      }
      if(!Store.list("customers").some(customer=>customer.id===record.customer_id)||!/^\d{4}-\d{2}-\d{2}$/.test(record.date||"")||record.value===""||record.value==null||!Number.isFinite(Number(record.value))||Number(record.value)<0||!this.contractStatuses.includes(record.status))return "Select a customer, date, non-negative contract value and contract status.";
    }
    if(entity==="tasks"){
      if(!this.canManage()){
        let fields=["title","lead_id","contract_id","assignee_id","task_type","due_date","priority","description","created_by","created_at"];
        if(fields.some(field=>data[field]!==undefined&&data[field]!==existing[field]))return "Only a manager can change task details or assignment.";
        if(record.status==="Cancelled")return "Only a manager can cancel a task.";
      }
      if(!record.title?.trim()||!this.sales().some(employee=>employee.id===record.assignee_id)||!this.taskTypes.includes(record.task_type)||!this.taskStatuses.includes(record.status)||!/^\d{4}-\d{2}-\d{2}$/.test(record.due_date||""))return "Enter a title, active Sales assignee, task type, due date and status.";
      if(record.task_type==="Follow contract"){
        let contract=Store.list("contracts").find(item=>item.id===record.contract_id);
        if(!contract)return "Select a contract to follow.";
        if(contract.status==="Cancelled"&&record.status!=="Cancelled")return "Cannot follow a cancelled contract.";
        if(record.status==="Completed"&&contract.status!=="Completed")return "Complete the contract before completing this task.";
      }else if(!Store.list("leads").some(lead=>lead.id===record.lead_id))return "Select a lead for this task.";
      if(record.task_type==="Convert lead"&&record.status==="Completed"&&!this.converted(record.lead_id))return "Convert the lead to a customer before completing this task.";
    }
    return "";
  },
  save(entity,data,id=null){
    let error=this.validate(entity,data,id);if(error)throw Error(error);
    let now=new Date().toISOString(),existing=id?Store.list(entity).find(record=>record.id===id):null,record={...existing,...data};
    if(entity==="teachers"){record.created_at=existing?.created_at||now;record.updated_at=now}
    if(entity==="leads"){
      record.owner=this.employeeName(record.owner_id);
      record.subjects=Array.isArray(record.subjects)?record.subjects:record.subjects?[record.subjects]:[];
    }
    if(entity==="tasks"){
      if(record.task_type==="Follow contract")record.lead_id="";else record.contract_id="";
      if(!id){record.created_by=this.actor().id;record.created_at=now}
      record.updated_at=now;record.completed_at=record.status==="Completed"?(existing?.completed_at||now):"";
    }
    let saved=id?Store.update(entity,id,record):Store.add(entity,record);
    if(entity==="leads"&&saved.status==="Won")this.ensureCustomer(saved);
    if(entity==="contracts")this.syncContractTasks(saved);
    if(entity==="tasks"&&saved.task_type==="Follow contract")this.syncContractTasks(Store.list("contracts").find(contract=>contract.id===saved.contract_id));
    if(entity==="tasks"&&saved.task_type==="Convert lead"&&this.converted(saved.lead_id)&&!["Completed","Cancelled"].includes(saved.status)){saved.status="Completed";saved.completed_at=now;Store.save()}
    return saved;
  },
  syncContractTasks(contract){
    if(!contract)return;
    let now=new Date().toISOString();
    Store.list("tasks").filter(task=>task.task_type==="Follow contract"&&task.contract_id===contract.id&&task.status!=="Cancelled").forEach(task=>{
      let status=contract.status==="Completed"?"Completed":contract.status==="Cancelled"?"Cancelled":task.status==="Completed"?"In progress":task.status;
      if(task.status!==status){task.status=status;task.completed_at=status==="Completed"?now:"";task.updated_at=now}
    });
    Store.save();
  },
  ensureCustomer(lead){
    let customer=Store.list("customers").find(record=>record.source_lead===lead.id);
    if(!customer)customer=Store.add("customers",{family_name:`${lead.full_name.replace(/\s+\S+$/,"")} Family`,primary_contact:lead.full_name,phone:lead.phone,email:lead.email||"",address:"",source_lead:lead.id});
    Store.list("tasks").filter(task=>task.lead_id===lead.id&&task.task_type==="Convert lead"&&!["Completed","Cancelled"].includes(task.status)).forEach(task=>{task.status="Completed";task.completed_at=new Date().toISOString();task.updated_at=task.completed_at});
    Store.save();return customer;
  },
  convertLead(id){let lead=Store.list("leads").find(record=>record.id===id);if(!this.canAccessLead(lead))throw Error("You do not have permission to convert this lead.");return this.save("leads",{status:"Won"},id)}
};
const PROGRAM_OPTIONS = ["IB","IGCSE","AP","A-level","Cambridge","SAT","SSAT","MYP","PYP","GED","GMAT","ACT"];
const LEAD_SOURCE_OPTIONS = ["Facebook Ads","Google Ads","Website / Organic","Referral","School / Partner","Event / Open Day","Walk-in","Other","Not specified"];

window.FORM_CONFIG = {
  leads:{title:"Lead",fields:[
    {name:"full_name",label:"Full name",type:"text",required:true,placeholder:"Enter full name"},
    {name:"contact_type",label:"Registrant type",type:"select",required:true,options:["Parent","Student"]},
    {name:"lead_source",label:"Lead source",type:"select",required:true,options:LEAD_SOURCE_OPTIONS},
    {name:"phone",label:"Phone number",type:"tel",required:true},
    {name:"email",label:"Email",type:"email"},
    {name:"school",label:"Current school",type:"text"},
    {name:"program",label:"Interested program",type:"select",options:PROGRAM_OPTIONS},
    {name:"subjects",label:"Interested subjects",type:"multiselect-data",source:"subjects",value:"name",display:"name",filter:{status:"Active"}},
    {name:"status",label:"Lead status",type:"select",options:["New","Contacted","Consulting","Trial","Won","Lost"]},
    {name:"owner_id",label:"Sales owner",type:"select-data",source:"employees",display:"full_name",filter:{role:"Sales",status:"Active"},required:true},
    {name:"notes",label:"Notes",type:"textarea",full:true}
  ]},
  employees:{title:"Employee",fields:[
    {name:"full_name",label:"Employee name",type:"text",required:true},
    {name:"role",label:"Employee type",type:"select",required:true,options:["Admin","Manager","Sales"]},
    {name:"phone",label:"Phone",type:"tel"},
    {name:"email",label:"Email",type:"email"},
    {name:"status",label:"Status",type:"select",required:true,options:["Active","Inactive"]}
  ]},
  tasks:{title:"Task",fields:[
    {name:"title",label:"Task title",type:"text",required:true,full:true},
    {name:"task_type",label:"Task type",type:"select",required:true,options:["Follow-up","Consultation","Trial","Convert lead","Follow contract"]},
    {name:"lead_id",label:"Lead",type:"select-data",source:"leads",display:"full_name",required:true},
    {name:"contract_id",label:"Contract",type:"select-data",source:"contracts",display:"id",required:true},
    {name:"assignee_id",label:"Assigned Sales",type:"select-data",source:"employees",display:"full_name",filter:{role:"Sales",status:"Active"},required:true},
    {name:"due_date",label:"Due date",type:"date",required:true},
    {name:"priority",label:"Priority",type:"select",required:true,options:["Normal","High","Urgent"]},
    {name:"status",label:"Status",type:"select",required:true,options:["To do","In progress","Blocked","Completed","Cancelled"]},
    {name:"description",label:"Instructions",type:"textarea",full:true},
    {name:"result",label:"Progress / result",type:"textarea",full:true}
  ]},
  students:{title:"Learner",fields:[
    {name:"customer_id",label:"Family customer",type:"select-data",source:"customers",display:"family_name",required:true},
    {name:"full_name",label:"Learner full name",type:"text",required:true},
    {name:"date_of_birth",label:"Date of birth",type:"date"},
    {name:"gender",label:"Gender",type:"select",options:["Female","Male","Non-binary","Prefer not to say"]},
    {name:"grade",label:"Current grade",type:"select",options:["Grade 1","Grade 2","Grade 3","Grade 4","Grade 5","Grade 6","Grade 7","Grade 8","Grade 9","Grade 10","Grade 11","Grade 12"]},
    {name:"school",label:"Current school",type:"text"},
    {name:"status",label:"Learning status",type:"select",options:["Active","On hold","Completed"]},
    {name:"description",label:"Description",type:"textarea",full:true}
  ]},
  customers:{title:"Family customer",fields:[
    {name:"family_name",label:"Family name",type:"text",required:true},
    {name:"primary_contact",label:"Primary contact",type:"text",required:true},
    {name:"phone",label:"Phone",type:"tel",required:true},
    {name:"email",label:"Email",type:"email"},
    {name:"address",label:"Address",type:"text"},
    {name:"source_lead",label:"Source lead",type:"select-data",source:"leads",display:"full_name"}
  ]},
  contracts:{title:"Contract",fields:[
    {name:"customer_id",label:"Family customer",type:"select-data",source:"customers",display:"family_name",required:true},
    {name:"date",label:"Contract date",type:"date",required:true},
    {name:"value",label:"Contract value (VND)",type:"number",required:true,min:0,format:"thousands"},
    {name:"status",label:"Contract status",type:"select",required:true,options:["Draft","Pending signature","Active","Completed","Cancelled"]},
    {name:"notes",label:"Notes",type:"textarea",full:true}
  ]},
  teachers:{title:"Teacher",fields:[
    {name:"full_name",label:"Teacher name",type:"text",required:true},
    {name:"phone",label:"Phone",type:"tel"},
    {name:"email",label:"Email",type:"email"},
    {name:"subjects",label:"Teaching subjects",type:"multiselect-data",source:"subjects",value:"name",display:"name",filter:{status:"Active"}},
    {name:"branch_ids",label:"Branches",type:"multiselect-data",source:"branches",display:"name",filter:{status:"Active"}},
    {name:"status",label:"Status",type:"select",required:true,options:["Active","Inactive"]},
    {name:"notes",label:"Notes",type:"textarea",full:true}
  ]},
  branches:{title:"Branch",fields:[
    {name:"name",label:"Branch name",type:"text",required:true},
    {name:"address",label:"Address",type:"text"},
    {name:"phone",label:"Phone",type:"tel"},
    {name:"status",label:"Status",type:"select",required:true,options:["Active","Inactive"]}
  ]},
  subjects:{title:"Subject",fields:[
    {name:"name",label:"Subject name",type:"text",required:true},
    {name:"status",label:"Status",type:"select",required:true,options:["Active","Inactive"]}
  ]},
  teaching_sessions:{title:"Teaching session",fields:[
    {name:"class_id",label:"Class",type:"select-data",source:"classes",display:"name",required:true},
    {name:"teacher_id",label:"Actual teacher",type:"select-data",source:"teachers",display:"full_name",required:true},
    {name:"date",label:"Session date",type:"date",required:true},
    {name:"status",label:"Status",type:"select",required:true,options:["Draft","Completed","Cancelled"]},
    {name:"actual_start",label:"Actual start",type:"time",required:true},
    {name:"actual_end",label:"Actual end",type:"time",required:true},
    {name:"break_minutes",label:"Break (minutes)",type:"number",min:0,step:1,required:true},
    {name:"notes",label:"Notes / substitution reason",type:"textarea",full:true}
  ]},
  rooms:{title:"Room",fields:[
    {name:"name",label:"Room name",type:"text",required:true},
    {name:"branch_id",label:"Branch",type:"select-data",source:"branches",display:"name",filter:{status:"Active"}},
    {name:"type",label:"Type",type:"select",required:true,options:["Classroom","Online"]},
    {name:"capacity",label:"Seat capacity",type:"number",min:1,step:1},
    {name:"location",label:"Location",type:"text"},
    {name:"status",label:"Status",type:"select",required:true,options:["Active","Inactive"]},
    {name:"notes",label:"Equipment / notes",type:"textarea",full:true}
  ]},
  classes:{title:"Class",fields:[
    {name:"name",label:"Class name",type:"text",required:true},
    {name:"branch_id",label:"Branch",type:"select-data",source:"branches",display:"name",filter:{status:"Active"}},
    {name:"type",label:"Type",type:"select",options:["Online","Offline"],required:true},
    {name:"subject",label:"Subject",type:"select-data",source:"subjects",value:"name",display:"name",filter:{status:"Active"}},
    {name:"program",label:"Program",type:"select",options:PROGRAM_OPTIONS},
    {name:"mode",label:"Learning mode",type:"select",options:["Group","1-on-1"]},
    {name:"teacher_id",label:"Teacher",type:"select-data",source:"teachers",display:"full_name",required:true},
    {name:"capacity",label:"Maximum learners",type:"number",min:1,step:1},
    {name:"status",label:"Status",type:"select",options:["Active","Inactive"]}
  ]},
  schedules:{title:"Schedule",fields:[
    {name:"class_id",label:"Class",type:"select-data",source:"classes",display:"name",required:true},
    {name:"day",label:"Day of week",type:"select",options:["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"],required:true},
    {name:"start",label:"Start time",type:"time",required:true},
    {name:"end",label:"End time",type:"time",required:true},
    {name:"room_id",label:"Room / online space",type:"select-data",source:"rooms",display:"name",required:true},
    {name:"meeting_link",label:"Online meeting link",type:"url"},
    {name:"start_date",label:"Effective date",type:"date",required:true},
    {name:"end_date",label:"End date",type:"date"},
    {name:"status",label:"Status",type:"select",options:["Active","Cancelled"]}
  ]},
  enrollments:{title:"Enrollment",fields:[
    {name:"contract_id",label:"Contract",type:"select-data",source:"contracts",display:"id",required:true},
    {name:"student_id",label:"Learner",type:"select-data",source:"students",display:"full_name",required:true},
    {name:"course",label:"Course / subject",type:"text",required:true},
    {name:"mode",label:"Learning mode",type:"select",options:["1-on-1","Group"],required:true},
    {name:"sessions",label:"Number of sessions",type:"number"},
    {name:"class_id",label:"Assigned class",type:"select-data",source:"classes",display:"name"},
    {name:"status",label:"Enrollment status",type:"select",options:["Pending","Active","Completed","On hold"]}
  ]}
};

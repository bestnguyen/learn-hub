window.DEMO_SEED = {
  current_employee_id:"EMP-ADMIN",
  employees:[
    {id:"EMP-ADMIN",full_name:"System Admin",role:"Admin",phone:"",email:"system.admin@example.com",status:"Active"},
    {id:"EMP-001",full_name:"Admin Demo",role:"Manager",phone:"",email:"admin@example.com",status:"Active"},
    {id:"EMP-002",full_name:"Linh Tran",role:"Sales",phone:"",email:"linh@example.com",status:"Active"},
    {id:"EMP-003",full_name:"Minh Le",role:"Sales",phone:"",email:"minh@example.com",status:"Active"}
  ],
  tasks:[
    {id:"TSK-001",title:"Consult IB learning needs",lead_id:"LD-1001",assignee_id:"EMP-002",task_type:"Consultation",due_date:"2026-11-06",priority:"High",status:"To do",description:"Confirm learning goals and course options.",result:"",created_by:"EMP-001",created_at:"2026-11-04T08:00:00Z"},
    {id:"TSK-002",title:"Convert AP trial lead",lead_id:"LD-1003",assignee_id:"EMP-002",task_type:"Convert lead",due_date:"2026-11-07",priority:"High",status:"In progress",description:"Follow up after the trial and confirm registration.",result:"",created_by:"EMP-001",created_at:"2026-11-04T08:00:00Z"}
  ],
  leads: [
    {id:"LD-1001",full_name:"Nguyen Van An",contact_type:"Parent",lead_source:"Referral",phone:"0901 234 567",email:"an.nguyen@example.com",school:"Vinschool",program:"IB",subjects:["Math","Physics"],status:"Consulting",owner:"Linh Tran",created_at:"2026-11-01",notes:"Interested in IB support for two children."},
    {id:"LD-1002",full_name:"Tran Minh Chau",contact_type:"Student",lead_source:"Website / Organic",phone:"0902 111 222",email:"chau.tran@example.com",school:"BIS",program:"A-Level",subjects:["Chemistry","Biology"],status:"New",owner:"Minh Le",created_at:"2026-11-03",notes:"Prefers weekend classes."},
    {id:"LD-1003",full_name:"Le Thu Ha",contact_type:"Parent",lead_source:"School / Partner",phone:"0903 333 444",email:"ha.le@example.com",school:"ISPH",program:"AP",subjects:["Computer Science","Math"],status:"Trial",owner:"Linh Tran",created_at:"2026-10-29",notes:"Trial class requested."},
    {id:"LD-1004",full_name:"Pham Quoc Bao",contact_type:"Student",lead_source:"Facebook Ads",phone:"0904 555 666",email:"bao.pham@example.com",school:"Hanoi-Amsterdam",program:"IB",subjects:["English"],status:"Won",owner:"Minh Le",created_at:"2026-10-25",notes:"Converted to customer."}
  ],
  customers:[{id:"CUS-001",family_name:"Nguyen Family",primary_contact:"Nguyen Van An",phone:"0901 234 567",email:"an.nguyen@example.com",address:"Cau Giay, Hanoi",source_lead:"LD-1001"}],
  students:[
    {id:"ST-001",customer_id:"CUS-001",full_name:"Nguyen Minh Anh",grade:"Grade 10",school:"Vinschool",program:"IB",status:"Active"},
    {id:"ST-002",customer_id:"CUS-001",full_name:"Nguyen Minh Khang",grade:"Grade 7",school:"Vinschool",program:"English",status:"Active"}
  ],
  contracts:[
    {id:"CT-001",customer_id:"CUS-001",date:"2026-11-02",status:"Active",value:42000000,notes:"Family learning package"}
  ],
  enrollments:[
    {id:"EN-001",contract_id:"CT-001",student_id:"ST-001",course:"IB Math",mode:"1-on-1",sessions:20,class_id:"CL-002",status:"Active"},
    {id:"EN-002",contract_id:"CT-001",student_id:"ST-001",course:"IB Physics",mode:"Group",sessions:12,class_id:"CL-001",status:"Active"},
    {id:"EN-003",contract_id:"CT-001",student_id:"ST-002",course:"English",mode:"Group",sessions:16,class_id:"CL-003",status:"Active"}
  ],
  teachers:[
    {id:"TCH-001",full_name:"David Nguyen",phone:"0905 111 111",email:"david@example.com",subjects:"Physics",status:"Active"},
    {id:"TCH-002",full_name:"Sarah Pham",phone:"0905 222 222",email:"sarah@example.com",subjects:"Math",status:"Active"},
    {id:"TCH-003",full_name:"Mai Hoang",phone:"0905 333 333",email:"mai@example.com",subjects:"English",status:"Active"}
  ],
  rooms:[
    {id:"RM-201",name:"Room 201",type:"Classroom",capacity:12,location:"Floor 2",status:"Active"},
    {id:"RM-105",name:"Room 105",type:"Classroom",capacity:8,location:"Floor 1",status:"Active"},
    {id:"RM-ONLINE",name:"Online",type:"Online",capacity:"",location:"Online",status:"Active"}
  ],
  classes:[
    {id:"CL-001",name:"IB Physics G1",subject:"Physics",program:"IB",mode:"Group",teacher:"David Nguyen",capacity:10,status:"Active"},
    {id:"CL-002",name:"IB Math 1-on-1",subject:"Math",program:"IB",mode:"1-on-1",teacher:"Sarah Pham",capacity:1,status:"Active"},
    {id:"CL-003",name:"English G7",subject:"English",program:"General",mode:"Group",teacher:"Mai Hoang",capacity:8,status:"Active"}
  ],
  schedules:[
    {id:"SC-001",class_id:"CL-001",day:"Tuesday",start:"17:00",end:"18:30",room:"Room 201",start_date:"2026-11-03"},
    {id:"SC-002",class_id:"CL-002",day:"Wednesday",start:"18:00",end:"19:00",room:"Online",start_date:"2026-11-04"},
    {id:"SC-003",class_id:"CL-003",day:"Saturday",start:"09:00",end:"10:30",room:"Room 105",start_date:"2026-11-07"}
  ],
  appointments:[{id:"AP-001",title:"Trial class – Le Thu Ha",date:"2026-11-06",time:"16:00",type:"Trial"}]
};

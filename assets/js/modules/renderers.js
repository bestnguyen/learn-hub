window.UI = {
  esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))},
  money(v){return new Intl.NumberFormat("vi-VN").format(Number(v)||0)+" ₫"},
  formatThousands(value){let digits=String(value??"").replace(/\D/g,"");return digits.replace(/\B(?=(\d{3})+(?!\d))/g,".")},
  bindFormattedInputs(root){
    root.querySelectorAll('[data-format="thousands"]').forEach(input=>{
      const format=()=>{
        let before=input.value.slice(0,input.selectionStart??input.value.length),digitsBefore=before.replace(/\D/g,"").length,digits=input.value.replace(/\D/g,"");
        input.value=this.formatThousands(digits);
        if(document.activeElement===input){let caret=0,count=0;while(caret<input.value.length&&count<digitsBefore){if(/\d/.test(input.value[caret]))count++;caret++}input.setSelectionRange(caret,caret)}
      };
      input.addEventListener("input",format);
      input.addEventListener("blur",format);
      format();
    });
  },
  badge(v){let c=["Won","Active","Completed"].includes(v)?"green":["Trial","Consulting","Pending signature","Draft"].includes(v)?"orange":["Lost","Cancelled","Inactive"].includes(v)?"red":"blue";return `<span class="badge-soft badge-${c}">${this.esc(v||"—")}</span>`},
  field(field,value=""){const name=field.name, val=value??"";let control="";
    if(field.type==="textarea") control=`<textarea class="form-control" name="${name}" rows="3">${this.esc(Array.isArray(val)?val.join(", "):val)}</textarea>`;
    else if(field.type==="select"||field.type==="select-data"){let opts=field.type==="select-data"?Store.list(field.source).filter(record=>(!field.filter||Object.entries(field.filter).every(([key,expected])=>record[key]===expected))||String(val)===String(record[field.value||"id"])).map(x=>({value:x[field.value||"id"],label:x[field.display]||x.id})):field.options.map(x=>({value:x,label:x}));control=`<select class="form-select" name="${name}"><option value="">Select...</option>${opts.map(o=>`<option value="${this.esc(o.value)}" ${String(val)===String(o.value)?"selected":""}>${this.esc(o.label)}</option>`).join("")}</select>`}
    else if(field.type==="multiselect"){let selected=Array.isArray(val)?val:[];control=`<div class="row g-2">${field.options.map(o=>`<div class="col-6 col-md-4"><label class="form-check"><input class="form-check-input" type="checkbox" name="${name}" value="${this.esc(o)}" ${selected.includes(o)?"checked":""}><span class="form-check-label">${this.esc(o)}</span></label></div>`).join("")}</div>`}
    else if(field.type==="multiselect-data"){let selected=Array.isArray(val)?val:val?[val]:[],opts=Store.list(field.source).filter(record=>(!field.filter||Object.entries(field.filter).every(([key,expected])=>record[key]===expected))||selected.includes(record[field.value||"id"]));control=`<div class="row g-2">${opts.map(record=>{let option=record[field.value||"id"];return `<div class="col-6 col-md-4"><label class="form-check"><input class="form-check-input" type="checkbox" name="${name}" value="${this.esc(option)}" ${selected.includes(option)?"checked":""}><span class="form-check-label">${this.esc(record[field.display]||record.id)}</span></label></div>`}).join("")}</div>`}
    else if(field.format==="thousands")control=`<input class="form-control" type="text" inputmode="numeric" autocomplete="off" data-format="thousands" name="${name}" value="${this.esc(this.formatThousands(val))}" aria-describedby="${name}-format-hint" ${field.placeholder?`placeholder="${this.esc(field.placeholder)}"`:""}>`;
    else control=`<input class="form-control" type="${field.type||"text"}" name="${name}" value="${this.esc(val)}" ${field.placeholder?`placeholder="${this.esc(field.placeholder)}"`:""}>`;
    if(field.required)control=control.replace(/<(input|select|textarea)\b/,"<$1 required");
    if(field.disabled)control=control.replace(/<(input|select|textarea)\b/,"<$1 disabled");
    if(field.type==="number")control=control.replace("<input",`<input ${field.min!==undefined?`min="${field.min}"`:""} ${field.step!==undefined?`step="${field.step}"`:""}`);
    return `<div class="col-md-${field.full?12:6}" data-form-field="${this.esc(name)}" ${field.hidden?"hidden":""}><label class="form-label">${this.esc(field.label)}${field.required?' <span class="text-danger">*</span>':""}</label>${control}${field.format==="thousands"?`<div id="${name}-format-hint" class="form-hint">VND · Periods separate thousands</div>`:""}</div>`;
  },
  form(entity,record={}){
    const cfg=FORM_CONFIG[entity];
    return `<form id="dynamic-form" data-entity="${entity}"><div class="row g-3">${cfg.fields.map(field=>{
      let sales=window.Workforce&&!Workforce.canManage(),hidden=entity==="tasks"&&(field.name==="lead_id"&&record.task_type==="Follow contract"||field.name==="contract_id"&&record.task_type!=="Follow contract");
      let disabled=hidden||sales&&(entity==="tasks"&&!["status","result"].includes(field.name)||entity==="leads"&&field.name==="owner_id"||entity==="contracts"&&(!["status","notes"].includes(field.name)||field.name==="status"&&record.status==="Completed"));
      let options=sales&&["tasks","contracts"].includes(entity)&&field.name==="status"?field.options.filter(status=>status!=="Cancelled"):field.options;
      if(entity==="employees"&&field.name==="role"&&!window.Workforce?.isAdmin())options=field.options.filter(role=>role!=="Admin");
      return this.field({...field,disabled,hidden,options},record[field.name]);
    }).join("")}</div></form>`;
  },
  table(entity,columns,rows,actions=true){
    if(!rows.length)return `<div class="empty-state"><i class="bi bi-inbox"></i>No records found</div>`;
    return `<div class="table-wrap responsive-records"><table class="table"><thead><tr>${columns.map(column=>`<th>${this.esc(column.label)}</th>`).join("")}${actions?"<th>Actions</th>":""}</tr></thead><tbody>${rows.map(record=>`<tr>${columns.map((column,index)=>{
      let value=column.render?column.render(record):this.esc(record[column.key]??"—");
      if(index===0&&actions)value=`<span class="desktop-record-title">${value}</span><button type="button" class="mobile-record-link" data-action="view" data-entity="${entity}" data-id="${this.esc(record.id)}">${value}</button>`;
      return `<td data-label="${this.esc(column.label)}" class="${index===0?"record-primary":""} ${column.label==="Status"?"record-status":""} ${column.label==="Timetable"?"record-resource":""}">${value}</td>`;
    }).join("")}${actions?`<td class="record-actions"><div class="inline-actions">${!window.Workforce||Workforce.canEdit(entity,record)?`<button class="btn btn-sm btn-light" data-action="edit" data-entity="${entity}" data-id="${this.esc(record.id)}" aria-label="Edit record" title="Edit record"><i class="bi bi-pencil"></i></button>`:""}<button class="btn btn-sm btn-light" data-action="view" data-entity="${entity}" data-id="${this.esc(record.id)}" aria-label="View record" title="View record"><i class="bi bi-eye"></i></button></div></td>`:""}</tr>`).join("")}</tbody></table></div>`;
  },
  metric(label,value,icon,note=""){return `<div class="metric-card"><div class="metric-top"><span>${label}</span><span class="metric-icon"><i class="bi ${icon}"></i></span></div><div class="metric-value">${value}</div><div class="metric-note">${note}</div></div>`}
};

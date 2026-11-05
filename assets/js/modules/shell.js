const workspaceRole=document.body.dataset.workspaceRole||"Admin";
document.body.insertAdjacentHTML("afterbegin",`
  <div class="app-shell">
    <aside class="sidebar offcanvas-md offcanvas-start" id="sidebar" tabindex="-1" aria-labelledby="drawer-title">
      <div class="brand"><span class="brand-mark"><i class="bi bi-mortarboard-fill"></i></span><span><b id="drawer-title">EDU CRM</b><small>${workspaceRole} workspace</small></span><button type="button" class="btn btn-outline-light mobile-only drawer-close" data-bs-dismiss="offcanvas" data-bs-target="#sidebar" aria-label="Close menu" title="Close menu"><i class="bi bi-x-lg"></i></button></div>
      <div class="sidebar-content">
        <div class="nav-label">${workspaceRole.toUpperCase()}</div>
        <nav id="sidebar-nav" class="nav flex-column"></nav>
        <div class="sidebar-bottom">
          <div class="demo-user"><div class="avatar" id="actor-avatar"></div><div><b id="actor-name"></b><small id="actor-role"></small></div></div>
          <div class="employee-switch mt-3"><label for="employee-switch" class="form-label text-light">Working as</label><select id="employee-switch" class="form-select" aria-label="Current employee"></select></div>
          ${workspaceRole==="Admin"?'<nav class="nav flex-column mt-3" aria-label="Role workspaces"><a class="nav-link" href="sales.html"><i class="bi bi-person-badge"></i><span>Sales workspace</span></a><a class="nav-link" href="manager.html"><i class="bi bi-people"></i><span>Manager workspace</span></a></nav>':""}
          <button class="btn btn-sm btn-outline-light w-100 mt-3" id="reset-btn"><i class="bi bi-arrow-counterclockwise me-2"></i>Reset demo data</button>
        </div>
      </div>
    </aside>
    <main class="main-area">
      <header class="topbar">
        <button type="button" class="btn btn-light mobile-only menu-toggle" data-bs-toggle="offcanvas" data-bs-target="#sidebar" aria-controls="sidebar" aria-label="Open menu" title="Open menu"><i class="bi bi-list"></i></button>
        <div><div class="eyebrow">${workspaceRole.toUpperCase()} WORKSPACE</div><h1 id="page-title"></h1></div>
        <div class="top-actions"><span class="status-dot"></span><span class="small text-secondary">Demo mode</span><div class="avatar avatar-light"></div></div>
      </header>
      <section id="app-content" class="content-area"></section>
      <footer class="app-footer">EdTech CRM Prototype <span>&middot;</span> Sample data only <span>&middot;</span> Not connected to payment or production systems</footer>
    </main>
  </div>
  <div class="toast-container position-fixed bottom-0 end-0 p-3" id="toast-area"></div>
  <div class="modal fade" id="record-modal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-lg modal-dialog-scrollable modal-fullscreen-md-down"><div class="modal-content">
      <div class="modal-header"><div><div class="eyebrow">RECORD DETAILS</div><h5 class="modal-title" id="modal-title">Add record</h5></div><button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close record"></button></div>
      <div class="modal-body" id="modal-body"></div>
      <div class="modal-footer"><button class="btn btn-light" data-bs-dismiss="modal">Cancel</button><button class="btn btn-light" id="modal-assign-task" data-action="assign-task" style="display:none"><i class="bi bi-clipboard-plus me-1"></i>Assign task</button><button class="btn btn-success" id="modal-convert" data-action="convert-lead" style="display:none"><i class="bi bi-person-check me-1"></i>Convert to customer</button><button class="btn btn-primary" id="modal-edit" data-action="edit" style="display:none"><i class="bi bi-pencil me-1"></i>Edit</button><button class="btn btn-primary" id="modal-save">Save changes</button></div>
    </div></div>
  </div>
`);
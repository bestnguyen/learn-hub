# EdTech CRM Demo

A lightweight, browser-based SPA prototype for validating an EdTech CRM workflow with stakeholders.

## Run locally
1. Extract the ZIP file.
2. Open `index.html` (Admin), `manager.html` (Manager) or `sales.html` (Sales) in Chrome, Edge or Firefox.
3. Internet access is required for Bootstrap, Bootstrap Icons and FullCalendar CDN assets.

If your browser blocks local scripts, run a simple local server from this folder:
- Python: `python -m http.server 8000`
- Open `http://localhost:8000`

## Role workspaces
- `index.html`: Admin workspace with all CRM screens, employee/Admin management and demo reset. Sidebar links open the Sales and Manager workspaces.
- `manager.html`: opens on Team tasks, with employee management, assignment, lead/contract follow-up and center operations.
- `sales.html`: opens on My tasks, with assigned tasks, accessible leads and followed contracts. Management screens and demo reset are not shown.
- All pages load the same shell (`assets/js/modules/shell.js`), styles, forms, services and data. There are no separate copies of the CRM database or business rules.
- **Working as** only lists active employees matching the page role. Each workspace remembers its selected employee. If a role has no active employee, it shows an empty state instead of assuming another role.
- Open pages in the same browser profile and origin to share LocalStorage. File URL storage behavior depends on the browser; use the local HTTP server above for reliable shared-origin behavior. Reload another workspace after changes; concurrent editing/multi-user synchronization is not implemented.
- These are role-specific demo views, not login/authentication. Opening a role's HTML file selects that demo role; production access must be authenticated and authorized on the backend.

## Included modules
- Dashboard
- Lead Management
- Employees (Admin / Manager / Sales)
- Tasks and assignment
- Customers & Students
- Contracts
- Enrollments
- Classes
- Teachers
- Teaching hours (actual sessions and monthly teacher summary)
- Rooms
- Schedules (recurring schedule setup)
- Center Timetable (the single center-wide timetable)
- Reports

## Lead source reporting
- Leads select a source from the catalog in `assets/js/config/forms.config.js`.
- Reports includes lead count, Won count and Won conversion rate by source.
- Older leads without attribution are preserved under **Not specified**; migration does not infer a source.

## Mobile layout
- Below 768px, navigation opens as a drawer and records use a compact list layout.
- Tap a record name to view all details; use the pencil button to edit.
- Forms open full screen and the center timetable defaults to day view on mobile, with week and agenda views also available.
- Desktop and mobile share the same LocalStorage data. Mobile overrides are in `assets/css/mobile.css`.

## Edit fields quickly
Edit `assets/js/config/forms.config.js`. Each entity defines its fields, labels, input types, dropdown options and required flags. The shared renderer in `assets/js/modules/renderers.js` renders the forms.

Supported field types:
- `text`, `tel`, `email`, `url`, `number`, `date`, `time`
- `textarea`
- `select`
- `multiselect`
- `select-data` (dropdown populated from another entity)

## Center timetable
- The navigation label is **Thoi khoa bieu trung tam** (Vietnamese). This is the only timetable screen; the previous static Calendar screen has been removed.
- Use Schedules to create/edit recurring schedule rules; use the center timetable to view dates and coordinate classes, teachers and rooms. Existing schedule data is unchanged.
- Week, day and agenda views use FullCalendar 6.1.15, with filters for teacher, room and class.
- Classes select a teacher; schedules select a classroom or shared online space.
- Legacy teacher/room names are linked automatically without resetting saved records.
- Schedule validation checks overlapping classes, teachers and physical rooms, effective date ranges and room capacity. Online spaces may be shared by different teachers/classes.
- Cancelled schedules and inactive classes are excluded from the timetable. Existing resource conflicts are highlighted in red.
- The timetable expands weekly recurring schedules; one-off substitutions, holidays and attendance are not implemented.

## Actual teaching hours
- Admin and Manager open **Teaching hours** to record actual sessions or review a monthly teacher summary. Sales cannot access these records.
- Each session records the class, actual teacher (including substitutes), date, actual start/end, break minutes, notes and Draft/Completed/Cancelled status. Times are within one local calendar day; overnight sessions are not supported.
- Actual minutes = end minus start minus breaks. Only Completed sessions contribute to totals; future completion, invalid durations and overlapping Completed sessions for the same teacher or class are blocked.
- Filter by month, actual teacher, class and status. Select a teacher's hour total to inspect the matching sessions. Editing or cancelling a session recalculates totals.
- Scheduled classes never automatically count as actual teaching. Existing data starts with no actual sessions; no fabricated attendance is added. The new collection is `teaching_sessions` in the same LocalStorage database.
- There are no pay rates, salary calculations, payroll approval or teacher self-service in this version. Completed is a management confirmation, not a separate multi-step attendance approval process.

## HRM teaching-hours integration
- Open `education_hrm_prototype.html` in the same browser origin as the CRM. For reliable shared LocalStorage, start the local HTTP server and use the matching `localhost` URL for both pages; `file://` sharing varies by browser.
- CRM `teaching_sessions` remains the sole source of actual teaching events. HRM reads Completed sessions by unique session ID and never edits CRM sessions or creates a second teacher attendance ledger. Only actual completed CRM sessions contribute; scheduled classes and CRM Draft/Cancelled sessions do not.
- HRM employee-to-CRM teacher links are explicit, one-to-one mappings. Names are not matched automatically. HRM owns the mapping, teacher salary rates, approval state and payroll run history in the separate `education_hrm_prototype_v1` LocalStorage key; CRM remains under `edtech_crm_demo_v1`.
- Rates match the HRM teacher, CRM class subject, class mode (`Group` or `1-on-1`) and effective date. A manager must approve each eligible session in HRM. Changes to source session facts or the applicable rate invalidate that approval.
- Teacher payroll is a monthly Draft snapshot containing session IDs and detailed hours/rates/amounts. Generation is blocked if any Completed CRM session in the period is unmapped, unrated or not currently approved; only one run per month is allowed in this prototype. Office payroll remains separate demo data and is not included in teacher payroll totals.
- This is browser-local prototype state, not secure or multi-user payroll software. There is no backend, authentication, server-side audit trail or cross-device synchronization. Keep payroll decisions in an authorized system before production use.

## Sales ownership and tasks
- Employees have three types: Admin, Manager and Sales. Lead owners and task assignees are selected from active Sales employees.
- **System Admin** is the full-access demo user. Admin can access all screens/records and perform all existing management actions, including creating/granting Admin accounts. Managers cannot grant Admin access or edit Admin users. The last active Admin cannot be deactivated or demoted. Existing managers and Sales employees are preserved when the Admin account is added.
- Select **Working as** in the sidebar to switch between demo employees within the current page role. Admins and Managers manage employees and create, assign, reassign or cancel tasks. Sales see their assigned tasks and update status/results, not assignment details.
- Managers can assign a task from a lead's detail view. Tasks include the lead, Sales assignee, type, due date, priority, instructions, progress and creator.
- Conversion tasks cannot be completed before the lead becomes a customer. Use **Convert to customer** from a lead/conversion task, or save the lead as Won. Customer creation is idempotent by source lead and open conversion tasks complete automatically.
- **Follow contract** tasks link directly to a contract instead of a lead. Assign from a contract's detail view, or select this task type in Tasks. Filter task types and view the related contract/customer/status from the task list.
- Assigned Sales can view their followed contracts and update status/notes, but cannot create contracts or edit customer/date/value, cancel or reopen completed contracts. Admin/Manager manage contract details and assignments.
- A contract-follow task cannot complete until the contract is Completed. Completing the contract automatically completes matching non-cancelled tasks; cancelling the contract cancels them. Admin/Manager reopening a completed contract returns its completed follow tasks to In progress. Cancelled tasks are not automatically reopened.
- Open leads/tasks must be reassigned before their Sales employee is deactivated or changed to Manager.
- Legacy Sales owner names are linked to employee records automatically. Existing data does not receive sample tasks on migration.
- This is UI/service-level workflow simulation, not authentication or a security boundary. Production permissions must be enforced by an authenticated backend. The other CRM areas do not yet have role-based access control.

## Tests
Run `node --test` to check CRM migration, scheduling, actual teaching hours, HRM teaching-hours integration and employee/task workflows. No npm dependencies are required for these tests.

## Data and limitations
- Sample data: `assets/js/data/demo-data.js`
- Persistence: browser LocalStorage
- Reset: use **Reset demo data** in the sidebar
- This is a workflow prototype, not a production CRM.
- No authentication, payment processing, server-side validation, audit trail, or multi-user sync.
- The center timetable expands recurring weekly schedules within their effective date ranges.
- Lead status `Won` automatically creates a family customer record if one does not already exist. Learner profiles can then be added from Customers & Students.

# CRM User Guide

This guide covers the browser-based EdTech CRM prototype, its main workflows, and the capabilities of each demo role.

## 1. Open the CRM

Open the relevant page in a modern browser:

| Page | Demo workspace |
| --- | --- |
| `index.html` | Admin |
| `manager.html` | Manager |
| `sales.html` | Sales |

For reliable data sharing between pages, start a local server from the project folder with `python -m http.server 8000`, then open `http://localhost:8000`. The prototype stores data in browser LocalStorage. Open the pages in the same browser profile and origin to share data, and reload another page after changes. There is no live multi-user synchronization.

Each page is a role-specific demo workspace, not a login screen. Use **Working as** in the sidebar to select an active employee of that workspace's role. The selection is remembered separately for each role. Admin can open the Manager and Sales workspaces from the sidebar.

## 2. CRM Modules

The available workspace navigation may differ by role. The CRM includes:

- Dashboard and Reports
- Leads, Tasks, Customers & Students, and Contracts
- Employees, Classes, Teachers, Enrollments, and Rooms
- Schedules, Center Timetable, and Teaching hours

Use the sidebar to open a module. On a narrow screen, open the navigation drawer with the menu button. Select a record to view its details; use **Edit** or the pencil button to update it. Use the add action in a module to create a record when your role permits it.

## 3. Roles and Permissions

### Admin

Admin is the full-access demo role.

- View and manage all CRM records and modules, including teaching sessions.
- Create and manage employees, tasks, leads, contracts, and operational records.
- Assign and reassign tasks to active Sales employees.
- Create or grant Admin access to an employee.
- Manage contract details, including customer, date, value, status, and notes.
- At least one active Admin must remain. An Admin cannot deactivate or change their own role while working as that employee.

### Manager

Manager can operate the CRM and manage the sales workflow, but cannot administer Admin access.

- View all leads and tasks; create, assign, reassign, and cancel tasks.
- Manage leads and assign them to active Sales employees.
- Manage contracts, including their details and follow-up assignments.
- Manage employees, classes, teachers, enrollments, rooms, schedules, and teaching sessions.
- Cannot create an Admin, change an employee into an Admin, or edit an Admin employee record.
- Cannot deactivate or change their own role while working as that employee.
- Must reassign a Sales employee's open leads and tasks before changing that employee's role or status.

### Sales

Sales is intended for day-to-day assigned lead, task, and contract follow-up.

- **Tasks:** View tasks assigned to the selected Sales employee. Update progress/result and status. Assignment and task details cannot be changed; Sales cannot cancel tasks.
- **Leads:** Create leads owned by themselves; view leads they own, plus leads linked to a non-cancelled task assigned to them. Update lead information and status, but cannot change or assign the Sales owner.
- **Contracts:** View contracts linked to a non-cancelled Follow contract task assigned to them. Update contract status and notes only. Cannot create contracts, change customer/date/value, cancel a contract, or reopen a completed contract.
- Cannot access employee management or teaching hours through the Sales workspace.
- Cannot create or assign tasks, change task assignments, or manage other employees.

### Permission Scope Caution

Role-specific restrictions currently apply to employees, tasks, leads, contracts, and teaching sessions in the shared application logic. Other CRM records are not yet protected by role-based access rules at the service level. The Sales workspace may hide management navigation, but that should not be treated as secure authorization. Do not use this prototype to store sensitive production data or rely on it to enforce access controls.

## 4. Recommended Sales Workflow

1. Open **Leads** and create or review a lead. Record the contact details, lead source, interested program/subjects, status, notes, and active Sales owner.
2. Update the lead status as contact progresses: **New**, **Contacted**, **Consulting**, **Trial**, **Won**, or **Lost**.
3. Admin or Manager can assign a task from a lead or from **Tasks**. Choose a task type, active Sales assignee, due date, priority, and instructions.
4. Sales opens **Tasks**, works their assigned queue, and updates status and progress/result. Available statuses are **To do**, **In progress**, **Blocked**, **Completed**, and **Cancelled**. Sales cannot change task assignment or cancel a task.
5. To convert a lead, use **Convert to customer** from the lead detail, or save the lead with status **Won**. The CRM creates one family customer for that lead; repeating conversion does not create duplicates. Any open **Convert lead** task for the lead is completed automatically.
6. Add learner records under **Customers & Students** as needed.
7. Admin or Manager creates the contract and assigns a **Follow contract** task. Assigned Sales follows up by updating permitted contract status/notes. The contract must be **Completed** before its follow-up task can be completed. Contract completion or cancellation updates related non-cancelled follow-up tasks automatically.

## 5. Employee and Assignment Rules

- Only active employees with the **Sales** role can own leads or be assigned tasks.
- Admin and Manager can create and manage employees and sales assignments, subject to the Admin restrictions above.
- Reassign open leads and tasks before deactivating a Sales employee or changing their role.
- A workspace only allows selecting employees matching that page's role. If no active employee exists for a role, that workspace has no current actor and cannot perform actions.

## 6. Other Operational Modules

- **Customers & Students:** Maintain family customer records and learner profiles. A lead marked **Won** creates its family customer automatically.
- **Contracts:** Contract value is entered in VND. Admin and Manager manage financial and customer details; assigned Sales can update only status and notes.
- **Classes, Teachers, Rooms, Enrollments:** Maintain learning operations and relationships between customers, learners, teachers, classes, rooms, and contracts.
- **Schedules:** Create and maintain recurring weekly class schedule rules, including effective dates, time, and room/online space.
- **Center Timetable:** Review recurring schedules across the center; filter by teacher, room, and class. It does not create one-off substitutions, holidays, or attendance records.
- **Teaching hours:** Admin and Manager can record actual sessions or review monthly totals. Only **Completed** actual sessions count; scheduled classes do not automatically count as teaching hours.
- **Reports:** Review CRM summary metrics, including leads, Won leads, and conversion by lead source. Older leads without attribution are grouped under **Not specified**.

## 7. Data, Reset, and Limitations

- **Reset demo data** in the Admin sidebar restores the prototype's demo data. Treat this as destructive to changes stored in the browser.
- Data is stored locally in the browser, not in a shared server database. Clearing browser storage can remove it.
- This prototype has no authentication, backend authorization, server-side audit trail, or cross-device synchronization. The role pages simulate workflows; they are not a security boundary.
- Use an authenticated, server-authorized system for production access, sensitive records, or business-critical decisions.

## 8. Troubleshooting

- If a workspace shows no current employee, make sure an active employee of that role exists.
- If another workspace does not show recent updates, confirm both pages use the same browser profile and origin, then reload the page.
- If local `file://` pages do not share data consistently, use the local HTTP server instructions in **Open the CRM**.
from collections import defaultdict
from datetime import date, datetime, time, timedelta
from pathlib import Path
import json
import re
from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.worksheet.table import Table, TableStyleInfo

OUT = Path(__file__).resolve().parents[1] / "CRM_HRM_Test_Data_2026.xlsx"
MONTH = "2026-11"
MANAGER = "EMP-MGR-001"
SALES = ["EMP-SALES-001", "EMP-SALES-002", "EMP-SALES-003"]

LEAD_NAMES = [
    "Nguyen Thi Thanh Mai", "Tran Van Duc", "Le Minh Anh", "Pham Quoc Huy", "Hoang Thu Trang",
    "Vo Gia Bao", "Dang Ngoc Han", "Bui Minh Quan", "Do Khanh Linh", "Ngo Tuan Kiet",
    "Duong Bao Chau", "Ly Hoang Nam", "Trinh My Duyen", "Cao Anh Khoa", "Phan Nhat Minh",
    "Mai Thuy An", "Vu Duc Thinh", "Huynh Ngoc Yen", "Truong Gia Han", "Dinh Minh Tri",
    "Nguyen Hoai Thu", "Tran Bao Long", "Le Phuong Nhi", "Pham Thanh Tung", "Hoang Minh Chau",
    "Vo Khanh Toan", "Dang Thuy Vy", "Bui Quang Hieu", "Do Mai Phuong", "Ngo Bao Ngoc",
]
LEARNER_NAMES = [
    "Nguyen Minh Khang", "Nguyen Bao Ngoc", "Tran Gia Linh", "Tran Duc Anh", "Le Minh Khoi",
    "Pham Ha My", "Hoang Tuan Anh", "Vo Ngoc Ha", "Dang Minh Quan", "Bui Khanh Vy",
    "Do Gia Han", "Ngo Bao An", "Duong Minh Tri", "Ly Thuy Duong", "Trinh Hoang Nam",
    "Cao Minh Chau", "Phan Anh Thu", "Mai Quoc Bao", "Vu Ngoc Minh", "Huynh Phuong Anh",
    "Truong Gia Bao", "Dinh Ha Linh", "Nguyen Duc Minh", "Tran Khanh An", "Le Bao Tram",
]
HRM_TEACHER_NAMES = ["Pham Minh Duc", "Nguyen Thu Ha", "Tran Quoc Dat", "Le Ngoc Bich", "Vo Thanh Trung", "Bui Mai Anh"]
TEACHER_NAMES = ["Nguyen Hoang Phuc", "Tran Minh Tam", "Le Thu Quynh", "Pham Duc Thang", "Vo Ngoc Lan", "Bui Anh Tuan"]
TEACHER_SUBJECTS = ["Physics", "Math", "English", "Chemistry", "Biology", "Computer Science"]
TEACHERS = [{"id": f"TCH-2026-{i+1:03}", "full_name": TEACHER_NAMES[i], "phone": f"090{i+1:07}", "email": f"teacher{i+1}@example.com", "subjects": TEACHER_SUBJECTS[i], "status": "Active", "notes": ""} for i in range(6)]
CLASSES = [
    ("IB Physics Group A", "Physics", "IB", "Group", 0, 10),
    ("IB Math Group A", "Math", "IB", "Group", 1, 10),
    ("IB Math Individual A", "Math", "IB", "1-on-1", 1, 1),
    ("IGCSE English Group A", "English", "IGCSE", "Group", 2, 8),
    ("IGCSE Chemistry Group A", "Chemistry", "IGCSE", "Group", 3, 8),
    ("IGCSE Chemistry Individual A", "Chemistry", "IGCSE", "1-on-1", 3, 1),
    ("IGCSE Biology Group A", "Biology", "IGCSE", "Group", 4, 6),
    ("AP Computer Science Individual A", "Computer Science", "AP", "1-on-1", 5, 1),
]
ROOMS = [
    {"id": "RM-101", "name": "Room 101", "type": "Classroom", "capacity": 12, "location": "Floor 1", "status": "Active", "notes": "Projector"},
    {"id": "RM-102", "name": "Room 102", "type": "Classroom", "capacity": 10, "location": "Floor 1", "status": "Active", "notes": "Whiteboard"},
    {"id": "RM-201", "name": "Room 201", "type": "Classroom", "capacity": 8, "location": "Floor 2", "status": "Active", "notes": "Quiet room"},
    {"id": "RM-ONLINE", "name": "Online", "type": "Online", "capacity": None, "location": "Online", "status": "Active", "notes": "Shared online space"},
]
RATE_DEFS = [
    (0, "Physics", "Group", 300000), (1, "Math", "Group", 280000), (1, "Math", "1-on-1", 380000),
    (2, "English", "Group", 240000), (3, "Chemistry", "Group", 270000),
    (3, "Chemistry", "1-on-1", 360000), (4, "Biology", "Group", 260000),
    (5, "Computer Science", "1-on-1", 400000),
]


def make_data():
    crm_employees = [{"id": MANAGER, "full_name": "Nguyen Thanh Tung", "role": "Manager", "phone": "0900000101", "email": "manager@example.com", "status": "Active"}]
    crm_employees += [{"id": code, "full_name": name, "role": "Sales", "phone": f"09000001{i+1:02}", "email": f"sales{i+1}@example.com", "status": "Active"} for i, (code, name) in enumerate(zip(SALES, ["Pham Thu Ha", "Le Minh Quan", "Vo Khanh Linh"]))]
    leads = []
    for i, name in enumerate(LEAD_NAMES, 1):
        leads.append({"id": f"LD-2026-{i:03}", "full_name": name, "contact_type": "Parent" if i <= 20 else ("Student" if i % 2 else "Parent"), "lead_source": ["Referral", "Website / Organic", "School / Partner", "Event / Open Day", "Facebook Ads"][i % 5], "phone": f"090{i:07}", "email": f"lead{i:03}@example.com", "school": ["Vinschool", "BIS Hanoi", "Hanoi-Amsterdam", "UNIS Hanoi"][i % 4], "program": ["IB", "IGCSE", "AP", "A-level"][i % 4], "subjects": [CLASSES[(i-1) % 8][1]], "status": "Won" if i <= 20 else ["New", "Contacted", "Consulting", "Trial"][i % 4], "owner_id": SALES[(i-1) % 3], "created_at": date(2026, 9, 1) + timedelta(days=2*i), "notes": "Synthetic demo data; no real person or contact details."})
    customers = []
    districts = ["Cau Giay", "Dong Da", "Tay Ho", "Hai Ba Trung"]
    for i, lead in enumerate(leads[:20], 1):
        customers.append({"id": f"CUS-2026-{i:03}", "family_name": f"Gia dinh {lead['full_name'].split()[-1]}", "primary_contact": lead["full_name"], "phone": lead["phone"], "email": lead["email"], "address": f"{districts[i % 4]}, Ha Noi", "source_lead": lead["id"]})
    learners = []
    for i, name in enumerate(LEARNER_NAMES):
        customer_index = i // 2 if i < 10 else i - 5
        customer = customers[customer_index]
        lead = leads[customer_index]
        learners.append({"id": f"ST-2026-{i+1:03}", "customer_id": customer["id"], "full_name": name, "grade": f"Grade {6+i%7}", "school": lead["school"], "program": lead["program"], "status": "Active"})
    classes = [{"id": f"CL-2026-{i+1:03}", "name": row[0], "subject": row[1], "program": row[2], "mode": row[3], "teacher_id": TEACHERS[row[4]]["id"], "capacity": row[5], "status": "Active"} for i, row in enumerate(CLASSES)]
    contracts = [{"id": f"CT-2026-{i+1:03}", "customer_id": customer["id"], "date": date(2026, 10, 1)+timedelta(days=i+1), "status": "Active", "value": 18000000+(i%6)*4500000, "notes": "Synthetic active learning package."} for i, customer in enumerate(customers)]
    enrollments = []
    for i, learner in enumerate(learners):
        customer_index = int(learner["customer_id"][-3:])-1
        for course_index in range(1):
            c = classes[(i + course_index*3) % 8]
            enrollments.append({"id": f"EN-2026-{len(enrollments)+1:03}", "contract_id": contracts[customer_index]["id"], "student_id": learner["id"], "course": c["subject"], "mode": c["mode"], "sessions": [12,16,20,24][(i+course_index)%4], "class_id": c["id"], "status": "Active"})
    room_ids = ["RM-101", "RM-102", "RM-ONLINE", "RM-201", "RM-201", "RM-ONLINE", "RM-201", "RM-ONLINE"]
    schedules = []
    for i, c in enumerate(classes):
        start = time(17 + i%2*2, 0)
        duration = 1 if c["mode"] == "1-on-1" else 2
        end = (datetime.combine(date(2026,1,1), start)+timedelta(hours=duration)).time()
        schedules.append({"id": f"SC-2026-{i+1:03}", "class_id": c["id"], "day": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"][i%5], "start": start, "end": end, "room_id": room_ids[i], "meeting_link": "https://example.com/online-class" if room_ids[i] == "RM-ONLINE" else "", "start_date": date(2026,11,2), "end_date": None, "status": "Active"})
    hrm_employees = []
    mappings = []
    for i, teacher in enumerate(TEACHERS):
        code = f"TEA-{i+1:03}"
        hrm_employees.append({"employeeCode": code, "fullName": HRM_TEACHER_NAMES[i], "type": "Teacher", "department": teacher["subjects"], "employmentType": "Part-time", "salaryType": "Hourly", "status": "Active"})
        mappings.append({"employeeCode": code, "employeeName": HRM_TEACHER_NAMES[i], "crmTeacherId": teacher["id"], "crmTeacherName": teacher["full_name"], "mappingStatus": "Active · explicit mapping"})
    for i, name in enumerate(["Nguyen Thu Phuong", "Tran Anh Khoa", "Le Thanh Ngan", "Pham Gia Huy"], 1):
        hrm_employees.append({"employeeCode": f"OFF-{i:03}", "fullName": name, "type": "Office", "department": ["Admissions", "Operations", "Finance", "Customer Care"][i-1], "employmentType": "Full-time", "salaryType": "Monthly", "status": "Active"})
    rates = []
    rate_lookup = {}
    for i, (teacher_index, subject, class_type, amount) in enumerate(RATE_DEFS, 1):
        row = {"id": f"RATE-2026-{i:03}", "employeeCode": f"TEA-{teacher_index+1:03}", "subject": subject, "classType": class_type, "hourlyRate": amount, "effectiveFrom": date(2026,10,1), "effectiveTo": None, "active": True}
        rates.append(row)
        rate_lookup[(row["employeeCode"], subject, class_type)] = row
    sessions, timesheet, approvals, details = [], [], [], []
    for day_index in range(5):
        session_date = date(2026,11,1)+timedelta(days=day_index)
        for teacher_index, teacher in enumerate(TEACHERS):
            teacher_classes = [c for c in classes if c["teacher_id"] == teacher["id"]]
            c = teacher_classes[day_index % len(teacher_classes)]
            start_dt = datetime.combine(session_date, time(7+teacher_index, 0))
            rest = 10 if c["mode"] == "Group" else 0
            scheduled = 90 if c["mode"] == "Group" else 60
            end_dt = start_dt+timedelta(minutes=scheduled)
            minutes = scheduled-rest
            sid = f"TS-2026-{len(sessions)+1:03}"
            code = f"TEA-{teacher_index+1:03}"
            rate = rate_lookup[(code, c["subject"], c["mode"])]
            gross = int(minutes*rate["hourlyRate"]/60+0.5)
            start, end = start_dt.strftime("%H:%M"), end_dt.strftime("%H:%M")
            fingerprint = "|".join([teacher["id"], c["id"], session_date.isoformat(), start, end, str(rest), str(minutes)])
            rate_fingerprint = json.dumps([code, c["subject"], c["mode"], rate["hourlyRate"], "2026-10-01", ""], separators=(",", ":"))
            approved_at = (start_dt+timedelta(hours=scheduled+1)).isoformat(timespec="seconds")
            sessions.append({"id": sid, "class_id": c["id"], "teacher_id": teacher["id"], "date": session_date, "status": "Completed", "actual_start": start, "actual_end": end, "break_minutes": rest, "duration_minutes": minutes, "notes": "Buoi hoc gia lap, da hoan thanh.", "created_at": start_dt.isoformat(timespec="seconds"), "created_by": MANAGER, "updated_at": approved_at, "updated_by": MANAGER, "confirmed_at": approved_at, "confirmed_by": MANAGER})
            timesheet.append({"sessionId": sid, "employeeCode": code, "employeeName": HRM_TEACHER_NAMES[teacher_index], "crmTeacherId": teacher["id"], "crmTeacherName": teacher["full_name"], "classId": c["id"], "className": c["name"], "subject": c["subject"], "classType": c["mode"], "date": session_date, "actualStart": start, "actualEnd": end, "breakMinutes": rest, "minutes": minutes, "hourlyRate": rate["hourlyRate"], "grossAmount": gross, "approvalStatus": "Approved"})
            approvals.append({"sessionId": sid, "status": "Approved", "fingerprint": fingerprint, "rateFingerprint": rate_fingerprint, "approvedAt": approved_at})
            details.append({"runId": f"PR-{MONTH}-001", "sessionId": sid, "employeeCode": code, "employeeName": HRM_TEACHER_NAMES[teacher_index], "subject": c["subject"], "classType": c["mode"], "sessionDate": session_date, "minutes": minutes, "hourlyRate": rate["hourlyRate"], "amount": gross})
    details_by_employee = defaultdict(list)
    for row in details:
        details_by_employee[row["employeeCode"]].append(row)
    payroll_summary = []
    for employee in hrm_employees[:6]:
        rows = details_by_employee[employee["employeeCode"]]
        payroll_summary.append({"runId": f"PR-{MONTH}-001", "month": MONTH, "employeeCode": employee["employeeCode"], "employeeName": employee["fullName"], "sessions": len(rows), "minutes": sum(r["minutes"] for r in rows), "grossAmount": sum(r["amount"] for r in rows), "sessionIds": "; ".join(r["sessionId"] for r in rows), "status": "Draft"})
    total = sum(row["amount"] for row in details)
    payroll_runs = [{"id": f"PR-{MONTH}-001", "month": MONTH, "status": "Draft", "createdAt": "2026-11-05T16:00:00", "sessionCount": len(sessions), "totalGross": total, "sessionIds": "; ".join(r["id"] for r in sessions)}]
    return {**locals(), "TEACHERS": TEACHERS, "ROOMS": ROOMS}


def validate(d):
    assert len(d["leads"]) == 30 and sum(r["status"] == "Won" for r in d["leads"]) == 20
    assert len(d["customers"]) == 20 and len(d["learners"]) == 25 and len(d["contracts"]) == 20 and len(d["enrollments"]) == 25
    assert len(d["classes"]) == 8 and len(d["TEACHERS"]) == 6 and len(d["ROOMS"]) == 4 and len(d["sessions"]) == 30
    ids = {key: {r["id"] for r in d[source]} for key, source in [("leads", "leads"), ("customers", "customers"), ("learners", "learners"), ("contracts", "contracts"), ("enrollments", "enrollments"), ("classes", "classes"), ("teachers", "TEACHERS"), ("rooms", "ROOMS"), ("sessions", "sessions")]}
    assert all(r["source_lead"] in ids["leads"] for r in d["customers"])
    assert all(r["customer_id"] in ids["customers"] for r in d["learners"]+d["contracts"])
    assert all(r["contract_id"] in ids["contracts"] and r["student_id"] in ids["learners"] and r["class_id"] in ids["classes"] for r in d["enrollments"])
    assert all(r["teacher_id"] in ids["teachers"] for r in d["classes"])
    assert all(r["class_id"] in ids["classes"] and r["teacher_id"] in ids["teachers"] for r in d["sessions"])
    assert len({r["id"] for r in d["sessions"]}) == 30 and len(d["approvals"]) == 30
    assert sum(r["grossAmount"] for r in d["timesheet"]) == d["total"]


def write_sheet(wb, title, columns, rows, table_name):
    ws = wb.create_sheet(title)
    ws.append(columns)
    for row in rows:
        ws.append(["; ".join(map(str, value)) if isinstance(value, list) else value for value in [row.get(col) for col in columns]])
    ws.freeze_panes = "A2"
    ws.sheet_view.showGridLines = False
    ws.row_dimensions[1].height = 30
    for cell in ws[1]:
        cell.font = Font(name="Aptos", bold=True, color="FFFFFF")
        cell.fill = PatternFill("solid", fgColor="176B68")
        cell.alignment = Alignment(vertical="center", wrap_text=True)
    for col in ws.columns:
        letter = col[0].column_letter
        ws.column_dimensions[letter].width = min(max(max(len(str(c.value or "")) for c in col)+2, 12), 42)
    for row in ws.iter_rows(min_row=2):
        for cell in row:
            cell.font = Font(name="Aptos", size=10, color="243342")
            cell.alignment = Alignment(vertical="top", wrap_text=True)
            head = str(ws.cell(1, cell.column).value).lower()
            if "date" in head and isinstance(cell.value, (date, datetime)):
                cell.number_format = "yyyy-mm-dd"
            if any(word in head for word in ["amount", "value", "rate", "gross"]) and isinstance(cell.value, (int, float)):
                cell.number_format = '#,##0 "VND"'
    if ws.max_row > 1:
        table = Table(displayName=table_name, ref=ws.dimensions)
        table.tableStyleInfo = TableStyleInfo(name="TableStyleMedium4", showRowStripes=True, showColumnStripes=False)
        ws.add_table(table)


def build_workbook(d):
    OUT.parent.mkdir(parents=True, exist_ok=True)
    wb = Workbook()
    intro = wb.active
    intro.title = "START HERE"
    intro.sheet_view.showGridLines = False
    notes = [
        ["CRM + HRM TEST DATA · 2026", ""],
        ["Privacy", "Toan bo thong tin la gia lap, khong su dung du lieu nguoi that."],
        ["CRM flow", "CRM Employees → Leads → Customers → Learners → Contracts → Enrollments → Teachers / Rooms → Classes → Schedules → Teaching Hours."],
        ["HRM source", "HRM Timesheet is a read-only projection of CRM Teaching Hours. It is not a second attendance ledger."],
        ["HRM links", "Teacher Mapping is explicit, one-to-one. Salary rates are synthetic VND rates by employee, subject and class type."],
        ["Payroll", "Payroll is a sample November 2026 Draft snapshot assuming the listed 30 completed sessions have been approved."],
        ["Manual use", "This workbook is for reading/manual testing only. The app does not import Excel. For manual entry, open CRM and HRM from the same browser origin."],
        ["Dates", "CRM lead, contract, schedule and session dates are in 2026; teaching sessions are dated November 1–5, 2026."],
        ["Form note", "Lead subjects are joined with semicolons for readability; the CRM form stores them as a list."],
        [], ["Sheet", "Data rows"],
    ]
    counts = [("CRM Employees", len(d["crm_employees"])), ("Leads", len(d["leads"])), ("Customers", len(d["customers"])), ("Learners", len(d["learners"])), ("Contracts", len(d["contracts"])), ("Enrollments", len(d["enrollments"])), ("Teachers", len(d["TEACHERS"])), ("Rooms", len(d["ROOMS"])), ("Classes", len(d["classes"])), ("Schedules", len(d["schedules"])), ("Teaching Hours", len(d["sessions"])), ("HRM Employees", len(d["hrm_employees"])), ("Teacher Mapping", len(d["mappings"])), ("Salary Rates", len(d["rates"])), ("HRM Timesheet", len(d["timesheet"])), ("HRM Approvals", len(d["approvals"])), ("Payroll Summary", len(d["payroll_summary"])), ("Payroll Details", len(d["details"])), ("Payroll Runs", len(d["payroll_runs"])), ("Payroll gross total", f"{d['total']:,} VND")]
    for row in notes:
        intro.append(row)
    for row in counts:
        intro.append(row)
    intro.column_dimensions["A"].width = 28
    intro.column_dimensions["B"].width = 112
    intro.freeze_panes = "A2"
    for row in intro.iter_rows():
        for cell in row:
            cell.alignment = Alignment(vertical="top", wrap_text=True)
            cell.font = Font(name="Aptos", size=10, color="243342")
    intro["A1"].font = Font(name="Aptos Display", size=18, bold=True, color="176B68")
    for cell in intro[11]:
        cell.fill = PatternFill("solid", fgColor="176B68")
        cell.font = Font(name="Aptos", bold=True, color="FFFFFF")
    specs = [
        ("CRM Employees", "crm_employees", "id full_name role phone email status".split()),
        ("Leads", "leads", "id full_name contact_type lead_source phone email school program subjects status owner_id created_at notes".split()),
        ("Customers", "customers", "id family_name primary_contact phone email address source_lead".split()),
        ("Learners", "learners", "id customer_id full_name grade school program status".split()),
        ("Contracts", "contracts", "id customer_id date status value notes".split()),
        ("Enrollments", "enrollments", "id contract_id student_id course mode sessions class_id status".split()),
        ("Teachers", "TEACHERS", "id full_name phone email subjects status notes".split()),
        ("Rooms", "ROOMS", "id name type capacity location status notes".split()),
        ("Classes", "classes", "id name subject program mode teacher_id capacity status".split()),
        ("Schedules", "schedules", "id class_id day start end room_id meeting_link start_date end_date status".split()),
        ("Teaching Hours", "sessions", "id class_id teacher_id date status actual_start actual_end break_minutes duration_minutes notes created_at created_by updated_at updated_by confirmed_at confirmed_by".split()),
        ("HRM Employees", "hrm_employees", "employeeCode fullName type department employmentType salaryType status".split()),
        ("Teacher Mapping", "mappings", "employeeCode employeeName crmTeacherId crmTeacherName mappingStatus".split()),
        ("Salary Rates", "rates", "id employeeCode subject classType hourlyRate effectiveFrom effectiveTo active".split()),
        ("HRM Timesheet", "timesheet", "sessionId employeeCode employeeName crmTeacherId crmTeacherName classId className subject classType date actualStart actualEnd breakMinutes minutes hourlyRate grossAmount approvalStatus".split()),
        ("HRM Approvals", "approvals", "sessionId status fingerprint rateFingerprint approvedAt".split()),
        ("Payroll Summary", "payroll_summary", "runId month employeeCode employeeName sessions minutes grossAmount sessionIds status".split()),
        ("Payroll Details", "details", "runId sessionId employeeCode employeeName subject classType sessionDate minutes hourlyRate amount".split()),
        ("Payroll Runs", "payroll_runs", "id month status createdAt sessionCount totalGross sessionIds".split()),
    ]
    for title, key, columns in specs:
        write_sheet(wb, title, columns, d[key], re.sub(r"\W", "", title))
    wb.active = 0
    wb.properties.title = "CRM and HRM Synthetic Test Data 2026"
    wb.properties.creator = "EdTech CRM Demo"
    wb.save(OUT)


if __name__ == "__main__":
    data = make_data()
    validate(data)
    build_workbook(data)
    print(f"Created {OUT}")
    print(f"Rows: {len(data['leads'])} leads, {len(data['customers'])} customers, {len(data['learners'])} learners, {len(data['contracts'])} contracts, {len(data['enrollments'])} enrollments, {len(data['sessions'])} CRM sessions")
    print(f"Payroll draft gross: {data['total']:,} VND")

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.DayOfWeek;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.zip.ZipEntry;
import java.util.zip.ZipFile;
import java.util.zip.ZipOutputStream;
import javax.xml.parsers.DocumentBuilderFactory;

public class GenerateCrmHrmTestData {
    private static final String MONTH = "2026-10";
    private static final LocalDate MONTH_START = LocalDate.of(2026, 10, 1);
    private static final String MANAGER_ID = "EMP-MGR-001";
    private static final List<String> SALES_IDS = List.of("EMP-SALES-001", "EMP-SALES-002", "EMP-SALES-003");
    private static final List<String> CRM_TEACHERS = List.of(
        "Nguyễn Hoàng Phúc", "Trần Minh Tâm", "Lê Thu Quỳnh", "Phạm Đức Thắng", "Võ Ngọc Lan", "Bùi Anh Tuấn"
    );
    private static final List<String> HRM_TEACHERS = List.of(
        "Phạm Minh Đức", "Nguyễn Thu Hà", "Trần Quốc Đạt", "Lê Ngọc Bích", "Võ Thanh Trung", "Bùi Mai Anh"
    );
    private static final List<String> SUBJECTS = List.of("Physics", "Math", "English", "Chemistry", "Biology", "Computer Science");
    private static final List<String> DAYS = List.of("Monday", "Tuesday", "Wednesday", "Thursday", "Friday");
    private static final List<String> LEAD_NAMES = List.of(
        "Nguyễn Thị Thanh Mai", "Trần Văn Đức", "Lê Minh Anh", "Phạm Quốc Huy", "Hoàng Thu Trang",
        "Võ Gia Bảo", "Đặng Ngọc Hân", "Bùi Minh Quân", "Đỗ Khánh Linh", "Ngô Tuấn Kiệt",
        "Dương Bảo Châu", "Lý Hoàng Nam", "Trịnh Mỹ Duyên", "Cao Anh Khoa", "Phan Nhật Minh",
        "Mai Thúy An", "Vũ Đức Thịnh", "Huỳnh Ngọc Yến", "Trương Gia Hân", "Đinh Minh Trí",
        "Nguyễn Hoài Thu", "Trần Bảo Long", "Lê Phương Nhi", "Phạm Thanh Tùng", "Hoàng Minh Châu",
        "Võ Khánh Toàn", "Đặng Thúy Vy", "Bùi Quang Hiếu", "Đỗ Mai Phương", "Ngô Bảo Ngọc"
    );
    private static final List<String> LEARNER_NAMES = List.of(
        "Nguyễn Minh Khang", "Nguyễn Bảo Ngọc", "Trần Gia Linh", "Trần Đức Anh", "Lê Minh Khôi",
        "Phạm Hà My", "Hoàng Tuấn Anh", "Võ Ngọc Hà", "Đặng Minh Quân", "Bùi Khánh Vy",
        "Đỗ Gia Hân", "Ngô Bảo An", "Dương Minh Trí", "Lý Thùy Dương", "Trịnh Hoàng Nam",
        "Cao Minh Châu", "Phan Anh Thư", "Mai Quốc Bảo", "Vũ Ngọc Minh", "Huỳnh Phương Anh",
        "Trương Gia Bảo", "Đinh Hà Linh", "Nguyễn Đức Minh", "Trần Khánh An", "Lê Bảo Trâm"
    );
    private static final List<String> SCHOOLS = List.of("Vinschool", "BIS Hanoi", "Hanoi-Amsterdam", "UNIS Hanoi");
    private static final List<String> PROGRAMS = List.of("IB", "IGCSE", "AP", "A-level");
    private static final String[] SOURCES = {"Referral", "Website / Organic", "School / Partner", "Event / Open Day", "Facebook Ads"};
    private static final int[] CLASS_TEACHER = {0, 1, 1, 2, 3, 3, 4, 5};
    private static final String[] CLASS_NAMES = {
        "IB Physics Group A", "IB Math Group A", "IB Math Individual A", "IGCSE English Group A",
        "IGCSE Chemistry Group A", "IGCSE Chemistry Individual A", "IGCSE Biology Group A", "AP Computer Science Individual A"
    };
    private static final String[] CLASS_SUBJECT = {"Physics", "Math", "Math", "English", "Chemistry", "Chemistry", "Biology", "Computer Science"};
    private static final String[] CLASS_PROGRAM = {"IB", "IB", "IB", "IGCSE", "IGCSE", "IGCSE", "IGCSE", "AP"};
    private static final String[] CLASS_MODE = {"Group", "Group", "1-on-1", "Group", "Group", "1-on-1", "Group", "1-on-1"};
    private static final int[] CLASS_CAPACITY = {10, 10, 1, 8, 8, 1, 6, 1};
    private static final int[] SESSIONS_PER_CLASS = {4, 4, 4, 4, 4, 3, 4, 3};
    private static final String[] ROOM_IDS = {"RM-101", "RM-102", "RM-ONLINE", "RM-201", "RM-201", "RM-ONLINE", "RM-201", "RM-ONLINE"};
    private static final long[][] RATE_VALUES = {
        {0, 300000}, {1, 280000}, {2, 380000}, {3, 240000},
        {4, 270000}, {5, 360000}, {6, 260000}, {7, 400000}
    };
    private static final DateTimeFormatter DATE = DateTimeFormatter.ISO_LOCAL_DATE;
    private static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("HH:mm");

    private record SheetData(String name, List<String> headers, List<Map<String, Object>> rows) {}

    public static void main(String[] args) throws Exception {
        Path output = args.length > 0 ? Path.of(args[0]).toAbsolutePath() : Path.of("CRM_HRM_Test_Data_2026.xlsx").toAbsolutePath();
        Map<String, List<Map<String, Object>>> data = makeData();
        validate(data);
        List<SheetData> sheets = makeSheets(data);
        Files.createDirectories(output.getParent());
        writeWorkbook(output, sheets);
        verifyWorkbook(output, sheets.size());
        System.out.println("Created and verified: " + output);
        System.out.printf("Rows: %d leads, %d customers, %d learners, %d contracts, %d enrollments, %d classes, %d teaching sessions%n",
            data.get("Leads").size(), data.get("Customers").size(), data.get("Learners").size(),
            data.get("Contracts").size(), data.get("Enrollments").size(), data.get("Classes").size(), data.get("Teaching Hours").size());
        System.out.printf("Payroll draft gross: %,d VND (period %s)%n", data.get("Payroll Runs").get(0).get("totalGross"), MONTH);
    }

    private static Map<String, Object> row(Object... pairs) {
        Map<String, Object> result = new LinkedHashMap<>();
        for (int i = 0; i < pairs.length; i += 2) result.put((String) pairs[i], pairs[i + 1]);
        return result;
    }

    private static String id(String prefix, int value) { return prefix + String.format("%03d", value); }
    private static List<Map<String, Object>> list() { return new ArrayList<>(); }
    private static String teacherId(int index) { return "TCH-2026-" + String.format("%03d", index + 1); }
    private static String classId(int index) { return "CL-2026-" + String.format("%03d", index + 1); }
    private static String code(int index) { return "TEA-" + String.format("%03d", index + 1); }
    private static long rateFor(int classIndex) { return (long) RATE_VALUES[classIndex][1]; }

    private static Map<String, List<Map<String, Object>>> makeData() {
        Map<String, List<Map<String, Object>>> d = new LinkedHashMap<>();
        List<Map<String, Object>> employees = list(), leads = list(), customers = list(), learners = list(), contracts = list();
        List<Map<String, Object>> teachers = list(), rooms = list(), classes = list(), enrollments = list(), schedules = list();
        List<Map<String, Object>> hrmEmployees = list(), mappings = list(), rates = list(), sessions = list(), timesheet = list(), approvals = list(), details = list();
        List<Map<String, Object>> payrollSummary = list(), payrollRuns = list();

        employees.add(row("id", MANAGER_ID, "full_name", "Nguyễn Thanh Tùng", "role", "Manager", "phone", "0900000101", "email", "manager@example.com", "status", "Active"));
        List<String> salesNames = List.of("Phạm Thu Hà", "Lê Minh Quân", "Võ Khánh Linh");
        for (int i = 0; i < SALES_IDS.size(); i++) employees.add(row("id", SALES_IDS.get(i), "full_name", salesNames.get(i), "role", "Sales", "phone", fakePhone(200 + i), "email", "sales" + (i + 1) + "@example.com", "status", "Active"));

        for (int i = 0; i < LEAD_NAMES.size(); i++) {
            int n = i + 1;
            String status = n <= 20 ? "Won" : List.of("New", "Contacted", "Consulting", "Trial").get(i % 4);
            leads.add(row("id", "LD-2026-" + String.format("%03d", n), "full_name", LEAD_NAMES.get(i),
                "contact_type", n <= 20 || n % 2 == 0 ? "Parent" : "Student", "lead_source", SOURCES[n % SOURCES.length],
                "phone", fakePhone(100 + n), "email", "lead" + String.format("%03d", n) + "@example.com",
                "school", SCHOOLS.get(i % SCHOOLS.size()), "program", PROGRAMS.get(i % PROGRAMS.size()),
                "subjects", CLASS_SUBJECT[i % CLASS_SUBJECT.length], "status", status, "owner_id", SALES_IDS.get(i % SALES_IDS.size()),
                "created_at", LocalDate.of(2026, 9, 1).plusDays(2L * n).toString(), "notes", "Dữ liệu giả lập phục vụ kiểm thử."));
        }
        List<String> districts = List.of("Cầu Giấy", "Đống Đa", "Tây Hồ", "Hai Bà Trưng");
        for (int i = 0; i < 20; i++) {
            Map<String, Object> lead = leads.get(i);
            String customerId = "CUS-2026-" + String.format("%03d", i + 1);
            customers.add(row("id", customerId, "family_name", "Gia đình " + lastName((String) lead.get("full_name")),
                "primary_contact", lead.get("full_name"), "phone", lead.get("phone"), "email", lead.get("email"),
                "address", districts.get(i % districts.size()) + ", Hà Nội", "source_lead", lead.get("id")));
            contracts.add(row("id", "CT-2026-" + String.format("%03d", i + 1), "customer_id", customerId,
                "date", LocalDate.of(2026, 10, 1).plusDays(i + 1L).toString(), "status", "Active",
                "value", 18000000L + (i % 6) * 4500000L, "notes", "Gói học giả lập."));
        }
        for (int i = 0; i < LEARNER_NAMES.size(); i++) {
            int customerIndex = i < 10 ? i / 2 : i - 5;
            Map<String, Object> lead = leads.get(customerIndex);
            learners.add(row("id", "ST-2026-" + String.format("%03d", i + 1), "customer_id", customers.get(customerIndex).get("id"),
                "full_name", LEARNER_NAMES.get(i), "grade", "Grade " + (6 + i % 7), "school", lead.get("school"),
                "program", lead.get("program"), "status", "Active"));
        }
        for (int i = 0; i < CRM_TEACHERS.size(); i++) teachers.add(row("id", teacherId(i), "full_name", CRM_TEACHERS.get(i),
            "phone", fakePhone(300 + i), "email", "teacher" + (i + 1) + "@example.com", "subjects", SUBJECTS.get(i), "status", "Active", "notes", ""));
        rooms.add(row("id", "RM-101", "name", "Phòng 101", "type", "Classroom", "capacity", 12, "location", "Tầng 1", "status", "Active", "notes", "Máy chiếu"));
        rooms.add(row("id", "RM-102", "name", "Phòng 102", "type", "Classroom", "capacity", 10, "location", "Tầng 1", "status", "Active", "notes", "Bảng trắng"));
        rooms.add(row("id", "RM-201", "name", "Phòng 201", "type", "Classroom", "capacity", 8, "location", "Tầng 2", "status", "Active", "notes", "Phòng yên tĩnh"));
        rooms.add(row("id", "RM-ONLINE", "name", "Lớp trực tuyến", "type", "Online", "capacity", "", "location", "Trực tuyến", "status", "Active", "notes", "Không gian online dùng chung"));

        for (int i = 0; i < CLASS_NAMES.length; i++) {
            classes.add(row("id", classId(i), "name", CLASS_NAMES[i], "subject", CLASS_SUBJECT[i], "program", CLASS_PROGRAM[i],
                "mode", CLASS_MODE[i], "teacher_id", teacherId(CLASS_TEACHER[i]), "capacity", CLASS_CAPACITY[i], "status", "Active"));
        }
        for (int i = 0; i < learners.size(); i++) {
            Map<String, Object> learner = learners.get(i);
            int customerIndex = Integer.parseInt(((String) learner.get("customer_id")).substring(9)) - 1;
            int classIndex = i % classes.size();
            Map<String, Object> classRow = classes.get(classIndex);
            enrollments.add(row("id", "EN-2026-" + String.format("%03d", i + 1), "contract_id", contracts.get(customerIndex).get("id"),
                "student_id", learner.get("id"), "course", classRow.get("subject"), "mode", classRow.get("mode"),
                "sessions", List.of(12, 16, 20, 24).get(i % 4), "class_id", classRow.get("id"), "status", "Active"));
        }

        String[] starts = {"17:00", "19:00", "17:00", "19:00", "17:00", "17:00", "17:00", "19:00"};
        for (int i = 0; i < classes.size(); i++) {
            String start = starts[i];
            int durationHours = "Group".equals(CLASS_MODE[i]) ? 2 : 1;
            String end = LocalTime.parse(start).plusHours(durationHours).format(TIME);
            schedules.add(row("id", "SC-2026-" + String.format("%03d", i + 1), "class_id", classId(i), "day", DAYS.get(i % 5),
                "start", start, "end", end, "room_id", ROOM_IDS[i],
                "meeting_link", ROOM_IDS[i].equals("RM-ONLINE") ? "https://example.com/online-class" : "",
                "start_date", "2026-10-01", "end_date", "", "status", "Active"));
        }

        for (int i = 0; i < CRM_TEACHERS.size(); i++) {
            String employeeCode = code(i);
            hrmEmployees.add(row("employeeCode", employeeCode, "fullName", HRM_TEACHERS.get(i), "type", "Teacher",
                "department", SUBJECTS.get(i), "employmentType", "Part-time", "salaryType", "Hourly", "status", "Active"));
            mappings.add(row("employeeCode", employeeCode, "employeeName", HRM_TEACHERS.get(i), "crmTeacherId", teacherId(i),
                "crmTeacherName", CRM_TEACHERS.get(i), "mappingStatus", "Mapped explicitly"));
        }
        List<String> officeNames = List.of("Nguyễn Thu Phương", "Trần Anh Khoa", "Lê Thanh Ngân", "Phạm Gia Huy");
        List<String> departments = List.of("Admissions", "Operations", "Finance", "Customer Care");
        for (int i = 0; i < officeNames.size(); i++) hrmEmployees.add(row("employeeCode", "OFF-" + String.format("%03d", i + 1),
            "fullName", officeNames.get(i), "type", "Office", "department", departments.get(i), "employmentType", "Full-time", "salaryType", "Monthly", "status", "Active"));

        Map<String, Map<String, Object>> rateByClass = new HashMap<>();
        for (int i = 0; i < RATE_VALUES.length; i++) {
            int classIndex = (int) RATE_VALUES[i][0];
            Map<String, Object> rate = row("id", "RATE-2026-" + String.format("%03d", i + 1), "employeeCode", code(CLASS_TEACHER[classIndex]),
                "subject", CLASS_SUBJECT[classIndex], "classType", CLASS_MODE[classIndex], "hourlyRate", RATE_VALUES[i][1],
                "effectiveFrom", "2026-10-01", "effectiveTo", "", "active", true);
            rates.add(rate);
            rateByClass.put(classId(classIndex), rate);
        }

        String[] days = {"Monday", "Tuesday", "Wednesday", "Thursday", "Friday"};
        Map<String, Integer> dayNumber = Map.of("Monday", 1, "Tuesday", 2, "Wednesday", 3, "Thursday", 4, "Friday", 5);
        int[] seen = new int[classes.size()];
        List<Map<String, Object>> sessionSeed = new ArrayList<>();
        LocalDate monthEnd = MONTH_START.withDayOfMonth(MONTH_START.lengthOfMonth());
        for (LocalDate day = MONTH_START; !day.isAfter(monthEnd); day = day.plusDays(1)) {
            for (int i = 0; i < classes.size(); i++) {
                if (day.getDayOfWeek().getValue() != dayNumber.get(days[i % days.length]) || seen[i] >= SESSIONS_PER_CLASS[i]) continue;
                Map<String, Object> schedule = schedules.get(i);
                LocalTime start = LocalTime.parse((String) schedule.get("start"));
                int scheduledMinutes = "Group".equals(CLASS_MODE[i]) ? 90 : 60;
                int breakMinutes = "Group".equals(CLASS_MODE[i]) ? 10 : 0;
                LocalTime end = start.plusMinutes(scheduledMinutes);
                sessionSeed.add(row("classIndex", i, "date", day, "start", start, "end", end, "break", breakMinutes,
                    "minutes", scheduledMinutes - breakMinutes));
                seen[i]++;
            }
        }
        sessionSeed.sort(Comparator.comparing((Map<String, Object> r) -> (LocalDate) r.get("date"))
            .thenComparing(r -> (LocalTime) r.get("start"))
            .thenComparing(r -> classId((int) r.get("classIndex"))));
        long totalGross = 0;
        Map<String, List<Map<String, Object>>> detailsByEmployee = new LinkedHashMap<>();
        for (int n = 0; n < sessionSeed.size(); n++) {
            Map<String, Object> seed = sessionSeed.get(n);
            int ci = (int) seed.get("classIndex"), ti = CLASS_TEACHER[ci];
            String sessionId = "TS-2026-" + String.format("%03d", n + 1), teacher = teacherId(ti), classKey = classId(ci), employeeCode = code(ti);
            LocalDate day = (LocalDate) seed.get("date");
            LocalTime start = (LocalTime) seed.get("start"), end = (LocalTime) seed.get("end");
            int breakMinutes = (int) seed.get("break"), minutes = (int) seed.get("minutes");
            Map<String, Object> rate = rateByClass.get(classKey);
            long hourlyRate = (long) rate.get("hourlyRate"), gross = Math.round(minutes * hourlyRate / 60.0);
            String startText = start.format(TIME), endText = end.format(TIME), dayText = day.format(DATE);
            LocalDateTime created = LocalDateTime.of(day, start).minusMinutes(30), confirmed = LocalDateTime.of(day, end).plusMinutes(5);
            String fingerprint = String.join("|", teacher, classKey, dayText, startText, endText, String.valueOf(breakMinutes), String.valueOf(minutes));
            String rateFingerprint = "[\"" + employeeCode + "\",\"" + CLASS_SUBJECT[ci] + "\",\"" + CLASS_MODE[ci] + "\"," + hourlyRate + ",\"2026-10-01\",\"\"]";
            Map<String, Object> session = row("id", sessionId, "class_id", classKey, "teacher_id", teacher, "date", dayText,
                "status", "Completed", "actual_start", startText, "actual_end", endText, "break_minutes", breakMinutes,
                "duration_minutes", minutes, "notes", "Buổi học giả lập, đã hoàn thành.",
                "created_at", created.toString(), "created_by", MANAGER_ID, "updated_at", confirmed.toString(), "updated_by", MANAGER_ID,
                "confirmed_at", confirmed.toString(), "confirmed_by", MANAGER_ID);
            sessions.add(session);
            Map<String, Object> classRow = classes.get(ci);
            timesheet.add(row("sessionId", sessionId, "employeeCode", employeeCode, "employeeName", HRM_TEACHERS.get(ti),
                "crmTeacherId", teacher, "crmTeacherName", CRM_TEACHERS.get(ti), "classId", classKey, "className", classRow.get("name"),
                "subject", CLASS_SUBJECT[ci], "classType", CLASS_MODE[ci], "date", dayText, "actualStart", startText,
                "actualEnd", endText, "breakMinutes", breakMinutes, "minutes", minutes, "hourlyRate", hourlyRate,
                "grossAmount", gross, "approvalStatus", "Approved"));
            approvals.add(row("sessionId", sessionId, "status", "Approved", "fingerprint", fingerprint,
                "rateFingerprint", rateFingerprint, "approvedAt", confirmed.toString()));
            Map<String, Object> detail = row("runId", "PR-2026-10-001", "sessionId", sessionId, "employeeCode", employeeCode,
                "employeeName", HRM_TEACHERS.get(ti), "subject", CLASS_SUBJECT[ci], "classType", CLASS_MODE[ci],
                "sessionDate", dayText, "minutes", minutes, "hourlyRate", hourlyRate, "amount", gross);
            details.add(detail);
            detailsByEmployee.computeIfAbsent(employeeCode, key -> new ArrayList<>()).add(detail);
            totalGross += gross;
        }
        for (int i = 0; i < HRM_TEACHERS.size(); i++) {
            String employeeCode = code(i);
            List<Map<String, Object>> employeeDetails = detailsByEmployee.get(employeeCode);
            long minutes = employeeDetails.stream().mapToLong(r -> ((Number) r.get("minutes")).longValue()).sum();
            long gross = employeeDetails.stream().mapToLong(r -> ((Number) r.get("amount")).longValue()).sum();
            String sessionIds = String.join("; ", employeeDetails.stream().map(r -> (String) r.get("sessionId")).toList());
            payrollSummary.add(row("runId", "PR-2026-10-001", "month", MONTH, "employeeCode", employeeCode,
                "employeeName", HRM_TEACHERS.get(i), "sessions", employeeDetails.size(), "minutes", minutes,
                "grossAmount", gross, "sessionIds", sessionIds, "status", "Draft"));
        }
        payrollRuns.add(row("id", "PR-2026-10-001", "month", MONTH, "status", "Draft", "createdAt", "2026-11-05T16:00:00",
            "sessionCount", sessions.size(), "totalGross", totalGross,
            "sessionIds", String.join("; ", sessions.stream().map(r -> (String) r.get("id")).toList())));

        d.put("CRM Employees", employees); d.put("Leads", leads); d.put("Customers", customers); d.put("Learners", learners);
        d.put("Contracts", contracts); d.put("Enrollments", enrollments); d.put("Teachers", teachers); d.put("Rooms", rooms);
        d.put("Classes", classes); d.put("Schedules", schedules); d.put("Teaching Hours", sessions); d.put("HRM Employees", hrmEmployees);
        d.put("Teacher Mapping", mappings); d.put("Salary Rates", rates); d.put("HRM Timesheet", timesheet); d.put("HRM Approvals", approvals);
        d.put("Payroll Summary", payrollSummary); d.put("Payroll Details", details); d.put("Payroll Runs", payrollRuns);
        return d;
    }

    private static String fakePhone(int suffix) { return "090" + String.format("%07d", suffix); }
    private static String lastName(String fullName) { String[] parts = fullName.split(" "); return parts[parts.length - 1]; }

    private static void validate(Map<String, List<Map<String, Object>>> d) {
        require(d.get("Leads").size() == 30 && d.get("Leads").stream().filter(r -> "Won".equals(r.get("status"))).count() == 20, "Expected 30 leads with 20 Won conversions");
        require(d.get("Customers").size() == 20 && d.get("Learners").size() == 25 && d.get("Contracts").size() == 20 && d.get("Enrollments").size() == 25, "CRM row counts do not match the requested demo size");
        require(d.get("Teachers").size() == 6 && d.get("Rooms").size() == 4 && d.get("Classes").size() == 8 && d.get("Teaching Hours").size() == 30, "Teaching setup row counts are incorrect");
        Set<String> leadIds = ids(d.get("Leads"), "id"), customerIds = ids(d.get("Customers"), "id"), learnerIds = ids(d.get("Learners"), "id");
        Set<String> contractIds = ids(d.get("Contracts"), "id"), classIds = ids(d.get("Classes"), "id"), teacherIds = ids(d.get("Teachers"), "id");
        Set<String> sessionIds = ids(d.get("Teaching Hours"), "id"), employeeCodes = ids(d.get("HRM Employees"), "employeeCode");
        require(d.get("Customers").stream().allMatch(r -> leadIds.contains(r.get("source_lead"))), "Customer source lead reference is broken");
        require(d.get("Learners").stream().allMatch(r -> customerIds.contains(r.get("customer_id"))), "Learner customer reference is broken");
        require(d.get("Contracts").stream().allMatch(r -> customerIds.contains(r.get("customer_id"))), "Contract customer reference is broken");
        require(d.get("Enrollments").stream().allMatch(r -> contractIds.contains(r.get("contract_id")) && learnerIds.contains(r.get("student_id")) && classIds.contains(r.get("class_id"))), "Enrollment reference is broken");
        require(d.get("Classes").stream().allMatch(r -> teacherIds.contains(r.get("teacher_id"))), "Class teacher reference is broken");
        require(d.get("Schedules").stream().allMatch(r -> classIds.contains(r.get("class_id"))), "Schedule class reference is broken");
        require(d.get("Teaching Hours").stream().allMatch(r -> classIds.contains(r.get("class_id")) && teacherIds.contains(r.get("teacher_id")) && "Completed".equals(r.get("status"))), "Teaching session is not linked or not Completed");
        require(d.get("Teacher Mapping").stream().allMatch(r -> employeeCodes.contains(r.get("employeeCode")) && teacherIds.contains(r.get("crmTeacherId"))), "HRM teacher mapping is broken");
        require(d.get("Teaching Hours").stream().allMatch(r -> ((String) r.get("date")).startsWith(MONTH)), "Teaching session is outside the payroll month");
        require(d.get("Teaching Hours").stream().mapToLong(r -> ((Number) r.get("duration_minutes")).longValue()).sum() == d.get("HRM Timesheet").stream().mapToLong(r -> ((Number) r.get("minutes")).longValue()).sum(), "CRM and HRM minutes do not match");
        require(d.get("HRM Approvals").size() == 30 && d.get("Payroll Details").size() == 30, "Every session must have an approval and payroll detail");
        long timesheetGross = d.get("HRM Timesheet").stream().mapToLong(r -> ((Number) r.get("grossAmount")).longValue()).sum();
        require(timesheetGross == ((Number) d.get("Payroll Runs").get(0).get("totalGross")).longValue(), "Payroll total does not match the HRM timesheet");
        require(ids(d.get("Teaching Hours"), "id").size() == 30 && ids(d.get("HRM Approvals"), "sessionId").containsAll(sessionIds), "Session IDs are duplicated or approvals are missing");
    }

    private static Set<String> ids(List<Map<String, Object>> rows, String key) {
        Set<String> result = new LinkedHashSet<>();
        for (Map<String, Object> r : rows) result.add(String.valueOf(r.get(key)));
        return result;
    }
    private static void require(boolean condition, String message) { if (!condition) throw new IllegalStateException(message); }

    private static List<SheetData> makeSheets(Map<String, List<Map<String, Object>>> d) {
        List<SheetData> sheets = new ArrayList<>();
        List<Map<String, Object>> intro = list();
        String[][] notes = {
            {"Workbook", "CRM + HRM TEST DATA · 2026"},
            {"Privacy", "Toàn bộ thông tin là giả lập, không dùng dữ liệu người thật."},
            {"CRM flow", "CRM Employees → Leads → Customers → Learners → Contracts → Enrollments → Teachers / Rooms → Classes → Schedules → Teaching Hours."},
            {"HRM source", "HRM Timesheet là bản chiếu chỉ đọc từ CRM Teaching Hours, không phải ledger chấm công thứ hai."},
            {"HRM links", "Mapping giáo viên CRM–HRM là tường minh, một-một. Đơn giá giả lập theo nhân viên, môn và loại lớp."},
            {"Payroll", "Payroll Draft mẫu cho tháng 10/2026; 30 session đã Completed, map, áp rate và Approved."},
            {"Manual use", "Workbook chỉ để đọc/kiểm thử thủ công; app chưa hỗ trợ import Excel. Dữ liệu trong workbook không được ghi vào LocalStorage."},
            {"Dates", "Teaching sessions nằm trong tháng 10/2026 để tất cả là ngày đã qua tại thời điểm tạo bộ test (05/11/2026)."},
            {"Rates", "Đơn giá VND hoàn toàn giả lập; kiểm tra sheet Salary Rates và Payroll Details."},
            {"CRM forms", "Lead subjects hiển thị bằng dấu chấm phẩy trong workbook; CRM lưu subjects dưới dạng danh sách."}
        };
        for (String[] note : notes) intro.add(row("Section", note[0], "Details", note[1]));
        int startRows = intro.size();
        String[] countKeys = {"CRM Employees", "Leads", "Customers", "Learners", "Contracts", "Enrollments", "Teachers", "Rooms", "Classes", "Schedules", "Teaching Hours", "HRM Employees", "Teacher Mapping", "Salary Rates", "HRM Timesheet", "HRM Approvals", "Payroll Summary", "Payroll Details", "Payroll Runs"};
        for (String key : countKeys) intro.add(row("Section", key, "Details", d.get(key).size() + " data rows"));
        intro.add(row("Section", "Payroll gross total", "Details", d.get("Payroll Runs").get(0).get("totalGross") + " VND"));
        sheets.add(new SheetData("START HERE", List.of("Section", "Details"), intro));
        sheets.set(0, new SheetData("START HERE", List.of("Section", "Details"), intro));
        addSheet(sheets, d, "CRM Employees", "id full_name role phone email status".split(" "));
        addSheet(sheets, d, "Leads", "id full_name contact_type lead_source phone email school program subjects status owner_id created_at notes".split(" "));
        addSheet(sheets, d, "Customers", "id family_name primary_contact phone email address source_lead".split(" "));
        addSheet(sheets, d, "Learners", "id customer_id full_name grade school program status".split(" "));
        addSheet(sheets, d, "Contracts", "id customer_id date status value notes".split(" "));
        addSheet(sheets, d, "Enrollments", "id contract_id student_id course mode sessions class_id status".split(" "));
        addSheet(sheets, d, "Teachers", "id full_name phone email subjects status notes".split(" "));
        addSheet(sheets, d, "Rooms", "id name type capacity location status notes".split(" "));
        addSheet(sheets, d, "Classes", "id name subject program mode teacher_id capacity status".split(" "));
        addSheet(sheets, d, "Schedules", "id class_id day start end room_id meeting_link start_date end_date status".split(" "));
        addSheet(sheets, d, "Teaching Hours", "id class_id teacher_id date status actual_start actual_end break_minutes duration_minutes notes created_at created_by updated_at updated_by confirmed_at confirmed_by".split(" "));
        addSheet(sheets, d, "HRM Employees", "employeeCode fullName type department employmentType salaryType status".split(" "));
        addSheet(sheets, d, "Teacher Mapping", "employeeCode employeeName crmTeacherId crmTeacherName mappingStatus".split(" "));
        addSheet(sheets, d, "Salary Rates", "id employeeCode subject classType hourlyRate effectiveFrom effectiveTo active".split(" "));
        addSheet(sheets, d, "HRM Timesheet", "sessionId employeeCode employeeName crmTeacherId crmTeacherName classId className subject classType date actualStart actualEnd breakMinutes minutes hourlyRate grossAmount approvalStatus".split(" "));
        addSheet(sheets, d, "HRM Approvals", "sessionId status fingerprint rateFingerprint approvedAt".split(" "));
        addSheet(sheets, d, "Payroll Summary", "runId month employeeCode employeeName sessions minutes grossAmount sessionIds status".split(" "));
        addSheet(sheets, d, "Payroll Details", "runId sessionId employeeCode employeeName subject classType sessionDate minutes hourlyRate amount".split(" "));
        addSheet(sheets, d, "Payroll Runs", "id month status createdAt sessionCount totalGross sessionIds".split(" "));
        return sheets;
    }

    private static void addSheet(List<SheetData> sheets, Map<String, List<Map<String, Object>>> d, String name, String[] columns) {
        sheets.add(new SheetData(name, List.of(columns), d.get(name)));
    }

    private static void writeWorkbook(Path output, List<SheetData> sheets) throws Exception {
        try (OutputStream file = Files.newOutputStream(output); ZipOutputStream zip = new ZipOutputStream(file, StandardCharsets.UTF_8)) {
            put(zip, "[Content_Types].xml", contentTypes(sheets.size()));
            put(zip, "_rels/.rels", "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\"><Relationship Id=\"rId1\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument\" Target=\"xl/workbook.xml\"/></Relationships>");
            put(zip, "xl/workbook.xml", workbookXml(sheets));
            put(zip, "xl/_rels/workbook.xml.rels", workbookRels(sheets.size()));
            put(zip, "xl/styles.xml", stylesXml());
            for (int i = 0; i < sheets.size(); i++) put(zip, "xl/worksheets/sheet" + (i + 1) + ".xml", sheetXml(sheets.get(i)));
        }
    }

    private static void put(ZipOutputStream zip, String name, String text) throws Exception {
        zip.putNextEntry(new ZipEntry(name));
        zip.write(text.getBytes(StandardCharsets.UTF_8));
        zip.closeEntry();
    }

    private static String contentTypes(int count) {
        StringBuilder xml = new StringBuilder("<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><Types xmlns=\"http://schemas.openxmlformats.org/package/2006/content-types\"><Default Extension=\"rels\" ContentType=\"application/vnd.openxmlformats-package.relationships+xml\"/><Default Extension=\"xml\" ContentType=\"application/xml\"/><Override PartName=\"/xl/workbook.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml\"/><Override PartName=\"/xl/styles.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml\"/>");
        for (int i = 1; i <= count; i++) xml.append("<Override PartName=\"/xl/worksheets/sheet").append(i).append(".xml\" ContentType=\"application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml\"/>");
        return xml.append("</Types>").toString();
    }

    private static String workbookXml(List<SheetData> sheets) {
        StringBuilder xml = new StringBuilder("<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><workbook xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\" xmlns:r=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships\"><bookViews><workbookView/></bookViews><sheets>");
        for (int i = 0; i < sheets.size(); i++) xml.append("<sheet name=\"").append(escape(sheets.get(i).name())).append("\" sheetId=\"").append(i + 1).append("\" r:id=\"rId").append(i + 1).append("\"/>");
        return xml.append("</sheets><calcPr calcId=\"191029\"/></workbook>").toString();
    }

    private static String workbookRels(int count) {
        StringBuilder xml = new StringBuilder("<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\">");
        for (int i = 1; i <= count; i++) xml.append("<Relationship Id=\"rId").append(i).append("\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet\" Target=\"worksheets/sheet").append(i).append(".xml\"/>");
        return xml.append("<Relationship Id=\"rId").append(count + 1).append("\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles\" Target=\"styles.xml\"/></Relationships>").toString();
    }

    private static String stylesXml() {
        return "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><styleSheet xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\"><numFmts count=\"1\"><numFmt numFmtId=\"164\" formatCode=\"#,##0 &quot;VND&quot;\"/></numFmts><fonts count=\"2\"><font><sz val=\"10\"/><name val=\"Aptos\"/></font><font><b/><color rgb=\"FFFFFFFF\"/><sz val=\"10\"/><name val=\"Aptos\"/></font></fonts><fills count=\"3\"><fill><patternFill patternType=\"none\"/></fill><fill><patternFill patternType=\"gray125\"/></fill><fill><patternFill patternType=\"solid\"><fgColor rgb=\"FF176B68\"/><bgColor indexed=\"64\"/></patternFill></fill></fills><borders count=\"1\"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count=\"1\"><xf numFmtId=\"0\" fontId=\"0\" fillId=\"0\" borderId=\"0\"/></cellStyleXfs><cellXfs count=\"5\"><xf numFmtId=\"0\" fontId=\"0\" fillId=\"0\" borderId=\"0\" xfId=\"0\"/><xf numFmtId=\"0\" fontId=\"1\" fillId=\"2\" borderId=\"0\" xfId=\"0\" applyAlignment=\"1\"><alignment vertical=\"center\" wrapText=\"1\"/></xf><xf numFmtId=\"0\" fontId=\"0\" fillId=\"0\" borderId=\"0\" xfId=\"0\" applyAlignment=\"1\"><alignment vertical=\"top\" wrapText=\"1\"/></xf><xf numFmtId=\"164\" fontId=\"0\" fillId=\"0\" borderId=\"0\" xfId=\"0\" applyNumberFormat=\"1\"/><xf numFmtId=\"3\" fontId=\"0\" fillId=\"0\" borderId=\"0\" xfId=\"0\" applyNumberFormat=\"1\"/></cellXfs><cellStyles count=\"1\"><cellStyle name=\"Normal\" xfId=\"0\" builtinId=\"0\"/></cellStyles></styleSheet>";
    }

    private static String sheetXml(SheetData sheet) {
        int columns = sheet.headers().size(), rows = sheet.rows().size() + 1;
        String lastColumn = columnName(columns);
        StringBuilder xml = new StringBuilder("<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><worksheet xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\"><dimension ref=\"A1:").append(lastColumn).append(rows).append("\"/><sheetViews><sheetView showGridLines=\"0\" workbookViewId=\"0\"><pane ySplit=\"1\" topLeftCell=\"A2\" activePane=\"bottomLeft\" state=\"frozen\"/><selection pane=\"bottomLeft\" activeCell=\"A2\" sqref=\"A2\"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight=\"18\"/><cols>");
        for (int col = 0; col < columns; col++) {
            int width = Math.min(42, Math.max(12, sheet.headers().get(col).length() + 3));
            xml.append("<col min=\"").append(col + 1).append("\" max=\"").append(col + 1).append("\" width=\"").append(width).append("\" customWidth=\"1\"/>");
        }
        xml.append("</cols><sheetData><row r=\"1\" ht=\"30\" customHeight=\"1\">");
        for (int col = 0; col < columns; col++) xml.append(cell(col + 1, 1, sheet.headers().get(col), 1));
        xml.append("</row>");
        for (int row = 0; row < sheet.rows().size(); row++) {
            Map<String, Object> data = sheet.rows().get(row);
            xml.append("<row r=\"").append(row + 2).append("\">");
            for (int col = 0; col < columns; col++) {
                Object value = data.get(sheet.headers().get(col));
                if (value == null || value.toString().isEmpty()) continue;
                int style = value instanceof Number && isCurrency(sheet.headers().get(col)) ? 3 : value instanceof Number ? 4 : 2;
                xml.append(cell(col + 1, row + 2, value, style));
            }
            xml.append("</row>");
        }
        return xml.append("</sheetData><autoFilter ref=\"A1:").append(lastColumn).append(rows).append("\"/><pageMargins left=\"0.25\" right=\"0.25\" top=\"0.5\" bottom=\"0.5\" header=\"0.2\" footer=\"0.2\"/></worksheet>").toString();
    }

    private static boolean isCurrency(String header) {
        String value = header.toLowerCase();
        return value.contains("amount") || value.contains("gross") || value.contains("rate") || value.equals("value") || value.equals("totalgross");
    }

    private static String cell(int col, int row, Object value, int style) {
        String ref = columnName(col) + row;
        if (value instanceof Number) return "<c r=\"" + ref + "\" s=\"" + style + "\"><v>" + value + "</v></c>";
        return "<c r=\"" + ref + "\" s=\"" + style + "\" t=\"inlineStr\"><is><t xml:space=\"preserve\">" + escape(String.valueOf(value)) + "</t></is></c>";
    }

    private static String columnName(int index) {
        StringBuilder name = new StringBuilder();
        while (index > 0) { int rem = (index - 1) % 26; name.insert(0, (char) ('A' + rem)); index = (index - 1) / 26; }
        return name.toString();
    }

    private static String escape(String value) {
        return value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;").replace("'", "&apos;");
    }

    private static void verifyWorkbook(Path output, int expectedSheets) throws Exception {
        require(Files.exists(output) && Files.size(output) > 5000, "Workbook file was not created or is unexpectedly small");
        int worksheets = 0;
        DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
        factory.setNamespaceAware(true);
        factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
        try (ZipFile zip = new ZipFile(output.toFile())) {
            require(zip.getEntry("[Content_Types].xml") != null && zip.getEntry("xl/workbook.xml") != null, "Missing core XLSX package parts");
            var entries = zip.entries();
            while (entries.hasMoreElements()) {
                ZipEntry entry = entries.nextElement();
                if (!entry.getName().endsWith(".xml")) continue;
                factory.newDocumentBuilder().parse(zip.getInputStream(entry));
                if (entry.getName().matches("xl/worksheets/sheet\\d+\\.xml")) worksheets++;
            }
        }
        require(worksheets == expectedSheets, "Expected " + expectedSheets + " worksheets but found " + worksheets);
    }
}

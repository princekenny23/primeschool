export type Role = "saasadmin" | "admin" | "teacher" | "accountant" | "parent" | "student";

export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface Me {
  id: number;
  username: string;
  email: string;
  full_name: string;
  role: Role;
  school: number | null;
  school_name: string;
  institution?: number | null;
  institutions?: number[];
  teacher_id: number | null;
  parent_id: number | null;
  student_id: number | null;
  is_superuser: boolean;
}

export interface School {
  id: number;
  name: string;
  code: string;
  email: string;
  phone: string;
  address: string;
  logo: string;
  status?: string;
  owner?: number | null;
  created_by?: number | null;
}

export interface Institution {
  id: number;
  name: string;
  code: string;
  institution_type: string;
  education_levels?: string[];
  logo?: string;
  email?: string;
  phone?: string;
  website?: string;
  country?: string;
  region?: string;
  district?: string;
  city?: string;
  address?: string;
  postal_address?: string;
  status?: string;
  owner?: number | null;
  created_by?: number | null;
}

export interface Campus {
  id: number;
  institution: number;
  name: string;
  code: string;
  campus_type: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  district?: string;
  region?: string;
  administrator?: string;
  status?: string;
  is_main?: boolean;
}

export interface EducationLevel {
  id: number;
  institution: number;
  name: string;
  code: string;
  order: number;
  is_active: boolean;
}

export interface Department {
  id: number;
  institution: number;
  division: number | null;
  name: string;
  code: string;
  description: string;
  is_active: boolean;
}

export interface Programme {
  id: number;
  institution: number;
  department: number | null;
  division: number | null;
  name: string;
  code: string;
  award: string;
  duration_years: number;
  is_active: boolean;
}

export interface Membership {
  id: number;
  user: number;
  institution: number;
  campus?: number | null;
  role: string;
  status?: string;
  access_scope?: string;
  default_campus?: number | null;
}

export interface AcademicYear {
  id: number;
  school: number | null;
  institution?: number | null;
  campus?: number | null;
  name: string;
  starts_on: string;
  ends_on: string;
  is_current: boolean;
}

export interface Term {
  id: number;
  academic_year: number;
  academic_year_name?: string;
  name: string;
  starts_on: string;
  ends_on: string;
  is_current: boolean;
}

export interface ClassRoom {
  id: number;
  school: number | null;
  campus?: number | null;
  division?: number | null;
  programme?: number | null;
  name: string;
  level: string;
  stream: string;
  capacity: number;
  class_teacher: number | null;
  class_teacher_name?: string;
  student_count?: number;
  subject_count?: number;
}

export interface Subject {
  id: number;
  school: number | null;
  campus?: number | null;
  division?: number | null;
  programme?: number | null;
  department_ref?: number | null;
  name: string;
  code: string;
  department: string;
  is_active: boolean;
}

export interface Parent {
  id: number;
  school: number;
  user: number | null;
  full_name: string;
  relationship: string;
  phone: string;
  email: string;
  address: string;
  children?: { id: number; full_name: string; admission_number: string }[];
}

export interface Teacher {
  id: number;
  school: number;
  user: number | null;
  employee_id: string;
  full_name: string;
  email: string;
  phone: string;
  role: string;
  department: string;
  status: string;
  joined_on: string | null;
}

export interface Student {
  id: number;
  school: number;
  parent: number | null;
  parent_name?: string;
  admission_number: string;
  first_name: string;
  last_name: string;
  full_name: string;
  date_of_birth: string | null;
  gender: string;
  photo: string;
  address: string;
  phone: string;
  email: string;
  status: string;
  joined_on: string;
  current_class?: string;
  current_class_id?: number | null;
}

export interface Enrollment {
  id: number;
  student: number;
  student_name?: string;
  classroom: number;
  classroom_name?: string;
  academic_year: number;
  academic_year_name?: string;
  enrolled_on: string;
}

export interface TeacherAssignment {
  id: number;
  teacher: number;
  teacher_name?: string;
  subject: number;
  subject_name?: string;
  classroom: number;
  classroom_name?: string;
  academic_year: number | null;
}

export type AttendanceStatus = "present" | "absent" | "late" | "excused";

export interface Attendance {
  id: number;
  student: number;
  student_name?: string;
  classroom: number;
  classroom_name?: string;
  subject: number | null;
  subject_name?: string;
  date: string;
  status: AttendanceStatus;
  note: string;
}

export interface AttendanceSheetRow {
  student: number;
  student_name: string;
  admission_number: string;
  status: AttendanceStatus | "";
  note: string;
  recorded: boolean;
}

export interface GradeBand {
  id?: number;
  scale?: number;
  grade: string;
  min_score: string | number;
  max_score: string | number;
  points: string | number;
  comment: string;
}

export interface GradingScale {
  id: number;
  school: number;
  name: string;
  is_default: boolean;
  bands: GradeBand[];
}

export interface Exam {
  id: number;
  term: number;
  term_name?: string;
  academic_year_name?: string;
  name: string;
  starts_on: string;
  ends_on: string;
  is_published: boolean;
}

export interface ExamSubject {
  id: number;
  exam: number;
  subject: number;
  subject_name?: string;
  classroom: number;
  classroom_name?: string;
  max_marks: string;
  exam_date: string | null;
}

export interface Result {
  id: number;
  exam: number;
  exam_name?: string;
  student: number;
  student_name?: string;
  subject: number;
  subject_name?: string;
  assignment_score: string | null;
  midterm_score: string | null;
  final_score: string | null;
  score: string;
  grade: string;
  comment: string;
}

export interface MarksRow {
  student: number;
  student_name: string;
  admission_number: string;
  assignment_score: string | number | null;
  midterm_score: string | number | null;
  final_score: string | number | null;
  score: string | number | null;
  grade: string;
  comment: string;
}

export interface ReportCard {
  student: Student;
  exam: Exam;
  classroom: ClassRoom | null;
  results: Result[];
  total: string;
  average: string;
  position: number | null;
  class_size: number;
  attendance_rate: number;
}

export interface Room {
  id: number;
  school: number;
  name: string;
  capacity: number;
}

export interface TimetableEntry {
  id: number;
  classroom: number;
  classroom_name?: string;
  subject: number;
  subject_name?: string;
  teacher: number;
  teacher_name?: string;
  room_ref: number | null;
  room_name?: string;
  weekday: number;
  starts_at: string;
  ends_at: string;
  room: string;
}

export interface FeeItem {
  id?: number;
  fee_structure?: number;
  name: string;
  amount: string | number;
}

export interface FeeStructure {
  id: number;
  school: number;
  name: string;
  amount: string;
  total: string;
  academic_year: number;
  term: number | null;
  term_name?: string;
  classroom: number | null;
  classroom_name?: string;
  items: FeeItem[];
}

export interface Invoice {
  id: number;
  student: number;
  student_name?: string;
  admission_number?: string;
  fee_structure: number | null;
  term: number | null;
  reference: string;
  amount: string;
  due_on: string;
  status: "unpaid" | "partial" | "paid" | "overdue";
  paid_total: string;
  balance: string;
}

export interface Payment {
  id: number;
  invoice: number;
  invoice_reference?: string;
  student_name?: string;
  receipt_number?: string;
  amount: string;
  paid_on: string;
  method: string;
  reference: string;
}

export interface Announcement {
  id: number;
  school: number;
  title: string;
  body: string;
  audience: "everyone" | "teachers" | "students" | "parents" | "class";
  classroom: number | null;
  classroom_name?: string;
  author?: string;
  published_at: string;
  is_published: boolean;
}

export interface DashboardSummary {
  total_students: number;
  total_teachers: number;
  attendance_rate: number;
  attendance_marked: number;
  fees_billed: number;
  fees_collected: number;
  fees_outstanding: number;
  enrollment_by_class: { name: string; value: number }[];
  attendance_trend: { name: string; value: number }[];
  fee_trend: { name: string; value: number }[];
  upcoming_exams: Exam[];
  announcements: Announcement[];
  recent_activity: { title: string; detail: string; at: string }[];
}

export interface ReportResult {
  columns: string[];
  rows: (string | number)[][];
}

export interface UserProfileRecord {
  id: number;
  user: number;
  school: number | null;
  role: Role;
  phone: string;
}

export interface Account {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: Role;
  school: number | null;
  phone: string;
  is_active: boolean;
  date_joined: string;
}

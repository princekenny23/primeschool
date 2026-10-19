from django.contrib import admin
from .models import *

for model in [
    School, UserProfile, AcademicYear, Term, ClassRoom, Subject, Parent, Teacher, Student, Enrollment,
    TeacherSubjectAssignment, Attendance, GradingScale, GradeBand, Exam, ExamSubject, Result, Room,
    TimetableEntry, FeeStructure, FeeItem, Invoice, Payment, Receipt, Announcement, AuditLog,
]:
    admin.site.register(model)

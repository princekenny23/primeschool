from decimal import Decimal

from django.contrib.auth.models import User
from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver


class School(models.Model):
    STATUS_CHOICES = [
        ("draft", "Draft"),
        ("active", "Active"),
        ("paused", "Paused"),
        ("archived", "Archived"),
    ]

    name = models.CharField(max_length=180)
    code = models.CharField(max_length=30, unique=True)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=40, blank=True)
    address = models.TextField(blank=True)
    logo = models.URLField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="draft")
    owner = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="owned_schools")
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="created_schools")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class Institution(models.Model):
    INSTITUTION_TYPES = [
        ("school", "School"),
        ("college", "College"),
        ("university", "University"),
        ("vocational", "Vocational / Technical"),
    ]
    STATUS_CHOICES = [
        ("draft", "Draft"),
        ("active", "Active"),
        ("trial", "Trial"),
        ("paused", "Paused"),
        ("suspended", "Suspended"),
        ("archived", "Archived"),
    ]

    name = models.CharField(max_length=200)
    school = models.OneToOneField(School, on_delete=models.SET_NULL, null=True, blank=True, related_name="institution_profile")
    code = models.CharField(max_length=60, unique=True)
    institution_type = models.CharField(max_length=30, choices=INSTITUTION_TYPES, default="school")
    logo = models.URLField(blank=True)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=40, blank=True)
    website = models.URLField(blank=True)
    country = models.CharField(max_length=80, blank=True)
    region = models.CharField(max_length=80, blank=True)
    district = models.CharField(max_length=80, blank=True)
    city = models.CharField(max_length=80, blank=True)
    address = models.TextField(blank=True)
    postal_address = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="draft")
    owner = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="owned_institutions")
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="created_institutions")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.name


class Campus(models.Model):
    CAMPUS_TYPES = [
        ("main", "Main Campus"),
        ("branch", "Branch Campus"),
        ("satellite", "Satellite Campus"),
    ]
    STATUS_CHOICES = [
        ("active", "Active"),
        ("draft", "Draft"),
        ("paused", "Paused"),
        ("archived", "Archived"),
    ]

    institution = models.ForeignKey(Institution, on_delete=models.CASCADE, related_name="campuses")
    name = models.CharField(max_length=160)
    code = models.CharField(max_length=40)
    campus_type = models.CharField(max_length=30, choices=CAMPUS_TYPES, default="main")
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=40, blank=True)
    address = models.TextField(blank=True)
    city = models.CharField(max_length=80, blank=True)
    district = models.CharField(max_length=80, blank=True)
    region = models.CharField(max_length=80, blank=True)
    administrator = models.CharField(max_length=160, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="active")
    is_main = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]
        unique_together = ("institution", "code")

    def __str__(self):
        return f"{self.institution.name} · {self.name}"


class Membership(models.Model):
    ACCESS_SCOPES = [
        ("all", "Entire institution"),
        ("selected", "Selected campuses"),
    ]
    STATUS_CHOICES = [
        ("active", "Active"),
        ("pending", "Pending"),
        ("disabled", "Disabled"),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="memberships")
    institution = models.ForeignKey(Institution, on_delete=models.CASCADE, related_name="memberships")
    campus = models.ForeignKey(Campus, on_delete=models.SET_NULL, null=True, blank=True, related_name="memberships")
    role = models.CharField(max_length=60, default="institution_admin")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="active")
    access_scope = models.CharField(max_length=20, choices=ACCESS_SCOPES, default="all")
    default_campus = models.ForeignKey(Campus, on_delete=models.SET_NULL, null=True, blank=True, related_name="default_memberships")
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["institution__name", "role"]
        unique_together = ("user", "institution", "role", "campus")

    def __str__(self):
        return f"{self.user.username} · {self.institution.name} · {self.role}"


class InstitutionSetupProgress(models.Model):
    institution = models.OneToOneField(Institution, on_delete=models.CASCADE, related_name="setup_progress")
    completed_steps = models.JSONField(default=list, blank=True)
    last_step = models.CharField(max_length=80, blank=True)
    progress_percent = models.PositiveSmallIntegerField(default=0)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.institution.name} setup progress"


class EducationLevel(models.Model):
    """Education levels within an institution (e.g., Primary, Secondary, Advanced)."""

    institution = models.ForeignKey(Institution, on_delete=models.CASCADE, related_name="education_levels")
    name = models.CharField(max_length=80)
    code = models.CharField(max_length=20)
    order = models.PositiveSmallIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    settings = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["order", "name"]
        unique_together = ("institution", "code")

    def __str__(self):
        return f"{self.institution.name} · {self.name}"


class Department(models.Model):
    institution = models.ForeignKey(Institution, on_delete=models.CASCADE, related_name="departments")
    name = models.CharField(max_length=120)
    code = models.CharField(max_length=30)
    divisions = models.ManyToManyField(EducationLevel, blank=True, related_name="departments")
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["name"]
        unique_together = ("institution", "code")

    def __str__(self):
        return f"{self.institution.name} · {self.name}"


class Programme(models.Model):
    institution = models.ForeignKey(Institution, on_delete=models.CASCADE, related_name="programmes")
    department = models.ForeignKey(Department, on_delete=models.SET_NULL, null=True, blank=True, related_name="programmes")
    divisions = models.ManyToManyField(EducationLevel, blank=True, related_name="programmes")
    name = models.CharField(max_length=160)
    code = models.CharField(max_length=40)
    award = models.CharField(max_length=120, blank=True)
    duration_years = models.PositiveSmallIntegerField(default=1)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["name"]
        unique_together = ("institution", "code")

    def __str__(self):
        return f"{self.code} · {self.name}"


class UserProfile(models.Model):
    ROLE_CHOICES = [
        ("saasadmin", "SaaS Admin"),
        ("admin", "Administrator"),
        ("teacher", "Teacher"),
        ("accountant", "Accountant"),
        ("parent", "Parent"),
        ("student", "Student"),
    ]
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
    school = models.ForeignKey(School, on_delete=models.SET_NULL, null=True, blank=True, related_name="profiles")
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default="admin")
    phone = models.CharField(max_length=40, blank=True)

    def __str__(self):
        return f"{self.user.username} ({self.role})"


@receiver(post_save, sender=User)
def ensure_profile(sender, instance, created, **kwargs):
    if created:
        UserProfile.objects.get_or_create(user=instance)


class AcademicYear(models.Model):
    school = models.ForeignKey(School, on_delete=models.CASCADE, related_name="academic_years", null=True, blank=True)
    campus = models.ForeignKey(Campus, on_delete=models.CASCADE, related_name="academic_years", null=True, blank=True)
    institution = models.ForeignKey(Institution, on_delete=models.CASCADE, related_name="academic_years", null=True, blank=True)
    name = models.CharField(max_length=30)
    starts_on = models.DateField()
    ends_on = models.DateField()
    is_current = models.BooleanField(default=False)

    class Meta:
        ordering = ["-starts_on"]

    def __str__(self):
        return self.name


class Term(models.Model):
    academic_year = models.ForeignKey(AcademicYear, on_delete=models.CASCADE, related_name="terms")
    name = models.CharField(max_length=40)
    starts_on = models.DateField()
    ends_on = models.DateField()
    is_current = models.BooleanField(default=False)

    class Meta:
        ordering = ["starts_on"]

    def __str__(self):
        return self.name


class ClassRoom(models.Model):
    school = models.ForeignKey(School, on_delete=models.CASCADE, related_name="classes", null=True, blank=True)
    campus = models.ForeignKey(Campus, on_delete=models.CASCADE, related_name="classes", null=True, blank=True)
    divisions = models.ManyToManyField(EducationLevel, blank=True, related_name="classes")
    programme = models.ForeignKey(Programme, on_delete=models.SET_NULL, related_name="classes", null=True, blank=True)
    name = models.CharField(max_length=80)
    level = models.CharField(max_length=40)
    stream = models.CharField(max_length=40, blank=True)
    capacity = models.PositiveIntegerField(default=40)
    class_teacher = models.ForeignKey(
        "Teacher", on_delete=models.SET_NULL, null=True, blank=True, related_name="class_rooms"
    )

    class Meta:
        ordering = ["level", "name"]

    def __str__(self):
        return self.name


class Subject(models.Model):
    school = models.ForeignKey(School, on_delete=models.CASCADE, related_name="subjects", null=True, blank=True)
    campus = models.ForeignKey(Campus, on_delete=models.CASCADE, related_name="subjects", null=True, blank=True)
    divisions = models.ManyToManyField(EducationLevel, blank=True, related_name="subjects")
    programme = models.ForeignKey(Programme, on_delete=models.SET_NULL, related_name="subjects", null=True, blank=True)
    department_ref = models.ForeignKey(Department, on_delete=models.SET_NULL, related_name="subjects", null=True, blank=True)
    department = models.CharField(max_length=100, blank=True)
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=20)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} ({self.code})"


class Parent(models.Model):
    school = models.ForeignKey(School, on_delete=models.CASCADE, related_name="parents", null=True, blank=True)
    campus = models.ForeignKey(Campus, on_delete=models.CASCADE, related_name="parents", null=True, blank=True)
    user = models.OneToOneField(User, on_delete=models.SET_NULL, null=True, blank=True)
    full_name = models.CharField(max_length=160)
    relationship = models.CharField(max_length=40, blank=True)
    phone = models.CharField(max_length=40)
    email = models.EmailField(blank=True)
    address = models.TextField(blank=True)

    class Meta:
        ordering = ["full_name"]

    def __str__(self):
        return self.full_name


class Teacher(models.Model):
    STATUS_CHOICES = [("active", "Active"), ("on_leave", "On leave"), ("inactive", "Inactive")]
    school = models.ForeignKey(School, on_delete=models.CASCADE, related_name="teachers", null=True, blank=True)
    campus = models.ForeignKey(Campus, on_delete=models.CASCADE, related_name="teachers", null=True, blank=True)
    user = models.OneToOneField(User, on_delete=models.SET_NULL, null=True, blank=True)
    employee_id = models.CharField(max_length=40, unique=True)
    full_name = models.CharField(max_length=160)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=40, blank=True)
    role = models.CharField(max_length=60, blank=True, default="Teacher")
    department = models.CharField(max_length=100, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="active")
    joined_on = models.DateField(null=True, blank=True)

    class Meta:
        ordering = ["full_name"]

    def __str__(self):
        return self.full_name


class Student(models.Model):
    STATUS_CHOICES = [("active", "Active"), ("inactive", "Inactive"), ("graduated", "Graduated")]
    school = models.ForeignKey(School, on_delete=models.CASCADE, related_name="students", null=True, blank=True)
    campus = models.ForeignKey(Campus, on_delete=models.CASCADE, related_name="students", null=True, blank=True)
    parent = models.ForeignKey(Parent, on_delete=models.SET_NULL, null=True, blank=True, related_name="students")
    user = models.OneToOneField(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="student_profile")
    admission_number = models.CharField(max_length=40, unique=True)
    first_name = models.CharField(max_length=80)
    last_name = models.CharField(max_length=80)
    date_of_birth = models.DateField(null=True, blank=True)
    gender = models.CharField(max_length=20, blank=True)
    photo = models.URLField(blank=True)
    address = models.TextField(blank=True)
    phone = models.CharField(max_length=40, blank=True)
    email = models.EmailField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="active")
    joined_on = models.DateField(auto_now_add=True)

    class Meta:
        ordering = ["first_name", "last_name"]

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"

    def __str__(self):
        return self.full_name


class Enrollment(models.Model):
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name="enrollments")
    classroom = models.ForeignKey(ClassRoom, on_delete=models.CASCADE, related_name="enrollments")
    academic_year = models.ForeignKey(AcademicYear, on_delete=models.CASCADE, related_name="enrollments")
    enrolled_on = models.DateField(auto_now_add=True)

    class Meta:
        unique_together = ("student", "academic_year")


class TeacherSubjectAssignment(models.Model):
    teacher = models.ForeignKey(Teacher, on_delete=models.CASCADE, related_name="assignments")
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name="assignments")
    classroom = models.ForeignKey(ClassRoom, on_delete=models.CASCADE, related_name="assignments")
    academic_year = models.ForeignKey(
        AcademicYear, on_delete=models.CASCADE, null=True, blank=True, related_name="assignments"
    )

    class Meta:
        unique_together = ("teacher", "subject", "classroom", "academic_year")


class Attendance(models.Model):
    STATUS_CHOICES = [("present", "Present"), ("absent", "Absent"), ("late", "Late"), ("excused", "Excused")]
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name="attendance")
    classroom = models.ForeignKey(ClassRoom, on_delete=models.CASCADE, related_name="attendance")
    subject = models.ForeignKey(Subject, on_delete=models.SET_NULL, null=True, blank=True, related_name="attendance")
    campus = models.ForeignKey(Campus, on_delete=models.CASCADE, null=True, blank=True, related_name="attendance")
    date = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES)
    note = models.CharField(max_length=255, blank=True)
    recorded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)

    class Meta:
        unique_together = ("student", "date", "subject")
        ordering = ["-date"]


class GradingScale(models.Model):
    school = models.ForeignKey(School, on_delete=models.CASCADE, related_name="grading_scales", null=True, blank=True)
    campus = models.ForeignKey(Campus, on_delete=models.CASCADE, null=True, blank=True, related_name="grading_scales")
    name = models.CharField(max_length=80)
    grading_type = models.CharField(max_length=40, default="percentage")
    is_default = models.BooleanField(default=False)
    divisions = models.ManyToManyField(EducationLevel, blank=True, related_name="grading_scales")

    def __str__(self):
        return self.name

    def grade_for(self, score):
        band = self.bands.filter(min_score__lte=score, max_score__gte=score).first()
        return band.grade if band else ""


class GradeBand(models.Model):
    scale = models.ForeignKey(GradingScale, on_delete=models.CASCADE, related_name="bands")
    grade = models.CharField(max_length=5)
    min_score = models.DecimalField(max_digits=5, decimal_places=2)
    max_score = models.DecimalField(max_digits=5, decimal_places=2)
    points = models.DecimalField(max_digits=4, decimal_places=2, default=0)
    comment = models.CharField(max_length=120, blank=True)

    class Meta:
        ordering = ["-min_score"]


class Exam(models.Model):
    term = models.ForeignKey(Term, on_delete=models.CASCADE, related_name="exams")
    campus = models.ForeignKey(Campus, on_delete=models.CASCADE, null=True, blank=True, related_name="exams")
    name = models.CharField(max_length=100)
    starts_on = models.DateField()
    ends_on = models.DateField()
    is_published = models.BooleanField(default=False)

    class Meta:
        ordering = ["-starts_on"]

    def __str__(self):
        return self.name


class ExamSubject(models.Model):
    exam = models.ForeignKey(Exam, on_delete=models.CASCADE, related_name="exam_subjects")
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name="exam_subjects")
    classroom = models.ForeignKey(ClassRoom, on_delete=models.CASCADE, related_name="exam_subjects")
    max_marks = models.DecimalField(max_digits=6, decimal_places=2, default=100)
    exam_date = models.DateField(null=True, blank=True)

    class Meta:
        unique_together = ("exam", "subject", "classroom")


class Result(models.Model):
    exam = models.ForeignKey(Exam, on_delete=models.CASCADE, related_name="results")
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name="results")
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name="results")
    campus = models.ForeignKey(Campus, on_delete=models.CASCADE, null=True, blank=True, related_name="results")
    assignment_score = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    midterm_score = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    final_score = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    score = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    grade = models.CharField(max_length=5, blank=True)
    comment = models.CharField(max_length=255, blank=True)

    class Meta:
        unique_together = ("exam", "student", "subject")

    def save(self, *args, **kwargs):
        components = [self.assignment_score, self.midterm_score, self.final_score]
        if any(value is not None for value in components):
            self.score = sum((value or Decimal("0")) for value in components)
        campus = self.campus or self.student.campus
        scale = (
            GradingScale.objects.filter(campus=campus, is_default=True).first()
            or GradingScale.objects.filter(school=self.student.school, is_default=True).first()
            or GradingScale.objects.filter(campus=campus).first()
            or GradingScale.objects.filter(school=self.student.school).first()
        )
        if scale:
            self.grade = scale.grade_for(self.score)
        super().save(*args, **kwargs)


class ReportCard(models.Model):
    """Student performance summary for an academic year/term."""
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name="report_cards")
    academic_year = models.ForeignKey(AcademicYear, on_delete=models.CASCADE, related_name="report_cards")
    term = models.ForeignKey(Term, on_delete=models.SET_NULL, null=True, blank=True, related_name="report_cards")
    campus = models.ForeignKey(Campus, on_delete=models.CASCADE, null=True, blank=True, related_name="report_cards")
    grading_scale = models.ForeignKey(GradingScale, on_delete=models.SET_NULL, null=True, blank=True)
    overall_score = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    overall_grade = models.CharField(max_length=5, blank=True)
    comments = models.TextField(blank=True)
    generated_on = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-academic_year", "-term"]
        unique_together = ("student", "academic_year", "term", "campus")

    def __str__(self):
        return f"{self.student.full_name} - {self.academic_year.name} {self.term}"


class Room(models.Model):
    school = models.ForeignKey(School, on_delete=models.CASCADE, related_name="rooms")
    name = models.CharField(max_length=60)
    capacity = models.PositiveIntegerField(default=40)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class TimetableEntry(models.Model):
    classroom = models.ForeignKey(ClassRoom, on_delete=models.CASCADE, related_name="timetable_entries")
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name="timetable_entries")
    teacher = models.ForeignKey(Teacher, on_delete=models.CASCADE, related_name="timetable_entries")
    room_ref = models.ForeignKey(
        Room, on_delete=models.SET_NULL, null=True, blank=True, related_name="timetable_entries"
    )
    weekday = models.PositiveSmallIntegerField()
    starts_at = models.TimeField()
    ends_at = models.TimeField()
    room = models.CharField(max_length=40, blank=True)

    class Meta:
        ordering = ["weekday", "starts_at"]


class FeeStructure(models.Model):
    school = models.ForeignKey(School, on_delete=models.CASCADE, related_name="fee_structures")
    name = models.CharField(max_length=100)
    amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    academic_year = models.ForeignKey(AcademicYear, on_delete=models.CASCADE, related_name="fee_structures")
    term = models.ForeignKey(Term, on_delete=models.SET_NULL, null=True, blank=True, related_name="fee_structures")
    classroom = models.ForeignKey(
        ClassRoom, on_delete=models.SET_NULL, null=True, blank=True, related_name="fee_structures"
    )

    def __str__(self):
        return self.name

    @property
    def total(self):
        items = self.items.aggregate(total=models.Sum("amount"))["total"]
        return items if items is not None else self.amount


class FeeItem(models.Model):
    fee_structure = models.ForeignKey(FeeStructure, on_delete=models.CASCADE, related_name="items")
    name = models.CharField(max_length=100)
    amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)


class Invoice(models.Model):
    STATUS_CHOICES = [("unpaid", "Unpaid"), ("partial", "Partial"), ("paid", "Paid"), ("overdue", "Overdue")]
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name="invoices")
    fee_structure = models.ForeignKey(
        FeeStructure, on_delete=models.SET_NULL, null=True, blank=True, related_name="invoices"
    )
    term = models.ForeignKey(Term, on_delete=models.SET_NULL, null=True, blank=True, related_name="invoices")
    reference = models.CharField(max_length=40, unique=True)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    due_on = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="unpaid")

    class Meta:
        ordering = ["-due_on"]

    @property
    def paid_total(self):
        total = self.payments.aggregate(total=models.Sum("amount"))["total"]
        return total or Decimal("0")

    @property
    def balance(self):
        return self.amount - self.paid_total

    def refresh_status(self):
        paid = self.paid_total
        if paid <= 0:
            self.status = "unpaid"
        elif paid < self.amount:
            self.status = "partial"
        else:
            self.status = "paid"
        Invoice.objects.filter(pk=self.pk).update(status=self.status)


class Payment(models.Model):
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name="payments")
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    paid_on = models.DateField(auto_now_add=True)
    method = models.CharField(max_length=30, default="cash")
    reference = models.CharField(max_length=80, blank=True)
    recorded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)

    class Meta:
        ordering = ["-paid_on"]

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        self.invoice.refresh_status()


class Receipt(models.Model):
    payment = models.OneToOneField(Payment, on_delete=models.CASCADE, related_name="receipt")
    number = models.CharField(max_length=40, unique=True)
    issued_on = models.DateTimeField(auto_now_add=True)


class Announcement(models.Model):
    AUDIENCE_CHOICES = [
        ("everyone", "Everyone"),
        ("teachers", "Teachers"),
        ("students", "Students"),
        ("parents", "Parents"),
        ("class", "Specific class"),
    ]
    school = models.ForeignKey(School, on_delete=models.CASCADE, related_name="announcements")
    title = models.CharField(max_length=180)
    body = models.TextField()
    audience = models.CharField(max_length=20, choices=AUDIENCE_CHOICES, default="everyone")
    classroom = models.ForeignKey(
        ClassRoom, on_delete=models.SET_NULL, null=True, blank=True, related_name="announcements"
    )
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    published_at = models.DateTimeField(auto_now_add=True)
    is_published = models.BooleanField(default=False)

    class Meta:
        ordering = ["-published_at"]


class AuditLog(models.Model):
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    action = models.CharField(max_length=40)
    entity = models.CharField(max_length=60)
    entity_id = models.CharField(max_length=40, blank=True)
    detail = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

from datetime import date, timedelta
from decimal import Decimal

from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models import Count, Q, Sum
from django.db import transaction
from rest_framework import status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from .filters import QueryParamFilter
from .models import *
from .permissions import IsAcademicEditor, IsAdmin, IsAdminOrReadOnly, IsFinanceEditor, role_of
from .serializers import *


def current_school(user):
    profile = getattr(user, "profile", None)
    if profile and profile.school_id:
        return profile.school
    return School.objects.first()


def current_institution(user):
    membership = user.memberships.select_related("institution").order_by("institution__name").first()
    if membership:
        return membership.institution
    return Institution.objects.first()


def current_campus(user):
    """Get user's default campus or primary membership campus."""
    membership = user.memberships.select_related("institution", "campus", "default_campus").order_by("institution__name").first()
    if membership:
        if membership.default_campus:
            return membership.default_campus
        if membership.campus:
            return membership.campus
        if membership.institution:
            return membership.institution.campuses.filter(is_main=True).first()
    return None


class BaseViewSet(viewsets.ModelViewSet):
    filter_backends = [QueryParamFilter, SearchFilter, OrderingFilter]
    filter_fields: list = []
    search_fields: list = []


class SchoolViewSet(BaseViewSet):
    queryset = School.objects.all()
    serializer_class = SchoolSerializer
    permission_classes = [IsAdminOrReadOnly]
    search_fields = ["name", "code"]

    def get_queryset(self):
        queryset = super().get_queryset()
        role = role_of(self.request.user)
        if role == "saasadmin":
            return queryset.filter(owner=self.request.user).distinct()
        if role == "admin":
            return queryset.filter(profiles__user=self.request.user).distinct()
        return queryset.none()

    def perform_create(self, serializer):
        school = serializer.save(owner=self.request.user, created_by=self.request.user, status="active")
        profile = getattr(self.request.user, "profile", None)
        if profile and self.request.user.is_authenticated:
            profile.school = school
            profile.role = "saasadmin" if profile.role == "saasadmin" else profile.role
            profile.save(update_fields=["school", "role"])

    @action(detail=False, methods=["get"], url_path="summary")
    def summary(self, request):
        queryset = School.objects.all()
        return Response({
            "total_schools": queryset.count(),
            "active_schools": queryset.filter(status="active").count(),
            "draft_schools": queryset.filter(status="draft").count(),
            "paused_schools": queryset.filter(status="paused").count(),
            "archived_schools": queryset.filter(status="archived").count(),
        })

    @action(detail=True, methods=["post"], url_path="activate")
    def activate(self, request, pk=None):
        school = self.get_object()
        if not request.user.is_authenticated:
            return Response({"detail": "Authentication required."}, status=status.HTTP_401_UNAUTHORIZED)

        school.status = "active"
        school.save(update_fields=["status"])

        profile = getattr(request.user, "profile", None)
        if profile is None:
            profile = UserProfile.objects.create(user=request.user, role="saasadmin", school=school)
        profile.school = school
        profile.save(update_fields=["school"])
        return Response({"detail": "School activated.", "school": school.id})

    @action(detail=True, methods=["post"], url_path="set-status")
    def set_status(self, request, pk=None):
        school = self.get_object()
        status_value = request.data.get("status")
        if status_value not in dict(School.STATUS_CHOICES):
            return Response({"detail": "Invalid status."}, status=status.HTTP_400_BAD_REQUEST)
        school.status = status_value
        school.save(update_fields=["status"])
        return Response({"status": school.status, "id": school.id})

    @action(detail=True, methods=["post"], url_path="assign-admin")
    def assign_admin(self, request, pk=None):
        school = self.get_object()
        admin_id = request.data.get("admin_id")
        if not admin_id:
            return Response({"detail": "admin_id is required."}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.filter(id=admin_id).first()
        if not user:
            return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)

        profile, _ = UserProfile.objects.get_or_create(user=user)
        profile.role = "admin"
        profile.school = school
        profile.save(update_fields=["role", "school"])
        return Response({"detail": "School admin assigned.", "user_id": user.id, "school_id": school.id})


class InstitutionViewSet(BaseViewSet):
    queryset = Institution.objects.prefetch_related("campuses", "memberships").all()
    serializer_class = InstitutionSerializer
    permission_classes = [IsAdminOrReadOnly]
    search_fields = ["name", "code", "city", "country"]

    def get_queryset(self):
        queryset = super().get_queryset()
        if self.request.user.is_authenticated:
            queryset = queryset.filter(memberships__user=self.request.user).distinct()
        return queryset if self.request.user.is_authenticated else queryset.none()

    def perform_create(self, serializer):
        institution = serializer.save(owner=self.request.user, created_by=self.request.user, status="draft")
        Membership.objects.get_or_create(
            user=self.request.user,
            institution=institution,
            defaults={
                "role": "institution_admin",
                "status": "active",
                "access_scope": "all",
            },
        )
        InstitutionSetupProgress.objects.get_or_create(institution=institution)

    @action(detail=False, methods=["get"], url_path="summary")
    def summary(self, request):
        queryset = Institution.objects.all()
        return Response({
            "total_institutions": queryset.count(),
            "active_institutions": queryset.filter(status="active").count(),
            "draft_institutions": queryset.filter(status="draft").count(),
            "trial_institutions": queryset.filter(status="trial").count(),
        })


class CampusViewSet(BaseViewSet):
    queryset = Campus.objects.select_related("institution").all()
    serializer_class = CampusSerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_fields = ["institution", "status", "campus_type", "is_main"]
    search_fields = ["name", "code", "administrator"]

    def get_queryset(self):
        queryset = super().get_queryset()
        if self.request.user.is_authenticated:
            queryset = queryset.filter(institution__memberships__user=self.request.user).distinct()
        return queryset if self.request.user.is_authenticated else queryset.none()


class MembershipViewSet(BaseViewSet):
    queryset = Membership.objects.select_related("user", "institution", "campus", "default_campus").all()
    serializer_class = MembershipSerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_fields = ["user", "institution", "campus", "status", "role"]
    search_fields = ["role"]

    def get_queryset(self):
        queryset = super().get_queryset()
        if self.request.user.is_authenticated:
            queryset = queryset.filter(institution__memberships__user=self.request.user).distinct()
        return queryset if self.request.user.is_authenticated else queryset.none()


class EducationLevelViewSet(BaseViewSet):
    queryset = EducationLevel.objects.select_related("institution").all()
    serializer_class = EducationLevelSerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_fields = ["institution", "is_active"]
    search_fields = ["name", "code"]

    def get_queryset(self):
        queryset = super().get_queryset()
        if self.request.user.is_authenticated:
            queryset = queryset.filter(institution__memberships__user=self.request.user).distinct()
        return queryset if self.request.user.is_authenticated else queryset.none()


class DepartmentViewSet(BaseViewSet):
    queryset = Department.objects.select_related("institution").prefetch_related("divisions").all()
    serializer_class = DepartmentSerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_fields = ["institution", "divisions", "is_active"]
    search_fields = ["name", "code"]

    def get_queryset(self):
        queryset = super().get_queryset()
        return queryset.filter(institution__memberships__user=self.request.user).distinct()


class ProgrammeViewSet(BaseViewSet):
    queryset = Programme.objects.select_related("institution", "department").prefetch_related("divisions").all()
    serializer_class = ProgrammeSerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_fields = ["institution", "department", "divisions", "is_active"]
    search_fields = ["name", "code", "award"]

    def get_queryset(self):
        queryset = super().get_queryset()
        return queryset.filter(institution__memberships__user=self.request.user).distinct()


class InstitutionSetupView(APIView):
    permission_classes = [IsAdmin]

    @transaction.atomic
    def post(self, request):
        payload = request.data
        institution_data = payload.get("institution", {})
        campus_data = payload.get("campus", {})
        campuses_data = payload.get("campuses") or [campus_data]
        school_id = payload.get("school_id")
        school = School.objects.filter(
            Q(id=school_id),
            Q(owner=request.user) | Q(profiles__user=request.user),
        ).distinct().first() if school_id else None
        if school_id and not school:
            return Response({"school_id": ["Select a school registered by your account."]}, status=status.HTTP_400_BAD_REQUEST)
        if not institution_data.get("name") or not institution_data.get("code"):
            return Response({"institution": ["name and code are required."]}, status=status.HTTP_400_BAD_REQUEST)
        if any(not item.get("name") or not item.get("code") for item in campuses_data):
            return Response({"campus": ["name and code are required."]}, status=status.HTTP_400_BAD_REQUEST)
        for index, item in enumerate(payload.get("sessions", [])):
            if not item.get("name") or not item.get("starts_on") or not item.get("ends_on"):
                return Response({"sessions": [f"Session {index + 1} needs a name, start date, and end date."]}, status=status.HTTP_400_BAD_REQUEST)
        for index, item in enumerate(payload.get("terms", [])):
            if not item.get("name") or not item.get("starts_on") or not item.get("ends_on"):
                return Response({"terms": [f"Term {index + 1} needs a name, start date, and end date."]}, status=status.HTTP_400_BAD_REQUEST)

        if school and hasattr(school, "institution_profile"):
            institution = school.institution_profile
            for key, value in institution_data.items():
                setattr(institution, key, value)
            institution.save()
        else:
            if school:
                institution_data = {
                    "name": school.name,
                    "code": school.code,
                    "email": school.email,
                    "phone": school.phone,
                    "address": school.address,
                    "logo": school.logo,
                    **institution_data,
                }
            institution = Institution.objects.create(
                school=school,
                **institution_data,
                owner=request.user,
                created_by=request.user,
                status="active",
            )
        if school is None:
            school = institution.school
        if school is None:
            school_code = institution.code
            if School.objects.filter(code=school_code).exists():
                school_code = f"{school_code}-{institution.id}"
            school = School.objects.create(
                name=institution.name,
                code=school_code,
                email=institution.email,
                phone=institution.phone,
                address=institution.address,
                logo=institution.logo,
                owner=request.user,
                created_by=request.user,
                status="active",
            )
            institution.school = school
            institution.save(update_fields=["school"])
        campus_records = []
        for index, item in enumerate(campuses_data):
            item = dict(item)
            campus_code = item.pop("code")
            campus, _ = Campus.objects.update_or_create(
                institution=institution,
                code=campus_code,
                defaults={**item, "is_main": index == 0},
            )
            campus_records.append(campus)
        campus = campus_records[0]
        Membership.objects.update_or_create(
            user=request.user,
            institution=institution,
            role="institution_admin",
            campus=None,
            defaults={"status": "active", "access_scope": "all", "default_campus": campus},
        )
        profile, _ = UserProfile.objects.get_or_create(user=request.user)
        profile.school = school
        profile.save(update_fields=["school"])

        levels = payload.get("divisions") or [
            {"name": "Nursery", "code": "NURSERY", "order": 1},
            {"name": "Primary", "code": "PRIMARY", "order": 2},
            {"name": "Secondary", "code": "SECONDARY", "order": 3},
            {"name": "College / University", "code": "HIGHER", "order": 4},
        ]
        division_by_code = {}
        for item in levels:
            division, _ = EducationLevel.objects.update_or_create(
                institution=institution,
                code=item["code"],
                defaults={**item, "is_active": True},
            )
            division_by_code[division.code] = division

        sessions = payload.get("sessions") or []
        session_by_name = {}
        for item in sessions:
            session = AcademicYear.objects.create(institution=institution, campus=campus, school=school, **item)
            session_by_name[session.name] = session
        if not session_by_name:
            session = AcademicYear.objects.create(
                institution=institution, campus=campus, school=school,
                name="First session", starts_on=date.today(), ends_on=date.today(), is_current=True,
            )
            session_by_name[session.name] = session

        default_session = next(iter(session_by_name.values()))
        for item in payload.get("terms", []):
            session = session_by_name.get(item.pop("session", ""), default_session)
            Term.objects.create(academic_year=session, **item)

        departments = {}
        for item in payload.get("departments", []):
            division_codes = item.pop("divisions", item.pop("division", []))
            if isinstance(division_codes, str):
                division_codes = [division_codes] if division_codes else []
            department, _ = Department.objects.update_or_create(institution=institution, code=item["code"], defaults=item)
            department.divisions.set([division_by_code[code] for code in division_codes if code in division_by_code])
            departments[department.code] = department

        programmes = {}
        for item in payload.get("programmes", []):
            division_codes = item.pop("divisions", item.pop("division", []))
            if isinstance(division_codes, str):
                division_codes = [division_codes] if division_codes else []
            department = departments.get(item.pop("department", ""))
            programme, _ = Programme.objects.update_or_create(institution=institution, code=item["code"], defaults={**item, "department": department})
            programme.divisions.set([division_by_code[code] for code in division_codes if code in division_by_code])
            programmes[programme.code] = programme

        for item in payload.get("classes", []):
            division_codes = item.pop("divisions", item.pop("division", []))
            if isinstance(division_codes, str):
                division_codes = [division_codes] if division_codes else []
            programme = programmes.get(item.pop("programme", ""))
            classroom = ClassRoom.objects.create(campus=campus, school=school, programme=programme, **item)
            classroom.divisions.set([division_by_code[code] for code in division_codes if code in division_by_code])
        for item in payload.get("subjects", []):
            division_codes = item.pop("divisions", item.pop("division", []))
            if isinstance(division_codes, str):
                division_codes = [division_codes] if division_codes else []
            programme = programmes.get(item.pop("programme", ""))
            department = departments.get(item.pop("department_code", ""))
            subject = Subject.objects.create(campus=campus, school=school, programme=programme, department_ref=department, **item)
            subject.divisions.set([division_by_code[code] for code in division_codes if code in division_by_code])

        grading = payload.get("grading") or {}
        scale = GradingScale.objects.create(campus=campus, school=school, name=grading.get("name", "Standard A-F Scale"), grading_type=grading.get("grading_type", "percentage"), is_default=True)
        scale.divisions.set([division_by_code[code] for code in grading.get("divisions", []) if code in division_by_code])
        for band in grading.get("bands", []):
            GradeBand.objects.create(scale=scale, **band)
        InstitutionSetupProgress.objects.update_or_create(
            institution=institution,
            defaults={"completed_steps": ["institution", "campus", "divisions", "sessions", "terms", "departments", "programmes", "classes", "subjects", "grading"], "last_step": "grading", "progress_percent": 100},
        )
        return Response({"institution": institution.id, "school": school.id, "campus": campus.id}, status=status.HTTP_201_CREATED)


class AcademicYearViewSet(BaseViewSet):
    queryset = AcademicYear.objects.select_related("school", "campus").all()
    serializer_class = AcademicYearSerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_fields = ["school", "campus", "is_current"]
    search_fields = ["name"]

    def get_queryset(self):
        queryset = super().get_queryset()
        campus_id = self.request.query_params.get("campus")
        if campus_id:
            queryset = queryset.filter(campus_id=campus_id)
        elif self.request.user.is_authenticated:
            user_campus = current_campus(self.request.user)
            if user_campus:
                queryset = queryset.filter(campus=user_campus)
        return queryset

    def perform_create(self, serializer):
        campus = self.request.data.get("campus") or current_campus(self.request.user)
        school = self.request.data.get("school") or current_school(self.request.user)
        serializer.save(campus_id=campus.id if isinstance(campus, Campus) else campus, school_id=school.id if isinstance(school, School) else school)


class TermViewSet(BaseViewSet):
    queryset = Term.objects.select_related("academic_year").all()
    serializer_class = TermSerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_fields = ["academic_year", "is_current"]
    search_fields = ["name"]


class ClassRoomViewSet(BaseViewSet):
    queryset = ClassRoom.objects.select_related("class_teacher").prefetch_related("enrollments", "assignments").all()
    serializer_class = ClassRoomSerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_fields = ["school", "level", "stream", "class_teacher"]
    search_fields = ["name", "level", "stream"]


class SubjectViewSet(BaseViewSet):
    queryset = Subject.objects.all()
    serializer_class = SubjectSerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_fields = ["school", "department", "is_active"]
    search_fields = ["name", "code", "department"]


class ClassRoomViewSet(BaseViewSet):
    queryset = ClassRoom.objects.select_related("class_teacher", "school", "campus").prefetch_related("enrollments", "assignments").all()
    serializer_class = ClassRoomSerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_fields = ["school", "campus", "level", "stream", "class_teacher"]
    search_fields = ["name", "level", "stream"]

    def get_queryset(self):
        queryset = super().get_queryset()
        campus_id = self.request.query_params.get("campus")
        if campus_id:
            queryset = queryset.filter(campus_id=campus_id)
        elif self.request.user.is_authenticated:
            user_campus = current_campus(self.request.user)
            if user_campus:
                queryset = queryset.filter(campus=user_campus)
        return queryset


class SubjectViewSet(BaseViewSet):
    queryset = Subject.objects.select_related("school", "campus").all()
    serializer_class = SubjectSerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_fields = ["school", "campus", "department", "is_active"]
    search_fields = ["name", "code", "department"]

    def get_queryset(self):
        queryset = super().get_queryset()
        campus_id = self.request.query_params.get("campus")
        if campus_id:
            queryset = queryset.filter(campus_id=campus_id)
        elif self.request.user.is_authenticated:
            user_campus = current_campus(self.request.user)
            if user_campus:
                queryset = queryset.filter(campus=user_campus)
        return queryset


class ParentViewSet(BaseViewSet):
    queryset = Parent.objects.prefetch_related("students").select_related("school", "campus").all()
    serializer_class = ParentSerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_fields = ["school", "campus"]
    search_fields = ["full_name", "phone", "email"]

    def get_queryset(self):
        queryset = super().get_queryset()
        campus_id = self.request.query_params.get("campus")
        if campus_id:
            queryset = queryset.filter(campus_id=campus_id)
        elif role_of(self.request.user) == "parent":
            queryset = queryset.filter(user=self.request.user)
        elif self.request.user.is_authenticated:
            user_campus = current_campus(self.request.user)
            if user_campus:
                queryset = queryset.filter(campus=user_campus)
        return queryset


class TeacherViewSet(BaseViewSet):
    queryset = Teacher.objects.select_related("school", "campus").all()
    serializer_class = TeacherSerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_fields = ["school", "campus", "department", "status"]
    search_fields = ["full_name", "employee_id", "email", "department", "role"]

    def get_queryset(self):
        queryset = super().get_queryset()
        campus_id = self.request.query_params.get("campus")
        if campus_id:
            queryset = queryset.filter(campus_id=campus_id)
        elif self.request.user.is_authenticated:
            user_campus = current_campus(self.request.user)
            if user_campus:
                queryset = queryset.filter(campus=user_campus)
        return queryset


class StudentViewSet(BaseViewSet):
    queryset = Student.objects.select_related("parent", "school", "campus").prefetch_related("enrollments__classroom").all()
    serializer_class = StudentSerializer
    permission_classes = [IsAcademicEditor]
    filter_fields = ["school", "campus", "status", "gender", "parent"]
    search_fields = ["first_name", "last_name", "admission_number", "phone", "email"]

    def get_queryset(self):
        queryset = super().get_queryset()
        campus_id = self.request.query_params.get("campus")
        classroom_id = self.request.query_params.get("classroom")
        
        role = role_of(self.request.user)
        if role == "parent":
            queryset = queryset.filter(parent__user=self.request.user)
        elif role == "student":
            queryset = queryset.filter(user=self.request.user)
        elif campus_id:
            queryset = queryset.filter(campus_id=campus_id)
        elif self.request.user.is_authenticated:
            user_campus = current_campus(self.request.user)
            if user_campus:
                queryset = queryset.filter(campus=user_campus)
        
        if classroom_id:
            queryset = queryset.filter(enrollments__classroom_id=classroom_id)
        return queryset.distinct()


class EnrollmentViewSet(BaseViewSet):
    queryset = Enrollment.objects.select_related("student", "classroom", "academic_year").all()
    serializer_class = EnrollmentSerializer
    permission_classes = [IsAcademicEditor]
    filter_fields = ["student", "classroom", "academic_year"]


class TeacherSubjectAssignmentViewSet(BaseViewSet):
    queryset = TeacherSubjectAssignment.objects.select_related("teacher", "subject", "classroom").all()
    serializer_class = TeacherSubjectAssignmentSerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_fields = ["teacher", "subject", "classroom", "academic_year"]


class AttendanceViewSet(BaseViewSet):
    queryset = Attendance.objects.select_related("student", "classroom", "subject", "campus").all()
    serializer_class = AttendanceSerializer
    permission_classes = [IsAcademicEditor]
    filter_fields = ["student", "classroom", "subject", "campus", "date", "status"]

    def get_queryset(self):
        queryset = super().get_queryset()
        campus_id = self.request.query_params.get("campus")
        role = role_of(self.request.user)
        
        if role == "parent":
            queryset = queryset.filter(student__parent__user=self.request.user)
        elif role == "student":
            queryset = queryset.filter(student__user=self.request.user)
        
        if campus_id:
            queryset = queryset.filter(campus_id=campus_id)
        elif self.request.user.is_authenticated:
            user_campus = current_campus(self.request.user)
            if user_campus:
                queryset = queryset.filter(campus=user_campus)
        
        start = self.request.query_params.get("date_from")
        end = self.request.query_params.get("date_to")
        if start:
            queryset = queryset.filter(date__gte=start)
        if end:
            queryset = queryset.filter(date__lte=end)
        return queryset

    @action(detail=False, methods=["get"])
    def sheet(self, request):
        """Students of a class plus any attendance already recorded for that date and subject."""
        classroom_id = request.query_params.get("classroom")
        on_date = request.query_params.get("date") or date.today().isoformat()
        subject_id = request.query_params.get("subject") or None
        if not classroom_id:
            return Response({"detail": "classroom is required"}, status=status.HTTP_400_BAD_REQUEST)
        students = Student.objects.filter(enrollments__classroom_id=classroom_id, status="active").distinct()
        existing = {
            record.student_id: record
            for record in Attendance.objects.filter(classroom_id=classroom_id, date=on_date, subject_id=subject_id)
        }
        rows = []
        for student in students:
            record = existing.get(student.id)
            rows.append({
                "student": student.id,
                "student_name": student.full_name,
                "admission_number": student.admission_number,
                "status": record.status if record else "present",
                "note": record.note if record else "",
                "recorded": bool(record),
            })
        return Response({"date": on_date, "classroom": int(classroom_id), "subject": subject_id, "rows": rows})

    @action(detail=False, methods=["post"])
    def bulk(self, request):
        classroom_id = request.data.get("classroom")
        on_date = request.data.get("date")
        subject_id = request.data.get("subject") or None
        records = request.data.get("records", [])
        if not classroom_id or not on_date:
            return Response({"detail": "classroom and date are required"}, status=status.HTTP_400_BAD_REQUEST)
        for record in records:
            Attendance.objects.update_or_create(
                student_id=record["student"],
                date=on_date,
                subject_id=subject_id,
                defaults={
                    "classroom_id": classroom_id,
                    "status": record.get("status", "present"),
                    "note": record.get("note", ""),
                    "recorded_by": request.user,
                },
            )
        return Response({"saved": len(records)})


class GradingScaleViewSet(BaseViewSet):
    queryset = GradingScale.objects.prefetch_related("bands").select_related("school", "campus").all()
    serializer_class = GradingScaleSerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_fields = ["school", "campus", "is_default"]

    def get_queryset(self):
        queryset = super().get_queryset()
        campus_id = self.request.query_params.get("campus")
        if campus_id:
            queryset = queryset.filter(campus_id=campus_id)
        elif self.request.user.is_authenticated:
            user_campus = current_campus(self.request.user)
            if user_campus:
                queryset = queryset.filter(campus=user_campus)
        return queryset


class GradeBandViewSet(BaseViewSet):
    queryset = GradeBand.objects.all()
    serializer_class = GradeBandSerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_fields = ["scale"]


class ExamViewSet(BaseViewSet):
    queryset = Exam.objects.select_related("term__academic_year", "campus").all()
    serializer_class = ExamSerializer
    permission_classes = [IsAcademicEditor]
    filter_fields = ["term", "campus", "is_published"]
    search_fields = ["name"]

    def get_queryset(self):
        queryset = super().get_queryset()
        campus_id = self.request.query_params.get("campus")
        if campus_id:
            queryset = queryset.filter(campus_id=campus_id)
        elif self.request.user.is_authenticated:
            user_campus = current_campus(self.request.user)
            if user_campus:
                queryset = queryset.filter(campus=user_campus)
        return queryset

    @action(detail=True, methods=["post"], permission_classes=[IsAdmin])
    def publish(self, request, pk=None):
        exam = self.get_object()
        exam.is_published = not exam.is_published
        exam.save(update_fields=["is_published"])
        return Response(ExamSerializer(exam).data)


class ExamSubjectViewSet(BaseViewSet):
    queryset = ExamSubject.objects.select_related("subject", "classroom").all()
    serializer_class = ExamSubjectSerializer
    permission_classes = [IsAcademicEditor]
    filter_fields = ["exam", "subject", "classroom"]


class ResultViewSet(BaseViewSet):
    queryset = Result.objects.select_related("student", "subject", "exam", "campus").all()
    serializer_class = ResultSerializer
    permission_classes = [IsAcademicEditor]
    filter_fields = ["exam", "student", "subject", "campus"]

    def get_queryset(self):
        queryset = super().get_queryset()
        campus_id = self.request.query_params.get("campus")
        role = role_of(self.request.user)
        
        if role == "parent":
            queryset = queryset.filter(student__parent__user=self.request.user, exam__is_published=True)
        elif role == "student":
            queryset = queryset.filter(student__user=self.request.user, exam__is_published=True)
        
        if campus_id:
            queryset = queryset.filter(campus_id=campus_id)
        elif self.request.user.is_authenticated:
            user_campus = current_campus(self.request.user)
            if user_campus:
                queryset = queryset.filter(campus=user_campus)
        
        classroom = self.request.query_params.get("classroom")
        if classroom:
            queryset = queryset.filter(student__enrollments__classroom_id=classroom)
        return queryset.distinct()

    @action(detail=False, methods=["get"])
    def sheet(self, request):
        """Marks-entry grid for one exam, subject and class."""
        exam_id = request.query_params.get("exam")
        subject_id = request.query_params.get("subject")
        classroom_id = request.query_params.get("classroom")
        if not (exam_id and subject_id and classroom_id):
            return Response({"detail": "exam, subject and classroom are required"}, status=status.HTTP_400_BAD_REQUEST)
        exam_subject = ExamSubject.objects.filter(
            exam_id=exam_id, subject_id=subject_id, classroom_id=classroom_id
        ).first()
        students = Student.objects.filter(enrollments__classroom_id=classroom_id, status="active").distinct()
        existing = {r.student_id: r for r in Result.objects.filter(exam_id=exam_id, subject_id=subject_id)}
        rows = []
        for student in students:
            record = existing.get(student.id)
            rows.append({
                "student": student.id,
                "student_name": student.full_name,
                "admission_number": student.admission_number,
                "assignment_score": record.assignment_score if record else None,
                "midterm_score": record.midterm_score if record else None,
                "final_score": record.final_score if record else None,
                "score": record.score if record else None,
                "grade": record.grade if record else "",
                "comment": record.comment if record else "",
            })
        return Response({"max_marks": exam_subject.max_marks if exam_subject else 100, "rows": rows})

    @action(detail=False, methods=["post"])
    def bulk(self, request):
        exam_id = request.data.get("exam")
        subject_id = request.data.get("subject")
        records = request.data.get("records", [])
        if not (exam_id and subject_id):
            return Response({"detail": "exam and subject are required"}, status=status.HTTP_400_BAD_REQUEST)
        saved = []
        for record in records:
            result, _ = Result.objects.get_or_create(
                exam_id=exam_id, subject_id=subject_id, student_id=record["student"]
            )
            result.assignment_score = record.get("assignment_score")
            result.midterm_score = record.get("midterm_score")
            result.final_score = record.get("final_score")
            result.comment = record.get("comment", "")
            result.save()
            saved.append(result)
        return Response(ResultSerializer(saved, many=True).data)

    @action(detail=False, methods=["get"], url_path="report-card")
    def report_card(self, request):
        student = Student.objects.filter(pk=request.query_params.get("student")).first()
        exam = Exam.objects.filter(pk=request.query_params.get("exam")).first()
        if not student or not exam:
            return Response({"detail": "student and exam are required"}, status=status.HTTP_400_BAD_REQUEST)
        results = list(Result.objects.filter(student=student, exam=exam).select_related("subject"))
        total = sum((r.score for r in results), Decimal("0"))
        average = total / len(results) if results else Decimal("0")
        enrollment = student.enrollments.select_related("classroom").order_by("-academic_year__starts_on").first()
        classroom = enrollment.classroom if enrollment else None
        position = None
        if classroom:
            ranking = (
                Result.objects.filter(exam=exam, student__enrollments__classroom=classroom)
                .values("student")
                .annotate(total=Sum("score"))
                .order_by("-total")
            )
            ordered = [row["student"] for row in ranking]
            if student.id in ordered:
                position = ordered.index(student.id) + 1
        attendance = Attendance.objects.filter(student=student)
        sessions = attendance.count()
        attendance_rate = (
            round(attendance.filter(status__in=["present", "late"]).count() / sessions * 100, 1) if sessions else 0
        )
        return Response({
            "student": StudentSerializer(student).data,
            "exam": ExamSerializer(exam).data,
            "classroom": ClassRoomSerializer(classroom).data if classroom else None,
            "results": ResultSerializer(results, many=True).data,
            "total": total,
            "average": round(average, 2),
            "position": position,
            "class_size": classroom.enrollments.count() if classroom else 0,
            "attendance_rate": attendance_rate,
        })


class ReportCardViewSet(BaseViewSet):
    queryset = ReportCard.objects.select_related("student", "academic_year", "term", "campus", "grading_scale").all()
    serializer_class = ReportCardSerializer
    permission_classes = [IsAcademicEditor]
    filter_fields = ["student", "academic_year", "term", "campus"]

    def get_queryset(self):
        queryset = super().get_queryset()
        campus_id = self.request.query_params.get("campus")
        role = role_of(self.request.user)
        
        if role == "parent":
            queryset = queryset.filter(student__parent__user=self.request.user)
        elif role == "student":
            queryset = queryset.filter(student__user=self.request.user)
        
        if campus_id:
            queryset = queryset.filter(campus_id=campus_id)
        elif self.request.user.is_authenticated:
            user_campus = current_campus(self.request.user)
            if user_campus:
                queryset = queryset.filter(campus=user_campus)
        return queryset


class RoomViewSet(BaseViewSet):
    queryset = Room.objects.all()
    serializer_class = RoomSerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_fields = ["school"]
    search_fields = ["name"]


class TimetableEntryViewSet(BaseViewSet):
    queryset = TimetableEntry.objects.select_related("classroom", "subject", "teacher", "room_ref").all()
    serializer_class = TimetableEntrySerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_fields = ["classroom", "subject", "teacher", "room_ref", "weekday"]

    @action(detail=False, methods=["get"], url_path="check-conflict")
    def check_conflict(self, request):
        params = request.query_params
        weekday, starts_at, ends_at = params.get("weekday"), params.get("starts_at"), params.get("ends_at")
        if not (weekday and starts_at and ends_at):
            return Response({"detail": "weekday, starts_at and ends_at are required"}, status=status.HTTP_400_BAD_REQUEST)
        overlapping = TimetableEntry.objects.filter(weekday=weekday, starts_at__lt=ends_at, ends_at__gt=starts_at)
        if params.get("exclude"):
            overlapping = overlapping.exclude(pk=params["exclude"])
        conflicts = []
        if params.get("teacher") and overlapping.filter(teacher_id=params["teacher"]).exists():
            conflicts.append("That teacher is already teaching another class at this time.")
        if params.get("classroom") and overlapping.filter(classroom_id=params["classroom"]).exists():
            conflicts.append("This class already has another subject at this time.")
        if params.get("room_ref") and overlapping.filter(room_ref_id=params["room_ref"]).exists():
            conflicts.append("That room is already occupied at this time.")
        return Response({"conflicts": conflicts, "ok": not conflicts})


class FeeStructureViewSet(BaseViewSet):
    queryset = FeeStructure.objects.prefetch_related("items").select_related("term", "classroom").all()
    serializer_class = FeeStructureSerializer
    permission_classes = [IsFinanceEditor]
    filter_fields = ["school", "academic_year", "term", "classroom"]
    search_fields = ["name"]


class FeeItemViewSet(BaseViewSet):
    queryset = FeeItem.objects.all()
    serializer_class = FeeItemSerializer
    permission_classes = [IsFinanceEditor]
    filter_fields = ["fee_structure"]


class InvoiceViewSet(BaseViewSet):
    queryset = Invoice.objects.select_related("student").prefetch_related("payments").all()
    serializer_class = InvoiceSerializer
    permission_classes = [IsFinanceEditor]
    filter_fields = ["student", "status", "term", "fee_structure"]
    search_fields = ["reference", "student__first_name", "student__last_name"]

    def get_queryset(self):
        queryset = super().get_queryset()
        role = role_of(self.request.user)
        if role == "parent":
            queryset = queryset.filter(student__parent__user=self.request.user)
        elif role == "student":
            queryset = queryset.filter(student__user=self.request.user)
        return queryset

    @action(detail=False, methods=["post"])
    def generate(self, request):
        """Bill every active student in a class using a fee structure."""
        structure = FeeStructure.objects.filter(pk=request.data.get("fee_structure")).first()
        classroom_id = request.data.get("classroom") or (structure.classroom_id if structure else None)
        due_on = request.data.get("due_on") or (date.today() + timedelta(days=30)).isoformat()
        if not structure or not classroom_id:
            return Response({"detail": "fee_structure and classroom are required"}, status=status.HTTP_400_BAD_REQUEST)
        students = Student.objects.filter(enrollments__classroom_id=classroom_id, status="active").distinct()
        created = 0
        for student in students:
            if Invoice.objects.filter(student=student, fee_structure=structure).exists():
                continue
            Invoice.objects.create(
                student=student,
                fee_structure=structure,
                term=structure.term,
                reference=f"INV-{date.today().year}-{Invoice.objects.count() + 1:05d}",
                amount=structure.total,
                due_on=due_on,
            )
            created += 1
        return Response({"created": created})


class PaymentViewSet(BaseViewSet):
    queryset = Payment.objects.select_related("invoice__student").all()
    serializer_class = PaymentSerializer
    permission_classes = [IsFinanceEditor]
    filter_fields = ["invoice", "method"]
    search_fields = ["reference", "invoice__reference"]

    def get_queryset(self):
        queryset = super().get_queryset()
        if role_of(self.request.user) == "parent":
            queryset = queryset.filter(invoice__student__parent__user=self.request.user)
        student = self.request.query_params.get("student")
        if student:
            queryset = queryset.filter(invoice__student_id=student)
        return queryset

    def perform_create(self, serializer):
        payment = serializer.save(recorded_by=self.request.user)
        Receipt.objects.create(payment=payment, number=f"RCT-{payment.id:06d}")


class ReceiptViewSet(BaseViewSet):
    queryset = Receipt.objects.select_related("payment__invoice__student").all()
    serializer_class = ReceiptSerializer
    permission_classes = [IsFinanceEditor]
    filter_fields = ["payment"]


class AnnouncementViewSet(BaseViewSet):
    queryset = Announcement.objects.select_related("classroom", "created_by").all()
    serializer_class = AnnouncementSerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_fields = ["school", "audience", "is_published", "classroom"]
    search_fields = ["title", "body"]

    def get_queryset(self):
        queryset = super().get_queryset()
        audience_for_role = {"teacher": "teachers", "parent": "parents", "student": "students"}
        role = role_of(self.request.user)
        if role in audience_for_role:
            queryset = queryset.filter(is_published=True).filter(
                Q(audience="everyone") | Q(audience=audience_for_role[role]) | Q(audience="class")
            )
        return queryset

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class UserProfileViewSet(BaseViewSet):
    queryset = UserProfile.objects.select_related("user", "school").all()
    serializer_class = UserProfileSerializer
    permission_classes = [IsAdmin]
    filter_fields = ["role", "school"]


class UserAccountViewSet(BaseViewSet):
    queryset = User.objects.select_related("profile").order_by("username")
    serializer_class = AccountSerializer
    permission_classes = [IsAdmin]
    filter_fields = ["is_active"]
    search_fields = ["username", "email", "first_name", "last_name"]

    def get_queryset(self):
        queryset = super().get_queryset()
        role = self.request.query_params.get("role")
        return queryset.filter(profile__role=role) if role else queryset

    @action(detail=True, methods=["post"], url_path="set-password")
    def set_password(self, request, pk=None):
        user = self.get_object()
        password = request.data.get("password", "")
        try:
            validate_password(password, user)
        except DjangoValidationError as error:
            return Response({"password": list(error.messages)}, status=status.HTTP_400_BAD_REQUEST)
        user.set_password(password)
        user.save(update_fields=["password"])
        return Response({"detail": "Password updated."})


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AuditLog.objects.select_related("user").all()
    serializer_class = serializer_for(AuditLog)
    permission_classes = [IsAdmin]


router_viewsets = {
    "schools": SchoolViewSet,
    "institutions": InstitutionViewSet,
    "campuses": CampusViewSet,
    "memberships": MembershipViewSet,
    "education-levels": EducationLevelViewSet,
    "departments": DepartmentViewSet,
    "programmes": ProgrammeViewSet,
    "academic-years": AcademicYearViewSet,
    "terms": TermViewSet,
    "class-rooms": ClassRoomViewSet,
    "subjects": SubjectViewSet,
    "parents": ParentViewSet,
    "teachers": TeacherViewSet,
    "students": StudentViewSet,
    "enrollments": EnrollmentViewSet,
    "teacher-assignments": TeacherSubjectAssignmentViewSet,
    "attendance": AttendanceViewSet,
    "grading-scales": GradingScaleViewSet,
    "grade-bands": GradeBandViewSet,
    "exams": ExamViewSet,
    "exam-subjects": ExamSubjectViewSet,
    "results": ResultViewSet,
    "report-cards": ReportCardViewSet,
    "rooms": RoomViewSet,
    "timetable-entries": TimetableEntryViewSet,
    "fee-structures": FeeStructureViewSet,
    "fee-items": FeeItemViewSet,
    "invoices": InvoiceViewSet,
    "payments": PaymentViewSet,
    "receipts": ReceiptViewSet,
    "announcements": AnnouncementViewSet,
    "users": UserAccountViewSet,
    "user-profiles": UserProfileViewSet,
    "audit-logs": AuditLogViewSet,
}


class RoleTokenObtainPairView(TokenObtainPairView):
    serializer_class = RoleTokenObtainPairSerializer


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        user.memberships.select_related("institution", "campus")
        return Response(MeSerializer(user).data)


class RegisterView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "register"

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(
            {"user": MeSerializer(user).data, "requires_approval": not user.is_active},
            status=status.HTTP_201_CREATED,
        )


class OwnerSignupView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "register"

    def post(self, request):
        serializer = OwnerSignupSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response({"user": MeSerializer(user).data}, status=status.HTTP_201_CREATED)


class DashboardSummaryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        school = current_school(request.user)
        today = date.today()
        students = Student.objects.filter(school=school)
        today_attendance = Attendance.objects.filter(student__school=school, date=today)
        marked = today_attendance.count()
        attendance_rate = (
            round(today_attendance.filter(status__in=["present", "late"]).count() / marked * 100, 1) if marked else 0
        )
        billed = Invoice.objects.filter(student__school=school).aggregate(total=Sum("amount"))["total"] or Decimal("0")
        collected = Payment.objects.filter(invoice__student__school=school).aggregate(
            total=Sum("amount")
        )["total"] or Decimal("0")

        attendance_trend = []
        for offset in range(6, -1, -1):
            day = today - timedelta(days=offset)
            records = Attendance.objects.filter(student__school=school, date=day)
            total = records.count()
            rate = round(records.filter(status__in=["present", "late"]).count() / total * 100) if total else 0
            attendance_trend.append({"name": day.strftime("%a"), "value": rate})

        fee_trend = []
        for offset in range(5, -1, -1):
            month = (today.replace(day=1) - timedelta(days=offset * 30)).replace(day=1)
            total = Payment.objects.filter(
                invoice__student__school=school, paid_on__year=month.year, paid_on__month=month.month
            ).aggregate(total=Sum("amount"))["total"] or Decimal("0")
            fee_trend.append({"name": month.strftime("%b"), "value": float(total)})

        return Response({
            "total_students": students.count(),
            "total_teachers": Teacher.objects.filter(school=school).count(),
            "attendance_rate": attendance_rate,
            "attendance_marked": marked,
            "fees_billed": float(billed),
            "fees_collected": float(collected),
            "fees_outstanding": float(billed - collected),
            "enrollment_by_class": list(
                ClassRoom.objects.filter(school=school)
                .annotate(value=Count("enrollments"))
                .values("name", "value")
                .order_by("level", "name")[:12]
            ),
            "attendance_trend": attendance_trend,
            "fee_trend": fee_trend,
            "upcoming_exams": ExamSerializer(
                Exam.objects.filter(starts_on__gte=today).order_by("starts_on")[:5], many=True
            ).data,
            "announcements": AnnouncementSerializer(
                Announcement.objects.filter(school=school, is_published=True)[:5], many=True
            ).data,
            "recent_activity": [
                {
                    "title": f"Payment received — {p.invoice.student.full_name}",
                    "detail": f"MK {p.amount:,.2f}",
                    "at": str(p.paid_on),
                }
                for p in Payment.objects.filter(invoice__student__school=school)[:6]
            ],
        })


class ReportView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        school = current_school(request.user)
        report = request.query_params.get("report", "student-list")
        classroom = request.query_params.get("classroom")

        if report == "student-list":
            rows = Student.objects.filter(school=school)
            if classroom:
                rows = rows.filter(enrollments__classroom_id=classroom).distinct()
            return Response({
                "columns": ["Admission no.", "Student", "Gender", "Guardian", "Status"],
                "rows": [
                    [s.admission_number, s.full_name, s.gender or "—", s.parent.full_name if s.parent else "—", s.status]
                    for s in rows
                ],
            })

        if report == "attendance-summary":
            students = Student.objects.filter(school=school)
            if classroom:
                students = students.filter(enrollments__classroom_id=classroom).distinct()
            rows = []
            for student in students:
                records = Attendance.objects.filter(student=student)
                total = records.count()
                present = records.filter(status="present").count()
                rate = round(present / total * 100, 1) if total else 0
                rows.append([student.full_name, total, present, records.filter(status="absent").count(), f"{rate}%"])
            return Response({"columns": ["Student", "Sessions", "Present", "Absent", "Rate"], "rows": rows})

        if report == "class-performance":
            rows = []
            for room in ClassRoom.objects.filter(school=school):
                results = Result.objects.filter(student__enrollments__classroom=room)
                count = results.count()
                total = results.aggregate(total=Sum("score"))["total"] or Decimal("0")
                rows.append([room.name, count, round(float(total) / count, 1) if count else 0])
            return Response({"columns": ["Class", "Results recorded", "Average score"], "rows": rows})

        if report == "fee-collection":
            return Response({
                "columns": ["Invoice", "Student", "Date", "Method", "Amount"],
                "rows": [
                    [p.invoice.reference, p.invoice.student.full_name, str(p.paid_on), p.method, float(p.amount)]
                    for p in Payment.objects.filter(invoice__student__school=school)
                ],
            })

        if report == "outstanding-fees":
            return Response({
                "columns": ["Invoice", "Student", "Due", "Billed", "Balance", "Status"],
                "rows": [
                    [
                        invoice.reference, invoice.student.full_name, str(invoice.due_on),
                        float(invoice.amount), float(invoice.balance), invoice.status,
                    ]
                    for invoice in Invoice.objects.filter(student__school=school).exclude(status="paid")
                ],
            })

        return Response({"columns": [], "rows": []})


@api_view(["GET"])
@permission_classes([AllowAny])
def api_root(request):
    return Response(
        {"name": "PrimeSchool API", "version": "1.0", "modules": list(router_viewsets), "status": "ready"},
        status=status.HTTP_200_OK,
    )

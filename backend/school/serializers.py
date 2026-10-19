from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import *


class SchoolSerializer(serializers.ModelSerializer):
    logo = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = School
        fields = "__all__"

    def validate_logo(self, value):
        if not value:
            return ""
        if value.startswith("data:image/"):
            return value
        from django.core.validators import URLValidator

        URLValidator()(value)
        return value


class InstitutionSerializer(serializers.ModelSerializer):
    logo = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = Institution
        fields = "__all__"

    def validate_logo(self, value):
        if not value:
            return ""
        if value.startswith("data:image/"):
            return value
        from django.core.validators import URLValidator

        URLValidator()(value)
        return value


class EducationLevelSerializer(serializers.ModelSerializer):
    class Meta:
        model = EducationLevel
        fields = "__all__"


class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = "__all__"


class ProgrammeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Programme
        fields = "__all__"


class CampusSerializer(serializers.ModelSerializer):
    class Meta:
        model = Campus
        fields = "__all__"


class MembershipSerializer(serializers.ModelSerializer):
    class Meta:
        model = Membership
        fields = "__all__"


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = "__all__"


class AccountSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, style={"input_type": "password"})
    role = serializers.ChoiceField(
        choices=[(role, label) for role, label in UserProfile.ROLE_CHOICES if role in {"admin", "teacher", "accountant"}],
        default="teacher",
    )
    school = serializers.PrimaryKeyRelatedField(queryset=School.objects.all(), required=False, allow_null=True)
    phone = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = User
        fields = [
            "id", "username", "email", "first_name", "last_name",
            "password", "role", "school", "phone", "is_active", "date_joined",
        ]
        read_only_fields = ["date_joined"]

    def validate_password(self, value):
        try:
            validate_password(value)
        except DjangoValidationError as error:
            raise serializers.ValidationError(list(error.messages))
        return value

    def create(self, validated_data):
        role = validated_data.pop("role", "teacher")
        school = validated_data.pop("school", None)
        phone = validated_data.pop("phone", "")
        password = validated_data.pop("password", None)
        if not password:
            raise serializers.ValidationError({"password": ["A password is required."]})
        user = User(**validated_data)
        user.set_password(password)
        user.is_staff = role == "admin"
        user.save()
        profile, _ = UserProfile.objects.update_or_create(
            user=user, defaults={"role": role, "school": school, "phone": phone}
        )
        user.profile = profile  # replaces the profile cached by the post_save signal
        return user

    def update(self, instance, validated_data):
        role = validated_data.pop("role", None)
        school = validated_data.pop("school", None)
        phone = validated_data.pop("phone", None)
        password = validated_data.pop("password", None)
        for key, value in validated_data.items():
            setattr(instance, key, value)
        if password:
            instance.set_password(password)
        if role:
            instance.is_staff = role == "admin"
        instance.save()
        profile, _ = UserProfile.objects.get_or_create(user=instance)
        if role:
            profile.role = role
        if school is not None:
            profile.school = school
        if phone is not None:
            profile.phone = phone
        profile.save()
        instance.profile = profile
        return instance

    def to_representation(self, instance):
        data = super().to_representation(instance)
        profile = getattr(instance, "profile", None)
        data["role"] = profile.role if profile else ""
        data["phone"] = profile.phone if profile else ""
        data["school"] = profile.school_id if profile else None
        return data


class RegisterSerializer(serializers.ModelSerializer):
    """Administrator-only staff onboarding. Platform roles are never self-assignable."""

    STAFF_ROLES = ["teacher", "accountant"]

    password = serializers.CharField(write_only=True, style={"input_type": "password"})
    phone = serializers.CharField(required=False, allow_blank=True)
    role = serializers.ChoiceField(choices=STAFF_ROLES, default="teacher")

    class Meta:
        model = User
        fields = ["id", "username", "email", "first_name", "last_name", "password", "phone", "role"]

    def validate_username(self, value):
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError("That username is already taken.")
        return value

    def validate_password(self, value):
        try:
            validate_password(value)
        except DjangoValidationError as error:
            raise serializers.ValidationError(list(error.messages))
        return value

    def create(self, validated_data):
        phone = validated_data.pop("phone", "")
        password = validated_data.pop("password")
        role = validated_data.pop("role", "parent")
        user = User(**validated_data)
        user.set_password(password)
        user.is_staff = False
        user.is_superuser = False
        user.is_active = False
        user.save()
        profile, _ = UserProfile.objects.update_or_create(
            user=user,
            defaults={"role": role, "school": None, "phone": phone},
        )
        user.profile = profile
        return user


class MeSerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField()
    school = serializers.SerializerMethodField()
    school_name = serializers.SerializerMethodField()
    institution = serializers.SerializerMethodField()
    institutions = serializers.SerializerMethodField()
    full_name = serializers.SerializerMethodField()
    teacher_id = serializers.SerializerMethodField()
    parent_id = serializers.SerializerMethodField()
    student_id = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id", "username", "email", "full_name", "role", "school", "school_name",
            "institution", "institutions", "teacher_id", "parent_id", "student_id", "is_superuser",
        ]

    def get_role(self, obj):
        profile = getattr(obj, "profile", None)
        return profile.role if profile else ("admin" if obj.is_superuser else "")

    def get_school(self, obj):
        profile = getattr(obj, "profile", None)
        if profile and profile.school_id:
            return profile.school_id
        if profile and profile.role == "saasadmin":
            return None
        return None

    def get_school_name(self, obj):
        school_id = self.get_school(obj)
        if school_id is None:
            return ""
        school = School.objects.filter(id=school_id).first()
        return school.name if school else ""

    def get_institution(self, obj):
        membership = obj.memberships.order_by("institution__name").select_related("institution").first()
        return membership.institution_id if membership else None

    def get_institutions(self, obj):
        return list(obj.memberships.values_list("institution_id", flat=True).distinct())

    def get_full_name(self, obj):
        return obj.get_full_name() or obj.username

    def get_teacher_id(self, obj):
        teacher = Teacher.objects.filter(user=obj).first()
        return teacher.id if teacher else None

    def get_parent_id(self, obj):
        parent = Parent.objects.filter(user=obj).first()
        return parent.id if parent else None

    def get_student_id(self, obj):
        student = Student.objects.filter(user=obj).first()
        return student.id if student else None


class RoleTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        profile = getattr(user, "profile", None)
        token["role"] = profile.role if profile else ("saasadmin" if user.is_superuser else "")
        token["name"] = user.get_full_name() or user.username
        return token

    def validate(self, attrs):
        login = attrs.get(self.username_field, "")
        if login and "@" in str(login):
            match = User.objects.filter(email__iexact=str(login).strip()).first()
            if match:
                attrs[self.username_field] = match.username
        data = super().validate(attrs)
        data["user"] = MeSerializer(self.user).data
        return data


class AcademicYearSerializer(serializers.ModelSerializer):
    class Meta:
        model = AcademicYear
        fields = "__all__"


class TermSerializer(serializers.ModelSerializer):
    academic_year_name = serializers.CharField(source="academic_year.name", read_only=True)

    class Meta:
        model = Term
        fields = "__all__"


class SubjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subject
        fields = "__all__"


class TeacherSerializer(serializers.ModelSerializer):
    class Meta:
        model = Teacher
        fields = "__all__"


class ClassRoomSerializer(serializers.ModelSerializer):
    student_count = serializers.SerializerMethodField()
    subject_count = serializers.SerializerMethodField()
    class_teacher_name = serializers.CharField(source="class_teacher.full_name", read_only=True, default="")

    class Meta:
        model = ClassRoom
        fields = "__all__"

    def get_student_count(self, obj):
        return obj.enrollments.count()

    def get_subject_count(self, obj):
        return obj.assignments.values("subject").distinct().count()


class ParentSerializer(serializers.ModelSerializer):
    children = serializers.SerializerMethodField()

    class Meta:
        model = Parent
        fields = "__all__"

    def get_children(self, obj):
        return [{"id": s.id, "full_name": s.full_name, "admission_number": s.admission_number} for s in obj.students.all()]


class StudentSerializer(serializers.ModelSerializer):
    full_name = serializers.ReadOnlyField()
    parent_name = serializers.CharField(source="parent.full_name", read_only=True, default="")
    current_class = serializers.SerializerMethodField()
    current_class_id = serializers.SerializerMethodField()

    class Meta:
        model = Student
        fields = "__all__"

    def _latest_enrollment(self, obj):
        return obj.enrollments.select_related("classroom").order_by("-academic_year__starts_on").first()

    def get_current_class(self, obj):
        enrollment = self._latest_enrollment(obj)
        return enrollment.classroom.name if enrollment else ""

    def get_current_class_id(self, obj):
        enrollment = self._latest_enrollment(obj)
        return enrollment.classroom_id if enrollment else None


class EnrollmentSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source="student.full_name", read_only=True)
    classroom_name = serializers.CharField(source="classroom.name", read_only=True)
    academic_year_name = serializers.CharField(source="academic_year.name", read_only=True)

    class Meta:
        model = Enrollment
        fields = "__all__"


class TeacherSubjectAssignmentSerializer(serializers.ModelSerializer):
    teacher_name = serializers.CharField(source="teacher.full_name", read_only=True)
    subject_name = serializers.CharField(source="subject.name", read_only=True)
    classroom_name = serializers.CharField(source="classroom.name", read_only=True)

    class Meta:
        model = TeacherSubjectAssignment
        fields = "__all__"


class AttendanceSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source="student.full_name", read_only=True)
    classroom_name = serializers.CharField(source="classroom.name", read_only=True)
    subject_name = serializers.CharField(source="subject.name", read_only=True, default="")
    campus_name = serializers.CharField(source="campus.name", read_only=True, default="")

    class Meta:
        model = Attendance
        fields = "__all__"


class GradeBandSerializer(serializers.ModelSerializer):
    class Meta:
        model = GradeBand
        fields = "__all__"
        extra_kwargs = {"scale": {"required": False}}


class GradingScaleSerializer(serializers.ModelSerializer):
    bands = GradeBandSerializer(many=True, required=False)
    campus_name = serializers.CharField(source="campus.name", read_only=True, default="")
    school_name = serializers.CharField(source="school.name", read_only=True, default="")

    class Meta:
        model = GradingScale
        fields = "__all__"

    def create(self, validated_data):
        bands = validated_data.pop("bands", [])
        scale = GradingScale.objects.create(**validated_data)
        for band in bands:
            band.pop("scale", None)
            GradeBand.objects.create(scale=scale, **band)
        return scale

    def update(self, instance, validated_data):
        bands = validated_data.pop("bands", None)
        for key, value in validated_data.items():
            setattr(instance, key, value)
        instance.save()
        if bands is not None:
            instance.bands.all().delete()
            for band in bands:
                band.pop("scale", None)
                GradeBand.objects.create(scale=instance, **band)
        return instance


class ExamSerializer(serializers.ModelSerializer):
    term_name = serializers.CharField(source="term.name", read_only=True)
    academic_year_name = serializers.CharField(source="term.academic_year.name", read_only=True)
    campus_name = serializers.CharField(source="campus.name", read_only=True, default="")

    class Meta:
        model = Exam
        fields = "__all__"


class ExamSubjectSerializer(serializers.ModelSerializer):
    subject_name = serializers.CharField(source="subject.name", read_only=True)
    classroom_name = serializers.CharField(source="classroom.name", read_only=True)

    class Meta:
        model = ExamSubject
        fields = "__all__"


class ResultSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source="student.full_name", read_only=True)
    subject_name = serializers.CharField(source="subject.name", read_only=True)
    exam_name = serializers.CharField(source="exam.name", read_only=True)
    campus_name = serializers.CharField(source="campus.name", read_only=True, default="")
    score = serializers.DecimalField(max_digits=6, decimal_places=2, read_only=True)
    grade = serializers.CharField(read_only=True)

    class Meta:
        model = Result
        fields = "__all__"


class ReportCardSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source="student.full_name", read_only=True)
    academic_year_name = serializers.CharField(source="academic_year.name", read_only=True)
    term_name = serializers.CharField(source="term.name", read_only=True, default="")
    campus_name = serializers.CharField(source="campus.name", read_only=True, default="")
    grading_scale_name = serializers.CharField(source="grading_scale.name", read_only=True, default="")

    class Meta:
        model = ReportCard
        fields = "__all__"


class RoomSerializer(serializers.ModelSerializer):
    class Meta:
        model = Room
        fields = "__all__"


class TimetableEntrySerializer(serializers.ModelSerializer):
    classroom_name = serializers.CharField(source="classroom.name", read_only=True)
    subject_name = serializers.CharField(source="subject.name", read_only=True)
    teacher_name = serializers.CharField(source="teacher.full_name", read_only=True)
    room_name = serializers.SerializerMethodField()

    class Meta:
        model = TimetableEntry
        fields = "__all__"

    def get_room_name(self, obj):
        return obj.room_ref.name if obj.room_ref else obj.room


class FeeItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = FeeItem
        fields = "__all__"
        extra_kwargs = {"fee_structure": {"required": False}}


class FeeStructureSerializer(serializers.ModelSerializer):
    items = FeeItemSerializer(many=True, required=False)
    total = serializers.ReadOnlyField()
    classroom_name = serializers.CharField(source="classroom.name", read_only=True, default="")
    term_name = serializers.CharField(source="term.name", read_only=True, default="")

    class Meta:
        model = FeeStructure
        fields = "__all__"

    def _sync_items(self, structure, items):
        structure.items.all().delete()
        for item in items:
            item.pop("fee_structure", None)
            FeeItem.objects.create(fee_structure=structure, **item)
        structure.amount = structure.total
        structure.save(update_fields=["amount"])

    def create(self, validated_data):
        items = validated_data.pop("items", [])
        structure = FeeStructure.objects.create(**validated_data)
        if items:
            self._sync_items(structure, items)
        return structure

    def update(self, instance, validated_data):
        items = validated_data.pop("items", None)
        for key, value in validated_data.items():
            setattr(instance, key, value)
        instance.save()
        if items is not None:
            self._sync_items(instance, items)
        return instance


class InvoiceSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source="student.full_name", read_only=True)
    admission_number = serializers.CharField(source="student.admission_number", read_only=True)
    paid_total = serializers.ReadOnlyField()
    balance = serializers.ReadOnlyField()
    reference = serializers.CharField(required=False)

    class Meta:
        model = Invoice
        fields = "__all__"

    def create(self, validated_data):
        if not validated_data.get("reference"):
            validated_data["reference"] = f"INV-{Invoice.objects.count() + 1:05d}"
        return super().create(validated_data)


class ReceiptSerializer(serializers.ModelSerializer):
    class Meta:
        model = Receipt
        fields = "__all__"


class PaymentSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source="invoice.student.full_name", read_only=True)
    invoice_reference = serializers.CharField(source="invoice.reference", read_only=True)
    receipt_number = serializers.CharField(source="receipt.number", read_only=True, default="")

    class Meta:
        model = Payment
        fields = "__all__"


class AnnouncementSerializer(serializers.ModelSerializer):
    classroom_name = serializers.CharField(source="classroom.name", read_only=True, default="")
    author = serializers.CharField(source="created_by.username", read_only=True, default="")

    class Meta:
        model = Announcement
        fields = "__all__"


def serializer_for(model):
    return type(f"{model.__name__}Serializer", (serializers.ModelSerializer,), {
        "Meta": type("Meta", (), {"model": model, "fields": "__all__"})
    })

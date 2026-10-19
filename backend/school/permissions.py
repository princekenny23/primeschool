from rest_framework.permissions import SAFE_METHODS, BasePermission


def role_of(user):
    profile = getattr(user, "profile", None)
    if profile:
        return profile.role
    if user.is_authenticated and user.is_superuser:
        return "saasadmin"
    return None


class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and (
            request.user.is_superuser or role_of(request.user) in {"admin", "saasadmin"}
        )


class IsAdminOrReadOnly(BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if request.method in SAFE_METHODS:
            return role_of(request.user) in {"saasadmin", "admin", "teacher", "accountant"}
        return request.user.is_superuser or role_of(request.user) in {"admin", "saasadmin"}


class IsStaffRole(BasePermission):
    """Admins, teachers and accountants — everyone who works at the school."""

    def has_permission(self, request, view):
        return request.user.is_authenticated and role_of(request.user) in {"saasadmin", "admin", "teacher", "accountant"}


class IsAcademicEditor(BasePermission):
    """School staff can read; administrators and teachers can write academic data."""

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if request.method in SAFE_METHODS:
            return role_of(request.user) in {"saasadmin", "admin", "teacher", "accountant"}
        return request.user.is_superuser or role_of(request.user) in {"saasadmin", "admin", "teacher"}


class IsFinanceEditor(BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if request.method in SAFE_METHODS:
            return role_of(request.user) in {"saasadmin", "admin", "accountant"}
        return request.user.is_superuser or role_of(request.user) in {"saasadmin", "admin", "accountant"}

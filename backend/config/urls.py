from django.contrib import admin
from django.urls import include, path, re_path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from school.views import (
    DashboardSummaryView, InstitutionSetupView, MeView, OwnerSignupView, RegisterView, ReportView, RoleTokenObtainPairView, api_root, router_viewsets,
)


class OptionalSlashRouter(DefaultRouter):
    """Match both /api/schools and /api/schools/ without triggering APPEND_SLASH redirects."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.trailing_slash = "/?"


router = OptionalSlashRouter()
for name, viewset in router_viewsets.items():
    router.register(name, viewset, basename=name)

# Trailing slash is optional on these so a POST without one is handled instead of raising APPEND_SLASH.
urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", api_root),
    re_path(r"^api/auth/token/?$", RoleTokenObtainPairView.as_view(), name="token_obtain_pair"),
    re_path(r"^api/auth/token/refresh/?$", TokenRefreshView.as_view(), name="token_refresh"),
    re_path(r"^api/auth/me/?$", MeView.as_view(), name="me"),
    re_path(r"^api/auth/register/?$", RegisterView.as_view(), name="register"),
    re_path(r"^api/auth/owner-signup/?$", OwnerSignupView.as_view(), name="owner_signup"),
    re_path(r"^api/dashboard/summary/?$", DashboardSummaryView.as_view(), name="dashboard_summary"),
    re_path(r"^api/reports/?$", ReportView.as_view(), name="reports"),
    re_path(r"^api/setup/institution/?$", InstitutionSetupView.as_view(), name="institution_setup"),
    path("api/", include(router.urls)),
]

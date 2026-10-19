from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework import status

from school.models import Membership, School
from school.serializers import RegisterSerializer


class SchoolApiTests(TestCase):
    def test_registration_endpoint_requires_an_administrator(self):
        response = self.client.post(
            "/api/auth/register/",
            {"username": "attacker", "password": "StrongPass123!", "role": "saasadmin"},
            content_type="application/json",
        )

        self.assertIn(response.status_code, {status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN})
        self.assertFalse(User.objects.filter(username="attacker").exists())

    def test_parent_role_cannot_read_staff_student_api(self):
        parent = User.objects.create_user(username="parent_user", password="StrongPass123!")
        parent.profile.role = "parent"
        parent.profile.save(update_fields=["role"])
        token_response = self.client.post(
            "/api/auth/token/",
            {"username": "parent_user", "password": "StrongPass123!"},
            content_type="application/json",
        )
        self.assertEqual(token_response.status_code, status.HTTP_200_OK)

        response = self.client.get(
            "/api/students/",
            HTTP_AUTHORIZATION=f"Bearer {token_response.json()['access']}",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_school_api_accepts_no_trailing_slash_requests(self):
        admin = User.objects.create_superuser(username="saasadmin", email="saasadmin@example.com", password="StrongPass123!")

        token_response = self.client.post(
            "/api/auth/token/",
            {"username": "saasadmin", "password": "StrongPass123!"},
            content_type="application/json",
        )
        self.assertEqual(token_response.status_code, status.HTTP_200_OK)
        access = token_response.json()["access"]

        list_response = self.client.get("/api/schools?page_size=500", HTTP_AUTHORIZATION=f"Bearer {access}")
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)

        create_response = self.client.post(
            "/api/schools",
            {
                "name": "Northwind Academy",
                "code": "NWA",
                "email": "admin@northwind.example",
                "phone": "+1234567890",
                "address": "123 Learning Way",
                "logo": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAF",
            },
            content_type="application/json",
            HTTP_AUTHORIZATION=f"Bearer {access}",
        )

        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(create_response.json()["id"])

    def test_manage_school_creates_admin_who_can_log_in(self):
        platform_admin = User.objects.create_user(
            username="platform_owner",
            email="owner@example.com",
            password="T0ugh-Platform-842!",
        )
        platform_admin.profile.role = "saasadmin"
        platform_admin.profile.save(update_fields=["role"])
        school = School.objects.create(name="Manage Test School", code="MTS", owner=platform_admin)

        token_response = self.client.post(
            "/api/auth/token/",
            {"username": "platform_owner", "password": "T0ugh-Platform-842!"},
            content_type="application/json",
        )
        self.assertEqual(token_response.status_code, status.HTTP_200_OK)
        access = token_response.json()["access"]

        update_response = self.client.patch(
            f"/api/schools/{school.id}/manage",
            {
                "school": {"name": school.name, "code": school.code, "address": "10 Test Road"},
                "admin": {
                    "username": "manage_school_admin",
                    "email": "schooladmin@example.com",
                    "first_name": "School",
                    "last_name": "Admin",
                    "password": "T0ugh-School-Admin-843!",
                },
            },
            content_type="application/json",
            HTTP_AUTHORIZATION=f"Bearer {access}",
        )
        self.assertEqual(update_response.status_code, status.HTTP_200_OK, update_response.content)
        self.assertEqual(update_response.json()["admin"]["school"], school.id)

        login_response = self.client.post(
            "/api/auth/token/",
            {"username": "manage_school_admin", "password": "T0ugh-School-Admin-843!"},
            content_type="application/json",
        )
        self.assertEqual(login_response.status_code, status.HTTP_200_OK, login_response.content)
        self.assertEqual(login_response.json()["user"]["role"], "admin")
        self.assertEqual(login_response.json()["user"]["school"], school.id)


class SaaSBootstrapTests(TestCase):
    def test_staff_registration_requires_admin_workflow_and_is_inactive(self):
        serializer = RegisterSerializer(
            data={
                "username": "teacher_user",
                "email": "teacher@example.com",
                "first_name": "Platform",
                "last_name": "Teacher",
                "password": "StrongPass123!",
                "phone": "+123456789",
                "role": "teacher",
            }
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)
        user = serializer.save()

        self.assertEqual(user.profile.role, "teacher")
        self.assertFalse(user.is_superuser)
        self.assertFalse(user.is_staff)
        self.assertFalse(user.is_active)

    def test_registration_rejects_parent_and_platform_roles(self):
        for role in ("parent", "student", "saasadmin"):
            serializer = RegisterSerializer(data={
                "username": f"{role}_user",
                "email": f"{role}@example.com",
                "first_name": "Test",
                "last_name": "User",
                "password": "StrongPass123!",
                "role": role,
            })
            self.assertFalse(serializer.is_valid(), role)

    def test_institution_api_allows_platform_owner_to_create_institution(self):
        user = User.objects.create_superuser(username="platformadmin", email="admin@example.com", password="StrongPass123!")

        token_response = self.client.post(
            "/api/auth/token/",
            {"username": "platformadmin", "password": "StrongPass123!"},
            content_type="application/json",
        )
        self.assertEqual(token_response.status_code, status.HTTP_200_OK)
        access = token_response.json()["access"]

        create_response = self.client.post(
            "/api/institutions",
            {
                "name": "Kasungu Academy",
                "code": "KAS",
                "institution_type": "school",
                "email": "hello@kasungu.example",
                "country": "Malawi",
                "city": "Kasungu",
                "address": "1 Education Road",
                "logo": "https://example.com/logo.png",
            },
            content_type="application/json",
            HTTP_AUTHORIZATION=f"Bearer {access}",
        )

        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED, create_response.content)
        payload = create_response.json()
        self.assertEqual(payload["name"], "Kasungu Academy")
        self.assertTrue(Membership.objects.filter(user=user, institution_id=payload["id"]).exists())

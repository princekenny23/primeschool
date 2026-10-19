from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("school", "0006_phase3_assessment"),
    ]

    operations = [
        migrations.CreateModel(
            name="Department",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=120)),
                ("code", models.CharField(max_length=30)),
                ("description", models.TextField(blank=True)),
                ("is_active", models.BooleanField(default=True)),
                ("division", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="departments", to="school.educationlevel")),
                ("institution", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="departments", to="school.institution")),
            ],
            options={"ordering": ["name"], "unique_together": {("institution", "code")}},
        ),
        migrations.CreateModel(
            name="Programme",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=160)),
                ("code", models.CharField(max_length=40)),
                ("award", models.CharField(blank=True, max_length=120)),
                ("duration_years", models.PositiveSmallIntegerField(default=1)),
                ("is_active", models.BooleanField(default=True)),
                ("department", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="programmes", to="school.department")),
                ("division", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="programmes", to="school.educationlevel")),
                ("institution", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="programmes", to="school.institution")),
            ],
            options={"ordering": ["name"], "unique_together": {("institution", "code")}},
        ),
        migrations.AddField(
            model_name="academicyear",
            name="institution",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name="academic_years", to="school.institution"),
        ),
        migrations.AddField(
            model_name="classroom",
            name="division",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="classes", to="school.educationlevel"),
        ),
        migrations.AddField(
            model_name="classroom",
            name="programme",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="classes", to="school.programme"),
        ),
        migrations.AddField(
            model_name="subject",
            name="division",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="subjects", to="school.educationlevel"),
        ),
        migrations.AddField(
            model_name="subject",
            name="programme",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="subjects", to="school.programme"),
        ),
        migrations.AddField(
            model_name="subject",
            name="department_ref",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="subjects", to="school.department"),
        ),
    ]

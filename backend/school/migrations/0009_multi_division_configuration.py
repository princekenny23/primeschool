from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [("school", "0008_institution_school_link")]

    operations = [
        migrations.AddField(
            model_name="educationlevel",
            name="settings",
            field=models.JSONField(blank=True, default=dict),
        ),
        migrations.AddField(
            model_name="gradingscale",
            name="grading_type",
            field=models.CharField(default="percentage", max_length=40),
        ),
        migrations.RemoveField(model_name="department", name="division"),
        migrations.RemoveField(model_name="programme", name="division"),
        migrations.RemoveField(model_name="classroom", name="division"),
        migrations.RemoveField(model_name="subject", name="division"),
        migrations.AddField(
            model_name="department",
            name="divisions",
            field=models.ManyToManyField(blank=True, related_name="departments", to="school.educationlevel"),
        ),
        migrations.AddField(
            model_name="programme",
            name="divisions",
            field=models.ManyToManyField(blank=True, related_name="programmes", to="school.educationlevel"),
        ),
        migrations.AddField(
            model_name="classroom",
            name="divisions",
            field=models.ManyToManyField(blank=True, related_name="classes", to="school.educationlevel"),
        ),
        migrations.AddField(
            model_name="subject",
            name="divisions",
            field=models.ManyToManyField(blank=True, related_name="subjects", to="school.educationlevel"),
        ),
        migrations.AddField(
            model_name="gradingscale",
            name="divisions",
            field=models.ManyToManyField(blank=True, related_name="grading_scales", to="school.educationlevel"),
        ),
    ]

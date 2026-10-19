from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("school", "0007_institution_hierarchy"),
    ]

    operations = [
        migrations.AddField(
            model_name="institution",
            name="school",
            field=models.OneToOneField(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="institution_profile",
                to="school.school",
            ),
        ),
    ]

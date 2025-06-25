# Import necessary modules
from django.db import models
from qdjango.models import Project
from django.db.models import JSONField

class UserScript(models.Model):

    name = models.CharField(
        max_length=255,
        unique=True,
    )

    type = models.CharField(
        max_length=10, 
        choices=[('js', 'JS'), ('css', 'CSS'), ('xml', 'XML')],
        default='js'
    )

    run_at = models.CharField(
        max_length=20,
        choices=[
            ('head_start', 'head_start'),
            ('head_end', 'head_end'),
            ('body_start', 'body_start'),
            ('body_end', 'body_end'),
        ],
        default='body_end',
        help_text="Position where the script will be injected."
    )

    match = models.CharField(
        max_length=255,
        default=".*",
        help_text="Regex pattern to match URLs where the script will run."
    )

    code = models.TextField(
        default="",
        blank=True
    )

    description = models.TextField(
        default="",
        blank=True,
        help_text="Optional description of the userscript."
    )

    is_active = models.BooleanField(
        default=True
    )

    def __str__(self):
        return self.name

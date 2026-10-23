
from core.utils.slugify import slugify
from django_extensions.db.fields import AutoSlugField as AutoSlugFieldBase

class AutoSlugField(AutoSlugFieldBase):
    """A tiny wrapper around `django_extensions.db.fields.AutoSlugField` that sets a more advanced slugify function by default

    See https://github.com/django-extensions/django-extensions/blob/main/django_extensions/db/fields/__init__.py
    """

    def __init__(self, *args, **kwargs):
        kwargs.setdefault("slugify_function", slugify)
        super().__init__(*args, **kwargs)

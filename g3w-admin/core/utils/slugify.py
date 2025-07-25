from django.conf import settings
from django.utils.module_loading import import_string
from django.utils.text import slugify as original_django_slugify
from django.utils.encoding import smart_str

from slugify import slugify as python_slugify

def django_slugify(content):
    """A wrapper around the Django's slugify.

    This wrapper is added only to document the behavior of Django.

    Args:
        content: text to get slug from

    Returns:
        the slug

    Examples:
        django_slugify('This is a test ---') # 'this-is-a-test'
        django_slugify('影師嗎') # ''
        django_slugify('Computer-Компютър-111') # 'computer-111'
        django_slugify('jaja---lol-méméméoo--a') # 'jaja-lol-mememeoo-a'
        django_slugify('i love 🦄') # 'i-love'
    """
    return original_django_slugify(content)

def django_slugify_allow_unicode(content):
    """A wrapper around the Django's slugify with unicode allowed.

    Args:
        content: text to get slug from

    Returns:
        the slug

    Examples:
        django_slugify_allow_unicode('This is a test ---') # 'this-is-a-test'
        django_slugify_allow_unicode('影師嗎') # '影師嗎'
        django_slugify_allow_unicode('Computer-Компютър-111') # 'computer-компютър-111'
        django_slugify_allow_unicode('jaja---lol-méméméoo--a') # 'jaja-lol-méméméoo-a'
        django_slugify_allow_unicode('i love 🦄') # 'i-love'
    """
    return original_django_slugify(content, allow_unicode=True)


def pyslugify(content):
    """Slugify that transliterates unicode to ASCII.

    Args:
        content: text to get slug from

    Returns:
        the slug

    Examples:
        pyslugify('This is a test ---') # 'this-is-a-test'
        pyslugify('影師嗎') # 'ying-shi-ma'
        pyslugify('Computer-Компютър-111') # 'computer-kompiutr-111'
        pyslugify('jaja---lol-méméméoo--a') # 'jaja-lol-mememeoo-a'
        pyslugify('i love 🦄') # 'i-love'
    """
    return python_slugify(smart_str(content))


def slugify(content):
    """Slugify given text.

    The actual implementation depends on the `SLUGIFY_FUNCTION` configuration in `settings.py`.

    Args:
        content: text to get slug from

    Returns:
        the slug
    """
    func = import_string(getattr(settings, 'SLUGIFY_FUNCTION', 'core.utils.slugify.django_slugify'))

    return func(content)

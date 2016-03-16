from django.utils.html import format_html_join


def flatatt(attrs):
    """
    Convert a dictionary of attributes to a single string.
    The returned string will contain a leading space followed by key="value",
    XML-style pairs.  It is assumed that the keys do not need to be XML-escaped.
    If the passed dictionary is empty, then return an empty string.

    The result is passed through 'mark_safe'.
    """
    return format_html_join('', ' {0}="{1}"', sorted(attrs.items()))
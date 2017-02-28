from django import template

register = template.Library()


@register.filter
def isplusfieldcatasto(key):
    """
    Check if template data start with plusFieldsCatasto
    """
    return key.startswith('plusFieldsCatasto')
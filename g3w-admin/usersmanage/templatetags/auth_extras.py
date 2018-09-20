# from http://www.abidibo.net/blog/2014/05/22/check-if-user-belongs-group-django-templates/
from django import template
from django.contrib.auth.models import Group
from guardian.utils import get_user_model
from guardian.exceptions import NotUserNorGroup
from usersmanage.utils import get_perms_by_user_backend, get_user_groups, get_roles

register = template.Library()


@register.filter(name='has_group') 
def has_group(user, group_name): 
    group = Group.objects.get(name=group_name) 
    return True if group in user.groups.all() else False


class ObjectPermissionsNode(template.Node):

    def __init__(self, for_whom, obj, context_var):
        self.for_whom = template.Variable(for_whom)
        self.obj = template.Variable(obj)
        self.context_var = context_var

    def render(self, context):
        for_whom = self.for_whom.resolve(context)
        if isinstance(for_whom, get_user_model()):
            self.user = for_whom
        else:
            raise NotUserNorGroup("User or Group instance required (got %s)"
                                  % for_whom.__class__)

        obj = self.obj.resolve(context)

        perms = get_perms_by_user_backend(self.user, obj)

        context[self.context_var] = perms

        return ''


@register.tag
def get_user_perms_by_userbackend(parser, token):
    """
    Check editing permission for user by backend
    :param user:
    :return:
    """
    bits = token.split_contents()
    format = '{% get_user_perms_by_userbackend for obj as "context_var" %}'
    if len(bits) != 6 or bits[2] != 'for' or bits[4] != 'as':
        raise template.TemplateSyntaxError("get_user_perms_by_userbackend tag should be in "
                
                                           "format: %s" % format)
    for_whom = bits[1]
    obj = bits[3]
    context_var = bits[5]
    if context_var[0] != context_var[-1] or context_var[0] not in ('"', "'"):
        raise template.TemplateSyntaxError("get_obj_perms tag's context_var "
                                           "argument should be in quotes")
    context_var = context_var[1:-1]
    return ObjectPermissionsNode(for_whom, obj, context_var)


@register.simple_tag
def get_groups4user(user):
    """
    Get user groups
    :param user:
    :return:
    """
    return get_user_groups(user)


@register.simple_tag
def get_roles4user(user):
    """
    Get user main roles
    :param user:
    :return:
    """
    return get_roles(user)

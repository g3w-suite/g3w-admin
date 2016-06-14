from django.conf import settings
from guardian.shortcuts import get_users_with_perms, assign_perm, remove_perm
from crispy_forms.layout import Div, HTML, Field
from django.utils.translation import ugettext, ugettext_lazy as _


def getUserGroups(user):
    return user.groups.values_list('name', flat=True)


def get_fields_by_user(user, form, **kwargs):
    fields = [
        'editor_user',
        'viewer_users'
    ]
    if not user.is_superuser:
        del(form.fields['editor_user'])
        if 'editor_user' in fields:
            del(fields[fields.index('editor_user')])
    else:

        # if not required edit_user
        if 'editor_field_required' in kwargs and not kwargs['editor_field_required']:
            del (form.fields['editor_user'])
            if 'editor_user' in fields:
                del (fields[fields.index('editor_user')])

    toRet = []
    for field in fields:
        params = {'css_class': 'select2 col-md-12', 'multiple': 'multiple', 'style': 'width:100%;'} if field == 'viewer_users' else {}
        toRet.append(Field(field, **params))
    return toRet


def get_users_for_object(object, permission, group = None, with_anonymous = False):
    """
    Returns list of users(worn:not QuerySet) with specific permission for this object
    :param obejct: model object to check permission
    :param permission: permission string
    :param group: group name for filter
    :param with_anonimous: add anonimous user to return value if it has permission on object, if group is set
    """
    anyperm = get_users_with_perms(object, attach_perms=True)
    if not isinstance(permission, list):
        permission = [permission]
    result = []
    for user, perms in anyperm.iteritems():
        if set(permission).intersection(set(perms)):
            if group:
                if not isinstance(group, list):
                    group = [group]
                userGroups = user.groups.values_list('name', flat=True)
                if set(group).intersection(set(userGroups)):
                    result.append(user)
                if with_anonymous and user.is_anonymous():
                    result.append(user)
            else:
                result.append(user)
            if user.pk == settings.ANONYMOUS_USER_ID:
                result.append(user)
                
    return result


def get_users_with_perms_for_group(obj, attach_perms=False, with_superusers=False,
        with_group_users=True,permission=None,group=None):
    return get_users_with_perms(obj, attach_perms=attach_perms, with_superusers=with_superusers,with_group_users=with_group_users).filter(groups__name=group)


def setPermissionUserObject(user, object, permissions=[], mode='add'):
    """
    Assign or remove guardian permissions to user for object
    """

    if not isinstance(permissions, list):
        permissions = [permissions]

    for perm in permissions:
        if mode == 'add' and not user.has_perm(perm, object):
            assign_perm(perm, user, object)
        elif mode == 'remove' and user.has_perm(perm, object):
            remove_perm(perm, user, object)


def crispyBoxACL(form, **kwargs):
    """
    Build a Crispy object layout element (div) for on AdminLTE2 box structure.
    :param form: Django form instance
    :return: Crispy form layout object
    """

    bgColorCssClass = kwargs.get('bgColorCssClass', 'bg-purple')
    boxCssClass = kwargs.get('boxCssClass', 'col-md-6')
    userFields = get_fields_by_user(form.request.user, form, **kwargs)

    return Div(
                Div(
                    Div(
                        HTML("<h3 class='box-title'><i class='fa fa-user'></i> {}</h3>".format(_('ACL Users'))),
                        Div(
                            HTML("<button class='btn btn-box-tool' data-widget='collapse'><i class='fa fa-minus'></i></button>"),
                            css_class='box-tools',
                        ),
                        css_class='box-header with-border'
                    ),
                    Div(
                        *userFields,
                        css_class='box-body'
                    ),
                    css_class='box box-solid {} {}'.format(bgColorCssClass, form.checkEmptyInitialsData(*userFields))
                ),
                css_class='{}'.format(boxCssClass)
            )


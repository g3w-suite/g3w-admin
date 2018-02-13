from django.conf import settings
from django.contrib.auth.models import Permission, User
from django.contrib.contenttypes.models import ContentType
from guardian.shortcuts import get_users_with_perms, assign_perm, remove_perm
from guardian.models import UserObjectPermission
from guardian.compat import get_user_model
from crispy_forms.layout import Div, HTML, Field
from django.utils.translation import ugettext, ugettext_lazy as _
from django.contrib.sessions.models import Session
from django.utils import timezone
from .configs import USER_BACKEND_DEFAULT
from core.signals import pre_show_user_data

def get_all_logged_in_users():
    # Query all non-expired sessions
    # use timezone.now() instead of datetime.now() in latest versions of Django
    sessions = Session.objects.filter(expire_date__gte=timezone.now())
    uid_list = []

    # Build a list of user ids from that query
    for session in sessions:
        data = session.get_decoded()
        uid_list.append(data.get('_auth_user_id', None))

    # Query all logged in users based on id list
    return User.objects.filter(id__in=uid_list)


def getUserGroups(user):
    """
    Return un array of user's groups.
    """
    return user.groups.values_list('name', flat=True)


def userHasGroups(user, groupsToFind, strict=False):
    """
    check if Grouds to find are in user groups.
    """
    userGroups = getUserGroups(user)
    groupsIntersect = list(set.intersection(set(userGroups), set(groupsToFind)))

    if strict:
        return groupsIntersect == groupsIntersect
    else:
        return len(groupsIntersect) > 0


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

    anonymous_user = get_user_model().get_anonymous()

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
            if user.pk == anonymous_user.pk:
                if user not in result:
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


def get_objects_by_perm(obj, perm):
    """
    Get every object by perm
    """
    ctype = ContentType.objects.get_for_model(obj)
    Perm = Permission.objects.get(codename=perm, content_type=ctype)

    uobjects = UserObjectPermission.objects.filter(content_type=ctype, permission=Perm)

    return [uobject for uobject in uobjects]


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


def get_perms_by_user_backend(user, obj):
    """
    Get permission on user object, by backend value
    :param user:
    :param obj:
    :return:
    """
    perms = [
        'add_user',
        'change_user',
        'delete_user'
    ]
    if not obj.is_superuser and obj.userbackend.backend.lower() != USER_BACKEND_DEFAULT:
        raw_perms = pre_show_user_data.send(obj, user=user)
        other_perms = set()
        for receiver, perms in raw_perms:
            if perms:
                other_perms.update(set(perms))
        perms = list(other_perms)

    return perms
from django.conf import settings
from django.contrib.auth.models import Permission, User, Group as AuthGroup
from django.contrib.contenttypes.models import ContentType
from django.db.models import Q
from guardian.shortcuts import (
    get_users_with_perms,
    assign_perm,
    remove_perm,
    get_groups_with_perms,
    get_objects_for_user
)
from guardian.models import UserObjectPermission
from guardian.compat import get_user_model
from crispy_forms.layout import Div, HTML, Field
from django.utils.translation import gettext_lazy as _
from django.contrib.sessions.models import Session
from django.utils import timezone
from .configs import *
from core.signals import pre_show_user_data


def get_all_logged_in_users():
    """
    Return auth users queryset logged into G3W-SUITE
    :return: Users queryset
    """

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
    :param: user, django user object
    """
    return user.groups.values_list('name', flat=True)


def userHasGroups(user, groupsToFind, strict=False):
    """
    check if Groups to find are in user groups.
    """
    userGroups = getUserGroups(user)
    groupsIntersect = list(set.intersection(set(userGroups), set(groupsToFind)))

    if strict:
        return groupsIntersect == groupsToFind
    else:
        return len(groupsIntersect) > 0


def get_fields_by_user(user, form, **kwargs):
    """
    Filter form ACL fields by user main role
    """
    fields = [
        'editor_user',
        'editor2_user',
        'viewer_users',
        'editor_user_groups',
        'viewer_user_groups'
    ]

    if not user.is_superuser:

        # add fields to ACL box by user main role
        del(form.fields['editor_user'])
        if 'editor_user' in fields:
            del(fields[fields.index('editor_user')])

        if userHasGroups(user, [G3W_EDITOR1]):
            fields_to_remove = []

        elif userHasGroups(user, [G3W_EDITOR2]):
            fields_to_remove = ['editor2_user', 'editor_user_groups']

        else:
            fields_to_remove = ['editor2_user', 'viewer_users', 'editor_user_groups', 'viewer_user_groups']

        for field_to_remove in fields_to_remove:
            del (form.fields[field_to_remove])
            if field_to_remove in fields:
                del (fields[fields.index(field_to_remove)])
    else:

        # if not required edit_user editor level 1
        if 'editor_field_required' in kwargs and not kwargs['editor_field_required']:
            del (form.fields['editor_user'])
            if 'editor_user' in fields:
                del (fields[fields.index('editor_user')])

        # if not required edit2_user Editor level 2
        if 'editor2_field_required' in kwargs and not kwargs['editor2_field_required']:
            del (form.fields['editor2_user'])
            if 'editor2_user' in fields:
                del (fields[fields.index('editor2_user')])

        # if not required editor groups
        if 'editor_groups_field_required' in kwargs and not kwargs['editor_groups_field_required']:
            del (form.fields['editor_user_groups'])
            if 'editor_user_groups' in fields:
                del (fields[fields.index('editor_user_groups')])

    toRet = []
    for field in fields:
        params = {'css_class': 'select2 col-md-12', 'multiple': 'multiple', 'style': 'width:100%;'} \
            if field in ('viewer_users', 'editor_user_groups', 'viewer_user_groups') else {}
        toRet.append(Field(field, **params))

    # add propagate viewers checkbox if user ais a superuser or Editor level 1
    if 'propagate' in kwargs and kwargs['propagate'] and (user.is_superuser or userHasGroups(user, [G3W_EDITOR1])):
        toRet.append('propagate_viewers')

    return toRet


def get_users_for_object(object, permission, group=None, with_anonymous=False, with_group_users=False):
    """
    Returns list of users(worn:not QuerySet) with specific permission for this object
    :param object: model object to check permission
    :param permission: permission string
    :param group: group name for filter
    :param with_anonymous: add anonymous user to return value if it has permission on object, if group is set
    """

    anonymous_user = get_user_model().get_anonymous()

    anyperm = get_users_with_perms(object, attach_perms=True, with_group_users=with_group_users)
    if not isinstance(permission, list):
        permission = [permission]
    result = []
    for user, perms in anyperm.items():
        if set(permission).intersection(set(perms)):
            if group:
                if not isinstance(group, list):
                    group = [group]
                userGroups = user.groups.values_list('name', flat=True)
                if set(group).intersection(set(userGroups)):
                    result.append(user)
                if with_anonymous and user.is_anonymous:
                    result.append(user)
            else:
                result.append(user)
            if user.pk == anonymous_user.pk and with_anonymous:
                if user not in result:
                    result.append(user)

    return result


def get_groups_for_object(object, permission, grouprole=None):
    """
    Returns list of groups(worn:not QuerySet) with specific permission for this object
    :param object: model object to check permission
    :param permission: permission string
    :param grouprole: role of the group
    """

    anyperm = get_groups_with_perms(object, attach_perms=True)
    if not isinstance(permission, list):
        permission = [permission]
    result = []
    for group, perms in anyperm.items():
        if set(permission).intersection(set(perms)):
            if grouprole and hasattr(group, 'grouprole'):
                if group.grouprole.role == grouprole:
                    result.append(group)
            else:
                result.append(group)

    return result


def setPermissionUserObject(user, object, permissions=[], mode='add'):
    """
    Assign or remove guardian permissions to user for object

    :param user: Auth user or group model obj.
    :param object: Django model obj to apply or remove permissions.
    :param permissions: Default: '[]'. A List of permission to add/remove to object for user.
    :param mode: Default: 'add'. Mode work, 'add' or 'remove'.
    :return: None
    """

    if not isinstance(permissions, list):
        permissions = [permissions]

    for perm in permissions:
        if mode == 'add':
            assign_perm(perm, user, object)
        elif mode == 'remove':
            remove_perm(perm, user, object)


def get_objects_by_perm(obj, perm):
    """
    Get every guardian userpermissionobject by perm

    :param obj: Django model object to recover.
    :param perm: Permission to check
    :return: List of Guardian userobjectpermission model objects.
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
                css_class='{} acl-box'.format(boxCssClass)
            )


def get_perms_by_user_backend(user, obj):
    """
    Get permission on user object, by backend value
    :param user: G3W-SUITE current logged user
    :param obj: Auth model object to recover permission
    :return: Permission list
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


def get_user_groups(user):
    """
    return user groups for user instance
    :param user:
    :return:
    """
    return user.groups.filter(~Q(name__in=[G3W_EDITOR1, G3W_EDITOR2, G3W_VIEWER1, G3W_VIEWER2]))


def get_roles(user):
    """
    return user groups for user instance
    :param user:
    :return:
    """
    return user.groups.filter(name__in=[G3W_EDITOR1, G3W_EDITOR2, G3W_VIEWER1, G3W_VIEWER2])


def get_viewers_for_object(object, user, permissions, with_anonymous=True):
    """
    Return viewers user by permission on object and by current g3w-suite user
    :param object: object to check permission
    :param user: current g3w-suite user in session
    :param permissions: permission to check, permission must is without app name, i.e. core.view_group become view_group
    :param with_anonymous: if add anonymous user to viewers list
    :return: viewers object list
    """

    editor1_viewers = None
    if userHasGroups(user, [G3W_EDITOR1]):
        editor1_viewers = get_objects_for_user(user, 'auth.change_user', User) \
            .filter(groups__name__in=[G3W_VIEWER1, G3W_VIEWER2])
        if with_anonymous:
            editor1_viewers |= User.objects.filter(pk=get_user_model().get_anonymous().pk)
    viewers = get_users_for_object(object, permissions, [G3W_VIEWER1, G3W_VIEWER2],
                                   with_anonymous=with_anonymous)

    if editor1_viewers:
        viewers = list(set(editor1_viewers).intersection(set(viewers)))

    if user in viewers:
        viewers.remove(user)

    return viewers


def get_user_groups_for_object(object, user, permission, grouprole=None):
    """
    Return editors o viewers user groups for object by user
    :param object: object to check permission
    :param user: current g3w-suite user in session
    :param permissions: permission to check
    :param with_anonymous: if add anonymous user to viewers list
    :return: viewers boject list
    """

    editor1_user_groups = None
    if userHasGroups(user, [G3W_EDITOR1]):
        editor1_user_groups = get_objects_for_user(user, 'auth.change_group',
            AuthGroup).order_by('name').filter(grouprole__role=grouprole)

    user_groups = get_groups_for_object(object, permission, grouprole=grouprole)

    if editor1_user_groups:
        user_groups = list(set(editor1_user_groups).intersection(set(user_groups)))

    return user_groups

def check_unique_email(email, user=None) -> str:
    """
    Check if a User with same email is present in db: useful for Registration and CRUD User forms

    :param email: Email address to check.
    :return: True is email is not present for other users, False if a just a user has this email address
    """
    if email:
        u = User.objects.filter(email=email)

        if user:
            u = u.exclude(pk=user.pk)

        if len(u) > 0:
            return False

    return True



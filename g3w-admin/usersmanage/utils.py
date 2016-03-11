from django.conf import settings
from guardian.shortcuts import get_users_with_perms, get_users_with_perms
from crispy_forms.layout import Div,HTML
from django.utils.translation import ugettext, ugettext_lazy as _


#util functions for qdjango forms
def get_fields_by_user(user, form):
    fields = [
        'editor_user',
        'own_users'
    ]
    if not user.is_superuser:
        del(form.fields['editor_user'])
        if 'editor_user' in fields:
            del(fields[fields.index('editor_user')])
    return fields


def get_users_for_object(object, permission, group = None,with_anonymous = False):
    """
    Returns list of users(worn:not QuerySet) with specific permission for this object
    :param obejct: model object to check permission
    :param permission: permission string
    :param group: group name for filter
    :param with_anonimous: add anonimous user to return value if it has permission on object, if group is set
    """

    anyperm = get_users_with_perms(object, attach_perms=True)
    result = []
    for user, perms in anyperm.iteritems():
        if permission in perms: 
            if group:
                if group in user.groups.values_list('name', flat=True):
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



def crispyBoxACL(form, **kwargs):
    """
    Build a Crispy object layout element (div) for on AdminLTE2 box structure.
    :param form: Django form instance
    :return: Crispy form layout object
    """

    bgColorCssClass = kwargs.get('bgColorCssClass', 'bg-purple')
    boxCssClass = kwargs.get('boxCssClass', 'col-md-6')

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
                        *get_fields_by_user(form.request.user, form),
                        css_class='box-body'
                    ),
                    css_class='box box-solid {} {}'.format(bgColorCssClass, form.checkEmptyInitialsData(*get_fields_by_user(form.request.user, form)))
                ),
                css_class='{}'.format(boxCssClass)
            )


from usersmanage.utils import get_users_for_object, get_groups_for_object
from usersmanage.configs import *


class G3WACLViewMixin(object):
    '''
    Mixins for Class FormView for get user initial values for editors and viewers
    Use self property editor_permission and viewer_permission
    '''

    def get_form_kwargs(self):
        kwargs = super(G3WACLViewMixin, self).get_form_kwargs()
        kwargs['request'] = self.request

        # get editor users
        editor_user_pk = None
        editor_users = get_users_for_object(self.object, self.editor_permission, [G3W_EDITOR2, G3W_EDITOR1])
        if editor_users:
            editor_user_pk = editor_users[0].id
            if self.request.user.is_superuser:
                kwargs['initial']['editor_user'] = editor_users[0].id

        # get viewer users
        viewers = get_users_for_object(self.object, self.viewer_permission, [G3W_VIEWER1, G3W_VIEWER2],
                                       with_anonymous=True)

        # get only user id and check if user is group or project editor
        kwargs['initial']['viewer_users'] = [o.id for o in viewers if o.id != editor_user_pk]


        # get initial editor user_groups
        group_editors = get_groups_for_object(self.object, self.editor_permission)
        kwargs['initial']['editor_user_groups'] = [o.id for o in group_editors]

        return kwargs
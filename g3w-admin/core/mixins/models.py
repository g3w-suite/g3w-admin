
class G3WProjectMixins(object):

    def get_type(self):
        return self._meta.app_label


class G3WACLModelMixins(object):

    def addPermissionsToEditor(self, user):
        """
        Give guardian permissions to Editor
        """
        self._permissionsToEditor(user, 'add')

    def removePermissionsToEditor(self, user):
        """
        Remove guardian permissions to Editor
        """
        self._permissionsToEditor(user, 'remove')

    def addPermissionsToViewers(self, users_id):
        """
        Give guardian permissions to Viewers
        """
        self._permissionsToViewers(users_id, 'add')

    def removePermissionsToViewers(self, users_id):
        """
        Remove guardian permissions to Viewers
        """
        self._permissionsToViewers(users_id, 'remove')

    def add_permissions_to_editor_user_groups(self, groups_id):
        """
        Give guardian permissions to User Groups whit editor role
        """
        if hasattr(self, '_permissions_to_user_groups_editor'):
            self._permissions_to_user_groups_editor(groups_id, 'add')

    def add_permissions_to_viewer_user_groups(self, groups_id):
        """
        Give guardian permissions to User Groups whit viewer role
        """
        if hasattr(self, '_permissions_to_user_groups_viewer'):
            self._permissions_to_user_groups_viewer(groups_id, 'add')

    def remove_permissions_to_editor_user_groups(self, groups_id):
        """
        Give guardian permissions to User Groups whit editor role
        """
        if hasattr(self, '_permissions_to_user_groups_editor'):
            self._permissions_to_user_groups_editor(groups_id, 'remove')

    def remove_permissions_to_viewer_user_groups(self, groups_id):
        """
        Give guardian permissions to User Groups whit viewer role
        """
        if hasattr(self, '_permissions_to_user_groups_viewer'):
            self._permissions_to_user_groups_viewer(groups_id, 'remove')

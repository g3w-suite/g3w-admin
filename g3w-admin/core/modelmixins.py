


class DataUserMixin(object):

    def getEditorUser(self,flat=False):
        perm = 'change_%s'%(self.__class__.__name__.lower(),)
        editor_user = get_users_for_object(self, perm, 'Editor Maps Groups')
        if editor_user:
            editor = editor_user[0]
            if flat:
                return '<a href="'+reverse('user-update', kwargs={'pk': editor.pk})+'">'+editor.first_name+' '+editor.last_name+' ('+editor.username+')</a>'
            return editor
        else:
            if flat:
                return ''
            return None

    def getViewerUsers(self,flat=False):
        user = get_current_request().user
        perm = 'view_%s'%(self.__class__.__name__.lower(),)
        viewers = get_users_for_object(self,perm,'Viewer Maps Groups',with_anonymous = True)
        def compileViwerString(viewer):
            pre = post = ''
            if user.has_perm('change_user',viewer):
                pre = '<a href="%s">' %(reverse('user-update', kwargs={'pk': viewer.pk}),)
                post = '</a>'
            return pre + viewer.first_name+' '+viewer.last_name+' ('+viewer.username+')'+post
        if flat:
            return [compileViwerString(s) for s in viewers]
        else:
            return viewers

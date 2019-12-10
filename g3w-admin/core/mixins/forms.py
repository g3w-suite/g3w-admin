from django.forms import ModelForm
from crispy_forms.layout import Field


class G3WRequestFormMixin(object):
    """ Form Mixin to get Request object from instance """

    def __init__(self, *args, **kwargs):

        #get request object from kwargs
        if 'request' in kwargs:
            self.request = kwargs['request']
            del(kwargs['request'])

        #for not model form:
        if not isinstance(self, ModelForm):
            if 'instance' in kwargs:
                del(kwargs['instance'])
        super(G3WRequestFormMixin, self).__init__(*args, **kwargs)


class G3WGroupFormMixin(object):
    """ Form Mixin to get Group object from instance """

    def __init__(self, *args, **kwargs):

        #get request object from kwargs
        if 'group' in kwargs:
            self.group = kwargs['group']
            del(kwargs['group'])

        super(G3WGroupFormMixin, self).__init__(*args, **kwargs)


class G3WProjectFormMixin(object):
    """ Form Mixin to get Project object from instance """

    def __init__(self, *args, **kwargs):
        # get request object from kwargs
        if 'project' in kwargs:
            self.project = kwargs['project']
            del (kwargs['project'])

        super(G3WProjectFormMixin, self).__init__(*args, **kwargs)


class G3WGroupBaseLayerFormMixin(object):
    """ Form Mixin to set queryset and initial value for baselayer field project model  """

    def __init__(self, *args, **kwargs):
        super(G3WGroupBaseLayerFormMixin, self).__init__(*args, **kwargs)

        # set baselayer queryset
        groupBaseLayers = self.group.baselayers.all()
        self.fields['baselayer'].queryset = groupBaseLayers
        if groupBaseLayers.count() > 0:
            self.fields['baselayer'].initial = groupBaseLayers[0].pk


class G3WFormMixin(object):
    """ Form mixin for crispy form layout element """

    def checkEmptyInitialsData(self, *fields):

        if not hasattr(self, 'initial') or len(list(self.initial.items())) == 0:
            return 'collapsed-box'
        collapsed = True

        for field in fields:
            f = field.fields[0] if isinstance(field, Field) else field
            if f in self.initial and bool(self.initial[f]):
                collapsed = False

        return 'collapsed-box' if collapsed else ''

    def checkFieldsVisible(self, *fields):

        visible = True

        if len(set(fields).intersection(set(self.fields))) > 0:
            visible = False

        return 'hidden' if visible else ''
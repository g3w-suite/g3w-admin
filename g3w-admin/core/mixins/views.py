from django.conf import settings
from django.http import JsonResponse, HttpResponseServerError
from django.core.files import File
from django.core.files.storage import default_storage
from django.apps import apps
from django.shortcuts import get_object_or_404
from core.models import Group
from core.utils import file_path_mime
from core.utils.request import is_ajax
import os


class G3WRequestViewMixin(object):
    '''
    Mixins for Class FormView for get request object for get
    '''

    def dispatch(self, request, *args, **kwargs):

        # set in session
        if request.META.get('HTTP_REFERER',None) and request.method == 'GET':
            request.session['http_referer'] = request.META['HTTP_REFERER']
        return super(G3WRequestViewMixin, self).dispatch(request, *args, **kwargs)

    def get_form_kwargs(self):
        kwargs = super(G3WRequestViewMixin, self).get_form_kwargs()

        #get request object from view
        kwargs['request'] = self.request
        return kwargs


class G3WGroupViewMixin(object):
    '''
    Mixins for Class FormView for get group slug object for get
    '''

    def get_form_kwargs(self):
        kwargs = super(G3WGroupViewMixin,self).get_form_kwargs()

        #get request object from view
        kwargs['group'] = self.group
        return kwargs

    def get_context_data(self, **kwargs):
        """Add current group to context."""

        context = super(G3WGroupViewMixin, self).get_context_data(**kwargs)
        context['group'] = self.group
        return context

    def dispatch(self, request, *args, **kwargs):
        """Populate group attribute."""

        self.group = get_object_or_404(Group, slug=self.kwargs['group_slug'])
        return super(G3WGroupViewMixin, self).dispatch(request, *args, **kwargs)


class G3WProjectViewMixin(object):
    """
    Mixins for Class View for get group slug and r object for get
    """

    projectModel = None

    def dispatch(self, request, *args, **kwargs):
        """Populate group attribute."""

        if not self.projectModel:
            self.app_name = kwargs['project_type']
            self.projectModel = apps.get_app_config(self.app_name).get_model('project')

        self.project_slug = kwargs.get('project_slug')
        self.project = get_object_or_404(self.projectModel, slug=self.project_slug)
        return super(G3WProjectViewMixin, self).dispatch(request, *args, **kwargs)

    def get_form_kwargs(self):
        kwargs = super(G3WProjectViewMixin, self).get_form_kwargs()

        kwargs['project'] = self.project

        return kwargs

    def get_context_data(self, **kwargs):
        """Add current project to context."""

        context = super(G3WProjectViewMixin, self).get_context_data(**kwargs)
        context['project'] = self.project
        return context


class G3WAjaxDeleteViewMixin(object):
    '''
    Mixin for FormClass view for to delete object by ajax call
    '''

    def post(self, request, *args, **kwargs):

        if not hasattr(self, 'object'):
            self.object = self.get_object()

        # delete object
        self.object.delete();

        return JsonResponse({'status': 'ok', 'message': 'Object deleted!'})


class AjaxableFormResponseMixin(object):
    """
    Mixin to add AJAX support to a form.
    Must be used with an object-based FormView (e.g. CreateView)
    https://docs.djangoproject.com/en/1.9/topics/class-based-views/generic-editing/
    """
    def form_invalid(self, form):
        response = super(AjaxableFormResponseMixin, self).form_invalid(form)
        if is_ajax(self.request):
            return JsonResponse({'status':'error', 'errors_form': form.errors})
        else:
            return response

    def form_valid(self, form):
        # We make sure to call the parent's form_valid() method because
        # it might do some processing (in the case of CreateView, it will
        # call form.save() for example).
        response = super(AjaxableFormResponseMixin, self).form_valid(form)
        if is_ajax(self.request):
            return JsonResponse({'status': 'ok', 'message': 'Object saved!'})
        else:
            return response


class G3WAjaxSetOrderViewMixin(object):
    """
    To set order of ordered model
    """

    def post(self, *args, **kwargs):
        # get new order save value for group
        new_order = self.request.POST.getlist('new_order[]')
        for oindex, gid in enumerate(new_order):
            self.model.objects.get(pk=gid.split('_')[1]).to(oindex + 1)

        return JsonResponse({'Saved': 'ok'})


class G3WUploadFileViewMixin(object):
    """
    Mixin for general upload fle into g3wsuite, by users
    """

    sub_dir_upload = ''

    def post(self, request, *args, **kwargs):

        if not request.FILES:
            return HttpResponseServerError('No FILES are uploaded!')

        to_ret = {}

        # get files
        for file_field, file in list(request.FILES.items()):
            to_ret[file_field] = self.handle_file(file)

        return JsonResponse(to_ret)

    def handle_file(self, f):

        # make a dir by user_id
        media_dir = settings.MEDIA_ROOT
        if self.sub_dir_upload:
            sub_path_to_save = 'temp_uploads/{}/{}'.format(self.sub_dir_upload, str(self.request.user.pk))
        else:
            sub_path_to_save = 'temp_uploads/{}'.format(str(self.request.user.pk))

        # add user id directory

        path_to_save = '{}{}/'.format(settings.MEDIA_ROOT, sub_path_to_save);

        if not os.path.isdir(path_to_save):
            os.makedirs(path_to_save)

        File(f)
        path = default_storage.save('{}/{}'.format(sub_path_to_save, f.name), f)

        return {
            'value': '{}{}'.format(settings.MEDIA_URL, path),
            'mime_type': file_path_mime('{}/{}'.format(path_to_save, f.name))
        }
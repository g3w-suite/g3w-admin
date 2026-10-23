from django.conf import settings
from django.views.generic import TemplateView, View
from django.views.decorators.csrf import csrf_exempt
from django.http.response import JsonResponse, HttpResponse
from django.utils.decorators import method_decorator
from usersmanage.decorators import user_passes_test_or_403
from usersmanage.utils import userHasGroups, G3W_EDITOR1
from .filemanager import FileManager
import json
import os


class FilemanagerView(TemplateView):
    """Main templateview for fielmanager"""
    template_name = 'filemanager/filemanager.html'

    @method_decorator(user_passes_test_or_403(lambda u: u.is_superuser or userHasGroups(u, [G3W_EDITOR1])))
    def dispatch(self, *args, **kwargs):
        return super(FilemanagerView, self).dispatch(*args, **kwargs)

    def get_context_data(self, **kwargs):
        cdata = super(FilemanagerView, self).get_context_data(**kwargs)

        # add title
        cdata['page_title'] = getattr(settings, 'G3WSUITE_CUSTOM_TITLE', 'G3W-SUITE FileManager')

        return cdata


class FilemanagerServeConfigView(View):
    """ Filemanager main config view
        Return main RichFileManager json config settings.
    """
    @method_decorator(user_passes_test_or_403(lambda u: u.is_superuser or userHasGroups(u, [G3W_EDITOR1])))
    def dispatch(self, *args, **kwargs):
        return super(FilemanagerServeConfigView, self).dispatch(*args, **kwargs)

    def get(self, request, *args, **kwargs):

        path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static/RichFilemanager/config/')
        file = open('{}{}'.format(path, kwargs['file_js']), 'r')
        config = json.load(file)
        file.close()

        # get current language
        config['language']['default'] = request.LANGUAGE_CODE

        # set upload property
        if hasattr(settings, 'FILEMANAGER_MAX_UPLOAD_N_FILES'):
            config['upload']['maxNumberOfFiles'] = settings.FILEMANAGER_MAX_UPLOAD_N_FILES

        # set site_prefix_url if is set
        site_prefix_url = getattr(settings, 'SITE_PREFIX_URL', None)
        if site_prefix_url:
            config['api']['connectorUrl'] = '/{}filemanager/api/files/'.format(site_prefix_url)
        else:
            config['api']['connectorUrl'] = '/filemanager/api/files/'

        return JsonResponse(config)


@csrf_exempt
@user_passes_test_or_403(lambda u: u.is_superuser or userHasGroups(u, [G3W_EDITOR1]))
def files_view(request):
    """File Manager API endpoint"""

    try:
        if settings.FILEMANAGER_ROOT_PATH.endswith('/'):
            root_folder = settings.FILEMANAGER_ROOT_PATH[:-1]
        else:
            root_folder = settings.FILEMANAGER_ROOT_PATH
    except:
        if settings.DATASOURCE_PATH.endswith('/'):
            root_folder = settings.DATASOURCE_PATH[:-1]
        else:
            root_folder = settings.DATASOURCE_PATH

    # Append user.username to the root_folder if user is an Editor level 1
    if userHasGroups(request.user, [G3W_EDITOR1]):
        root_folder = os.path.join(root_folder, request.user.username)

    fileManager = FileManager(request, root_folder=root_folder)

    mode = None
    if request.method == 'POST':
        if 'mode' in request.POST:
            mode = request.POST.get('mode')
    else:
        if 'mode' in request.GET:
            mode = request.GET.get('mode')
    return getattr(fileManager, mode, 'error')()


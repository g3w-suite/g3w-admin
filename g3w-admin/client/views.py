from django.utils.translation import get_language
from django.views.generic import TemplateView
from django.template import loader
from django.shortcuts import get_object_or_404
from django.http import Http404, HttpResponseForbidden, HttpResponse
from django.conf import settings
from django.urls import reverse
from django.contrib.auth.views import redirect_to_login
from django.apps import apps
from django.core.exceptions import PermissionDenied
from django.shortcuts import resolve_url
from rest_framework.renderers import JSONRenderer
from base.version import get_version
from core.api.serializers import GroupSerializer, Group
from core.api.views import USERMEDIAHANDLER_CLASSES
from core.models import GeneralSuiteData, ProjectMapUrlAlias
from core.utils.general import get_adminlte_skin_by_user
from usersmanage.utils import get_users_for_object, get_user_model
from usersmanage.configs import *
from copy import deepcopy
import json
import secrets

import logging

logger = logging.getLogger('g3wadmin.debug')


def client_map_alias_view(request, map_name_alias, *args, **kwargs):
    """
    Proxy view for map view with alias url.
    :param request: Django request object.
    :param map_name_alias: Alias name by url.
    :return: ClientView instance or a Http404 instance.
    """

    # try to find alias url
    try:
        pma = ProjectMapUrlAlias.objects.get(alias=map_name_alias)
        kwargs.update({'project_type': pma.app_name, 'project_id': pma.project_id, 'group_slug': 'for_alias'})
        return ClientView.as_view()(request, *args, **kwargs)
    except:
        raise Http404('Map not found')


class ClientView(TemplateView):
    """
    Main Map client view.
    """

    template_name = "{}/index.html".format(settings.CLIENT_DEFAULT)
    project = None

    def dispatch(self, request, *args, **kwargs):

        # check permissions
        project_app = apps.get_app_config(kwargs['project_type'])
        Project = project_app.get_model('project')

        # get project model object
        try:
            self.project = Project.objects.get(pk=kwargs['project_id']) if 'project_id' in kwargs else \
                Project.objects.get(slug=kwargs['project_slug'])
        except Project.DoesNotExist:
            raise Http404('Map not found')

        # Check for is_active
        if not self.project.is_active:
            raise PermissionDenied()

        grant_users = get_users_for_object(self.project, "view_project", with_group_users=True)

        anonymous_user = get_user_model().get_anonymous()

        if request.user not in grant_users and anonymous_user not in grant_users and not request.user.is_superuser:

            # redirect to login if Anonymous user
            if request.user.is_anonymous:
                return redirect_to_login(request.get_full_path(), settings.LOGIN_URL, 'next')
            else:
                raise PermissionDenied()

        # Set in session permalink_code if exists
        if 'permalink_code' in request.GET and request.GET['permalink_code']:
            request.session['permalink_code'] = request.GET.get('permalink_code')


        return super(ClientView, self).dispatch(request, *args, **kwargs)

    def get_context_data(self, **kwargs):
        contextData = super(ClientView, self).get_context_data(**kwargs)

        # group serializer
        try:
            group = self.project.group
        except:
            group = get_object_or_404(Group, slug=kwargs['group_slug'])

        groupSerializer = GroupSerializer(
            group,
            projectId=str(self.project.pk),
            projectType=kwargs['project_type'],
            request=self.request
        )

        # choose client by querystring paramenters
        contextData['client_default'] = self.get_client_name()

        # login_url
        login_url = None
        try:
            login_url = resolve_url(settings.LOGIN_URL) + '?next={}'.format(reverse('group-project-map', kwargs={
                'group_slug': kwargs['group_slug'],
                'project_type': kwargs['project_type'],
                'project_id': self.project.pk
            }))
        except:
            pass

        # logout_url
        logout_url = None
        try:
            logout_url = reverse('logout') + '?next={}'.format(reverse('group-project-map', kwargs={
                'group_slug': kwargs['group_slug'],
                'project_type': kwargs['project_type'],
                'project_id': self.project.pk
            }))
        except:
            pass

        # user data
        u = self.request.user

        baseurl = "{}/{}".format(getattr(settings, 'SITE_DOMAIN', ''), getattr(settings, 'SITE_PREFIX_URL') or '')
        baseurl = self.request.build_absolute_uri(baseurl) if baseurl.startswith('/') else baseurl

        # add baseUrl property
        contextData['group_config'] = 'var initConfig = ' + JSONRenderer().render({
            "i18n": settings.LANGUAGES,
            "staticurl": settings.STATIC_URL,
            "client": "{}/".format(settings.CLIENT_DEFAULT),
            "mediaurl": settings.MEDIA_URL,
            "user": {
                'i18n': get_language(),
                'login_url': login_url,
                # logged user
                **({
                    'id': u.pk,
                    'username': u.username,
                    'first_name': u.first_name,
                    'last_name': u.last_name,
                    'is_superuser': u.is_superuser,
                    'is_staff': u.is_staff,
                    'groups': [g.name for g in u.groups.all()],
                    'logout_url': logout_url
                } if not u.is_anonymous else {}),
                # admin user
                **({
                    'admin_url': reverse('home')
                } if (u in get_users_for_object(self.project, "change_project", with_group_users=True) or u.is_superuser) and reverse('home') else {})
            },
            "baseurl": baseurl,
            "vectorurl": settings.VECTOR_URL,
            "proxyurl": reverse('interface-proxy'),
            "rasterurl": settings.RASTER_URL,
            "interfaceowsurl": reverse('interface-ows'),
            "main_map_title": getattr(GeneralSuiteData.objects.get(), 'main_map_title', None),
            "g3wsuite_logo_img": settings.CLIENT_G3WSUITE_LOGO,
            "credits": reverse('client-credits'),
            "version": get_version(),
            "frontendurl": baseurl if settings.FRONTEND else '',
            # project data
            **deepcopy(groupSerializer.data)
        }).decode('UTF-8') + ';'

        # project by type(app)
        if not '{}-{}'.format(kwargs['project_type'], self.project.pk) in list(groupSerializer.projects.keys()):
            raise Http404('No project type and/or project id present in group')

        # page title
        contextData['page_title'] = '{} | {}'.format(
            getattr(settings, 'G3WSUITE_CUSTOM_TITLE', 'g3w - client'),
            self.project.title_ur if self.project.title_ur else self.project.title
        )

        # server side styles (inline css)
        contextData['CLIENT_CUSTOM_CSS'] = ''

        # Conditionally show sidebar items
        elements_to_hide = []

        if not getattr(self.project, 'show_metadata_section', True):
            elements_to_hide.append('#metadata')

        if elements_to_hide:
            contextData['CLIENT_CUSTOM_CSS'] += f".sidebar-menu > li:is({', '.join(elements_to_hide)}) {{ display: none; }}"

        # choosen skin by user main role
        contextData['skin_class'] = get_adminlte_skin_by_user(self.request.user)

        # Sidebar collapse setting
        contextData['sidebar_collapse'] = self.project.sidebar_collapse if hasattr(self.project, 'sidebar_collapse') else False
        
        return contextData  
        
    def get_template_names(self):
        return '{}/index.html'.format(self.get_client_name())
        
    def get_client_name(self):
        if 'client' in self.request.GET and self.request.GET['client'] in settings.CLIENTS_AVAILABLE:
            client = self.request.GET['client']
            try:
                loader.get_template('{}/index.html'.format(client))
                return client
            except:
                return settings.CLIENT_DEFAULT
        return settings.CLIENT_DEFAULT

    def render_to_response(self, context, **response_kwargs):

        # Add G3W_CLIENT_COOKIE_SESSION_TOKEN cookie to response
        response = super().render_to_response(context)

        # Only with https set samesite='None' for cross-site requests, i.e. for cross-site iframe
        kwargs = {'samesite': 'None', 'secure': True} if self.request.is_secure() else {'samesite': 'Strict'}
        response.set_cookie(settings.G3W_CLIENT_COOKIE_SESSION_TOKEN, secrets.token_hex(16), **kwargs)

        return response


def user_media_view(request, project_type, layer_id, file_name, *args, **kwargs):
    """
    View to return media checking user project permissions
    :param request: Django request object.
    :param project_type: G3W-USITE map project, default 'qdjango'.
    :param layer_id: Django model Layer pk value.
    :param file_name: File name to render.
    :return: HttpRensponse or a HttpResponseForbidden instance.
    """

    # get model by project_type
    Layer = apps.get_app_config(project_type).get_model('layer')
    layer = Layer.objects.get(pk=layer_id)


    # check permission
    return USERMEDIAHANDLER_CLASSES[project_type](layer=layer, file_name=file_name).send_file()


def credits(request, * args, **kwargs):
    """
    Return custom credits from core GeneralSuiteData model object.
    :param request: Django request object instance.
    :return: HttpResponse instance.
    """

    return HttpResponse(GeneralSuiteData.objects.get().credits)
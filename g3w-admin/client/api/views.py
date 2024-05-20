from rest_framework.views import APIView
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.conf import settings
from django.urls import reverse
from django.utils.translation import get_language
from guardian.utils import get_anonymous_user
from core.api.serializers import GroupSerializer, Group, update_serializer_data
from core.api.permissions import ProjectPermission, GroupIsActivePermission
from core.signals import perform_client_search, post_serialize_project
from core.models import GeneralSuiteData
from qdjango.api.projects.permissions import ProjectIsActivePermission
from usersmanage.utils import (
    get_roles,
    G3W_VIEWER1,
    G3W_VIEWER2,
    G3W_EDITOR2,
    G3W_EDITOR1,
)

from core.utils.decorators import cache_page
from django.utils.decorators import method_decorator


class ClientConfigApiView(APIView):
    """
    APIView to get data Project and layers
    """

    permission_classes = (
        ProjectPermission,
        ProjectIsActivePermission
    )

    @method_decorator(cache_page(
        None,
        ('group_slug', 'project_type', 'project_id'),
        key_prefix=settings.QDJANGO_PRJ_CACHE_KEY
    ))
    def get(
        self, request, format=None, group_slug=None, project_type=None, project_id=None
    ):

        # get serializer
        projectAppModule = __import__(
            "{}.api.projects.serializers".format(project_type)
        )
        projectSerializer = projectAppModule.api.projects.serializers.ProjectSerializer

        project = projectAppModule.models.Project.objects.get(pk=project_id)

        ps = projectSerializer(project, request=request)

        # add wms_url to project metadata if user anonimous has grant view on project
        if (
            get_anonymous_user().has_perm(
                "{}.view_project".format(project_type), project
            )
            and "metadata" in ps.data
            and (
                ps.data["metadata"].get("onlineresource", False)
                or ps.data["metadata"]
                .get("onlineresource", "")
                .startswith(settings.QDJANGO_SERVER_URL)
            )
        ):
            ps.data["metadata"]["wms_url"] = "{}://{}/ows/{}/{}/{}/".format(
                request._request.META["wsgi.url_scheme"],
                request._request.META["HTTP_HOST"],
                project.group.slug,
                project_type,
                project_id,
            )
        elif "onlineresource" in ps.data["metadata"] and not ps.data["metadata"][
            "onlineresource"
        ].startswith(settings.QDJANGO_SERVER_URL):
            ps.data["metadata"]["wms_url"] = ps.data["metadata"]["onlineresource"]

        if "onlineresource" in ps.data["metadata"]:
            del ps.data["metadata"]["onlineresource"]

        # signal after serialization project
        ps_data = ps.data
        for signal_receiver, data in post_serialize_project.send(
            ps, app_name=project_type, request=self.request
        ):
            if data:
                update_serializer_data(ps_data, data)

        return Response(ps_data)


class GroupConfigApiView(APIView):
    """
    APIView to get data Project and layers, used by client into development status.
    """

    permission_classes = (
        GroupIsActivePermission,
        ProjectPermission,
    )

    def get(
        self, request, format=None, group_slug=None, project_type=None, project_id=None
    ):
        group = get_object_or_404(Group, slug=group_slug)
        groupSerializer = GroupSerializer(
            group, projectId=project_id, projectType=project_type, request=self.request
        )

        baseurl = "/{}".format(getattr(settings, 'SITE_PREFIX_URL') or '');
        baseurl = self.request.build_absolute_uri(baseurl) if baseurl.startswith('/') else baseurl

        generaldata = GeneralSuiteData.objects.get()

        # change groupData name with title for i18n app
        groupSerializer.data["name"] = group.title

        initconfig = {
            "staticurl": settings.STATIC_URL,
            "client": "client/",
            "mediaurl": settings.MEDIA_URL,
            "baseurl": baseurl,
            "vectorurl": settings.VECTOR_URL,
            "rasterurl": settings.RASTER_URL,
            "proxyurl": reverse("interface-proxy"),
            "interfaceowsurl": reverse("interface-ows"),
            "g3wsuite_logo_img": settings.CLIENT_G3WSUITE_LOGO,
            "credits": reverse("client-credits"),
            "main_map_title": generaldata.main_map_title,
            "i18n": settings.LANGUAGES,
            **groupSerializer.data,
        }

        # add frontendurl if frontend is set
        if settings.FRONTEND:
            initconfig.update({"frontendurl": baseurl})

        u = request.user

        next_redirect = "?next={}".format(
            reverse(
                "group-project-map",
                kwargs={
                    "group_slug": group_slug,
                    "project_type": project_type,
                    "project_id": project_id,
                },
            )
        )

        # login_url
        login_url = reverse("login") + next_redirect

        # logout_url
        logout_url = reverse("logout") + next_redirect

        # add user login data
        initconfig["user"] = {"i18n": get_language(), "login_url": login_url}
        if not u.is_anonymous:
            initconfig["user"].update(
                {
                    "id": u.pk,
                    "username": u.username,
                    "first_name": u.first_name,
                    "last_name": u.last_name,
                    "is_superuser": u.is_superuser,
                    "is_staff": u.is_staff,
                    "groups": [g.name for g in u.groups.all()],
                    "logout_url": logout_url,
                    "admin_url": reverse("home"),
                }
            )

        # build admin_url
        # only if not viewer 1 or viewer 2
        # grant_users = get_users_for_object(self.project, "change_project", with_group_users=True)

        return Response(initconfig)

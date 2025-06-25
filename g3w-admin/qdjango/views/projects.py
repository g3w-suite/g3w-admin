from django.views.generic import (
    CreateView,
    UpdateView,
    ListView,
    DetailView,
    FormView,
    View,
)
from django.views.generic.detail import SingleObjectMixin
from django.http import HttpResponse
from django.utils.decorators import method_decorator
from django.conf import settings
from django.core.cache import caches
from django.utils.translation import gettext_lazy as _
from guardian.decorators import permission_required
from guardian.shortcuts import get_objects_for_user
from core.mixins.views import *
from core.signals import pre_update_project, pre_delete_project, after_update_project, before_delete_project
from core.utils.decorators import project_type_permission_required, is_active_required
from django_downloadview import ObjectDownloadView
from rest_framework.response import Response
from usersmanage.mixins.views import G3WACLViewMixin
from usersmanage.models import Group as AuthGroup
from usersmanage.decorators import user_passes_test_or_403
from usersmanage.utils import userHasGroups, get_groups_for_object, get_users_for_object
from usersmanage.configs import G3W_EDITOR1, G3W_EDITOR2, G3W_VIEWER1

if 'editing' in settings.INSTALLED_APPS:
    from editing.models import G3WEditingLayer, EDITING_ATOMIC_PERMISSIONS

from qdjango.signals import load_qdjango_widgets_data
from qdjango.mixins.views import *
from qdjango.forms import *
from qdjango.models import (
    TYPE_LAYER_FOR_WIDGET,
    TYPE_LAYER_FOR_DOWNLOAD,
    LayerAcl,
    GeoConstraint,
    SingleLayerConstraint,
    ColumnAcl
)
from qdjango.utils.models import get_widgets4layer, comparedbdatasource
from qdjango.utils.data import QGIS_LAYER_TYPE_NO_GEOM
import json




class QdjangoProjectDownloadView(ObjectDownloadView):
    """
    Download Qgis project File
    """
    @method_decorator(permission_required('qdjango.change_project', (Project, 'slug', 'slug'), raise_exception=True))
    def dispatch(self, *args, **kwargs):
        return super(QdjangoProjectDownloadView, self).dispatch(*args, **kwargs)


class QdjangoProjectListView(G3WRequestViewMixin, G3WGroupViewMixin, ListView):
    template_name = 'qdjango/project_list.html'

    def get_queryset(self):
        return get_objects_for_user(self.request.user, 'qdjango.view_project', Project)\
            .filter(group=self.group, is_active=1).order_by('order')

    def get_context_data(self, **kwargs):
        context = super(QdjangoProjectListView,
                        self).get_context_data(**kwargs)
        context['projectPanoramic'] = self.group.project_panoramic.filter(
            project_type='qdjango')

        context['pre_delete_messages'] = {}
        messages = pre_delete_project.send(self, projects=self.object_list)
        for message in messages:
            msg = message[1]
            if msg:
                for m in msg:
                    context['pre_delete_messages'][m['project'].pk] = m['message']

        # Get inactive projects
        context['inactive_project_list'] = get_objects_for_user(self.request.user, 'qdjango.view_project', Project) \
            .filter(group=self.group, is_active=0).order_by('order')

        return context


class QdjangoProjectCreateView(QdjangoProjectCUViewMixin, G3WGroupViewMixin, G3WRequestViewMixin, CreateView):
    """Create group view."""

    model = Project
    form_class = QdjangoProjectForm

    @method_decorator(permission_required('core.add_project_to_group', (Group, 'slug', 'group_slug'), return_403=True))
    @method_decorator(permission_required('qdjango.add_project', return_403=True))
    @method_decorator(is_active_required((Group, 'slug', 'group_slug')))
    def dispatch(self, *args, **kwargs):
        return super(QdjangoProjectCreateView, self).dispatch(*args, **kwargs)

    def get_initial(self):
        initial = super().get_initial()

        # Get intial for geocoding_providers: default 'nominatim'
        initial['geocoding_providers'] = ["nominatim"]

        return initial


class QdjangoProjectUpdateView(QdjangoProjectCUViewMixin, G3WGroupViewMixin, G3WRequestViewMixin, G3WACLViewMixin,
                               UpdateView):
    """Update project view."""

    model = Project
    form_class = QdjangoProjectForm

    editor_permission = 'change_project'
    editor2_permission = 'view_project'
    viewer_permission = 'view_project'

    @method_decorator(is_active_required((Group, 'slug', 'group_slug')))
    @method_decorator(is_active_required((Project, 'slug', 'slug')))
    @method_decorator(permission_required('qdjango.change_project', (Project, 'slug', 'slug'), raise_exception=True))
    def dispatch(self, *args, **kwargs):
        return super(QdjangoProjectUpdateView, self).dispatch(*args, **kwargs)

    def get_initial(self):
        initial = super().get_initial()

        # Get intial for geocoding_providers
        if self.object.geocoding_providers:
            initial['geocoding_providers'] = json.loads(self.object.geocoding_providers)

        return initial

    def get_context_data(self, **kwargs):
        context = super(QdjangoProjectUpdateView,
                        self).get_context_data(**kwargs)
        if self.request.method == 'GET':
            context['pre_update_messages'] = []
            if self.object.is_dirty:
                context['pre_update_messages'].append(
                    _('The project has been modified by G3W-Suite after it was uploaded.'))
            messages = pre_update_project.send(
                self, project=self.object, projectType='qdjango')
            for message in messages:
                if message[1]:
                    context['pre_update_messages'].append(message[1])
        return context

    def form_valid(self, form):
        res = super(QdjangoProjectUpdateView, self).form_valid(form)

        # send project update signal
        after_update_project.send(
            self, app_name='qdjango', project=form.instance)

        # clear cache
        if 'qdjango' in settings.CACHES:
            caches['qdjango'].delete(
                settings.QDJANGO_PRJ_CACHE_KEY.format(form.instance.pk))
        return res


class QdjangoProjectFastUpdateView(QdjangoProjectCUViewMixin, G3WGroupViewMixin, G3WRequestViewMixin, View):
    """
    View for fast change project by ajaxfiler
    """

    @method_decorator(permission_required('qdjango.change_project', (Project, 'slug', 'slug'), raise_exception=True))
    def dispatch(self, *args, **kwargs):
        return super(QdjangoProjectFastUpdateView, self).dispatch(*args, **kwargs)

    def post(self, request, *args, **kwargs):

        qgis_file = request.FILES['files[]'] if request.FILES else None
        qgskwargs = dict()
        qgskwargs['instance'] = Project.objects.get(slug=kwargs['slug'])
        qgskwargs['group'] = self.group
        qgis_project = QgisProject(qgis_file, **qgskwargs)
        try:
            qgis_project.clean()
        except Exception as e:
            raise ValidationError(e)

        qgis_project.save()

        return HttpResponse('Qgis project uploaded and updated')


class QdjangoProjectDetailView(G3WRequestViewMixin, DetailView):
    """Detail view."""

    model = Project
    template_name = 'qdjango/ajax/project_detail.html'

    @method_decorator(permission_required('qdjango.view_project', (Project, 'slug', 'slug'), raise_exception=True))
    def dispatch(self, *args, **kwargs):
        return super(QdjangoProjectDetailView, self).dispatch(*args, **kwargs)

    def get_context_data(self, **kwargs):
        ctx = super().get_context_data(**kwargs)

        user = self.request.user

        # Get other informations only if user != viewer
        if userHasGroups(user, [G3W_EDITOR1, G3W_EDITOR2]) or user.is_superuser:

            players = [l for l in self.object.layer_set.all()]

            # Editings
            # =============================================

            # Only if module `editing` is activated
            if 'editing' in settings.INSTALLED_APPS:

                editings = []
                elayers = G3WEditingLayer.objects.filter(app_name='qdjango', layer_id__in=[l.pk for l in players])
                for el in elayers:
                    ellayer = el.layer
                    editing = {
                        'elayer': el,
                        'users': [],
                        'ugroups': [],
                    }

                    # Get User/Groups
                    with_anonymous = getattr(settings, 'EDITING_ANONYMOUS', False)
                    viewers = get_viewers_for_object(el.layer, self.request.user, 'change_layer',
                                                     with_anonymous=with_anonymous)

                    editors = (ellayer.project.editor.pk if ellayer.project.editor else None,
                               ellayer.project.editor2.pk if ellayer.project.editor2 else None)

                    atomic_user_permissions = {}
                    for ap in EDITING_ATOMIC_PERMISSIONS:
                        user_viewers_ap = get_viewers_for_object(el.layer, self.request.user, ap,
                                                                       with_anonymous=with_anonymous)

                        for uvap in user_viewers_ap:
                            if uvap in viewers and uvap.pk not in editors:
                                if uvap not in atomic_user_permissions:
                                    atomic_user_permissions[uvap] = {
                                        'username': uvap.username,
                                        'permissions': [_(ap)]
                                    }
                                else:
                                    atomic_user_permissions[uvap]['permissions'].append(_(ap))

                    editing['users'] = list(atomic_user_permissions.values())

                    group_viewers = get_user_groups_for_object(el.layer, self.request.user, 'change_layer', 'viewer')

                    atomic_group_permissions = {}
                    for ap in EDITING_ATOMIC_PERMISSIONS:

                        group_viewers_ap = get_user_groups_for_object(el.layer, self.request.user, ap, 'viewer')
                        for gvap in group_viewers_ap:
                            if gvap in group_viewers:
                                if gvap not in atomic_group_permissions:
                                    atomic_group_permissions[gvap] = {
                                        'name': gvap.name,
                                        'permissions': [_(ap)]
                                    }
                                else:
                                    atomic_group_permissions[gvap]['permissions'].append(_(ap))

                    editing['ugroups'] = list(atomic_group_permissions.values())

                    editings.append(editing)

            ctx['editings'] = editings

            # Geoconstraints, Expconstraints, Hiddenfields, Hiddenlayers, Widgets
            # ===================================================================

            # For hiddenlayers: get users and user groups by with permission on project
            project_viewers = get_viewers_for_object(
                self.object, self.request.user, 'view_project', with_anonymous=True)

            # get Editor Level 1 and Editor level 2 to clear from list
            editor_pk = self.object.editor.pk if self.object.editor else None
            editor2_pk = self.object.editor2.pk if self.object.editor2 else None

            project_viewers = [v for v in project_viewers if v.pk not in (editor_pk, editor2_pk)]

            project_user_groups_viewers = get_groups_for_object(
                self.object, 'view_project', grouprole='viewer')

            # for Editor level filter by his groups
            if userHasGroups(self.request.user, [G3W_EDITOR1]):
                editor1_user_groups_viewers = get_objects_for_user(self.request.user, 'auth.change_group',
                                                                   AuthGroup).order_by('name').filter(
                    grouprole__role='viewer')

                project_user_groups_viewers = list(set(project_user_groups_viewers).intersection(
                    set(editor1_user_groups_viewers)))

            project_user_groups_viewers = [v for v in project_user_groups_viewers]

            widgets = []
            for l in self.object.layer_set.all():

                # Get geoconstraints by layer id
                geoconstraints = GeoConstraint.objects.filter(layer=l)
                expconstraints = SingleLayerConstraint.objects.filter(layer=l)
                hiddenlayers = LayerAcl.objects.filter(layer=l)
                hiddenfields = ColumnAcl.objects.filter(layer=l)

                # Geoconstrain
                gc = {
                    'layer': l,
                    'constraints': [],
                }

                # Expconstraint
                ec = {
                    'layer': l,
                    'constraints': [],
                }

                # Hiddenfield
                hf = {
                    'layer': l,
                    'hiddenfields': [],
                }

                # Hiddenlayer
                hl = {
                    'layer': l,
                    'users': [],
                    'ugroups': []
                }

                # Widgets
                for w in get_widgets4layer(l):
                    if w.widget_type == 'search':
                        widgets.append((l.name, w.name))

                for geoc in geoconstraints:
                    c = {
                        'constraint': geoc,
                        'rules': []
                    }

                    # Get rules
                    for r in geoc.geoconstraintrule_set.all():
                        rule = (
                            r.user.username if r.user else r.group.name,
                            r.rule
                        )
                        c['rules'].append(rule)

                    gc['constraints'].append(c)

                if len(gc['constraints']) > 0:
                    if 'geoconstrains' not in ctx:
                        ctx['geoconstraints'] = [gc]
                    else:
                        ctx['geoconstraints'].append(gc)

                for expc in expconstraints:
                    c = {
                        'constraint': expc,
                        'rules': [],
                    }

                    # Subsetrule
                    # ------------------------------------
                    for r in expc.constraintsubsetstringrule_set.all():
                        rule = (
                            r.user.username if r.user else r.group.name,
                            'Subset',
                            r.rule
                        )
                        c['rules'].append(rule)
                    for r in expc.constraintexpressionrule_set.all():
                        rule = (
                            r.user.username if r.user else r.group.name,
                            'Expression',
                            r.rule
                        )
                        c['rules'].append(rule)

                    ec['constraints'].append(c)

                if len(ec['constraints']) > 0:
                    if 'expconstraints' not in ctx:
                        ctx['expconstraints'] = [ec]
                    else:
                        ctx['expconstraints'].append(ec)

                for hidef in hiddenfields:

                    hf['hiddenfields'].append((
                        hidef.user.username if hidef.user else hidef.group.name,
                        hidef.restricted_fields
                    ))

                if len(hf['hiddenfields']) > 0:
                    if 'hiddenfields' not in ctx:
                        ctx['hiddenfields'] = [hf]
                    else:
                        ctx['hiddenfields'].append(hf)

                for hidel in hiddenlayers:
                    if hidel.user:
                        hl['users'].append(hidel.user)
                    if hidel.group:
                        hl['ugroups'].append(hidel.group)

                if len(hl['users']) > 0 or len(hl['ugroups']) > 0:
                    if 'hiddenlayers' not in ctx:
                        ctx['hiddenlayers'] = [hl]
                    else:
                        ctx['hiddenlayers'].append(hl)

                if widgets:
                    ctx['widgets'] = widgets

        return ctx

class QdjangoProjectDeActiveView(SingleObjectMixin, View):
    '''
    DeActive Qdjango project Ajax view
    '''
    model = Project
    ok_message = 'Project deactivated!'

    @method_decorator(is_active_required((Group, 'slug', 'group_slug')))
    @method_decorator(permission_required('qdjango.delete_project', (Project, 'slug', 'slug'), raise_exception=True))
    def dispatch(self, *args, **kwargs):
        return super().dispatch(*args, **kwargs)

    def _set_is_active(self):
        """ Set is_active and save model instance"""

        self.object.is_active = 0
        self.object.save()

    def post(self, request, *args, **kwargs):

        # send before project delete signal
        self.object = self.get_object()
        before_delete_project.send(
            self, app_name='qdjango', project=self.object)

        # clear cache
        if 'qdjango' in settings.CACHES:
            caches['qdjango'].delete(
                settings.QDJANGO_PRJ_CACHE_KEY.format(self.object.pk))

        self._set_is_active()

        return JsonResponse({'status': 'ok', 'message': self.ok_message})

class QdjangoProjectActiveView(QdjangoProjectDeActiveView):
    '''
    Active Qdjango project Ajax view
    '''

    ok_message = 'Project activated!'

    def _set_is_active(self):
        """ Set is_active and save model instance"""

        self.object.is_active = 1
        self.object.save()

class QdjangoProjectDeleteView(G3WAjaxDeleteViewMixin, SingleObjectMixin, View):
    '''
    Delete Qdjango project Ajax view
    '''
    model = Project

    @method_decorator(is_active_required((Project, 'slug', 'slug'), is_active=0))
    @method_decorator(permission_required('qdjango.delete_project', (Project, 'slug', 'slug'), raise_exception=True))
    def dispatch(self, *args, **kwargs):
        return super(QdjangoProjectDeleteView, self).dispatch(*args, **kwargs)

    def post(self, request, *args, **kwargs):

        # send before project delete signal
        self.object = self.get_object()
        before_delete_project.send(
            self, app_name='qdjango', project=self.object)

        # clear cache
        if 'qdjango' in settings.CACHES:
            caches['qdjango'].delete(
                settings.QDJANGO_PRJ_CACHE_KEY.format(self.object.pk))

        return super(QdjangoProjectDeleteView, self).post(request, *args, **kwargs)


# For layers
class QdjangoLayersListView(G3WRequestViewMixin, G3WGroupViewMixin, QdjangoProjectViewMixin, ListView):
    template_name = 'qdjango/layers_list.html'

    @method_decorator(is_active_required((Project, 'slug', 'project_slug')))
    @method_decorator(permission_required('qdjango.change_project', (Project, 'slug', 'project_slug'),
                                          raise_exception=True))
    def dispatch(self, *args, **kwargs):
        return super(QdjangoLayersListView, self).dispatch(*args, **kwargs)

    def get_queryset(self):
        # get project by project_slug
        return Layer.objects.filter(project__slug=self.project_slug)

    def get_context_data(self, **kwargs):
        """Add current project_slug to context."""
        context = super(QdjangoLayersListView, self).get_context_data(**kwargs)

        # get project object
        project = Project.objects.get(slug=self.project_slug)

        # rebuild layers_tree for bootstrap tree view
        qlayers = self.get_queryset()
        layers = {l.qgs_layer_id: l for l in qlayers}

        layersTree = eval(project.layers_tree)
        layersTreeBoostrap = []

        def buildLeaf(layer):
            leaf = {}
            leaf['text'] = layer['name']
            if 'nodes' in layer:
                leaf['nodes'] = []
                for node in layer['nodes']:
                    leaf['nodes'].append(buildLeaf(node))
            return leaf

        for l in layersTree:
            layersTreeBoostrap.append(buildLeaf(l))

        context['project_slug'] = self.project_slug
        context['layers_tree'] = json.dumps(layersTreeBoostrap)

        context['type_layer_for_widget'] = TYPE_LAYER_FOR_WIDGET
        context['type_layer_for_download'] = TYPE_LAYER_FOR_DOWNLOAD
        context['type_raster_layer_for_download'] = TYPE_RASTER_LAYER_FOR_DOWNLOAD

        # Add no geometry constant
        context['NOGEOMETRY'] = QGIS_LAYER_TYPE_NO_GEOM

        return context


class QdjangoLayerCacheView(G3WGroupViewMixin, QdjangoProjectViewMixin, View):
    """
    To set cached layer settings
    """

    def get(self, *args, **kwargs):

        # get layer to work
        layer = Layer.objects.get(pk=kwargs['layer_id'])

        if 'cached' in self.request.GET and not bool(int(self.request.GET['cached'])):
            layer.tilestache_conf = None
        else:
            # build tilestache layer configuration
            layer.tilestache_conf = {
                "provider": {
                    "name": layer.name,
                    "template": "{}://{}{}?SERVICE=WMS&REQUEST=GetMap&VERSION=1.3.0&LAYERS={}&STYLES=&FORMAT=image/png&TRANSPARENT=undefined&CRS={}&WIDTH=$width&HEIGHT=$height&bbox=$xmin,$ymin,$xmax,$ymax".format(
                        self.request.META['wsgi.url_scheme'],
                        self.request.META['HTTP_HOST'],
                        reverse('ows', args=[
                            kwargs['group_slug'], 'qdjango', layer.project.id]),
                        layer.name,
                        'EPSG:3857'
                    )
                },
                "projection": "spherical mercator"
            }

        # todo: build new tilestache project object for epsg: 3003, 3004 , etc.
        layer.save()

        return JsonResponse({'Saved': 'ok'})


class QdjangoLayerDataView(G3WGroupViewMixin, QdjangoProjectViewMixin, View):
    """
    By ajax call can change few strict layer model attributes.
    """
    @method_decorator(permission_required('qdjango.change_project', (Project, 'slug', 'project_slug'),
                                          raise_exception=True))
    def dispatch(self, *args, **kwargs):
        return super(QdjangoLayerDataView, self).dispatch(*args, **kwargs)

    def post(self, request, *args, **kwargs):
        """
        Save params for layer
        """
        layer = Layer.objects.get(pk=kwargs['layer_id'])
        if 'exclude_from_legend' in request.POST:
            layer.exclude_from_legend = int(
                request.POST['exclude_from_legend'])

        if 'exclude_from_toc' in request.POST:
            layer.exclude_from_toc = int(
                request.POST['exclude_from_toc'])

        if 'not_show_attributes_table' in request.POST:
            layer.not_show_attributes_table = int(
                request.POST['not_show_attributes_table'])

        if 'max_preview_fields' in request.POST:
            layer.max_preview_fields = int(
                request.POST['max_preview_fields'])

        for format in settings.G3WADMIN_VECTOR_LAYER_DOWNLOAD_FORMATS:
            k = 'download_layer'
            mparam = 'download'

            if format != 'shp':
                suffix = f'_{format}'
                k += suffix
                mparam += suffix

            if k in request.POST:
                setattr(layer, mparam, int(request.POST[k]))

        if 'external' in request.POST:
            layer.external = int(request.POST['external'])
        layer.save()

        # Invalidate project cache
        layer.project.invalidate_cache()
        logging.getLogger("g3wadmin.debug").debug(
            f"Qdjango project /api/config invalidate cache after update layer data: {layer.project}"
        )

        return JsonResponse({'Saved': 'ok'})


def project_layers4search_widget(layer):
    """
    Return a dict {layer.qgs_project_id: layer} for Search Widget
    :param layer: Qdjango Model Layer instance
    :return: dict {layer.qgs_project_id: layer}
    :return-type: dict
    """

    return {
        l.qgs_layer_id: (
            lambda l: l.name if l.datasource != layer.datasource else f'{l.name} ({_("same datasource")})')(l)
        for l in layer.project.layer_set.filter(~Q(pk=layer.pk))
    }

class QdjangoLayerWidgetsMixin(object):

    def get_relations(self, layer):
        """
        Get and return  relations from project where layer is a children

        :param layer: Qdjango model Layer instance
        :return: Relations data
        :return type: dict
        """

        toret = []

        if layer.project.relations:
            relations = eval(layer.project.relations)
            for relation in relations:
                if relation['referencingLayer'] == layer.qgs_layer_id:
                    toret.append(relation)
        return toret

    def get_context_data(self, **kwargs):
        context = super().get_context_data()
        context['layer'] = self.layer
        context['project_layers'] = json.dumps(project_layers4search_widget(self.layer))

        # Get layer edit types for default layer style
        context['layer_edittypes'] = json.dumps(self.layer.get_edittypes())

        # Get every relations were layer is child
        context['relations'] = json.dumps(self.get_relations(self.layer))

        load_qdjango_widgets_data.send(self, context=context)

        return context

    def get_success_url(self):
        return None

    def form_valid(self, form):

        ret = super().form_valid(form)

        # Invalidate project cache
        self.project.invalidate_cache()
        logging.getLogger("g3wadmin.debug").debug(
           f"Qdjango project /api/config invalidate cache after update layer widget: {self.project}"
        )

        return ret



class QdjangoLayerWidgetsView(G3WGroupViewMixin, QdjangoProjectViewMixin, QdjangoLayerViewMixin, ListView):
    """
    Render layer's widgets list.
    """
    model = Widget
    template_name = 'qdjango/ajax/layer_widgets.html'

    @method_decorator(permission_required('qdjango.view_project', (Project, 'slug', 'project_slug'),
                                          raise_exception=True))
    def dispatch(self, *args, **kwargs):
        return super(QdjangoLayerWidgetsView, self).dispatch(*args, **kwargs)

    def get_queryset(self):
        return get_widgets4layer(self.layer)


class QdjangoLayerWidgetCreateView(QdjangoLayerWidgetsMixin, G3WRequestViewMixin, G3WGroupViewMixin, QdjangoProjectViewMixin,
                                   QdjangoLayerViewMixin, AjaxableFormResponseMixin, CreateView):

    form_class = QdjangoWidgetForm
    template_name = 'qdjango/ajax/widget_form.html'

    @method_decorator(permission_required('qdjango.add_widget', return_403=True))
    def dispatch(self, *args, **kwargs):
        return super(QdjangoLayerWidgetCreateView, self).dispatch(*args, **kwargs)

    def form_valid(self, form):
        self.object = form.save(commit=False)
        self.object.datasource = self.layer.datasource

        # to assign permissions the widget must be committed to DB
        ret = super(QdjangoLayerWidgetCreateView, self).form_valid(form)

        # add layer
        self.object.layers.add(self.layer)

        '''
        if not self.request.user.is_superuser:
            self.object.addPermissionsToEditor(self.request.user)
        else:
            editor_users = get_users_for_object(self.layer, 'change_layer', 'Editor Maps Groups')
            if editor_users:
                self.object.addPermissionsToEditor(editor_users[0])

        viewers = map(lambda o: o.id, get_users_for_object(self.layer, 'view_layer', 'Viewer Maps Groups'))
        self.object.addPermissionsToViewers(viewers)
        '''

        return ret


class QdjangoLayerWidgetUpdateView(QdjangoLayerWidgetsMixin, G3WRequestViewMixin, G3WGroupViewMixin, QdjangoProjectViewMixin,
                                   QdjangoLayerViewMixin, AjaxableFormResponseMixin, UpdateView):

    form_class = QdjangoWidgetForm
    model = Widget
    template_name = 'qdjango/ajax/widget_form.html'

    # @method_decorator(permission_required('qdjango.change_widget', (Widget, 'slug', 'slug'), raise_exception=True))
    def dispatch(self, *args, **kwargs):
        return super(QdjangoLayerWidgetUpdateView, self).dispatch(*args, **kwargs)


class QdjangoLayerWidgetDeleteView(G3WAjaxDeleteViewMixin, SingleObjectMixin, View):
    '''
    Delete Qdjango project layer widget Ajax view
    '''
    model = Widget

    # @method_decorator(permission_required('qdjango.delete_widget', (Widget, 'slug', 'slug'), raise_exception=True))
    def dispatch(self, *args, **kwargs):
        return super(QdjangoLayerWidgetDeleteView, self).dispatch(*args, **kwargs)

    def post(self, request, *args, **kwargs):

        # Invalidate /api/config project cache
        for l in self.get_object().layers.all():
            l.project.invalidate_cache()
            logging.getLogger("g3wadmin.debug").debug(
                f"Qdjango project /api/config invalidate cache after delate layer widget: {l.project}"
            )

        res = super().post(request, *args, **kwargs)
        return res


class QdjangoLinkWidget2LayerView(G3WRequestViewMixin, G3WGroupViewMixin, QdjangoProjectViewMixin, QdjangoLayerViewMixin, View):
    """
    Activate or deactivate widget for layer.
    """

    def get(self, *args, **kwargs):
        self.widget = get_object_or_404(Widget, slug=kwargs['slug'])
        try:
            self.linkUnlinkWidget(link=(not 'unlink' in self.request.GET))
            return JsonResponse({'status': 'ok'})
        except Exception as e:
            return JsonResponse({'status': 'error', 'errors_form': e.message})

    def linkUnlinkWidget(self, link=True):

        # apply check datasourc only for postgres and spatialite
        if self.layer.layer_type in ('postgres', 'spatialite') \
                and not comparedbdatasource(self.layer.datasource, self.widget.datasource, self.layer.layer_type):
            raise Exception(
                'Datasource of widget is different from layer datasource')
        if link:
            self.widget.layers.add(self.layer)
        else:
            self.widget.layers.remove(self.layer)

        # Invalidate project cache
        self.layer.project.invalidate_cache()



class QdjangoLayerDetailView(G3WRequestViewMixin, DetailView):
    """Detail view for qdjango layer object"""

    model = Layer
    template_name = 'qdjango/ajax/layer_detail.html'

    @method_decorator(permission_required('qdjango.change_project', (Project, 'slug', 'slug'), raise_exception=True))
    def dispatch(self, *args, **kwargs):
        return super(QdjangoLayerDetailView, self).dispatch(*args, **kwargs)


class FilterByUserLayerView(AjaxableFormResponseMixin, G3WProjectViewMixin, G3WRequestViewMixin, FormView):
    """
    View for filter layer by user/group form
    """

    form_class = FilterByUserLayerForm
    template_name = 'qdjango/layer_actions/filter_by_user_layer_form.html'

    @method_decorator(project_type_permission_required('change_project', ('project_type', 'project_slug'),
                                                       return_403=True))
    def dispatch(self, request, *args, **kwargs):

        self.layer_id = kwargs['layer_id']
        return super().dispatch(request, *args, **kwargs)

    def get_success_url(self):
        return None

    def get_form_kwargs(self):

        kwargs = super().get_form_kwargs()

        self.layer = Layer.objects.get(pk=self.layer_id)

        # get viewer users
        viewers = get_viewers_for_object(self.layer, self.request.user, 'view_layer', with_anonymous=True)

        editor_pks = []
        if self.layer.project.editor:
            editor_pks.append(self.layer.project.editor.pk)
        if self.layer.project.editor2:
            editor_pks.append(self.layer.project.editor2.pk)
        self.initial_viewer_users = kwargs['initial']['viewer_users'] = [int(o.id) for o in viewers
                                                                         if o.id not in editor_pks]
        group_viewers = get_user_groups_for_object(self.layer, self.request.user, 'view_layer', 'viewer')
        self.initial_viewer_user_groups = kwargs['initial']['user_groups_viewer'] = [o.id for o in group_viewers]

        return kwargs

    def form_valid(self, form):

        # give permission to viewers:
        toAdd = toRemove = None

        currentViewerUsers = [int(i) for i in form.cleaned_data['viewer_users']]
        toRemove = list(set(self.initial_viewer_users) - set(currentViewerUsers))
        toAdd = list(set(currentViewerUsers) - set(self.initial_viewer_users))

        if toAdd:
            for uid in toAdd:
                setPermissionUserObject(User.objects.get(pk=uid), self.layer, ['view_layer'])

                # Remove from Layer Acls if exists
                LayerAcl.manage_user(uid, self.layer, mode='remove')

        if toRemove:
            for uid in toRemove:
                setPermissionUserObject(User.objects.get(pk=uid), self.layer, ['view_layer'], mode='remove')

                # Add user to LayerAcl model
                LayerAcl.manage_user(uid, self.layer, mode='add')

        # invalidate project cache
        if len(toAdd) > 0 or len(toRemove) > 0:
            self.layer.project.invalidate_cache()

        # give permission to user groups viewers:
        to_add = to_remove = None

        current_user_groups_viewers = [int(i) for i in form.cleaned_data['user_groups_viewer']]
        to_remove = list(set(self.initial_viewer_user_groups) - set(current_user_groups_viewers))
        to_add = list(set(current_user_groups_viewers) - set(self.initial_viewer_user_groups))


        if to_add:
            for aid in to_add:
                setPermissionUserObject(AuthGroup.objects.get(pk=aid), self.layer, ['view_layer'])

                # Remove from Layer Acls if exists
                LayerAcl.manage_group(aid, self.layer, mode='remove')

        if to_remove:
            for aid in to_remove:
                setPermissionUserObject(AuthGroup.objects.get(pk=aid), self.layer, ['view_layer'], mode='remove')

                # Add group to LayerAcl model
                LayerAcl.manage_group(aid, self.layer, mode='add')

        # invalidate project cache
        if len(to_remove) > 0 or len(to_add) > 0:
            self.layer.project.invalidate_cache()
            logging.getLogger("g3wadmin.debug").debug(
                f"Qdjango project /api/config  invalidate cache after update of layer filter-by-user: "
                f"{self.layer.project}"
            )

        return super().form_valid(form)


class ProjectSetOrderView(View):
    '''
    Set order view list projects
    '''

    model = Project

    # only user with change_group for this group can change overview map.
    @method_decorator(user_passes_test_or_403(lambda u: u.is_superuser))
    def dispatch(self, *args, **kwargs):
        return super().dispatch(*args, **kwargs)

    def post(self, *args, **kwargs):
        # get new order save value for group
        new_order = self.request.POST.getlist('new_order[]')
        for oindex, gid in enumerate(new_order):
            p = self.model.objects.get(pk=gid.split('_')[1])
            p.order = oindex
            p.save()

        return JsonResponse({'Saved': 'ok'})
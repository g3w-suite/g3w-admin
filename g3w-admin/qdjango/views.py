from django.views.generic import (
    CreateView,
    UpdateView,
    ListView,
    DetailView,
    TemplateView,
    View,
)
from django.views.generic.detail import SingleObjectMixin
from django.http import HttpResponseRedirect, HttpResponse
from django.utils.decorators import method_decorator
from django.db import connections
from django.conf import settings
from django.core.cache import caches
from guardian.decorators import permission_required
from guardian.shortcuts import get_objects_for_user
from core.mixins.views import *
from core.signals import pre_update_project, pre_delete_project, after_update_project, before_delete_project
from core.utils.decorators import check_madd
from django_downloadview import ObjectDownloadView
from rest_framework.views import APIView
from rest_framework.response import Response
from usersmanage.mixins.views import G3WACLViewMixin
from .signals import load_qdjango_widgets_data
from .mixins.views import *
from .forms import *
from .api.utils import serialize_vectorjoin
from .utils.models import get_widgets4layer
import json
from collections import OrderedDict


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
            .filter(group=self.group).order_by('title')
        #return self.group.qdjango_project.all().order_by('title')

    def get_context_data(self, **kwargs):
        context = super(QdjangoProjectListView, self).get_context_data(**kwargs)
        context['projectPanoramic'] = self.group.project_panoramic.filter(project_type='qdjango')

        context['pre_delete_messages'] = {}
        messages = pre_delete_project.send(self, projects=self.object_list)
        for message in messages:
            msg = message[1]
            if msg:
                for m in msg:
                    context['pre_delete_messages'][m['project'].pk] = m['message']
        return context


class OdjangoProjectCreateView(QdjangoProjectCUViewMixin, G3WGroupViewMixin, G3WRequestViewMixin, CreateView):
    """Create group view."""

    model = Project
    form_class = QdjangoProjetForm

    @method_decorator(permission_required('core.add_project_to_group', (Group, 'slug', 'group_slug'), return_403=True))
    @method_decorator(permission_required('qdjango.add_project', return_403=True))
    @method_decorator(check_madd('MPC:XYamtBJA_JgFGmFvEa9x193rnLg', Project))
    def dispatch(self, *args, **kwargs):
        return super(OdjangoProjectCreateView, self).dispatch(*args, **kwargs)


class QdjangoProjectUpdateView(QdjangoProjectCUViewMixin, G3WGroupViewMixin, G3WRequestViewMixin, G3WACLViewMixin,
                               UpdateView):
    """Update project view."""

    model = Project
    form_class = QdjangoProjetForm

    editor_permission = 'change_project'
    editor2_permission = 'view_project'
    viewer_permission = 'view_project'

    @method_decorator(permission_required('qdjango.change_project', (Project, 'slug', 'slug'), raise_exception=True))
    def dispatch(self, *args, **kwargs):
        return super(QdjangoProjectUpdateView, self).dispatch(*args, **kwargs)

    def get_context_data(self, **kwargs):
        context = super(QdjangoProjectUpdateView, self).get_context_data(**kwargs)
        if self.request.method == 'GET':
            context['pre_update_messages'] = []
            messages = pre_update_project.send(self, project=self.object, projectType='qdjango')
            for message in messages:
                if message[1]:
                    context['pre_update_messages'].append(message[1])
        return context

    def form_valid(self, form):
        res = super(QdjangoProjectUpdateView, self).form_valid(form)

        # send project update signal
        after_update_project.send(self, app_name='qdjango', project=form.instance)

        # clear cache
        if 'qdjango' in settings.CACHES:
            caches['qdjango'].delete(settings.QDJANGO_PRJ_CACHE_KEY.format(form.instance.pk))
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


class QdjangoProjectDeleteView(G3WAjaxDeleteViewMixin, SingleObjectMixin, View):
    '''
    Delete Qdjango project Ajax view
    '''
    model = Project

    @method_decorator(permission_required('qdjango.delete_project', (Project, 'slug', 'slug'), raise_exception=True))
    def dispatch(self, *args, **kwargs):
        return super(QdjangoProjectDeleteView, self).dispatch(*args, **kwargs)

    def post(self, request, *args, **kwargs):

        # send before project delete signal
        self.object = self.get_object()
        before_delete_project.send(self, app_name='qdjango', project=self.object)

        # clear cache
        if 'qdjango' in settings.CACHES:
            caches['qdjango'].delete(settings.QDJANGO_PRJ_CACHE_KEY.format(self.object.pk))

        return super(QdjangoProjectDeleteView, self).post(request, *args, **kwargs)


from core.utils.db import build_dango_connection_name, build_django_connection, dictfetchall
from qdjango.utils.structure import datasource2dict
from .api.permissions import ProjectRelationPermission


class QdjangoProjectRelationsApiView(APIView):
    """
    Return list of relations rows
    """

    permission_classes = [
        ProjectRelationPermission
    ]

    def get(self, request, format=None, group_slug=None, project_id=None, relation_id=None, relation_field_value=None):

        # get Project model object:
        project = Project.objects.get(pk=project_id)

        # ty to get project relations and if fail layer relations
        try:
            relations = {r['id']: r for r in eval(project.relations)}
            relation = relations[relation_id]
        except Exception as e:

            # try to get layer relations
            layer_id = relation_id.split('_vectorjoin_')[0]
            layer = project.layer_set.filter(qgs_layer_id=layer_id)[0]
            joins = eval(layer.vectorjoins)
            for n, join in enumerate(joins):
                serialized_relation = serialize_vectorjoin(layer.qgs_layer_id, n, join)
                if serialized_relation['id'] == relation_id:
                    relation = serialized_relation

        # get layer for query:
        referencing_layer = Layer.objects.get(qgs_layer_id=relation['referencingLayer'], project=project)

        # database columns referencing_layer
        db_columns_referencing_layer = referencing_layer.database_columns_by_name() \
            if referencing_layer.database_columns else None

        exclude_columns = eval(referencing_layer.exclude_attribute_wms) \
            if referencing_layer.exclude_attribute_wms else None

        # build using connection name
        datasource = datasource2dict(referencing_layer.datasource)
        using = build_dango_connection_name(referencing_layer.datasource)
        connections.databases[using] = build_django_connection(datasource, layer_type=referencing_layer.layer_type)

        # exec raw query
        # todo: better

        # BUILD DATA QUERY
        # check if relation_field_value is null
        if relation_field_value.upper() == 'NULL':
            relation_field_value = 'null'
        else:
            if db_columns_referencing_layer \
                    and relation['fieldRef']['referencingField'] in db_columns_referencing_layer:
                db_column_referencing_field = db_columns_referencing_layer[relation['fieldRef']['referencingField']]
                if db_column_referencing_field['type'] in (
                        'INTEGER', 'BIGINT', 'SMALLINT', 'NUMERIC', 'REAL', 'INTEGER64', 'DOUBLE'):
                    relation_field_value = "{}".format(relation_field_value)
                else:
                    relation_field_value = "'{}'".format(relation_field_value)
            else:
                if relation_field_value.isnumeric():
                    relation_field_value = "{}".format(relation_field_value)
                else:
                    relation_field_value = "'{}'".format(relation_field_value)

        # check if there is a schema
        schema_table = datasource['table'].split('.')
        if len(schema_table) > 1:
            referencing_field = '{}."{}"'.format(schema_table[1], relation['fieldRef']['referencingField'])
        else:
            referencing_field = '"{}"'.format(relation['fieldRef']['referencingField'])

        with connections[using].cursor() as cursor:
            cursor.execute("SELECT * FROM {} WHERE {} {} {}".format(
                datasource['table'],
                referencing_field,
                '=' if relation_field_value != 'null' else 'IS',
                relation_field_value))
            rows = dictfetchall(cursor)

        rowss = []
        for r in rows:
            rn = r.copy()
            new_rn = OrderedDict()
            for f in r.keys():
                if type(r[f]) == buffer or f in ['the_geom', 'geom']:
                    continue
                elif exclude_columns and f in exclude_columns:
                    continue
                if db_columns_referencing_layer and f in db_columns_referencing_layer:
                    new_rn[db_columns_referencing_layer[f]['label']] = rn[f]
                else:
                    new_rn[f] = rn[f]
            rowss.append(new_rn)

        # remove new db connection
        del connections.databases[using]

        return Response(rowss)


# For layers
class QdjangoLayersListView(G3WRequestViewMixin, G3WGroupViewMixin, QdjangoProjectViewMixin, ListView):
    template_name = 'qdjango/layers_list.html'

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

        context['type_layer_for_widget'] = (
            'postgres',
            'spatialite',
            'ogr'
        )

        context['type_layer_for_download'] = (
            'postgres',
            'spatialite'
        )
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
                                  reverse('ows', args=[kwargs['group_slug'], 'qdjango', layer.project.id]),
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
            layer.exclude_from_legend = int(request.POST['exclude_from_legend'])
        if 'download_layer' in request.POST:
            layer.download = int(request.POST['download_layer'])
        if 'external' in request.POST:
            layer.external = int(request.POST['external'])
        layer.save()
        return JsonResponse({'Saved': 'ok'})


class QdjangoLayerWidgetsView(G3WGroupViewMixin, QdjangoProjectViewMixin, QdjangoLayerViewMixin, ListView):

    model = Widget
    template_name = 'qdjango/ajax/layer_widgets.html'

    @method_decorator(permission_required('qdjango.view_project', (Project, 'slug', 'project_slug'),
                                          raise_exception=True))
    def dispatch(self, *args, **kwargs):
        return super(QdjangoLayerWidgetsView, self).dispatch(*args, **kwargs)

    def get_queryset(self):
        return get_widgets4layer(self.layer)


class QdjangoLayerWidgetCreateView(G3WRequestViewMixin, G3WGroupViewMixin, QdjangoProjectViewMixin,
                                   QdjangoLayerViewMixin, AjaxableFormResponseMixin, CreateView):

    form_class = QdjangoWidgetForm
    template_name = 'qdjango/ajax/widget_form.html'

    @method_decorator(permission_required('qdjango.add_widget', return_403=True))
    def dispatch(self, *args, **kwargs):
        return super(QdjangoLayerWidgetCreateView, self).dispatch(*args, **kwargs)

    def get_context_data(self, **kwargs):
        context = super(QdjangoLayerWidgetCreateView, self).get_context_data()
        context['layer'] = self.layer

        # todo: da rifare meglio la struttura dei widget
        load_qdjango_widgets_data.send(self, context=context)

        return context

    def get_success_url(self):
        return None

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


class QdjangoLayerWidgetUpdateView(G3WRequestViewMixin, G3WGroupViewMixin, QdjangoProjectViewMixin,
                                   QdjangoLayerViewMixin, AjaxableFormResponseMixin, UpdateView):

    form_class = QdjangoWidgetForm
    model = Widget
    template_name = 'qdjango/ajax/widget_form.html'

    #@method_decorator(permission_required('qdjango.change_widget', (Widget, 'slug', 'slug'), raise_exception=True))
    def dispatch(self, *args, **kwargs):
        return super(QdjangoLayerWidgetUpdateView, self).dispatch(*args, **kwargs)

    def get_context_data(self, **kwargs):
        context = super(QdjangoLayerWidgetUpdateView, self).get_context_data()
        context['layer'] = self.layer

        load_qdjango_widgets_data.send(self, context=context)

        return context

    def get_success_url(self):
        return None


class QdjangoLayerWidgetDeleteView(G3WAjaxDeleteViewMixin, SingleObjectMixin, View):
    '''
    Delete Qdjango project layer widget Ajax view
    '''
    model = Widget

    #@method_decorator(permission_required('qdjango.delete_widget', (Widget, 'slug', 'slug'), raise_exception=True))
    def dispatch(self, *args, **kwargs):
        return super(QdjangoLayerWidgetDeleteView, self).dispatch(*args, **kwargs)


class QdjangoLinkWidget2LayerView(G3WRequestViewMixin, G3WGroupViewMixin, QdjangoProjectViewMixin, QdjangoLayerViewMixin, View):

    def get(self, *args, **kwargs):
        self.widget = get_object_or_404(Widget, slug=kwargs['slug'])
        try:
            self.linkUnlinkWidget(link=(not 'unlink' in self.request.GET))
            return JsonResponse({'status': 'ok'})
        except Exception as e:
            return JsonResponse({'status': 'error', 'errors_form': e.message})

    def linkUnlinkWidget(self, link=True):
        if self.layer.datasource != self.widget.datasource:
            raise Exception('Datasource of widget is different from layer datasource')
        if link:
            self.widget.layers.add(self.layer)
        else:
            self.widget.layers.remove(self.layer)


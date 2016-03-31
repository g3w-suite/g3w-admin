from django.conf import settings
from django.shortcuts import render
from django.template.response import SimpleTemplateResponse, RequestContext, HttpResponse
from django.http import JsonResponse
from django.forms.fields import FileField
from django.views.generic import (
    FormView,
    CreateView,
    UpdateView,
    ListView,
    DetailView,
    TemplateView,
    View,
)
from django.views.generic.detail import SingleObjectMixin
from django.core.urlresolvers import reverse
from .forms import ExampleForm, ExampleAjaxForm, GroupForm
from .models import Group, GroupProjectPanoramic
from django_file_form.uploader import FileFormUploader
from guardian.shortcuts import assign_perm, remove_perm ,get_objects_for_user
from .mixins.views import G3WRequestViewMixin, G3WAjaxDeleteViewMixin
import json


class TestView(View):

    def get(self, request, *args, **kwargs):

        from qdjango.models import Layer
        from core.editing.utils import LayerLock
        l = Layer.objects.all()[0]

        ll = LayerLock(layer=l, appName='qdjango')

        lockedIds = ll.getFeatureLockedIds()

        print lockedIds

        res = ll.lockFeatures(lockedIds)
        print res
        return HttpResponse('ok')

    '''
    def get(self, request, *args, **kwargs):
        from sqlalchemy import create_engine
        from geoalchemy2 import Table as GEOTable
        from sqlalchemy.engine.url import URL
        from sqlalchemy.ext.declarative import declarative_base
        from sqlalchemy.orm import sessionmaker
        from sqlalchemy.schema import MetaData
        from sqlalchemy.sql import select

        url = URL(
            'postgresql+psycopg2',
            'postgres',
            'postgres',
            'localhost',
            '5432',
            'g3w_iternet'
        )


        Base = declarative_base()
        engine = create_engine(url, echo=False)
        conn = engine.connect()
        Session = sessionmaker(bind=engine)
        session = Session()
        meta = MetaData(bind=engine)
        gt = GEOTable(
            'archi', meta, autoload=True, autoload_with=engine
        )

        s = select([gt,(gt.c.the_geom.ST_AsGeoJSON()).label('geojson')])
        rows = conn.execute(s)

        for row in rows:
            print row
        return HttpResponse('test')
    '''


class DashboardView(TemplateView):
    template_name = "index.html"

#for GROUPS
#---------------------------------------------


class GroupListView(ListView):
    """List group view."""
    def get_queryset(self):
        return get_objects_for_user(self.request.user, 'core.view_group', Group).order_by('name')

class GroupDetailView(G3WRequestViewMixin, DetailView):
    """Detail view."""
    model = Group
    template_name = 'core/ajax/group_detail.html'


class GroupCreateView(G3WRequestViewMixin, CreateView):
    """Create group view."""
    model = Group
    form_class = GroupForm

    def get_success_url(self):
        return reverse('group-list')

class GroupUpdateView(G3WRequestViewMixin, UpdateView):
    """Update view."""
    model = Group
    form_class = GroupForm

    def get_success_url(self):
        return reverse('group-list')


class GroupDeleteView(G3WAjaxDeleteViewMixin,G3WRequestViewMixin, SingleObjectMixin,View):
    '''
    Delete group Ajax view
    '''
    model = Group

class GroupSetProjectPanoramicView(View):
    '''
    Set panoramic project for this group
    '''
    def get(self, *args, **kwargs):
        # first remove current panoramic map
        group = Group.objects.get(slug=kwargs['slug'])
        groupProjectPanoramics = GroupProjectPanoramic.objects.filter(group_id=group.id)

        # case exists
        if groupProjectPanoramics:
            groupProjectPanoramic = groupProjectPanoramics[0]
            groupProjectPanoramic.project_type = kwargs['project_type']
            groupProjectPanoramic.project_id = kwargs['project_id']

        else:

            # case new one
            groupProjectPanoramic = GroupProjectPanoramic(group=group, project_type=kwargs['project_type'], project_id=kwargs['project_id'])
        groupProjectPanoramic.save()
        return JsonResponse({'Saved': 'ok'})

#for PROJECTS
#---------------------------------------------

class ProjectListView(G3WRequestViewMixin,TemplateView):

    template_name = 'core/project_list.html'

    def get_context_data(self, **kwargs):
        context = super(ProjectListView, self).get_context_data(**kwargs)

        #group object
        context['group'] = Group.objects.get(slug=context['group_slug'])
        return context








from django.template.response import HttpResponse
from django.http import JsonResponse
from django.views.generic import (
    CreateView,
    UpdateView,
    ListView,
    DetailView,
    TemplateView,
    View,
)
from django.views.generic.detail import SingleObjectMixin
from django.core.urlresolvers import reverse
from django.utils.decorators import method_decorator
from guardian.decorators import permission_required
from guardian.shortcuts import get_objects_for_user
from usersmanage.mixins.views import G3WACLViewMixin
from .forms import GroupForm
from .models import Group, GroupProjectPanoramic
from .mixins.views import G3WRequestViewMixin, G3WAjaxDeleteViewMixin
from .utils.decorators import check_madd
from .signals import after_update_group



class TestView(View):

    def get(self, request, *args, **kwargs):
        from django.http.request import QueryDict
        from qdjango.ows import OWSRequestHandler
        q = QueryDict('', mutable=True)
        q['SERVICE'] = 'WFS'
        q['VERSION'] = '1.0.0'
        q['REQUEST'] = 'GetFeature'
        q['TYPENAME'] = 'sita:listacomunirtpoly'
        q['PROPERTYNAME'] = 'ncom'
        q['PROPERTYNAME'] = 'ncom=VOLTERRA'
        q['OUTPUFORMAT'] = 'application/json'

        class Object(object):
            pass

        request = Object()
        request.method = 'GET'
        request.body = ''
        response = OWSRequestHandler.baseDoRequest(q, request)
        return response


class DashboardView(TemplateView):
    template_name = "index.html"

    def get_context_data(self, **kwargs):
        context = super(DashboardView, self).get_context_data(**kwargs)

        # add number groups
        groups = get_objects_for_user(self.request.user, 'core.view_group', Group)
        context['n_groups'] = len(groups)

        return context

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

    @method_decorator(permission_required('core.view_group', (Group, 'slug', 'slug'), return_403=True))
    def dispatch(self, *args, **kwargs):
        return super(GroupDetailView, self).dispatch(*args, **kwargs)


class GroupCreateView(G3WRequestViewMixin, CreateView):
    """Create group view."""
    model = Group
    form_class = GroupForm

    @method_decorator(permission_required('core.add_group', return_403=True))
    @method_decorator(check_madd('MGC:kTccysDKRCPgT5M5y6sv-OSWlck', Group))
    def dispatch(self, *args, **kwargs):
        return super(GroupCreateView, self).dispatch(*args, **kwargs)

    def get_success_url(self):
        return reverse('group-list')


class GroupUpdateView(G3WRequestViewMixin, G3WACLViewMixin, UpdateView):
    """Update view."""
    model = Group
    form_class = GroupForm

    editor_permission = ['change_group', 'view_group']
    viewer_permission = 'view_group'

    @method_decorator(permission_required('core.change_group', (Group, 'slug', 'slug'), return_403=True))
    def dispatch(self, *args, **kwargs):
        return super(GroupUpdateView, self).dispatch(*args, **kwargs)
    '''
    def get_context_data(self, **kwargs):
        context = super(GroupUpdateView, self).get_context_data(**kwargs)
        context['add_project_title'] = 'Add project'
        return context
    '''
    def form_valid(self, form):
        res = super(GroupUpdateView, self).form_valid(form)

        # send after_save
        after_update_group.send(self, group=form.instance)
        return res

    def get_success_url(self):
        return reverse('group-list')


class GroupDeleteView(G3WAjaxDeleteViewMixin,G3WRequestViewMixin, SingleObjectMixin,View):
    '''
    Delete group Ajax view
    '''
    model = Group

    @method_decorator(permission_required('core.delete_group', (Group, 'slug', 'slug'), return_403=True))
    def dispatch(self, *args, **kwargs):
        return super(GroupDeleteView, self).dispatch(*args, **kwargs)

    def post(self, request, *args, **kwargs):

        res = super(GroupDeleteView, self).post(request, *args, **kwargs)
        # delete ovwerviewmap if is set
        try:
            group_project_panoramics = GroupProjectPanoramic.objects.get(group=self.object)
            group_project_panoramics.delete()
        except Exception:
            pass
        return res

class GroupSetProjectPanoramicView(View):
    '''
    Set panoramic project for this group
    '''

    # only user with change_group for this group can change overview map.
    @method_decorator(permission_required('core.change_group', (Group, 'slug', 'slug'), return_403=True))
    def dispatch(self, *args, **kwargs):
        return super(GroupSetProjectPanoramicView, self).dispatch(*args, **kwargs)

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








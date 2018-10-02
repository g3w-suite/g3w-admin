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
from core.signals import load_dashboard_widgets
from django.views.generic.detail import SingleObjectMixin
from django.core.urlresolvers import reverse
from django.utils.decorators import method_decorator
from guardian.decorators import permission_required
from guardian.shortcuts import get_objects_for_user
from usersmanage.mixins.views import G3WACLViewMixin
from usersmanage.decorators import user_passes_test_or_403
from usersmanage.utils import get_users_for_object
from usersmanage.configs import G3W_EDITOR1
from .forms import GroupForm, GeneralSuiteDataForm, MacroGroupForm
from .models import Group, GroupProjectPanoramic, MapControl, GeneralSuiteData, MacroGroup
from .mixins.views import G3WRequestViewMixin, G3WAjaxDeleteViewMixin, G3WAjaxSetOrderViewMixin
from .utils.decorators import check_madd
from .signals import after_update_group


#class NotFoundView(TemplateView):
#
#    template_name = '404.html'


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
        context['widgets'] = []

        dashboard_widgets = load_dashboard_widgets.send(self)
        for widget in dashboard_widgets:
            if widget[1]:
                context['widgets'].append(widget[1])

        return context

# for GROUPS
# ---------------------------------------------


class GroupListView(ListView):
    """List group view."""
    def get_queryset(self):
        return get_objects_for_user(self.request.user, 'core.view_group', Group).order_by('order')


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

    def get_initial(self):
        return {'mapcontrols': MapControl.objects.all()}

    def get_success_url(self):
        return reverse('group-list')

    def form_valid(self, form):
        res = super(GroupCreateView, self).form_valid(form)

        # delete tempory file form files
        form.delete_temporary_files()
        return res


class GroupUpdateView(G3WRequestViewMixin, G3WACLViewMixin, UpdateView):
    """Update view."""
    model = Group
    form_class = GroupForm

    editor_permission = ['change_group']
    viewer_permission = 'view_group'


    @method_decorator(permission_required('core.change_group', (Group, 'slug', 'slug'), return_403=True))
    def dispatch(self, request, *args, **kwargs):
        return super(GroupUpdateView, self).dispatch(request, *args, **kwargs)

    def form_valid(self, form):
        res = super(GroupUpdateView, self).form_valid(form)

        # send after_save
        after_update_group.send(self, group=form.instance)

        # delete tempory file form files
        form.delete_temporary_files()
        return res

    def get_success_url(self):
        if self.request.session.get('http_referer', False):
            return self.request.session['http_referer']
        return reverse('group-list')


class GroupDeleteView(G3WAjaxDeleteViewMixin, G3WRequestViewMixin, SingleObjectMixin, View):
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
            if kwargs['project_id'] == 'reset':
                groupProjectPanoramics.delete()
                return JsonResponse({'Saved': 'ok'})

            groupProjectPanoramic = groupProjectPanoramics[0]
            groupProjectPanoramic.project_type = kwargs['project_type']
            groupProjectPanoramic.project_id = kwargs['project_id']

        else:

            # case new one
            groupProjectPanoramic = GroupProjectPanoramic(group=group, project_type=kwargs['project_type'],
                                                          project_id=kwargs['project_id'])
        groupProjectPanoramic.save()
        return JsonResponse({'Saved': 'ok'})


class GroupSetOrderView(G3WAjaxSetOrderViewMixin, View):
        '''
        Set order view list groups
        '''

        model = Group

        # only user with change_group for this group can change overview map.
        #@method_decorator(permission_required('core.change_group', (Group, 'id', 'group_id'), return_403=True))
        @method_decorator(user_passes_test_or_403(lambda u: u.is_superuser))
        def dispatch(self, *args, **kwargs):
            return super(GroupSetOrderView, self).dispatch(*args, **kwargs)


# for PROJECTS
# ---------------------------------------------

class ProjectListView(G3WRequestViewMixin,TemplateView):

    template_name = 'core/project_list.html'

    def get_context_data(self, **kwargs):
        context = super(ProjectListView, self).get_context_data(**kwargs)

        #group object
        context['group'] = Group.objects.get(slug=context['group_slug'])
        return context


# for project general data

class GeneralSuiteDataUpdateView(UpdateView):
    """Create group view."""
    model = GeneralSuiteData
    form_class = GeneralSuiteDataForm

    def dispatch(self, *args, **kwargs):
        return super(GeneralSuiteDataUpdateView, self).dispatch(*args, **kwargs)

    def get_object(self, queryset=None):
        return self.model.objects.get()

    def get_success_url(self):
        return reverse('home')


# for MACROGROUPS
# ---------------------------------------------

class MacroGroupListView(ListView):
    """
    List macrogroup view
    """

    model = MacroGroup

    @method_decorator(user_passes_test_or_403(lambda u: u.is_superuser))
    def dispatch(self, request, *args, **kwargs):
        return super(MacroGroupListView, self).dispatch(request, *args, **kwargs)


class MacroGroupCreateView(CreateView):
    """
    Create macrogroup view
    """

    model = MacroGroup
    form_class = MacroGroupForm

    @method_decorator(user_passes_test_or_403(lambda u: u.is_superuser))
    def dispatch(self, *args, **kwargs):
        return super(MacroGroupCreateView, self).dispatch(*args, **kwargs)

    #def get_initial(self):
        #return {'mapcontrols': MapControl.objects.all()}

    def get_success_url(self):
        return reverse('macrogroup-list')

    def form_valid(self, form):
        res = super(MacroGroupCreateView, self).form_valid(form)

        # delete tempory file form files
        form.delete_temporary_files()
        return res


class MacroGroupUpdateView(UpdateView):
    """
    Update view
    """

    model = MacroGroup
    form_class = MacroGroupForm

    @method_decorator(user_passes_test_or_403(lambda u: u.is_superuser))
    def dispatch(self, request, *args, **kwargs):
        return super(MacroGroupUpdateView, self).dispatch(request, *args, **kwargs)

    def form_valid(self, form):
        res = super(MacroGroupUpdateView, self).form_valid(form)

        # delete tempory file form files
        form.delete_temporary_files()
        return res

    def get_form_kwargs(self):
        kwargs = super(MacroGroupUpdateView, self).get_form_kwargs()
        editor_users = get_users_for_object(self.object, 'view_macrogroup', [G3W_EDITOR1])
        kwargs['initial']['editor_users'] = [o.id for o in editor_users]
        return kwargs

    def get_success_url(self):
        return reverse('macrogroup-list')


class MacroGroupDeleteView(G3WAjaxDeleteViewMixin, SingleObjectMixin, View):
    '''
    Delete macrogroup Ajax view
    '''
    model = MacroGroup

    @method_decorator(user_passes_test_or_403(lambda u: u.is_superuser))
    def dispatch(self, *args, **kwargs):
        return super(MacroGroupDeleteView, self).dispatch(*args, **kwargs)


class MacroGroupDetailView(G3WRequestViewMixin, DetailView):
    """
    Macrogroup Detail view.
    """
    model = MacroGroup
    template_name = 'core/ajax/macrogroup_detail.html'

    @method_decorator(user_passes_test_or_403(lambda u: u.is_superuser))
    def dispatch(self, *args, **kwargs):
        return super(MacroGroupDetailView, self).dispatch(*args, **kwargs)


class MacroGroupSetOrderView(G3WAjaxSetOrderViewMixin, View):
    '''
    Set order view list macrogroups
    '''

    model = MacroGroup

    # only user with change_group for this group can change overview map.
    # @method_decorator(permission_required('core.change_group', (Group, 'id', 'group_id'), return_403=True))
    @method_decorator(user_passes_test_or_403(lambda u: u.is_superuser))
    def dispatch(self, *args, **kwargs):
        return super(MacroGroupSetOrderView, self).dispatch(*args, **kwargs)
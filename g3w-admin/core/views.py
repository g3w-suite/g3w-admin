from django.conf import settings
from django.http import (
    JsonResponse,
    HttpResponseBadRequest,
    HttpResponse,
)
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
from django.urls import reverse
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from guardian.decorators import permission_required
from guardian.shortcuts import (
    get_objects_for_user,
    get_anonymous_user,
    get_objects_for_group
)
from usersmanage.mixins.views import G3WACLViewMixin
from usersmanage.decorators import user_passes_test_or_403
from usersmanage.utils import get_users_for_object, userHasGroups
from usersmanage.configs import G3W_EDITOR1, G3W_EDITOR2
from usersmanage.models import User, Group as AuthGroup
from .forms import GroupForm, GeneralSuiteDataForm, MacroGroupForm, GroupFilterForm
from .models import (
    Group,
    GroupProjectPanoramic,
    MapControl,
    GeneralSuiteData,
    MacroGroup,
)
from .mixins.views import G3WRequestViewMixin, G3WAjaxDeleteViewMixin, G3WAjaxSetOrderViewMixin
from .signals import after_update_group, execute_search_on_models
from .utils.general import get_system_info
import requests
import json


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
        qs = get_objects_for_user(self.request.user, 'core.view_group', Group)
             #| get_objects_for_user(get_anonymous_user(), 'core.view_group', Group)

        qs = qs.filter(is_active=1).order_by('order')
        context['n_groups'] = len(qs)
        context['widgets'] = []

        dashboard_widgets = load_dashboard_widgets.send(self)
        for widget in dashboard_widgets:
            if widget[1]:
                context['widgets'].append(widget[1])

        return context


class SearchAdminView(TemplateView):
    template_name = "search.html"

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)

        # Execute searches on modules
        results = execute_search_on_models.send(self, request=self.request, search_text=self.request.GET['stext'])
        context['search_text'] = self.request.GET['stext']
        context['results'] = []
        for r in results:
            context['results'] += r[1]

        # Get _n_tot_results
        context['n_tot_results'] = 0
        for r in context['results']:
            context['n_tot_results'] += r.n_tot_results

        return context

# for GROUPS
# ---------------------------------------------


class GroupListView(ListView):
    """List group view."""

    def set_filters(self):
        """ Set filters by URL GET parameters """

        self.filter_parameters = {}
        if 'macrogroup' in self.request.GET and self.request.GET['macrogroup']:
            self.filter_parameters['macrogroup'] = {
                'use': True,
                'value': self.request.GET['macrogroup'],
                'qs_filter': {'macrogroups__id': self.request.GET['macrogroup']}
            }

        if 'epsg' in self.request.GET and self.request.GET['epsg']:
            self.filter_parameters['epsg'] = {
                'use': True,
                'value': self.request.GET['epsg'],
                'qs_filter': {'srid_id': self.request.GET['epsg']}
            }

        # Filter for Users role
        aclfparams = {
            'editor1': (User, G3W_EDITOR1, 'change_group', get_objects_for_user),
            'editor2': (User, G3W_EDITOR2, 'view_group', get_objects_for_user),
            'editorgroup': (AuthGroup, 'editor', 'view_group', get_objects_for_group),
            'viewergroup': (AuthGroup, 'viewer', 'view_group', get_objects_for_group),
        }

        gspk = set()
        for fp, dt in aclfparams.items():
            if fp in self.request.GET and self.request.GET[fp]:

                # Add to self.fitler_params for to use after in initials form values
                self.filter_parameters[fp] = {
                    'use': False,
                    'value': self.request.GET[fp]
                }

                try:
                    eu = dt[0].objects.get(pk=self.request.GET[fp])

                    if (dt[3] == get_objects_for_user and isinstance(eu, User) and userHasGroups(eu, [dt[1]]) or
                            dt[3] == get_objects_for_group and isinstance(eu, AuthGroup) and eu.grouprole.role == dt[1]):
                        gbeu = dt[3](eu, dt[2], Group)
                        gspk = gspk.union(set([g.pk for g in gbeu]))
                except Exception as e:
                    print(e)
                    pass


        if gspk:
            self.filter_parameters['users'] = {
                'use': True,
                'value': gspk,
                'qs_filter': {'pk__in': list(gspk)}
            }

    def setup(self, request, *args, **kwargs):
        super(GroupListView, self).setup(request, *args, **kwargs)

        # Set filter parameters
        self.set_filters()

    def _is_active(self, qs):
        """ Add a filter fo is_active property """
        return qs.filter(is_active=1)

    def get_queryset(self):

        qs = get_objects_for_user(self.request.user, 'core.view_group', Group)
             #| get_objects_for_user(get_anonymous_user(), 'core.view_group', Group)
        qs = self._is_active(qs)
        qs = qs.order_by('order')

        # Check for filter GET parameters
        for k, f in self.filter_parameters.items():
            if f['use']:
                qs = qs.filter(**f['qs_filter'])

        return qs

    def get_context_data(self, *, object_list=None, **kwargs):
        context = super(GroupListView, self).get_context_data(object_list=object_list, **kwargs)

        # Initial forms data
        initials = {k: f['value'] for k, f in self.filter_parameters.items()}


        # Set filter form
        context['filter_form'] = GroupFilterForm(request=self.request,
                                                 initial={k: f['value'] for k, f in self.filter_parameters.items()})

        context['collapsed_filter_form'] = False if self.filter_parameters else True

        return context


class GroupDeactiveListView(GroupListView):
    """ ListView to show map groups with is_active=0"""

    template_name = 'core/group_deactive_list.html'
    def _is_active(self, qs):
        """ Add a filter fo is_active property """
        return qs.filter(is_active=0)

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
    def dispatch(self, *args, **kwargs):
        return super(GroupCreateView, self).dispatch(*args, **kwargs)

    def get_initial(self):

        # Fake group for build a initial default header_logo_img for new groups.
        g = Group(name='fake', title='fake', srid_id=1, header_logo_img=f'logo_img/{settings.CLIENT_G3WSUITE_LOGO}')

        return {'mapcontrols': MapControl.objects.all(),
                'header_logo_img': g.header_logo_img
        }

    def get_success_url(self):
        return reverse('group-list')

    def form_valid(self, form):
        res = super(GroupCreateView, self).form_valid(form)

        # delete temporary file form files
        form.delete_temporary_files()
        return res


class GroupUpdateView(G3WRequestViewMixin, G3WACLViewMixin, UpdateView):
    """Update view."""
    model = Group
    form_class = GroupForm

    editor_permission = ['change_group']
    editor2_permission = ['view_group']
    viewer_permission = 'view_group'

    @method_decorator(permission_required('core.change_group', (Group, 'slug', 'slug'), return_403=True))
    def dispatch(self, request, *args, **kwargs):
        return super(GroupUpdateView, self).dispatch(request, *args, **kwargs)

    def form_valid(self, form):

        # When edit form from project list view
        # If `name` field changed an 404 error happens because old
        # `self.request.session['http_referer']` holds the url with the old url
        # build with old group `name` instance.
        if 'name' in form.changed_data:
            del(self.request.session['http_referer'])
        res = super(GroupUpdateView, self).form_valid(form)

        # send after_save
        after_update_group.send(self, group=form.instance)

        # delete temporary file form files
        form.delete_temporary_files()
        return res

    def get_success_url(self):
        if self.request.session.get('http_referer', False):
            return self.request.session['http_referer']
        return reverse('group-list')

class GroupDeActiveView(G3WAjaxDeleteViewMixin, G3WRequestViewMixin, SingleObjectMixin, View):
    '''
    Deactivate group Ajax view
    '''
    model = Group
    ok_message = 'Cartographic group deactivated!'

    @method_decorator(permission_required('core.delete_group', (Group, 'slug', 'slug'), return_403=True))
    def dispatch(self, *args, **kwargs):
        return super().dispatch(*args, **kwargs)

    def _set_is_active(self):
        """ Set is_active and save model instance"""

        self.object.is_active = 0
        self.object.save()

        # Deactivate every project's group:
        for app, p in self.object.getProjects():
            p.is_active = 0
            p.save()

    def post(self, request, *args, **kwargs):

        self.object = self.get_object()
        # delete ovwerviewmap if is set
        try:
            group_project_panoramics = GroupProjectPanoramic.objects.get(group=self.object)
            group_project_panoramics.delete()
        except Exception:
            pass

        self._set_is_active()

        return JsonResponse({'status': 'ok', 'message': self.ok_message})

class GroupActiveView(GroupDeActiveView):
    """
    Activate group and relative projects.
    """
    ok_message = 'Cartographic group activated!'

    def _set_is_active(self):
        """ Set is_active and save model instance"""

        self.object.is_active = 1
        self.object.save()

        # Deactivate every project's group:
        for app, p in self.object.getProjects():
            p.is_active = 1
            p.save()

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

    @method_decorator(user_passes_test_or_403(lambda u: u.is_superuser))
    def dispatch(self, *args, **kwargs):
        return super(GeneralSuiteDataUpdateView, self).dispatch(*args, **kwargs)

    def get_object(self, queryset=None):
        return self.model.objects.get()

    def get_success_url(self):
        return reverse('home')

    def form_valid(self, form):
        res = super().form_valid(form)

        # Delete django-file-form temporary files
        form.delete_temporary_files()

        return res


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

    def get_queryset(self):
        return MacroGroup.objects.all().order_by('order')


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


@method_decorator(csrf_exempt, name='dispatch')
class InterfaceProxy(View):
    """
    Proxy interface view for client. used to call external service to avoid problems of cross domains (COORS)
    Only POST request are available on this view.
    """

    def post(self, request, **kwargs):

        # Check for content type accept only 'application/json'

        if request.content_type != 'application/json':
            return HttpResponseBadRequest("Proxy accept only 'application/json request'")

        post_data = json.loads(request.body)

        # Required
        url = post_data.get('url')
        if not url:
            return HttpResponseBadRequest("'url' parameter must be provided.")

        method = post_data.get('method')
        if not method:
            return HttpResponseBadRequest("'method' parameter must be provided.")

        method = method.lower()

        # Check for standard methods:
        try:
            req_method = getattr(requests, method)
        except:
            return HttpResponseBadRequest(f"method '{method}' is not available.")

        # No required parameters
        params = post_data.get('params')
        headers = post_data.get('headers')

        req_kwargs = {}
        if method in ('post', 'put'):
            req_kwargs.update({
                'data': params
            })

        if headers:
            req_kwargs.update({
                'headers': headers
            })

        try:
            res = req_method(url, **req_kwargs)
        except Exception as e:
            return HttpResponseBadRequest(str(e))

        djres = HttpResponse(content=res.content, status=res.status_code)

        # Add headers Content-Type from requests
        djres['Content-Type'] = res.headers['Content-Type']

        return djres


class SystemInfoView(TemplateView):
    """
    View class to show system information
    """

    template_name = 'core/ajax/system_info.html'

    def get_context_data(self, **kwargs):
        ctx = super().get_context_data(**kwargs)
        ctx['sysinfo'] = get_system_info()
        return ctx
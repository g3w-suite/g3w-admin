"""
G3W-ADMIN URL Configuration
"""
from django.conf.urls import url,include
from django.contrib import admin, auth
from django.conf import settings
from django.conf.urls.static import static
from django.contrib.auth.decorators import login_required
from django.conf.urls.i18n import i18n_patterns
from django.views.i18n import javascript_catalog, json_catalog
from qgis.core import *



G3W_SITETREE_I18N_ALIAS = ['core', 'acl']

jsInfoDict = {
    'packages': ('core','usermanage','client',),
}

urlpatterns = [
    url(r'^django-admin/', admin.site.urls),
    url(r'^', include('core.urls')),
    url(r'^', include('usersmanage.urls')),
    url(r'^', include('client.urls')),
    url(r'^upload/', include('django_file_form.urls')),
    url(r'^login/$', auth.views.login, name='login', kwargs={
        'template_name': 'login.html',
        'extra_context': {
            'adminlte_skin': 'login-page',
            'adminlte_layout_option': None
        }
    }),
    url(r'^logout/$', auth.views.logout, {'next_page': settings.LOGOUT_NEXT_PAGE}, name='logout'),
    url(r'^jsi18n/$', javascript_catalog, jsInfoDict, name='javascript-catalog'),
]

apiUrlpatterns = [
    url(r'^', include('client.apiurls')),
]

#adding projects app
for app in settings.G3WADMIN_PROJECT_APPS:
    urlpatterns.append(url(r'^{}/'.format(app),include('{}.urls'.format(app))))
    try:
      apiUrlpatterns.append(url(r'^{}/'.format(app),include('{}.apiurls'.format(app))))
    except:
      pass

# adding local_more_apps
for app in settings.G3WADMIN_LOCAL_MORE_APPS:
    urlpatterns.append(url(r'^{}/'.format(app), include('{}.urls'.format(app))))
    try:
      apiUrlpatterns.append(url(r'^{}/'.format(app),include('{}.apiurls'.format(app))))
    except:
        pass

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

urlpatterns = i18n_patterns(*urlpatterns)

urlpatterns += apiUrlpatterns

urlpatterns += [url(r'^', include('OWS.urls'))]

from sitetree.sitetreeapp import register_i18n_trees

register_i18n_trees(G3W_SITETREE_I18N_ALIAS)

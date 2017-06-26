"""
G3W-ADMIN URL Configuration
"""
from django.conf.urls import url,include
from django.contrib import admin, auth
from django.conf import settings
from django.conf.urls.static import static
from django.conf.urls.i18n import i18n_patterns
from django.views.i18n import javascript_catalog, json_catalog
try:
    from qgis.core import *
except:
    pass


# if frontend is set
base = BASE_ADMIN_URLPATH = 'admin/' if hasattr(settings, 'FRONTEND') and settings.FRONTEND else ''

G3W_SITETREE_I18N_ALIAS = ['core', 'acl']

jsInfoDict = {
    'domain': 'djangojs',
    'packages': ('core', 'usermanage', 'client',),
}

urlpatterns = [
    url(r'^django-admin/', admin.site.urls),
    url(r'^{}'.format(BASE_ADMIN_URLPATH), include('core.urls')),
    url(r'^{}'.format(BASE_ADMIN_URLPATH), include('usersmanage.urls')),
    url(r'^upload/', include('django_file_form.urls')),
    url(r'^', include('client.urls')),
    url(r'^login/$', auth.views.login, name='login', kwargs={
        'template_name': 'login.html',
        'extra_context': {
            'adminlte_skin': 'login-page',
            'adminlte_layout_option': None
        }
    }),
    url(r'^logout/$', auth.views.logout, {'next_page': 'home'},
        name='logout'),
    url(r'^jsi18n/$', javascript_catalog, jsInfoDict, name='javascript-catalog'),
]

apiUrlpatterns = [
    url(r'^', include('client.apiurls')),
]

if BASE_ADMIN_URLPATH == 'admin/':
    urlpatterns.append(url(r'^', include('{}.urls'.format(settings.FRONTEND_APP))))

#adding projects app
#if BASE_ADMIN_URLPATH:
    #base = BASE_ADMIN_URLPATH[0:-1]
for app in settings.G3WADMIN_PROJECT_APPS:
    urlpatterns.append(url(r'^{}{}/'.format(BASE_ADMIN_URLPATH, app), include('{}.urls'.format(app))))
    try:
      apiUrlpatterns.append(url(r'^{}/'.format(app), include('{}.apiurls'.format(app))))
    except Exception as e:
      pass

# adding local_more_apps
for app in settings.G3WADMIN_LOCAL_MORE_APPS:
    if app == settings.FRONTEND_APP:
        urlpatterns.append(url(r'^{}/'.format(app), include('{}.urls'.format(app))))
    else:
        app_urls = (urlconf_module, app_name, namespace) = include('{}.urls'.format(app))
        try:
            base_url_app = urlconf_module.BASE_URLS
        except:
            base_url_app = app
        urlpatterns.append(url(r'^{}{}/'.format(BASE_ADMIN_URLPATH, base_url_app), app_urls))
    try:
        app_urls = (urlconf_module, app_name, namespace) = include('{}.apiurls'.format(app))
        try:
            base_url_app = urlconf_module.BASE_URLS
        except:
            base_url_app = app
        apiUrlpatterns.append(url(r'^{}/'.format(base_url_app), app_urls))
    except Exception as e:
        pass

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

'''
if settings.SITE_PREFIX_URL:
    urlpatterns = [
        url(r'^{}'.format(settings.SITE_PREFIX_URL), include(urlpatterns))
    ]
'''

urlpatterns = i18n_patterns(*urlpatterns)

'''
if settings.SITE_PREFIX_URL:
    apiUrlpatterns = [
        url(r'^{}/'.format(settings.SITE_PREFIX_URL), include(apiUrlpatterns))
    ]
'''

urlpatterns += apiUrlpatterns

urlows = [url(r'^', include('OWS.urls'))]

'''
if settings.SITE_PREFIX_URL:
    urlows = [
        url(r'^{}'.format(settings.SITE_PREFIX_URL), include(urlows))
    ]
'''

urlpatterns += urlows

from sitetree.sitetreeapp import register_i18n_trees

register_i18n_trees(G3W_SITETREE_I18N_ALIAS)





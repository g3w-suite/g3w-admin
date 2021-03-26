"""
G3W-ADMIN URL Configuration
"""
from django.conf.urls import url, include
from django.urls import path
from django.contrib import admin, auth
from django.conf import settings
from django.conf.urls.static import static
from django.conf.urls.i18n import i18n_patterns
from django.views.i18n import JavaScriptCatalog
from ajax_select import urls as ajax_select_urls

import debug_toolbar

try:
    from qgis.core import *
except:
    pass


# if frontend is set
base = BASE_ADMIN_URLPATH = 'admin/' if hasattr(settings, 'FRONTEND') and settings.FRONTEND else ''

G3W_SITETREE_I18N_ALIAS = ['core', 'acl']

#jsInfoDict = {
#    'domain': 'djangojs',
#    'packages': ('core', 'usersmanage', 'client', 'editing'),
#}

extra_context_login_page = {
            'adminlte_skin': 'login-page',
            'adminlte_layout_option': None
        }

urlpatterns = [

    path('__debug__/', include(debug_toolbar.urls)),

    url(r'^i18n/', include('django.conf.urls.i18n')),
    url(r'^django-admin/', admin.site.urls),
    url(r'^{}'.format(BASE_ADMIN_URLPATH), include('core.urls')),
    url(r'^{}'.format(BASE_ADMIN_URLPATH), include('usersmanage.urls')),
    url(r'^upload/', include('django_file_form.urls')),
    url(r'^', include('client.urls')),
    url(r'^login/$', auth.views.LoginView.as_view(template_name='login.html', extra_context=extra_context_login_page),
        name='login'),
    url(r'^logout/$', auth.views.LogoutView.as_view(
        next_page=settings.LOGOUT_NEXT_PAGE + '{}'.format(BASE_ADMIN_URLPATH)), name='logout'),
    url(r'^jsi18n/$', JavaScriptCatalog.as_view(), name='javascript-catalog'),
    url(r'^ajax_select/', include(ajax_select_urls))
]

# Add path/url for user password rest by email
if settings.RESET_USER_PASSWORD:
    urlpatterns += [
        path('password_change/', auth.views.PasswordChangeView.as_view(extra_context=extra_context_login_page),
             name='password_change'),
        path('password_change/done/', auth.views.PasswordChangeDoneView.as_view(extra_context=extra_context_login_page),
             name='password_change_done'),
        path('password_reset/', auth.views.PasswordResetView.as_view(extra_context=extra_context_login_page),
             name='password_reset'),
        path('password_reset/done/', auth.views.PasswordResetDoneView.as_view(extra_context=extra_context_login_page),
             name='password_reset_done'),
        path('reset/<uidb64>/<token>/',
             auth.views.PasswordResetConfirmView.as_view(extra_context=extra_context_login_page),
             name='password_reset_confirm'),
        path('reset/done/', auth.views.PasswordResetCompleteView.as_view(extra_context=extra_context_login_page),
             name='password_reset_complete'),
    ]

apiUrlpatterns = [
    url(r'^', include('client.apiurls')),
    url(r'^', include('core.apiurls'))
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
        pass
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
        print(e)
        pass

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)


if settings.SITE_PREFIX_URL:
    urlpatterns = [
        url(r'^{}'.format(settings.SITE_PREFIX_URL), include(urlpatterns))
    ]

urlpatterns = i18n_patterns(*urlpatterns, prefix_default_language=settings.PREFIX_DEFAULT_LANGUAGE)


if settings.SITE_PREFIX_URL:
    apiUrlpatterns = [
        url(r'^{}'.format(settings.SITE_PREFIX_URL), include(apiUrlpatterns))
    ]


urlpatterns += apiUrlpatterns

urlows = [url(r'^', include('OWS.urls'))]


if settings.SITE_PREFIX_URL:
    urlows = [
        url(r'^{}'.format(settings.SITE_PREFIX_URL), include(urlows))
    ]


urlpatterns += urlows

from sitetree.sitetreeapp import register_i18n_trees

register_i18n_trees(G3W_SITETREE_I18N_ALIAS)





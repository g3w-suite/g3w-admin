"""
G3W-ADMIN URL configuration
"""

__author__    = 'lorenzetti@gis3w.it'
__copyright__ = 'Copyright 2015 - 2023, Gis3w'
__license__   = "MPL 2.0"

from django.conf import settings
from django.conf.urls.static import static
from django.conf.urls.i18n import i18n_patterns
from django.contrib import admin, auth
from django.contrib.staticfiles import views
from django.urls import path, include, re_path
from django.views.i18n import JavaScriptCatalog
from django.views.generic import TemplateView

from django_registration.backends.activation import views as registration_views
from usersmanage.forms import (
    G3WAuthenticationForm,
    G3WResetPasswordForm,
    G3WRegistrationForm,
    G3WSetPasswordForm
)
from usersmanage.views import (
    G3WUserRegistrationView,
    G3WUsernameRecoveryView,
    G3WUsernameRecoveryDoneView,
    G3WPasswordResetView,
    G3WLoginView,
    G3WPasswordChangeFirstLoginConfirmView
)

from ajax_select import urls as ajax_select_urls
from sitetree.sitetreeapp import register_i18n_trees

# urls.py
urlpatterns    = []

# apiurls.py
apiUrlpatterns = []

# jsInfoDict = {
#    'domain': 'djangojs',
#    'packages': ('core', 'usersmanage', 'client', 'editing'),
# }

G3W_SITETREE_I18N_ALIAS = ['core', 'acl']

extra_context_login_page = {
    'adminlte_skin': 'login-page',
    'adminlte_layout_option': None
}

#############################################################
# QGIS API
#############################################################
try:
    from qgis.core import *
except:
    pass

#############################################################
# HOME PAGE (frontend app)
#############################################################
# TODO: remove duplicate variable assignment? ( base = BASE_ADMIN_URLPATH )
base = BASE_ADMIN_URLPATH = 'admin/' if hasattr(settings, 'FRONTEND') and settings.FRONTEND else ''

if BASE_ADMIN_URLPATH == 'admin/':
    urlpatterns += [ path('', include('{}.urls'.format(settings.FRONTEND_APP))) ]

#############################################################
# DEFAULT ROUTES
#############################################################
urlpatterns += [
    path(
        'i18n/',
        include('django.conf.urls.i18n')
    ),
    path(
        'django-admin/',
        admin.site.urls
    ),
    path(
        '{}'.format(BASE_ADMIN_URLPATH),
        include('core.urls')
    ),
    path(
        '{}'.format(BASE_ADMIN_URLPATH),
        include('usersmanage.urls')
    ),
    path(
        'dff/',
        include('django_file_form.urls')
    ),
    path(
        '',
        include('client.urls')
    ),
    path(
        '',
        include('about.urls')
    ),
    path(
        'login/',
        G3WLoginView.as_view(
            template_name='login.html',
            form_class=G3WAuthenticationForm,
            extra_context=extra_context_login_page
        ),
        name='login'
    ),
    path(
        'logout/',
        auth.views.LogoutView.as_view(next_page=settings.LOGOUT_NEXT_PAGE + '{}'.format(BASE_ADMIN_URLPATH)),
        name='logout'
    ),
    path(
        'jsi18n/',
        JavaScriptCatalog.as_view(),
        name='javascript-catalog'
    ),
    path(
        'ajax_select/',
        include(ajax_select_urls)
    )
]

#############################################################
# REGISTRATION USERS
#############################################################

urlpatterns += [
    path(
        "accounts/activate/complete/",
        TemplateView.as_view(
            template_name="django_registration/activation_complete.html",
            extra_context=extra_context_login_page,
        ),
        name="django_registration_activation_complete",
    ),
    path(
        "accounts/activate/<str:activation_key>/",
        registration_views.ActivationView.as_view(extra_context=extra_context_login_page,),
        name="django_registration_activate",
    ),
    path(
        "accounts/register/",
        G3WUserRegistrationView.as_view(
            extra_context=extra_context_login_page,
            form_class=G3WRegistrationForm
        ),
        name="django_registration_register",
    ),
    path(
        "accounts/register/complete/",
        TemplateView.as_view(
            template_name="django_registration/registration_complete.html",
            extra_context=extra_context_login_page,
        ),
        name="django_registration_complete",
    ),
    path(
        "accounts/register/closed/",
        TemplateView.as_view(
            template_name="django_registration/registration_closed.html",
            extra_context=extra_context_login_page,
        ),
        name="django_registration_disallowed",
    ),
    path('allauthg/', include('allauth.urls')),
]



#############################################################
# PASSWORD RESET (user password reset by email)
# USERNAME RECOVERY (username recovery by email)
#############################################################
if settings.RESET_USER_PASSWORD:
    urlpatterns += [
        path(
            'password_change/',
            auth.views.PasswordChangeView.as_view(extra_context=extra_context_login_page),
            name='password_change'
        ),
        path(
            'password_change/done/',
            auth.views.PasswordChangeDoneView.as_view(extra_context=extra_context_login_page),
            name='password_change_done'
        ),
        path(
            'password_reset/',
            G3WPasswordResetView.as_view(
                extra_context=extra_context_login_page,
                form_class=G3WResetPasswordForm
            ),
            name='password_reset'
        ),
        path(
            'password_reset/done/',
            auth.views.PasswordResetDoneView.as_view(extra_context=extra_context_login_page),
            name='password_reset_done'
        ),
        path(
            'reset/<uidb64>/<token>/',
            auth.views.PasswordResetConfirmView.as_view(
                extra_context=extra_context_login_page,
                form_class=G3WSetPasswordForm),
            name='password_reset_confirm'
        ),
        path(
            'reset/done/',
            auth.views.PasswordResetCompleteView.as_view(extra_context=extra_context_login_page),
            name='password_reset_complete'
        ),
        path(
            'username_recovery/',
            G3WUsernameRecoveryView.as_view(
                extra_context=extra_context_login_page
            ),
            name='username_recovery'
        ),
        path(
            'username_recovery/done/',
            G3WUsernameRecoveryDoneView.as_view(extra_context=extra_context_login_page),
            name='username_recovery_done'
        ),
    ]

#############################################################
# CHANGE PASSWORD FIRST LOGIN
#############################################################
if settings.PASSWORD_CHANGE_FIRST_LOGIN:
    urlpatterns += [
        path(
            'changepassword/<uidb64>/<token>/',
            G3WPasswordChangeFirstLoginConfirmView.as_view(
                extra_context=extra_context_login_page,
                form_class=G3WSetPasswordForm),
            name='change_password_first_login_confirm'
        ),
        path(
            'changepassword/done/',
            auth.views.PasswordResetCompleteView.as_view(
                extra_context=extra_context_login_page),
            name='change_password_first_login_complete'
        ),
    ]

#############################################################
# API URLs
#############################################################
apiUrlpatterns += [
    path('', include('client.apiurls')),
    path('', include('core.apiurls')),
    path('', include('usersmanage.apiurls')),
    # TODO find out why we cannot include('OWS.apiurls') instead
    path('', include('OWS.urls')),
]

#############################################################
# BUILT-IN PLUGINS (project apps)
#############################################################
# Mapping rules:
#
# qdjango/urls.py      -->   admin/qdjango/*
# qdjango/apiurls.py   -->   qdjango/*
#############################################################

# if BASE_ADMIN_URLPATH:
#    base = BASE_ADMIN_URLPATH[0:-1]

for app in settings.G3WADMIN_PROJECT_APPS:

    # urls.py
    urlpatterns.append(
        path(
            '{}{}/'.format(BASE_ADMIN_URLPATH, app),
             include('{}.urls'.format(app))
        )
    )

    # apiurls.py
    try:
        apiUrlpatterns.append(
            path(
                '{}/'.format(app),
                include('{}.apiurls'.format(app))
            )
        )
    except Exception as e:
        pass

#############################################################
# CUSTOM PLUGINS (local more apps)
#############################################################
# Mapping rules:
#
# editing/urls.py      -->   admin/editing/*
# editing/apiurls.py   -->   editing/*
#############################################################
for app in settings.G3WADMIN_LOCAL_MORE_APPS:

    # urls.py
    if app != settings.FRONTEND_APP:
        app_urls = (urlconf_module, app_name, namespace) = include('{}.urls'.format(app))
        urlpatterns.append(
            path(
                '{}{}/'.format(BASE_ADMIN_URLPATH, app if not hasattr(urlconf_module, 'BASE_URLS') else urlconf_module.BASE_URLS),
                app_urls
            )
        )

    # apiurls.py
    try:
        app_urls = (urlconf_module, app_name, namespace) = include('{}.apiurls'.format(app))
        apiUrlpatterns.append(
            path(
                '{}/'.format(app if not hasattr(urlconf_module, 'BASE_URLS') else urlconf_module.BASE_URLS),
                app_urls
            )
        )
    except Exception as e:
        pass

#############################################################
# SITE PREFIX
#############################################################
if settings.SITE_PREFIX_URL:
    urlpatterns    = [ path('{}'.format(settings.SITE_PREFIX_URL), include(urlpatterns)) ]
    apiUrlpatterns = [ path('{}'.format(settings.SITE_PREFIX_URL), include(apiUrlpatterns)) ]

#############################################################
# LOCALIZED ROUTES
#############################################################
urlpatterns = i18n_patterns(*urlpatterns, prefix_default_language=settings.PREFIX_DEFAULT_LANGUAGE)

#############################################################
# DEV ROUTES
#############################################################
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += [ re_path(r'^static/(?P<path>.*)$', views.serve) ]

urlpatterns += apiUrlpatterns

register_i18n_trees(G3W_SITETREE_I18N_ALIAS)
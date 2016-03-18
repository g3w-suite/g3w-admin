"""qdjango2 URL Configuration

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/1.9/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  url(r'^$', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  url(r'^$', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.conf.urls import url, include
    2. Add a URL to urlpatterns:  url(r'^blog/', include('blog.urls'))
"""
from django.conf.urls import url,include
from django.contrib import admin, auth
from django.conf import settings
from django.conf.urls.static import static
from django.contrib.auth.decorators import login_required

urlpatterns = [
    url(r'^admin/', admin.site.urls),
    url(r'^',include('core.urls')),
    url(r'^',include('usersmanage.urls')),
    url(r'^',include('client.urls')),
    url(r'^',include('OWS.urls')),
    url(r'^upload/', include('django_file_form.urls')),

    url(r'^login/$', auth.views.login, name='login', kwargs={'template_name': 'login.html'}),
    url(r'^logout/$', auth.views.logout, {'next_page': settings.LOGOUT_NEXT_PAGE}, name='logout'),
]

#adding projects app
for app in settings.G3WADMIN_PROJECT_APPS:
    urlpatterns.append(url(r'^{}/'.format(app),include('{}.urls'.format(app))))

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)



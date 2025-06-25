from django.urls import path
from django.contrib.auth.decorators import login_required
from base.urls import G3W_SITETREE_I18N_ALIAS

from . import views

G3W_SITETREE_I18N_ALIAS.append('userscripts')

app_name = 'userscripts'

urlpatterns = [
    # List all user scripts
    path(
        '',
        login_required(views.ScriptList.as_view()),
        name='list'
    ),
    # Add a new user script
    path(
        'add/',
        login_required(views.ScriptAdd.as_view()),
        name='add'
    ),
    # Update an existing user script
    path(
        'update/<int:pk>/',
        login_required(views.ScriptUpdate.as_view()),
        name='update'
    ),
    # Toggle the active state of a user script
    path(
        'toggle/<int:pk>/',
        login_required(views.ScriptToggle.as_view()),
        name='toggle'
    ),
    # Delete a user script
    path(
        'delete/<int:pk>/',
        login_required(views.ScriptDelete.as_view()),
        name='delete'
    ),
    # Export a user script
    path(
        'export/<int:pk>/',
        login_required(views.ScriptExport.as_view()),
        name='export'
    ),
    # Export all user scripts
    path(
        'export_all/',
        login_required(views.ScriptExportAll.as_view()),
        name='export_all'
    ),
    # Import a user script
    path(
        'import/',
        login_required(views.ScriptImport.as_view()),
        name='import'
    ),
    # List all saved fixtures
    path(
        'fixtures/',
        login_required(views.ScriptFixtures.as_view()),
        name='fixtures'
    ),
]

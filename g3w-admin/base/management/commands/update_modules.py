from django.core.management.base import BaseCommand, CommandError
from django.apps import apps
from django.conf import settings
import git
import os


class Command(BaseCommand):
    help = 'Try to update everuy module by git command'

    def handle(self, *args, **options):

        base_git_repo_path = os.chdir(os.getcwd() + '/../')
        base_git_repo_path = os.getcwd()
        repo = git.Repo(base_git_repo_path)
        repo.remotes.origin.pull()
        self.stdout.write(self.style.SUCCESS('UPDATE BASE DONE'))
        g3wsuite_apps = settings.G3WADMIN_PROJECT_APPS + settings.G3WADMIN_LOCAL_MORE_APPS

        for g3wsuite_app in g3wsuite_apps:
            module_git_repo_path = os.chdir(base_git_repo_path + '/g3w-admin/{}'.format(g3wsuite_app))
            module_git_repo_path = os.getcwd()
            repo = git.Repo(module_git_repo_path)
            print repo.config_reader()
            repo.remotes.origin.pull()
            self.stdout.write(self.style.SUCCESS('UPDATE {} DONE'.format(g3wsuite_app)))


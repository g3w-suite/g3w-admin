from django.core.management.base import BaseCommand
from django.apps import apps
from django.conf import settings
try:
    import git
except:
    pass
import os


class Command(BaseCommand):
    """
    Commando for update everi modules in G3W-Suite application.
    """
    help = 'Try to update everuy module by git command'

    def add_arguments(self, parser):

        # Named (optional) arguments
        parser.add_argument(
            '--password',
            dest='password',
            default=None,
            help='Password for origin GIT repository',
        )

    def add_origin_password(self, config, password):

        # get origin url
        data_url = config.get_value('remote "origin"', 'url').split('@')

        # check if passoword just set
        if data_url[0].count(':') > 1:
            self.stdout.write(self.style.WARNING('Password already present!'))
            return

        data_url[0] = data_url[0] + ':' + password
        new_url = '@'.join(data_url)
        config.set_value('remote "origin"', 'url', new_url)

    def remove_origin_password(self, config):

        # get origin url
        data_url = config.get_value('remote "origin"', 'url').split('@')

        user_data = data_url[0].split(':')
        if len(user_data) == 2:
            self.stdout.write(self.style.WARNING('Password not present present!'))
            return
        new_url = '@'.join(':'.join(user_data[0:2]), data_url[1])
        config.set_value('remote "origin"', 'url', new_url)

    def handle(self, *args, **options):

        base_git_repo_path = os.chdir(os.getcwd() + '/../')
        base_git_repo_path = os.getcwd()
        repo = git.Repo(base_git_repo_path)

        if options['password']:
            config = repo.config_writer()

            # change origin url if password if submit:
            self.add_origin_password(config, options['password'])

        repo.remotes.origin.pull()
        self.stdout.write(self.style.SUCCESS('UPDATE BASE DONE'))
        g3wsuite_apps = settings.G3WADMIN_PROJECT_APPS + settings.G3WADMIN_LOCAL_MORE_APPS

        for g3wsuite_app in g3wsuite_apps:

            module_git_repo_path = os.chdir(base_git_repo_path + '/g3w-admin/{}'.format(g3wsuite_app))
            module_git_repo_path = os.getcwd()

            try:
                if options['password']:
                    app_config = repo.config_writer()

                    # change origin url if password if submit:
                    self.add_origin_password(app_config, options['password'])
                repo = git.Repo(module_git_repo_path)
                repo.remotes.origin.pull()
            except git.exc.InvalidGitRepositoryError:
                pass
            except Exception as e:
                print(e)
                continue
            self.stdout.write(self.style.SUCCESS('UPDATE {} DONE'.format(g3wsuite_app)))
            if options['password']:
                self.remove_origin_password(app_config)

        if options['password']:
            self.remove_origin_password(config)
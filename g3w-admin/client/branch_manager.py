from django.views.generic import View
from django.shortcuts import render
from django.http import JsonResponse
from django.core.exceptions import PermissionDenied
from django.conf import settings

import subprocess, os, threading, json, shutil
import logging

build_path = os.path.join(os.path.dirname(__file__), 'frontend', 'build')

# Override "static" folder (add a STATICFILES_DIRS for each plugin inside 'build' folder)
if os.path.exists(build_path):
    for folder in os.listdir(build_path):
        settings.STATICFILES_DIRS.append(os.path.join(build_path, folder, 'static'))

# Add a file handler if not already present
logger = logging.getLogger(__name__)

if not logger.handlers:
    file_handler = logging.FileHandler(os.path.join(os.path.dirname(__file__), 'branch_manager.log'), encoding='utf-8')
    file_handler.setFormatter(logging.Formatter('%(asctime)s %(levelname)s %(name)s %(message)s'))
    logger.addHandler(file_handler)
    logger.setLevel(logging.DEBUG)

class ClientBranchManagerView(View):
    template_name = "client/branch_manager.html"

    repo_dir = os.path.join(os.path.dirname(__file__), "frontend")
    thread_lock = os.path.join(os.path.dirname(__file__), "branch_manager.lock")
    
    logger = logging.getLogger(__name__)

    def dispatch(self, request, *args, **kwargs):
        """
        Limit access to super user
        """

        if not request.user.is_superuser:
            raise PermissionDenied("Access allowed only to superuser.")

        return super().dispatch(request, *args, **kwargs)

    def get(self, request, *args, **kwargs):
        """
        Get the list of "git branches"
        """

        # Ensure repository dir exists, otherwise clone it
        if not os.path.exists(self.repo_dir):
            try:
                self.run_command(f"git clone https://github.com/g3w-suite/g3w-client {self.repo_dir}")
                self.run_command(f"git config --global --add safe.directory {self.repo_dir}")
            except Exception as e:
                return JsonResponse({"status": "error", "message": f"Failed to clone repository: {str(e)}"})

        from django.contrib.auth.models import Permission

        permissions = Permission.objects.all()
        for permission in permissions:
            self.logger.info(permission.codename)

        # retrieve list of branches
        try:
            branches = [
                branch.strip().replace("origin/", "") for branch in self.run_command(f"git branch -r", logger=False).stdout.splitlines() if "origin/HEAD" not in branch
            ]
        except:
            branches = []

        return render(request, self.template_name, {
            "branches": branches,
            "current_branch": None if not os.path.exists(os.path.join(self.repo_dir, 'build')) else self.run_command("git rev-parse --abbrev-ref HEAD", logger=False).stdout.strip(),
            "branch_manager_log": self.branch_manager_log(),
            "thread_lock": os.path.exists(self.thread_lock),
        })

    def post(self, request, *args, **kwargs):
        """
        Handle branch selection, cloning, and build process
        """

        branch_name = request.POST.get("branch_name")

        try:
            if os.path.exists(self.thread_lock):
                raise Exception("Another process is already running.")

            # Ensure repository dir exists, otherwise clone it
            if not os.path.exists(self.repo_dir):
                self.run_command(f"git clone -b {branch_name} https://github.com/g3w-suite/g3w-client {self.repo_dir}")

            # Reset all local changes before switching branch
            self.run_command("git reset --hard")
            self.run_command("git clean -fd")
            self.run_command("git fetch")
            self.run_command(f"git checkout {branch_name}")
            self.run_command(f"git pull origin {branch_name}")

            self.fix_engines()                 # 1. Remove the 'engines' field from package.json
            self.clone_package_json()          # 2. Clone package.json to package-lock.json
            self.clone_config()                # 3. Clone and update config.template.js to config.js
            self.run_thread(self.build_client) # 3. Run "npm install" and "npm run build"

            return JsonResponse({
                "status": "success",
                "message": "Branch switching initiated. Build process running in background."
            })

        except Exception as e:
            return JsonResponse({
                "status": "error",
                "message": str(e)
            })

    def delete(self, request, *args, **kwargs):
        """
        Delete "build" folder (resetting "static" overrides)
        """
        try:
            self.run_thread(self.reset_client)
            return JsonResponse({
                "status": "success",
                "message": "Delete operation initiated."
            })
        except Exception as e:
            return JsonResponse({
                "status": "error",
                "message": str(e)
            })

    def patch(self, request, *args, **kwargs):
        """
        Clear the branch_manager.log file
        """
        try:
            # Find the log file
            log_file = None
            for handler in self.logger.handlers:
                if hasattr(handler, 'baseFilename'):
                    log_file = handler.baseFilename
            if log_file and os.path.exists(log_file):
                open(log_file, 'w').close()
                return JsonResponse({
                    "status": "success",
                    "message": "Log cleared successfully."
                })
            else:
                return JsonResponse({
                    "status": "error",
                    "message": "Log file not found."
                })
        except Exception as e:
            return JsonResponse({
                "status": "error",
                "message": str(e)
            })

    @staticmethod
    def run_command(cmd, env=None, logger=True):
        """
        Run a subprocess command and log stdout/stderr to the branch_manager logger.
        """

        cwd = ClientBranchManagerView.repo_dir
        
        if (logger):
            ClientBranchManagerView.logger.info(f'\x1b[0;32m{cmd}\x1b[0m')

        # Split commands by ' || ' and execute them sequentially
        if (' || ' in cmd):
            cmd = cmd.split(' || ')
            error = False
            for c in cmd:
                try:
                    error = False
                    ClientBranchManagerView.run_command(c, env=env)
                    break
                except Exception as e:
                    error = e
            if (error):
                raise e
            return

        try:
            result = subprocess.run(cmd, cwd=cwd, env=env, shell=True, capture_output=True, text=True, check=True)
            if logger and result.stdout:
                ClientBranchManagerView.logger.info(result.stdout)
            if logger and result.stderr:
                ClientBranchManagerView.logger.warning(result.stderr)
            return result
        except subprocess.CalledProcessError as e:
            ClientBranchManagerView.logger.error(f"Comand failed: {cmd}\nstdout: {e.stdout}\nstderr: {e.stderr}")
            raise
    
    @staticmethod
    def run_thread(target):
        SELF = ClientBranchManagerView

        if os.path.exists(SELF.thread_lock):
            raise Exception("Another process is already running.")

        thread = threading.Thread(target=target, daemon=True)
        thread.start()
        

    @staticmethod
    def build_client():
        """
        Install "node_modules" and then create "build" folder
        """
        SELF = ClientBranchManagerView
        try:
            if os.path.exists(SELF.thread_lock):
                SELF.logger.warning("Another process is already running.")
                return

            open(SELF.thread_lock, 'w').close()

            SELF.run_command("npm install || yarn install")                       # 1. npm install
            SELF.clone_package_json()                                             # 2. fix package.json
            SELF.run_command("npx gulp clone:plugins || yarn gulp clone:plugins") # 3. clone default plugins

            # Set safe directory
            plugins_dir = os.path.join(SELF.repo_dir, 'src', 'plugins')
            for plugin in os.listdir(plugins_dir):
                SELF.run_command(f"git config --global --add safe.directory {os.path.join(plugins_dir, plugin)}")

            SELF.run_command("npx gulp build:plugins || yarn gulp build:plugins", env={**os.environ, "G3W_PLUGINS": "editing"})
            SELF.run_command("npx gulp build:client || yarn gulp build:client")

            # if (not settings.DEBUG or os.path.ismount('/code')):
            #     SELF.run_command("python3 /code/g3w-admin/manage.py collectstatic --noinput")

        except Exception as e:
            SELF.logger.error(f"Exception: {e}")

        finally:
            if os.path.exists(SELF.thread_lock):
                os.remove(SELF.thread_lock)

    @staticmethod
    def reset_client():
        """
        Delete "build" folder (thus resetting "static" overrides)
        """
        SELF = ClientBranchManagerView
        try:

            if os.path.exists(SELF.thread_lock):
                SELF.logger.warning("Another process is already running.")
                return

            open(SELF.thread_lock, 'w').close()

            if not os.path.exists(os.path.join(SELF.repo_dir, 'build')):
                SELF.logger.info("'build' folder does not exist.")
                return

            shutil.rmtree(os.path.join(SELF.repo_dir, 'build'))

            SELF.logger.info("'build' folder deleted successfully.")

        except Exception as e:
            SELF.logger.error(f"Error while deleting the build folder: {str(e)}")

        finally:
            if os.path.exists(SELF.thread_lock):
                os.remove(SELF.thread_lock)

    @staticmethod
    def fix_engines():
        """
        Suppress invalid 'engines' from package.json
        """
        package_json_path = os.path.join(ClientBranchManagerView.repo_dir, 'package.json')

        try:
            with open(package_json_path, 'r') as file:
                package_data = json.load(file)

            # Remove the 'engines' field if it exists
            if 'engines' in package_data:
                del package_data['engines']

            with open(package_json_path, 'w') as file:
                json.dump(package_data, file, indent=2)

        except Exception as e:
            print(f"Error while removing 'engines' field: {e}")

    @staticmethod
    def clone_package_json():
        """
        Fix missing package-lock.json.
        """
        try:
            with open(os.path.join(ClientBranchManagerView.repo_dir, 'package.json'), 'r') as file:
                package_data = json.load(file)
            with open(os.path.join(ClientBranchManagerView.repo_dir, 'package-lock.json'), 'w') as file:
                json.dump(package_data, file, indent=2)
        except Exception as e:
            print(f"Error while cloning package.json to package-lock.json: {e}")

    @staticmethod
    def clone_config():
        """
        Create config.js from config.template.js
        """
        SELF = ClientBranchManagerView
        try:
            with open(os.path.join(SELF.repo_dir, 'config.template.js'), 'r') as file:
                config_data = file.read()

            # Update variables to be relative to the current file
            updated_config = config_data.replace(
                '../g3w-admin/g3w-admin',
                './build'
            ).replace(
                '../g3w-suite-docker/config/g3w-suite/overrides',
                './build/overrides'
            ).replace(
                '../g3w-suite-docker/shared-volume/plugins',
                ''
            )

            with open(os.path.join(SELF.repo_dir, 'config.js'), 'w') as file:
                file.write(updated_config)

        except Exception as e:
            print(f"Error while cloning and updating config.template.js: {e}")

        try:
            with open(os.path.join(SELF.repo_dir, 'gulpfile.js'), 'r') as file:
                config_data = file.read()

            # Force production = True
            updated_config = config_data.replace(
                'let production   = false;',
                'let production   = true;'
            )

            with open(os.path.join(SELF.repo_dir, 'gulpfile.js'), 'w') as file:
                file.write(updated_config)

        except Exception as e:
            print(f"Error while cloning and updating gulpfile.js: {e}")
    
    @staticmethod
    def branch_manager_log():
        """
        Retrieve saved logs from "branch_manager.log" file
        """
        branch_manager_log = ''

        # Retrieve the log file if the logger writes to a file
        log_file = next((h.baseFilename for h in ClientBranchManagerView.logger.handlers if hasattr(h, 'baseFilename')), None)

        if log_file and os.path.exists(log_file):
            with open(log_file, 'r', encoding='utf-8') as f:
                branch_manager_log = f.read()

        return branch_manager_log \
            .replace('\x1b[0;32m','<b>') \
            .replace('\x1b[0m', '</b>') \
            .replace('INFO', ' <b style="color:cyan;">INFO</b> ') \
            .replace('WARNING', ' <b style="color:yellow;">WARNING</b> ') \
            .replace('ERROR ', ' <b style="color:purple;">ERROR</b> ')
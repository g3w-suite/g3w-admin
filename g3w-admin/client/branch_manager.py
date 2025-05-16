from django.views.generic import View
from django.shortcuts import render
from django.http import JsonResponse
from django.core.exceptions import PermissionDenied
from django.conf import settings

import subprocess, os, threading, json, shutil

build_path = os.path.join(os.path.dirname(__file__), 'frontend', 'build')

# Ovveride "static" folder (add a STATICFILES_DIRS for each plugin inside 'build' folder)
if os.path.exists(build_path):
    for folder in os.listdir(build_path):
        settings.STATICFILES_DIRS.append(os.path.join(build_path, folder, 'static'))

class ClientBranchManagerView(View):
    template_name = "client/branch_manager.html"

    repo_dir = os.path.join(os.path.dirname(__file__), "frontend")
    thread_lock = os.path.join(os.path.dirname(__file__), "branch_manager.lock")
    thread_log = os.path.join(os.path.dirname(__file__), "branch_manager.log")

    def dispatch(self, request, *args, **kwargs):
        """
        limit access to super user
        """

        if not request.user.is_superuser:
            raise PermissionDenied("Access allowed only to superuser.")

        return super().dispatch(request, *args, **kwargs)

    def get(self, request, *args, **kwargs):
        """
        Get the list of "git branches"
        """
        # Ensures log file existance
        if not os.path.exists(self.thread_log):
            open(self.thread_log, 'w').close()

        with open(self.thread_log, 'a') as out:

            # Ensure repository dir exists, otherwise clone it
            if not os.path.exists(self.repo_dir):
                try:
                    subprocess.run(["git", "clone", "https://github.com/g3w-suite/g3w-client", self.repo_dir], check=True, stdout=out, stderr=out)
                    subprocess.run(["git", "config", "--global", "--add", "safe.directory", self.repo_dir], check=True, stdout=out, stderr=out)
                except subprocess.CalledProcessError as e:
                    return JsonResponse({"status": "error", "message": f"Failed to clone repository: {str(e)}"})

            # retrieve list of branches
            try:
                branches = subprocess.check_output(["git", "branch", "-r"], cwd=self.repo_dir, text=True)
                branches = [branch.strip().replace("origin/", "") for branch in branches.splitlines() if "origin/HEAD" not in branch]
            except subprocess.CalledProcessError:
                branches = []

            # retrieve last log
            if os.path.exists(self.thread_log):
                with open(self.thread_log, 'r', encoding='utf-8') as f:
                    branch_manager_log = f.read()
            else:
                branch_manager_log = ''

            # Render the page with the list of branches e il log
            return render(request, self.template_name, {
                "branches": branches,
                "current_branch": None if not os.path.exists(os.path.join(self.repo_dir, 'build')) else subprocess.check_output(["git", "rev-parse", "--abbrev-ref", "HEAD"], cwd=self.repo_dir, text=True).strip(),
                "branch_manager_log": branch_manager_log
            })

    def post(self, request, *args, **kwargs):
        """
        Handle branch selection, cloning, and build process
        """

        branch_name = request.POST.get("branch_name")

        # Ensures log file existance
        if not os.path.exists(self.thread_log):
            open(self.thread_log, 'w').close()

        try:
            with open(self.thread_log, 'a') as out:

                if os.path.exists(self.thread_lock):
                    return JsonResponse({
                        "status": "error",
                        "message": "Another process is already running."
                    })

                # If the repository directory exists, reset all changes before switching branch
                if os.path.exists(self.repo_dir):
                    # Undo all local changes and remove untracked files
                    subprocess.run(["git", "reset", "--hard"], cwd=self.repo_dir, check=True, stdout=out, stderr=out)
                    subprocess.run(["git", "clean", "-fd"], cwd=self.repo_dir, check=True, stdout=out, stderr=out)
                    subprocess.run(["git", "fetch"], cwd=self.repo_dir, check=True, stdout=out, stderr=out)
                    subprocess.run(["git", "checkout", branch_name], cwd=self.repo_dir, check=True, stdout=out, stderr=out)
                    subprocess.run(["git", "pull", "origin", branch_name], cwd=self.repo_dir, check=True, stdout=out, stderr=out)
                else:
                    # Clone the repository
                    subprocess.run(["git", "clone", "-b", branch_name, "https://github.com/g3w-suite/g3w-client", self.repo_dir], check=True, stdout=out, stderr=out)

                # Remove the 'engines' field from package.json
                self.fix_engines(self.repo_dir)

                # Clone package.json to package-lock.json
                self.clone_package_json(self.repo_dir)

                # Clone and update config.template.js to config.js
                self.clone_config(self.repo_dir)

                # Run yarn install and build in a thread
                threading.Thread(target=self.build_client, args=(self.repo_dir, self.thread_lock, self.thread_log)).start()

                return JsonResponse({
                    "status": "success",
                    "message": "Branch switching initiated. Build process running in background."
                })
        except subprocess.CalledProcessError as e:
            return JsonResponse({
                "status": "error",
                "message": str(e)
            })

    def delete(self, request, *args, **kwargs):
        """
        Delete "build" folder (resetting "static" overrides)
        """

        if os.path.exists(self.thread_lock):
            return JsonResponse({
                "status": "error",
                "message": "Another process is already running."
            })

        threading.Thread(target=self.reset_client, args=(self.repo_dir, self.thread_lock, self.thread_log)).start()

        return JsonResponse({
            "status": "success",
            "message": "Delete operation initiated."
        })

    @staticmethod
    def build_client(repo_dir, thread_lock, thread_log):
        """
        Install "node_modules" and then create "build" folder
        """
        try:
            if os.path.exists(thread_lock):
                with open(thread_log, 'a') as f:
                    f.write("Another process is already running.\n")
                return

            open(thread_lock, 'w').close()

            with open(thread_log, 'a') as out:
                # Run npm install
                try:
                    subprocess.run(["npm", "install"], cwd=repo_dir, check=True, stdout=out, stderr=out)
                except FileNotFoundError:
                    try:
                        subprocess.run(["yarn", "install"], cwd=repo_dir, check=True, stdout=out, stderr=out)
                    except subprocess.CalledProcessError as e:
                        out.write(f"Error during yarn install: {e}\n")

                ClientBranchManagerView.clone_package_json(repo_dir)

                env = os.environ.copy()
                env["G3W_PLUGINS"] = "editing"
                
                # Clone default plugins
                try:
                    subprocess.run(["npx", "gulp", "clone:plugins"], cwd=repo_dir, check=True, stdout=out, stderr=out)
                except FileNotFoundError:
                    try:
                        subprocess.run(["yarn", "gulp", "clone:plugins"], cwd=repo_dir, check=True, stdout=out, stderr=out)
                    except subprocess.CalledProcessError as e:
                        out.write(f"Error while cloning default plugins: {e}\n")

                # set safe directory
                plugins_dir = os.path.join(repo_dir, 'src', 'plugins')
                for plugin in os.listdir(plugins_dir):
                    subprocess.run(["git", "config", "--global", "--add", "safe.directory", os.path.join(plugins_dir, plugin)], check=True, stdout=out, stderr=out)

                # Run npm build
                try:
                    subprocess.run(["npx", "gulp", "build:plugins"], cwd=repo_dir, env=env, check=True, stdout=out, stderr=out)
                    subprocess.run(["npx", "gulp", "build:client"], cwd=repo_dir, check=True, stdout=out, stderr=out)
                except FileNotFoundError:
                    try:
                        subprocess.run(["yarn", "gulp", "build:plugins"], cwd=repo_dir, env=env, check=True, stdout=out, stderr=out)
                        subprocess.run(["yarn", "gulp", "build:client"], cwd=repo_dir, check=True, stdout=out, stderr=out)
                    except subprocess.CalledProcessError as e:
                        out.write(f"Error during yarn build: {e}\n")
        except Exception as e:
            with open(thread_log, 'a') as out:
                out.write(f"Exception: {e}\n")
        finally:
            if os.path.exists(thread_lock):
                os.remove(thread_lock)

    @staticmethod
    def reset_client(repo_dir, thread_lock, thread_log):
        """
        Delete "build" folder (thus resetting "static" overrides)
        """

        if os.path.exists(thread_lock):
            with open(thread_log, 'a') as f:
                f.write("Another process is already running.\n")
            return
        try:
            open(thread_lock, 'w').close()
            with open(thread_log, 'a') as out:
                if os.path.exists(os.path.join(repo_dir, 'build')):
                    shutil.rmtree(os.path.join(repo_dir, 'build'))
                    out.write("'build' folder deleted successfully.\n")
                else:
                    out.write("'build' folder does not exist.\n")
        except Exception as e:
            with open(thread_log, 'a') as out:
                out.write(f"Error deleting 'build' folder: {str(e)}\n")
        finally:
            if os.path.exists(thread_lock):
                os.remove(thread_lock)


    @staticmethod
    def fix_engines(repo_dir):
        """
        Supress invalid 'engines' from package.json
        """
        package_json_path = os.path.join(repo_dir, 'package.json')
        
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
    def clone_package_json(repo_dir):
        """
        Fix missing package-lock.json.
        """
        try:
            with open(os.path.join(repo_dir, 'package.json'), 'r') as file:
                package_data = json.load(file)
            with open(os.path.join(repo_dir, 'package-lock.json'), 'w') as file:
                json.dump(package_data, file, indent=2)
        except Exception as e:
            print(f"Error while cloning package.json to package-lock.json: {e}")

    @staticmethod
    def clone_config(repo_dir):
        """
        Create config.js from config.template.jsconfig.js
        """
        try:
            with open(os.path.join(repo_dir, 'config.template.js'), 'r') as file:
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

            with open(os.path.join(repo_dir, 'config.js'), 'w') as file:
                file.write(updated_config)

        except Exception as e:
            print(f"Error while cloning and updating config.template.js: {e}")

        try:
            with open(os.path.join(repo_dir, 'gulpfile.js'), 'r') as file:
                config_data = file.read()

            # Force production = True
            updated_config = config_data.replace(
                'let production   = false;',
                'let production   = true;'
            )

            with open(os.path.join(repo_dir, 'gulpfile.js'), 'w') as file:
                file.write(updated_config)

        except Exception as e:
            print(f"Error while cloning and updating gulpfile.js: {e}")

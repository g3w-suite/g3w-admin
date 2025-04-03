from guardian.decorators import permission_required_or_403

from django.core.exceptions import ValidationError
from django.core.serializers import serialize 
from django.views.generic import ListView, View
from django.views.generic.edit import CreateView, DeleteView, UpdateView
from django.http import JsonResponse, HttpResponse
from django.http.response import HttpResponseRedirect
from django.shortcuts import get_object_or_404
from django.urls import reverse_lazy
from django.utils.decorators import method_decorator
from django.utils.translation import gettext as _

from .forms import UserScriptForm
from .models import UserScript

from io import BytesIO
from pathlib import Path
import yaml, zipfile

class ScriptBase(object):
    """
    Base class for UserScript views, including form handling and permissions.
    """
    form_class = UserScriptForm
    success_url = reverse_lazy('userscripts:list')
    model = UserScript
    template_name = 'userscripts/userscript_form.html'

    @method_decorator(permission_required_or_403('qdjango.change_project'))
    def dispatch(self, request, *args, **kwargs):
        return super().dispatch(request, *args, **kwargs)

    def get_form_kwargs(self):
        kwargs = super().get_form_kwargs()
        return kwargs


class ScriptList(ScriptBase, ListView):
    template_name = 'userscripts/userscript_list.html'
    context_object_name = 'scripts'


class ScriptAdd(ScriptBase, CreateView):
    pass

class ScriptUpdate(ScriptBase, UpdateView):
    pass

class ScriptDelete(ScriptBase, DeleteView):
    def post(self, request, *args, **kwargs):
        self.object = self.get_object()
        self.object.delete()
        return JsonResponse({"success": True})


class ScriptToggle(ScriptBase, View):
    def get(self, request, *args, **kwargs):
        script = get_object_or_404(UserScript, pk=self.kwargs.get('pk'))
        script.is_active = not script.is_active
        script.save()
        return HttpResponseRedirect(reverse_lazy('userscripts:list'))


class ScriptExport(ScriptBase, View):
    def get(self, request, *args, **kwargs):
        script = get_object_or_404(UserScript, pk=self.kwargs.get('pk'))

        return HttpResponse(
            yaml.dump([
                { k: v for k, v in obj.items() if k != 'pk' } # remove primary key
                for obj in yaml.safe_load(serialize('yaml', [script], use_natural_primary_keys=True))
            ], default_flow_style=False),
            content_type='application/x-yaml',
            headers={'Content-Disposition': f'attachment; filename="{script.name}.yaml"'}
        )


class ScriptExportAll(ScriptBase, View):
    def get(self, request, *args, **kwargs):
        scripts = UserScript.objects.all()

        # Create userscripts archive
        zip_buffer = BytesIO()
        with zipfile.ZipFile(zip_buffer, 'w') as zip_file:
            for script in scripts:
                zip_file.writestr(
                    f"{script.name}.yaml",
                    yaml.dump([
                        { k: v for k, v in obj.items() if k != 'pk' } # remove primary key
                        for obj in yaml.safe_load(serialize('yaml', [script], use_natural_primary_keys=True))
                    ], default_flow_style=False)
                )
        zip_buffer.seek(0)

        return HttpResponse(
            zip_buffer,
            content_type='application/zip',
            headers={'Content-Disposition': 'attachment; filename="userscripts.zip"'},
        )


class ScriptImport(View):
    def post(self, request, *args, **kwargs):
        try:
            file = request.FILES.get('file')

            if not file:
                return JsonResponse({"error": _("No file uploaded.")}, status=400)

            # Validate YAML content
            data = yaml.safe_load(file.read().decode('utf-8')) 
            if not isinstance(data, list) or not data:
                return JsonResponse({"error": _("Invalid YAML format.")}, status=400)

            # Deserialize fixture data
            for obj_data in data:

                if obj_data.get('model') != 'userscripts.userscript':
                    continue

                fields = obj_data.get('fields', {})

                # Handle userscript name collision
                script_name = request.POST.get('script_name', fields.get('name'))

                if not script_name:
                    return JsonResponse({"error": _("Script name is missing.")}, status=400)

                # Check if another script with the same name exists
                script = UserScript.objects.filter(name=script_name).first()

                if script and not request.POST.get('script_name', ''):
                    return JsonResponse({
                        "conflict": script_name,
                        "error": _("A script with same name already exists.")
                    })

                # Use "script_name" as userscript name
                fields['name'] = script_name

                # Replace the existing script
                if script:
                    for key, value in fields.items():
                        setattr(script, key, value)
                    script.save()
                else:
                    script = UserScript.objects.create(**fields)

            # Respond with saved script.pk
            return JsonResponse({ "success": True, "script_id": script.pk })

        except (yaml.YAMLError, ValidationError, TypeError) as e:
            return JsonResponse({ "error": str(e)}, status=400)

        except Exception as e:
            return JsonResponse({ "error": _("An unexpected error occurred.") }, status=500)


class ScriptFixtures(View):
    def get(self, request, *args, **kwargs):
        try:
            # Relative path to "fixtures" directory
            fixtures_dir = Path(__file__).resolve().parent / 'fixtures'
            fixture_name = request.GET.get('fixture', '')

            # Return the content of specificied fixture as a file
            fixture_path = fixtures_dir / fixture_name
            if fixture_name and not fixture_path.exists():
                return JsonResponse({"error": _("Fixture not found.")}, status=404)
            elif fixture_name:
                return HttpResponse(
                    fixture_path.read_text(),
                    content_type='application/x-yaml',
                    headers={'Content-Disposition': f'attachment; filename="{fixture_name}"'}
                )

            # Otherwise, return the list of fixtures
            return JsonResponse({"fixtures": [
                f.name for f in fixtures_dir.iterdir() if f.is_file() and f.suffix == '.yaml'
            ]}, safe=False)
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=500)
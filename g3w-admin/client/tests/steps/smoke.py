from glob import glob
from pathlib import Path

from behave import given, then, when


REPOSITORY_ROOT = Path(__file__).resolve().parents[4]
SERVER_URL = "https://dev.g3wsuite.it/"


@given("matching local static files are used for the development server")
def use_local_static_files(context):
    static_roots = [Path(path) for path in glob(str(REPOSITORY_ROOT / "**" / "static"), recursive=True)]

    def handle_route(route, request):
        relative_path = request.url.split(SERVER_URL)[1].split("?")[0].removeprefix("static/")
        match = next((root / relative_path for root in static_roots if (root / relative_path).is_file()), None)
        if match:
            route.fulfill(path=match)
        else:
            route.continue_()

    context.page.route("**/static/**", handle_route)


@when("the development expression map is opened")
def open_expression_map(context):
    context.page.goto(SERVER_URL + "/map/expression/")
    context.errors = []
    context.page.on("pageerror", lambda error: context.errors.append(error.message))
    context.page.on(
        "console",
        lambda message: context.errors.append(message.text) if message.type == "error" else None,
    )


@then("the application and its plugins finish loading")
def wait_for_application(context):
    context.page.wait_for_function("() => typeof window.g3w !== 'undefined'", timeout=15000)
    context.page.wait_for_function(
        "() => window.g3w.app.isready && 0 === window.g3w.state.plugins.length",
        timeout=30000,
    )


@then("the editing plugin is available")
def editing_plugin_is_available(context):
    assert context.page.evaluate("() => !!window.g3w.app.getPlugin('editing')"), \
        "g3w.app.getPlugin('editing') is UNDEFINED"


@then("no JavaScript errors are reported after navigation")
def no_javascript_errors(context):
    assert not context.errors, "\n".join(context.errors)

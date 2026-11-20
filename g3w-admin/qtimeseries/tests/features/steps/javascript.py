import json

from behave import given, then, when
from playwright.sync_api import expect


@given("the project layers are")
def project_layers(context):
    context.layers = json.loads(context.text)


@given('"{first}" and "{second}" belong to a mutually-exclusive group')
def mutually_exclusive_layers(context, first, second):
    context.exclusive_groups = [[first, second]]


@given('only "{layer_id}" is checked on the TOC')
def checked_toc_layer(context, layer_id):
    context.checked_layers = [layer_id]


@given("no layers are checked on the TOC")
def no_checked_toc_layers(context):
    context.checked_layers = []


@given('both "{first}" and "{second}" are checked on the TOC')
def both_checked_toc_layers(context, first, second):
    context.checked_layers = [first, second]


@given('only "{layer_id}" is visible on the TOC')
def visible_toc_layer(context, layer_id):
    context.visible_layers = [layer_id]


@given('a temporal layer with unit "{unit}" and step {step:d}')
def temporal_layer(context, unit, step):
    context.layers = [{
        "id": "rain",
        "qtimeseries": {
            "units": unit,
            "step": step,
            "field": "observed",
            "start_date": "2024-01-01T00:00:00",
            "end_date": "2024-01-11T00:00:00",
        },
    }]


@given("the plugin is disabled for this project")
def disable_plugin(context):
    context.enabled = False


@given("the host interface is not ready")
def delay_interface(context):
    context.gui_ready = False


@when("the time series plugin starts")
def start_plugin(context):
    context.page.evaluate("options => startPlugin(options)", {
        "layers": context.layers,
        "exclusiveGroups": getattr(context, "exclusive_groups", []),
        "checkedLayers": getattr(context, "checked_layers", None),
        "visibleLayers": getattr(context, "visible_layers", None),
        "enabled": getattr(context, "enabled", True),
        "guiReady": getattr(context, "gui_ready", True),
    })


@when("the host interface becomes ready")
def interface_ready(context):
    context.page.evaluate("resolveGuiReady()")


@then('the registered temporal layer is "{layer_id}" with unit "{unit}" and multiplier {multiplier:d}')
def registered_layer(context, layer_id, unit, multiplier):
    result = context.page.evaluate("""() => testState.plugin.config.layers.map(layer => ({
      id: layer.id, name: layer.name, wmsname: layer.wmsname,
      unit: layer.options.stepunit, multiplier: layer.options.stepunitmultiplier,
      start: layer.start_date.format('YYYY-MM-DD HH:mm:ss'),
      end: layer.end_date.format('YYYY-MM-DD HH:mm:ss'),
    }))""")
    assert result == [{
        "id": layer_id, "name": f"Layer {layer_id}", "wmsname": f"wms_{layer_id}",
        "unit": unit, "multiplier": multiplier,
        "start": "2024-01-01 00:00:00", "end": "2024-01-11 00:00:00",
    }], result


@then('its step is {step:d} and its field is "{field}"')
def layer_options(context, step, field):
    options = context.page.evaluate("testState.plugin.config.layers[0].options")
    assert options["step"] == step, options
    assert options["field"] == field, options


@then("its date range has {intervals:d} intervals")
def date_range(context, intervals):
    actual = context.page.evaluate("testState.plugin.config.layers[0].options.range_max")
    assert actual == intervals, actual


@then("the time series sidebar is available")
def sidebar_available(context):
    expect(context.page.get_by_role("button", name="Open time series", exact=True)).to_be_visible()
    assert context.page.evaluate("testState.ready") is True
    assert context.page.evaluate("testState.sidebar.id") == "qtimeseries"


@then("the time series sidebar is unavailable")
def sidebar_unavailable(context):
    expect(context.page.locator("#open-sidebar")).to_be_hidden()
    assert context.page.evaluate("testState.ready === undefined")


@then("plugin loading has finished")
def loading_finished(context):
    result = context.page.evaluate("""() => ({
      name: testState.options.name, gid: testState.gid, loading: testState.loading,
    })""")
    assert result == {"name": "qtimeseries", "gid": "qdjango:1", "loading": [True, False]}, result


@when("I open the time series sidebar")
def open_sidebar(context):
    context.page.get_by_role("button", name="Open time series", exact=True).click()
    expect(context.page.locator("#timeserieslayer")).to_be_visible()
    if context.page.evaluate("testState.panels[0].internalPanel.current_layers.length"):
        context.page.wait_for_function("testState.updates.length > 0")
    panel_id = context.page.evaluate("testState.panels[0].id")
    assert panel_id == "qtimeseries-panel", panel_id


@when('I select time layer "{layer_id}"')
def select_time_layer(context, layer_id):
    context.page.evaluate("""id => {
      const component = testState.panels[0].internalPanel;
      const selected_options = [
        ...component.current_layers.map(layer => ({ value: layer.id })),
        { value: id },
      ];
      component.changeLayers({ target: { selected_options } });
    }""", layer_id)


@then('only time layer "{layer_id}" is selected and checked')
def selected_and_checked_layer(context, layer_id):
    context.page.wait_for_function("""layerId => {
      const component = testState.panels[0].internalPanel;
      return component.current_layers.some(layer => layer.id === layerId) &&
        [...testState.projectLayers.values()].some(layer =>
          layer.state.id === layerId && layer.state.checked
        );
    }""", arg=layer_id)
    result = context.page.evaluate("""() => {
      const component = testState.panels[0].internalPanel;
      return {
        selected: component.current_layers.map(layer => layer.id),
        checked: [...testState.projectLayers.values()]
          .filter(layer => layer.state.checked)
          .map(layer => layer.state.id),
      };
    }""")
    assert result == {"selected": [layer_id], "checked": [layer_id]}, result


@then("no time layer is selected")
def no_time_layer_selected(context):
    result = context.page.evaluate("""() => ({
      selected: testState.panels[0].internalPanel.current_layers.map(layer => layer.id),
      updates: testState.updates,
    })""")
    assert result == {"selected": [], "updates": []}, result
    placeholder = context.page.locator("#qtimeseries-layer-placeholder")
    expect(placeholder).to_be_visible()
    expect(placeholder).to_have_text("Choose a layer")
    fields = context.page.locator("#panel fieldset .form-control")
    expect(fields).to_have_count(4)
    for field in fields.all():
        expect(field).to_be_visible()
        expect(field).to_be_disabled()
        expect(field).to_have_value("")
    expect(context.page.locator("#qtimeseries-range")).to_be_visible()
    expect(context.page.locator("#qtimeseries-range")).to_be_disabled()
    expect(context.page.locator(".qtimeseries-buttons button:disabled")).to_have_count(7)


@then("the time controls are available")
def time_controls_available(context):
    expect(context.page.locator("#qtimeseries-layer-placeholder")).to_have_count(0)
    expect(context.page.locator("#qtimeseries-range")).to_be_enabled()
    expect(context.page.locator("#qtimeseries-step")).to_have_value("1")
    expect(context.page.locator("#panel fieldset .date input").first).to_have_value("2024-01-01 00:00:00")
    expect(context.page.locator(".qtimeseries-buttons button").nth(4)).to_be_enabled()


@then('only time layer "{layer_id}" is selected')
def selected_layer(context, layer_id):
    selected = context.page.evaluate("testState.panels[0].internalPanel.current_layers.map(layer => layer.id)")
    assert selected == [layer_id], selected


@then('the map time window is "{window}"')
def map_time_window(context, window):
    context.page.wait_for_function(
        "expected => testState.updates.at(-1)?.TIME === expected", arg=window,
    )
    assert context.page.evaluate("testState.updates.at(-1).id") == "rain"


@when("I close the time series panel")
def close_panel(context):
    context.page.get_by_role("button", name="Close time series", exact=True).click()


@then("the sidebar is closed and the map time filter is removed")
def panel_closed(context):
    context.page.wait_for_function("""() =>
      testState.sidebar.open === false &&
      testState.updates.at(-1).TIME === undefined &&
      testState.plugin.config.layers.every(layer => !layer.timed)
    """)
    expect(context.page.locator("#qtimeseries-range")).to_have_count(0)


@when("I move one step forward")
def step_forward(context):
    context.page.locator(".qtimeseries-buttons button").nth(5).click()


@when("I move one step backward")
def step_backward(context):
    context.page.locator(".qtimeseries-buttons button").nth(1).click()


@when("I move the time slider to {value:d}")
def move_slider(context, value):
    slider = context.page.locator("#qtimeseries-range")
    slider.fill(str(value))
    slider.dispatch_event("change")


@when("I play the animation for one second")
def play_animation(context):
    context.page.clock.install()
    context.page.locator(".qtimeseries-buttons button").nth(4).click()
    context.page.clock.run_for(1000)


@when("I pause the animation")
def pause_animation(context):
    context.page.locator(".qtimeseries-buttons button").nth(3).click()
    context.paused_updates = context.page.evaluate("testState.updates.length")


@then("the time window stays unchanged for two seconds")
def animation_paused(context):
    context.page.clock.run_for(2000)
    assert context.page.evaluate("testState.updates.length") == context.paused_updates
    assert context.page.evaluate("testState.panels[0].internalPanel.status") == 0

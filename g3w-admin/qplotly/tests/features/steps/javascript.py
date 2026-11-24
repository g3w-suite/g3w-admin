from behave import then


@then("chart actions use their own hosts and recover from failed mounting")
def relation_host_and_failure(context):
    result = context.page.evaluate("""async () => {
      const first = document.querySelector('#first');
      const second = document.querySelector('#second');
      const firstAction = makeRelationAction(first);
      const action = makeRelationAction(second);
      testPlugin.getCharts = async () => { throw new Error('chart failed'); };
      await action.cbk();
      const failed = {
        first: first.children.length, second: second.children.length,
        toggled: action.state.toggled, disabled: action.state.disabled,
        listeners: testPlugin.events['change-charts'].length, message: testMessages[0].message,
      };
      testPlugin.getCharts = async () => ({
        charts: { plot: [{ data: null, tools: { selection: {}, filter: {} } }] }, order: ['plot'],
      });
      await action.cbk();
      const drawFailed = {
        second: second.children.length, toggled: action.state.toggled, loading: testPlugin.state.loading,
        listeners: testPlugin.events['change-charts'].length, message: testMessages[1].message,
      };
      testPlugin.getCharts = async () => ({ charts: {}, order: [] });
      await action.cbk();
      const divider = second.querySelector('[role="separator"]');
      divider.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
      await Vue.nextTick();
      const opened = {
        first: first.children.length, second: second.children.length, toggled: action.state.toggled,
        width: divider.getAttribute('aria-valuenow'), resizes: testResizes,
      };
      await action.clear();
      testContents.pop();
      await firstAction.cbk();
      const restored = { first: first.children.length, second: second.children.length };
      await firstAction.clear();
      testContents.pop();
      const missingAction = makeRelationAction();
      await missingAction.cbk();
      const missing = { toggled: missingAction.state.toggled, disabled: missingAction.state.disabled, message: testMessages[2].message };
      return { failed, drawFailed, opened, restored, missing, remaining: first.children.length + second.children.length, listeners: testPlugin.events['change-charts'].length };
    }""")
    assert result == {
        "failed": {"first": 0, "second": 0, "toggled": False, "disabled": False, "listeners": 0, "message": "chart failed"},
        "drawFailed": {"second": 0, "toggled": False, "loading": False, "listeners": 0, "message": "Failed to load chart data"},
        "opened": {"first": 0, "second": 1, "toggled": True, "width": "35", "resizes": 1},
        "restored": {"first": 1, "second": 0},
        "missing": {"toggled": False, "disabled": False, "message": "Relation chart container not found"},
        "remaining": 0,
        "listeners": 0,
    }, result


@then("clearing an action waits for the chart to finish mounting")
def pending_mount_cleanup(context):
    result = context.page.evaluate("""async () => {
      const host = document.querySelector('#second');
      const action = makeRelationAction(host);
      let finish;
      testPlugin.getCharts = () => new Promise(resolve => { finish = resolve; });
      const opening = action.cbk();
      while (!finish) await new Promise(resolve => setTimeout(resolve, 0));
      const clearing = action.clear();
      finish({ charts: {}, order: [] });
      await Promise.all([opening, clearing]);
      return { children: host.children.length, toggled: action.state.toggled, listeners: testPlugin.events['change-charts'].length };
    }""")
    assert result == {"children": 0, "toggled": False, "listeners": 0}, result


@then("a failed pending mount still releases the chart host")
def failed_pending_mount_cleanup(context):
    result = context.page.evaluate("""async () => {
      const host = document.querySelector('#second');
      const action = makeRelationAction(host);
      let fail;
      testPlugin.getCharts = () => new Promise((resolve, reject) => { fail = reject; });
      const opening = action.cbk();
      while (!fail) await new Promise(resolve => setTimeout(resolve, 0));
      const clearing = action.clear();
      fail(new Error('chart failed'));
      const outcomes = await Promise.allSettled([opening, clearing]);
      return {
        outcomes: outcomes.map(outcome => outcome.status), children: host.children.length,
        toggled: action.state.toggled, listeners: testPlugin.events['change-charts'].length,
        message: testMessages[0].message,
      };
    }""")
    assert result == {
        "outcomes": ["fulfilled", "rejected"], "children": 0, "toggled": False,
        "listeners": 0, "message": "chart failed",
    }, result


@then("row chart actions release every opened host")
def row_chart_cleanup(context):
    result = context.page.evaluate("""async () => {
      const action = makeRowAction();
      const hosts = [document.querySelector('#first'), document.querySelector('#second')];
      testPlugin.getCharts = async () => ({ charts: {}, order: [] });
      await action.cbk({}, { attributes: { fid: 1 } }, action, 0, hosts[0]);
      await action.cbk({}, { attributes: { fid: 2 } }, action, 1, hosts[1]);
      const opened = hosts.map(host => host.children.length);
      await action.clear();
      return {
        opened, remaining: hosts.map(host => host.children.length),
        toggled: [action.state.toggled[0], action.state.toggled[1]],
        listeners: testPlugin.events['change-charts'].length,
      };
    }""")
    assert result == {"opened": [1, 1], "remaining": [0, 0], "toggled": [False, False], "listeners": 0}, result


@then("clearing a row action waits for its pending chart")
def pending_row_chart_cleanup(context):
    result = context.page.evaluate("""async () => {
      const action = makeRowAction();
      const host = document.querySelector('#first');
      let finish;
      testPlugin.getCharts = () => new Promise(resolve => { finish = resolve; });
      const opening = action.cbk({}, { attributes: { fid: 1 } }, action, 0, host);
      const clearing = action.clear();
      while (!finish) await new Promise(resolve => setTimeout(resolve, 0));
      finish({ charts: {}, order: [] });
      await Promise.all([opening, clearing]);
      return { children: host.children.length, toggled: action.state.toggled[0], listeners: testPlugin.events['change-charts'].length };
    }""")
    assert result == {"children": 0, "toggled": False, "listeners": 0}, result


@then("the chart retains a usable plot area and can be scrolled")
def narrow_relation_chart(context):
    context.page.add_script_tag(url=f"{context.base_url}/qplotly/static/qplotly/plotly-1.52.2.min.js")
    context.page.route("**/qplotly/api/trace-config/**", lambda route: route.fulfill(json={"data": {}}))
    result = context.page.evaluate("""async () => {
      const host = document.querySelector('#second');
      host.style.cssText = 'display:flex; width:200px; height:400px';
      const action = makeRelationAction(host);
      testPlugin.getCharts = async () => ({
        charts: { plot: [{
          title: 'Cost analysis',
          data: [{ type: 'box', x: ['Plant replacement', 'Insulation', 'Renovation'], y: [2500, 4500, 3000] }],
          tools: { selection: {}, filter: {} },
        }] },
        order: ['plot'],
      });
      await action.cbk();
      const content = host.querySelector('.plot-content');
      const plot = content?.querySelector('.js-plotly-plot');
      content?.focus();
      const result = {
        opened: action.state.toggled,
        focusable: document.activeElement === content,
        horizontalScroll: content && content.scrollWidth > content.clientWidth,
        width: plot?.clientWidth,
        height: plot?.clientHeight,
        xLength: plot?._fullLayout.xaxis._length,
        yLength: plot?._fullLayout.yaxis._length,
        messages: testMessages,
      };
      await action.clear();
      return result;
    }""")
    assert result["opened"], result
    assert result["focusable"], result
    assert result["horizontalScroll"], result
    assert result["width"] >= 250 and result["height"] >= 250, result
    assert result["xLength"] > 0 and result["yLength"] > 0, result
    assert result["messages"] == [], result

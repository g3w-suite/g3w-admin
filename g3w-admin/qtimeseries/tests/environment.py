from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread

from playwright.sync_api import sync_playwright


ADMIN_ROOT = Path(__file__).resolve().parents[2]


def before_all(context):
    browser_name = context.config.userdata.get("browser", "chromium")
    if browser_name not in {"chromium", "firefox", "webkit"}:
        raise ValueError(f"Unsupported browser: {browser_name}")
    headless = context.config.userdata.get("headless", "true").lower()
    if headless not in {"true", "false"}:
        raise ValueError("headless must be true or false")

    handler = partial(SimpleHTTPRequestHandler, directory=str(ADMIN_ROOT))
    server = ThreadingHTTPServer(("127.0.0.1", 0), handler)
    thread = Thread(target=server.serve_forever, daemon=True)
    thread.start()

    def stop_server():
        server.shutdown()
        server.server_close()
        thread.join()

    context.add_cleanup(stop_server)
    context.base_url = f"http://127.0.0.1:{server.server_port}"
    playwright = sync_playwright().start()
    context.add_cleanup(playwright.stop)
    context.browser = getattr(playwright, browser_name).launch(headless=headless == "true")
    context.add_cleanup(context.browser.close)


def before_scenario(context, scenario):
    browser_context = context.browser.new_context(timezone_id="UTC")
    context.add_cleanup(browser_context.close)
    context.page = browser_context.new_page()
    context.errors = []
    context.page.on("pageerror", lambda error: context.errors.append(str(error)))
    context.page.on(
        "console",
        lambda message: context.errors.append(message.text) if message.type == "error" else None,
    )
    context.page.goto(f"{context.base_url}/qtimeseries/tests/browser/index.html")
    context.page.wait_for_function("window.startPlugin !== undefined")


def after_scenario(context, scenario):
    assert not context.errors, "\n".join(context.errors)

from playwright.sync_api import sync_playwright


def before_all(context):
    playwright = sync_playwright().start()
    context.add_cleanup(playwright.stop)
    context.browser = playwright.chromium.launch()
    context.add_cleanup(context.browser.close)


def before_scenario(context, scenario):
    browser_context = context.browser.new_context()
    context.add_cleanup(browser_context.close)
    context.page = browser_context.new_page()

"""
Test your local Django admin static files (development) against a remote server (production)
"""

import sys

from playwright.sync_api import sync_playwright

SERVER_URL = 'https://dev.g3wsuite.it/'

def main():
    print("Starting script")
    with sync_playwright() as p:
        browser = p.chromium.launch()
        context = browser.new_context()
        page = context.new_page()

        # replace remote static files with local ones
        def handle_route(route, request):
            url = request.url
            print(f"Intercepting: {url}")
            if 'static/' in url:
                relative_path = url.split(SERVER_URL)[1]
                # Use Django-like logic: find the file in any **/static/** location
                import glob
                matches = glob.glob('**/' + relative_path, recursive=True)
                if matches:
                    local_path = matches[0]  # Take the first match
                    print(True, local_path)
                    route.fulfill(path=local_path)
                else:
                    print(False, relative_path)
                    route.continue_()
            else:
                route.continue_()

        page.route('**/**', handle_route)

        print("Going to page")
        page.goto(SERVER_URL + '/map/expression/')

        # check for JS errors
        errors = []
        page.on('pageerror', lambda error: errors.append(error.message))
        page.on('console', lambda msg: errors.append(msg.text) if msg.type == 'error' else None)

        print("Waiting for g3w")
        # Wait for g3w JS to load
        page.wait_for_function("() => typeof window.g3w !== 'undefined'", timeout=15000)

        print("Waiting for plugins")
        # wait for all plugins loaded
        page.wait_for_function("() => window.g3w.app.isready && 0 === window.g3w.state.plugins.length", timeout=30000)
        editing = page.evaluate("() => !!window.g3w.app.getPlugin('editing')")

        print("Checking editing plugin")
        # ASSERT: editing plugin is loaded
        if not editing:
            errors.append("g3w.app.getPlugin('editing') is UNDEFINED")

        print("Dumping errors")
        # dump errors
        if errors:
            print('Errors:', errors)
            sys.exit(1)

        print("Script completed successfully")
        context.close()
        browser.close()

if __name__ == '__main__':
    main()
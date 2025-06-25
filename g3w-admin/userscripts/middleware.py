import re
from bs4 import BeautifulSoup, MarkupResemblesLocatorWarning
from .models import UserScript

import logging

logger = logging.getLogger('g3wadmin.debug')

class UserScriptsMiddleware:

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        try:
            # Inject custom HTML content using BeautifulSoup
            if (hasattr(response, 'content') and response.get('Content-Type', '').startswith('text/html')):
                soup = BeautifulSoup(response.content.decode('utf-8'), 'html.parser')

                # Retrieve all userscripts related to current URL
                for script in [
                    script for script in UserScript.objects.filter(is_active=True)
                    if script.match and re.search(script.match, request.path)
                ]:
                    tag = {
                        'css': f"<style id=\"userscript-{script.id}\">{script.code}</style>",
                        'js': f"<script id=\"userscript-{script.id}\">{script.code}</script>"
                    }.get(script.type, script.code)

                    if script.run_at == 'head_start' and soup.head:
                        soup.head.insert(0, BeautifulSoup(tag, 'html.parser'))
                    elif script.run_at == 'head_end' and soup.head:
                        soup.head.append(BeautifulSoup(tag, 'html.parser'))
                    elif script.run_at == 'body_start' and soup.body:
                        soup.body.insert(0, BeautifulSoup(tag, 'html.parser'))
                    elif script.run_at == 'body_end' and soup.body:
                        soup.body.append(BeautifulSoup(tag, 'html.parser'))

                # Convert the modified soup back to a string and remove leading and trailing spaces
                response.content = str(soup.prettify(formatter="html").strip()).encode('utf-8')
        except (MarkupResemblesLocatorWarning, UnicodeDecodeError):
            logger.warning(f"[UserScriptsMiddleware] failed to parse response content for: {request.path}\n")

        return response

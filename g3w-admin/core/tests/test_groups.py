from django.core.urlresolvers import reverse
from django.urls import resolve
from django.test import TestCase


class SignUpTests(TestCase):
    def test_signup_status_code(self):
        url = reverse('group-list')
        response = self.client.get(url)
        self.assertEquals(response.status_code, 200)

    '''
    def test_signup_url_resolves_signup_view(self):
        view = resolve('/signup/')
        self.assertEquals(view.func, signup)
    '''

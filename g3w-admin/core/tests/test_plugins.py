from pathlib import Path
from tempfile import TemporaryDirectory

from django.apps import apps
from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from django.urls import reverse


class DefaultPluginsIntegrationTest(TestCase):
    def setUp(self):
        user = get_user_model().objects.create_superuser(
            username='plugin-admin', password='password', email=''
        )
        self.client.force_login(user)

    def test_default_plugins_are_active(self):
        for app in (
            'filemanager',
            'qplotly',
            'qtimeseries'
        ):
            with self.subTest(app=app):
                self.assertTrue(apps.is_installed(app), f'{app} is not active')

    def test_filemanager_lists_files(self):
        with TemporaryDirectory() as directory:
            Path(directory, 'example.txt').write_text('example', encoding='utf-8')
            with override_settings(FILEMANAGER_ROOT_PATH=directory):
                response = self.client.get(
                    reverse('filemanager-logic'), {'mode': 'readfolder', 'path': '/'}
                )
        self.assertEqual(response.status_code, 200)
        self.assertEqual([item['id'] for item in response.json()['data']], ['/example.txt'])

    def test_qplotly_downloads_saved_widget(self):
        from qplotly.models import QplotlyWidget

        xml = '<plot>integration</plot>'
        widget = QplotlyWidget.objects.create(title='Integration', xml=xml)
        response = self.client.get(reverse('qplotly-download-xml', args=[widget.pk]))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(b''.join(response.streaming_content), xml.encode())

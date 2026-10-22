# coding=utf-8
"""Test for UserMediaHandler class

.. note:: This program is free software; you can redistribute it and/or modify
     it under the terms of the Mozilla Public License 2.0.
"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2025-12-22'
__copyright__ = 'Copyright 2025, GIS3W'

import os
import json
import tempfile
from io import BytesIO
from unittest.mock import Mock, patch, MagicMock

from django.test import TestCase, RequestFactory, override_settings
from django.conf import settings
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse

from qdjango.vector import UserMediaHandler
from qdjango.models import Layer
from core.api.base.vector import MetadataVectorLayer
from core.utils.db import build_dango_connection_name
from core.utils.vector import BaseUserMediaHandler

from .base import QdjangoTestBase, CURRENT_PATH, TEST_BASE_PATH, DATASOURCE_PATH


@override_settings(
    CACHES={
        'default': {
            'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
            'LOCATION': 'some',
        }
    },
    DATASOURCE_PATH=DATASOURCE_PATH,
    LANGUAGE_CODE='en',
    LANGUAGES=(
        ('en', 'English'),
    ),
    MEDIA_ROOT='/tmp/g3wsuite_test_media/',
    MEDIA_URL='/media/',
    USER_MEDIA_ROOT='/tmp/g3wsuite_test_media/user_media/'
)
class UserMediaHandlerTest(QdjangoTestBase):
    """Test UserMediaHandler functionality"""

    def setUp(self):
        super().setUp()
        
        # Create request factory
        self.factory = RequestFactory()
        
        # Create test directories
        os.makedirs(settings.MEDIA_ROOT, exist_ok=True)
        os.makedirs(settings.USER_MEDIA_ROOT, exist_ok=True)
        
        # Get a layer with edittypes for testing
        self.layer = self.project.instance.layer_set.first()
        
        # Mock layer edittypes for ExternalResource
        self.layer.edittypes = json.dumps({
            'photo': {
                'widgetv2type': 'ExternalResource',
                'fieldEditable': '1'
            },
            'document': {
                'widgetv2type': 'ExternalResource',
                'fieldEditable': '1'
            }
        })
        self.layer.save()

    def tearDown(self):
        super().tearDown()
        # Clean up test media directories
        import shutil
        if os.path.exists(settings.MEDIA_ROOT):
            shutil.rmtree(settings.MEDIA_ROOT, ignore_errors=True)

    def test_build_fs_path(self):
        """Test build_fs_path static method"""
        media_url = '/media/temp_uploads/1/test.jpg'
        expected = '/tmp/g3wsuite_test_media/temp_uploads/1/test.jpg'
        result = BaseUserMediaHandler.build_fs_path(media_url)
        self.assertEqual(result, expected)

    def test_init_handler(self):
        """Test UserMediaHandler initialization"""
        request = self.factory.get('/')
        request.user = self.test_user1
        
        feature = {
            'id': 1,
            'properties': {
                'name': 'Test Feature',
                'photo': '/media/test.jpg'
            }
        }
        
        handler = UserMediaHandler(
            file_name='test.jpg',
            layer=self.layer,
            feature=feature,
            request=request
        )
        
        self.assertEqual(handler.file_name, 'test.jpg')
        self.assertEqual(handler.layer, self.layer)
        self.assertEqual(handler.feature_properties, feature['properties'])
        self.assertEqual(handler.request, request)

    def test_set_layer_md5_source(self):
        """Test set_layer_md5_source method"""
        request = self.factory.get('/')
        request.user = self.test_user1
        
        handler = UserMediaHandler(
            layer=self.layer,
            request=request
        )
        
        handler.set_layer_md5_source()
        
        # Check that md5 source is generated
        self.assertIsNotNone(handler.layer_md5_source)
        expected_md5 = build_dango_connection_name(self.layer.datasource)
        self.assertEqual(handler.layer_md5_source, expected_md5)

    def test_get_file_name(self):
        """Test get_file_name method"""
        handler = UserMediaHandler()
        
        # Test with full URL
        uri = 'http://example.com/media/uploads/test_image.jpg'
        result = handler.get_file_name(uri)
        self.assertEqual(result, 'test_image.jpg')
        
        # Test with path
        uri = '/media/temp_uploads/5/photo.png'
        result = handler.get_file_name(uri)
        self.assertEqual(result, 'photo.png')
        
        # Test with None
        result = handler.get_file_name(None)
        self.assertIsNone(result)

    def test_get_path_to_save(self):
        """Test get_path_to_save method"""
        request = self.factory.get('/')
        request.user = self.test_user1
        
        handler = UserMediaHandler(
            layer=self.layer,
            request=request
        )
        
        handler.set_layer_md5_source()
        path = handler.get_path_to_save()
        
        expected_path = f'{settings.USER_MEDIA_ROOT}qdjango/{handler.layer_md5_source}'
        self.assertEqual(path, expected_path)

    def test_get_domain(self):
        """Test get_domain method"""
        # Test with HTTP
        request = self.factory.get('/', HTTP_HOST='localhost:8000')
        request.user = self.test_user1
        
        handler = UserMediaHandler(request=request)
        domain = handler.get_domain()
        self.assertEqual(domain, 'http://localhost:8000')
        
        # Test with HTTPS
        request = self.factory.get('/', HTTP_HOST='example.com', secure=True)
        request.user = self.test_user1
        
        handler = UserMediaHandler(request=request)
        domain = handler.get_domain()
        self.assertEqual(domain, 'https://example.com')

    def test_new_path(self):
        """Test _new_path method"""
        request = self.factory.get('/')
        request.user = self.test_user1
        
        handler = UserMediaHandler(
            layer=self.layer,
            request=request
        )
        
        handler.set_layer_md5_source()
        file_name = 'test_photo.jpg'
        path = handler._new_path(file_name)
        
        # Check that path is a valid URL pattern
        self.assertIn('/me/', path)
        self.assertIn('qdjango', path)
        self.assertIn(handler.layer_md5_source, path)
        self.assertIn(file_name, path)

    def test_new_value_create_new_file(self):
        """Test new_value method for creating new file"""
        
        request = self.factory.post('/')
        request.user = self.test_user1
        
        # Create a temporary file in temp_uploads
        temp_file_path = f'{settings.MEDIA_ROOT}temp_uploads/{self.test_user1.pk}/new_photo.jpg'
        os.makedirs(os.path.dirname(temp_file_path), exist_ok=True)
        with open(temp_file_path, 'wb') as f:
            f.write(b'test image content')
        
        feature = {
            'id': '_new_1',  # New feature
            'properties': {
                'name': 'Test',
                'photo': f'{settings.MEDIA_URL}temp_uploads/{self.test_user1.pk}/new_photo.jpg'
            }
        }
        
        handler = UserMediaHandler(
            layer=self.layer,
            feature=feature,
            request=request
        )
        
        handler.new_value()
        
        # Check that feature property was updated with new URL
        self.assertIn('http://', feature['properties']['photo'])
        self.assertIn('/me/', feature['properties']['photo'])

    def test_new_value_update_existing_file(self):
        """Test new_value method for updating existing file"""

        
        request = self.factory.post('/')
        request.user = self.test_user1
        
        # Mock metadata_layer and get_feature
        mock_metadata_layer = MagicMock()
        mock_old_feature = {
            'photo': f'{settings.MEDIA_URL}user-media/qdjango/old_hash/old_photo.jpg'
        }
        mock_metadata_layer.get_feature.return_value = mock_old_feature
        mock_metadata_layer.layer = self.layer

        # Create a temporary file in temp_uploads
        temp_file_path = f'{settings.MEDIA_ROOT}temp_uploads/{self.test_user1.pk}/new_photo.jpg'
        os.makedirs(os.path.dirname(temp_file_path), exist_ok=True)
        with open(temp_file_path, 'wb') as f:
            f.write(b'test image content')
        
        feature = {
            'id': 1,  # Existing feature
            'properties': {
                'name': 'Test',
                'photo': f'{settings.MEDIA_URL}temp_uploads/{self.test_user1.pk}/new_photo.jpg'
            }
        }
        
        handler = UserMediaHandler(
            layer=self.layer,
            metadata_layer=mock_metadata_layer,
            feature=feature,
            request=request
        )
        
        handler.new_value()



    def test_new_value_with_duplicate_filename(self):
        """Test new_value handles duplicate filenames by adding suffix"""
        request = self.factory.post('/')
        request.user = self.test_user1
        
        handler = UserMediaHandler(
            layer=self.layer,
            request=request
        )
        
        handler.set_layer_md5_source()
        
        # Create directory structure
        path_to_save = handler.get_path_to_save()
        os.makedirs(path_to_save, exist_ok=True)
        
        # Create existing file
        existing_file = os.path.join(path_to_save, 'photo.jpg')
        with open(existing_file, 'wb') as f:
            f.write(b'existing content')
        
        # Create temp file
        temp_file_path = f'{settings.MEDIA_ROOT}temp_uploads/{self.test_user1.pk}/photo.jpg'
        os.makedirs(os.path.dirname(temp_file_path), exist_ok=True)
        with open(temp_file_path, 'wb') as f:
            f.write(b'new content')
        
        feature = {
            'id': '_new_1',
            'properties': {
                'photo': f'{settings.MEDIA_URL}temp_uploads/{self.test_user1.pk}/photo.jpg'
            }
        }
        
        handler = UserMediaHandler(
            layer=self.layer,
            feature=feature,
            request=request
        )
        
        handler.new_value()
        
        # Check that filename was modified with suffix
        self.assertIn('photo_', feature['properties']['photo'])

    def test_new_value_delete_file(self):
        """Test new_value method for deleting file (empty value sent)"""
        request = self.factory.post('/')
        request.user = self.test_user1
        
        handler = UserMediaHandler(
            layer=self.layer,
            request=request
        )
        
        handler.set_layer_md5_source()
        
        # Create directory and file to delete
        path_to_save = handler.get_path_to_save()
        os.makedirs(path_to_save, exist_ok=True)
        file_to_delete = os.path.join(path_to_save, 'old_photo.jpg')
        with open(file_to_delete, 'wb') as f:
            f.write(b'old content')
        
        # Mock metadata_layer
        mock_metadata_layer = MagicMock()
        mock_old_feature = {
            'photo': f'{settings.MEDIA_URL}user-media/qdjango/{handler.layer_md5_source}/old_photo.jpg'
        }
        mock_metadata_layer.get_feature.return_value = mock_old_feature
        mock_metadata_layer.layer = self.layer
        
        feature = {
            'id': 1,
            'properties': {
                'photo': ''  # Empty value = delete
            }
        }
        
        handler = UserMediaHandler(
            layer=self.layer,
            metadata_layer=mock_metadata_layer,
            feature=feature,
            request=request
        )
        
        handler.new_value()
        
        # Verify file was deleted
        self.assertFalse(os.path.exists(file_to_delete))

    def test_change_value(self):
        """Test change_value method"""
        request = self.factory.post('/')
        request.user = self.test_user1
        
        handler = UserMediaHandler(
            layer=self.layer,
            request=request
        )
        
        # Call change_value (should set layer_md5_source)
        handler.change_value()
        
        self.assertIsNotNone(handler.layer_md5_source)

    # def test_send_file(self, mock_send_file):
    #     """Test send_file method"""

    #     request = self.factory.get('/')
    #     request.user = self.test_user1
        
    #     handler = UserMediaHandler(
    #         file_name='test.jpg',
    #         layer=self.layer,
    #         request=request
    #     )
        
    #     handler.send_file()
        
    #     # Verify send_file was called
    #     self.assertTrue(mock_send_file.called)

    def test_send_file_with_ds_md5(self):
        """Test send_file method when layer is not found but ds_md5 is provided"""
        request = self.factory.get('/')
        request.user = self.test_user1
        
        handler = UserMediaHandler(
            file_name='test.jpg',
            layer=None,  # No layer
            ds_md5='abc123hash',
            request=request
        )

        # Create file to send
        path_to_save = f'{settings.USER_MEDIA_ROOT}{handler.type}/{handler.ds_md5}'
        os.makedirs(path_to_save, exist_ok=True)
        file_path = os.path.join(path_to_save, 'test.jpg')
        with open(file_path, 'wb') as f:
            f.write(b'content to send')
        
        response = handler.send_file()
        
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response['Content-Disposition'], 'inline; filename="test.jpg"')


    def test_new_value_with_change_mode(self):
        """Test new_value with change=True returns current value with mime_type"""

        request = self.factory.post('/')
        request.user = self.test_user1
        
        handler = UserMediaHandler(
            layer=self.layer,
            request=request
        )
        
        handler.set_layer_md5_source()
        
        # Create existing file
        path_to_save = handler.get_path_to_save()
        os.makedirs(path_to_save, exist_ok=True)
        file_path = os.path.join(path_to_save, 'existing.jpg')
        with open(file_path, 'wb') as f:
            f.write(b'existing content')
        
        feature = {
            'id': 1,
            'properties': {
                'photo': f'{settings.MEDIA_URL}user-media/qdjango/{handler.layer_md5_source}/existing.jpg'
            }
        }
        
        handler = UserMediaHandler(
            layer=self.layer,
            feature=feature,
            request=request
        )
        
        handler.new_value(change=True)
        
        # Check that property is now a dict with value and mime_type
        self.assertIsInstance(feature['properties']['photo'], dict)
        self.assertIn('value', feature['properties']['photo'])
        self.assertIn('mime_type', feature['properties']['photo'])

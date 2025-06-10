from django.conf import settings
from django.urls import reverse, resolve
from . import file_path_mime
from .response import send_file
from .db import build_dango_connection_name
import urllib.request, urllib.parse, urllib.error
import os
import shutil
import logging

logger = logging.getLogger('module_core')


class BaseUserMediaHandler(object):
    """
    Class to handle input/output user media file uploaded in editing mode
    """

    type = 'qdjango'
    datasource_field = 'datasource'

    @staticmethod
    def build_fs_path(property):
        """Build fs path for file from uploading url"""

        return f"{settings.MEDIA_ROOT}{property.replace(settings.MEDIA_URL, '')}"

    def __init__(self, file_name=None, layer=None, metadata_layer=None, feature=None, request=None):

        self.file_name = file_name

        # set layer
        if hasattr(metadata_layer, 'layer'):
            self.layer = metadata_layer.layer
        else:
            self.layer = layer

        self.metadata_layer = metadata_layer

        # set feature by type if presente 'properties' or not
        if feature:
            self.feature_properties = feature['properties'] if 'properties' in feature else feature
        self.feature = feature

        self.request = request


    def set_layer_md5_source(self):
        """ Create a unique md5 identification name from layer name and its datasource """
        self.layer_md5_source = build_dango_connection_name(getattr(self.layer, self.datasource_field)) \
            if self.layer else None

    def get_current_instance(self):
        """
        Get current layer to save instance
        """
        if type(self.feature['id']) == str and self.feature['id'].startswith('_new_'):
            return None
        else:
            return self.metadata_layer.get_feature(pk=self.feature['id']) if self.metadata_layer else None
            # and type(self.feature['id']) == int else None

    def get_file_name(self, uri):
        """ Get filename from media uri sent by client """
        try:
            return uri.split('/')[-1]
        except:
            return None

    def get_path_to_save(self):
        """ Get and build local path to save media """
        return '{}{}/{}'.format(settings.USER_MEDIA_ROOT, self.type, self.layer_md5_source)

    def get_domain(self):
        """ Get current domain within G3W-SUITE running """
        schema = 'https' if self.request.is_secure() else 'http'

        host = self.request.get_host()

        try:
            domain, port = host.split(':')
        except ValueError as e:
            domain = host
            port = '80'

        # for docker HTTP_X_FORWARDED_HOST:
        if schema == 'http' and port == '443':
            return '{}://{}'.format('https', domain)
        else:
            return '{}://{}'.format(schema, self.request.get_host())

    def _new_path(self, file_name):
        """ Build new path to save media file """

        return reverse('user-media', kwargs={
                                'project_type': self.type,
                                'layer_id': self.layer.pk,
                                'file_name': file_name
                                })

    def new_value(self, change=False):
        """ Build and save media value from client """

        self.set_layer_md5_source()
        current_instance = self.get_current_instance()
        edittypes = self.layer.get_edittypes() if self.layer.edittypes else {}

        for field, data in list(edittypes.items()):
            if data['widgetv2type'] == 'ExternalResource' and field in self.feature_properties:

                # new field_name
                file_name = self.get_file_name(self.feature_properties[field])
                if file_name:
                    file_name = urllib.parse.unquote(file_name)

                path_to_save = self.get_path_to_save()
                path_file_to_save = '{}/{}'.format(path_to_save, file_name)

                # Check if it is a user-media view
                url_path = urllib.parse.urlparse(self.feature_properties[field]).path
                is_media_view = bool(url_path) and url_path.startswith(f'{settings.MEDIA_URL}temp_uploads/')

                if change:
                    if self.feature_properties[field]:
                        self.feature_properties[field] = {
                            'value': self.feature_properties[field],
                            'mime_type': file_path_mime(path_file_to_save) if os.path.exists(path_file_to_save)
                            else None
                        }

                else:

                    # check if editing or deleting, checking if self.layer has 'field' property not empty.
                    try:
                        current_field_value = current_instance[field]
                    except:
                        current_field_value = None

                    current_file_name = self.get_file_name(current_field_value) if current_instance else None
                    if current_file_name:
                        current_file_name = urllib.parse.unquote(current_file_name)

                    if file_name:
                        if current_file_name:

                            # Case update with new media file
                            if current_file_name != file_name:
                                save, delete_old = True, True
                            else:
                                save, delete_old = False, False
                        else:

                            # Case newone media file
                            save, delete_old = True if is_media_view else False, False
                    else:
                        # No file submit: delete the old
                        save, delete_old = False, True

                    if save:

                        # path to save media file
                        path_to_file_tmp = BaseUserMediaHandler.build_fs_path(self.feature_properties[field])

                        if not os.path.isdir(path_to_save):
                            os.makedirs(path_to_save)

                        # for upload of the same image or doc during parallel attribute editing
                        # move delete fo temp uploaded files at the end of commit workflow.
                        shutil.copy(path_to_file_tmp, path_file_to_save)

                        # build new value

                        self.feature_properties[field] = '{}{}'.format(self.get_domain(),
                                                                       self._new_path(file_name))
                    else:
                        if is_media_view:

                            value = current_field_value
                            # Try to fix old record saved with temp_uploads path
                            if os.path.exists(path_file_to_save):
                                value = self._new_path(file_name)

                            # Restore to current_feature value
                            self.feature_properties[field] = value

                    if delete_old:
                        to_delete = '{}/{}'.format(path_to_save, current_file_name)
                        if os.path.exists(to_delete) and os.path.isfile(to_delete):
                            os.remove(to_delete)

    def change_value(self):

        self.set_layer_md5_source()


    def send_file(self):
        """ Send current media saved """
        self.set_layer_md5_source()
        file_path = '{}/{}'.format(self.get_path_to_save(), self.file_name)
        return send_file(self.file_name, file_path_mime(file_path), file_path, False)




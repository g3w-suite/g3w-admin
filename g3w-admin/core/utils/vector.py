from django.conf import settings
from django.urls import reverse
from . import file_path_mime
from .response import send_file
from .db import build_dango_connection_name
import urllib.request, urllib.parse, urllib.error
import os
import shutil


class BaseUserMediaHandler(object):
    """
    Class to handle input/output user media file uploaded in editing mode
    """

    type = 'qdjango'
    datasource_field = 'datasource'

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
        self.layer_md5_source = build_dango_connection_name(getattr(self.layer, self.datasource_field)) \
            if self.layer else None

    def get_current_instance(self):
        """
        Get current layer to save instance
        """
        return self.metadata_layer.get_feature(pk=self.feature['id']) if self.metadata_layer and \
                                                                        type(self.feature['id']) == int else None

    def get_file_name(self, uri):
        try:
            return uri.split('/')[-1]
        except:
            return None

    def get_path_to_save(self):
        return '{}{}/{}'.format(settings.USER_MEDIA_ROOT, self.type, self.layer_md5_source)

    def get_domain(self):

        schema = 'https' if self.request.is_secure() else 'http'
        return '{}://{}'.format(schema, self.request.get_host())

    def new_value(self, change=False):

        self.set_layer_md5_source()
        current_instance = self.get_current_instance()
        edittypes = eval(self.layer.edittypes)

        for field, data in list(edittypes.items()):
            if data['widgetv2type'] == 'ExternalResource' and field in self.feature_properties:

                # new field_name
                file_name = self.get_file_name(self.feature_properties[field])
                if file_name:
                    file_name = urllib.parse.unquote(file_name)

                path_to_save = self.get_path_to_save()
                path_file_to_save = '{}/{}'.format(path_to_save, file_name)

                if change:
                    if self.feature_properties[field]:
                        self.feature_properties[field] = {
                            'value': self.feature_properties[field],
                            'mime_type': file_path_mime(path_file_to_save) if os.path.exists(path_file_to_save)
                            else None
                        }

                else:

                    # check if editing or deleting, checking if self.layer has 'field' property not empty.
                    current_field_value = getattr(current_instance, field) if current_instance else None
                    current_field_name = self.get_file_name(current_field_value) if current_instance else None
                    if current_field_name:
                        current_field_name = urllib.parse.unquote(current_field_name)



                    if file_name:
                        if current_field_name:
                            if current_field_name != file_name:
                                save, delete_old = True, True
                            else:
                                save, delete_old = False, False
                        else:
                            save, delete_old = True, False
                    else:
                        save, delete_old = False, True


                    if save:

                        # path to save media file
                        path_to_file_tmp = '{}{}'.format(settings.MEDIA_ROOT,
                                                         self.feature_properties[field].replace(settings.MEDIA_URL, ''))

                        if not os.path.isdir(path_to_save):
                            os.makedirs(path_to_save)

                        shutil.move(path_to_file_tmp, path_file_to_save)

                        # build new value

                        self.feature_properties[field] = '{}{}'.format(self.get_domain(),
                                    reverse('user-media', kwargs={
                                        'project_type': self.type,
                                        'layer_id': self.layer.pk,
                                        'file_name': file_name
                                }))

                    if delete_old:
                        to_delete = '{}/{}'.format(path_to_save, current_field_name)
                        if os.path.exists(to_delete):
                            os.remove(to_delete)

    def change_value(self):

        self.set_layer_md5_source()
        edittypes = eval(self.layer.edittypes)


    def send_file(self):

        self.set_layer_md5_source()
        file_path = '{}/{}'.format(self.get_path_to_save(), self.file_name)
        return send_file(self.file_name, file_path_mime(file_path), file_path, False)




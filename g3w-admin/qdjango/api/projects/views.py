# coding=utf-8
""""Qdjango project api views

.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2020-10-09'
__copyright__ = 'Copyright 2015 - 2020, Gis3w'

import json

from django.conf import settings
from django.shortcuts import (
    get_object_or_404,
    Http404
)
from django.urls import reverse
from django.db.models import Q
from django.core.files.storage import default_storage
from core.api.authentication import CsrfExemptSessionAuthentication
from core.utils.response import send_file
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from guardian.shortcuts import get_anonymous_user
from core.api.base.views import G3WAPIView
from core.api.permissions import ProjectPermission
from qdjango.api.projects.permissions import ProjectIsActivePermission
from qdjango.apps import get_qgs_project
from qdjango.models import (
    Project, CustomerTheme
)
from qdjango.signals import reading_layer_model
from qdjango.utils.models import get_view_layer_ids
from .danticmodels import ThemeProjectPDModel


from osgeo import gdal, osr
import tempfile
import time

import logging

logger = logging.getLogger('g3wadmin.debug')


class QdjangoWebServicesAPIview(G3WAPIView):
    """API return Project WEB services available"""

    def get(self, request, **kwargs):

        # get project instance
        try:
            project = get_object_or_404(Project, pk=kwargs['project_id'])
            layers = project.layer_set.all()

            # build OGC service
            # check status with anonymous permission
            ogc_access_status = 'free' if get_anonymous_user().has_perm('qdjango.view_project', project) else 'locked'
            res = {
                'WMS': {
                    'url': reverse('OWS:ows', args=[project.group.slug, 'qdjango', project.pk]),
                    'access': ogc_access_status
                }
            }

            # add url alias if url map alias is set
            alias = project.url_alias
            if alias:
                res['WMS']['alias'] = reverse('OWS:ows-alias', args=[alias])

            # check if WFS layers is active
            wfs = False
            tms_layers = []
            for layer in layers:
                if layer.wfscapabilities is not None:
                    wfs = True

                # check for layer with TMS cache active and other service by signals
                messages = reading_layer_model.send(layer)
                for msg in messages:
                    if msg[1] and 'TMS' in msg[1]:
                        tms_layers.append({
                            'name': layer.name,
                            'url': msg[1]['TMS']['url']
                        })

            if wfs:
                res.update({
                    'WFS': res['WMS'],

                    # Add OGC API - Features (WFS3)
                    'OGC API - Feature (WFS3)': {
                        'url': f"{res['WMS']['url']}wfs3/",
                        'access': res['WMS']['access']
                    }

                })


            if len(tms_layers) > 0:
                res.update({
                    'TMS': tms_layers
                })

            self.results.results.update({
                'data': res
            })

        except Http404 as e:
            self.results.error = str(e)
            self.results.result = False

        return Response(self.results.results)


class QdjangoAsGeoTiffAPIview(G3WAPIView):
    """
    Given a image and bbox from server return a GeoTiff images.
    """

    authentication_classes = (
        CsrfExemptSessionAuthentication,
    )

    def post(self, request, **kwargs):

        # Only POST for this API

        # Instance project
        try:
            project = get_object_or_404(Project, pk=kwargs['project_id'])

            bbox = request.POST.get('bbox', '')

            if not bbox or bbox == '':
                raise Exception("'bbox' parameter must not be empty")

            try:
                xmin, ymin, xmax, ymax = bbox.split(',')
                xmin = float(xmin)
                ymin = float(ymin)
                xmax = float(xmax)
                ymax = float(ymax)

            except ValueError as e:
                raise Exception(f'Error on bbox parameter: {e}')

            if not request.FILES:
                raise Exception('No FILES are uploaded!')

            if not 'image' in request.FILES:
                raise Exception("'image' parameter must not be empty")

            image = request.FILES['image']

            # Workflow
            # ====================================================
            tmp_dir = tempfile.TemporaryDirectory()
            filename = '/in.png'
            src_filename = tmp_dir.name + filename

            filename = 'map.tif'
            #out_filename = tmp_dir.name + '/' + filename
            out_filename = f'/tmp/map_{str(time.time())}.tif'

            with open(src_filename, 'w+b') as file:
                for chunk in image.chunks():
                    file.write(chunk)

            src = gdal.OpenEx(src_filename, gdal.OF_READONLY | gdal.OF_RASTER | gdal.OF_VERBOSE_ERROR)

            band_data = {}
            for n in range(1, src.RasterCount + 1):
                logger.debug('Reading band {}'.format(n))
                band_data[n] = src.GetRasterBand(n).ReadAsArray()

            [rows, cols] = band_data[1].shape

            driver = gdal.GetDriverByName("GTiff")
            out = driver.Create(out_filename, cols, rows, src.RasterCount)

            xres = (xmax - xmin) / float(cols)
            yres = (ymax - ymin) / float(rows)
            geotransform = (xmin, xres, 0, ymax, 0, -yres)

            out.SetGeoTransform(geotransform)

            srs = osr.SpatialReference()
            srs.ImportFromEPSG(project.group.srid.srid)
            out.SetProjection(srs.ExportToWkt())

            for n in range(1, src.RasterCount + 1):
                logger.debug('Writing band {}'.format(n))
                out.GetRasterBand(n).WriteArray(band_data[n])
            out.FlushCache()

            return send_file(output_filename=filename, file=out_filename, content_type='image/tiff')


        except Exception as e:
            self.results.error = str(e)
            self.results.result = False

        except Http404 as e:
            self.results.error = str(e)
            self.results.result = False

        return Response(self.results.results)


class QdjangoPrjThemeAPIview(G3WAPIView):
    """
    API to get layers tree based on a selected theme.
    Give a project_id and a view/theme name.
    """

    permission_classes = (
        ProjectPermission,
        ProjectIsActivePermission
    )

    authentication_classes = (
        CsrfExemptSessionAuthentication,
    )

    def _get_url_params(self, **kwargs):
        self.project_id = kwargs['project_id']
        self.theme_name = kwargs['theme_name']

    def get(self, request, **kwargs):
        self._get_url_params(**kwargs)
        return self.layerstree(request, **kwargs)

    def post(self, request, **kwargs):
        """
        Post action view for custom theme data
        """

        # TODO: add theme data validation structure, use Pydantic?
        self._get_url_params(**kwargs)

        # Validate POST data



        try:

            # Validate POST data
            # ------------------
            try:
                ThemeProjectPDModel(**self.request.data)
            except Exception as e:
                logger.error(str(e))
                raise ValidationError(str(e))

            # CRUD
            # ------------------------

            data = json.dumps(self.request.data)

            # Insert/get
            c_theme, created = CustomerTheme.objects.get_or_create(
                defaults={
                    'theme': data
                },
                project_id=self.project_id,
                user=self.request.user,
                name=self.theme_name
            )

            # Update
            if not created:
                c_theme.theme = data
                c_theme.save()

            # Invalidate cache project
            Project.objects.get(pk=self.project_id).invalidate_cache(user=self.request.user)

        except Exception as e:
            self.results.error = str(e)
            self.results.result = False

        return Response(self.results.results)

    def delete(self, request, **kwargs):
        self._get_url_params(**kwargs)

        try:
            CustomerTheme.objects.get(project_id=self.project_id, user=self.request.user, name=self.theme_name).delete()

            # Invalidate cache project
            Project.objects.get(pk=self.project_id).invalidate_cache(user=self.request.user)
        except Exception as e:
            self.results.error = str(e)
            self.results.result = False

        return Response(self.results.results)

    def layerstree(self, request, **kwargs):

        try:

            # Retrieve project qdjando instance and qgsproject instance
            project = get_object_or_404(Project, pk=self.project_id)
            qgs_project = get_qgs_project(project.qgis_file.path)

            # First check for custom theme
            try:
                c_theme = CustomerTheme.objects.get(project=project, user=self.request.user, name=self.theme_name)
                self.results.results.update({
                    'data': c_theme.layerstree
                })

                return Response(self.results.results)

            except:
                logger.info(f'[CUSTOMER THEME]: The theme \'{self.theme_name}\' is not a custom theme '
                            f'for user {self.request.user} in the project {self.project_id}')
                pass

            # Validation theme name
            theme_collections = qgs_project.mapThemeCollection()
            map_themes = theme_collections.mapThemes()


            if len(map_themes) == 0:
                raise Exception(f"Themes are not available for project {project.title}")

            if self.theme_name not in map_themes:
                raise Exception(f"Theme name '{self.theme_name}' is not available!")

            map_theme = theme_collections.mapThemeState(self.theme_name)

            # Get node group expanded anche checked
            node_group_expanded = map_theme.expandedGroupNodes()
            node_group_checked = map_theme.checkedGroupNodes()

            # Layers checked are layers into mapTheme layerRecords
            node_layerids_checked = []
            for r in map_theme.layerRecords():
                id = r.layer().id()
                if id not in node_layerids_checked:
                    node_layerids_checked.append(id)

            # Get layer which request.user can view:
            view_layer_ids = get_view_layer_ids(self.request.user, project)


            def build_group_name_by_parents(node):

                parent = node.parent()
                if parent and parent.nodeType() == 0 and parent.name() != '':
                    return build_group_name_by_parents(parent) + '/' + node.name()
                else:
                    return node.name()


            def build_tree(layertreenode):
                toRetLayers = []
                for node in layertreenode.children():

                    toRetLayer = {
                        'name': node.name()
                    }

                    try:

                        # Check if layer is visible by user
                        if self.request and not node.layerId() in view_layer_ids:
                            continue

                        # try for layer node
                        toRetLayer.update({
                            'id': node.layerId(),
                            'visible': True if node.layerId() in node_layerids_checked else False
                        })

                        # Add `showFeatureCount` custom property per Vector layer only
                        if 'showFeatureCount' in node.customProperties() and node.customProperty(
                                'showFeatureCount') == 1:
                            toRetLayer.update({
                                'showfeaturecount': True
                            })

                    except:

                        # Try to build by parent
                        deep_tree_name = build_group_name_by_parents(node)

                        toRetLayer.update({
                            'mutually-exclusive': node.isMutuallyExclusive(),
                            'nodes': build_tree(node),
                            'checked': True if deep_tree_name in node_group_checked else False,
                            'expanded': True if deep_tree_name in node_group_expanded else False
                        })

                    toRetLayers.append(toRetLayer)
                return toRetLayers

            layers_tree = build_tree(qgs_project.layerTreeRoot())

            self.results.results.update({
                'data': layers_tree
            })

        except Http404 as e:
            self.results.error = f"Project with id {kwargs['project_id']} not found!"
            self.results.result = False

        except Exception as e:
            self.results.error = str(e)
            self.results.result = False

        return Response(self.results.results)


    

class QdjangoAlternativeUniqueLayerAPIView(G3WAPIView):
    """
    Class ti get a lista of layers to use as alternative for call on unique field value
    """

    permission_classes = (
        ProjectPermission,
        ProjectIsActivePermission
    )

    authentication_classes = (
        CsrfExemptSessionAuthentication,
    )


    def post(self, request, *args, **kwargs):
        """
        Return a list of layers to use as alternative for call on unique field value
        """
        project = Project.objects.get(pk=kwargs['project_id'])
        layers = project.layer_set.filter(
            ~Q(qgs_layer_id=kwargs['layer_id'])
        )

        # Get only layer with the same field and field type
        data = []
        for l in layers:
            try:
                cols = l.database_columns_by_name()

                # Check if field is in columns and type is the same
                if request.data.get('field') in cols and request.data.get('type') == cols[request.data['field']].get('type'):
                    data.append({
                        'id': l.qgs_layer_id,
                        'name': l.name
                })
            except:
                pass


        self.results.results.update({
                'data': data
            })

        return Response(self.results.results)
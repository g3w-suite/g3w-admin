from django import get_version as dj_get_version
from django.conf import settings
from django.views.decorators.csrf import csrf_exempt
from rest_framework.response import Response
from owslib.wms import WebMapService
from base.version import get_version
from .base.views import G3WAPIView
from core.api.authentication import CsrfExemptSessionAuthentication
from core.api.permissions import ProjectPermission
from qdjango.models import Project
from core.api.base.views import APIException
from core.utils.geo import get_crs_bbox
from django.utils.translation import ugettext_lazy as _
from rest_framework import status

from qgis.core import NULL

import json

from qgis.core import (
    QgsExpression,
    QgsExpressionContext,
)

import platform

from qgis.core import (
    Qgis,
    QgsCoordinateReferenceSystem
)

from core.utils.qgisapi import (
    expression_eval,
    ExpressionEvalError,
    ExpressionFormDataError,
    ExpressionParseError,
    ExpressionLayerError
)

import logging

logger = logging.getLogger(__name__)


class APIExpressionEvalError(APIException):
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = _('Expression evaluation error.')
    default_code = 'expression_eval_error'

class APIExpressionParseError(APIException):
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = _('Expression parse error.')
    default_code = 'expression_parse_error'


class APIExpressionEmptyError(APIException):
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = _('Expression empty error.')
    default_code = 'expression_empty_error'


class APIExpressionFormDataError(APIException):
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = _('Expression form data error.')
    default_code = 'expression_form_data_error'


class APIExpressionLayerError(APIException):
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = _('Layer error.')
    default_code = 'expression_layer_error'


LAYERVECTORVIEW_CLASS_DEFAULT = 'LayerVectorView'
LAYERVECTORVIEW_CLASSES = dict()
LAYERRASTERVIEW_CLASS_DEFAULT = 'LayerRasterView'
LAYERRASTERVIEW_CLASSES = dict()
USERMEDIAHANDLER_CLASSES = dict()

for app_name in settings.G3WADMIN_PROJECT_APPS:
    projectAppModule = __import__('{}.vector'.format(app_name))
    LAYERVECTORVIEW_CLASSES[app_name] = getattr(projectAppModule.vector, LAYERVECTORVIEW_CLASS_DEFAULT)
    USERMEDIAHANDLER_CLASSES[app_name] = getattr(projectAppModule.vector, 'UserMediaHandler')

    # For raster
    projectAppModule = __import__('{}.raster'.format(app_name))
    LAYERRASTERVIEW_CLASSES[app_name] = getattr(projectAppModule.raster, LAYERRASTERVIEW_CLASS_DEFAULT)


@csrf_exempt  # put exempt here because as_view method is outside url bootstrap declaration
def layer_vector_view(request, project_type, project_id, layer_name, *args, **kwargs):
    """Api vector view"""

    # instance module vector view
    view = LAYERVECTORVIEW_CLASSES[project_type].as_view()
    kwargs.update({'project_type': project_type,
                   'project_id': project_id, 'layer_name': layer_name})
    return view(request, *args, **kwargs)


@csrf_exempt  # put exempt here because as_view method is outside url bootstrap declaration
def layer_raster_view(request, project_type, project_id, layer_name, *args, **kwargs):
    """Api raster view"""

    # instance module vector view
    view = LAYERRASTERVIEW_CLASSES[project_type].as_view()
    kwargs.update({'project_type': project_type,
                   'project_id': project_id, 'layer_name': layer_name})
    return view(request, *args, **kwargs)


class G3WSUITEInfoAPIView(G3WAPIView):
    """
    General informations about deploy.
    Version, module installed etc..
    """

    def get(self, request, **kwargs):

        # add g3w-suite version
        res = {
            'data': {
                'version': get_version(),
                'modules': settings.G3WADMIN_LOCAL_MORE_APPS,
                'environment': {
                    'python_version': get_version(platform.sys.version_info),
                    'django_version': dj_get_version(),
                    'qgis-server-version': Qgis.QGIS_VERSION

                }
            }

        }

        self.results.results.update(res)

        return Response(self.results.results)


class QgsExpressionLayerContextEvalView(G3WAPIView):
    """This POST only API accepts a QgsExpression, a qdjango project_id and optionally a
        QGIS layer id and a GeoJSON feature data and returns the evaluated QgsExpression
        in the feature form context.

    Mandatory payload:

    `qexpression`: text of the QgsExpression to be evaluated,

    Optional JSON payload:

    `form_data`: GeoJSON representation of the feature currently being edited.
    `qgs_layer_id`: QGIS layer id

    """

    permission_classes = (ProjectPermission,)

    authentication_classes = (
        CsrfExemptSessionAuthentication,
    )

    def post(self, request, project_id, format=None):
        """
        This method accepts a QgsExpression a qdjango project_id and  QGIS layer ID and an optional geojson
        feature data and returns the evaluated QgsExpression in the feature form context.
        """

        if request.content_type != 'application/json':
            try:
                data = json.loads(request.data.get('_content'))
                expression_text = data.get('expression')
                form_data = data.get('form_data')
                qgs_layer_id = data.get('qgs_layer_id')
                formatter = data.get('formatter', '0')
                parent = data.get('parent', None)
                field_name = data.get('field_name', None)
            except:
                raise APIExpressionEmptyError()
        else:
            expression_text = request.data.get('expression')
            form_data = request.data.get('form_data')
            qgs_layer_id = request.data.get('qgs_layer_id')
            formatter = request.data.get('formatter', '0')
            parent = request.data.get('parent', None)
            field_name = request.data.get('field_name', None)

        if expression_text is None:
            raise APIExpressionEmptyError()

        try:
            result = expression_eval(
                expression_text, project_id, qgs_layer_id, form_data, int(formatter), parent, field_name)

            # Case Qvariant NULL
            if result == NULL:
                result = ''

        except ExpressionFormDataError as ex:
            raise APIExpressionFormDataError(str(ex))
        except ExpressionEvalError as ex:
            raise APIExpressionEvalError(str(ex))
        except ExpressionParseError as ex:
            raise APIExpressionParseError(str(ex))
        except ExpressionLayerError as ex:
            raise APIExpressionLayerError(str(ex))

        return Response(result)


class InterfaceOws(G3WAPIView):
    """
    API interface view for client. Retrieve information about ows (i.e. wms) service
    Only POST request are available on this view.
    """

    _service_available = {
        'wms': WebMapService
    }

    authentication_classes = (
        CsrfExemptSessionAuthentication,
    )

    def post(self, request, **kwargs):

        # Check for content type accept only 'application/json'

        if request.content_type != 'application/json':
            return APIException("Interface OWS accept only 'application/json request'")

        post_data = json.loads(request.body)

        # Required
        url = post_data.get('url')
        if not url:
            raise APIException("'url' parameter must be provided.")

        service = post_data.get('service')
        if not service:
            raise APIException("'service' parameter must be provided.")
        service = service.lower()

        if service not in self._service_available.keys():
            raise APIException(f"Service '{service}' is not available.")

        # Not required:
        version = post_data.get('version', '1.3.0')

        ows = self._service_available[service](url, version=version)

        # Identification
        # -----------------------------------
        self.results.results.update({'title': ows.identification.title, 'abstract': ows.identification.abstract})

        # Map formats
        # -----------------------------------
        self.results.results.update({'map_formats': ows.getOperationByName('GetMap').formatOptions})

        # Info formats
        # -----------------------------------
        try:
            self.results.results.update({'info_formats': ows.getOperationByName('GetFeatureInfo').formatOptions})
        except Exception as e:

            # Case where OWS service doesn't support GetFeatureInfo
            logger.debug(f'The service {url} doesn\'t support GetFeatureInfo, err: {str(e)}')

        # Layers
        # -----------------------------------
        available_layers = list(ows.contents)

        # add styles for every layer
        layers = []
        for al in available_layers:

            # Build crs
            crss = []
            for srid in ows[al].crsOptions:
                if srid.startswith('EPSG:') or srid.startswith('CRS:'):
                    crs = QgsCoordinateReferenceSystem()
                    crs.createFromOgcWmsCrs(srid)
                else:
                    crs = QgsCoordinateReferenceSystem(f"EPSG:{srid}")

                if crs.postgisSrid() in settings.G3W_PROJ4_EPSG.keys():
                    proj4 = settings.G3W_PROJ4_EPSG[crs.postgisSrid()]
                else:
                    proj4 = crs.toProj4()

                crss.append({
                    'epsg': crs.postgisSrid(),
                    'proj4': proj4,
                    'geographic': crs.isGeographic(),
                    'axisinverted': crs.hasAxisInverted(),
                    'extent': get_crs_bbox(crs)

                })


            layers.append({
                'name': al,
                'title': ows[al].title,
                'abstract': ows[al].abstract,
                'crss': crss,
                'styles': ows[al].styles,
                'parent': ows[al].parent.id if ows[al].parent else None
            })

        self.results.results.update({'layers': layers})

        return Response(self.results.results)


class CRSInfoAPIView(G3WAPIView):
    """
    API REST service for info about CRS ask by ESPG code
    """

    def get(self, request, **kwargs):

        crs = QgsCoordinateReferenceSystem(f"EPSG:{kwargs['epsg']}")

        # Patch for Proj4 > 4.9.3 version
        if int(kwargs['epsg']) == 3003:
            proj4 = "+proj=tmerc +lat_0=0 +lon_0=9 +k=0.9996 +x_0=1500000 +y_0=0 +ellps=intl " \
                    "+towgs84=-104.1,-49.1,-9.9,0.971,-2.917,0.714,-11.68 +units=m +no_defs"
        else:
            proj4 = crs.toProj4()

        self.results.results.update({
            'data': {
                'epsg': crs.postgisSrid(),
                'proj4': proj4,
                'geographic': crs.isGeographic(),
                'axisinverted': crs.hasAxisInverted(),
                'extent': get_crs_bbox(crs)
            }
        })

        return Response(self.results.results)

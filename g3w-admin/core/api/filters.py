from django.contrib.gis.geos import Polygon
from rest_framework_gis.filters import InBBoxFilter
from rest_framework.exceptions import ParseError
from rest_framework.filters import BaseFilterBackend
from django.db.models import Q


class InsideBBoxFilter(InBBoxFilter):

    def __init__(self, **kwargs):
        # change default bbox_param for different call like WMS GetFeatureInfo
        if 'bbox_param' in kwargs:
            self.bbox_param = kwargs['bbox_param']
        super(InsideBBoxFilter, self).__init__()


class IntersectsBBoxFilter(InsideBBoxFilter):

    def get_filter_bbox(self, request):
        if request.method == 'POST':
            request_data = request.data
        else:
            request_data = request.query_params
        bbox_string = request_data.get(self.bbox_param, None)
        if not bbox_string:
            return None

        try:
            p1x, p1y, p2x, p2y = (float(n) for n in bbox_string.split(','))
        except ValueError:
            raise ParseError('Invalid bbox string supplied for parameter {0}'.format(self.bbox_param))

        x = Polygon.from_bbox((p1x, p1y, p2x, p2y))
        return x

    def filter_queryset(self, request, queryset, view):
        filter_field = getattr(view, 'bbox_filter_field', None)
        include_overlapping = getattr(view, 'bbox_filter_include_overlapping', False)
        if include_overlapping:
            geoDjango_filter = 'intersects'
        else:
            geoDjango_filter = 'contained'

        if not filter_field:
            return queryset

        bbox = self.get_filter_bbox(request)

        # to reproject
        if bbox:
            if hasattr(view, 'reproject') and view.reproject:
                bbox.srid = view.layer.project.group.srid.auth_srid
                bbox.transform(view.layer.srid)
            else:
                if hasattr(view, 'layer'):
                    bbox.srid = view.layer.srid
                    bbox.transform(view.layer.srid)

        if not bbox:
            return queryset
        return queryset.filter(Q(**{'%s__%s' % (filter_field, geoDjango_filter): bbox}))


class CentroidBBoxFilter(IntersectsBBoxFilter):

    def __init__(self, **kwargs):

        self.tolerance = kwargs['tolerance'] if 'tolerance' in kwargs else 10
        super(CentroidBBoxFilter, self).__init__(**kwargs)

    def get_filter_bbox(self, request):
        polygon = super(CentroidBBoxFilter, self).get_filter_bbox(request)
        return polygon.centroid.buffer(self.tolerance)


class DatatablesFilterBackend(BaseFilterBackend):
    """
    Filter that works with datatables params.
    from https://github.com/izimobil/django-rest-framework-datatables/blob/master/rest_framework_datatables/filters.py
    """
    def filter_queryset(self, request, queryset, view):

        total_count = queryset.count()
        # set the queryset count as an attribute of the view for later
        # TODO: find a better way than this hack
        setattr(view, '_datatables_total_count', total_count)

        # parse query params
        getter = request.query_params.get
        fields = view.metadata_layer.model._meta.fields
        exlude_fields = eval(view.layer.exclude_attribute_wms) if view.layer.exclude_attribute_wms else []
        search_value = getter('search')

        # filter queryset
        if search_value:
            q = Q()
            for f in fields:
                if f.column not in exlude_fields:
                    q |= Q(**{'%s__icontains' % f.column: search_value})

            if q != Q():
                queryset = queryset.filter(q).distinct()
                filtered_count = queryset.count()
            else:
                filtered_count = total_count
        else:
            filtered_count = total_count
        # set the queryset count as an attribute of the view for later
        # TODO: maybe find a better way than this hack ?
        setattr(view, '_datatables_filtered_count', filtered_count)

        return queryset




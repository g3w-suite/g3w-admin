from rest_framework_gis.filters import InBBoxFilter
from django.db.models import Q


class InsideBBoxFilter(InBBoxFilter):

    def __init__(self, **kwargs):
        # change default bbox_param for different call like WMS GetFeatureInfo
        if 'bbox_param' in kwargs:
            self.bbox_param = kwargs['bbox_param']
        super(InsideBBoxFilter, self).__init__()


class IntersectsBBoxFilter(InsideBBoxFilter):

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
        if view.reproject:
            bbox.srid = view.layer.project.group.srid.auth_srid
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
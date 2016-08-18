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
        if not bbox:
            return None #queryset
        return queryset.filter(Q(**{'%s__%s' % (filter_field, geoDjango_filter): bbox}))
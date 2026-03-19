# coding=utf-8
"""" API qplotly widgets

.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2020-09-23'
__copyright__ = 'Copyright 2015 - 2020, Gis3w'

from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response

from django.http import Http404

from core.api.authentication import CsrfExemptSessionAuthentication

from qplotly.models import QplotlyWidget, QplotlyWidgetRelation
from qplotly.utils.models import get_qplotlywidgets4layer

from qdjango.models import Layer, Project

from .serializers import QplotlyWidgetSerializer
from .permissions import QplotlyWidgetPermission, QplotlyWidgetRelatedPermission


class QplotlyWidgetList(generics.ListCreateAPIView):
    """List of qplotly widgets, optionally filtered by editing layer id"""

    queryset = QplotlyWidget.objects.all()
    serializer_class = QplotlyWidgetSerializer

    pagination_class = None

    authentication_classes = (
        CsrfExemptSessionAuthentication,
    )

    permission_classes = (
        QplotlyWidgetPermission,
    )

    def get_serializer_context(self):
        """
        Extra context provided to the serializer class.
        """

        toret = super().get_serializer_context()
        toret['project'] = self.layer.project if hasattr(self, 'layer') else None
        return toret
        

    def get_queryset(self):
        """
        This view should return a list constraints for a given layer id portion of the URL.
        """

        qs = super().get_queryset()
        if 'layer_id' in self.kwargs:
            self.layer = Layer.objects.filter(pk=self.kwargs['layer_id']).first()
            qs = get_qplotlywidgets4layer(self.layer)
        return qs


class QplotlyWidgetDetail(generics.RetrieveUpdateDestroyAPIView):
    """Details/Update/Delete of a qplotly widget"""

    queryset = QplotlyWidget.objects.all()
    serializer_class = QplotlyWidgetSerializer

    authentication_classes = (
        CsrfExemptSessionAuthentication,
    )

    permission_classes = (
        QplotlyWidgetPermission,
    )


class QplotlyWidgetRelatedWidgetView(APIView):
    """
    Manage related_widgets on a QplotlyWidget via the QplotlyWidgetRelation through-model.

    GET    /api/widget/related/<pk>/<project_id>/
        Returns the list of related widgets with their relation order.

    POST   /api/widget/related/<pk>/
        Adds a relation. Body: {"target": <widget_id>, "project": <project_id>, "order": <int>}
        Creates the relation if it does not exist, otherwise updates the order.

    DELETE /api/widget/related/<pk>/<target_pk>/<project_id>/
        Removes the relation between the source widget and the target widget.
    """

    authentication_classes = (CsrfExemptSessionAuthentication,)
    permission_classes = (QplotlyWidgetRelatedPermission,)

    def _get_widget_or_404(self, pk):
        try:
            return QplotlyWidget.objects.get(pk=pk)
        except QplotlyWidget.DoesNotExist:
            raise Http404

    def get(self, request, pk, project_id=None):
        widget = self._get_widget_or_404(pk)

        if project_id is None:
            return Response(
                {'error': "'project_id' path parameter is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        relations = widget.widget_relations.select_related('target').filter(project_id=project_id)
        data = [
            {
                'id': r.target.pk,
                'title': r.target.title,
                'type': r.target.type,
                'order': r.order,
            }
            for r in relations
        ]
        return Response(data)

    def post(self, request, pk):
        widget = self._get_widget_or_404(pk)
        target_id = request.data.get('target')
        project_id = request.data.get('project')
        order = request.data.get('order', 0)

        if not target_id:
            return Response(
                {'error': "'target' field is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not project_id:
            return Response(
                {'error': "'project' field is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            target_id = int(target_id)
        except (TypeError, ValueError):
            return Response(
                {'error': "'target' must be a valid widget id"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            project_id = int(project_id)
        except (TypeError, ValueError):
            return Response(
                {'error': "'project' must be a valid project id"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not Project.objects.filter(pk=project_id).exists():
            return Response(
                {'error': f'Project with pk={project_id} not found'},
                status=status.HTTP_404_NOT_FOUND,
            )

        if target_id == int(pk):
            return Response(
                {'error': 'A widget cannot be related to itself'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            target = QplotlyWidget.objects.get(pk=target_id)
        except QplotlyWidget.DoesNotExist:
            return Response(
                {'error': f'Widget with pk={target_id} not found'},
                status=status.HTTP_404_NOT_FOUND,
            )

        relation, created = QplotlyWidgetRelation.objects.get_or_create(
            source=widget,
            target=target,
            project_id=project_id,
            defaults={'order': order},
        )
        if not created:
            relation.order = order
            relation.save(update_fields=['order'])

        return Response(
            {'id': target.pk, 'order': relation.order},
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )

    def delete(self, request, pk, target_pk, project_id):
        widget = self._get_widget_or_404(pk)

        deleted, _ = QplotlyWidgetRelation.objects.filter(
            source=widget,
            target_id=target_pk,
            project_id=project_id,
        ).delete()
        if deleted == 0:
            return Response(status=status.HTTP_404_NOT_FOUND)
        return Response(status=status.HTTP_204_NO_CONTENT)


class QplotlyWidgetRelatedWidgetPostView(QplotlyWidgetRelatedWidgetView):
    """POST-only endpoint for creating/updating related widget relations."""

    http_method_names = ['post', 'options']


class QplotlyWidgetAvailableRelatedView(APIView):
    """
    GET /api/widget/related/<pk>/available/<project_id>/
    Returns widgets that can be added as related to the widget <pk>:
    - belong to the same layer(s) as <pk>
    - are not already a target of any QplotlyWidgetRelation
    - do not have any related widgets of their own (i.e. are not a source in any relation)
    - are not <pk> itself
    """

    authentication_classes = (CsrfExemptSessionAuthentication,)
    permission_classes = (QplotlyWidgetRelatedPermission,)

    def get(self, request, pk, project_id):
        try:
            source = QplotlyWidget.objects.get(pk=pk)
        except QplotlyWidget.DoesNotExist:
            raise Http404

        source_layers = source.layers.filter(project_id=project_id)
        if not source_layers.exists():
            return Response(
                {'error': 'Project in URL must match source widget layers project'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        layer_ids = source_layers.values_list('pk', flat=True)

        # widgets on the same layer(s), excluding source itself
        candidates = QplotlyWidget.objects.filter(layers__in=layer_ids, layers__project_id=project_id).exclude(pk=pk).distinct()

        # exclude widgets already targeted by any relation
        targeted_pks = QplotlyWidgetRelation.objects.filter(project_id=project_id).values_list('target_id', flat=True)

        # exclude widgets that are already a source in any relation
        source_pks = QplotlyWidgetRelation.objects.filter(project_id=project_id).values_list('source_id', flat=True)

        candidates = candidates.exclude(pk__in=targeted_pks).exclude(pk__in=source_pks)

        data = [{'id': w.pk, 'title': w.title, 'type': w.type} for w in candidates]
        return Response(data)


class QplotlyWidgetFreeView(APIView):
    """
    GET /api/widget/free/<project_id>/<layer_id>/
    Returns the PKs of widgets on the given layer that are NOT a target
    in any QplotlyWidgetRelation (i.e. they are not already "owned" by
    another widget as a related).
    These are the widgets for which the "manage related" button must be shown.
    """

    authentication_classes = (CsrfExemptSessionAuthentication,)
    permission_classes = (QplotlyWidgetPermission,)

    def get(self, request, project_id, layer_id):
        try:
            layer = Layer.objects.get(pk=layer_id)
        except Layer.DoesNotExist:
            raise Http404

        if layer.project_id != project_id:
            return Response(
                {'error': 'Project in URL must match layer project'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # PKs already used as targets in any relation
        target_pks = QplotlyWidgetRelation.objects.filter(project_id=project_id).values_list('target_id', flat=True)

        # widgets on this layer that are NOT targets
        not_targets = QplotlyWidget.objects.filter(layers=layer).exclude(pk__in=target_pks)
        return Response([w.pk for w in not_targets])
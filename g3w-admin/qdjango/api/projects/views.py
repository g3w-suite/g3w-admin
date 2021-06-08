# coding=utf-8
""""Qdjango project api views

.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2020-10-09'
__copyright__ = 'Copyright 2015 - 2020, Gis3w'

from django.conf import settings
from django.shortcuts import get_object_or_404, Http404
from django.urls import reverse
from rest_framework.response import Response
from guardian.shortcuts import get_anonymous_user
from core.api.base.views import G3WAPIView
from qdjango.models import Project
from qdjango.signals import reading_layer_model


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
                    'WFS': res['WMS']
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



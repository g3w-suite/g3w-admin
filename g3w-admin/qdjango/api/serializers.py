from django.conf import settings
from django.apps import apps
from rest_framework import serializers
from qdjango.models import Project, Layer


class ProjectSerializer(serializers.ModelSerializer):

    class Meta:
        model = Project
        fields =(
            'id',
            'title'
        )

class LayerSerializer(serializers.ModelSerializer):
    pass
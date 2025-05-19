from django.db import models
from django.contrib.postgres.fields import JSONField
from django.contrib.auth.models import User
from qdjango.models import Layer
from model_utils.fields import AutoCreatedField

EDITING_POST_DATA_ADDED = 'add'
EDITING_POST_DATA_UPDATED = 'update'
EDITING_POST_DATA_DELETED = 'delete'

EDITING_ATOMIC_PERMISSIONS = (
        'add_feature',
        'change_feature',
        'delete_feature',
        'change_attr_feature'
    )


class G3WEditingFeatureLock(models.Model):
    """
    Model to lock editing features models.
    """
    feature_id = models.CharField(max_length=255)
    app_name = models.CharField(max_length=255)
    layer_name = models.CharField(max_length=255)
    layer_datasource = models.TextField(max_length=255)
    user = models.ForeignKey(User, null=True, blank=True, on_delete=models.DO_NOTHING)
    sessionid = models.CharField(max_length=255, null=True, blank=True)
    feature_lock_id = models.CharField(max_length=32, db_index=True)
    time_locked = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = 'editing'


class G3WEditingLayer(models.Model):
    """
    Model to set layer in editing layer's app
    """
    app_name = models.CharField(max_length=255)
    layer_id = models.IntegerField()
    scale = models.IntegerField(null=True, blank=True)
    add_user_field = models.CharField(null=True, blank=True, max_length=255)
    edit_user_field = models.CharField(null=True, blank=True, max_length=255)
    visible = models.BooleanField(default=True, null=True, blank=True, help_text="Show layer in layers list to edit")
    add_user_group_field = models.CharField(null=True, blank=True, max_length=255)
    edit_user_group_field = models.CharField(null=True, blank=True, max_length=255)
    style = models.TextField(null=True, blank=True)

    class Meta:
        app_label = 'editing'
        unique_together = ['layer_id', 'app_name']

    @property
    def layer(self):
        return Layer.objects.get(pk=self.layer_id)



class G3WEditingLog(models.Model):
    """
    Model to log editing actions by users
    """
    created = AutoCreatedField()
    app_name = models.CharField(max_length=255)
    layer_id = models.IntegerField()
    user = models.ForeignKey(User, null=True, blank=True, on_delete=models.CASCADE)
    mode = models.CharField(max_length=10, default=EDITING_POST_DATA_ADDED, choices=(
        (EDITING_POST_DATA_ADDED, EDITING_POST_DATA_ADDED),
        (EDITING_POST_DATA_UPDATED, EDITING_POST_DATA_UPDATED),
        (EDITING_POST_DATA_DELETED, EDITING_POST_DATA_DELETED)))
    msg = models.TextField()

    class Meta:
        app_label = 'editing'
from django.db import models


class G3WCachingLayer(models.Model):
    """
    Layer to cache for every g3wsuite map module.
    """
    app_name = models.CharField(max_length=255)
    layer_id = models.IntegerField()

    def __str__(self):
        return "{}{}".format(self.app_name, self.layer_id)

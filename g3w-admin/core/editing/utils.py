from core.models import G3WEditingFeatureLock as LockModel
from django.db import transaction
import hashlib


class LayerLock(object):

    def __init__(self, layer, appName, **kwargs):
        self.layerName = layer.name
        self.layerDatasource = layer.datasource
        self.appName = appName
        if kwargs.get('user'):
            self.user = kwargs['user']

    def getFeatureLockedIds(self):
        """
        Check and return fatures id locked
        """

        filters = {
            'layer_name':self.layerName,
            'app_name':self.appName,
            'layer_datasource':self.layerDatasource
        }

        if getattr(self, 'user'):
            filters['user'] = self.user

        featuresLocked = LockModel.objects.filter(**filters)

        return [f.feature_id for f in featuresLocked]

    def lockFeatures(self, featuresIds):
        """
        Lock features
        """
        lockedFeature = []
        with transaction.atomic():
            for fid in featuresIds:
                featureLockId = hashlib.md5()
                featureLockId.update(str(fid)+self.layerName+self.appName+self.layerDatasource)
                featureLock = LockModel(
                    feature_id=fid,
                    layer_name=self.layerName,
                    app_name=self.appName,
                    layer_datasource=self.layerDatasource,
                    feature_lock_id=featureLockId.hexdigest()
                )

                if getattr(self, 'user'):
                    featureLock.user = self.user

                featureLock.save()
                lockedFeature.append({
                    'featureid':fid,
                    'lockid':featureLock.feature_lock_id
                })
        return lockedFeature

    @classmethod
    def unLockExpiredFeatures(cls):
        pass

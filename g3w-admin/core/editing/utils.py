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

        self.initialFeatureLockedIds = []
        self.getInitialUserFeatureLocked = []

    def getInitialFeatureLockedIds(self):
        """
        Check and return initial features id locked
        """

        filters = {
            'layer_name':self.layerName,
            'app_name':self.appName,
            'layer_datasource':self.layerDatasource
        }

        featuresLocked = LockModel.objects.filter(**filters)
        for f in featuresLocked:
            self.initialFeatureLockedIds.append(f.feature_id)
            if getattr(self, 'user') and f.user == self.user:
                self.getInitialUserFeatureLocked.append(f)

    def lockFeatures(self, featuresIds):
        """
        Lock features
        """

        # first get initila features locked
        self.getInitialFeatureLockedIds()

        # find feature to lock
        self.newFeatureToLockIds = list(set(featuresIds) - set(self.initialFeatureLockedIds))

        lockedFeature = []
        with transaction.atomic():
            for fid in self.newFeatureToLockIds:
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

        if getattr(self, 'user') and len(self.getInitialUserFeatureLocked):
            for f in self.getInitialUserFeatureLocked:
                lockedFeature.append({
                    'featureid': f.feature_id,
                    'lockid': f.feature_lock_id
                })


        return lockedFeature

    @classmethod
    def unLockExpiredFeatures(cls):
        pass

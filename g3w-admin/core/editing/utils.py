from core.models import G3WEditingFeatureLock as LockModel
import hashlib


class LayerLock(object):

    def __init__(self, layer, appName, **kwargs):
        self.layerName = layer.name
        self.layerDatasource = layer.datasource
        self.appName = appName
        if kwargs.get('user'):
            self.user = kwargs['user']
        if kwargs.get('sessionid'):
            self.sessionid = kwargs['sessionid']

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
            if getattr(self, 'user') and f.user == self.user and getattr(self, 'sessionid') and f.sessionid == self.sessionid:
                self.getInitialUserFeatureLocked.append(f)

    def lockFeatures(self, featuresIds):
        """
        Lock features
        """

        # first get initial features locked
        self.getInitialFeatureLockedIds()

        # find feature to lock
        self.newFeatureToLockIds = list(set(featuresIds) - set(self.initialFeatureLockedIds))

        potentialLockIds = []
        lockModels = []
        for fid in self.newFeatureToLockIds:
            featureLockId = hashlib.md5()
            toCrypt = str(fid)+self.layerName+self.appName+self.layerDatasource
            if getattr(self, 'sessionid'):
                toCrypt += self.sessionid
            featureLockId.update(toCrypt)
            potentialLockIds.append(featureLockId)
            featureLock = LockModel(
                feature_id=fid,
                layer_name=self.layerName,
                app_name=self.appName,
                layer_datasource=self.layerDatasource,
                feature_lock_id=featureLockId.hexdigest()
            )

            if getattr(self, 'user'):
                featureLock.user = self.user
            if getattr(self, 'sessionid'):
                featureLock.sessionid = self.sessionid
            
            lockModels.append(featureLock)

        LockModel.objects.bulk_create(lockModels)

        locks = LockModel.objects.filter(feature_lock_id__in=potentialLockIds)
        lockedFeatures = []
        for lock in locks:
          lockedFeatures.append({
              'featureid': lock.feature_id,
              'lockid': lock.feature_lock_id
          })

        if getattr(self, 'user') and len(self.getInitialUserFeatureLocked):
            for f in self.getInitialUserFeatureLocked:
                if f.feature_id in featuresIds:
                    lockedFeatures.append({
                        'featureid': f.feature_id,
                        'lockid': f.feature_lock_id
                    })

        return lockedFeatures

    @classmethod
    def unLockExpiredFeatures(cls):
        pass

    @classmethod
    def unLockFeature(cls, featureLockId):
        LockModel.objects.get(feature_lock_id=featureLockId).delete()

    @classmethod
    def unLockFeatures(cls, featureLockIds):
        featuresLocked = LockModel.objects.filter(feature_lock_id__in=featureLockIds)
        for featureLock in featuresLocked:
            featureLock.delete()

    def unLockFeatureBySession(self):

        featuresToUnlock = LockModel.objects.filter(sessionid=self.sessionid)
        for f in featuresToUnlock:
            f.delete()



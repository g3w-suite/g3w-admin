from django.conf import settings
from django.contrib.sessions.models import Session
from django.utils import timezone
from usersmanage.configs import *
from usersmanage.utils import get_users_for_object, setPermissionUserObject
from editing.models import G3WEditingFeatureLock as LockModel
import hashlib


class LayerLock(object):
    """ Handles features locking """

    def __init__(self, layer, appName, **kwargs):

        # FIXME: if qgs_layer_id is not unique it shouldn't be used as a key here:
        # FIXME: the field is called layerName but it is the qgs_layer_id
        self.layerName = layer.qgs_layer_id
        self.layerDatasource = layer.datasource
        self.appName = appName
        if kwargs.get('user'):
            self.user = kwargs['user']
        if kwargs.get('sessionid'):
            self.sessionid = kwargs['sessionid']

        self.initialFeatureLockedIds = []
        self.getInitialUserFeatureLocked = []
        self.getInitialUserFeatureLockedByFeatureId = {}
        self.clientLockedFeatures = {}

    def getInitialFeatureLockedIds(self):
        """
        Check and return initial features id locked
        """

        # first remove features lock with sessions expired
        sessions = Session.objects.filter(expire_date__lte=timezone.now())
        session_ids = [s.session_key for s in sessions]

        features_to_unlock = LockModel.objects.filter(
            sessionid__in=session_ids)
        LayerLock.unLockExpiredFeatures(features_to_unlock)

        filters = {
            'layer_name': self.layerName,
            'app_name': self.appName,
            'layer_datasource': self.layerDatasource
        }

        featuresLocked = LockModel.objects.filter(**filters)
        for f in featuresLocked:
            self.initialFeatureLockedIds.append(f.feature_id)
            if getattr(self, 'user') and \
                    (f.user == self.user or (self.user.is_anonymous and getattr(settings, 'EDITING_ANONYMOUS', False))) \
                    and getattr(self, 'sessionid') \
                    and f.sessionid == self.sessionid:
                self.getInitialUserFeatureLocked.append(f)
                self.getInitialUserFeatureLockedByFeatureId[f.feature_id] = f.feature_lock_id

    def lockFeature(self, fid, save=False):
        """
        Build Lock Model istance, and optional save it
        """
        featureLockId = hashlib.md5()
        toCrypt = str(fid) + self.layerName + \
            self.appName + self.layerDatasource
        if getattr(self, 'sessionid'):
            toCrypt += self.sessionid
        featureLockId.update(toCrypt.encode('utf-8'))
        featureLock = LockModel(
            feature_id=fid,
            layer_name=self.layerName,
            app_name=self.appName,
            layer_datasource=self.layerDatasource,
            feature_lock_id=featureLockId.hexdigest()
        )

        if getattr(self, 'user'):
            if self.user.pk:
                featureLock.user = self.user
        if getattr(self, 'sessionid'):
            featureLock.sessionid = self.sessionid

        if save:
            featureLock.save()

        return featureLock

    def modelLock2dict(self, lock):
        """
        Build dict locked feature forom model for api output
        """
        return {
            'featureid': lock.feature_id,
            'lockid': lock.feature_lock_id
        }

    def lockFeatures(self, featuresIds):
        """
        Lock features
        :param featuresIds: list Features layer ids to lock
        """

        # first get initial features locked
        self.getInitialFeatureLockedIds()

        # find feature to lock
        self.newFeatureToLockIds = list(
            set(featuresIds) - set(self.initialFeatureLockedIds))

        potentialLockIds = []
        lockModels = []
        for fid in self.newFeatureToLockIds:
            featureLock = self.lockFeature(fid)
            potentialLockIds.append(featureLock.feature_lock_id)
            lockModels.append(featureLock)

        LockModel.objects.bulk_create(lockModels)

        locks = LockModel.objects.filter(feature_lock_id__in=potentialLockIds)
        lockedFeatures = []
        for lock in locks:
            lockedFeatures.append(self.modelLock2dict(lock))

        if getattr(self, 'user') and len(self.getInitialUserFeatureLocked):
            for f in self.getInitialUserFeatureLocked:
                if f.feature_id in featuresIds:
                    lockedFeatures.append(self.modelLock2dict(f))

        return lockedFeatures

    @classmethod
    def unLockExpiredFeatures(cls, featuresLocked):

        for featureLocked in featuresLocked:
            featureLocked.delete()
            # cls.unLockFeature(featureLocked.feature_lock_id)

    @classmethod
    def unLockFeature(cls, featureLockId):
        LockModel.objects.get(feature_lock_id=featureLockId).delete()

    @classmethod
    def unLockFeatures(cls, featureLockIds):
        featuresLocked = LockModel.objects.filter(
            feature_lock_id__in=featureLockIds)
        for featureLock in featuresLocked:
            featureLock.delete()

    def unLockFeatureByKeys(self, **kwargs):

        featuresToUnlock = LockModel.objects.filter(**kwargs)
        for f in featuresToUnlock:
            f.delete()

    def unLockFeatureBySession(self):

        featuresToUnlock = LockModel.objects.filter(sessionid=self.sessionid)
        for f in featuresToUnlock:
            f.delete()

    def checkFeatureLocked(self, feature_id):

        # check if feature_id is in self.clientLockedFeatures
        # after check if is presente in db if no expired
        featureids_locked = [k for k in self.clientLockedFeatures.keys()]

        if len(featureids_locked) > 0 and type(featureids_locked[0]) == str:
            feature_id = str(feature_id)
        if feature_id in featureids_locked:
            # check in lockid db
            return self.clientLockedFeatures[feature_id] in self.getInitialUserFeatureLockedByFeatureId.values()
        else:
            return False

    def setLockeFeaturesFromClient(self, lockedFeatures):
        """
        Get lockedFeatures from client post for to check integrity data
        """

        # rebuild by featureid
        self.clientLockedFeatures = {lf['featureid']: lf['lockid'] for lf in lockedFeatures}


def enable_feature_lock(request, aucn_settings_name='EDITING_AUTH_CLASS_NO_LOCK_FEATURES', elf_setting_name='EDITING_LOCK_FEATURES'):
    """
    Checks whether features should be locked based on Django settings and authentication class.

    :param request: The Django request object.
    :type request: django.http.HttpRequest

    :param aucn_settings_name: The settings poperty ti use for get list of authentication class name that disables feature locking.
    :type aucn_settings_name: str, optional

    :param elf_setting_name: The name of the setting to check. If this setting is set to False in Django settings, features are not locked.
    :type elf_setting_name: str, optional

    :returns: True if features should be locked; False otherwise.
    :rtype: bool
    """
    if not getattr(settings, elf_setting_name, True):
        return False
    auth_class = request.successful_authenticator.__class__.__name__ if hasattr(request, 'successful_authenticator') else None
    if  auth_class in getattr(settings, aucn_settings_name, []):
        return False
    return True

def get_sessionid_from_request(request):
    """
    Get sessionid from request, if not present create a new one for anonymous user
    :param request: django request object
    :return: sessionid string
    """

    # Default case 
    sessionid = settings.ANONYMOUS_USER_SESSIONID

    try:
        # Check if user is authenticated with a session
        sessionid = request.COOKIES[settings.SESSION_COOKIE_NAME] 
    except:
        # Check for other authentication methods
        auth_class = request.successful_authenticator.__class__.__name__ if hasattr(request, 'successful_authenticator') else None
        if auth_class in ['JWTAuthentication', 'TokenAuthentication']:
            # for JWT and Token authentication use a hash of user id as sessionid
            if not request.user.is_anonymous:
                sessionid = hashlib.md5()
                toCrypt = str(request.user.pk) + (request.user.username if request.user.username else '') + (request.user.email if request.user.email else '')
                sessionid.update(toCrypt.encode('utf-8'))
                sessionid = sessionid.hexdigest()
    
    return sessionid
        
        
from django.conf import settings
from django.core.cache import caches

#todo: rewrite for python3 memcached cache.
#from memcached_stats import MemcachedStats
import shutil


class TilestacheCache(object):
    """
    Base cache class
    """

    def __init__(self, cache_dict=None):
        self.cache_dict = cache_dict if cache_dict else dict()
        self._init_cache_dict()

    def _init_cache_dict(self):
        pass

    def reset_cache_layer(self, layer_key_name):
        pass


class TilestacheCacheTest(object):

    def _init_cache_dict(self):

        self.cache_dict = {
                'name': 'Test'
            }


class TilestacheCacheS3(TilestacheCache):

    def _init_cache_dict(self):
        self.cache_dict = {
            'name': 'S3',
            'bucket': getattr(settings, 'TILESTACHE_CACHE_S3_BUCKET', 'g3wsuite-data'),
            'access': getattr(settings, 'TILESTACHE_CACHE_S3_ACCESS', ''),
            'secret': getattr(settings, 'TILESTACHE_CACHE_S3_SECRET', '')
        }

    def reset_cache_layer(self, layer_key_name):

        # todo
        pass


class TilestacheCacheDisk(TilestacheCache):
    """
    Class to manage tilestache of memcached type
    """

    def _init_cache_dict(self):
        self.cache_dict = {
            'name': 'Disk',
            'path': getattr(settings, 'TILESTACHE_CACHE_DISK_PATH', '/tmp/tilestache_g3wsuite'),
            'umask': getattr(settings, 'TILESTACHE_CACHE_DISK_UMASK', '0000')
        }

    def reset_cache_layer(self, layer_key_name):
        shutil.rmtree("{}/{}".format(self.cache_dict['path'], layer_key_name), ignore_errors=True)


class TilestacheCacheMemcache(TilestacheCache):
    """
    Class to manage tilestache of memcached type
    """

    cache_name = getattr(settings, 'TILESTACHE_CACHE_NAME', 'mced')

    memcache_key_prefix = getattr(settings, 'TILESTACHE_MEMCACHE_KEY_PREFIX', 'tilestache-1839')

    def _get_location(self):

        return settings.CACHES[self.cache_name]['LOCATION']

    def _init_cache_dict(self):

        location = self._get_location()
        self.cache_dict = {
            "name": "Memcache",
            "servers": location if isinstance(location, list) else [location],
            "revision": 0,
            "key prefix": self.memcache_key_prefix
        }

    def reset_cache_layer(self, layer_key_name):

        cache = caches[self.cache_name]
        location = self._get_location()
        location = location[0] if isinstance(location, list) else location
        location = location.split(':')
        mem = MemcachedStats(location[0], location [1])
        keys = mem.keys()

        for key in keys:
            if key.startswith('{}/{}/{}'.format(self.memcache_key_prefix, '0', layer_key_name)):
                cache.delete(key)


CACHE_CLASSES = {
        'Disk': TilestacheCacheDisk,
        'Memcache': TilestacheCacheMemcache,
        'Test': TilestacheCacheTest,
        'S3': TilestacheCacheS3
    }
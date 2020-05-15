from django.conf import settings
from django.apps import apps
from django.http.request import QueryDict
from django.urls import reverse
from TileStache import parseConfig
from TileStache.Config import _parseConfigLayer
from caching.models import G3WCachingLayer
from django.apps import apps
from django.core.cache import cache, caches
from .cache import CACHE_CLASSES
import shutil
import os
import fcntl
import logging
import time

logger = logging.getLogger('g3wadmin.debug')

TILESTACHE_CACHE_BUFFER_SIZE = getattr(settings, 'TILESTACHE_CACHE_BUFFER_SIZE', None)

LAYER_CLASSES = dict()

for app_name in settings.G3WADMIN_PROJECT_APPS:
    try:
        projectAppModule = __import__('{}.cache'.format(app_name))
        LAYER_CLASSES[app_name] = getattr(projectAppModule.cache, 'TilestacheLayer')
    except:
        continue


def get_config():
    """
    Get global config tilestache object
    :return:
    """


    # si prova con dict
    current_cfg = TilestacheConfig.get_cache_config_dict()
    if current_cfg:
        return TilestacheConfig(config_dict=current_cfg)
    else:
        cfg = TilestacheConfig()
        TilestacheConfig.set_cache_config_dict(cfg.config_dict)
        return cfg


class TilestacheConfig(object):
    """
    Wrapper class for tielstache config object
    """

    config_dict = dict()
    file_hash_name = getattr(settings, 'TILESTACHE_FILE_HASH', '/tmp/tilestache_hash_file.txt')
    cache_key = getattr(settings, 'TILESTACHE_CACHE_KEY', 'tilestache_cfg_id')
    cache_name = getattr(settings, 'TILESTACHE_CACHE_NAME', 'mced')

    def __init__(self, config_dict=None):

        if config_dict:
            self.config_dict = config_dict
            self.init_cache()
        else:
            self.init_cache()
            self.config_dict.update({'cache': self.cache.cache_dict})
        self.config = parseConfig(self.config_dict)
        try:
            self.init_layers()
        except:
            pass

    def init_cache(self):

        # build cache class to instance
        cache_type = getattr(settings, 'TILESTACHE_CACHE_TYPE', 'Test')
        cache_type = cache_type[0].upper() + cache_type[1:].lower()

        self.cache = CACHE_CLASSES[cache_type]()


    def init_layers(self):
        """
        Add layers to tilestache config obj on startup
        :return:
        """

        # get caching layers activated
        caching_layers = G3WCachingLayer.objects.all()
        for caching_layer in caching_layers:
            self.add_layer(str(caching_layer), caching_layer)

    def build_layer_dict(self, caching_layer, layer_key_name):

        layer_dict = LAYER_CLASSES[caching_layer.app_name](caching_layer, layer_key_name).layer_dict

        if TILESTACHE_CACHE_BUFFER_SIZE is not None:
            layer_dict["metatile"] = { "buffer": TILESTACHE_CACHE_BUFFER_SIZE }

        # add layer_dict to config_dict
        if 'layers' not in self.config_dict:
            self.config_dict['layers'] = dict()
        self.config_dict['layers'][layer_key_name] = layer_dict

        return layer_dict

    def add_layer(self, layer_key_name, caching_layer):
        """
        Add layer to tilestache config
        :param layer_key_name:
        :param layer_dict:
        :return:
        """
        self.config.layers[layer_key_name] = _parseConfigLayer(self.build_layer_dict(caching_layer, layer_key_name),
                                                               self.config, dirpath='.')

    def remove_layer(self, layer_key_name):
        """
        Remove layer from tilestache config obj
        :param layer_key_name:
        :return: None
        """
        del(self.config.layers[layer_key_name])

    def erase_cache_layer(self, layer_key_name):
        """
        Delete cache by provder cache
        :param layer_key_name:
        :return:
        """

        self.cache.reset_cache_layer(layer_key_name)

    def set_cache_hash(self, cid):
        cache.set(self.cache_key, cid, None)

    def get_cache_hash(self):
        return cache.get(self.cache_key)

    @classmethod
    def set_cache_config_dict(cls, cid):
        caches[cls.cache_name].set(cls.cache_key, cid, None)

    @classmethod
    def get_cache_config_dict(cls):
        return caches[cls.cache_name].get(cls.cache_key)

    def reset_cache_hash(self):
        cache.delete(self.cache_key)

    def save_hash_file(self):
        """
        Write has file for check tilestache config between processes
        :param force:
        :return:
        """

        cid = time.time()
        '''
        f = open(self.file_hash_name, 'w+')
        f.write(str(cid))
        f.close()
        '''

        with open(self.file_hash_name, "w") as f:
            logger.debug('CID salvo file {}'.format(cid))
            fcntl.flock(f, fcntl.LOCK_EX | fcntl.LOCK_NB)
            f.write(str(cid))
            fcntl.flock(f, fcntl.LOCK_UN)

        self.set_cache_hash(cid)

    def read_hash_file(self):

        if os.path.exists(self.file_hash_name):
            f = open(self.file_hash_name, 'r')
            id = f.read()
            f.close()
            return id if id else None
        else:
            return None




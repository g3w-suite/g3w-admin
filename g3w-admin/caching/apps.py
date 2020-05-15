from django.apps import AppConfig


class CachingConfig(AppConfig):

    name = 'caching'
    verbose_name = 'Caching'

    def ready(self):

        # import signal handlers
        import caching.receivers

        # init tilestache config.obj
        from .utils import TilestacheConfig
        cfg = TilestacheConfig()
        TilestacheConfig.set_cache_config_dict(cfg.config_dict)




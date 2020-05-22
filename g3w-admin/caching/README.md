# G3W-ADMIN-CACHING

G3W-ADMIN module for caching layers data by tilestache (http://tilestache.org/).

##***IMPORTANT***
At the moment module works only with **TILESTACHE_CACHE_TYPE = 'Disk'**, soon try to fix Memcached cache system.

Activation
------------
Add caching module to G3W_LOCAL_MORE_APPS config value inside local_settings.py:

```python
G3WADMIN_LOCAL_MORE_APPS = [
    ...
    'caching',
    ...
]
```
    
Apply migrations:

```bash
    ./manage.py migrate caching
```

Add tilestache to django settings file

```python
...
TILESTACHE_CACHE_NAME = 'default'
TILESTACHE_CACHE_TYPE = 'Disk' # or 'Memcache'
TILESTACHE_CACHE_DISK_PATH = '/tmp/tilestache_cache/'
...
```
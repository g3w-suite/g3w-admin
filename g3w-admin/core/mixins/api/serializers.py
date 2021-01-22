from rest_framework.fields import empty

import logging

LOGGER = logging.getLogger(__name__)

class G3WRequestSerializer(object):
    """
    DRF mixin serializer for to get django request object.
    """
    def __init__(self, instance=None, data=empty, **kwargs):

        try:
            self.request = kwargs['request']
            del (kwargs['request'])
        except:
            LOGGER.warning('Serializer without request: it might be ok when called from a management command')
            self.request = None

        super(G3WRequestSerializer, self).__init__(instance, data, **kwargs)

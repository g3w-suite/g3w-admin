from rest_framework.fields import empty


class G3WRequestSerializer(object):
    """
    DRF mixin serializer for to get django request object.
    """
    def __init__(self, instance=None, data=empty, **kwargs):

        self.request = kwargs['request']
        del (kwargs['request'])

        super(G3WRequestSerializer, self).__init__(instance, data, **kwargs)
from model_utils import Choices


class G3WChoices(Choices):
    """
    Custom G3W model_utils widget.
    """
    def __setitem__(self, key, value):
        self._store((key, key, value), self._triples, self._doubles)




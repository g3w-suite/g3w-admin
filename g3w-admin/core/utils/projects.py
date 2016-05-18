

class CoreMetaLayer(object):

    def __init__(self, start=1):
        self.start = start
        self.current = self.start
        self.toIncrement = False
        self.countLayer = 0

    def increment(self, value=1):
        self.current += value

    def getCurrentByLayer(self, layer):
        """
        Get and set current value by layer type and policy of project app
        To implement for every Project App
        """
        pass

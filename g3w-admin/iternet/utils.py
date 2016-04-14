from iternet.models import Config


def getLayerIternetIdByName(layerName, object=False):
    layers = Config.getData().project.layer_set.filter(name=layerName)
    if len(layers) == 1:
        if object:
            return layers[0]
        else:
            return layers[0].pk
    else:
        return None
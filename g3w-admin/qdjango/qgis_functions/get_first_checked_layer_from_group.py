from qgis.core import *
from qgis.gui import *

import logging

logger = logging.getLogger('qdjango')


@qgsfunction(args='auto', group='Custom', referenced_columns=[])
def get_first_checked_layer_from_group(legend_group, feature, parent):
    """
    Returns the id of the first visible (checked) layer from a given legend group name
    """
    try:
        p = QgsProject.instance()
        r = p.layerTreeRoot()
        g = r.findGroup(legend_group)
        logger.debug('QGIS function get_first_checked_layer_from_group returned {}'.format(g.checkedLayers()[0].name(
        )))
        return g.checkedLayers()[0].id()
    except:
        pass
    return None

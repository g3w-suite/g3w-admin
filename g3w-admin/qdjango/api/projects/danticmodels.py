# coding=utf-8
"""" Pydantic models
.. note:: This program is free software; you can redistribute it and/or modify
    it under the terms of the Mozilla Public License 2.0.

"""

__author__ = 'lorenzetti@gis3w.it'
__date__ = '2024-04-17'
__copyright__ = 'Copyright 2015 - 2024, Gis3w'
__license__ = 'MPL 2.0'


from pydantic import BaseModel
from typing import List, Dict, Optional, Union


class TreeItemPDModel(BaseModel):
    name: str
    id: str
    visible: bool


class TreeNodeItemPDModel(BaseModel):
    name: str
    #mutually-exclusive: Optional[bool] = None # Todo: replace in the future '-' with '_'
    node: Optional[List[Union['TreeItemPDModel', TreeItemPDModel]]] = None
    checked: bool
    expanded: bool


class ThemeProjectPDModel(BaseModel):
    layerstree: List[Union[TreeItemPDModel, TreeNodeItemPDModel]]
    styles: Dict[str, str]

from django.urls import reverse
import re
from core.utils.structure import FORM_FIELD_TYPE_CHECK, FORM_FIELD_TYPE_SELECT, FORM_FIELD_TYPE_SELECT_AUTOCOMPLETE
from .qgis import explode_expression

# add form input type based on qgis edittypes
FORM_FIELD_TYPE_QGIS_DATETIME = 'datetimepicker'
FORM_FIELD_TYPE_QGIS_RANGE = 'range'
FORM_FIELD_TYPE_QGIS_UNIQUE_VALUE = 'unique'
FORM_FIELD_TYPE_QGIS_EXTERNAL_RESOURCE = 'media'

import re


class QgisEditType(object):
    """
    Class to read edittype project settings and return client editing form structure
    """

    def __init__(self, **kwargs):

        for key, value in list(kwargs.items()):
            setattr(self, key, value)

    @property
    def input_form(self):
        return dict()

    def make_bool_from_value(self, value)->bool:
        """
        From QGIS for widget parameters must be boolean for G3W-CLIENT.
        Some time the values of widget parameter may be a boolean or a string/numeric
        :param value: the value of a widget parameter
        :return: bool
        :rtype: bool
        """

        return True if value == '1' or value == 'true' or value is True else False


class QgisEditTypeCheckBox(QgisEditType):
    """
    Class to read check-box edittype.
    """

    field_type = FORM_FIELD_TYPE_CHECK

    @property
    def input_form(self):
        displaymethod = getattr(self, 'TextDisplayMethod', 0)
        checkedstate = getattr(self, 'CheckedState','TRUE')
        uncheckedstate = getattr(self, 'UncheckedState', 'TRUE')
        return {
            'input': {
                'type': self.field_type,
                'options': {
                    'values': [
                        {
                            'value': checkedstate,
                            'label': checkedstate if displaymethod == 1 else 'True',
                            'checked': True
                         },
                        {
                            'value': uncheckedstate,
                            'label': uncheckedstate if displaymethod == 1 else 'False',
                            'checked': False
                        },
                    ]
                }
            }
        }


class QgisEditTypeDateTime(QgisEditType):
    """
    Class to read check-box edittype.
    """

    field_type = FORM_FIELD_TYPE_QGIS_DATETIME

    @property
    def input_form(self):

        return {
            'input': {
                'type': self.field_type,
                'options': {
                    'formats': [
                        {
                            'date': bool(len(re.findall('/yyyy|MM|dd/', self.field_format)))
                            if hasattr(self, 'field_format') else True,
                            'time': bool(len(re.findall('/HH|mm|ss/', self.field_format)))
                            if hasattr(self, 'field_format') else False,
                            'fieldformat': self.field_format if hasattr(self, 'field_format') else 'yyyy-MM-dd',
                            'displayformat': self.display_format if hasattr(self, 'display_format') else 'yyyy-MM-dd',
                            'default': self.default if hasattr(self, 'default') else None
                        },

                    ]
                }
            }
        }


class QgisEditTypeRange(QgisEditType):
    """
    Class to read check-box edittype.
    """

    field_type = FORM_FIELD_TYPE_QGIS_RANGE

    @property
    def input_form(self):

        return {
            'input': {
                'type': self.field_type,
                'options': {
                    'values': [
                        {
                            'min': self.Min if hasattr(self, 'Min') else -2147483647,
                            'max': self.Max if hasattr(self, 'Max') else 2147483648,
                            'Step': self.Step if hasattr(self, 'Step') else 1,
                            'default': self.default if hasattr(self, 'default') else None
                        },

                    ]
                }
            }
        }


class QgisEditTypeValueMap(QgisEditType):
    """
    Class to read check-box edittype.
    """

    field_type = FORM_FIELD_TYPE_SELECT

    @property
    def input_form(self):

        return {
            'input': {
                'type': self.field_type,
                'options': {
                    'values': self.values,
                    'default': self.default if hasattr(self, 'default') else None
                }
            }
        }


class QgisEditTypeValueRelation(QgisEditTypeValueMap):
    """
    Class for Value relation and autocomplete.
    """

    field_type = FORM_FIELD_TYPE_SELECT_AUTOCOMPLETE

    @property
    def input_form(self):

        input_form = super(QgisEditTypeValueRelation, self).input_form

        # Explode Filter Expression
        filter_expression = explode_expression(self.FilterExpression) if self.FilterExpression != '' else None

        # add params for get value
        input_form['input']['options'].update({
            'key': self.Key,
            'value': self.Value,
            'usecompleter': self.make_bool_from_value(self.UseCompleter),
            'orderbyvalue': self.make_bool_from_value(self.OrderByValue),
            'allowmulti': self.make_bool_from_value(self.AllowMulti),
            'layer_id': self.Layer,
            'loading': {
                'state': None
            },
            'filter_expression': filter_expression,
        })

        return input_form


class QgisEditTypeUniqueValue(QgisEditType):
    """
    Class to read unique_value edittype.
    """

    field_type = FORM_FIELD_TYPE_QGIS_UNIQUE_VALUE

    @property
    def input_form(self):

        return {
            'input': {
                'type': self.field_type,
                'options': {
                    'values': list(),
                    'editable': True if self.fieldEditable == '1' else False,
                    'default': self.default if hasattr(self, 'default') else None
                }
            }
        }


class QgisEditTypeExternalResource(QgisEditType):
    """
    Class to read external_resource edittype.
    """

    field_type = FORM_FIELD_TYPE_QGIS_EXTERNAL_RESOURCE

    @property
    def input_form(self):

        # try to get url
        try:
            upload_url = reverse('editing-upload')
        except:
            upload_url = None

        return {
            'input': {
                'type': self.field_type,
                'options': {
                    'editable': True if self.fieldEditable == '1' else False,
                    'uploadurl': upload_url,
                    'default': self.default if hasattr(self, 'default') else None

                }
            }
        }


class QgisEditTypeRelationReference(QgisEditTypeValueMap):
    """
    Class for Relation Reference and autocomplete.
    """

    field_type = FORM_FIELD_TYPE_SELECT_AUTOCOMPLETE

    @property
    def input_form(self):

        input_form = super(QgisEditTypeRelationReference, self).input_form


        # add params for get value
        input_form['input']['options'].update({
            'relation_id': getattr(self, 'Relation', None), # Possible QGIS bug
            'relation_reference': True,
            'loading': {
                'state': None
            },
            'filter_expression': self.FilterExpression if hasattr(self, 'FilterExpression') else None,
            'chain_filters': self.ChainFilters if hasattr(self, 'ChainFilters') else None,
            'filter_fields': self.FilterFields if hasattr(self, 'FilterFields') else None
        })

        return input_form

MAPPING_EDITTYPE_QGISEDITTYPE = {
    'CheckBox': QgisEditTypeCheckBox,
    'DateTime': QgisEditTypeDateTime,
    'Range': QgisEditTypeRange,
    'ValueMap': QgisEditTypeValueMap,
    'UniqueValues': QgisEditTypeUniqueValue,
    'ExternalResource': QgisEditTypeExternalResource,
    'ValueRelation': QgisEditTypeValueRelation,
    'RelationReference': QgisEditTypeRelationReference
}

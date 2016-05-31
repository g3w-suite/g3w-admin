from PIL import Image
from django.forms import ValidationError
from django.utils.translation import ugettext, ugettext_lazy as _
from crispy_forms.layout import Div, HTML

def CheckIsAnImage(name,file):
    try:
        image = Image.open(file)
        image.verify()
    except Exception:
        raise ValidationError(_('{} is no a valid image'.format(name)),code='image_invalid')


def crispyBoxBaseLayer(form, **kwargs):
    """
    Build a Crispy object layout element (div) for on AdminLTE2 box structure.
    For baselayer project selection
    :param form: Django form instance
    :return: Crispy form layout object
    """

    boxCssClass = kwargs.get('boxCssClass', 'col-md-6')

    return Div(
                Div(
                    Div(
                        HTML("<h3 class='box-title'><i class='fa fa-map'></i> {}</h3>".format(
                            _('Default base layer'))),
                        css_class='box-header with-border'
                    ),
                    Div(
                        'baselayer',
                        css_class='box-body',

                    ),
                    css_class='box box-success'
                ),
                css_class='{}'.format(boxCssClass)
            )


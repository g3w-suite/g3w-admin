from django.utils.translation import gettext_lazy as _
from crispy_forms.layout import Div, HTML, Field
from usersmanage.utils import userHasGroups
from usersmanage.configs import G3W_EDITOR1


def crispyBoxBaseLayer(form, **kwargs):
    """
    Build a Crispy object layout element (div) for on AdminLTE2 box structure.
    For baselayer project selection
    :param form: Django form instance (not used)
    :return: Div Crispy form layout object
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


def crispyBoxMacroGroups(form, **kwargs):
    """
    Build a Crispy object layout element (div) for on AdminLTE2 box structure.
    For macrogroups multiple selections
    :param form: Django form instance (not used)
    :return: Div Crispy form layout object
    """

    if form.request.user.is_superuser or userHasGroups(form.request.user, [G3W_EDITOR1]):
        return Div(
                    Div(
                        Div(
                            HTML("<h3 class='box-title'><i class='fa fa-globe'></i> {}</h3>".format(
                                _('MACRO Groups'))),
                            css_class='box-header with-border'
                        ),
                        Div(
                            Div(
                                Field('macrogroups',
                                      **{'css_class': 'select2 col-md-12', 'multiple': 'multiple',
                                         'style': 'width:100%;'}),
                            ),
                            css_class='box-body'
                        ),
                        css_class='box box-danger'
                    ),
                    css_class='col-md-6'
                )
    else:
        return None
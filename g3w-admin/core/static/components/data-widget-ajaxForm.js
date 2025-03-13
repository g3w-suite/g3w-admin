/**
 * @file ORIGINAL SOURCE: g3w-admin/core/static/js/g3wadmin/widget.js@v3.9.
 * @since g3w-admin@v4.0
 */

/**
 * Ajax form from form-url and send data by ajax call
 * 
 * [data-widget-type="ajaxForm"]
 */
export default async function ajaxForm(item) {
  try {
    const url = $(item).attr('data-form-url');
    if (undefined === $(item).attr('data-form-url')) {
      throw 'data-form-url is not defined';
    }
    const res = await (await fetch(url)).text();
    // open modal to show list of add links
    const modal = g3wadmin.currentModal = g3wadmin.ui._buildModal({
      modalTitle: $(item).attr('data-modal-title') ?? gettext('Form title'),
      modalBody: res,
      modalSize: $(item).attr('data-modal-size') ?? ''
    });
    modal.data.$evoker = $(item);
    modal.show();
    const form = new ga.forms.form(modal.$modal.find('form'));
    form.$form.attr('action', $(item).attr('data-form-url'));
    form.on('keypress', e => { 13 === e.keyCode && e.preventDefault(); }); // prevent default behavior when pressing "Return" key
    form.successAction = () => { modal.hide(); location.reload(); };       // close modal and reload page
    modal.$modal.find('.modal-button-confirm').click(form.sendData);       // add form send data action
    // init form input plugins
    ga.ui.initRadioCheckbox(modal.$modal[0]);
    $(modal.$modal).find('.datepicker').datepicker({ language: SETTINGS.CURRENT_LANGUAGE_CODE });
    $(modal.$modal).find('.timepicker').timepicker({ showMeridian: false, showInputs: true });
    $(modal.$modal).find('.select2').select2();
  } catch (e) {
    ga.widget.showError(e.message)
  }
}
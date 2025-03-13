/**
 * @file ORIGINAL SOURCE: g3w-admin/qdjango/static/qdjango/js/widget.js@v3.9.
 * @since g3w-admin@v4.0
 */

const EDITOR = g3wadmin.Qdjango.widgetEditor;

export default function generateLawRow(values) {

  // show stored values
  if (EDITOR.widget.body && !values) {
    values = EDITOR.widget.body;
    delete EDITOR.widget.body;
  }

  $(".rightCol").append($(/* html */`
    <div class="blocco" style="margin-top: 30px;">
      <div class="box box-success" >
        <div class="box-header with-border">
          <h3 class="box-title">Selezione campo contenente riferimento normativa</h3>
        </div>
        <div class="row">
          <div class="col-md-5"><span class="label label-success">Campo</span></div>
          <div class="col-md-2"><span class="label label-success">Delimiter</span></div>
          <div class="col-md-5"><span class="label label-success">Law</span></div>
        </div>
        <div class="row">
          <!-- fieldSelect -->
          <div class="col-md-5 fieldSelect">
            <select class="form-control" name="field">
            ${ (EDITOR.layerColumns || []).map(v => /* html */`<option value="${v.name}" ${values?.field === v.name ? "selected" : ""}>${v.name}</option>`).join('') }
            </select>
          </div>
          <!-- delimiterSelect -->
          <div class="col-md-2 delimiterSelect">
            <select class="form-control" name="delimiter">
            ${ [".", ",", ";"].map(v => /* html */`<option value="${v}" ${values?.delimiter === v ? "selected" : ""}>${v}</option>`).join('') }
            </select>
          </div>
          <!-- lawSelect -->
          <div class="col-md-5 lawSelect">
            <select class="form-control" name="law_id">
              ${ (EDITOR.lawslist || []).map(v => /* html */`<option value="${v.id}" ${values?.law_id === v.id ? "selected" : ""}>${v.name}(${v.variation})</option>`).join('') }
            </select>
          </div>
        </div>
      </div>
    </div>
  `));
}

$(EDITOR).on('onsubmitform:tooltip', () => {
  let obj = {}
  $.each($(".rightCol").find(".blocco"), function (i, v) {
    v = $(v)
    obj = {
      field: v.find(".fieldSelect").find("select").val(),
      delimiter: v.find(".delimiterSelect").find("select").val(),
      law_id: parseInt(v.find(".lawSelect").find("select").val()),
    }
  });
  $("#id_body").val(JSON.stringify(obj));
});
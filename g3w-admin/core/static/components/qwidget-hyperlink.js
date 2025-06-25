/**
 * @file ORIGINAL SOURCE: g3w-admin/qdjango/static/qdjango/js/widget.js@v3.9.
 * @since g3w-admin@v4.0
 */

const EDITOR = g3wadmin.Qdjango.widgetEditor;

export default function generateHyperlinkRow(values) {

  // show stored values
  if (EDITOR.widget.body && !values) {
    $.each(EDITOR.widget.body, function () {
      generateHyperlinkRow(this);
    });
    delete EDITOR.widget.body;
    return;
  }

  // new row
  const div = $(/* html */`
    <div class="well blocco alert alert-success row" style="margin-top: 20px;">
      <div class="row">
        <button class="btn close"><i class="fa fa-trash" style="color:red;"></i></button>
      </div>
      <div class="row">
        <div class="col-md-4"><span class="label label-success">Campo</span></div>
        <div class="col-md-4"><span class="label label-success">Alias</span></div>
        <div class="col-md-4"><span class="label label-success">Nome nuovo field</span></div>
      </div>
      <div class="row">
        <!-- fieldSelect -->
        <div class="col-md-4 fieldSelect">
          <select name="field">
            ${ (EDITOR.layerColumns || []).map(v => /* html */`<option value="${v.name}" ${values?.field === v.name ? "selected" : ""}>${v.name}</option>`).join('') }
          </select>
        </div>
        <!-- textInput -->
        <div class="col-md-4 textInput">
          <input type="text" name="field_text" value="${values?.text || ''}" />
        </div>
        <!-- newFieldName -->
        <div class="col-md-4 newFieldName">
          <input type="text" name="new_field_name" value="${values?.nuovo_field || ''}" />
        </div>
      </div>
    </div>
  `);

  div.find(".close").on('click', function () { $(this).closest('.alert').alert("close").remove(); });

  $(".rightCol").append(div);
}

$(EDITOR).on('onsubmitform:hyperlink', () => {
  const obj = [];
  $.each($(".rightCol").find(".blocco"), function (i, v) {
    obj.push({
      field:       $(v).find(".fieldSelect").find("select").val(),
      text:        $(v).find(".textInput").find("input").val(),
      nuovo_field: $(v).find(".newFieldName").find("input").val(),
    })
  });
  $("#id_body").val(JSON.stringify(obj));
});
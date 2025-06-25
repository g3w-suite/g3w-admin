/**
 * @file ORIGINAL SOURCE: g3w-admin/qdjango/static/qdjango/js/widget.js@v3.9.
 * @since g3w-admin@v4.0
 */

const EDITOR = g3wadmin.Qdjango.widgetEditor;

export default function generateTooltipRow(values) {

  // show stored values
  if(EDITOR.widget.body && !values) {
    $.each(EDITOR.widget.body, function () {
      g3wadmin.Qdjango.widgetEditor.generateTooltipRow(this);
    });
    delete EDITOR.widget.body;
    return;
  }

  // new row
  var div = $(/* html */`
    <div class="blocco" style="margin-top: 30px;">
      <div class="box box-success" >
        <div class="box-header">
          <h3 class="box-title">Campo da mostrare per tooltip</h3>
          <button class="btn" data-widget="remove"><i class="fa fa-times"></i></button>
        </div>
        <div class="row">
          <div class="col-md-4"><span class="label label-success">Testo</span></div>
          <div class="col-md-4"><span class="label label-success">Campo</span></div>
          <div class="col-md-1"><span class="label label-success">Immagine</span></div>
          <div class="col-md-3 imgSizeLabel" style="display:none"><span class="label label-success">Dimensioni</span></div>
        </div>
        <div class="row">
          <!-- textInput -->
          <div class="col-md-4 textInput">
            <input class="form-control" type="text" name="field_text" value="${values?.text || ""}" />
          </div>
          <!-- fieldSelect -->
          <div class="col-md-4 fieldSelect">
            <select class="form-control" name="field" >
              ${ (EDITOR.layerColumns || []).map(v => /* html */`<option value="${v.name}" ${values?.field === v.name ? "selected" : ""}>${v.name}</option>`).join('') }
            </select>
          </div>
          <!-- bImage -->
          <div class="col-md-1 bImage">
            <button type="button" class="btn"><i class="fa fa-times"></i></button>
          </div>
          <!-- imgSize -->
          <div class="col-md-3 imgSize" style="display: none">
            <input class="form-control col-md-1" type="text" class="img_width" placeholder="width" value="${values?.img_width || ''}">
            <input class="form-control col-md-1" type="text" class="img_height" placeholder="height" value="${values?.img_height || ''}">
          </div>
        </div>
      </div>
    </div>
  `);

  div.find(".close").click(function () {
    $(this)
      .parents(".alert")
      .first()
      .fadeOut(400, function () {
        $(this).alert("close")
        $(this).remove()
      })
  })
  div.find(".bImage button").click(function () {
    // va in esecuzione prima del cambiamento della classe active
    if (!$(this).hasClass("active")) {
      $(this).addClass("btn-success").addClass("active")
      $(this).html('<i class="fa fa-check"></i>')
      $(this).parents(".row").first().find(".imgSize").fadeIn(400)
      $(this).parents(".blocco").first().find(".imgSizeLabel").fadeIn(400)
    } else {
      $(this).removeClass("btn-success").removeClass("active")
      $(this).html('<i class="fa fa-times"></i>')
      $(this).parents(".row").first().find(".imgSize").fadeOut(400)
      $(this).parents(".blocco").first().find(".imgSizeLabel").fadeOut(400)
    }
  })

  $(".rightCol").append(div)

  if (values?.image) {
    div.find(".bImage button").click();
  }
}
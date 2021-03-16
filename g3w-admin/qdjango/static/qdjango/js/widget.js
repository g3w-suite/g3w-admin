/**
 * Created by Francesco Bellina on 2014
 * Modified by Walter Lorenzetti on 2016
 */

ga.Qdjango = {
  urls: {
    constraint: {
      list: "/" + SITE_PREFIX_URL + "qdjango/api/constraint/",
      detail: "/" + SITE_PREFIX_URL + "qdjango/api/constraint/detail/",
    },
    layer: {
      //info: '/' + SITE_PREFIX_URL + 'vector/api/info/layer/',
      user: "/" + SITE_PREFIX_URL + "qdjango/api/info/layer/user/",
      authgroup: "/" + SITE_PREFIX_URL + "qdjango/api/info/layer/authgroup/",
    },
    rule: {
      subset: {
        list: "/" + SITE_PREFIX_URL + "qdjango/api/subsetstringrule/constraint/",
        detail: "/" + SITE_PREFIX_URL + "qdjango/api/subsetstringrule/detail/",
      },
      expression: {
        list: "/" + SITE_PREFIX_URL + "qdjango/api/expressionrule/constraint/",
        detail: "/" + SITE_PREFIX_URL + "qdjango/api/expressionrule/detail/",
      },
    },
  },
  data: {
    viewers: [],
    group_viewers: [],
    current_rules: [],
  },
}

ga.Qdjango.localVars = {}

ga.Qdjango.widgetEditor = {
  fadeNumber: 400,
  layerColumns: null,
  lawslist: null,
  layer: null,
  form: null,
  onAddCallback: null,
  widget: null,
  delimiterItems: [".", ",", ";"],
  widgettype: {
    inputbox: "InputBox",
    selectbox: "SelectBox",
    autocompletebox: "AutoCompleteBox",
  },
  /*widget: [
		{
			'type': 'unique_value_select',
			'label': 'Unique value select',
			'options': null
		}
	],*/

  isset: function (o) {
    if (typeof o == "undefined") return false
    else if (o === null) return false
    return true
  },

  getType: function (str) {
    if (str.indexOf("QSTRING") !== -1 || str.indexOf("QDATE") !== -1 || str.indexOf("STRING") !== -1 || str.indexOf("TEXT") !== -1) return "textfield"
    if (
      str.indexOf("NUMERIC") !== -1 ||
      str.indexOf("DOUBLE PRECISION") !== -1 ||
      str.indexOf("INTEGER") !== -1 ||
      str.indexOf("BIGINT") !== -1 ||
      str.indexOf("REAL") !== -1 ||
      str.indexOf("INT") !== -1 ||
      str.indexOf("DOUBLE") !== -1
    )
      return "numberfield"
  },

  onFormSubmit: function () {
    var that = this
    var obj = {}
    var widget_type = this.widget ? this.widget.widget_type : $("#id_widget_type").val()

    // check is widget-ytpe is changed from loading data
    if ($("#id_widget_type").val() != widget_type) {
      widget_type = $("#id_widget_type").val()
    }

    switch (widget_type) {
      case "hyperlink":
        obj = []
        $.each($(".rightCol").find(".blocco"), function (i, v) {
          v = $(v)
          var tmp = {
            field: v.find(".fieldSelect").find("select").val(),
            text: v.find(".textInput").find("input").val(),
            nuovo_field: v.find(".newFieldName").find("input").val(),
          }
          obj.push(tmp)
        })
        break
      case "search":
        obj = {
          title: $(".rightCol").find("#title").val(), // Search title
          query: "simpleWmsSearch", // It can be removed?
          usewmsrequest: true, // Always set to true
          fields: [],
          results: [
            // Column to show as results, it could be removed?
          ],
          selectionlayer: this.layer, // layer to execute reserach
          selectionzoom: 0, // selection of results 0, 1
          dozoomtoextent: true, // Zoom to results True, False
        }
        $.each($(".rightCol").find(".blocco"), function (i, v) {
          v = $(v)

          var options = {}
          var dependance = v.find(".cmpDependanceSelect").find("select").val()
          if (dependance) {
            options["dependance"] = dependance
          }
          options["numdigaut"] = v.find(".cmpNumDigAutocomplete").find("input").val()

          obj.fields.push({
            name: v.find(".fieldSelect").find("select").val(), // NOME DEL CAMPO DB
            label: v.find(".textInput").find("input").val(), // ETICHETTA DEL CAMPO DI RICERCA
            blanktext: v.find(".descriptionInput").find("input").val(), // TESTO INIZIALE NEL CAMPO
            filterop: v.find(".cmpOperatorSelect").find("select").val(), // OPERATORE DI CONFRONTO (=,&lt;,&gt;,=&lt;,&gt;=,&lt;&gt;)
            widgettype: v.find(".widgetType").find("select").val(), // widgettype
            input: {
              type: that.getType(v.find(".fieldSelect").find("select").find("option:selected").data().type), // TIPO DI CAMPO //
              options: options,
            },
            logicop: v.find("select.logic_operator").val(),
          })
        })

        $.each($(".rightCol").find(".bloccoGenerale").find(".resultFields").find(".row"), function (i, v) {
          v = $(v)
          if (v.hasClass("labels") || !that.isset(v.find(".fieldSelect").find("select").val())) return true
          obj.results.push({ header: v.find(".textInput").find("input").val(), name: v.find(".fieldSelect").find("select").val() })
        })
        break
      case "tooltip":
        obj = []
        $.each($(".rightCol").find(".blocco"), function (i, v) {
          v = $(v)
          var tmp = {
            text: v.find(".textInput").find("input").val(),
            field: v.find(".fieldSelect").find("select").val(),
            image: v.find(".bImage").find("button").hasClass("active"),
          }
          if (tmp.image) {
            tmp.img_width = v.find(".imgSize").find(".img_width").val()
            tmp.img_height = v.find(".imgSize").find(".img_height").val()
          }
          obj.push(tmp)
        })
        break
      case "law":
        var obj = {}
        $.each($(".rightCol").find(".blocco"), function (i, v) {
          v = $(v)
          obj = {
            field: v.find(".fieldSelect").find("select").val(),
            delimiter: v.find(".delimiterSelect").find("select").val(),
            law_id: parseInt(v.find(".lawSelect").find("select").val()),
          }
        })
        break
      default:
        return
    }
    $("#id_body").val(JSON.stringify(obj))
  },

  generateGeneralParams: function (values) {
    var that = this
    var fieldSelect = $('<select class="form-control" name="resultfield"></select>')
    $.each(this.layerColumns, function (i, v) {
      var selected = that.isset(values) && that.isset(values.results) && values.results.length > 0 && values.results[0].name === v.name ? "selected" : ""
      var option = $('<option value="' + v.name + '" ' + selected + ">" + v.name + "</option>")
      fieldSelect.append(option)
    })

    var alInVa = that.isset(values) && that.isset(values.results) && values.results.length > 0 && that.isset(values.results[0].header) ? values.results[0].header : ""
    var textInput = $('<input class="form-control" type="text" name="resultfield_text" value="' + alInVa + '">')

    var tiVa = that.isset(values) && that.isset(values.title) ? values.title : ""
    var title = $('<input class="form-control" type="text" name="title" id="title" value="' + tiVa + '">')

    var div = $(
      '<div class="bloccoGenerale box box-danger">\
						<div class="box-header with-border">\
						<h3 class="box-title">' +
        gettext("General configuration for search widget and results") +
        '</h3>\
						</div>\
						<div class="box-body">\
							<div class="row">\
								<div class="form-group col-md-12">\
									<div class="controls title">\
									<label class="control-label requiredField">' +
        gettext("Search title") +
        "</label>\
									</div>\
								</div>\
							</div>\
						<div>\
					</div>"
    )

    var onAddAction = function (btn, values) {
      var fieldSelect = $('<select class="form-control" name="resultfield"></select>')
      $.each(that.layerColumns, function (i, v) {
        var selected = that.isset(values) && values.dataIndex === v.name ? "selected" : ""
        var option = $('<option value="' + v.name + '" ' + selected + ">" + v.name + "</option>")
        fieldSelect.append(option)
      })

      var alInVa = that.isset(values) && that.isset(values.header) ? values.header : ""
      var textInput = $('<input class="form-control" type="text" name="resultfield_text" value="' + alInVa + '" >')
      var lastRow = btn.parents(".row").first()
      var newRow = $(
        '<div class="row">\
									<div class="col-md-6 fieldSelect"></div>\
									<div class="col-md-5 textInput"></div>\
									<div class="col-md-1" style="padding-left:0px;"></div>\
								</div>'
      )
      lastRow.find(".fieldSelect").append(fieldSelect)
      lastRow.find(".textInput").append(textInput)
      btn.parents(".resultFields").first().append(newRow)
      btn.appendTo(newRow.find(".col-md-1"))
      var remBtn = $('<button type="button" class="btn btn-default remove"><i class="glyphicon glyphicon-minus"></i></button>')
      remBtn.click(function () {
        $(this).parents(".row").first().remove()
      })
      lastRow.find(".col-md-1").append(remBtn)
    }

    div.find("button").click(function () {
      onAddAction($(this))
    })
    div
      .find(".title")
      .append(title)
      .append('<div class="help-block">' + gettext("Client search title identification") + "</div>")

    div.find(".fieldSelect").first().append(fieldSelect)
    div.find(".textInput").first().append(textInput)
    $(".rightCol").append(div)

    if (that.isset(values) && that.isset(values.results) && values.results.length > 1) {
      $.each(values.results, function (i, v) {
        if (i === 0) return true
        onAddAction(div.find("button.add"), v)
      })
    }

    div.fadeIn(this.fadeNumber)
  },

  generateSearchRow: function (values) {
    var that = this

    var fieldSelect = $('<select class="form-control" name="searchfield"></select>')
    $.each(this.layerColumns, function (i, v) {
      var selected = that.isset(values) && values.name === v.name ? "selected" : ""
      var option = $('<option value="' + v.name + '" ' + selected + ">" + v.name + "</option>")
      option.data({ type: v.type })
      fieldSelect.append(option)
    })

    var fiLaVa = that.isset(values) && that.isset(values.label) ? values.label : ""
    var textInput = $('<input class="form-control" type="text" name="searchfield_text" value="' + fiLaVa + '" >')

    var blTeVa = that.isset(values) && that.isset(values.blanktext) ? values.blanktext : ""
    var descriptionInput = $('<input class="form-control" type="text" name="searchfield_description" value="' + blTeVa + '" >')

    var numDigAut = that.isset(values) && that.isset(values.input.options.numdigaut) ? values.input.options.numdigaut : "2"
    var cmpNumDigAutocomplete = $('<input class="form-control" type="text" name="num_dig_autcomplete" value="' + numDigAut + '" >')

    var cmpOperatorSelect = $(
      '<select class="form-control" name="comparison_operator">\
										<option value="eq">= (' +
        gettext("equal") +
        ')</option>\
										<option value="gt">&gt; (' +
        gettext("greater than") +
        ')</option>\
										<option value="lt">&lt; (' +
        gettext("lower than") +
        ')</option>\
										<option value="ltgt">&lt;&gt; (' +
        gettext("not equal") +
        ')</option>\
										<option value="gte">&gt;= (' +
        gettext("greater than equal") +
        ')</option>\
										<option value="lte=">&lt;= (' +
        gettext("lower than equal") +
        ')</option>\
										<option value="LIKE">LIKE (' +
        gettext("like case sensitive") +
        ")</option>\
									</select>"
    )

    // si aggiunge e si fa apparire la dipendenza se seleziona

    var cmpDependanceSelect = $('<select class="form-control" name="dependence_field">' + '<option value=""> ----- </option>' + "</select>")

    var options = that.widgettype

    var widgetSelect = $('<select class="form-control" name="widget_type"></select>')
    $.each(options, function (k, i) {
      widgetSelect.append('<option value="' + k + '">' + i + "</option>")
    })

    // add widget types
    if (this.layer_type != "spatialite") {
      cmpOperatorSelect.append('<option value="ILIKE">ILIKE (' + gettext("like not case sensitive") + ")</option>")
    }

    if (that.isset(values) && that.isset(values.filterop)) cmpOperatorSelect.val($("<div/>").html(values.filterop).text())

    // add control on cmpOperatorSelect for field type:
    fieldSelect.on("change", function () {
      var likeopts = cmpOperatorSelect.find("option[value='LIKE']")
      var ilikeopts = cmpOperatorSelect.find("option[value='ILIKE']")
      var field_type = that.getType($(this).find("option:selected").data().type)
      if (field_type == "numberfield") {
        // remove like and ilike option
        likeopts.remove()
        ilikeopts.remove()
      } else {
        // add like and i like if no just added
        if (likeopts.length == 0) cmpOperatorSelect.append('<option value="LIKE">LIKE (' + gettext("like case sensitive") + ")</option>")
        if (ilikeopts.length == 0) cmpOperatorSelect.append('<option value="ILIKE">ILIKE (' + gettext("like not case sensitive") + ")</option>")
      }
    })

    if (that.isset(values) && that.isset(values.widgettype)) widgetSelect.val($("<div/>").html(values.widgettype).text())

    var div = $(
      '<div class="blocco" style="display: none">\
					<div class="box box-success" >\
							<div class="box-header with-border">\
							<h3 class="box-title">' +
        gettext("Search field settings") +
        '</h3>\
							<div class="box-tools pull-right">\
                    			<button class="btn btn-box-tool close"><i class="fa fa-times"></i></button>\
                  			</div>\
							</div>\
							<div class="box-body">\
								<div class="row advise" style="display: none;">\
									<div class="col-md-offset-2  col-md-8 alert alert-warning">\
									</div>\
								</div>\
								<div class="row">\
									<div class="col-md-3">\
										<div class="controls fieldSelect">\
											<label class="control-label">' +
        gettext("Field") +
        '</label>\
										</div>\
									</div>\
									<div class="col-md-2">\
										<div class="controls widgetType">\
											<label class="control-label">' +
        gettext("Widget") +
        '</label>\
										</div>\
									</div>\
									<div class="col-md-3">\
										<div class="controls textInput">\
											<label class="control-label">' +
        gettext("Alias") +
        '</label>\
										</div>\
									</div>\
									<div class="col-md-4">\
										<div class="controls descriptionInput">\
											<label class="control-label">' +
        gettext("Description") +
        '</label>\
										</div>\
									</div>\
								</div>\
								<div class="row">\
									<div class="col-md-3">\
										<div class="controls cmpNumDigAutocomplete" style="display: none;">\
											<label class="control-label">' +
        gettext("Number of digits") +
        '</label>\
										</div>\
									</div>\
								</div>\
								<div class="row">\
									<div class="col-md-3">\
										<div class="controls cmpOperatorSelect">\
											<label class="control-label">' +
        gettext("Comparison operator") +
        '</label>\
										</div>\
									</div>\
								</div>\
								<div class="row">\
									<div class="col-md-3">\
										<div class="controls cmpDependanceSelectLabel invisible">\
											<label class="control-label">' +
        gettext("Dependency") +
        '</label>\
										</div>\
									</div>\
								</div>\
								<div class="row">\
									<div class="col-md-3 invisible cmpDependanceSelect"></div>\
								</div>\
							</div>\
					</div>\
						<div class="row" style="margin-bottom:20px;">\
						<div class="col-md-offset-4 col-md-4">\
							<select class="form-control logic_operator" name="logic_operator" class="logic_operator" style="display: none">\
								<option value="and">AND</option>\
								<option value="or">OR</option>\
							</select>\
							<div class="help-block invisible">' +
        gettext("Logical join") +
        "</div>\
						</div>\
						</div>\
					</div>"
    )

    div.find(".close").click(function () {
      var blocco = $(this).parents(".blocco").first()
      blocco.find(".logic_operator").fadeOut(that.fadeNumber, function () {
        $(this).remove()
      })
      blocco.remove()
      $(".logic_operator").last().fadeOut(that.fadeNumber)
    })
    div.find(".fieldSelect").append(fieldSelect)
    div
      .find(".textInput")
      .append(textInput)
      .append('<div class="help-block">' + gettext("Alias field name for client search input") + "</div>")
    div.find(".descriptionInput").append(descriptionInput)
    div.find(".cmpNumDigAutocomplete").append(cmpNumDigAutocomplete)
    div.find(".cmpOperatorSelect").append(cmpOperatorSelect)
    div.find(".cmpDependanceSelect").append(cmpDependanceSelect)
    div.find(".widgetType").append(widgetSelect)

    $(".rightCol").append(div)
    div.fadeIn(this.fadeNumber)

    widgetSelect.on("change", function () {
      var $select = div.find(".cmpDependanceSelect")
      var $numdigaut = div.find(".cmpNumDigAutocomplete")
      var $advise = div.find(".advise")
      if ($(this).val() == "selectbox" || $(this).val() == "autocompletebox") {
        div.find(".cmpDependanceSelectLabel").removeClass("invisible")
        $select.removeClass("invisible")

        $.each($(".rightCol").find(".blocco"), function (i, v) {
          var f = $(v).find(".fieldSelect").find("select").val()
          $select.find("select").append('<option value="' + f + '">' + f + "</option>")
        })

        if ($(this).val() == "selectbox") {
          // show advise msg
          $numdigaut.hide()
          $advise.show()
          $advise.find("div").html("<strong>" + gettext("Attention") + "!</strong><br>" + gettext("Fields with many unique values can create slow map loading behavior"))
        } else {
          $numdigaut.show()
          $advise.hide()
        }
      } else {
        div.find(".cmpDependanceSelectLabel").addClass("invisible")
        $select.addClass("invisible")
        $numdigaut.hide()
        $advise.hide()
      }
    })

    widgetSelect.trigger("change")
    if (that.isset(values) && that.isset(values.input.options["dependance"])) cmpDependanceSelect.val($("<div/>").html(values.input.options["dependance"]).text())

    if (that.isset(values) && that.isset(values.logicop)) var logicopselect = div.find("select.logic_operator")
    if (that.isset(logicopselect)) logicopselect.val(values.logicop)
  },

  generateTooltipRow: function (values) {
    var that = this

    var alInVa = that.isset(values) && that.isset(values.text) ? values.text : ""
    var textInput = $('<input class="form-control" type="text" name="field_text" value="' + alInVa + '">')

    var fieldSelect = $('<select class="form-control" name="field" ></select>')
    $.each(that.layerColumns, function (i, v) {
      var selected = that.isset(values) && values.field === v.name ? "selected" : ""
      var option = $('<option value="' + v.name + '" ' + selected + ">" + v.name + "</option>")
      fieldSelect.append(option)
    })

    var bImage = $('<button type="button" class="btn"><i class="glyphicon glyphicon-remove"></i></button>')

    var imWiVa = that.isset(values) && that.isset(values.img_width) ? values.img_width : ""
    var imHeVa = that.isset(values) && that.isset(values.img_height) ? values.img_height : ""

    var div = $(
      '<div class="blocco" style="margin-top: 30px; display: none">\
						<div class="box box-success" >\
							<div class="box-header with-border">\
								<div class="box-tools pull-right">\
									<button class="btn btn-box-tool" data-widget="remove"><i class="fa fa-times"></i></button>\
								</div>\
								<h3 class="box-title">Campo da mostrare per tooltip</h3>\
							</div>\
							<div class="box-body">\
								<div class="row">\
									<div class="col-md-4"><span class="label label-success">Testo</span></div>\
									<div class="col-md-4"><span class="label label-success">Campo</span></div>\
									<div class="col-md-1"><span class="label label-success">Immagine</span></div>\
									<div class="col-md-3 imgSizeLabel" style="display:none"><span class="label label-success">Dimensioni</span></div>\
								</div>\
								<div class="row">\
									<div class="col-md-4 textInput"></div>\
									<div class="col-md-4 fieldSelect"></div>\
									<div class="col-md-1 bImage"></div>\
									<div class="col-md-3 imgSize" style="display: none">\
										<input class="form-control col-md-1"  type="text" class="img_width" placeholder="width" value="' +
        imWiVa +
        '">\
										<input class="form-control col-md-1" type="text" class="img_height" placeholder="height" value="' +
        imHeVa +
        '">\
									</div>\
								</div>\
							</div>\
						</div>\
					</div>'
    )

    div.find(".close").click(function () {
      $(this)
        .parents(".alert")
        .first()
        .fadeOut(that.fadeNumber, function () {
          $(this).alert("close")
          $(this).remove()
        })
    })
    bImage.click(function () {
      // va in esecuzione prima del cambiamento della classe active
      if (!$(this).hasClass("active")) {
        $(this).addClass("btn-success").addClass("active")
        $(this).html('<i class="glyphicon glyphicon-ok"></i>')
        $(this).parents(".row").first().find(".imgSize").fadeIn(that.fadeNumber)
        $(this).parents(".blocco").first().find(".imgSizeLabel").fadeIn(that.fadeNumber)
      } else {
        $(this).removeClass("btn-success").removeClass("active")
        $(this).html('<i class="glyphicon glyphicon-remove"></i>')
        $(this).parents(".row").first().find(".imgSize").fadeOut(that.fadeNumber)
        $(this).parents(".blocco").first().find(".imgSizeLabel").fadeOut(that.fadeNumber)
      }
    })

    div.find(".fieldSelect").append(fieldSelect)
    div.find(".textInput").append(textInput)
    div.find(".bImage").append(bImage)

    $(".rightCol").append(div)

    if (that.isset(values) && that.isset(values.image) && values.image) bImage.click()

    div.fadeIn(that.fadeNumber)
  },

  generateLawRow: function (values) {
    var that = this

    var fieldSelect = $('<select class="form-control" name="field" ></select>')
    $.each(that.layerColumns, function (i, v) {
      var selected = that.isset(values) && values.field === v.name ? "selected" : ""
      var option = $('<option value="' + v.name + '" ' + selected + ">" + v.name + "</option>")
      fieldSelect.append(option)
    })

    var delimiterSelect = $('<select class="form-control" name="delimiter" ></select>')
    $.each(that.delimiterItems, function (i, v) {
      var selected = that.isset(values) && values.delimiter === v ? "selected" : ""
      var option = $('<option value="' + v + '" ' + selected + ">" + v + "</option>")
      delimiterSelect.append(option)
    })

    var lawSelect = $('<select class="form-control" name="law_id" ></select>')
    $.each(that.lawslist, function (i, v) {
      var selected = that.isset(values) && values.law_id === v.id ? "selected" : ""
      var option = $('<option value="' + v.id + '" ' + selected + ">" + v.name + "(" + v.variation + ")" + "</option>")
      lawSelect.append(option)
    })

    var div = $(
      '<div class="blocco" style="margin-top: 30px; display: none">\
					<div class="box box-success" >\
						<div class="box-header with-border">\
							<h3 class="box-title">Selezione campo contenente riferimento normativa</h3>\
						</div>\
						<div class="box-body">\
							<div class="row">\
								<div class="col-md-5"><span class="label label-success">Campo</span></div>\
								<div class="col-md-2"><span class="label label-success">Delimiter</span></div>\
								<div class="col-md-5"><span class="label label-success">Law</span></div>\
							</div>\
							<div class="row">\
								<div class="col-md-5 fieldSelect"></div>\
								<div class="col-md-2 delimiterSelect"></div>\
								<div class="col-md-5 lawSelect"></div>\
							</div>\
						</div>\
					</div>\
					</div>'
    )

    div.find(".fieldSelect").append(fieldSelect)
    div.find(".delimiterSelect").append(delimiterSelect)
    div.find(".lawSelect").append(lawSelect)
    $(".rightCol").append(div)
    div.fadeIn(that.fadeNumber)
  },

  generateHyperlinkRow: function (values) {
    var that = this
    var fieldSelect = $('<select name="field"></select>')
    $.each(this.layerColumns, function (i, v) {
      var selected = that.isset(values) && values.field === v.name ? "selected" : ""
      var option = $('<option value="' + v.name + '" ' + selected + ">" + v.name + "</option>")
      fieldSelect.append(option)
    })

    var alInVa = that.isset(values) && that.isset(values.text) ? values.text : ""
    var textInput = $('<input type="text" name="field_text" value="' + alInVa + '">')
    var neFiVa = that.isset(values) && that.isset(values.nuovo_field) ? values.nuovo_field : ""
    var newFieldName = $('<input type="text" name="new_field_name" value="' + neFiVa + '">')

    var div = $(
      '<div class="well blocco alert alert-success row" style="margin-top: 20px; display: none">\
						<div class="row">\
							<button type="button" class="close">&times;</button>\
						</div>\
						<div class="row">\
							<div class="col-md-4"><span class="label label-success">Campo</span></div>\
							<div class="col-md-4"><span class="label label-success">Alias</span></div>\
							<div class="col-md-4"><span class="label label-success">Nome nuovo field</span></div>\
						</div>\
						<div class="row">\
							<div class="col-md-4 fieldSelect"></div>\
							<div class="col-md-4 textInput"></div>\
							<div class="col-md-4 newFieldName"></div>\
						</div>\
					</div>'
    )

    div.find(".close").click(function () {
      $(this)
        .parents(".alert")
        .first()
        .fadeOut(that.fadeNumber, function () {
          $(this).alert("close")
          $(this).remove()
        })
    })
    div.find(".fieldSelect").append(fieldSelect)
    div.find(".textInput").append(textInput)
    div.find(".newFieldName").append(newFieldName)

    $(".rightCol").append(div)
    div.fadeIn(this.fadeNumber)
  },

  onWidgetTypeChange: function (el) {
    var that = this
    $("#id_body").val("")
    $(".rightCol").empty()
    switch (el.val()) {
      case "hyperlink":
        this.generateHyperlinkRow()
        this.onAddCallback = this.generateHyperlinkRow
        break
      case "search":
        this.generateGeneralParams()
        this.generateSearchRow()
        this.onAddCallback = function () {
          $(".rightCol").find(".logic_operator").last().fadeIn(that.fadeNumber)
          that.generateSearchRow()
        }
        break
      case "tooltip":
        this.generateTooltipRow()
        this.onAddCallback = this.generateTooltipRow
        break
      case "law":
        this.generateLawRow()
        break
      default:
        return
    }
    if (el.val() != "law") {
      var addDiv = $(
        '<div class="row text-center">\
							<button type="button" class="btn btn-success addRow"><i class="glyphicon glyphicon-plus"></i> ' + gettext("Add") + "</button>\
						</div>"
      )
      addDiv.find(".addRow").click(function () {
        var div = $(this).parents("div").first()
        that.onAddCallback()
        div.appendTo($(".rightCol"))
      })
      $(".rightCol").append(addDiv)
    }
  },

  showStoredValues: function () {
    var that = this
    $(".rightCol").empty()

    switch (this.widget.widget_type) {
      case "hyperlink":
        $.each(this.widget.body, function () {
          that.generateHyperlinkRow(this)
        })
        this.onAddCallback = this.generateHyperlinkRow
        break
      case "search":
        this.generateGeneralParams(this.widget.body)
        $.each(this.widget.body.fields, function (i) {
          that.generateSearchRow(this)
          if (i < that.widget.body.fields.length - 1) $(".rightCol").find(".logic_operator").last().fadeIn(that.fadeNumber)
        })
        this.onAddCallback = function () {
          $(".rightCol").find(".logic_operator").last().fadeIn(that.fadeNumber)
          that.generateSearchRow()
        }
        break
      case "tooltip":
        $.each(this.widget.body, function () {
          that.generateTooltipRow(this)
        })
        this.onAddCallback = this.generateTooltipRow
        break
      case "law":
        this.generateLawRow(this.widget.body)
        this.onAddCallback = this.generateLawRow
        break
      default:
        return
    }
    if (this.widget.widget_type != "law") {
      var addDiv = $('<div class="row text-center">\
							<button type="button" class="btn btn-success addRow"><i class="glyphicon glyphicon-plus"></i> Aggiungi</button>\
						</div>')

      addDiv.find(".addRow").click(function () {
        var div = $(this).parents("div").first()
        that.onAddCallback()
        div.appendTo($(".rightCol"))
      })
      $(".rightCol").append(addDiv)
    }
  },

  setLayerData: function (data, layer, layer_type) {
    this.layerColumns = data
    this.layer = layer
    this.layer_type = layer_type
  },

  init: function () {
    var that = this
    this.setLayerData(ga.Qdjango.localVars["layer_columns"], ga.Qdjango.localVars["layer_name"], ga.Qdjango.localVars["layer_type"])
    this.lawslist = ga.Qdjango.localVars["laws_list"]
    if (ga.Qdjango.localVars["update"]) {
      if (!$.isEmptyObject(ga.Qdjango.localVars["widget"])) {
        this.widget = ga.Qdjango.localVars["widget"]
        this.showStoredValues()
      }
    }
    this.form = $("#widget_form")
    ga.currentForm.on("preSendForm", function () {
      $.proxy(that.onFormSubmit, that)()
    })
    ga.currentForm.setOnSuccesAction(function () {
      ga.currentModal.hide()

      // get datatable row
      var $item = ga.currentModal.data.$evoker.parents("tr").prev().find('[data-widget-type="detailItemDataTable"]')
      var $dataTable = $item.parents('[data-widget-type="dataTable"]').DataTable()
      ga.widget.showDetailItemDataTable($dataTable, $item, true)

      // get row and update widject counter
      $item
        .parent()
        .next()
        .html($item.parents("tr").next().find("tr").length - 1)
    })
    /*
		var button = this.form.find("button.confirm");
		this.form.find("button.confirm").click(function(){
			that.onFormSubmit();
		});
		*/
    $("#id_widget_type").change(function () {
      that.onWidgetTypeChange($(this))
    })
  },
}

// Add SingleLayer Constraint widget
// --------------------------------
_.extend(g3wadmin.widget, {
  _singlelayerConstraintsListParams: ["singlelayerconstraints-list-url", "singlelayerconstraints-layer-pk"],

  _singlelayerConstraintsUrls: {},

  _buildSinglelayerContraintRuleForm: function (constraint_pk, rules_list, res, type = "subset", new_rule) {
    var actions = {
      post: ga.Qdjango.urls.rule[type].list + constraint_pk + "/",
      put: _.isNull(res) ? "" : ga.Qdjango.urls.rule[type].detail + res["pk"] + "/",
    }

    // instance ne form rule
    var form_options = {
      rulePk: _.isNull(res) ? "new" : res["pk"],
      constraintPk: constraint_pk,
      action: _.isNull(res) ? actions.post : actions.put,
      rule_form_label: type == "subset" ? "SQL" : gettext("QGIS Expression"),
    }
    var form_rule = $(ga.tpl.singlelayerConstraintRule(form_options))
    var ga_form = new ga.forms.form(form_rule.find("form"))

    // populate selects user and group
    var sl_user = form_rule.find('[name="user"]')
    var sl_group = form_rule.find('[name="group"]')
    var ta_rule = form_rule.find('[name="rule"]')
    var in_pk = form_rule.find('[name="pk"]')

    // ser on success action
    ga_form.setOnSuccesAction(function (fres) {
      var $ediv = form_rule.find(".form-errors")
      $ediv.html("")
      var $saved_msg = $('<h4 class="badge bg-green">' + gettext("Saved") + "</h4>")
      $ediv.append($saved_msg)
      $saved_msg.fadeOut(1200)

      // transform in a update mode, update pk put value and action
      if (_.isNull(res)) {
        ga_form.setAction(ga.Qdjango.urls.rule[type].detail + fres["pk"] + "/")
        in_pk.val(fres["pk"])
      }
    })

    // set error form action
    ga_form.setOnErrorAction(function (xhr, msg) {
      var err_data = xhr.responseJSON["error"]
      var $ediv = form_rule.find(".form-errors")
      $ediv.html("")
      $ediv.append('<h4 class="badge bg-red">' + err_data["message"] + "</h4>")

      // add field errors message:
      if (!_.isUndefined(err_data["data"]["non_field_errors"])) {
        for (n in err_data["data"]["non_field_errors"]) {
          $ediv.append("<br /><span>" + err_data["data"]["non_field_errors"][n] + "</span>")
        }
      }
    })

    // populate rule
    if (!_.isNull(res)) {
      ta_rule.val(res["rule"])
    }

    $.each(ga.Qdjango.data.viewers, function (k, v) {
      v["selected"] = !_.isNull(res) && res["user"] == v["pk"] ? 'selected="selected"' : ""
      sl_user.append(_.template('<option value="<%= pk %>" <%= selected %>><%= first_name %> <%= last_name %>(<%= username %>)</option>')(v))
    })

    $.each(ga.Qdjango.data.group_viewers, function (k, v) {
      v["selected"] = !_.isNull(res) && res["group"] == v["pk"] ? 'selected="selected"' : ""
      sl_group.append(_.template('<option value="<%= pk %>" <%= selected %>><%= name %></option>')(v))
    })

    rules_list.append(form_rule)

    // action for delete btn
    var bt_rule_delete = form_rule.find(".bt-rule-delete")
    bt_rule_delete.on("click", function (e) {
      var $self = $(this).parents(".rule-form")
      if (_.isNull(res) && form_rule.find('[name="pk"]').val() == "new") {
        $self.remove()
      } else {
        $.ajax({
          method: "delete",
          url: ga.Qdjango.urls.rule[type].detail + form_rule.find('[name="pk"]').val() + "/",
          success: function (res) {
            $self.remove()
          },
          error: function (xhr, textStatus, errorMessage) {},
        })
      }
    })

    // action for save btn
    var bt_rule_save = form_rule.find(".bt-rule-save")
    bt_rule_save.on("click", function (e) {
      if (_.isNull(res) && form_rule.find('[name="pk"]').val() == "new") {
        ga_form.sendData()
      } else {
        ga_form.sendData(e, "put")
      }
    })
  },

  _singlelayerConstraintForm: function ($item, res, params) {
    // set urls

    form_action = params["new"] ? ga.Qdjango.urls.constraint.list : ga.Qdjango.urls.constraint.detail + res["pk"] + "/"

    // open modal to show list of add links
    modal_options = {
      layerId: params["layer_pk"],
      action: form_action,
    }
    var modal = (ga.currentModal = ga.ui.buildDefaultModal({
      modalTitle: _.isUndefined(params["modal-title"]) ? gettext("Form title") : params["modal-title"],
      modalBody: ga.tpl.singlelayerConstraintForm(modal_options),
      modalSize: _.isUndefined(params["modal-size"]) ? "" : params["modal-size"],
    }))

    modal.data.$evoker = $item

    // parent_click based on new or update
    if (params["new"]) {
      var $item = params["parent_click"].parents("tr").prev().find('[data-widget-type="singlelayerConstraintsList"]')
    } else {
      var $item = $(params["parent_click"].parents("table")[0]).parents("tr").prev().find('[data-widget-type="singlelayerConstraintsList"]')
    }

    modal.$modal.find("#id_for_view").on("ifChanged", function (e) {
      if (e.target.checked) {
        modal.$modal.find("[name='for_view']").val("true")
      } else {
        modal.$modal.find("[name='for_view']").val("false")
      }
    })

    modal.$modal.find("#id_for_editing").on("ifChanged", function (e) {
      if (e.target.checked) {
        modal.$modal.find("[name='for_editing']").val("true")
      } else {
        modal.$modal.find("[name='for_editing']").val("false")
      }
    })
    var form = new ga.forms.form(modal.$modal.find("form"))

    var that = this
    form.setOnSuccesAction(function (e) {
      that._refreshSinglelayerConstraintList($item)()
      modal.hide()
    })
    modal.setConfirmButtonAction(function (e) {
      form.sendData(e, params["new"] ? "post" : "put")
    })

    ga.ui.initRadioCheckbox(modal.$modal.find("form"))

    modal.show()

    // populate form in update
    if (!params["new"]) {
      $.each(res, function (key, val) {
        modal.$modal.find("[name=" + key + "]").val(val)
        // init icheck
        if (key == "for_view" || key == "for_editing") {
          if (val) {
            modal.$modal.find("#id_" + key).iCheck("check")
          } else {
            modal.$modal.find("#id_" + key).iCheck("uncheck")
          }
        }
      })
    }
  },

  _singlelayerConstraintRulesForm: function ($item, res, params) {
    /**
     * Build form for constraint subset rules CRUD
     */

    var that = this

    // switch intro by type
    switch (params["type"]) {
      case "expression":
        var intro = gettext("Define, for each user and/or group of users, viewing/editing rules based on the QGIS expressions.")
        break

      case "subset":
        var intro = gettext("Define, for each user and/or group of users, viewing/editing rules based on the language or SQL dialect of the associated provider.")
        break
    }

    // build moodal
    var modal_options = {
      intro: intro,
    }
    var modal = ga.ui.buildDefaultModal({
      modalTitle: params["modal-title"],
      modalBody: ga.tpl.singlelayerConstraintRules(modal_options),
      modalSize: "modal-lg",
      confirmButton: false,
    })

    // set action con close modal refresh constraints list
    var $item = $(params["parent_click"].parents("table")[0]).parents("tr").prev().find('[data-widget-type="singlelayerConstraintsList"]')
    modal.$modal.on("hidden.bs.modal", this._refreshSinglelayerConstraintList($item))

    // get viewers and users groups viewers for layer
    ga.Qdjango.data.viewers = []
    ga.Qdjango.data.group_viewers = []

    $.ajaxSetup({ async: false })
    $.getJSON(ga.Qdjango.urls.layer.user + params["layer_pk"] + "/?context=" + params["constraint_context"], function (data) {
      ga.Qdjango.data.viewers = data["results"]
    })

    $.getJSON(ga.Qdjango.urls.layer.authgroup + params["layer_pk"] + "/?context=" + params["constraint_context"], function (data) {
      ga.Qdjango.data.group_viewers = data["results"]
    })
    $.ajaxSetup({ async: true })

    // get current rules
    var current_rules = []
    var jqxhr = $.getJSON(ga.Qdjango.urls.rule[params["type"]].list + params["constraint_pk"] + "/", function (data) {
      ga.Qdjango.data.current_rules = data["results"]
    }).done(function () {
      $.each(ga.Qdjango.data.current_rules, function (k, v) {
        that._buildSinglelayerContraintRuleForm(params["constraint_pk"], rules_list, v, params["type"], false)
      })
    })

    // rule list section
    var rules_list = modal.$modal.find(".rules-list")

    // rule actions for new rule
    var $bt_add_rule = modal.$modal.find(".add-rule")
    $bt_add_rule.on("click", function (e) {
      that._buildSinglelayerContraintRuleForm(params["constraint_pk"], rules_list, null, params["type"], true)
    })

    modal.show()
  },

  _refreshSinglelayerConstraintList: function ($item) {
    /**
     * Refresh tr main table layer contraints list
     */
    return function () {
      var $datatable = $item.parents("table").DataTable()
      ga.widget.singlelayerConstraintsList($datatable, $item, true)
    }
  },

  /*
    Build singlelayer constraints table
     */
  _singlelayerConstraintsTable: function (layer_pk, res) {
    var $div = $('<div style="margin-left:40px;">')

    // add new constraint btn
    $newConstraint = $('<a href="#" class="btn btn-sm btn-default"><i class="ion ion-plus-circled"></i> ' + gettext("New alphanumeric constraints") + "</a>")
    $newConstraint.on("click", function () {
      ga.widget._singlelayerConstraintForm($newConstraint, null, {
        "modal-title": gettext("New alphanumeric constraints"),
        layer_pk: layer_pk,
        new: true,
        parent_click: $(this),
      })
    })
    $div.append($newConstraint)

    // add table contraints saved
    var $table = $('<table class="table">')
    var $tbody = $table.append($("<tbody>"))
    $table.append(
      "<thead>\n" +
        "            <tr>\n" +
        '                <th style="width:180px;">' +
        gettext("Actions") +
        "</th>\n" +
        "                <th>" +
        gettext("Name") +
        "</th>\n" +
        "                <th>" +
        gettext("Description") +
        "</th>\n" +
        "                <th>" +
        gettext("For visualization") +
        "</th>\n" +
        "                <th>" +
        gettext("For editing") +
        "</th>\n" +
        "                <th>" +
        gettext("Subset rules count") +
        "</th>\n" +
        "                <th>" +
        gettext("Expression rules count") +
        "</th>\n" +
        "            </tr>\n" +
        "        </thead>"
    )

    // add constraints
    var constraint_res = {}
    $.each(res["results"], function (k, v) {
      constraint_res[v["pk"]] = v
      var editDisplay = v["rule_count"] > 0 ? "none" : "display"
      var for_view = v["for_view"] ? '<span class="fa fa-check-circle" style="color: orange"></span>' : ""
      var for_editing = v["for_editing"] ? '<span class="fa fa-check-circle" style="color: orange"></span>' : ""
      var constraintContext = ""
      if (for_view != "") constraintContext += "v"
      if (for_editing != "") constraintContext += "e"
      $tbody.append(
        '<tr id="singlelayerconstraint-item-' +
          v["pk"] +
          '">\n' +
          "                <td>" +
          ga.tpl.singlelayerConstraintActions({
            layerId: layer_pk,
            constraintPk: v["pk"],
            constraintContext: constraintContext,
            editDisplay: editDisplay,
            expressionIcon: ga.ui.expression_svg,
          }) +
          "</td>\n" +
          "                <td>" +
          v["name"] +
          "</td>\n" +
          "                <td>" +
          v["description"] +
          "</td>\n" +
          "                <td>" +
          for_view +
          "</td>\n" +
          "                <td>" +
          for_editing +
          "</td>\n" +
          "                <td>" +
          v["subset_rule_count"] +
          "</td>\n" +
          "                <td>" +
          v["expression_rule_count"] +
          "</td>\n" +
          "            </tr>\n"
      )
    })

    // add actions to elements action
    $tbody.find('[data-singlelayerconstraint-action-mode="update"]').on("click", function (e) {
      ga.widget._singlelayerConstraintForm($newConstraint, constraint_res[$(this).attr("data-singlelayerconstraint-pk")], {
        "modal-title": gettext("Update alphanumeric constraint"),
        layer_pk: layer_pk,
        //'constraint_pk': $(this).attr('data-contraint-pk'),
        new: false,
        parent_click: $(this),
      })
    })

    $tbody.find('[data-singlelayerconstraint-action-mode="subset_rules"]').on("click", function (e) {
      ga.widget._singlelayerConstraintRulesForm($newConstraint, null, {
        "modal-title": gettext("Constraint Rules based on provider's language / SQL dialect"),
        type: "subset",
        constraint_pk: $(this).attr("data-singlelayerconstraint-pk"),
        constraint_context: $(this).attr("data-singlelayerconstraint-context"),
        layer_pk: layer_pk,
        parent_click: $(this),
      })
    })

    $tbody.find('[data-singlelayerconstraint-action-mode="expression_rules"]').on("click", function (e) {
      ga.widget._singlelayerConstraintRulesForm($newConstraint, null, {
        "modal-title": gettext("Constraint Rules based on QGIS Expression"),
        type: "expression",
        constraint_pk: $(this).attr("data-singlelayerconstraint-pk"),
        constraint_context: $(this).attr("data-singlelayerconstraint-context"),
        layer_pk: layer_pk,
        parent_click: $(this),
      })
    })

    $div.append($table)

    return $div
  },

  singlelayerConstraintsList: function ($datatable, $item, refresh) {
    try {
      var params = ga.utils.getDataAttrs($item, this._singlelayerConstraintsListParams)
      if (_.isUndefined(params["singlelayerconstraints-list-url"])) {
        throw new Error("Attribute data-singlelayerconstraints-list-url not defined")
      }

      // get tr row parent
      refresh = _.isUndefined(refresh) ? false : true

      var tr = $item.closest("tr")
      var row = $datatable.row(tr)
      var idx = $.inArray(tr.attr("id"), [])

      var getDetail = function () {
        $.ajax({
          method: "get",
          url: params["singlelayerconstraints-list-url"],
          success: function (res) {
            row.child(g3wadmin.widget._singlelayerConstraintsTable(params["singlelayerconstraints-layer-pk"], res)).show()
          },
          complete: function () {
            var status = arguments[1]
            if (status == "success") {
              ga.ui.initRadioCheckbox(row.child())
            }
          },
          error: function (xhr, textStatus, errorMessage) {
            ga.widget.showError(ga.utils.buildAjaxErrorMessage(xhr.status, errorMessage))
          },
        })
      }

      if (refresh) {
        getDetail()
      } else {
        if (row.child.isShown()) {
          tr.removeClass("details")
          row.child.hide()
        } else {
          tr.addClass("details")

          // ajax call to get detail data
          getDetail()
        }
      }
    } catch (e) {
      this.showError(e.message)
    }
  },
})

_.extend(g3wadmin.tpl, {
  singlelayerConstraintRules: _.template(
    '\
		<div class="intro" style="margin-bottom: 20px;"><%= intro %></div>\
        <div class="row">\
            <div class="col-md-12 rules-list">\
            </div>\
        </div>\
        <div class="row">\
            <div class="col-md-12">\
                <div class="row text-center">\
                    <div class="col-md-12">\
                        <button type="button" class="btn btn-success add-rule"><i class="glyphicon glyphicon-plus"></i> ' +
      gettext("Add") +
      "</button>\
                    </div>\
                </div>\
            </div>\
        </div>\
    "
  ),

  singlelayerConstraintRule: _.template(
    '\
    <div class="row rule-form" style="border-top: 1px solid gray;">\
        <div class="col-md-12 form-errors" style="color: #ff0000;"></div>\
        <div class="col-md-10 rule-fields">\
            <form action="<%= action %>" id="#constraint-rule-<%= rulePk %>">\
                <input type="hidden" name="pk" value="<%= rulePk %>" />\
                <input type="hidden" name="constraint" value="<%= constraintPk %>" />\
                <div class="row">\
                    <div class="col-md-4">\
                        <div class="row">\
                            <div class="col-md-12">\
                            <div class="form-group">\
                                <label class="control-label ">Viewer</label>\
                                <div class="controls ">\
                                    <select name="user" class="select form-control">\
                                        <option value="">---------</option>\
                                    </select>\
                                </div>\
                            </div>\
                            </div>\
                        </div>\
                        <div class="row">\
                            <div class="col-md-12">\
                            <div class="form-group">\
                                <label class="control-label ">User viewer group</label>\
                                <div class="controls ">\
                                    <select name="group" class="select form-control">\
                                        <option value="">---------</option>\
                                    </select>\
                                </div>\
                            </div>\
                            </div>\
                        </div>\
                    </div>\
                    <div class="col-md-8">\
                        <div class="row">\
                            <div class="col-md-12">\
                            <div class="form-group">\
                                <label class="control-label "><%= rule_form_label %></label>\
                                <div class="controls ">\
                                    <textarea name="rule" style="width:100%;"></textarea>\
                                </div>\
                            </div>\
                            </div>\
                        </div>\
                    </div>\
                </div>\
            </form>\
        </div>\
        <div class="col-md-2 rule-actions">\
            <div class="row" style="font-size: 24px;">\
                <span class="col-xs-2 icon">\
                    <a href="#" class="bt-rule-save" data-toggle="tooltip" data-placement="top" title="' +
      gettext("Save") +
      '"><i class="fa fa-save"></i></a>\
                </span>\
                <span class="col-xs-2 icon">\
                    <a href="#" class="bt-rule-delete" data-toggle="tooltip" data-placement="top" title="' +
      gettext("Delete") +
      '"><i class="ion ion-trash-b"></i></a>\
                </span>\
            </div>\
        </div>\
    </div>\
    '
  ),

  singlelayerConstraintForm: _.template(
    '\
        <form action="<%= action %>" id="form-singlelayerconstraint-<%= layerId %>">\
            <input type="hidden" name="layer" value="<%= layerId %>" />\
            <input type="hidden" name="active" value="1" />\
            <div class="row">\
				<div class="col-md-12">\
					<div class="info"><h4>' +
      gettext("Set a name and a possible description for the alphanumeric constraint") +
      ':</h4></div>\
					<div class="form-group">\
						<label class="control-label ">' +
      gettext("Name") +
      '</label>\
						<div class="controls ">\
							<input class="form-control" name="name" style="width:100%;"></input>\
						</div>\
					</div>\
					<div class="form-group">\
						<label class="control-label ">' +
      gettext("Description") +
      '</label>\
						<div class="controls ">\
							<textarea class="form-control" name="description" style="width:100%;"></textarea>\
						</div>\
					</div>\
					<div class="form-group">\
						<div id="div_id_for_view" class="checkbox">\
							<label for="id_for_view" class="">\
								<input type="checkbox" name="icheck_for_view" id="id_for_view" checked="checked" class="checkboxinput">\
								' +
      gettext("Active for visualization") +
      '\
							</label>\
						</div>\
						<input type="hidden" name="for_view" value="true">\
					</div>\
					<div class="form-group">\
						<div id="div_id_for_editing" class="checkbox">\
							<label for="id_for_editing" class="">\
								<input type="checkbox" name="icheck_for_editing" id="id_for_editing" class="checkboxinput">\
								' +
      gettext("Active for editing") +
      '\
							</label>\
						</div>\
						<input type="hidden" name="for_editing">\
					</div>\
				</div>\
			</div>\
        </form>'
  ),

  singlelayerConstraintActions: _.template(
    '\
		<span class="col-xs-2 icon">\
			<a href="#" data-toggle="tooltip" data-placement="top" title="' +
      gettext("Provider's language / SQL dialect Rules") +
      '" data-singlelayerconstraint-context="<%= constraintContext %>" data-singlelayerconstraint-action-mode="subset_rules" data-singlelayerconstraint-pk="<%= constraintPk %>"><i style="color: purple;" class="fa fa-cubes"></i></a>\
		</span>\
		<span class="col-xs-2 icon">\
			<a href="#" data-toggle="tooltip" data-placement="top" title="' +
      gettext("QGIS Expression Rules") +
      '" data-singlelayerconstraint-context="<%= constraintContext %>" data-singlelayerconstraint-action-mode="expression_rules" data-singlelayerconstraint-pk="<%= constraintPk %>"><%= expressionIcon %></a>\
		</span>\
		<span class="col-xs-2 icon" style="display:<%= editDisplay %>">\
			<a href="#" data-singlelayerconstraint-action-mode="update" data-singlelayerconstraint-pk="<%= constraintPk %>" data-singlelayerconstraint-context="<%= constraintContext %>" data-singlelayerconstraint-layer-id="<%= layerId %>"><i class="ion ion-edit"></i></a>\
		</span>\
		<span class="col-xs-2 icon">\
			<a href="#" \
			data-widget-type="deleteItem" \
			data-delete-url="/' +
      SITE_PREFIX_URL +
      'qdjango/api/constraint/detail/<%= constraintPk %>/"\
			data-item-selector="#singlelayerconstraint-item-<%= constraintPk %>"\
			data-delete-method="delete"\
			><i class="ion ion-trash-b"></i></a>\
		</span>\
    '
  ),
})

// activate widget
$(document).ready(function () {
  $('[data-widget-type="singlelayerConstraintsList"]').on("click", function (e) {
    var $datatable = $(this).parents("table").DataTable()
    ga.widget.singlelayerConstraintsList($datatable, $(this))
  })
})

// Add Style manager widget
// --------------------------------
_.extend(g3wadmin.widget, {
  _styleManagerParams: ["stylemanager-list-url", "stylemanager-layer-pk"],

  /**
   * Creates the styles table
   */
  _stylesTable: function (layer_list_url, res, $datatable, $item) {
    var params = ga.utils.getDataAttrs($item, this._styleManagerParams)
    if (_.isUndefined(params["stylemanager-layer-pk"])) {
      throw new Error("Attribute stylemanager-layer-pk not defined")
    }

    let $div = $('<div style="margin-left:40px;">')

    // add new style btn
    $newStyle = $('<a href="#" class="btn btn-sm btn-default"><i class="ion ion-plus-circled"></i> ' + gettext("Create New Style From QML") + "</a>")
    $newStyle.on("click", function () {
      ga.widget._newStyleForm($datatable, $newStyle, {
        "modal-title": gettext("New Style From QML"),
        layer_list_url: layer_list_url,
        layer_pk: params["stylemanager-layer-pk"],
        styles: res["styles"],
        style: "",
        new: true,
        parent_click: $(this),
      })
    })
    $div.append($newStyle)

    let $table = $('<table class="table">')
    $table.append(
      `<thead>
        <tr>
            <th style="width:180px;">${gettext("Actions")}</th>
            <th>${gettext("Name")}</th>
            <th>${gettext("Current")}</th>
        </tr>
      </thead>`
    )
    let $tbody = $table.append($("<tbody>"))
    let styleCount = res["styles"].length

    $.each(res["styles"], function (k, v) {
      let actions = ""
      if (styleCount > 1) {
        actions = `<span class="col-xs-2 icon">
                <a href="#"
                    data-toggle="tooltip" data-placement="top"
                    title="${gettext("Delete style from the layer.")}"
                    data-style-name="${v["name"]}"
                    data-style-action-mode="delete"
                >
                    <i class="ion ion-fa ion-trash-b"></i>
                </a>
            </span>`
      }
      actions += `
            <span class="col-xs-2 icon">
                <a href="#" data-style-name="${v["name"]}"
                    data-toggle="tooltip" data-placement="top"
                    title="${gettext("Edit style name or replace the style QML.")}"
                    data-style-action-mode="edit"
                >
                    <i class="ion ion-edit"></i>
                </a>
            </span>
             `

      $tbody.append(`
            <tr>
                <td>${actions}</td>
                <td>${v["name"]}</td>
                <td><input name="current" data-style-action-mode="make_current" value="${v["name"]}" type="radio" ${v["current"] ? 'checked="checked"' : ""}></td>
            </tr>`)
    })

    let that = this

    // Add events to actions
    $tbody.find('[data-style-action-mode="delete"]').on("click", function (e) {
      let style = $(e.currentTarget).attr("data-style-name")
      let actionDelete = function () {
        $.ajax({
          method: "delete",
          url: layer_list_url + style + "/",
          success: function (res) {
            ga.widget.showStyleManagerList($datatable, $item, true)
            modal.hide()
          },
          complete: function () {
            // Nothing to do
          },
          error: function (xhr, textStatus, errorMessage) {
            try {
              errorMessage = xhr.responseJSON["error"]["message"]
            } catch (error) {
              // Ignore
            }
            ga.widget.showError(ga.utils.buildAjaxErrorMessage(xhr.status, errorMessage))
          },
        })
      }
      // open modal to confirm delete
      var modal = ga.ui.buildDefaultModal({
        modalTitle: gettext("Delete Style"),
        modalBody: `${gettext("Are you sure to delete style")} <strong>${style}</strong>?`,
        closeButtonText: "No",
      })

      modal.setConfirmButtonAction(actionDelete)
      modal.show()
    })

    $tbody.find('[data-style-action-mode="edit"]').on("click", function (e) {
      let style = $(e.currentTarget).attr("data-style-name")
      ga.widget._newStyleForm($datatable, $newStyle, {
        "modal-title": gettext("Edit Style") + " " + style,
        layer_list_url: layer_list_url + style + "/",
        layer_pk: params["stylemanager-layer-pk"],
        styles: res["styles"],
        new: false,
        style: style,
        parent_click: $(this),
      })
    })

    $tbody.find('[data-style-action-mode="make_current"]').on("ifChecked", function (e) {
      $.ajax({
        method: "patch",
        url: layer_list_url + $(this).attr("value") + "/",
        contentType: "application/json",
        data: JSON.stringify({ current: true }),
        success: function (res) {
          ga.widget.showStyleManagerList($datatable, $item, true)
        },
        complete: function () {
          // Nothing to do
        },
        error: function (xhr, textStatus, errorMessage) {
          try {
            errorMessage = xhr.responseJSON["error"]["message"]
          } catch (error) {
            // Ignore
          }
          ga.widget.showError(ga.utils.buildAjaxErrorMessage(xhr.status, errorMessage))
        },
      })
    })

    $div.append($table)
    return $div
  },

  /**
   * Creates the add new/edit style form
   *
   */
  _newStyleForm: function ($datatable, $item, params) {
    let isNew = params["new"]
    params["form_action"] = params["layer_list_url"]
    params["layerId"] = params["layer_pk"]

    if (isNew) {
      params["title"] = gettext("Create a new style from an uploaded QML file.")
    } else {
      params["title"] = gettext("Edit style name or replace the style from an uploaded QML file.")
    }

    let modal = (ga.currentModal = ga.ui.buildDefaultModal({
      modalTitle: _.isUndefined(params["modal-title"]) ? gettext("Form title") : params["modal-title"],
      modalBody: ga.tpl._newStyleForm(params),
      modalSize: _.isUndefined(params["modal-size"]) ? "" : params["modal-size"],
    }))

    modal.data.$evoker = $item

    // parent_click based on new or update
    if (isNew) {
      var $item = params["parent_click"].parents("tr").prev().find('[data-widget-type="styleManagerList"]')
    } else {
      var $item = $(params["parent_click"].parents("table")[0]).parents("tr").prev().find('[data-widget-type="styleManagerList"]')
    }

    // set action for confirm btn
    var form = new ga.forms.form(modal.$modal.find("form"))
    var input_xml_plot = $(form.$form[0]).find("#load_qml_file")
    $(input_xml_plot).on("change", ga.widget._readStyleQmlFile)
    var that = this
    form.setOnSuccesAction(function (e) {
      ga.widget.showStyleManagerList($datatable, $item, true)
      modal.hide()
    })

    modal.setConfirmButtonAction(function (e) {
      let dt = form.getData("array")
      // Validate
      if (dt["name"] == "") {
        let $ediv = form.$form.find(".form-errors")
        $ediv.html("")
        $ediv.append(`<h4 class="badge bg-red">${gettext("Style name is required!")}</h4>`)
        return
      }
      if (dt["qml"] == "" && isNew) {
        let $ediv = form.$form.find(".form-errors")
        $ediv.html("")
        $ediv.append(`<h4 class="badge bg-red">${gettext("QML is required!")}</h4>`)
        return
      }

      for (let i = 0; i < params["styles"].length; ++i) {
        if (dt["name"] == params["styles"][i]["name"] && dt["name"] != params["style"]) {
          let $ediv = form.$form.find(".form-errors")
          $ediv.html("")
          $ediv.append(`<h4 class="badge bg-red">${gettext("A style with this name already exists!")}</h4>`)
          return
        }
      }
      form.sendData(e, params["new"] ? "post" : "patch", JSON.stringify(dt), "application/json; charset=UTF-8")
    })

    modal.show()

    // populate form in update
    if (!isNew) {
      modal.$modal.find("[name=name]").val(params["style"])
    }
  },

  //function to read and set input[name="qml"] value
  _readStyleQmlFile: function (evt) {
    const reader = new FileReader()
    const file = evt.target.files[0]
    const filename = file.name
    reader.onload = (evt) => {
      const data = evt.target.result
      $('input[name="qml"]').val(data)
      $("#qml_filename").text(filename).show()
    }
    reader.readAsText(file)
  },

  /**
   * Display the layer style list
   */
  showStyleManagerList: function ($datatable, $item, refresh) {
    try {
      var params = ga.utils.getDataAttrs($item, this._styleManagerParams)
      if (_.isUndefined(params["stylemanager-list-url"])) {
        throw new Error("Attribute data-stylemanager-list-url not defined")
      }

      // get tr row parent
      refresh = _.isUndefined(refresh) ? false : true

      var tr = $item.closest("tr")
      var row = $datatable.row(tr)
      var idx = $.inArray(tr.attr("id"), [])

      var getDetail = function () {
        $.ajax({
          method: "get",
          url: params["stylemanager-list-url"],
          success: function (res) {
            row.child(g3wadmin.widget._stylesTable(params["stylemanager-list-url"], res, $datatable, $item)).show()
          },
          complete: function () {
            var status = arguments[1]
            if (status == "success") {
              ga.ui.initRadioCheckbox(row.child())
            }
          },
          error: function (xhr, textStatus, errorMessage) {
            ga.widget.showError(ga.utils.buildAjaxErrorMessage(xhr.status, errorMessage))
          },
        })
      }

      if (refresh) {
        getDetail()
      } else {
        if (row.child.isShown()) {
          tr.removeClass("details")
          row.child.hide()
        } else {
          tr.addClass("details")

          // ajax call to get detail data
          getDetail()
        }
      }
    } catch (e) {
      this.showError(e.message)
    }
  },
})

// activate widget
$(document).ready(function () {
  $('[data-widget-type="styleManagerList"]').on("click", function (e) {
    var $datatable = $(this).parents("table").DataTable()
    ga.widget.showStyleManagerList($datatable, $(this))
  })
})

_.extend(g3wadmin.tpl, {
  _newStyleForm: _.template(`
        <form action="<%= form_action %>" id="form-newstyle-<%= layerId %>">
        <div class="form-errors"></div>
        <input type="hidden" name="qml" value="" />
            <div class="row">
				<div class="col-md-12">
					<div class="info"><%= title %></div>
					<div class="info">${gettext("The style defined in the uploaded QML must be compatible with the target layer.")}</div>
					<div class="form-group">
						<label class="control-label ">${gettext("Style name (required)")}</label>
						<div class="controls ">
							<input class="form-control" value="" placeholder="${gettext("Enter the unique name of the new style")}" required name="name" style="width:100%;">
						</div>
					</div>

                    <div class="form-group" style="border: 1px dot-dash grey;  text-align: center">
						<div class="controls qq-upload-button-selector" style="position: relative; padding: 10px;">
							<input class="form-control" id="load_qml_file" accept=".qml" title="" name="qml_file" type="file" style="top:0; left:0; cursor:pointer;opacity:0; width:100%; position:absolute; height: 100%;" />
							<h4>${gettext("Upload layer style QML file")}</h4>
							<div>
                                <i class="fa fa-upload fa-3x" aria-hidden="true"></i>
                            </div>
						</div>
						<span id="qml_filename" style="display:none;"></span>
					</div>
				</div>
			</div>
        </form>`),
})

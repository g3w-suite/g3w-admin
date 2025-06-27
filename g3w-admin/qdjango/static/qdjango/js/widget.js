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
    search: {
      alternativeuniqueselect: "/" + SITE_PREFIX_URL + "qdjango/api/alternativeuniquelayer/",
    }
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
  projectLayers: null,
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
  datetime_widgettype: {
    datetimebox: "DatetimeBox"
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
    if (str.indexOf("QSTRING") !== -1 || str.indexOf("STRING") !== -1 || str.indexOf("TEXT") !== -1) return "textfield"
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

    if (
        str.indexOf("QDATE") !== -1 ||
        str.indexOf("QDATETIME") !== -1 ||
        str.indexOf("QTIME") !== -1
    )
      return "datetimefield"
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

        paginate = $(".rightCol").find("#paginate").prop('checked');

        obj = {
          title: $(".rightCol").find("#title").val(), // Search title
          paginate: paginate,
          query: "simpleWmsSearch", // It can be removed?
          usewmsrequest: true, // Always set to true
          fields: [],
          otherlayers: [],
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
            options["dependance"] = dependance;
            // Add strict options
            options["dependance_strict"] = v.find(".cmpDependanceStrict").find("input").prop("checked");
          }
          options["numdigaut"] = v.find(".cmpNumDigAutocomplete").find("input").val()


          fieldname = v.find(".fieldSelect").find("select").val();
          fieldwidgettype = v.find(".widgetType").find("select").val();
          // Case QDATETIME and QDATE

          fieldtype = v.find(".fieldSelect").find("select").find("option:selected").data().type;
          inputtype = that.getType(fieldtype);
          if (fieldwidgettype == 'datetimebox'){

            // Switch to ISO Format for DATE TIME and DATETIME
            // WMS FILTER paramenter only works with ISO date/time formats.
            if (fieldtype == 'QDATE'){
              field_format = 'yyyy-MM-dd'
            } else if (fieldtype == 'QDATETIME') {
              field_format = 'yyyy-MM-dd HH:mm:ss+t'
            } else if (fieldtype == 'QTIME') {
              field_format = 'HH:mm:ss'
            } else {
              field_format = ga.Qdjango.localVars.layer_edittypes[fieldname].field_format
            }

            options['format'] = {
              "date": true ? _.indexOf(['QDATETIME', 'QDATE'], fieldtype) != -1 : false,
              "time": true ? _.indexOf(['QDATETIME', 'QTIME'], fieldtype) != -1 : false,
              "fieldformat": field_format,
              "displayformat": ga.Qdjango.localVars.layer_edittypes[fieldname].display_format,
              "default": null
            }

            // Force type do 'datetimefield'
            inputtype = 'datetimefield'
          }

          // Add relation_reference
          if (ga.Qdjango.localVars.layer_edittypes[fieldname]['widgetv2type'] == 'RelationReference' &&
              (fieldwidgettype == 'selectbox')) {
            options['relation_reference'] = true ? v.find(".cmpRelationReference").find("select").val() == '1': false
          }

          obj.fields.push({
            name: v.find(".fieldSelect").find("select").val(), // NOME DEL CAMPO DB
            label: v.find(".textInput").find("input").val(), // ETICHETTA DEL CAMPO DI RICERCA
            blanktext: v.find(".descriptionInput").find("input").val(), // TESTO INIZIALE NEL CAMPO
            filterop: v.find(".cmpOperatorSelect").find("select").val(), // OPERATORE DI CONFRONTO (=,&lt;,&gt;,=&lt;,&gt;=,&lt;&gt;)
            widgettype: fieldwidgettype, // widgettype
            input: {
              type: inputtype, // TIPO DI CAMPO //
              options: options,
            },
            alternativeuniquelayer: v.find(".cmpAlternativeUniqueLayerSelect").find("select").val(), // Alternative layer for unique values
            logicop: v.find("select.logic_operator").val(),
          })
        })

        // add otherlayers
        obj["otherlayers"] = $(".rightCol").find(".cmpPlusLayersSearch").find("select").val()

        // add relations
        obj["relations"] = $(".rightCol").find(".cmpRelations").find("select").val()

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
        $(this).trigger('onsubmitform:default')
        if (this.isset(this.onsubmitform_obj)) {
          obj = this.onsubmitform_obj
        } else {
          return
        }

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
    var paVa = that.isset(values) && that.isset(values.paginate) ? values.paginate : false
    var title = $('<input class="form-control" type="text" name="title" id="title" value="' + tiVa + '">')
    var paginate = $('<input type="checkbox" name="paginate" id="paginate" value="1">')
    if (paVa) {
      paginate.prop('checked', true);
    }

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
									<label class="control-label requiredField">\
									' + gettext("Search title") + '\
                                    </label>\
									</div>\
								</div>\
								<div class="form-group col-md-12">\
									<div class="controls paginate">\
									<label class="control-label requiredField">\
									' + gettext("Paginate resutls") + '\
                                    </label>\
									</div>\
								</div>\
							</div>\
						<div>\
					</div>'
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

    div
      .find(".paginate")
      .append(paginate)
      .append('<div class="help-block">' + gettext("Check it if you want paginate the search results") + "</div>")

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

    var selected_yes = ""
    var selected_no = "selected"
    if (that.isset(values) && that.isset(values.input) && that.isset(values.input.options.relation_reference) && values.input.options.relation_reference === true){
      var selected_yes = "selected"
      var selected_no = ""
    }
    var relationReferenceSelect = $('<select class="form-control" name="use_relationreferance">' +
        '<option value="0" ' + selected_no + '>'+ gettext("No") +'</option>' +
        '<option value="1" ' + selected_yes + '>'+ gettext("Yes") +'</option>' +
        '</select>')

    var cmpOperatorSelect = $(
      '<select class="form-control" name="comparison_operator">\
										<option value="eq">= (' + gettext("equal") + ')</option>\
										<option value="gt">&gt; (' + gettext("greater than") + ')</option>\
										<option value="lt">&lt; (' + gettext("lower than") + ')</option>\
										<option value="ltgt">&lt;&gt; (' + gettext("not equal") + ')</option>\
										<option value="gte">&gt;= (' + gettext("greater than equal") + ')</option>\
										<option value="lte">&lt;= (' + gettext("lower than equal") + ')</option>\
										<option value="in">IN (' + gettext("within") + ')</option>\
										<option value="LIKE">LIKE (' + gettext("like case sensitive") + ")</option>\
									</select>"
    )

    // Add and show the dependency if selected
    var cmpDependanceSelect = $('<select class="form-control" name="dependence_field">' + '<option value=""> ----- </option>' + "</select>")

    var options = that.widgettype

    var widgetSelect = $('<select class="form-control" name="widget_type"></select>')
    $.each(options, function (k, i) {
        widgetSelect.append('<option value="' + k + '">' + i + "</option>")
    })

    // Add widget types
    if (this.layer_type != "spatialite") {
      cmpOperatorSelect.append('<option value="ILIKE">ILIKE (' + gettext("like not case sensitive") + ")</option>")
    }

    if (that.isset(values) && that.isset(values.filterop)) cmpOperatorSelect.val($("<div/>").html(values.filterop).text())

    // Add select for alternative layer for unique values field:
    // add a select where you can choose a layer
    // from which to take the unique values for the field indicated in the widget
    // this is useful for very large layers, for example the cadastre,
    // where performing a unique value search would be very slow

    var alternativeUniqueLayerSelect = $('<select class="form-control" name="alt_unique_layer"></select>')


    // Add control on cmpOperatorSelect for field type:
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

      // Case QDATETIME
      //if (_.indexOf(['QDATETIME', 'QDATE'], $(this).find("option:selected").data().type) != -1 &&
      widgetSelect.find('[value="datetimebox"]').remove();
      if (_.indexOf(['DateTime'], ga.Qdjango.localVars.layer_edittypes[$(this).val()].widgetv2type) != -1) {
        // Append 'DatetimBox' to widget selectbox
        widgetSelect.append('<option value="datetimebox">' + that.datetime_widgettype.datetimebox + '</option>');
      }

      // Remove `AutoCompleteBox` from widget type list
      if (ga.Qdjango.localVars.layer_edittypes[$(this).val()].widgetv2type == 'ValueRelation') {
        widgetSelect.find("option[value=\"autocompletebox\"]").hide();
      } else {
        widgetSelect.find("option[value=\"autocompletebox\"]").show();
      }

      // Tringger widgetSelect change if widgetSelect 'selectbox' or 'autocompletebox' are setted
      if (widgetSelect.val() == "selectbox" || widgetSelect.val() == "autocompletebox") {
        widgetSelect.trigger("change")
      } 

    })

      // Trigger change for fieldselect
    fieldSelect.trigger('change');

    if (that.isset(values) && that.isset(values.widgettype)) widgetSelect.val($("<div/>").html(values.widgettype).text())

    var div = $(
      '<div class="blocco" style="display: none">\
					<div class="box box-success" >\
							<div class="box-header with-border">\
							<h3 class="box-title">' + gettext("Search field settings") + '</h3>\
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
											<label class="control-label">' + gettext("Field") + '</label>\
										</div>\
									</div>\
									<div class="col-md-2">\
										<div class="controls widgetType">\
											<label class="control-label">' + gettext("Widget") + '</label>\
										</div>\
									</div>\
									<div class="col-md-3">\
										<div class="controls textInput">\
											<label class="control-label">' + gettext("Alias") + '</label>\
										</div>\
									</div>\
									<div class="col-md-4">\
										<div class="controls descriptionInput">\
											<label class="control-label">' + gettext("Description") +'</label>\
										</div>\
									</div>\
								</div>\
								<div class="row">\
									<div class="col-md-3">\
										<div class="controls cmpNumDigAutocomplete" style="display: none;">\
											<label class="control-label">' + gettext("Number of digits") + '</label>\
										</div>\
									</div>\
								</div>\
								<div class="row">\
									<div class="col-md-3">\
										<div class="controls cmpOperatorSelect">\
											<label class="control-label">' + gettext("Comparison operator") + '</label>\
										</div>\
									</div>\
									<div class="col-md-3 cmpRelationReference invisible">\
										<div class="controls cmpRelationReferenceSelect ">\
											<label class="control-label">' + gettext("Use Relation Reference") + '</label>\
										</div>\
										<div class="help-block">\
										' + gettext("This field has a 'ReletaionReference' form widget active, do you want use if for searching?") + '\
										</div>\
									</div>\
                  <div class="col-md-6 cmpAlternativeUniqueLayer invisible">\
										<div class="controls cmpAlternativeUniqueLayerSelect ">\
											<label class="control-label">' + gettext("Use Alternative Unique Layer") + '</label>\
										</div>\
										<div class="help-block">\
										' + gettext("Is possibile to select an alternative layer to use for get unique values") + '\
										</div>\
									</div>\
								</div>\
								<div class="row">\
									<div class="col-md-3">\
										<div class="controls cmpDependanceSelectLabel invisible">\
											<label class="control-label">' + gettext("Dependency") + '</label>\
										</div>\
									</div>\
									<div class="col-md-3">\
										<div class="controls cmpDependanceStrictLabel invisible">\
											<label class="control-label">' + gettext("Strictly dependent") + '</label>\
										</div>\
									</div>\
								</div>\
								<div class="row">\
									<div class="col-md-3 invisible cmpDependanceSelect"></div>\
									<div class="col-md-3 invisible cmpDependanceStrict">\
									  <input type="checkbox" name="dependent_strict" value="1" />\
									</div>\
								</div>\
							</div>\
					</div>\
						<div class="row" style="margin-bottom:20px;">\
						<div class="col-md-offset-4 col-md-4">\
							<select class="form-control logic_operator" name="logic_operator" class="logic_operator" style="display: none">\
								<option value="and">AND</option>\
								<option value="or">OR</option>\
							</select>\
							<div class="help-block invisible">' + gettext("Logical join") + "</div>\
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
    div.find(".cmpRelationReferenceSelect").append(relationReferenceSelect)
    div.find(".cmpAlternativeUniqueLayerSelect").append(alternativeUniqueLayerSelect)

    $(".rightCol").append(div)

    div.fadeIn(this.fadeNumber)

    var $dependence_strict = div.find(".cmpDependanceStrict");

    widgetSelect.on("change", function () {
      var $select = div.find(".cmpDependanceSelect");
      var $numdigaut = div.find(".cmpNumDigAutocomplete")
      if ($(this).val() == "selectbox" || $(this).val() == "autocompletebox") {
        div.find(".cmpDependanceSelectLabel").removeClass("invisible")
        $select.removeClass("invisible");

        // Check if field has RelationReference widget
        fieldname = div.find(".fieldSelect").find("select").val();
        if (ga.Qdjango.localVars.layer_edittypes[fieldname]['widgetv2type'] == 'RelationReference' && $(this).val() == "selectbox") {
          div.find(".cmpRelationReference").removeClass("invisible")
        } else {
          div.find(".cmpRelationReference").addClass("invisible")
        }

        // Show alternative unique layer select
        div.find(".cmpAlternativeUniqueLayer").removeClass("invisible")

        // Get lust of alternative layers for unique values
        data = {
          'field': div.find('[name="searchfield"]').val(),
        }
        $.each(that.layerColumns, function (i, v) {
          if (v.name === data.field) {
            data['type'] = v.type;
          }
        });
        $.ajax({
          url: ga.Qdjango.urls.search.alternativeuniqueselect + ga.Qdjango.localVars['project_id'] + "/" + ga.Qdjango.localVars['layer_name'] + "/",
          type: "POST",
          dataType: "json",
          data: data,
          success: function (data) {
            var $select_alt = div.find('[name="alt_unique_layer"]');
            $select_alt.empty();
            $select_alt.append('<option value=""> ------ </option>');
            $.each(data.data, function (i, v) {
              
              //var selected = '';
              var selected = that.isset(values) && that.isset(values.alternativeuniquelayer) && values.alternativeuniquelayer === v.id ? "selected" : ""
              $select_alt.append('<option value="' + v.id + '" ' + selected + '>' + v.name + "</option>");
            });
          },
          error: function (xhr, status, error) {
            console.error("Error fetching alternative layers:", error);
          }
        });

        // On select dependance change
        $select.find("select").on("change", function(){
          if($(this).val() != ""){
            $dependence_strict.removeClass("invisible");
            div.find(".cmpDependanceStrictLabel").removeClass("invisible")
          } else {
            $dependence_strict.addClass("invisible");
            div.find(".cmpDependanceStrictLabel").addClass("invisible")
          }
        });

        // No current bloc fieldSelect value
        var current_f = $select.parents(".blocco").find(".fieldSelect").find("select").val();
        $.each($(".rightCol").find(".blocco"), function (i, v) {


          var f = $(v).find(".fieldSelect").find("select").val()
          if (f != current_f)
            $select.find("select").append('<option value="' + f + '">' + f + "</option>");
        })

        if ($(this).val() == "selectbox") {
          $numdigaut.hide()
        } else {
          $numdigaut.show()
        }
      } else {
        div.find(".cmpDependanceSelectLabel").addClass("invisible")
        div.find(".cmpRelationReference").addClass("invisible")
        div.find(".cmpAlternativeUniqueLayer").addClass("invisible")
        $select.addClass("invisible")
        $dependence_strict.addClass("invisible");
        $numdigaut.hide()
      }

      // Activate IN operator for selectbox and autocompletebox
        if ($(this).val() == "selectbox" || $(this).val() == "autocompletebox") {
            cmpOperatorSelect.find("option[value='in']").prop("disabled", false);
        } else {
            cmpOperatorSelect.find("option[value='in']").prop("disabled", true);
        }

    })

    widgetSelect.trigger("change")
    if (that.isset(values) && that.isset(values.input.options["dependance"])) cmpDependanceSelect.val($("<div/>").html(values.input.options["dependance"]).text())
    if (that.isset(values) && that.isset(values.input.options["dependance_strict"])){
      if (values.input.options["dependance_strict"])
        $dependence_strict.find("input").prop("checked","checked");
      if (values.input.options["dependance"]) {
        $dependence_strict.removeClass("invisible");
        div.find(".cmpDependanceStrictLabel").removeClass("invisible");
      }

    }

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
      // for plusLayers
      if (el.val() == "search") {
        var pluslayers = $(
          '<div class="row pluslayers" style="margin-bottom:20px;">\
        <div class="col-md-offset-2 col-md-8">\
            <div class="controls cmpPlusLayersSearch">\
                <label class="control-label">' +
            gettext("Other searching layers") +
            '</label>\
            </div>\
            <div class="help-block">' +
            gettext("Select one or more additional layers to search on") +
            "</div>\
        </div>\
        </div>"
        )

        // for relations
        if (this.relations.length > 0) {
          var relations = $(
            '<div class="row relations" style="margin-bottom:20px;">\
            <div class="col-md-12">\
                <div class="controls cmpRelations">\
                    <label class="control-label">' +
              gettext("Relations") +
              '</label>\
                </div>\
                <div class="help-block">' +
              gettext("This layer is a child in a relation, if you want to excute the search on father layer of relation, select the relative relation") +
              "</div>\
            </div>\
            </div>"
          )

          var relation_select = $('<select class="form-control" name="relation" style="width: 570px">' + '<option value="">---</option>' + "</select>")

          $.each(this.relations, function (i, v) {
            var selected = ""
            var option = $('<option value="' + v["id"] + '" ' + selected + ">" + v["name"] + "</option>")
            relation_select.append(option)
          })

          relations.find(".cmpRelations").append(relation_select)
        }

        var cmpPlusLayersSearch = $('<select class="form-control" multiple="multiple" name="pluslayer_field" style="width: 570px"></select>')

        $.each(this.projectLayers, function (i, v) {
          var selected = ""
          //var selected = that.isset(values) && values.name === v.name ? "selected" : ""
          var option = $('<option value="' + i + '" ' + selected + ">" + v + "</option>")
          cmpPlusLayersSearch.append(option)
        })

        pluslayers.find(".cmpPlusLayersSearch").append(cmpPlusLayersSearch)
      }

      var addDiv = $(
        '<div class="row text-center">\
							<button type="button" class="btn btn-success addRow"><i class="glyphicon glyphicon-plus"></i> ' + gettext("Add") + "</button>\
						</div>"
      )
      addDiv.find(".addRow").click(function () {
        var div = $(this).parents("div").first()
        that.onAddCallback()

        div.appendTo($(".rightCol"))
        if (el.val() == "search") {
          $(this).parents().find(".pluslayers").appendTo($(".rightCol"))
        }
      })
      $(".rightCol").append(addDiv)

      if (el.val() == "search") {
        if (this.relations.length > 0) {
          $(".bloccoGenerale").append(relations)
        }
        $(".rightCol").append(pluslayers)
        cmpPlusLayersSearch.select2()
      }
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
        $(this).trigger('showstoredvalues:default')
        return
    }
    if (this.widget.widget_type != "law") {
      // for plusLayers
      if (this.widget.widget_type == "search") {
        var pluslayers = $(
          '<div class="row pluslayers" style="margin-bottom:20px;">\
        <div class="col-md-offset-2 col-md-8">\
            <div class="controls cmpPlusLayersSearch">\
                <label class="control-label">' +
            gettext("Other searching layers") +
            '</label>\
            </div>\
            <div class="help-block">' +
            gettext("Select one or more additional layers to search on") +
            "</div>\
        </div>\
        </div>"
        )

        var cmpPlusLayersSearch = $('<select class="form-control" multiple="multiple" name="pluslayer_field" style="width: 570px;"></select>')

        $.each(this.projectLayers, function (i, v) {
          var selected = ""
          if (that.isset(that.widget.body.otherlayers) && _.indexOf(that.widget.body.otherlayers, i) != -1) {
            selected = "selected"
          }
          var option = $('<option value="' + i + '" ' + selected + ">" + v + "</option>")
          cmpPlusLayersSearch.append(option)
        })

        pluslayers.find(".cmpPlusLayersSearch").append(cmpPlusLayersSearch)

        // for relations
        if (this.relations.length > 0) {
          var relations = $(
            '<div class="row relations" style="margin-bottom:20px;">\
            <div class="col-md-12">\
                <div class="controls cmpRelations">\
                    <label class="control-label">' +
              gettext("Relations") +
              '</label>\
                </div>\
                <div class="help-block">' +
              gettext("This layer is a child in a relation, if you want to excute the search on father layer of relation, select the relative relation") +
              "</div>\
            </div>\
            </div>"
          )

          var relation_select = $('<select class="form-control" name="relation" style="width: 570px">' + '<option value="">---</option>' + "</select>")

          $.each(this.relations, function (i, v) {
            var selected = ""
            if (that.isset(that.widget.body.relations) && that.widget.body.relations == v["id"]) {
              selected = "selected"
            }
            var option = $('<option value="' + v["id"] + '" ' + selected + ">" + v["name"] + "</option>")
            relation_select.append(option)
          })

          relations.find(".cmpRelations").append(relation_select)
        }
      }

      var addDiv = $(
        '<div class="row text-center">\
							<button type="button" class="btn btn-success addRow"><i class="glyphicon glyphicon-plus"></i> ' + gettext("Add") + "</button>\
						</div>"
      )
      addDiv.find(".addRow").click(function () {
        var div = $(this).parents("div").first()
        that.onAddCallback()
        div.appendTo($(".rightCol"))

        if (that.widget.widget_type == "search") {
          $(this).parents().find(".pluslayers").appendTo($(".rightCol"))
        }
      })

      $(".rightCol").append(addDiv)

      if (this.widget.widget_type != "law") {
        if (this.relations.length > 0) {
          $(".bloccoGenerale").append(relations)
        }
        $(".rightCol").append(pluslayers)
        cmpPlusLayersSearch.select2()
      }
    }
  },

  setLayerData: function (data, layer, layer_type, project_layers, relations) {
    this.layerColumns = data
    this.layer = layer
    this.layer_type = layer_type
    this.projectLayers = project_layers
    this.relations = relations
  },

  init: function () {
    var that = this
    this.setLayerData(
      ga.Qdjango.localVars["layer_columns"],
      ga.Qdjango.localVars["layer_name"],
      ga.Qdjango.localVars["layer_type"],
      ga.Qdjango.localVars["project_layers"],
      ga.Qdjango.localVars["relations"]
    )
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

      // get row and update widget counter
      $item
        .parent()
        .find(".label")
        .html($item.parents("tr").next().find("tr").length - 1)
    })

    $("#id_widget_type").change(function () {
      that.onWidgetTypeChange($(this))
    })

    // Add event on init
    $(this).trigger('init:after')
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

    // remove for_view and for_editing checkbox if 'editing' module is not active
    if (_.indexOf(ga.settings.G3WADMIN_LOCAL_MORE_APPS, "editing") == -1) {
      modal.$modal.find("#div_id_for_view").hide()
      modal.$modal.find("#div_id_for_editing").hide()
    }

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
    var thead =
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
      "</th>\n"

    if (_.indexOf(ga.settings.G3WADMIN_LOCAL_MORE_APPS, "editing") != -1) {
      thead += "                <th>" + gettext("For visualization") + "</th>\n" + "                <th>" + gettext("For editing") + "</th>\n"
    }

    thead +=
      "                <th>" +
      gettext("Subset rules count") +
      "</th>\n" +
      "                <th>" +
      gettext("Expression rules count") +
      "</th>\n" +
      "            </tr>\n" +
      "        </thead>"

    $table.append(thead)

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
      var tr =
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
        "</td>\n"
      if (_.indexOf(ga.settings.G3WADMIN_LOCAL_MORE_APPS, "editing") != -1) {
        tr += "                <td>" + for_view + "</td>\n" + "                <td>" + for_editing + "</td>\n"
      }
      tr += "                <td>" + v["subset_rule_count"] + "</td>\n" + "                <td>" + v["expression_rule_count"] + "</td>\n" + "            </tr>\n"
      $tbody.append(tr)
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

// activate widget: append to ga.ui.before_datatable_callbacks for to cala it before DatTable init
ga.ui.before_datatable_callbacks.push(function ($widgetItem) {
  $widgetItem.find('[data-widget-type="singlelayerConstraintsList"]').on("click", function (e) {
    var $datatable = $(this).parents("table").DataTable()
    ga.widget.singlelayerConstraintsList($datatable, $(this))
  })
})

// Add GeoConstraint widget
// --------------------------------

_.extend(ga.Qdjango, {
  geoconstraint_urls: {
    constraint: {
      list: "/" + SITE_PREFIX_URL + "qdjango/api/geoconstraint/",
      detail: "/" + SITE_PREFIX_URL + "qdjango/api/geoconstraint/detail/",
    },
    layer: {
      info: "/" + SITE_PREFIX_URL + "qdjango/api/info/layer/polygon/",
      user: "/" + SITE_PREFIX_URL + "qdjango/api/info/layer/user/",
      authgroup: "/" + SITE_PREFIX_URL + "qdjango/api/info/layer/authgroup/",
    },
    rule: {
      list: "/" + SITE_PREFIX_URL + "qdjango/api/georule/geoconstraint/",
      detail: "/" + SITE_PREFIX_URL + "qdjango/api/georule/detail/",
    },
  },
  geoconstraint_data: {
    viewers: [],
    group_viewers: [],
    current_rules: [],
    layer_types: ["spatialite", "postgres", "ogr", "oracle"],
  },
})

_.extend(g3wadmin.tpl, {
  geoConstraintRules: _.template(
    '\
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

  geoConstraintRule: _.template(
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
                              <label class="control-label ">SQL</label>\
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

  geoConstraintForm: _.template(
    '\
      <form action="<%= action %>" id="form-constraint-<%= layerId %>">\
          <input type="hidden" name="layer" value="<%= layerId %>" />\
          <input type="hidden" name="active" value="1" />\
          <div class="info"><h4>' +
      gettext("Select the constraint layer, only Polygon or MultiPolygon geometry") +
      ':</h4></div>\
          <div class="controls">\
              <label>' +
      gettext("Constraint layer") +
      '</label>\
              <select name="constraint_layer" class="select form-control"></select>\
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
          <div class="form-group">\
              <div id="div_id_autozoom" class="checkbox">\
                  <label for="id_autozoom" class="">\
                      <input type="checkbox" name="icheck_autozoom" id="id_autozoom" class="checkboxinput">\
                      ' +
      gettext("Autozoom on map bootstrap") +
      '\
                  </label>\
              </div>\
              <input type="hidden" name="autozoom">\
          </div>\
      </form>'
  ),

  geoConstraintActions: _.template(
    '\
      <span class="col-xs-2 icon">\
          <a href="#" data-toggle="tooltip" data-placement="top" title="' +
      gettext("Manage geo-constaints") +
      '" data-geoconstraint-action-mode="rules" data-geoconstraint-context="<%= constraintContext %>" data-geoconstraint-pk="<%= constraintPk %>"><i class="fa fa-cubes"></i></a>\
      </span>\
      <span class="col-xs-2 icon" style="display:<%= editDisplay %>">\
          <a href="#" data-geoconstraint-action-mode="update" data-geoconstraint-pk="<%= constraintPk %>" data-geoconstraint-layer-id="<%= layerId %>" data-geoconstraint-context="<%= constraintContext %>"><i class="ion ion-edit"></i></a>\
      </span>\
      <span class="col-xs-2 icon">\
          <a href="#" \
          data-widget-type="deleteItem" \
          data-delete-url="' +
      ga.Qdjango.geoconstraint_urls.constraint.detail +
      '<%= constraintPk %>/"\
          data-item-selector="#constraint-item-<%= constraintPk %>"\
          data-delete-method="delete"\
          ><i class="ion ion-trash-b"></i></a>\
      </span>\
  '
  ),
})

_.extend(g3wadmin.widget, {
  _geoConstrantsListParams: ["geoconstraints-list-url", "geoconstraints-layer-pk"],

  _geoConstraintsUrls: {},

  _buildGeoContraintRuleForm: function (constraint_pk, rules_list, res, new_rule) {
    var actions = {
      post: ga.Qdjango.geoconstraint_urls.rule.list + constraint_pk + "/",
      put: _.isNull(res) ? "" : ga.Qdjango.geoconstraint_urls.rule.detail + res["pk"] + "/",
    }

    // instance ne form rule
    var form_options = {
      rulePk: _.isNull(res) ? "new" : res["pk"],
      constraintPk: constraint_pk,
      action: _.isNull(res) ? actions.post : actions.put,
    }
    var form_rule = $(ga.tpl.geoConstraintRule(form_options))
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
        ga_form.setAction(ga.Qdjango.geoconstraint_urls.rule.detail + fres["pk"] + "/")
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

    $.each(ga.Qdjango.geoconstraint_data.viewers, function (k, v) {
      v["selected"] = !_.isNull(res) && res["user"] == v["pk"] ? 'selected="selected"' : ""
      sl_user.append(_.template('<option value="<%= pk %>" <%= selected %>><%= first_name %> <%= last_name %>(<%= username %>)</option>')(v))
    })

    $.each(ga.Qdjango.geoconstraint_data.group_viewers, function (k, v) {
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
          url: ga.Qdjango.geoconstraint_urls.rule.detail + form_rule.find('[name="pk"]').val() + "/",
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

  _refreshGeoConstraintList: function ($item) {
    /**
     * Refresh tr main table layer contraints list
     */
    return function () {
      var $datatable = $item.parents("table").DataTable()
      ga.widget.geoConstraintsList($datatable, $item, true)
    }
  },

  _geoConstraintRulesForm: function ($item, res, params) {
    /**
     * Build form for constraint rules CRUD
     */

    var that = this

    // build modal
    var modal_options = {}
    var modal = ga.ui.buildDefaultModal({
      modalTitle: params["modal-title"],
      modalBody: ga.tpl.geoConstraintRules(modal_options),
      modalSize: "modal-lg",
      confirmButton: false,
    })

    // set action con close modal refresh constraints list
    var $item = $(params["parent_click"].parents("table")[0]).parents("tr").prev().find('[data-widget-type="geoConstraintsList"]')
    //modal.setCloseButtonAction(this._refreshGeoConstraintList($item));
    modal.$modal.on("hidden.bs.modal", this._refreshGeoConstraintList($item))

    // get viewers and users groups viewers for layer
    ga.Qdjango.geoconstraint_data.viewers = []
    ga.Qdjango.geoconstraint_data.group_viewers = []

    $.ajaxSetup({ async: false })
    $.getJSON(ga.Qdjango.geoconstraint_urls.layer.user + params["layer_pk"] + "/?context=" + params["constraint_context"], function (data) {
      ga.Qdjango.geoconstraint_data.viewers = data["results"]
    })

    $.getJSON(ga.Qdjango.geoconstraint_urls.layer.authgroup + params["layer_pk"] + "/?context=" + params["constraint_context"], function (data) {
      ga.Qdjango.geoconstraint_data.group_viewers = data["results"]
    })
    $.ajaxSetup({ async: true })

    // get current rules
    var current_rules = []
    var jqxhr = $.getJSON(ga.Qdjango.geoconstraint_urls.rule.list + params["constraint_pk"] + "/", function (data) {
      ga.Qdjango.geoconstraint_data.current_rules = data["results"]
    }).done(function () {
      $.each(ga.Qdjango.geoconstraint_data.current_rules, function (k, v) {
        that._buildGeoContraintRuleForm(params["constraint_pk"], rules_list, v, false)
      })
    })

    // rule list section
    var rules_list = modal.$modal.find(".rules-list")

    // rule actions for new rule
    var $bt_add_rule = modal.$modal.find(".add-rule")
    $bt_add_rule.on("click", function (e) {
      that._buildGeoContraintRuleForm(params["constraint_pk"], rules_list, null, true)
    })

    modal.show()
  },

  _geoConstraintForm: function ($item, res, params) {
    // set urls

    form_action = params["new"] ? ga.Qdjango.geoconstraint_urls.constraint.list : ga.Qdjango.geoconstraint_urls.constraint.detail + res["pk"] + "/"

    // open modal to show list of add links
    modal_options = {
      layerId: params["layer_pk"],
      action: form_action,
    }
    var modal = (ga.currentModal = ga.ui.buildDefaultModal({
      modalTitle: _.isUndefined(params["modal-title"]) ? gettext("Form title") : params["modal-title"],
      modalBody: ga.tpl.geoConstraintForm(modal_options),
      modalSize: _.isUndefined(params["modal-size"]) ? "" : params["modal-size"],
    }))

    modal.data.$evoker = $item

    // parent_click based on new or update
    if (params["new"]) {
      var $item = params["parent_click"].parents("tr").prev().find('[data-widget-type="geoConstraintsList"]')
    } else {
      var $item = $(params["parent_click"].parents("table")[0]).parents("tr").prev().find('[data-widget-type="geoConstraintsList"]')
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

    modal.$modal.find("#id_autozoom").on("ifChanged", function (e) {
      if (e.target.checked) {
        modal.$modal.find("[name='autozoom']").val("true")
      } else {
        modal.$modal.find("[name='autozoom']").val("false")
      }
    })

    // set action for confirm btn
    var form = new ga.forms.form(modal.$modal.find("form"))
    var that = this
    form.setOnSuccesAction(function (e) {
      that._refreshGeoConstraintList($item)()
      modal.hide()
    })
    modal.setConfirmButtonAction(function (e) {
      form.sendData(e, params["new"] ? "post" : "put")
    })

    ga.ui.initRadioCheckbox(modal.$modal.find("form"))

    // remove for_view and for_editing checkbox if 'editing' module is not active
    if (_.indexOf(ga.settings.G3WADMIN_LOCAL_MORE_APPS, "editing") == -1) {
      modal.$modal.find("#div_id_for_view").hide()
      modal.$modal.find("#div_id_for_editing").hide()
    }

    modal.show()

    // populate layer select
    $.getJSON(ga.Qdjango.geoconstraint_urls.layer.info + params["layer_pk"] + "/", function (data) {
      var $select = modal.$modal.find('[name="constraint_layer"]')
      $.each(data["results"], function (key, val) {
        var $option = $('<option value="' + val["pk"] + '">' + val["name"] + "</option>")
        if (!_.isNull(res)) {
          if (val["pk"] == res["constraint_layer"] && _.indexOf(ga.Qdjango.geoconstraint_data.layer_types, val["layer_type"]) != -1) $option.attr("selected", "selected")
        }
        $select.append($option)
      })
    })

    // populate form in update
    if (!params["new"]) {
      $.each(res, function (key, val) {
        modal.$modal.find("[name=" + key + "]").val(val)
        // init icheck
        if (key == "for_view" || key == "for_editing" || key == "autozoom") {
          if (val) {
            modal.$modal.find("#id_" + key).iCheck("check")
          } else {
            modal.$modal.find("#id_" + key).iCheck("uncheck")
          }
        }
      })
    }
  },

  /*
    Build constraints table
     */
  _geoConstraintsTable: function (layer_pk, res) {
    var $div = $('<div style="margin-left:40px;">')

    // add new constraint btn
    $newConstraint = $('<a href="#" class="btn btn-default btn-sm"><i class="ion ion-plus-circled"></i> ' + gettext("New geo constraint") + "</a>")
    $newConstraint.on("click", function () {
      ga.widget._geoConstraintForm($newConstraint, null, {
        "modal-title": gettext("New constraint"),
        layer_pk: layer_pk,
        new: true,
        parent_click: $(this),
      })
    })
    $div.append($newConstraint)

    // add table contraints saved
    var $table = $('<table class="table">')
    var $tbody = $table.append($("<tbody>"))
    var thead =
      "<thead>\n" +
      "            <tr>\n" +
      '                <th style="width:180px;">' +
      gettext("Actions") +
      "</th>\n" +
      "                <th>" +
      gettext("Layer constraint") +
      "</th>\n" +
      "                <th>" +
      gettext("Description") +
      "</th>\n"
    if (_.indexOf(ga.settings.G3WADMIN_LOCAL_MORE_APPS, "editing") != -1) {
      thead += "                <th>" + gettext("For visualization") + "</th>\n" + "                <th>" + gettext("For editing") + "</th>\n"
    }
    thead += "                <th>" + gettext("Autozoom") + "</th>\n"
    thead += "                <th>" + gettext("Rules count") + "</th>\n" + "            </tr>\n" + "        </thead>"

    $table.append(thead)

    // add constraints
    var constraint_res = {}
    $.each(res["results"], function (k, v) {
      constraint_res[v["pk"]] = v
      var editDisplay = v["constraint_rule_count"] > 0 ? "none" : "display"
      var for_view = v["for_view"] ? '<span class="fa fa-check-circle" style="color: orange"></span>' : ""
      var for_editing = v["for_editing"] ? '<span class="fa fa-check-circle" style="color: orange"></span>' : ""
      var autozoom = v["autozoom"] ? '<span class="fa fa-check-circle" style="color: orange"></span>' : ""
      var constraintContext = ""
      if (for_view != "") constraintContext += "v"
      if (for_editing != "") constraintContext += "e"
      var tr =
        '<tr id="constraint-item-' +
        v["pk"] +
        '">\n' +
        "                <td>" +
        ga.tpl.geoConstraintActions({
          layerId: layer_pk,
          constraintPk: v["pk"],
          constraintContext: constraintContext,
          editDisplay: editDisplay,
        }) +
        "</td>\n" +
        "                <td>" +
        v["constraint_layer_name"] +
        "</td>\n" +
        "                <td>" +
        v["description"] +
        "</td>\n"
      if (_.indexOf(ga.settings.G3WADMIN_LOCAL_MORE_APPS, "editing") != -1) {
        tr += "                <td>" + for_view + "</td>\n"
        tr += "                <td>" + for_editing + "</td>\n"
      }
      tr += "                <td>" + autozoom + "</td>\n"
      tr += "                <td>" + v["constraint_rule_count"] + "</td>\n" + "            </tr>\n"
      $tbody.append(tr)
    })

    // add actions to elements action
    $tbody.find('[data-geoconstraint-action-mode="update"]').on("click", function (e) {
      ga.widget._geoConstraintForm($newConstraint, constraint_res[$(this).attr("data-geoconstraint-pk")], {
        "modal-title": gettext("Update constraint"),
        layer_pk: layer_pk,
        //'constraint_pk': $(this).attr('data-contraint-pk'),
        constraint_context: $(this).attr("data-geoconstraint-context"),
        new: false,
        parent_click: $(this),
      })
    })

    $tbody.find('[data-geoconstraint-action-mode="rules"]').on("click", function (e) {
      ga.widget._geoConstraintRulesForm($newConstraint, null, {
        "modal-title": gettext("Geo Constraint Rules"),
        constraint_pk: $(this).attr("data-geoconstraint-pk"),
        constraint_context: $(this).attr("data-geoconstraint-context"),
        layer_pk: layer_pk,
        parent_click: $(this),
      })
    })

    $div.append($table)

    return $div
  },

  geoConstraintsList: function ($datatable, $item, refresh) {
    try {
      var params = ga.utils.getDataAttrs($item, this._geoConstrantsListParams)
      if (_.isUndefined(params["geoconstraints-list-url"])) {
        throw new Error("Attribute data-geoconstraints-list-url not defined")
      }

      // get tr row parent
      refresh = _.isUndefined(refresh) ? false : true

      var tr = $item.closest("tr")
      var row = $datatable.row(tr)
      var idx = $.inArray(tr.attr("id"), [])

      var getDetail = function () {
        $.ajax({
          method: "get",
          url: params["geoconstraints-list-url"],
          success: function (res) {
            row.child(g3wadmin.widget._geoConstraintsTable(params["geoconstraints-layer-pk"], res)).show()
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

          // ajax call to get deatail data
          getDetail()
        }
      }
    } catch (e) {
      this.showError(e.message)
    }
  },
})

// activate widget: append to ga.ui.before_datatable_callbacks for to call it before DatTable init
ga.ui.before_datatable_callbacks.push(function ($widgetItem) {
  $widgetItem.find('[data-widget-type="geoConstraintsList"]').on("click", function (e) {
    var $datatable = $(this).parents("table").DataTable()
    ga.widget.geoConstraintsList($datatable, $(this))
  })
})

// Add ColumnACL manager widget
// --------------------------------
_.extend(g3wadmin.widget, {
  _columnAclManagerParams: ["column-acl-list-url", "column-acl-layer-pk", "column-acl-fields-url", "info-layer-user", "info-layer-authgroup"],
  _columnAclDetailUrl: "/" + SITE_PREFIX_URL + "qdjango/api/column_acl/detail/",
  /**
   * Creates the columns acl table
   */
  _columnAclTable: function (res, $datatable, $item) {
    var params = ga.utils.getDataAttrs($item, this._columnAclManagerParams)
    let column_acl_list_url = params["column-acl-list-url"]
    if (_.isUndefined(params["column-acl-layer-pk"])) {
      throw new Error("Attribute column-acl-layer-pk not defined")
    }

    let $div = $('<div style="margin-left:40px;">')

    // add new acl btn
    $newColumnAcl = $('<a href="#" class="btn btn-sm btn-default"><i class="ion ion-plus-circled"></i> ' + gettext("Create New Column Level Constraint") + "</a>")
    $newColumnAcl.on("click", function () {
      ga.widget._newColumnAclForm($datatable, $newColumnAcl, params, {
        "modal-title": gettext("New Column Level Constraint"),
        new: true,
        parent_click: $(this),
      })
    })
    $div.append($newColumnAcl)

    let $table = $('<table class="table">')
    $table.append(
      `<thead>
        <tr>
            <th style="width:180px;">${gettext("Actions")}</th>
            <th>${gettext("User")}</th>
            <th>${gettext("Group")}</th>
            <th>${gettext("Restricted Fields")}</th>
        </tr>
      </thead>`
    )
    let $tbody = $table.append($("<tbody>"))
    let columnAclCount = res["results"].length

    $.each(res["results"], function (k, v) {
      let actions =  `<span class="col-xs-2 icon">
            <a href="#"
                data-toggle="tooltip" data-placement="top"
                title="${gettext("Delete Column Level Constraint from the layer.")}"
                data-column-acl-pk="${v["pk"]}"
                data-column-acl-action-mode="delete"
            >
                <i class="ion ion-fa ion-trash-b"></i>
            </a>
        </span>`
      actions += `
            <span class="col-xs-2 icon">
                <a href="#" data-column-acl-pk="${v["pk"]}"
                    data-toggle="tooltip" data-placement="top"
                    title="${gettext("Edit Column Level Constraint.")}"
                    data-column-acl-action-mode="edit"
                    data-column-acl-record='${JSON.stringify(v).replaceAll("'", "'")}'
                >
                    <i class="ion ion-edit"></i>
                </a>
            </span>
             `

      $tbody.append(`
            <tr>
                <td>${actions}</td>
                <td>${v["username"]}</td>
                <td>${v["groupname"]}</td>
                <td>${v["restricted_fields"]}</td>
            </tr>`)
    })

    let that = this

    // Add events to actions
    $tbody.find('[data-column-acl-action-mode="delete"]').on("click", function (e) {
      let column_acl = $(e.currentTarget).attr("data-column-acl-pk")
      let actionDelete = function () {
        $.ajax({
          method: "delete",
          url: ga.widget._columnAclDetailUrl + column_acl + "/",
          success: function (res) {
            ga.widget.showColumnAclManagerList($datatable, $item, true)
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
        modalTitle: gettext("Delete Column Level Constraint"),
        modalBody: `${gettext("Are you sure to delete column constraint")} #<strong>${column_acl}</strong>?`,
        closeButtonText: "No",
      })

      modal.setConfirmButtonAction(actionDelete)
      modal.show()
    })

    $tbody.find('[data-column-acl-action-mode="edit"]').on("click", function (e) {
      let column_acl = $(e.currentTarget).attr("data-column-acl-pk")
      let column_acl_record = $(e.currentTarget).data("column-acl-record")
      ga.widget._newColumnAclForm($datatable, $newColumnAcl, params, {
        "modal-title": gettext("Edit Column Level Constraint") + " " + column_acl,
        new: false,
        column_acl_record: column_acl_record,
        parent_click: $(this),
      })
    })

    $div.append($table)
    return $div
  },

  /**
   * Display the column ACL list
   */
  showColumnAclManagerList: function ($datatable, $item, refresh) {
    try {
      var params = ga.utils.getDataAttrs($item, this._columnAclManagerParams)
      if (_.isUndefined(params["column-acl-list-url"])) {
        throw new Error("Attribute column-acl-list-url not defined")
      }

      // get tr row parent
      refresh = _.isUndefined(refresh) ? false : true

      var tr = $item.closest("tr")
      var row = $datatable.row(tr)
      var idx = $.inArray(tr.attr("id"), [])

      var getDetail = function () {
        $.ajax({
          method: "get",
          url: params["column-acl-list-url"],
          success: function (res) {
           row.child(g3wadmin.widget._columnAclTable(res, $datatable, $item)).show()
          },
          complete: function () {
            var status = arguments[1]
            if (status == "success") {
              ga.ui.initRadioCheckbox(row.child());
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

  /**
   * Creates the add new/edit column ACL form
   *
   */
  _newColumnAclForm: function ($datatable, $item, params, form_params) {
    let isNew = form_params["new"]
    params["layerId"] = params["column-acl-layer-pk"]

    if (isNew) {
      params["form_action"] = params["column-acl-list-url"]
      params["title"] = gettext("Define hidden columns for a user or a group.")
      params["modal_title"] = gettext("Create a new Column Level Constraint.")
      params["columnAclPk"] = ""
    } else {
      params["form_action"] = ga.widget._columnAclDetailUrl + form_params["column_acl_record"]["pk"] + "/"
      params["title"] = gettext("Edit Column Level Constraint.")
      params["modal_title"] = params["title"] + "#" + form_params["column_acl_record"]["pk"]
      params["columnAclPk"] = form_params["column_acl_record"]["pk"]
    }

    let modal = (ga.currentModal = ga.ui.buildDefaultModal({
      modalTitle: params["modal_title"],
      modalBody: ga.tpl._newColumnAclForm(params),
      modalSize: _.isUndefined(params["modal-size"]) ? "" : params["modal-size"],
    }))

    modal.data.$evoker = $item

    // Populate selects
    $.ajax({
      method: "get",
      url: params["column-acl-fields-url"],
      success: function (res) {
        let field_names = res["field_names"]
        let $el = modal.$modal.find('[name="restricted_fields"]')
        $el.empty() // remove old options
        $.each(field_names, function (key, value) {
          $el.append($("<option></option>").attr("value", value).text(value))
        })
        if (!isNew) {
          if (form_params["column_acl_record"]["restricted_fields"].length != 0) {
            $el.val(form_params["column_acl_record"]["restricted_fields"])
          }
        }
      },
      complete: function () {},
      error: function (xhr, textStatus, errorMessage) {
        ga.widget.showError(ga.utils.buildAjaxErrorMessage(xhr.status, errorMessage))
      },
    })

    $.ajax({
      method: "get",
      url: params["info-layer-user"],
      success: function (res) {
        let users = res["results"]
        let $el = modal.$modal.find('[name="user"]')
        $el.empty() // remove old options
        $el.append($("<option></option>").attr("value", "").text("--"))
        $.each(users, function (key, value) {
          $el.append($("<option></option>").attr("value", value["pk"]).text(value["username"]))
        })
        if (!isNew) {
          if (form_params["column_acl_record"]["user"] != "") {
            $el.val(form_params["column_acl_record"]["user"])
          }
        }
      },
      complete: function () {},
      error: function (xhr, textStatus, errorMessage) {
        ga.widget.showError(ga.utils.buildAjaxErrorMessage(xhr.status, errorMessage))
      },
    })

    $.ajax({
      method: "get",
      url: params["info-layer-authgroup"],
      success: function (res) {
        let groups = res["results"]
        //let $el = $('[name="group"]')
        let $el = modal.$modal.find('[name="group"]')
        $el.empty() // remove old options
        $el.append($("<option></option>").attr("value", "").text("--"))
        $.each(groups, function (key, value) {
          $el.append($("<option></option>").attr("value", value["pk"]).text(value["name"]))
        })
        if (!isNew) {
          if (form_params["column_acl_record"]["group"] != "") {
            $el.val(form_params["column_acl_record"]["group"])
          }
        }
      },
      complete: function () {},
      error: function (xhr, textStatus, errorMessage) {
        ga.widget.showError(ga.utils.buildAjaxErrorMessage(xhr.status, errorMessage))
      },
    })

    // parent_click based on new or update
    if (isNew) {
      var $item = form_params["parent_click"].parents("tr").prev().find('[data-widget-type="columnAclManagerList"]')
    } else {
      var $item = $(form_params["parent_click"].parents("table")[0]).parents("tr").prev().find('[data-widget-type="columnAclManagerList"]')
    }

    // set action for confirm btn
    var form = new ga.forms.form(modal.$modal.find("form"))
    var that = this
    form.setOnSuccesAction(function (e) {
      ga.widget.showColumnAclManagerList($datatable, $item, true)
      modal.hide()
    })

    modal.setConfirmButtonAction(function (e) {
      let dt = form.getData("array")
      // Validate
      if (dt["user"] == "" && dt["group"] == "") {
        let $ediv = form.$form.find(".form-errors")
        $ediv.html("")
        $ediv.append(`<h4 class="badge bg-red">${gettext("You must select a 'group' or a 'user'!")}</h4>`)
        return
      }

      if (dt["user"] != "" && dt["group"] != "") {
        let $ediv = form.$form.find(".form-errors")
        $ediv.html("")
        $ediv.append(`<h4 class="badge bg-red">${gettext("You cannot select both a 'group' and a 'user': they are mutually exclusive!")}</h4>`)
        return
      }

      dt["restricted_fields"] = Array()

      $.each(form.$form.serializeArray(), function (k, v) {
        if (v["name"] == "restricted_fields") {
          dt["restricted_fields"].push(v["value"])
        }
      })

      if (dt["restricted_fields"].length == 0) {
        let $ediv = form.$form.find(".form-errors")
        $ediv.html("")
        $ediv.append(`<h4 class="badge bg-red">${gettext("Hidden Fields is required!")}</h4>`)
        return
      }

      form.sendData(e, form_params["new"] ? "post" : "patch", JSON.stringify(dt), "application/json; charset=UTF-8")
    })

    modal.show()

    modal.$modal.find('[name="user"]').select2()
    modal.$modal.find('[name="group"]').select2()
    modal.$modal.find('[name="restricted_fields"]').select2()
  },
})

// activate widget: append to ga.ui.before_datatable_callbacks for to cala it before DatTable init
ga.ui.before_datatable_callbacks.push(function ($widgetItem) {
  $widgetItem.find('[data-widget-type="columnAclManagerList"]').on("click", function (e) {
    var $datatable = $(this).parents("table").DataTable()
    ga.widget.showColumnAclManagerList($datatable, $(this))
  })
})

_.extend(g3wadmin.tpl, {
  _newColumnAclForm: _.template(`
        <form action="<%= form_action %>" id="form-new-column-acl-<%= layerId %>">
        <input type="hidden" name="pk" value="<%= columnAclPk %>">
        <input type="hidden" name="layer" value="<%= layerId %>">
        <div class="form-errors"></div>
            <div class="row">
				<div class="col-md-12">
					<div class="info"><%= title %></div>
					<div class="form-group">
						<label class="control-label ">${gettext("User (required if group is not set)")}</label>
						<div class="controls ">
							<select class="form-select" name="user" style="width:100%;"/>
						</div>
					</div>

					<div class="form-group">
						<label class="control-label ">${gettext("Group (required if user is not set)")}</label>
						<div class="controls ">
                        <select class="form-select" name="group" style="width:100%;" />
						</div>
					</div>

					<div class="form-group">
						<label class="control-label ">${gettext("Hidden Fields (required)")}</label>
						<div class="controls ">
							<select class="form-select" multiple placeholder="${gettext("Select the hidden fields")}" required name="restricted_fields" style="width:100%;">
                            </select>
						</div>
					</div>

				</div>
			</div>
        </form>`),
})

// Add ScaleLayerVisibilityConstraint manager widget
// -------------------------------------------------
// activate widget: append to ga.ui.before_datatable_callbacks for to cala it before DatTable init
ga.ui.before_datatable_callbacks.push(function ($widgetItem) {
  $widgetItem.find('[data-widget-type="scalevisconstraintManagerList"]').on("click", async function (e) {
    const widget = 'scalevisconstraintManagerList';
    const a = (await import(`${STATIC_BASE_URL}qdjango/js/data-widget-${widget}.js`));
    a[widget]($(this).parents("table").DataTable(), $(this));
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

// activate widget: append to ga.ui.before_datatable_callbacks for to cala it before DatTable init
ga.ui.before_datatable_callbacks.push(function ($widgetItem) {
  $widgetItem.find('[data-widget-type="styleManagerList"]').on("click", function (e) {
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

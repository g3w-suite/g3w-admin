/**
 * Created by Francesco Bellina on 2014
 * Modified by Walter Lorenzetti on 2016
 */

ga.Qdjango = {
	urls: {
        constraint: {
            list: '/' + SITE_PREFIX_URL + 'qdjango/api/constraint/',
            detail: '/' + SITE_PREFIX_URL + 'qdjango/api/constraint/detail/',
        },
        layer: {
            //info: '/' + SITE_PREFIX_URL + 'vector/api/info/layer/',
            user: '/' + SITE_PREFIX_URL + 'qdjango/api/info/layer/user/',
            authgroup: '/' + SITE_PREFIX_URL + 'qdjango/api/info/layer/authgroup/'
        },
        rule: {
        	subset: {
        		list: '/' + SITE_PREFIX_URL + 'qdjango/api/subsetstringrule/constraint/',
            	detail: '/' + SITE_PREFIX_URL + 'qdjango/api/subsetstringrule/detail/'
			},
			expression: {
        		list: '/' + SITE_PREFIX_URL + 'qdjango/api/expressionrule/constraint/',
            	detail: '/' + SITE_PREFIX_URL + 'qdjango/api/expressionrule/detail/'
			}

        }
    },
	data: {
        viewers: [],
        group_viewers: [],
        current_rules: []
    }
};

ga.Qdjango.localVars = {};

ga.Qdjango.widgetEditor = {

	fadeNumber: 400,
	layerColumns: null,
	lawslist: null,
	layer: null,
	form: null,
	onAddCallback: null,
	widget: null,
	delimiterItems: ['.',',',';'],
	widgettype : {
		'inputbox': 'InputBox',
		'selectbox': 'SelectBox',
	},
	/*widget: [
		{
			'type': 'unique_value_select',
			'label': 'Unique value select',
			'options': null
		}
	],*/
	
	isset: function(o)
	{
		if(typeof o == 'undefined')
			return false
		else
			if(o===null)
				return false;
		return true;
	},
	
	getType: function(str)
	{
		if (str.indexOf("VARCHAR") !== -1 ||
			str.indexOf("STRING") !== -1 ||
			str.indexOf("TEXT") !== -1)
			return "textfield";
		if (str.indexOf("NUMERIC") !== -1 ||
			str.indexOf("DOUBLE PRECISION") !== -1 ||
			str.indexOf("INTEGER") !== -1 ||
			str.indexOf("BIGINT") !== -1 ||
			str.indexOf("REAL") !== -1)
			return "numberfield";
	},

	onFormSubmit: function()
	{
		var that = this;
		var obj = {};
		var widget_type = this.widget ? this.widget.widget_type : $("#id_widget_type").val();

		// check is widget-ytpe is changed from loading data
		if ($("#id_widget_type").val() != widget_type) {
			widget_type = $("#id_widget_type").val()
		}

		switch( widget_type )
		{
			case "hyperlink":
				obj = [];
				$.each($(".rightCol").find(".blocco"), function(i,v)
				{
					v = $(v);
					var tmp = {
						field: v.find(".fieldSelect").find("select").val(),
						text: v.find(".textInput").find("input").val(),
						nuovo_field: v.find(".newFieldName").find("input").val(),
					};
					obj.push(tmp);
				});
				break;
			case "search":
				obj = {
					title: $(".rightCol").find("#title").val(), // TITOLO CAMPO DI RICERCA
					query: 'simpleWmsSearch', // MI SEMBRA CHE NON SERCA
					usewmsrequest: true, // SEMPRE A TRUE
					fields: [],
					results: [
						 // COLONNE RISULTATI {"INTESTAZIONE COLONNA", "CAMPO DB DA VISUALIZZARE", "NON LO SO :)"}
					],
					selectionlayer: this.layer, // NOME DEL LAYER SU CUI ESEGUIRE LA SELEZIONE IN BASE AI RISULTATI (VIENE GENERATO DA DJANGO)
					selectionzoom: 0, // SELEZIONARE IL RISULTATO? (0,1)
					dozoomtoextent: true // ZOOMA AL RISULTATO? (TRUE,FALSE)
				};
				$.each($(".rightCol").find(".blocco"), function(i,v)
				{
					v = $(v);

					var options = {};
					var dependance = v.find(".cmpDependanceSelect").find("select").val();
					if (dependance) {
						options['dependance'] = dependance;
					}
					obj.fields.push({
						name: v.find(".fieldSelect").find("select").val(), // NOME DEL CAMPO DB
						label: v.find(".textInput").find("input").val(), // ETICHETTA DEL CAMPO DI RICERCA
						blanktext: v.find(".descriptionInput").find("input").val(), // TESTO INIZIALE NEL CAMPO
						filterop: v.find(".cmpOperatorSelect").find("select").val(), // OPERATORE DI CONFRONTO (=,&lt;,&gt;,=&lt;,&gt;=,&lt;&gt;)
						widgettype: v.find(".widgetType").find("select").val(), // widgettype
						input: {
							type: that.getType(v.find(".fieldSelect").find("select").find("option:selected").data().type), // TIPO DI CAMPO //
							options: options
						},
					});
				});




				$.each($(".rightCol").find(".bloccoGenerale").find(".resultFields").find(".row"), function(i,v){
					v = $(v);
					if (v.hasClass("labels") || !that.isset(v.find(".fieldSelect").find("select").val()))
						return true;
					obj.results.push({header: v.find(".textInput").find("input").val(), name: v.find(".fieldSelect").find("select").val()});
				});
				break;
			case "tooltip":
				obj = [];
				$.each($(".rightCol").find(".blocco"), function(i,v)
				{
					v = $(v);
					var tmp = {
						text: v.find(".textInput").find("input").val(),
						field: v.find(".fieldSelect").find("select").val(),
						image: v.find(".bImage").find("button").hasClass("active"),
					};
					if (tmp.image)
					{
						tmp.img_width = v.find(".imgSize").find(".img_width").val();
						tmp.img_height = v.find(".imgSize").find(".img_height").val();
					}
					obj.push(tmp);
				});
				break;
			case "law":
				var obj = {}
				$.each($(".rightCol").find(".blocco"), function(i,v)
				{
					v = $(v);
					obj = {
						field: v.find(".fieldSelect").find("select").val(),
						delimiter: v.find(".delimiterSelect").find("select").val(),
						law_id: parseInt(v.find(".lawSelect").find("select").val()),
					};
				});
				break;
			default:
				return;
		}
		$('#id_body').val(JSON.stringify(obj));
	},
	
	generateGeneralParams: function(values)
	{
		var that = this;
		var fieldSelect = $('<select class="form-control" name="resultfield"></select>');
		$.each(this.layerColumns, function(i,v)
		{
			var selected = (that.isset(values) && that.isset(values.results) && values.results.length>0 && values.results[0].name === v.name)? "selected" : "";
			var option = $('<option value="'+v.name+'" '+selected+'>'+v.name+'</option>');
			fieldSelect.append(option);
		});
		
		var alInVa = (that.isset(values) && that.isset(values.results) && values.results.length>0 && that.isset(values.results[0].header))? values.results[0].header : "";
		var textInput = $('<input class="form-control" type="text" name="resultfield_text" value="'+alInVa+'">');
		
		var tiVa = (that.isset(values) && that.isset(values.title))? values.title : "";
		var title = $('<input class="form-control" type="text" name="title" id="title" value="'+tiVa+'">');
									
		var div = $('<div class="bloccoGenerale box box-danger">\
						<div class="box-header with-border">\
						<h3 class="box-title">'+gettext("General configuration for search widget and results")+'</h3>\
						</div>\
						<div class="box-body">\
							<div class="col-md-12">\
								<div class="row">\
									<div class="col-md-12"><span class="label label-default">'+gettext("Search title")+'</span></div>\
								</div>\
								<div class="row">\
									<div class="form-group col-md-12 title"></div>\
								</div>\
							</div>\
						<\div>\
					</div>');
					
		var onAddAction = function(btn, values)
		{
			var fieldSelect = $('<select class="form-control" name="resultfield"></select>');
			$.each(that.layerColumns, function(i,v)
			{
				var selected = (that.isset(values) && values.dataIndex === v.name)? "selected" : "";
				var option = $('<option value="'+v.name+'" '+selected+'>'+v.name+'</option>');
				fieldSelect.append(option);
			});
		
			var alInVa = (that.isset(values) && that.isset(values.header))? values.header : "";
			var textInput = $('<input class="form-control" type="text" name="resultfield_text" value="'+alInVa+'" >');
			var lastRow = btn.parents(".row").first();
			var newRow = 	$(	'<div class="row">\
									<div class="col-md-6 fieldSelect"></div>\
									<div class="col-md-5 textInput"></div>\
									<div class="col-md-1" style="padding-left:0px;"></div>\
								</div>');
			lastRow.find(".fieldSelect").append(fieldSelect);
			lastRow.find(".textInput").append(textInput);
			btn.parents(".resultFields").first().append(newRow);
			btn.appendTo(newRow.find(".col-md-1"));
			var remBtn = $('<button type="button" class="btn btn-default remove"><i class="glyphicon glyphicon-minus"></i></button>');
			remBtn.click(function(){ 
				$(this).parents(".row").first().remove(); 
			});
			lastRow.find(".col-md-1").append(remBtn);
		};
		
		div.find("button").click(function(){ onAddAction($(this)); });
		div.find(".title").append(title);
		div.find(".fieldSelect").first().append(fieldSelect);
		div.find(".textInput").first().append(textInput);
		$(".rightCol").append(div);
		
		if (that.isset(values) && that.isset(values.results) && values.results.length>1)
		{
			$.each(values.results, function(i,v){
				if (i === 0)
					return true;
				onAddAction(div.find("button.add"), v);
			});
		}
		
		div.fadeIn(this.fadeNumber);
	},
	
	generateSearchRow: function(values)
	{
		var that = this;

		var fieldSelect = $('<select class="form-control" name="searchfield"></select>');
		$.each(this.layerColumns, function(i,v)
		{
			var selected = (that.isset(values) && values.name === v.name)? "selected" : "";
			var option = $('<option value="'+v.name+'" '+selected+'>'+v.name+'</option>');
			option.data({type: v.type});
			fieldSelect.append(option);
		});
		
		var fiLaVa = (that.isset(values) && that.isset(values.label))? values.label : "";
		var textInput = $('<input class="form-control" type="text" name="searchfield_text" value="'+fiLaVa+'" >');
		
		var blTeVa = (that.isset(values) && that.isset(values.blanktext))? values.blanktext : "";
		var descriptionInput = $('<input class="form-control" type="text" name="searchfield_description" value="'+blTeVa+'" >');
		
		var cmpOperatorSelect = $('<select class="form-control" name="comparison_operator">\
										<option value="eq">=</option>\
										<option value="gt">&gt;</option>\
										<option value="lt">&lt;</option>\
										<option value="ltgt">&lt;&gt;</option>\
										<option value="gte">&gt;=</option>\
										<option value="lte=">&lt;=</option>\
										<option value="LIKE">LIKE</option>\
									</select>');

		// si aggiunge e si fa apparire la dipendenza se seleziona

		var cmpDependanceSelect = $('<select class="form-control" name="dependence_field">' +
			'<option value=""> ----- </option>' +
			'</select>');


		var options = that.widgettype;
		if ($.inArray(that.layer_type, ['postgres', 'spatialite']) == -1){
			delete options['selectbox'];

		}

		var widgetSelect = $('<select class="form-control" name="widget_type"></select>');
		$.each(options, function(k,i){
			widgetSelect.append('<option value="'+k+'">'+i+'</option>');
		});



		// add widget types
		if (this.layer_type != 'spatialite'){
			cmpOperatorSelect.append('<option value="ILIKE">ILIKE</option>')
		}
		if (that.isset(values) && that.isset(values.filterop))
			cmpOperatorSelect.val($('<div/>').html(values.filterop).text());

		if (that.isset(values) && that.isset(values.widgettype))
			widgetSelect.val($('<div/>').html(values.widgettype).text());

		var div = $('<div class="blocco" style="display: none">\
					<div class="box box-success" >\
							<div class="box-header with-border">\
							<h3 class="box-title">'+gettext("Search field settings")+'</h3>\
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
									<div class="col-md-3"><span class="label label-default">'+gettext("Field")+'</span></div>\
									<div class="col-md-2"><span class="label label-default">'+gettext("Widget")+'</span></div>\
									<div class="col-md-3"><span class="label label-default">'+gettext("Alias")+'</span></div>\
									<div class="col-md-3"><span class="label label-default">'+gettext("Description")+'</span></div>\
									<div class="col-md-1"><span class="label label-default">'+gettext("Comparison operator")+'</span></div>\
								</div>\
								<div class="row">\
									<div class="col-md-3 fieldSelect"></div>\
									<div class="col-md-2 widgetType"></div>\
										<div class="col-md-3 textInput"></div>\
									<div class="col-md-3 descriptionInput"></div>\
									<div class="col-md-1 cmpOperatorSelect"></div>\
								</div>\
								<div class="row">\
									<div class="col-md-3 invisible cmpDependanceSelectLabel"><span class="label label-default">'+gettext("Dependency")+'</span></div>\
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
							</select>\
						</div>\
						</div>\
					</div>');
		
		div.find(".close").click(function(){
			var blocco = $(this).parents(".blocco").first();
			blocco.find(".logic_operator").fadeOut(that.fadeNumber, function(){ $(this).remove(); });
			blocco.remove();
			$(".logic_operator").last().fadeOut(that.fadeNumber);
		});
		div.find(".fieldSelect").append(fieldSelect);
		div.find(".textInput").append(textInput);
		div.find(".descriptionInput").append(descriptionInput);
		div.find(".cmpOperatorSelect").append(cmpOperatorSelect);
		div.find(".cmpDependanceSelect").append(cmpDependanceSelect);
		div.find(".widgetType").append(widgetSelect);
		
		$(".rightCol").append(div);
		div.fadeIn(this.fadeNumber);

		widgetSelect.on('change', function(){
			var $select = div.find(".cmpDependanceSelect");
			var $advise = div.find(".advise");
			if ($(this).val() == 'selectbox') {
				div.find(".cmpDependanceSelectLabel").removeClass('invisible');
				$select.removeClass('invisible');

				$.each($(".rightCol").find('.blocco'), function(i, v) {
					var f = $(v).find(".fieldSelect").find("select").val()
					$select.find('select').append('<option value="'+f+'">'+f+'</option>')
				});

				// show advise msg
				$advise.show();
				$advise.find('div').html("<strong>"+gettext('Attention')+"!</strong><br>" +
					gettext('Fields with many unique values can create slow map loading behavior'));


			} else {
				div.find(".cmpDependanceSelectLabel").addClass('invisible');
				$select.addClass('invisible');
				$advise.hide();
			}
		});

		widgetSelect.trigger('change');
		if (that.isset(values) && that.isset(values.input.options['dependance']))
			cmpDependanceSelect.val($('<div/>').html(values.input.options['dependance']).text());
	},
	
	generateTooltipRow: function(values)
	{
		var that = this;
		
		var alInVa = (that.isset(values) && that.isset(values.text))? values.text : "";
		var textInput = $('<input class="form-control" type="text" name="field_text" value="'+alInVa+'">');
		
		var fieldSelect = $('<select class="form-control" name="field" ></select>');
		$.each(that.layerColumns, function(i,v)
		{
			var selected = (that.isset(values) && values.field === v.name)? "selected" : "";
			var option = $('<option value="'+v.name+'" '+selected+'>'+v.name+'</option>');
			fieldSelect.append(option);
		});
		
		var bImage = $('<button type="button" class="btn"><i class="glyphicon glyphicon-remove"></i></button>');
		
		var imWiVa = (that.isset(values) && that.isset(values.img_width))? values.img_width : "";
		var imHeVa = (that.isset(values) && that.isset(values.img_height))? values.img_height : "";
									
		var div = $('<div class="blocco" style="margin-top: 30px; display: none">\
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
										<input class="form-control col-md-1"  type="text" class="img_width" placeholder="width" value="'+imWiVa+'">\
										<input class="form-control col-md-1" type="text" class="img_height" placeholder="height" value="'+imHeVa+'">\
									</div>\
								</div>\
							</div>\
						</div>\
					</div>');		
		
		div.find(".close").click(function(){
			$(this).parents(".alert").first().fadeOut(that.fadeNumber, function(){ 
				$(this).alert('close');
				$(this).remove();
			});
		});
		bImage.click(function(){ // va in esecuzione prima del cambiamento della classe active
			if (!$(this).hasClass("active"))
			{
				$(this).addClass("btn-success").addClass("active");
				$(this).html('<i class="glyphicon glyphicon-ok"></i>');
				$(this).parents(".row").first().find(".imgSize").fadeIn(that.fadeNumber);
				$(this).parents(".blocco").first().find(".imgSizeLabel").fadeIn(that.fadeNumber);
			}
			else
			{
				$(this).removeClass("btn-success").removeClass("active");
				$(this).html('<i class="glyphicon glyphicon-remove"></i>');
				$(this).parents(".row").first().find(".imgSize").fadeOut(that.fadeNumber);
				$(this).parents(".blocco").first().find(".imgSizeLabel").fadeOut(that.fadeNumber);
			}
		});
		
		div.find(".fieldSelect").append(fieldSelect);
		div.find(".textInput").append(textInput);
		div.find(".bImage").append(bImage);
		
		$(".rightCol").append(div);
		
		if (that.isset(values) && that.isset(values.image) && values.image)
			bImage.click();
			
		div.fadeIn(that.fadeNumber);
	},

	generateLawRow: function(values)
	{
		var that = this;

		var fieldSelect = $('<select class="form-control" name="field" ></select>');
		$.each(that.layerColumns, function(i,v)
		{
			var selected = (that.isset(values) && values.field === v.name)? "selected" : "";
			var option = $('<option value="'+v.name+'" '+selected+'>'+v.name+'</option>');
			fieldSelect.append(option);
		});

		var delimiterSelect = $('<select class="form-control" name="delimiter" ></select>');
		$.each(that.delimiterItems, function(i,v)
		{
			var selected = (that.isset(values) && values.delimiter === v)? "selected" : "";
			var option = $('<option value="'+v+'" '+selected+'>'+v+'</option>');
			delimiterSelect.append(option);
		});

		var lawSelect = $('<select class="form-control" name="law_id" ></select>');
		$.each(that.lawslist, function(i,v)
		{
			var selected = (that.isset(values) && values.law_id === v.id)? "selected" : "";
			var option = $('<option value="'+v.id+'" '+selected+'>'+v.name+'('+v.variation+')'+'</option>');
			lawSelect.append(option);
		});

		var div = $('<div class="blocco" style="margin-top: 30px; display: none">\
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
					</div>');


		div.find(".fieldSelect").append(fieldSelect);
		div.find(".delimiterSelect").append(delimiterSelect);
		div.find(".lawSelect").append(lawSelect);
		$(".rightCol").append(div);
		div.fadeIn(that.fadeNumber);
	},
	
	generateHyperlinkRow: function(values)
	{
		var that = this;
		var fieldSelect = $('<select name="field"></select>');
		$.each(this.layerColumns, function(i,v)
		{
			var selected = (that.isset(values) && values.field === v.name)? "selected" : "";
			var option = $('<option value="'+v.name+'" '+selected+'>'+v.name+'</option>');
			fieldSelect.append(option);
		});
		
		var alInVa = (that.isset(values) && that.isset(values.text))? values.text : "";
		var textInput = $('<input type="text" name="field_text" value="'+alInVa+'">');
		var neFiVa = (that.isset(values) && that.isset(values.nuovo_field))? values.nuovo_field : "";
		var newFieldName = $('<input type="text" name="new_field_name" value="'+neFiVa+'">');
									
		var div = $('<div class="well blocco alert alert-success row" style="margin-top: 20px; display: none">\
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
					</div>');		
		
		div.find(".close").click(function(){ 
			$(this).parents(".alert").first().fadeOut(that.fadeNumber, function(){ 
				$(this).alert('close');
				$(this).remove();
			});
		});
		div.find(".fieldSelect").append(fieldSelect);
		div.find(".textInput").append(textInput);
		div.find(".newFieldName").append(newFieldName);
		
		$(".rightCol").append(div);
		div.fadeIn(this.fadeNumber);
	},
	
	onWidgetTypeChange: function(el)
	{
		var that = this;
		$("#id_body").val("");
		$(".rightCol").empty();
		switch( el.val() )
		{
			case "hyperlink":
				this.generateHyperlinkRow();
				this.onAddCallback = this.generateHyperlinkRow;
				break;
			case "search":
				this.generateGeneralParams();
				this.generateSearchRow();
				this.onAddCallback = function(){ $(".rightCol").find(".logic_operator").last().fadeIn(that.fadeNumber); that.generateSearchRow(); };
				break;
			case "tooltip":
				this.generateTooltipRow();
				this.onAddCallback = this.generateTooltipRow;
				break;
			case "law":
				this.generateLawRow();
				break;
			default:
				return;
		}
		if(el.val() != 'law')
		{
			var addDiv = $('<div class="row text-center">\
							<button type="button" class="btn btn-success addRow"><i class="glyphicon glyphicon-plus"></i> '+gettext("Add")+'</button>\
						</div>');
			addDiv.find(".addRow").click(function(){
				var div = $(this).parents("div").first();
				that.onAddCallback();
				div.appendTo($(".rightCol"));
			});
			$(".rightCol").append(addDiv);
		}

		

	},
	

	
	showStoredValues: function()
	{
		var that = this;
		$(".rightCol").empty();
		
		switch(this.widget.widget_type)
		{
			case "hyperlink":
				$.each(this.widget.body, function()
				{
					that.generateHyperlinkRow(this);
				});
				this.onAddCallback = this.generateHyperlinkRow;
				break;
			case "search":
				this.generateGeneralParams(this.widget.body);
				$.each(this.widget.body.fields, function(i)
				{
					that.generateSearchRow(this);
					if (i < that.widget.body.fields.length-1)
						$(".rightCol").find(".logic_operator").last().fadeIn(that.fadeNumber);
				});
				this.onAddCallback = function(){ $(".rightCol").find(".logic_operator").last().fadeIn(that.fadeNumber); that.generateSearchRow(); };
				break;
			case "tooltip":
				$.each(this.widget.body, function()
				{
					that.generateTooltipRow(this);
				});
				this.onAddCallback = this.generateTooltipRow;
				break;
			case "law":
				this.generateLawRow(this.widget.body);
				this.onAddCallback = this.generateLawRow;
				break;
			default:
				return;
		}
		if(this.widget.widget_type != 'law') {
			var addDiv = $('<div class="row text-center">\
							<button type="button" class="btn btn-success addRow"><i class="glyphicon glyphicon-plus"></i> Aggiungi</button>\
						</div>');

			addDiv.find(".addRow").click(function () {
				var div = $(this).parents("div").first();
				that.onAddCallback();
				div.appendTo($(".rightCol"));
			});
			$(".rightCol").append(addDiv);
		}
	},
	
	setLayerData: function(data,layer,layer_type)
	{
		this.layerColumns = data;
		this.layer = layer;
		this.layer_type = layer_type;
	},

	 init: function()
	{
		var that = this;
		this.setLayerData(ga.Qdjango.localVars['layer_columns'],ga.Qdjango.localVars['layer_name'],ga.Qdjango.localVars['layer_type']);
		this.lawslist = ga.Qdjango.localVars['laws_list']
		if (ga.Qdjango.localVars['update']){
			if (!$.isEmptyObject(ga.Qdjango.localVars['widget'])){
				this.widget = ga.Qdjango.localVars['widget'];
				this.showStoredValues();
			}
		}
		this.form = $("#widget_form");
		ga.currentForm.on('preSendForm', function(){
			$.proxy(that.onFormSubmit, that)();
		});
		ga.currentForm.setOnSuccesAction(function(){
			ga.currentModal.hide();

			// get datatable row
			var $item = ga.currentModal.data.$evoker.parents('tr').prev().find('[data-widget-type="detailItemDataTable"]');
			var $dataTable = $item.parents('[data-widget-type="dataTable"]').DataTable();
			ga.widget.showDetailItemDataTable($dataTable, $item, true);

			// get row and update widject counter
			$item.parent().next().html($item.parents('tr').next().find('tr').length - 1);
		});
		/*
		var button = this.form.find("button.confirm");
		this.form.find("button.confirm").click(function(){ 
			that.onFormSubmit(); 
		});
		*/
		$("#id_widget_type").change(function(){ that.onWidgetTypeChange($(this)); });
	}
};

// Add SingleLayer Constraint widget
// --------------------------------
_.extend(g3wadmin.widget, {

	_singlelayerConstraintsListParams: [
		'singlelayerconstraints-list-url',
		'singlelayerconstraints-layer-pk'
	],

	_singlelayerConstraintsUrls: {},

	_buildSinglelayerContraintRuleForm: function(constraint_pk, rules_list, res, type='subset',new_rule){

        var actions = {
            post: ga.Qdjango.urls.rule[type].list+constraint_pk+'/',
            put: _.isNull(res) ? '' : ga.Qdjango.urls.rule[type].detail+res['pk']+'/'
        }

        // instance ne form rule
        var form_options = {
            rulePk: _.isNull(res) ? 'new' : res['pk'],
            constraintPk: constraint_pk,
            action: _.isNull(res) ? actions.post : actions.put,
        }
        var form_rule = $(ga.tpl.constraintRule(form_options));
        var ga_form = new ga.forms.form(form_rule.find('form'));

        // populate selects user and group
        var sl_user = form_rule.find('[name="user"]');
        var sl_group = form_rule.find('[name="group"]');
        var ta_rule = form_rule.find('[name="rule"]');
        var in_pk = form_rule.find('[name="pk"]');


         // ser on success action
        ga_form.setOnSuccesAction(function(fres){
            var $ediv = form_rule.find('.form-errors');
            $ediv.html('');
            var $saved_msg = $('<h4 class="badge bg-green">'+gettext('Saved')+'</h4>');
            $ediv.append($saved_msg);
            $saved_msg.fadeOut(1200);


            // transform in a update mode, update pk put value and action
            if(_.isNull(res)){
                ga_form.setAction(ga.Qdjango.urls.rule[type].detail+fres['pk']+'/');
                in_pk.val(fres['pk']);
            }
        });

         // set error form action
        ga_form.setOnErrorAction(function(xhr, msg){
            var err_data = xhr.responseJSON['error'];
            var $ediv = form_rule.find('.form-errors');
            $ediv.html('');
            $ediv.append('<h4 class="badge bg-red">'+err_data['message']+'</h4>');

            // add field errors message:
            if (!_.isUndefined(err_data['data']['non_field_errors'])){
                for (n in err_data['data']['non_field_errors']) {
                    $ediv.append('<br /><span>'+err_data['data']['non_field_errors'][n]+'</span>');
                }
            }

        });


        // populate rule
        if (!_.isNull(res)){
            ta_rule.val(res['rule']);
        }

        $.each(ga.Qdjango.data.viewers, function (k,v){
            v['selected'] = (!_.isNull(res) && res['user']==v['pk']) ? 'selected="selected"' : '';
            sl_user.append(_.template('<option value="<%= pk %>" <%= selected %>><%= first_name %> <%= last_name %>(<%= username %>)</option>')(v));
        });

        $.each(ga.Qdjango.data.group_viewers, function (k,v){
            v['selected'] = (!_.isNull(res) && res['group']==v['pk']) ? 'selected="selected"' : '';
            sl_group.append(_.template('<option value="<%= pk %>" <%= selected %>><%= name %></option>')(v));
        });



        rules_list.append(form_rule);

        // action for delete btn
        var bt_rule_delete = form_rule.find('.bt-rule-delete');
        bt_rule_delete.on('click', function(e){
            var $self = $(this).parents('.rule-form');
            if(_.isNull(res) && form_rule.find('[name="pk"]').val() == 'new'){
                $self.remove();
            } else {
                $.ajax({
                    method: 'delete',
                    url: ga.Qdjango.urls.rule[type].detail+form_rule.find('[name="pk"]').val()+'/',
                    success: function (res) {
                        $self.remove();
                    },
                    error: function (xhr, textStatus, errorMessage) {

                    }
                });
            }


        });

        // action for save btn
        var bt_rule_save = form_rule.find('.bt-rule-save');
        bt_rule_save.on('click', function(e){
            if(_.isNull(res) && form_rule.find('[name="pk"]').val() == 'new'){
                ga_form.sendData();
            } else {
                ga_form.sendData(e, 'put');
            }
        });


    },

	_singlelayerConstraintForm: function($item, res, params){

        // set urls

        form_action = (params['new']) ? ga.Qdjango.urls.constraint.list : ga.Qdjango.urls.constraint.detail+res['pk']+'/'


        // open modal to show list of add links
        modal_options = {
            'layerId': params['layer_pk'],
            'action': form_action
        };
        var modal = ga.currentModal = ga.ui.buildDefaultModal({
            modalTitle: ((_.isUndefined(params['modal-title']) ? gettext('Form title') : params['modal-title'])),
            modalBody: ga.tpl.singlelayerConstraintForm(modal_options),
            modalSize: (_.isUndefined(params['modal-size']) ? '' : params['modal-size'])
        });

        modal.data.$evoker = $item;

        // parent_click based on new or update
        if (params['new']){
            var $item = params['parent_click'].parents('tr').prev().find('[data-widget-type="singlelayerConstraintsList"]');
        } else {
            var $item = $(params['parent_click'].parents('table')[0]).parents('tr').prev().find('[data-widget-type="singlelayerConstraintsList"]');
        }


        // set action for confirm btn
        var form = new ga.forms.form(modal.$modal.find('form'));
        var that = this;
        form.setOnSuccesAction(function(e){
            that._refreshSinglelayerConstraintList($item)();
            modal.hide();
        });
        modal.setConfirmButtonAction(function(e){
            form.sendData(e, params['new'] ? 'post' : 'put');
        });

        modal.show();

        // populate form in update
		if (!params['new']){
			$.each(res, function(key, val) {
				modal.$modal.find('[name=' + key + ']').val(val);
			});
		}
    },

	_singlelayerConstraintRulesForm: function($item, res, params){
        /**
         * Build form for constraint subset rules CRUD
         */

        var that = this;

        // switch intro by type
		switch (params['type']) {
			case 'expression':
				var intro = gettext('Define, for each user and/or group of users, viewing/editing rules based on the QGIS expressions.')
			break;

			case 'subset':
				var intro = gettext('Define, for each user and/or group of users, viewing/editing rules based on the language or SQL dialect of the associated provider.')
			break;
		}

        // build moodal
        var modal_options = {
			'intro': intro,
        };
        var modal = ga.ui.buildDefaultModal({
            modalTitle: params['modal-title'],
            modalBody: ga.tpl.singlelayerConstraintRules(modal_options),
            modalSize: 'modal-lg',
            confirmButton: false
        });

        // set action con close modal refresh constraints list
        var $item = $(params['parent_click'].parents('table')[0]).parents('tr').prev().find('[data-widget-type="singlelayerConstraintsList"]')
        modal.$modal.on('hidden.bs.modal',this._refreshSinglelayerConstraintList($item));

        // get viewers and users groups viewers for layer
        ga.Qdjango.data.viewers = [];
        ga.Qdjango.data.group_viewers = [];

        $.ajaxSetup({async:false});
        $.getJSON(ga.Qdjango.urls.layer.user+params['layer_pk']+"/", function( data ) {
            ga.Qdjango.data.viewers = data['results'];
        });

        $.getJSON(ga.Qdjango.urls.layer.authgroup+params['layer_pk']+"/", function( data ) {
            ga.Qdjango.data.group_viewers = data['results'];
        });
        $.ajaxSetup({async:true});

        // get current rules
        var current_rules = [];
        var jqxhr = $.getJSON(ga.Qdjango.urls.rule[params['type']].list+params['constraint_pk']+"/", function( data ) {
            ga.Qdjango.data.current_rules = data['results'];
        }).done(function(){
            $.each(ga.Qdjango.data.current_rules, function (k, v){
                that._buildSinglelayerContraintRuleForm(params['constraint_pk'], rules_list, v, params['type'],false);
            });
        });


        // rule list section
        var rules_list =  modal.$modal.find('.rules-list');

        // rule actions for new rule
        var $bt_add_rule = modal.$modal.find('.add-rule');
        $bt_add_rule.on('click', function(e){
            that._buildSinglelayerContraintRuleForm(params['constraint_pk'], rules_list, null, params['type'],true);
        });


        modal.show();
    },

	_refreshSinglelayerConstraintList: function($item){
        /**
         * Refresh tr main table layer contraints list
         */
        return function(){;
            var $datatable = $item.parents('table').DataTable();
            ga.widget.singlelayerConstraintsList($datatable, $item, true);
        };
    },

	 /*
    Build singlelayer constraints table
     */
    _singlelayerConstraintsTable: function(layer_pk, res){
        var $div = $('<div style="margin-left:40px;">');

        // add new constraint btn
        $newConstraint = $('<a href="#" class="btn btn-sm btn-default"><i class="ion ion-plus-circled"></i> '+gettext('New alphanumeric constraints')+'</a>');
        $newConstraint.on('click', function(){
            ga.widget._singlelayerConstraintForm($newConstraint, null,
                {
                    'modal-title': gettext('New alphanumeric constraints'),
                    'layer_pk': layer_pk,
                    'new': true,
                    'parent_click': $(this)
                });
        });
        $div.append($newConstraint);

        // add table contraints saved
        var $table = $('<table class="table">');
        var $tbody = $table.append($('<tbody>'));
        $table.append('<thead>\n' +
            '            <tr>\n' +
            '                <th style="width:180px;">'+gettext('Actions')+'</th>\n' +
            '                <th>'+gettext('Name')+'</th>\n' +
			'                <th>'+gettext('Description')+'</th>\n' +
			'                <th>'+gettext('Subset rules count')+'</th>\n' +
            '                <th>'+gettext('Expression rules count')+'</th>\n' +
            '            </tr>\n' +
            '        </thead>');

        // add constraints
        var constraint_res = {};
        $.each(res['results'], function(k, v){
            constraint_res[v['pk']] = v;
            var editDisplay = v['rule_count'] > 0 ? 'none': 'display';
            $tbody.append('<tr id="singlelayerconstraint-item-'+v['pk']+'">\n' +
            '                <td>'+ga.tpl.singlelayerConstraintActions({
                    'layerId': layer_pk,
                    'constraintPk': v['pk'],
                    'editDisplay': editDisplay,
					'expressionIcon': ga.ui.expression_svg
            })+'</td>\n' +
            '                <td>'+v['name']+'</td>\n' +
			'                <td>'+v['description']+'</td>\n' +
            '                <td>'+v['subset_rule_count']+'</td>\n' +
			'                <td>'+v['expression_rule_count']+'</td>\n' +
            '            </tr>\n');
        });

        // add actions to elements action
        $tbody.find('[data-singlelayerconstraint-action-mode="update"]').on('click', function(e){
            ga.widget._singlelayerConstraintForm($newConstraint, constraint_res[$(this).attr('data-singlelayerconstraint-pk')],
                {
                    'modal-title': gettext('Update alphanumeric constraint'),
                    'layer_pk': layer_pk,
                    //'constraint_pk': $(this).attr('data-contraint-pk'),
                    'new': false,
                    'parent_click': $(this)
                });
        });

        $tbody.find('[data-singlelayerconstraint-action-mode="subset_rules"]').on('click', function(e){
            ga.widget._singlelayerConstraintRulesForm($newConstraint, null,
                {
                    'modal-title': gettext('Constraint Rules based on provider\'s language / SQL dialect'),
					'type': 'subset',
                    'constraint_pk': $(this).attr('data-singlelayerconstraint-pk'),
                    'layer_pk': layer_pk,
                    'parent_click': $(this)
                });
        });

        $tbody.find('[data-singlelayerconstraint-action-mode="expression_rules"]').on('click', function(e){
            ga.widget._singlelayerConstraintRulesForm($newConstraint, null,
                {
                    'modal-title': gettext('Constraint Rules based on QGIS Expression'),
					'type': 'expression',
                    'constraint_pk': $(this).attr('data-singlelayerconstraint-pk'),
                    'layer_pk': layer_pk,
                    'parent_click': $(this)
                });
        });

        $div.append($table);


        return $div;
    },

	 singlelayerConstraintsList: function($datatable, $item, refresh){

        try {

            var params = ga.utils.getDataAttrs($item, this._singlelayerConstraintsListParams);
            if (_.isUndefined(params['singlelayerconstraints-list-url'])) {
                throw new Error('Attribute data-singlelayerconstraints-list-url not defined');
            }

            // get tr row parent
            refresh = _.isUndefined(refresh) ? false : true;

            var tr = $item.closest('tr');
            var row = $datatable.row(tr);
            var idx = $.inArray( tr.attr('id'), [] );

            var getDetail = function(){
                $.ajax({
                     method: 'get',
                     url: params['singlelayerconstraints-list-url'],
                     success: function (res) {
                        row.child(g3wadmin.widget._singlelayerConstraintsTable(params['singlelayerconstraints-layer-pk'],res)).show();
                     },
                     complete: function(){
                         var status = arguments[1];
                         if (status == 'success') {
                            ga.ui.initRadioCheckbox(row.child());
                         }
                     },
                     error: function (xhr, textStatus, errorMessage) {
                         ga.widget.showError(ga.utils.buildAjaxErrorMessage(xhr.status, errorMessage));
                     }
                });
            }

            if (refresh){
                getDetail();
            } else {
                if ( row.child.isShown() ) {
                    tr.removeClass( 'details' );
                    row.child.hide();
                } else {
                    tr.addClass( 'details' );

                    // ajax call to get detail data
                    getDetail();
                }
            }



        } catch (e) {
            this.showError(e.message);
        }
    }
});

_.extend(g3wadmin.tpl, {

	singlelayerConstraintRules: _.template('\
		<div class="intro" style="margin-bottom: 20px;"><%= intro %></div>\
        <div class="row">\
            <div class="col-md-12 rules-list">\
            </div>\
        </div>\
        <div class="row">\
            <div class="col-md-12">\
                <div class="row text-center">\
                    <div class="col-md-12">\
                        <button type="button" class="btn btn-success add-rule"><i class="glyphicon glyphicon-plus"></i> '+gettext('Add')+'</button>\
                    </div>\
                </div>\
            </div>\
        </div>\
    '),

    singlelayerConstraintRule: _.template('\
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
                    <a href="#" class="bt-rule-save" data-toggle="tooltip" data-placement="top" title="'+gettext('Save')+'"><i class="fa fa-save"></i></a>\
                </span>\
                <span class="col-xs-2 icon">\
                    <a href="#" class="bt-rule-delete" data-toggle="tooltip" data-placement="top" title="'+gettext('Delete')+'"><i class="ion ion-trash-b"></i></a>\
                </span>\
            </div>\
        </div>\
    </div>\
    '),


	singlelayerConstraintForm: _.template('\
        <form action="<%= action %>" id="form-singlelayerconstraint-<%= layerId %>">\
            <input type="hidden" name="layer" value="<%= layerId %>" />\
            <input type="hidden" name="active" value="1" />\
            <div class="row">\
				<div class="col-md-12">\
					<div class="info"><h4>'+gettext('Set a name and a possible description for the alphanumeric constraint')+':</h4></div>\
					<div class="form-group">\
						<label class="control-label ">'+gettext('Name')+'</label>\
						<div class="controls ">\
							<input class="form-control" name="name" style="width:100%;"></input>\
						</div>\
					</div>\
					<div class="form-group">\
						<label class="control-label ">'+gettext('Description')+'</label>\
						<div class="controls ">\
							<textarea class="form-control" name="description" style="width:100%;"></textarea>\
						</div>\
					</div>\
				</div>\
			</div>\
        </form>'
	),

	singlelayerConstraintActions: _.template('\
		<span class="col-xs-2 icon">\
			<a href="#" data-toggle="tooltip" data-placement="top" title="'+gettext("Provider's language / SQL dialect Rules")+'" data-singlelayerconstraint-action-mode="subset_rules" data-singlelayerconstraint-pk="<%= constraintPk %>"><i style="color: purple;" class="fa fa-cubes"></i></a>\
		</span>\
		<span class="col-xs-2 icon">\
			<a href="#" data-toggle="tooltip" data-placement="top" title="'+gettext("QGIS Expression Rules")+'" data-singlelayerconstraint-action-mode="expression_rules" data-singlelayerconstraint-pk="<%= constraintPk %>"><%= expressionIcon %></a>\
		</span>\
		<span class="col-xs-2 icon" style="display:<%= editDisplay %>">\
			<a href="#" data-singlelayerconstraint-action-mode="update" data-singlelayerconstraint-pk="<%= constraintPk %>" data-singlelayerconstraint-layer-id="<%= layerId %>"><i class="ion ion-edit"></i></a>\
		</span>\
		<span class="col-xs-2 icon">\
			<a href="#" \
			data-widget-type="deleteItem" \
			data-delete-url="/'+SITE_PREFIX_URL+'qdjango/api/constraint/detail/<%= constraintPk %>/"\
			data-item-selector="#singlelayerconstraint-item-<%= constraintPk %>"\
			data-delete-method="delete"\
			><i class="ion ion-trash-b"></i></a>\
		</span>\
    '),
});

// activate widget
$(document).ready(function() {
    $('[data-widget-type="singlelayerConstraintsList"]').on('click', function (e) {
        var $datatable = $(this).parents('table').DataTable();
        ga.widget.singlelayerConstraintsList($datatable, $(this));
    });
});
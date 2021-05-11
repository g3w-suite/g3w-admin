/**
 * Created  Walter Lorenzetti on 2020
 */

if (FRONTEND){
    var ADMIN_URL_PATH = 'admin/';
} else {
    var ADMIN_URL_PATH = '';
}

ga.Qplotly = {
    urls: {
        widget: {
            list: '/' + SITE_PREFIX_URL + 'qplotly/api/widget/layer/',
            detail: '/' + SITE_PREFIX_URL + 'qplotly/api/widget/detail/',
            link: '/' + SITE_PREFIX_URL + 'qplotly/api/widget/detail/',
            download: '/' + SITE_PREFIX_URL + ADMIN_URL_PATH +'qplotly/download/xml/',
            showonstartclient: '/' + SITE_PREFIX_URL + ADMIN_URL_PATH + 'qplotly/download/xml/',
        }
    }
};

// Add Qplotly widget
// --------------------------------

_.extend(g3wadmin.ui, {

   initShowOnStartClient: function() {
        $(document).on('ifChecked', '[data-widget-type="showOnStartClient"]', function(e){
            ga.widget.showOnStartClient($(this));
        }).on('ifUnchecked', '[data-widget-type="showOnStartClient"]', function(e){
            ga.widget.showOnStartClient($(this), false);
        });
    },

});

_.extend(g3wadmin.widget, {

    // params used into html tag
    _qplotlyWidgetListParams: [
		'qplotlywidget-list-url',
		'qplotlywidget-layer-pk',
        'qplotlywidget-project-pk',
	],

    _showOnStartClient: [
        'ajax-url',
    ],

    showOnStartClient: function($item, linked) {

        try {
            var params = ga.utils.getDataAttrs($item, this._showOnStartClient);
            if (_.isUndefined(params['ajax-url'])) {
                throw new Error('Attribute data-ajax-url not defined');
            }

            var data = {};
            if (!_.isUndefined(linked) && !linked) {
                data['show'] = '0';
            }

            $.ajax({
                method: 'get',
                url: params['ajax-url'],
                data: data,
                success: function(res){

                },
                error: function (xhr, textStatus, errorMessage) {
                    ga.widget.showError(ga.utils.buildAjaxErrorMessage(xhr.status, errorMessage));
                }
            });


        } catch (e) {
            this.showError(e.message);
        }
    },


    /*
    Build singlelayer constraints table
     */
    _qplotlyWidgetTable: function(layer_pk, project_pk, res){
        var $div = $('<div style="margin-left:40px;">');

        // add new constraint btn
        $newConstraint = $('<a href="#" class="btn btn-sm btn-default"><i class="ion ion-plus-circled"></i> '+gettext('New qplotly widget')+'</a>');
        $newConstraint.on('click', function(){
            ga.widget._qplotlyWidgetForm($newConstraint, null,
                {
                    'modal-title': gettext('New qplotly widget'),
                    'layer_pk': layer_pk,
                    'project_pk': project_pk,
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
            '                <th>'+gettext('Active on startup')+'</th>\n' +
            '                <th>'+gettext('Title')+'</th>\n' +
			'                <th>'+gettext('Type')+'</th>\n' +
            '                <th>'+gettext('From project')+'</th>\n' +
			'                <th>'+gettext('Linked')+'</th>\n' +
            '            </tr>\n' +
            '        </thead>');

        // add constraints
        var constraint_res = {};
        $.each(res['results'], function(k, v){
            constraint_res[v['pk']] = v;
            var show_on_start_client_checked = (v['show_on_start_client']) ? "checked=\"checked\"" : "";
            var checked = ($.inArray(parseInt(layer_pk), v['layers']) != -1) ? "checked=\"checked\"" : "";
            var editDisplay = v['rule_count'] > 0 ? 'none': 'display';
            var from_project = v['project'] ? "<span class=\"fa fa-check-circle\" style=\"color: #ffa500\"></span>" : "";
            $tbody.append('<tr id="qplotlywidget-item-'+v['pk']+'">\n' +
            '                <td>'+ga.tpl.qplotlyWidgetActions({
                    'layerId': layer_pk,
                    'projectPk': project_pk,
                    'widgetPk': v['pk'],
                    'titleUpdate': gettext('Edit'),
                    'titleDelete': gettext('Delete'),
                    'titleDownload': gettext('Download'),
                    'editDisplay': editDisplay,
                    'downloadUrl': '/' + CURRENT_LANGUAGE_CODE + ga.Qplotly.urls.widget.download + v['pk'] + '/'
            })+'</td>\n' +
            '                <td><input type="checkbox" name="show_on_start_client" value="1" '+show_on_start_client_checked+' ' +
                            'data-widget-type="showOnStartClient" ' +
                            'data-ajax-url="/'+CURRENT_LANGUAGE_CODE+'/'+SITE_PREFIX_URL + ADMIN_URL_PATH +'qplotly/showonstartclient/'+v['pk']+'/" /></td>\n' +
            '                <td>'+v['title']+'</td>\n' +
			'                <td>'+v['type']+'</td>\n' +
            '                <td>'+from_project+'</td>\n' +
            '                <td><input type="checkbox" name="linked" value="1" '+checked+' ' +
                            'data-widget-type="linkWidget2Layer" ' +
                            'data-ajax-url="/'+CURRENT_LANGUAGE_CODE+'/'+SITE_PREFIX_URL + ADMIN_URL_PATH +'qplotly/layer/'+layer_pk+'/widgets/link/'+v['pk']+'/" /></td>\n' +
            '            </tr>\n');
        });

        // add actions to elements action
        $tbody.find('[data-qplotlywidget-action-mode="update"]').on('click', function(e){
            ga.widget._qplotlyWidgetForm($newConstraint, constraint_res[$(this).attr('data-qplotlywidget-pk')],
                {
                    'modal-title': gettext('Update widget'),
                    'layer_pk': layer_pk,
                    'project_pk': project_pk,
                    //'constraint_pk': $(this).attr('data-contraint-pk'),
                    'new': false,
                    'parent_click': $(this)
                });
        });


        $div.append($table);


        return $div;
    },

    _refreshQplotlyWidgetList: function($item){
        /**
         * Refresh tr main table layer qplotly widget list
         */
        return function(){;
            var $datatable = $item.parents('table').DataTable();
            ga.widget.qplotlyWidgetList($datatable, $item, true);
        };
    },

    //function to read and set input[name="xml"] value
    _readQplotlyXmlFile: function(evt){
        const reader = new FileReader();
        const file = evt.target.files[0];
        const filename = file.name;
        reader.onload = (evt) => {
            const data = evt.target.result;
            $('input[name="xml"]').val(data);
            $('#xml_plot_filename').text(filename).show();
        };
        reader.readAsText(file);
    },

    _qplotlyWidgetForm: function($item, res, params){

        // set urls

        form_action = (params['new']) ? ga.Qplotly.urls.widget.list+params['layer_pk']+'/' : ga.Qplotly.urls.widget.detail+params['project_pk']+'/'+res['pk']+'/'


        // open modal to show list of add links
        modal_options = {
            'layerId': params['layer_pk'],
            'action': form_action
        };
        var modal = ga.currentModal = ga.ui.buildDefaultModal({
            modalTitle: ((_.isUndefined(params['modal-title']) ? gettext('Form title') : params['modal-title'])),
            modalBody: ga.tpl.qplotlyWidgetForm(modal_options),
            modalSize: (_.isUndefined(params['modal-size']) ? '' : params['modal-size'])
        });

        modal.data.$evoker = $item;

        // parent_click based on new or update
        if (params['new']){
            var $item = params['parent_click'].parents('tr').prev().find('[data-widget-type="qplotlyWidgetList"]');
        } else {
            var $item = $(params['parent_click'].parents('table')[0]).parents('tr').prev().find('[data-widget-type="qplotlyWidgetList"]');
        }


        // set action for confirm btn
        var form = new ga.forms.form(modal.$modal.find('form'));
        var input_xml_plot = $(form.$form[0]).find('#load_xml_plot');
        $(input_xml_plot).on('change', ga.widget._readQplotlyXmlFile);
        var that = this;
        form.setOnSuccesAction(function(e){
            that._refreshQplotlyWidgetList($item)();
            modal.hide();
        });

        // set error form action
        form.setOnErrorAction(function(xhr, msg){
            var err_data = xhr.responseJSON['error'];
            var $ediv = $(form.$form[0]).find('.form-errors');
            $ediv.html('');
            $ediv.append('<h4 class="badge bg-red">'+err_data['message']+'</h4>');

            // add field errors message:
            if (!_.isUndefined(err_data['data']['non_field_errors'])){
                for (n in err_data['data']['non_field_errors']) {
                    $ediv.append('<br /><span>'+err_data['data']['non_field_errors'][n]+'</span>');
                }
            }

        });

        modal.setConfirmButtonAction(function(e){
            var dt = form.getData('array');

            dt['layers'] = [params['layer_pk']];

            form.sendData(e, params['new'] ? 'post' : 'put', JSON.stringify(dt), 'application/json; charset=UTF-8');
        });

        modal.show();

        // populate form in update
		if (!params['new']){
			$.each(res, function(key, val) {
				modal.$modal.find('[name=' + key + ']').val(val);
			});
		}
    },

    qplotlyWidgetList: function($datatable, $item, refresh){

        try {

            var params = ga.utils.getDataAttrs($item, this._qplotlyWidgetListParams);
            if (_.isUndefined(params['qplotlywidget-list-url'])) {
                throw new Error('Attribute data-qplotlywidget-list-url not defined');
            }
            // get tr row parent
            refresh = _.isUndefined(refresh) ? false : true;

            var tr = $item.closest('tr');
            var row = $datatable.row(tr);
            var idx = $.inArray( tr.attr('id'), [] );

            var getDetail = function(){
                $.ajax({
                     method: 'get',
                     url: params['qplotlywidget-list-url'],
                     success: function (res) {
                        row.child(g3wadmin.widget._qplotlyWidgetTable(
                            params['qplotlywidget-layer-pk'], params['qplotlywidget-project-pk'],res)).show();

                     },
                     complete: function(){
                         var status = arguments[1];
                         if (status == 'success') {
                            ga.ui.initRadioCheckbox(row.child());
                            $(row.child()).on('ifChecked', '[data-widget-type="linkWidget2Layer"]', function(e){
                                ga.widget.linkWidget2Layer($(this));
                            }).on('ifUnchecked', '[data-widget-type="linkWidget2Layer"]', function(e){
                                ga.widget.linkWidget2Layer($(this), false);
                            });
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

    qplotlyWidgetForm: _.template('\
        <form action="<%= action %>" id="form-qplotlywidget-<%= layerId %>">\
            <div class="form-errors"></div>\
            <input type="hidden" name="xml" value="" />\
            <div class="row">\
				<div class="col-md-12">\
					<div class="form-group" style="border: 1px dot-dash grey;  text-align: center">\
						<div class="controls qq-upload-button-selector" style="position: relative; padding: 10px;">\
							<input class="form-control" id="load_xml_plot" accept=".xml" title="" name="xml_file" type="file" style="top:0; left:0; cursor:pointer;opacity:0; width:100%; position:absolute; height: 100%;" />\
							<h4>'+gettext('Upload DataPlotly configuration xml file')+'</h4>\
							<div>\
                                <i class="fa fa-upload fa-3x"  aria-hidden="true"></i>\
                            </div>\
						</div>\
						<span id="xml_plot_filename" style="display: none;"></span>\
					</div>\
				</div>\
			</div>\
        </form>'
	),

    qplotlyWidgetActions: _.template('\
		<span class="col-xs-2 icon" style="display:<%= editDisplay %>">\
			<a href="#" data-toggle="tooltip" title="<%= titleUpdate %>" data-qplotlywidget-action-mode="update" data-qplotlywidget-pk="<%= widgetPk %>" data-qplotlywidget-layer-id="<%= layerId %>"><i class="ion ion-edit"></i></a>\
		</span>\
		<span class="col-xs-2 icon">\
			<a href="#" \
			data-toggle="tooltip" \
			title="<%= titleDelete %>" \
			data-widget-type="deleteItem" \
			data-delete-url="'+ga.Qplotly.urls.widget.detail+'<%= projectPk %>/<%= widgetPk %>/"\
			data-item-selector="#qplotlywidget-item-<%= widgetPk %>"\
			data-delete-method="delete"\
			><i class="ion ion-trash-b"></i></a>\
		</span>\
		<span class="col-xs-2 icon" style="display:<%= editDisplay %>">\
			<a href="<%= downloadUrl %>" \
            data-toggle="tooltip" \
			title="<%= titleDownload %>" ><i class="ion ion-code-download"></i></a>\
		</span>\
    '),
});


// activate widget: append to ga.ui.before_datatable_callbacks for to cala it before DatTable init
ga.ui.before_datatable_callbacks.push(function($widgetItem){
  $widgetItem.find('[data-widget-type="qplotlyWidgetList"]').on('click', function (e) {
        var $datatable = $(this).parents('table').DataTable();
        ga.widget.qplotlyWidgetList($datatable, $(this));
        ga.ui.initShowOnStartClient();
    });
});
/**
 * Created  Walter Lorenzetti on 2020
 */



ga.Qplotly = {
    urls: {
        widget: {
            list: '/' + SITE_PREFIX_URL + 'qplotly/api/widget/layer/',
            detail: '/' + SITE_PREFIX_URL + 'qplotly/api/widget/detail/',
        }
    }
};

// Add Qplotly widget
// --------------------------------
_.extend(g3wadmin.widget, {

    // params used into html tag
    _qplotlyWidgetListParams: [
		'qplotlywidget-list-url',
		'qplotlywidget-layer-pk'
	],

    /*
    Build singlelayer constraints table
     */
    _qplotlyWidgetTable: function(layer_pk, res){
        var $div = $('<div style="margin-left:40px;">');

        // add new constraint btn
        $newConstraint = $('<a href="#" class="btn btn-sm btn-default"><i class="ion ion-plus-circled"></i> '+gettext('New qplotly widget')+'</a>');
        $newConstraint.on('click', function(){
            ga.widget._qplotlyWidgetForm($newConstraint, null,
                {
                    'modal-title': gettext('New qplotly widget'),
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
            '                <th>'+gettext('Title')+'</th>\n' +
			'                <th>'+gettext('Type')+'</th>\n' +
			'                <th>'+gettext('Linked')+'</th>\n' +
            '            </tr>\n' +
            '        </thead>');

        // add constraints
        var constraint_res = {};
        $.each(res['results'], function(k, v){
            constraint_res[v['pk']] = v;
            var editDisplay = v['rule_count'] > 0 ? 'none': 'display';
            $tbody.append('<tr id="qplotlywidget-item-'+v['pk']+'">\n' +
            '                <td>'+ga.tpl.qplotlyWidgetActions({
                    'layerId': layer_pk,
                    'widgetPk': v['pk'],
                    'editDisplay': editDisplay
            })+'</td>\n' +
            '                <td>'+v['title']+'</td>\n' +
			'                <td>'+v['type']+'</td>\n' +
            '                <td>'+v['linked']+'</td>\n' +
            '            </tr>\n');
        });

        // add actions to elements action
        $tbody.find('[data-qplotlywidget-action-mode="update"]').on('click', function(e){
            ga.widget._qplotlyWidgetForm($newConstraint, constraint_res[$(this).attr('data-qplotlywidget-pk')],
                {
                    'modal-title': gettext('Update widget'),
                    'layer_pk': layer_pk,
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

    _qplotlyWidgetForm: function($item, res, params){

        // set urls

        form_action = (params['new']) ? ga.Qplotly.urls.widget.list : ga.Qplotly.urls.widget.detail+res['pk']+'/'


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
        var that = this;
        form.setOnSuccesAction(function(e){
            that._refreshQplotlyWidgetList($item)();
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
                        row.child(g3wadmin.widget._qplotlyWidgetTable(params['qplotlywidget-layer-pk'],res)).show();
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

    qplotlyWidgetForm: _.template('\
        <form action="<%= action %>" id="form-qplotlywidget-<%= layerId %>">\
            <input type="hidden" name="layer" value="<%= layerId %>" />\
            <input type="hidden" name="xml" value="" />\
            <div class="row">\
				<div class="col-md-12">\
					<div class="info"><h4>'+gettext('Upload DataPlotly configuration xml file.')+':</h4></div>\
					<div class="form-group" style="border: 1px dot-dash grey;  text-align: center">\
						<div class="controls">\
							<input class="form-control" name="xml_file" type="file" style="opacity:0; width:100%; position:absolute; height: 100%;" />\
							<h4>'+gettext('Upload or drag and drop file.')+'</h4>\
							<div>\
                                <i class="fa fa-cloud-upload fa-5x"  aria-hidden="true"></i>\
                            </div>\
						</div>\
					</div>\
				</div>\
			</div>\
        </form>'
	),

    qplotlyWidgetActions: _.template('\
		<span class="col-xs-2 icon" style="display:<%= editDisplay %>">\
			<a href="#" data-qplotlywidget-action-mode="update" data-qplotlywidget-pk="<%= widgetPk %>" data-qplotlywidget-layer-id="<%= layerId %>"><i class="ion ion-edit"></i></a>\
		</span>\
		<span class="col-xs-2 icon">\
			<a href="#" \
			data-widget-type="deleteItem" \
			data-delete-url="/'+ga.Qplotly.urls.widget.detail+'<%= widgetPk %>/"\
			data-item-selector="#qplotlywidget-item-<%= widgetPk %>"\
			data-delete-method="delete"\
			><i class="ion ion-trash-b"></i></a>\
		</span>\
    '),
});

// activate widget
$(document).ready(function() {
    $('[data-widget-type="qplotlyWidgetList"]').on('click', function (e) {
        var $datatable = $(this).parents('table').DataTable();
        ga.widget.qplotlyWidgetList($datatable, $(this));
    });
});
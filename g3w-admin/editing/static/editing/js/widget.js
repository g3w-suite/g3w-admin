/**
 * Created by Walter Lorenzetti on 18/02/16.
 *
 * .. note:: This program is free software; you can redistribute it and/or modify
 * it under the terms of the Mozilla Public License 2.0.
 */

g3wadmin.editing = {
    urls: {
        constraint: {
            list: '/' + SITE_PREFIX_URL + 'vector/api/constraint/',
            detail: '/' + SITE_PREFIX_URL + 'vector/api/constraint/detail/',
        },
        layer: {
            info: '/' + SITE_PREFIX_URL + 'vector/api/info/layer/',
            user: '/' + SITE_PREFIX_URL + 'vector/api/info/layer/user/',
            authgroup: '/' + SITE_PREFIX_URL + 'vector/api/info/layer/authgroup/'
        },
        rule: {
            list: '/' + SITE_PREFIX_URL + 'vector/api/rule/constraint/',
            detail: '/' + SITE_PREFIX_URL + 'vector/api/rule/detail/'
        }
    },
    data: {
        viewers: [],
        group_viewers: [],
        current_rules: []
    }


};
_.extend(g3wadmin.tpl, {

    constraintRules: _.template('\
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

    constraintRule: _.template('\
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

    constraintForm: _.template('\
        <form action="<%= action %>" id="form-constraint-<%= editingLayerId %>">\
            <input type="hidden" name="editing_layer" value="<%= editingLayerId %>" />\
            <input type="hidden" name="active" value="1" />\
            <div class="info"><h4>'+gettext('Select the constraint layer, only Polygon or MultiPolygon geomentry')+':</h4></div>\
            <div class="controls">\
                <label>'+gettext('Constraint layer')+'</label>\
                <select name="constraint_layer" class="select form-control"></select>\
            </div>\
        </form>'
    ),

    constraintActions: _.template('\
    <span class="col-xs-2 icon">\
        <a href="#" data-toggle="tooltip" data-placement="top" title="Rules" data-constraint-action-mode="rules" data-constraint-pk="<%= constraintPk %>"><i class="fa fa-cubes"></i></a>\
    </span>\
    <span class="col-xs-2 icon" style="display:<%= editDisplay %>">\
        <a href="#" data-constraint-action-mode="update" data-constraint-pk="<%= constraintPk %>" data-constraint-editing-layer-id="<%= editingLayerId %>"><i class="ion ion-edit"></i></a>\
    </span>\
    <span class="col-xs-2 icon">\
        <a href="#" \
        data-widget-type="deleteItem" \
        data-delete-url="/'+SITE_PREFIX_URL+'vector/api/constraint/detail/<%= constraintPk %>/"\
        data-item-selector="#constraint-item-<%= constraintPk %>"\
        data-delete-method="delete"\
        ><i class="ion ion-trash-b"></i></a>\
    </span>\
    '),
});


_.extend(g3wadmin.widget, {

    _constrantsListParams: [
        'constraints-list-url',
        'constraints-layer-pk'
    ],

    _constraintsUrls: {},

    _buildContraintRuleForm: function(constraint_pk, rules_list, res, new_rule){

        var actions = {
            post: ga.editing.urls.rule.list+constraint_pk+'/',
            put: _.isNull(res) ? '' : ga.editing.urls.rule.detail+res['pk']+'/'
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
                ga_form.setAction(ga.editing.urls.rule.detail+fres['pk']+'/');
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

        $.each(ga.editing.data.viewers, function (k,v){
            v['selected'] = (!_.isNull(res) && res['user']==v['pk']) ? 'selected="selected"' : '';
            sl_user.append(_.template('<option value="<%= pk %>" <%= selected %>><%= first_name %> <%= last_name %>(<%= username %>)</option>')(v));
        });

        $.each(ga.editing.data.group_viewers, function (k,v){
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
                    url: ga.editing.urls.rule.detail+form_rule.find('[name="pk"]').val()+'/',
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

    _refreshConstraintList: function($item){
        /**
         * Refresh tr main table layer contraints list
         */
        return function(){;
            var $datatable = $item.parents('table').DataTable();
            ga.widget.constraintsList($datatable, $item, true);
        };
    },

    _constraintRulesForm: function($item, res, params){
        /**
         * Build form for constraint rules CRUD
         */

        var that = this;

        // build moodal
        var modal_options = {

        };
        var modal = ga.ui.buildDefaultModal({
            modalTitle: params['modal-title'],
            modalBody: ga.tpl.constraintRules(modal_options),
            modalSize: 'modal-lg',
            confirmButton: false
        });

        // set action con close modal refresh constraints list
        var $item = $(params['parent_click'].parents('table')[0]).parents('tr').prev().find('[data-widget-type="constraintsList"]')
        //modal.setCloseButtonAction(this._refreshConstraintList($item));
        modal.$modal.on('hidden.bs.modal',this._refreshConstraintList($item));

        // get viewers and users groups viewers for layer
        ga.editing.data.viewers = [];
        ga.editing.data.group_viewers = [];

        $.ajaxSetup({async:false});
        $.getJSON(ga.editing.urls.layer.user+params['layer_pk']+"/", function( data ) {
            ga.editing.data.viewers = data['results'];
        });

        $.getJSON(ga.editing.urls.layer.authgroup+params['layer_pk']+"/", function( data ) {
            ga.editing.data.group_viewers = data['results'];
        });
        $.ajaxSetup({async:true});

        // get current rules
        var current_rules = [];
        var jqxhr = $.getJSON(ga.editing.urls.rule.list+params['constraint_pk']+"/", function( data ) {
            ga.editing.data.current_rules = data['results'];
        }).done(function(){
            $.each(ga.editing.data.current_rules, function (k, v){
                that._buildContraintRuleForm(params['constraint_pk'], rules_list, v, false);
            });
        });




        // rule list section
        var rules_list =  modal.$modal.find('.rules-list');

        // rule actions for new rule
        var $bt_add_rule = modal.$modal.find('.add-rule');
        $bt_add_rule.on('click', function(e){
            that._buildContraintRuleForm(params['constraint_pk'], rules_list, null, true);
        });


        modal.show();
    },

    _constraintForm: function($item, res, params){

        // set urls

        form_action = (params['new']) ? ga.editing.urls.constraint.list : ga.editing.urls.constraint.detail+res['pk']+'/'


        // open modal to show list of add links
        modal_options = {
            'editingLayerId': params['layer_pk'],
            'action': form_action
        };
        var modal = ga.currentModal = ga.ui.buildDefaultModal({
            modalTitle: ((_.isUndefined(params['modal-title']) ? gettext('Form title') : params['modal-title'])),
            modalBody: ga.tpl.constraintForm(modal_options),
            modalSize: (_.isUndefined(params['modal-size']) ? '' : params['modal-size'])
        });

        modal.data.$evoker = $item;

        // parent_click based on new or update
        if (params['new']){
            var $item = params['parent_click'].parents('tr').prev().find('[data-widget-type="constraintsList"]');
        } else {
            var $item = $(params['parent_click'].parents('table')[0]).parents('tr').prev().find('[data-widget-type="constraintsList"]');
        }


        // set action for confirm btn
        var form = new ga.forms.form(modal.$modal.find('form'));
        var that = this;
        form.setOnSuccesAction(function(e){
            that._refreshConstraintList($item)();
            modal.hide();
        });
        modal.setConfirmButtonAction(function(e){
            form.sendData(e, params['new'] ? 'post' : 'put');
        });

        modal.show();

        // populate layer select
        $.getJSON(ga.editing.urls.layer.info+params['layer_pk']+"/", function( data ) {
            var $select = modal.$modal.find('[name="constraint_layer"]');
            $.each(data['results'], function(key, val){
                var $option = $('<option value="'+val['pk']+'">'+val['name']+'</option>');
                if (!_.isNull(res)) {
                    if (val['pk'] == res['constraint_layer'])
                        $option.attr('selected','selected');
                }
               $select.append($option);
            });
        });
    },

    /*
    Build constraints table
     */
    _constraintsTable: function(layer_pk, res){
        var $div = $('<div style="margin-left:40px;">');

        // add new constraint btn
        $newConstraint = $('<a href="#"><i class="ion ion-plus-circled"></i> '+gettext('New constraint')+'</a>');
        $newConstraint.on('click', function(){
            ga.widget._constraintForm($newConstraint, null,
                {
                    'modal-title': gettext('New constraint'),
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
            '                <th>'+gettext('Layer constraint')+'</th>\n' +
            '                <th>'+gettext('Rules count')+'</th>\n' +
            '            </tr>\n' +
            '        </thead>');

        // add constraints
        var constraint_res = {};
        $.each(res['results'], function(k, v){
            constraint_res[v['pk']] = v;
            var editDisplay = v['constraint_rule_count'] > 0 ? 'none': 'display';
            $tbody.append('<tr id="constraint-item-'+v['pk']+'">\n' +
            '                <td>'+ga.tpl.constraintActions({
                    'editingLayerId': layer_pk,
                    'constraintPk': v['pk'],
                    'editDisplay': editDisplay
            })+'</td>\n' +
            '                <td>'+v['constraint_layer_name']+'</td>\n' +
            '                <td>'+v['constraint_rule_count']+'</td>\n' +
            '            </tr>\n');
        });

        // add actions to elements action
        $tbody.find('[data-constraint-action-mode="update"]').on('click', function(e){
            ga.widget._constraintForm($newConstraint, constraint_res[$(this).attr('data-constraint-pk')],
                {
                    'modal-title': gettext('Update constraint'),
                    'layer_pk': layer_pk,
                    //'constraint_pk': $(this).attr('data-contraint-pk'),
                    'new': false,
                    'parent_click': $(this)
                });
        });

        $tbody.find('[data-constraint-action-mode="rules"]').on('click', function(e){
            ga.widget._constraintRulesForm($newConstraint, null,
                {
                    'modal-title': gettext('Constraint Rules'),
                    'constraint_pk': $(this).attr('data-constraint-pk'),
                    'layer_pk': layer_pk,
                    'parent_click': $(this)
                });
        });

        $div.append($table);


        return $div;
    },

    constraintsList: function($datatable, $item, refresh){

        try {

            var params = ga.utils.getDataAttrs($item, this._constrantsListParams);
            if (_.isUndefined(params['constraints-list-url'])) {
                throw new Error('Attribute data-constraints-list-url not defined');
            }

            // get tr row parent
            refresh = _.isUndefined(refresh) ? false : true;

            var tr = $item.closest('tr');
            var row = $datatable.row(tr);
            var idx = $.inArray( tr.attr('id'), [] );

            var getDetail = function(){
                $.ajax({
                     method: 'get',
                     url: params['constraints-list-url'],
                     success: function (res) {
                        row.child(g3wadmin.widget._constraintsTable(params['constraints-layer-pk'],res)).show();
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

                    // ajax call to get deatail data
                    getDetail();
                }
            }



        } catch (e) {
            this.showError(e.message);
        }
    }
});

// activate widget
$(document).ready(function() {
    $('[data-widget-type="constraintsList"]').on('click', function (e) {
        var $datatable = $(this).parents('table').DataTable();
        ga.widget.constraintsList($datatable, $(this));
    });
});
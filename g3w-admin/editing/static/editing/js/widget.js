/**
 * Created by Walter Lorenzetti (lorenzetti@gis3w.it)
 */

ga.Editing = {

}

ga.Editing.widget = {

    /**
     * Working contexts: users and user_groups
     */
    contexts: ['user', 'group'],

    init: function () {

        this.selects = {
            'user': $("#editing_layer_form").find('#id_viewer_users'),
            'group': $("#editing_layer_form").find('#id_user_groups_viewer'),
            'layer': $("#editing_layer_form").find('#id_layers')
        };

        this.capas = {
            'user': $("#editing_layer_form").find('.users_atomic_capabilities'),
            'group': $("#editing_layer_form").find('.user_groups_atomic_capabilities')
        };

        // For multilayer activation editing form
        this.fields_add_edit_user = $("#editing_layer_form").find('.add_edit_user_fields');

        this.init_active_status();
        this.init_atomic_capabilities();
        this.init_add_edit_user_fields();
    },

    /**
     * Initialize active checkbox behaviour.
     */
    init_active_status: function () {
        $check = $("#editing_layer_form").find('#id_active');
        $select = $("#editing_layer_form").find('#id_scale, select:not(#id_layers), #id_visible');

        var check_active_status = function (event) {
            $ichecks = $("#editing_layer_form").find('' +
                'input[name^="user_add_capability_"],' +
                'input[name^="user_change_capability_"],' +
                'input[name^="user_changeattributes_capability_"],' +
                'input[name^="user_delete_capability_"]');

            if ($check.prop('checked')) {
                $select.prop('disabled', false);
                $ichecks.iCheck('enable');
            } else {
                $select.prop('disabled', true);
                $ichecks.iCheck('disable');
            }
        }

        $check.on('ifChanged', check_active_status);
        check_active_status();
    },

    /**
     * Init atomic capabilities management.
     */
    init_atomic_capabilities: function () {

        var that = this;
        _.each(this.contexts, function (context) {

            /* Bind select and unselect event*/
            that.selects[context].on('select2:select', that.add_row(context));
            that.selects[context].on('select2:unselect', that.remove_row(context));

            /* On open form for selected data */
            _.each(that.selects[context].select2('data'), that.add_row(context));

        });
    },

    /**
     * Initialize for mutli layer editing activation form
     * the add/edit user fields
     * @param context
     * @returns {(function(*): void)|*}
     */
    init_add_edit_user_fields: function () {

        var that = this;

        that.selects['layer'].on('select2:select', that.add_edit_user_row());
        that.selects['layer'].on('select2:unselect', that.remove_add_edit_user_row());

    },

    /**
     * Add row to capabilities table for users and user_groups.
     * @param context
     * @returns {(function(*): void)|*}
     */
    add_row: function (context) {

        var that = this;
        return function (e) {

            try {
                var data = e.params.data;
            } catch {
                var data = e;
            }

            // check if table is rendered
            var $table = that.capas[context].find('table');

            // Check if user_id is in initial_atomic_capabilities,
            // if it is not could be new-one to add to atomic permissions (possible back version compatibility)
            var is_checked = function(c,p,id){
                if (_.indexOf(that.initial_atomic_capabilities[c]['change_layer'], parseInt(data.id)) == -1){
                    return "checked=checked"
                } else if (_.indexOf(that.initial_atomic_capabilities[c][p], parseInt(data.id)) != -1) {
                    return "checked=checked";
                } else {
                    return "";
                }
            };

            // build table row
            var $row = ga.tpl.editing.atomic.capabilities.tablerow({
                user_role_name: data.text,
                user_role_id: data.id,
                context: context,
                ck_add: is_checked(context,'add_feature', data.id),
                ck_cha: is_checked(context,'change_feature', data.id),
                ck_del: is_checked(context,'delete_feature', data.id),
                ck_cha_attr: is_checked(context,'change_attr_feature', data.id)
            });
            if ($table.length == 0) {
                $table = ga.tpl.editing.atomic.capabilities.table({
                    user_role_title: gettext('User'),
                    add_capability_title: gettext('Add'),
                    change_capability_title: gettext('Update geometry'),
                    delete_capability_title: gettext('Delete'),
                    change_attributes_capability_title: gettext('Update attributes'),
                    body_table: $row
                });

                that.capas[context].append($table);


            } else {
                $table.find('tbody').append($row);
            }

            // init icheck
            that.capas[context].find('input[type="checkbox"]').iCheck({
              checkboxClass: 'icheckbox_flat-blue'
            });
        }
    },

    /**
     * Remove row from capabilities table.
     * @param context
     * @returns {(function(*): void)|*}
     */
    remove_row: function (context) {

        var that = this;
        return function (e) {

            try {
                var data = e.params.data;
            } catch {
                var data = e;
            }

            that.capas[context].find('#row_' + data.id).remove();
        }

    },

    /**
     * Adds a new row for each layer selected in the layers field,
     * in each row it allows the choice of the field to be used to save
     * the user who created the new feature
     *
     * Not update only create form state
     * @returns {(function(*): void)|*}
     */
    add_edit_user_row: function () {

        var that = this;
        return function (e) {

            try {
                var data = e.params.data;
            } catch {
                var data = e;
            }

            // check if table is rendered
            var $table = that.fields_add_edit_user.find('table');

            // build table row
            var $row = ga.tpl.editing.userfields.choosingfields.tablerow({
                layer_name: data.text,
                layer_id: data.id
            });
            if ($table.length == 0) {

                var $table = ga.tpl.editing.userfields.choosingfields.table({
                    layer_name_title: gettext('Layer'),
                    add_user_field_title: gettext('Add logging field'),
                    edit_user_field_title: gettext('Update logging field'),
                    body_table: $row
                });

                that.fields_add_edit_user.append($table);

            } else {
                $table.find('tbody').append($row);
            }

            that.fields_add_edit_user.find('select').select2({
                    width: '100%',
            });



            $.ajax({
                method: "get",
                url: ga.Editing.widget.layerinfobaseurl + data.id + "/",
                success: function (res) {
                    var fields = res.database_columns;

                    // For selects
                    var $add_field = $('#add_user_field_' + data.id);
                    var $edit_field = $('#edit_user_field_' + data.id);
                    _.each(fields, function (field) {
                        $add_field.append($('<option value="' + field.name + '">' + field.name + '</option>'));
                        $edit_field.append($('<option value="' + field.name + '">' + field.name + '</option>'));
                    })

                },
                error: function (xhr, textStatus, errorMessage) {
                },
            });

        }
    },

    /**
     * Remove row from table for choosing log user field
     * @returns {(function(*): void)|*}
     */
    remove_add_edit_user_row: function () {


        var that = this;
        return function (e) {

            try {
                var data = e.params.data;
            } catch {
                var data = e;
            }

            that.fields_add_edit_user.find('#row_' + data.id).remove();
        }

    },


};

_.extend(ga.tpl, {

    editing: {
        atomic: {
            capabilities: {
                table: _.template('\
                    <table class="table">\
                        <thead>\
                            <tr>\
                                <th><%= user_role_title %></th>\
                                <th><%= add_capability_title %></th>\
                                <th><%= change_capability_title %></th>\
                                <th><%= change_attributes_capability_title %></th>\
                                <th><%= delete_capability_title %></th>\
                            </tr>\
                        </thead>\
                        <tbody><%= body_table %></tbody>\
                    </table>\
                    '),
                tablerow: _.template('\
                    <tr id="row_<%= user_role_id %>">\
                        <td><%= user_role_name %></td>\
                        <td><input type="checkbox" name="<%= context %>_add_capability_<%= user_role_id %>" <%= ck_add %>></td>\
                        <td><input type="checkbox" name="<%= context %>_change_capability_<%= user_role_id %>" <%= ck_cha %>></td>\
                        <td><input type="checkbox" name="<%= context %>_changeattributes_capability_<%= user_role_id %>" <%= ck_cha_attr %>></td>\
                        <td><input type="checkbox" name="<%= context %>_delete_capability_<%= user_role_id %>" <%= ck_del %>></td>\
                    </tr>\
                ')
            }
        },
        userfields: {
            choosingfields: {
                table: _.template('\
                    <table class="table">\
                        <thead>\
                            <tr>\
                                <th><%= layer_name_title %></th>\
                                <th><%= add_user_field_title %></th> \
                                <th><%= edit_user_field_title %></th> \
                            </tr>\
                        </thead>\
                        <tbody><%= body_table %></tbody>\
                    </table>\
                    '),
                tablerow: _.template('\
                    <tr id="row_<%= layer_id %>">\
                        <td><%= layer_name %></td>\
                        <td><select class="select2" name="add_user_field_<%= layer_id %>" id="add_user_field_<%= layer_id %>"><option value="">------</option></select></td>\
                        <td><select class="select2" name="edit_user_field_<%= layer_id %>" id="edit_user_field_<%= layer_id %>"><option value="">------</option></select></td>\
                    </tr>\
                ')
            }
        }
    }
});
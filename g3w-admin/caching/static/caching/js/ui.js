

_.extend(g3wadmin.ui, {

    initCachingSaveAsBaseLayerCheckBox: function(){
        $(document).on('ifChanged', '#id_as_base_layer', function(e){
            var $fieldset = $(this).parents('.base-layer-enable').find('fieldset');
            if (e.target.checked){
                $fieldset.removeAttr('disabled');
                $('#id_base_layer_title').attr('required','required')
            } else {
                $fieldset.attr('disabled', 'disabled')
            }
        });


    },

    initCachingActiveCheckBox: function(){
        this.initCachingSaveAsBaseLayerCheckBox();

        var $save_as_baselayer = $('#id_active').parents('form').find('#id_as_base_layer');
        var $fieldset = $('#id_active').parents('form').find('fieldset');
        if ($save_as_baselayer.prop('checked'))
                    $fieldset.removeAttr('disabled');
                    $('#id_base_layer_title').attr('required','required')

        if (!$('#id_active').prop('checked'))
            $save_as_baselayer.iCheck('disable');


        $(document).on('ifChanged', '#id_active', function(e){

            if (e.target.checked){
                $save_as_baselayer.iCheck('enable');
                if ($save_as_baselayer.prop('checked'))
                    $save_as_baselayer.iCheck('check');
            } else {
                if ($save_as_baselayer.prop('checked'))
                    $save_as_baselayer.iCheck('uncheck');
                $save_as_baselayer.iCheck('disable')
            }
        });



    },

});
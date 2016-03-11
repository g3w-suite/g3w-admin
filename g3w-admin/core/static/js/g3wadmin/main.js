/**
 * Created by walter on 18/02/16.
 */

/**
 * Use of https://github.com/sinkswim/javascript-style-guide for javascript coding style.
 */

window.g3wadmin = {};

_.extend(g3wadmin,{
    tpl: {}, // templates space
    widget: {}, //  widget space
    ui: {}, // UI
    forms: {}, // forms related
    utils: {},
    bootstrap: function(){

        var that = this;
        //Initialize widgets
        // Detail Widget
        $('[data-widget-type="detailItem"]').click(function(e){
            that.widget.showDetailItem($(this));
        });

        // Delete Widget
        $('[data-widget-type="deleteItem"]').click(function(e){
            that.widget.deleteItem($(this));
        });

        // Load Html Widget
        var $htmlLoads = $('[data-widget-type="htmlItem"]');
        $.each($htmlLoads,function(){
            that.widget.loadHtmlItem($(this));
        });

        // Add porjects modal Widget
        $('[data-widget-type="addProjectGroup"]').click(function(e){
            that.widget.addProjectGroup($(this));
        });

        // Ajax upload form
        that.widget.ajaxUpload($('[data-widget-type="ajaxUpload"]'));


        // start select2 plugin
        $('.select2').select2();

        // start bootstrap3-wysihtml5
        $('.wys5').wysihtml5();

        //Flat red color scheme for iCheck
        $('input[type="checkbox"], input[type="radio"]').iCheck({
          checkboxClass: 'icheckbox_flat-green',
          radioClass: 'iradio_flat-green'
        });

        /*
        TODO: try to perfom this issue server side
        //If form present che collapsed box
        var $formsInContent = $('.content').find('form');
        if ($formsInContent.length > 0) {

            //check box to open
            $formBoxes = $formsInContent.find('.collapsed-box > .box-body');
            $.each($formBoxes, function(index, item){
                that.forms.checkBoxToOpen($(item));
            });
        }
        */
    }
});

window.ga = g3wadmin;



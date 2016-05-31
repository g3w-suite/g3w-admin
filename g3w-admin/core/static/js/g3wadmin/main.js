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
    currentModal: null,
    currentForm: null,
    
    bootstrap: function(){

        var that = this;
        //Initialize widgets
        // Detail Widget
        this.ui.initCrudDetailWidget();

        // Delete Widget
        this.ui.initCrudDeleteWidget();

        // Load Html Widget
        var $htmlLoads = $('[data-widget-type="htmlItem"]');
        $.each($htmlLoads,function(){
            that.widget.loadHtmlItem($(this));
        });

        // Add projects modal Widget
        $('[data-widget-type="addProjectGroup"]').click(function(e){
            that.widget.addProjectGroup($(this));
        });

        // Ajax upload form
        that.widget.ajaxUpload($('[data-widget-type="ajaxUpload"]'));


        // start bootstrap3-wysihtml5
        $('.wys5').wysihtml5();

        //Flat red color scheme for iCheck
        this.ui.initRadioCheckbox();

        //Init bootstrap-datepicker
        this.ui.initBootstrapDatepicker();

        //Init select2 plugin
        this.ui.initSelect2();

        //Init button back history
        this.ui.initBackHistory();

        //Init formWidget
        this.ui.initAjaxFormWidget();

        //Init filerWidget
        this.ui.initAjaxFilerWidget();

        //Init ajaxDownload
        this.ui.initAjaxDownload();

        //Init PushMenu
        this.ui.initPushMenu();

        //Init showMessageOnLoad
        this.ui.showMessageOnLoad();

        //  INIT SetProjectPanoramicWidget
        this.ui.initSetProjectPanoramicWidget();

        // INIT initMapSetExtent
        this.ui.initMapSetExtent();
        

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



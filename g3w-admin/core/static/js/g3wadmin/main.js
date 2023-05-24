/**
 * @file
 * @author    Walter Lorenzetti <lorenzetti@gis3w.it>
 * @copyright 2016-02-18, Gis3w
 * @license   MPL 2.0
 */

window.g3wadmin = {};

_.extend(g3wadmin, {

    /**
     * templates space
     */
    tpl: {},

    /**
     * widget space
     */
    widget: {}, 

    /**
     * UI
     */
    ui: {},
    
    /**
     * forms related
     */
    forms: {},

    utils: {},

    currentModal: null,

    currentForm: null,

    /**
     * Initialize widgets
     */
    bootstrap: function() {

        const self = this;

        // Detail Widget
        this.ui.initCrudDetailWidget();

        // Delete Widget
        this.ui.initCrudDeleteWidget();

        // Active / Deactive Widget
        this.ui.initActiveDeactiveWidget();

        // Load Html Widget
        $.each($('[data-widget-type="htmlItem"]'), function() { self.widget.loadHtmlItem($(this)); });

        // Add projects Modal
        $('[data-widget-type="addProjectGroup"]').click(function(e) { self.widget.addProjectGroup($(this)); });

        // Ajax Upload form
        this.widget.ajaxUpload($('[data-widget-type="ajaxUpload"]'));

        // Summernote
        $('.wys5').summernote({
            disableDragAndDrop: true,
            lang: ('it' === CURRENT_LANGUAGE_CODE ? 'it-IT' : undefined),
            toolbar: [
                ['magic', ['style']],
                ['font', ['bold', 'underline', 'italic', 'clear']],
                ['fontsize', ['fontsize']],
                ['color', ['color']],
                ['para', ['ul', 'ol', 'paragraph']],
                ['table', ['table']],
                ['insert', ['link']],
                ['view', ['fullscreen', 'codeview', 'undo', 'redo', 'help']]
            ],
        });

        // iCheck
        this.ui.initRadioCheckbox();

        // Date picker
        this.ui.initBootstrapDatepicker();

        // Time picker
        this.ui.initBootstrapTimepicker();

        // Color picker
        this.ui.initBootstrapColorpicker();
        
        // Select2
        this.ui.initSelect2();

        // Language select
        this.ui.initLanguageSelect();

        // Back history button
        this.ui.initBackHistory();

        // Ajax form Widget
        this.ui.initAjaxFormWidget();

        // Ajax filter Widget
        this.ui.initAjaxFilerWidget();

        // Ajax download
        this.ui.initAjaxDownload();

        // Push menu
        this.ui.initPushMenu();

        // On Load messages
        this.ui.showMessageOnLoad();

        // Panoramic Project Widget
        this.ui.initSetProjectPanoramicWidget();

        // Map Extent
        this.ui.initMapSetExtent();

        // Data Table
        this.ui.initDataTable();

        // Close every messages on top page
        this.ui.closeMessages();

        // WEB Service widget
        this.ui.initShowWEBServicesWidget();

        /**
         * @TODO try to perfom this issue server side
         */
        // // If form present che collapsed box
        // var $formsInContent = $('.content').find('form');
        // if ($formsInContent.length > 0) {

        //     //check box to open
        //     $formBoxes = $formsInContent.find('.collapsed-box > .box-body');
        //     $.each($formBoxes, function(index, item) {
        //         that.forms.checkBoxToOpen($(item));
        //     });
        // }
    }
});

window.ga = g3wadmin;



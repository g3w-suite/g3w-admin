/**
 * Created by walter on 18/02/16.
 */

/**
 * Use of https://github.com/sinkswim/javascript-style-guide for javascript coding style.
 */

window.qdjango2 = {};

_.extend(qdjango2,{
    tpl: {}, // templates space
    widget: {}, //  widget space
    ui: {}, // UI
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

        // start select2 plugin
        $('.select2').select2();

        //Flat red color scheme for iCheck
        $('input[type="checkbox"], input[type="radio"]').iCheck({
          checkboxClass: 'icheckbox_flat-green',
          radioClass: 'iradio_flat-green'
        });
    }
});



window.qdj2 = qdjango2;



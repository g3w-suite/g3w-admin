/**
 * @TODO replace `$.ajax` with `window.fetch`
 * 
 * @file      Initially based on on AdminLTE v2.3.8
 * @author    Walter Lorenzetti <lorenzetti@gis3w.it>
 * @copyright 2016-02-18, Gis3w
 * @license   MPL 2.0
 */
(function() {

  const { FILE_FORM_UPLOAD_TEMP_URL } = SETTINGS;

  globalThis.g3wadmin = globalThis.ga = {

    currentModal: null,

    /********************************************************************
     * ORIGINAL SOURCE: g3w-admin/core/static/js/g3wadmin/widget.js@v3.9.0
     ********************************************************************/
    widget: {

      /**
       * Show modal error message 
       */
      showError(e) {
        console.trace(e);
        $('.modal,.fade').remove(); // delete every modal opened
        g3wadmin.ui._buildModal({ modalTitle: 'ERROR', modalBody: e?.message ?? e, confirmButton: false }, 'modal-danger').show();
      },

    },

    /********************************************************************
     * ORIGINAL SOURCE: g3w-admin/core/static/js/g3wadmin/ui.js@v3.9.0
     ********************************************************************/
    ui: {

      /**
       * DataTable callbacks (closer) called before init 
       */
      before_datatable_callbacks: [
        function ($datatable) {
          [
            'detailItemDataTable',
            'singlelayerConstraintsList',
            'geoConstraintsList',
            'columnAclManagerList',
            'styleManagerList',
            'qplotlyWidgetList',
          ].forEach(widget => {
            $datatable.find(`[data-widget-type="${widget}"]`).on("click", async function (e) {
              (await import(`../components/data-widget-${widget}.js`))[widget]($(this).parents("table").DataTable(), $(this));
            })
          });
        },
      ],

      modal: class {
        constructor ($modal, options) {
          console.warn('[G3W-ADMIN] ga.ui.modal is deprecated');
          this.$modal  = $modal;
          this.options = options;
          this.data    = {};                                             // TODO: check if unused (eg. used only by: g3wadmin.currentModal.data.$evoker ?)
          this.$modal.on('hidden.bs.modal', () => this.$modal.remove()); // destroy DOM element on hidden
          if (this.options.onModalShow) {
            this.$modal.on('shown.bs.modal', eval(this.options.onModalShow));
          }
        }
        show()                     { this.$modal.modal({ show: true, backdrop: true }); }
        hide()                     { this.$modal.modal('hide'); }
        setBody(d)                 { this.$modal.find('.modal-body').html(d); }
        setTitle(d)                { this.$modal.find('.modal-title').html(d); }
        setConfirmButtonAction(cb) { this.$modal.find('.modal-button-confirm').on('click', cb); } // used by the following plugins: "cadastre"
        setCloseButtonAction(cb)   { this.$modal.find('.modal-button-close').on('click', cb); }
      },

      /**
       * build the modal jquery object
       */
      _buildModal(options, className = '') {
        options = options || {};
        return new g3wadmin.ui.modal($(/* html */ `
          <div class="modal fade" tabindex="-1" role="dialog">
            <div class="modal-dialog ${ options.modalClass || className } ${ options.modalSize || '' }">
              <div class="modal-content">
                <div class="modal-header">
                  ${false !== options.closeX ? '<button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>' : '' }
                  <h4 class="modal-title">${ options.modalTitle ?? gettext('Title') }</h4>
                </div>
                <div class="modal-body">${ options.modalBody ?? gettext('Content') }</div>
                <div class="modal-footer">
                  ${ false !== options.closeButton   ? '<button type="button" class="modal-button-close btn btn-default" data-dismiss="modal"><i class="fa fa-close"></i> ' + (options.closeButtonText || gettext('Close')) + '</button>' : '' }
                  ${ false !== options.confirmButton ? '<button type="button" class="modal-button-confirm btn btn-success"><i class="fa fa-check"></i> ' + (options.confirmButtonText || 'Ok') + '</button>' : '' }
                </div>
              </div>
            </div>
          </div>`), options);
      },

    },

    /********************************************************************
     * ORIGINAL SOURCE: g3w-admin/core/static/js/g3wadmin/utils.js@v3.9.0
     ********************************************************************/
    utils: {
      /** Used by the following plugins: "bforest", "cadastre", "cdu", "iternet", "signaler-iim", "stress" */
      getDataAttrs: ($item, params) => {
        console.warn('[G3W-ADMIN] ga.utils.getDataAttrs is deprecated');
        return params.reduce((attrs, a) => ({ ...attrs, [a]: $item.attr('data-' + a) }), {});
      },
      /** Used by the following plugins: "bforest", "cadastre", "cadaste-camaiore", "iternet" */
      buildAjaxErrorMessage: (textStatus, errorMessage, moreInfo) => {
        console.warn('[G3W-ADMIN] ga.utils.buildAjaxErrorMessage is deprecated');
        /* html */ `<h3>${ textStatus ?? 500 }</h3><p>${ errorMessage || '' }</p><p>${ moreInfo || '' }<p>`
      },
    },

    /********************************************************************
     * Templates
     * 
     * ORIGINAL SOURCE: g3w-admin/core/static/js/g3wadmin/tpl.js@v3.9.0
     ********************************************************************/
    tpl: {},

    /********************************************************************
     * ORIGINAL SOURCE: g3w-admin/core/static/js/g3wadmin/forms.js@v3.9.0
     ********************************************************************/
    forms: {
      form: class {
        constructor($form) {
          console.warn('[G3W-ADMIN] ga.forms is deprecated');
          this.$form    = $form;
          this.on       = (e, target) => this.$form.on(e, target);
          this.sendData = this.sendData.bind(this);
        }

        // Send form data to action url
        sendData(e, method, data, content_type) {
          if (g3wadmin.currentModal) {
            console.warn('[G3W-ADMIN] ga.Qdjango.currentModal is deprecated');
            $(g3wadmin.Qdjango.widgetEditor).trigger(`onsubmitform:${g3wadmin.Qdjango.widgetEditor?.widget?.widget_type ?? 'default'}`);
            if (![undefined, null].includes(g3wadmin.Qdjango.widgetEditor.onsubmitform_obj)) {
              console.warn(`[G3W-ADMIN] ga.Qdjango.widgetEditor.onsubmitform_obj is deprecated`)
              $("#id_body").val(JSON.stringify(g3wadmin.Qdjango.widgetEditor.onsubmitform_obj));
            }
          }
          this.$form.trigger('preSendForm');
          $.ajax({
            method:      method || 'post',
            data:        data ?? this.getData(),
            contentType: content_type || 'application/x-www-form-urlencoded; charset=UTF-8',
            url:         this.$form.attr('action'),
            success: res => {
              if ('error' === res.status) {
                this.showErrors(res.errors_form);
                return;
              }
              if (g3wadmin.currentModal) {
                g3wadmin.currentModal.hide()
                // get row and update widget counter
                const $item = g3wadmin.currentModal.data.$evoker.parents("tr").prev().find('[data-widget-type="detailItemDataTable"]');
                $item.one('click', () => { $item.click(); }).click();
              }
              if (this.successAction) {
                this.successAction(res);
              }
            },
            complete: () => { this.$form.trigger('postSendForm'); },
            error: (xhr, status, message) => {
              if (this.errorAction) {
                this.errorAction(xhr, message);
              } else {
                ga.widget.showError(`<h3>${ xhr.status ?? 500 }</h3><p>${ message || '' }</p>`);
              }
            }
          });
        }

        // Show error messages on form and fields ("errors" = associative array of messages by key field).
        showErrors(errors) {
          this.$form.find('.has-error').removeClass('has-error');
          this.$form.find('span.help-block').remove();
          Object.entries(errors || {}).forEach(key => {
            const $input = this.$form.find(`#div_id_${key}`);
            const $control = $input.find('.controls');
            $input.addClass('has-error');
            errors[key].forEach(error => $control.append(`<span id="error_id_${key}" class="help-block"><strong>${error}</strong></span>`));
          });
        }

        // Set form action url ("action" = string) 
        setAction(action) {
          this.$form.attr('action', action);
        }

        // Get data from form (post request)
        getData(type) {
          return undefined === type ? this.$form.serialize() : this.$form.serializeArray().reduce((data, { name, value }) => Object.assign(data, { [name]: value}), {});
        }
      }
    },

    /********************************************************************
     * ORIGINAL SOURCE: g3w-admin/qdjango/static/qdjango/js/widget.js@v3.9.0
     ********************************************************************/
    Qdjango: {
      localVars: {}, 
      widgetEditor: {
    
        isset(o) {
          return ![undefined, null].includes(o);
        },
    
        getType(str) {
          if (["QSTRING","STRING","TEXT"].some(type => -1 !== str.indexOf(type))){
            return "textfield";
          }
          if (["NUMERIC","DOUBLE PRECISION","INTEGER","BIGINT","REAL","INT","DOUBLE"].some(type => -1 !== str.indexOf(type))) {
            return "numberfield";
          }
          if (["QDATE","QDATETIME","QTIME"].some(type => -1 !== str.indexOf(type))) {
            return "datetimefield";
          }
        },
    
        async onWidgetTypeChange() {

          const { widgetEditor, localVars } = g3wadmin.Qdjango;
    
          Object.assign(this, {
            layerColumns:  localVars.layer_columns,
            layer:         localVars.layer_name,
            layer_type:    localVars.layer_type,
            projectLayers: localVars.project_layers,
            relations:     localVars.relations,
            lawslist:      localVars.laws_list,
            form:          $("#widget_form"),
            widget:        localVars.update && Object.keys(localVars.widget || {}).length ? localVars.widget : widgetEditor.widget,
          });
    
          const widget_type = $("#id_widget_type").val();
    
          // clean up old "widget_type" data
          if (widget_type !== this.widget.widget_type) {
            this.widget.widget_type = widget_type;
            $("#id_body").val("");
          }
    
          $(".rightCol").empty();
    
          try {
            if (widget_type) {
              const widget = (await import(`../components/qwidget-${widget_type}.js`)).default;
              widget();
              this.onAddCallback = widget;
            }
          } catch (e) {
            console.warn(e);
          } finally {
            this.update && $(this).trigger('showstoredvalues:default');
          }
    
          $(".rightCol").append($(/* html */`
            <div style="margin-top: 1em; text-align:center;">
              <button type="button" class="btn btn-success addRow">
                <i class="fa fa-plus"></i>
                ${gettext("Add")}
              </button>
            </div>
          `));
    
          $(".rightCol").on('click', function (e) {
            if (e.target.closest('.addRow')) {
              const div = e.target.closest('div');
              g3wadmin.Qdjango.widgetEditor.onAddCallback();
              $(div).appendTo($(".rightCol"));                              // TODO: check if deprecated
              if ('search' === widget_type) {
                $(e.target.closest('.pluslayers')).appendTo($(".rightCol")) // TODO: check if deprecated
              }
            }
          });
        },
      },
    
    },

  };

  /** @deprecated since g3w-admin v4.0 */
  g3wadmin.Qdjango.widgetEditor.fadeNumber = 400;

  /** @deprecated since g3w-admin v4.0 */
  g3wadmin.ui.buildDefaultModal = t => {
    console.warn('[G3W-ADMIN] ga-ui.buildDefaultModal is deprecated');
    return g3wadmin.ui._buildModal(t, '')
  };

  /** @deprecated since g3w-admin v4.0 */
  g3wadmin.ui.buildDangerModal = t => {
    console.warn('[G3W-ADMIN] ga-ui.buildDangerModal is deprecated');
    return g3wadmin.ui._buildModal(t, 'modal-danger')
  };

  /** @deprecated since g3w-admin v4.0 */
  g3wadmin.ui.buildWarningModal = t => {
    console.warn('[G3W-ADMIN] ga-ui.buildDangerModal is deprecated');
    return g3wadmin.ui._buildModal(t, 'modal-warning')
  };

  /********************************************************************
   * Initialize widgets
   * 
   * ORIGINAL SOURCE: g3w-admin/core/static/js/g3wadmin/main.js@v3.9.0
   ********************************************************************/

  document.addEventListener("DOMContentLoaded", function() {

    // cookie banner
    globalThis.cookieconsent.initialise({
      palette: {
        popup:  { background: "#3c404d", text: "#d6d6d6" },
        button: { background: "#8bed4f" }
      },
      showLink: false,
      position: "top",
      content: {
        message: SETTINGS.PRIVACY_MSG,
        dismiss: gettext('OK')
      },
    });

    // sidebar menu
    document.querySelector('aside > ul')?.addEventListener('click', e => {
      const collapsed = document.body.classList.contains('sidebar-collapse');
      const active    = !collapsed && e.target.closest('.active');
      const treeview  = e.target.closest('.treeview') && !e.target.closest('.treeview ul');
      // skip simple (or nested) links
      if (!treeview) {
        return;
      }
      // open sidebar
      if (collapsed) {
        document.body.classList.remove('sidebar-collapse');
      }
      e.target.closest('aside > ul')?.querySelectorAll('li.active')?.forEach(li => li.classList.remove('active'));
      e.target.closest('aside > ul > li')?.classList.toggle('active', !active);
      e.preventDefault();
    });

    // widgets
    document.addEventListener('click', async function (e) {

      // Datepicker
      if (e.target.closest('input[type="date"]')) {
        e.preventDefault();
        e.target.showPicker();
        return;
      }

      // Box widget
      if (e.target.closest('[data-widget="collapse"]')) {
        e.preventDefault();
        const box       = e.target.closest(".box");
        const icon      = e.target.querySelector(".fa");
        const collapsed = box.classList.toggle("collapsed-box");
        icon.classList.toggle('fa-plus',   collapsed);
        icon.classList.toggle('fa-minus', !collapsed);
        box.querySelectorAll(":scope > .box-body, :scope > .box-footer, :scope > form > .box-body, :scope > form > .box-footer")?.forEach(content => {
          content.style.height = collapsed ? "0" : ""; // Hide or show the content
        });
        return;
      }
      
      // Listen for remove event
      if (e.target.closest('[data-widget="remove"]')) {
        e.preventDefault();
        Object.assign(e.target.closest('.box')?.style || {}, { height: '0', display: 'none' });
        return;
      }

      const item        = e.target.closest('[data-widget-type]'); 
      const widget_type = item?.getAttribute('data-widget-type');

      if (['backHistory', 'ajaxFiler'].includes(widget_type)) {
        e.preventDefault();
      }

      if( [
        "detailItem",
        "deleteItem",
        "activeDeactiveItem",
        "backHistory",
        "ajaxForm",
        "ajaxFiler",
        "ajaxDownload",
        "setProjectPanoramic",
        "linkWidget2Layer",
        "showWEBServices",
      ].includes(widget_type)) {
        try {
          await (await import(`../components/data-widget-${widget_type}.js`)).default(item);
        } catch (e) {
          g3wadmin.widget.showError(e);
        }
      }

    });

    // Bootstrap tooltip
    $('body').tooltip({ selector: "[data-toggle='tooltip']", container: 'body' });

    // Button groups
    document.querySelectorAll('.btn-group[data-toggle="btn-toggle"]')?.forEach(
      g => g.querySelectorAll('.btn').forEach(
        b => b.addEventListener('click', e => {
            g.querySelector('.btn.active')?.classList.remove('active');
            b.classList.add('active');
            e.preventDefault();
        })
      )
    );

    // form widget (django-file-form)
    if ($('[data-widget-type="ajaxUpload"]').length) {
      globalThis.initUploadFields($('[data-widget-type="ajaxUpload"]')[0], {
        validation: globalThis.ajaxUploadValidation, // get validation option if is set
        callbacks: {
          onSuccess(upload) {
            var $thumb = $('span:contains(' + upload.name + ')').parents('.box-body').find('.img-thumbnail');
            $thumb.attr('src', FILE_FORM_UPLOAD_TEMP_URL + upload.id);
            if ($thumb.is(':hidden'))
              $thumb.show();
          }
        }  
      });
    }

    $('.wys5').summernote({
      disableDragAndDrop: true,
      lang: ('it' === SETTINGS.CURRENT_LANGUAGE_CODE ? 'it-IT' : undefined),
      toolbar: [
        ['magic',    ['style']],
        ['font',     ['bold', 'underline', 'italic', 'clear']],
        ['fontsize', ['fontsize']],
        ['color',    ['color']],
        ['para',     ['ul', 'ol', 'paragraph']],
        ['table',    ['table']],
        ['insert',   ['link']],
        ['view',     ['fullscreen', 'codeview', 'undo', 'redo', 'help']]
      ],
    });

    $('.colorpicker').parent().addClass('colorpicker-component').colorpicker();
    $('.select2').select2();

    $('#language-select').select2({
      templateResult:    state => state.id ? $(/* html */`<span><img class="img-flag" src="${ SETTINGS.STATIC_BASE_URL }/img/flags/${ state.element.value.toLowerCase() }.png" /> <span>${ state.text }</span></span>`) : state.text,
      templateSelection: state => state.id ? $(/* html */`<span><img class="img-flag" src="${ SETTINGS.STATIC_BASE_URL }/img/flags/${ state.element.value.toLowerCase() }.png" /> <span class="hidden-xs">${ state.text }</span></span>`) : state.text,
    });

    const dt = $('[data-widget-type="dataTable"]');
    $.extend(true, $.fn.dataTable.defaults, { language: { paginate: { previous: '«', next: '»' } } });
    g3wadmin.ui.before_datatable_callbacks.forEach(f => f(dt));
    dt.DataTable();

    $('#page_user_messages').find('.alert').delay(4000).slideUp(500);

    // update <title> tag
    if (document.querySelector('h1')?.innerText) {
      document.title = `${document.querySelector('h1').innerText} | ` + document.title.toUpperCase();
    }

  });

})();

/***************************************************************************************************************************
 * DEPRECATED plugins
 **************************************************************************************************************************/

(function($) {
  const $on = $.fn.on;
  $.fn.on = function(...args) {
    const event = args[0];
    if (event.match(/ifClicked|ifChanged|ifChecked|ifUnchecked|ifToggled|ifDisabled|ifEnabled|ifIndeterminate|ifDeterminate|ifCreated|ifDestroyed/)) {
      ga.widget.showError(`
<p><b>icheck.js</b> has been removed from core since: <b>G3W-ADMIN v4.0</b></p>
<p>Please update your plugins in order to use <a href="https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/checkbox" target="_blank" style="color: currentColor;text-decoration: underline;">input[type="checkbox"]</a> or <a href="https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/radio" target="_blank" style="color: currentColor;text-decoration: underline;">input[type="radio"]</a></b> instead.</p>
        `);
    }
    return $on.apply(this, args);
  };
})(jQuery);

$.fn.iCheck = $.iCheck = function() {
  ga.widget.showError(`
<p><b>icheck.js</b> has been removed from core since: <b>G3W-ADMIN v4.0</b></p>
<p>Please update your plugins in order to use <a href="https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/checkbox" target="_blank" style="color: currentColor;text-decoration: underline;">input[type="checkbox"]</a> or <a href="https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/radio" target="_blank" style="color: currentColor;text-decoration: underline;">input[type="radio"]</a></b> instead.</p>`);
};

// used by the following plugins: "ogc"
$.fn.jstree = $.jstree = function() {
    ga.widget.showError(`
<p><b>jstree</b> has been removed from core since: <b>G3W-ADMIN v4.0</b></p>
<hr>
<p>Please update your plugins or add this dependecies within your code:</p>
<pre><code>&lt;style&gt;@import url(&apos;https://unpkg.com/jstree@3.3.17/dist/themes/default/style.css&apos;);&lt;/style&gt;
&lt;script&gt;import &apos;https://unpkg.com/jstree@3.3.17/dist/jstree.js&apos;;&lt;/script&gt;</pre></code>`);
};

globalThis._ = globalThis._ || new Proxy({}, {
  get: function() {
    ga.widget.showError(`
<p><b>underscore.js</b> has been removed from core since: <b>G3W-ADMIN v4.0</b></p>
<hr>
<p>Please update your plugins or add this dependecies within your code:</p>
<pre><code>&lt;script&gt;import &apos;https://unpkg.com/underscore@1.9.1/underscore.js&apos;;&lt;/script&gt;</pre></code>`);
  },
});

// used by the following plugins: "billboards", "law", "ps-timeseries", "stress"
$.fn.datepicker = $.datepicker = function() {
    ga.widget.showError(`
<p><b>bootstrap-datepicker (v1.9.0)</b> has been removed from core since: <b>G3W-ADMIN v4.0</b></p>
<p>Please update your plugins in order to use <a href="https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/date" target="_blank" style="color: currentColor;text-decoration: underline;">input[type="date"]</a> or <a href="https://docs.djangoproject.com/en/4.2/ref/forms/widgets/#dateinput" target="_blank" style="color: currentColor;text-decoration: underline;">DateInput(attrs={'type': 'date'})</a> instead.</p>`);
};

// glyphicon.css
(function() {
  const int = setInterval(() => {
    const icon = document.querySelector('.glyphicon');
    if (icon) {
      document.head.appendChild(Object.assign(document.createElement('link'), { rel: 'stylesheet', href: 'https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/css/bootstrap.min.css' }));
      ga.widget.showError(`
<p><b>glyphicons.css</b> has been removed from core since: <b>G3W-ADMIN v4.0</b></p>
<p>Please migrate your plugins to <a href="https://fontawesome.com/v4/icons/" target="_blank" style="color: currentColor;text-decoration: underline;">Font Awesome</a>.</p>
  `);
      clearInterval(int);
    }
  }, 1000);
})();

// ionicons.css
(function() {
  const int = setInterval(() => {
    const icon = document.querySelector('.ion') || document.querySelector('.ionicons');
    if (icon) {
      document.head.appendChild(Object.assign(document.createElement('link'), { rel: 'stylesheet', href: 'https://unpkg.com/ionicons@2.0.1/css/ionicons.css' }));
      ga.widget.showError(`
<p><b>ionicons.css</b> has been removed from core since: <b>G3W-ADMIN v4.0</b></p>
<p>Please migrate your plugins to <a href="https://fontawesome.com/v4/icons/" target="_blank" style="color: currentColor;text-decoration: underline;">Font Awesome</a> or download appropriate svg icons from <a href="https://ionic.io/ionicons" target="_blank" style="color: currentColor;text-decoration: underline;">here</a>.</p>
  `);
      clearInterval(int);
    }
  }, 1000);
})();

// .label-action-layer
(function() {
  const int = setInterval(() => {
    const icon = document.querySelector('.label-action-layer');
    if (icon) {
      ga.widget.showError(`
<p><b>.label-action-layer</b> class has been removed from core since: <b>G3W-ADMIN v4.0</b></p>
<p>Please update your plugins in order to use <b>[data-widget-count]</b> attribute instead.</p>
  `);
      clearInterval(int);
    }
  }, 1000);
})();

// bootstrap-datepicker
(function() {
  const int = setInterval(() => {
    const icon = document.querySelector('.datepicker');
    if (icon) {
      document.querySelectorAll('.datepicker').forEach(el => { el.type = 'date'; el.dir = 'rtl'; el.style.textAlign = 'left'; el.classList.remove('datepicker'); });
      ga.widget.showError(`
<p><b>bootstrap-datepicker (v1.9.0)</b> has been removed from core since: <b>G3W-ADMIN v4.0</b></p>
<p>Please update your plugins in order to use <a href="https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/date" target="_blank" style="color: currentColor;text-decoration: underline;">input[type="date"]</a> or <a href="https://docs.djangoproject.com/en/4.2/ref/forms/widgets/#dateinput" target="_blank" style="color: currentColor;text-decoration: underline;">DateInput(attrs={'type': 'date'})</a> instead.</p>
  `);
      clearInterval(int);
    }
  }, 1000);
})();

// bootstrap-timepicker
(function() {
  const int = setInterval(() => {
    const icon = document.querySelector('.timepicker');
    if (icon) {
      document.querySelectorAll('.timepicker').forEach(el => { el.type = 'time'; el.classList.remove('timepicker'); });
      ga.widget.showError(`
<p><b>bootstrap-timepicker (v0.5.2)</b> has been removed from core since: <b>G3W-ADMIN v4.0</b></p>
<p>Please update your plugins in order to use <a href="https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/time" target="_blank" style="color: currentColor;text-decoration: underline;">input[type="time"]</a> or <a href="https://docs.djangoproject.com/en/4.2/ref/forms/widgets/#dateinput" target="_blank" style="color: currentColor;text-decoration: underline;">DateInput(attrs={'type': 'time'})</a> instead.</p>
  `);
      clearInterval(int);
    }
  }, 1000);
})();
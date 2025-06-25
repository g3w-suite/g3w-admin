/**
 * @file ORIGINAL SOURCE: g3w-admin/core/static/js/g3wadmin/widget.js@v3.9.
 * @since g3w-admin@v4.0
 */

/**
 * Used by the following plugins: "cadastre", "law", "cadastre-camaiore"
 * 
 * Create a modal form with jquery.filer plugin
 * 
 * [data-widget-type="ajaxFiler"]
 */
export default async function ajaxFiler(item) {
  try {
    console.warn('[G3W-ADMIN] ajaxFiler is deprecated'); // please make a your own plugin!

    if ($(item).hasClass('disabled')) {
      return;
    }
    if (undefined === $(item).attr('data-action-url')) {
      throw 'Attribute data-action-url not defined';
    }
    const modal = g3wadmin.ui._buildModal({
      confirmButton: false,
      closeX: false,
      backdrop: 'static',
      modalTitle: $(item).attr('data-modal-title') ?? gettext('Upload file'),
      modalBody: /* html */ `
        <form action="${ $(item).attr('data-action-url') }" method="post" enctype="multipart/form-data">
          ${ $(item).attr('data-item-plus-form') ? ('<div id="plus_filer_input">' + $('#' + $(item).attr('data-item-plus-form')).html() + '</div>') : '' }
          <input type="file" name="files[]" id="filer_input" multiple="multiple">
        </form>`,
      onModalShow: $(item).attr('data-on-modal-show')
    });
    const filer = $(modal.$modal.find('#filer_input'));
    modal.$modal.find('.modal-button-close').on('click', function (e) {
      modal.hide();
      const jFiler = $(modal.$modal.find('#filer_input')).prop('jFiler');
      if (jFiler.current_file?.uploaded) {
        location.reload();
      }
    });
    // modal.show();
    filer.filer({
      changeInput: /* html */ `
        <div class="jFiler-input-dragDrop">
          <div class="jFiler-input-inner">
            <div class="jFiler-input-icon"><i class="icon-jfi-cloud-up-o"></i></div>
            <div class="jFiler-input-text"><h3>${ gettext('Drag&Drop files here') }</h3> <span style="display:inline-block; margin: 15px 0">or</span></div>
            <a class="jFiler-input-choose-btn blue">${ gettext('Browse Files') }</a>
          </div>
        </div>`,
      showThumbs: true,
      limit: 1,
      extensions: (undefined === $(item).attr('data-file-extensions') ? null : $(item).attr('data-file-extensions').split('|')),
      theme: "dragdropbox",
      captions: {
        button: "Choose Files",
        feedback: "Choose files To Upload",
        feedback2: "files were chosen",
        drop: "Drop file here to Upload",
        removeConfirmation: "Are you sure you want to remove this file?",
        errors: {
          filesLimit: "Only {{fi-limit}} files are allowed to be uploaded.",
          filesType: "Only Images are allowed to be uploaded.",
          filesSize: "{{fi-name}} is too large! Please upload file up to {{fi-fileMaxSize}} MB.",
          filesSizeAll: "Files you've choosed are too large! Please upload files up to {{fi-maxSize}} MB.",
          folderUpload: "You are not allowed to upload folders."
        }
      },
      dragDrop: {
        dragEnter: null,
        dragLeave: null,
        drop: null,
      },
      templates: {
        box: /* html */ `<ul class="jFiler-items-list jFiler-items-grid"></ul>`,
        item: /* html */ `
          <li class="jFiler-item">
            <div class="jFiler-item-container">
              <div class="jFiler-item-inner">
                <div class="jFiler-item-thumb">
                  <div class="jFiler-item-status"></div>
                  <div class="jFiler-item-info">
                    <span class="jFiler-item-title"><b title="{{fi-name}}">{{fi-name | limitTo: 25}}</b></span>
                    <span class="jFiler-item-others">{{fi-size2}}</span>
                  </div>
                  {{fi-image}}
                </div>
                <div class="jFiler-item-assets jFiler-row">
                  <ul class="list-inline pull-left"><li>{{fi-progressBar}}</li></ul>
                  <ul class="list-inline pull-right"><li><a class="icon-jfi-trash jFiler-item-trash-action"></a></li></ul>
                </div>
              </div>
            </div>
          </li>`,
        itemAppend: /* html */ `
          <li class="jFiler-item">
            <div class="jFiler-item-container">
              <div class="jFiler-item-inner">
                <div class="jFiler-item-thumb">
                  <div class="jFiler-item-status"></div>
                  <div class="jFiler-item-info">
                    <span class="jFiler-item-title"><b title="{{fi-name}}">{{fi-name | limitTo: 25}}</b></span>
                    <span class="jFiler-item-others">{{fi-size2}}</span>
                  </div>
                  {{fi-image}}
                </div>
                <div class="jFiler-item-assets jFiler-row">
                <ul class="list-inline pull-left"><li><span class="jFiler-item-others">{{fi-icon}}</span></li></ul>
                <ul class="list-inline pull-right"><li><a class="icon-jfi-trash jFiler-item-trash-action"></a></li></ul>
              </div>
            </div>
            </div>
          </li>`,
        progressBar: /* html */ `<div class="bar"></div>`,
        itemAppendToEnd:    false,
        removeConfirmation: true,
        _selectors: {
          list:        '.jFiler-items-list',
          item:        '.jFiler-item',
          progressBar: '.bar',
          remove:      '.jFiler-item-trash-action'
        }
      },
      uploadFile: {
        url: $(item).attr('data-action-url'),
        data: { csrfmiddlewaretoken: $.cookie('csrftoken') },
        type: 'post',
        enctype: 'multipart/form-data',
        beforeSend() {
          if (undefined !== $(item).attr('data-item-plus-form')) {
            const inputs = $('#plus_filer_input').find(':input').serializeArray();
            for (id in inputs) {
              arguments[7].data.append(inputs[id]['name'], inputs[id]['value']); // arguments[7] = upload
            }
            modal.$modal.find('.modal-button-close').prop('disabled', (i, v) => !v);
          }
        },
        success(data, el) {
          const parent = el.find(".jFiler-jProgressBar").parent();
          el.find(".jFiler-jProgressBar").fadeOut("slow", function () {
            $(/* html */ `<div class="jFiler-item-others text-success"><i class="icon-jfi-check-circle"></i> Success</div>`).hide().appendTo(parent).fadeIn("slow");
          });
          el.after(data)
          if (undefined !== $(item).attr('data-item-plus-form')) {
            modal.$modal.find('.modal-button-close').prop('disabled', (i, v) => !v);
          }
        },
        error(el) {
          const errMsg = (arguments[6].responseJSON?.errors) ?? arguments[6].responseText;
          const parent = el.find(".jFiler-jProgressBar").parent();
          el.find(".jFiler-jProgressBar").fadeOut("slow", function () {
            $(/* html */ `<div class="jFiler-item-others text-error"><i class="icon-jfi-minus-circle"></i> Error</div>`).hide().appendTo(parent).fadeIn("slow");
            const $errMsg = $('<div class="callout callout-danger"></div>');
            $errMsg.append($('<h4>' + gettext('ERROR') + '</h4>'));
            $errMsg.append($('<p></p>').html(errMsg));
            el.after($errMsg);
          });
          if (undefined !== $(item).attr('data-item-plus-form')) {
            modal.$modal.find('.modal-button-close').prop('disabled', (i, v) => !v);
          }
        },
      }
    });
    modal.show();
  } catch (e) {
    ga.widget.showError(e.message)
  }
}
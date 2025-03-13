/**
 * Created  Walter Lorenzetti on 2020
 */
(function () {

  const { SITE_PREFIX_URL, FRONTEND } = SETTINGS;

  const ADMIN_URL_PATH = FRONTEND ? 'admin/' : '';

  // Add Qplotly widget
  // --------------------------------

  Object.assign(g3wadmin.widget, {

    /*
    Build singlelayer constraints table
     */
    _qplotlyWidgetTable: function (layer_pk, project_pk, res) {
      var $div = $('<div style="margin-left:40px;">');

      // add new constraint btn
      $newConstraint = $('<a href="#" class="btn btn-default"><i class="fa fa-plus-circle"></i> ' + gettext('New qplotly widget') + '</a>');
      $newConstraint.on('click', function () {
        ga.widget._qplotlyWidgetForm($newConstraint, null,
          {
            'modal-title': gettext('New qplotly widget'),
            'layer_pk': layer_pk,
            'project_pk': project_pk,
            'new': true,
            'parent_click': $(this)
          });
      });
      $div.append($newConstraint);

      // add table contraints saved
      var $table = $('<table class="table">');
      var $tbody = $table.append($('<tbody>'));
      $table.append(/* html */ `
          <thead>
            <tr>
              <th style="width:180px;">${gettext('Actions')}</th>
              <th>${gettext('Active on startup')}</th>
              <th>${gettext('Title')}</th>
              <th>${gettext('Type')}</th>
              <th>${gettext('From project')}</th>
              <th>${gettext('Linked')}</th>
            </tr>
          </thead>`);

      // add constraints
      var constraint_res = {};
      $.each(res['results'], function (k, v) {
        constraint_res[v.pk] = v;
        $tbody.append(/* html */ `
            <tr id="qplotlywidget-item-${v.pk}">
              <td style="display: flex; flex-wrap: wrap; gap: 0 10px; font-size: 1.25em;">
                <a
                  style="display:${v.rule_count > 0 ? 'none' : 'display'}"
                  href="#"
                  data-toggle="tooltip"
                  title="${gettext('Edit')}"
                  data-qplotlywidget-action-mode="update"
                  data-qplotlywidget-pk="${v.pk}"
                  data-qplotlywidget-layer-id="${layer_pk}"
                >
                  <i class="fa fa-pencil"></i>
                </a>
                <a
                  href="#" 
                  data-toggle="tooltip" 
                  title="${gettext('Delete')}" 
                  data-widget-type="deleteItem" 
                  data-delete-url="/${SITE_PREFIX_URL}qplotly/api/widget/detail/${project_pk}/${v.pk}/"
                  data-item-selector="#qplotlywidget-item-${v.pk}"
                  data-delete-method="delete"
                >
                  <i class="fa fa-trash" style="color:red;"></i>
                </a>
                <a
                  style="display:${v.rule_count > 0 ? 'none' : 'display'}"
                  href="/${SETTINGS.CURRENT_LANGUAGE_CODE}/${SITE_PREFIX_URL}${ADMIN_URL_PATH}qplotly/download/xml/${v.pk}/" 
                  data-toggle="tooltip" 
                  title="${gettext('Download')}"
                >
                  <i class="fa fa-download"></i>
                </a>
              </td>
              <td>
                <input
                  type="checkbox"
                  name="show_on_start_client"
                  value="1"
                  ${v.show_on_start_client ? 'checked' : ''}
                  class="skip-icheck"
                  onchange="fetch('/${SETTINGS.CURRENT_LANGUAGE_CODE}/${SITE_PREFIX_URL}${ADMIN_URL_PATH}qplotly/showonstartclient/${v.pk}/' + (event.target.checked ? '' : '?show=0')).catch(g3wadmin.widget.showError)"
                />
              </td>
              <td>${v.title}</td>
              <td>${v.type}</td>
              <td>${v.project ? '<span class="fa fa-check-circle" style="color: #ffa500"></span>' : ''}</td>
              <td>
                <input
                  type="checkbox"
                  name="linked"
                  value="1"
                  ${($.inArray(parseInt(layer_pk), v.layers) != -1) ? 'checked' : ''}
                  data-widget-type="linkWidget2Layer"
                  data-ajax-url="/${SETTINGS.CURRENT_LANGUAGE_CODE}/${SITE_PREFIX_URL}${ADMIN_URL_PATH}qplotly/layer/${layer_pk}/widgets/link/${v.pk}/"
                />
              </td>
            </tr>`);
      });

      // add actions to elements action
      $tbody.find('[data-qplotlywidget-action-mode="update"]').on('click', function (e) {
        ga.widget._qplotlyWidgetForm($newConstraint, constraint_res[$(this).attr('data-qplotlywidget-pk')], {
          'modal-title': gettext('Update widget'),
          'layer_pk': layer_pk,
          'project_pk': project_pk,
          'new': false,
          'parent_click': $(this)
        });
      });
      $div.append($table);
      return $div;
    },

    //function to read and set input[name="xml"] value
    _readQplotlyXmlFile: function (evt) {
      const reader = new FileReader();
      const file = evt.target.files[0];
      const filename = file.name;
      reader.onload = (evt) => {
        const data = evt.target.result;
        $('input[name="xml"]').val(data);
        $('#xml_plot_filename').text(filename).show();
      };
      reader.readAsText(file);
    },

    _qplotlyWidgetForm: function ($item, res, params) {
      const modal = ga.currentModal = g3wadmin.ui._buildModal({
        modalTitle: params['modal-title'] ?? gettext('Form title'),
        modalBody: /* html */ `
          <form action="/${SITE_PREFIX_URL}qplotly/api/widget/${params.new ? `layer/${params.layer_pk}/` : `detail/${params.project_pk}/${res.pk}/`}" id="form-qplotlywidget-${params.layer_pk}">
            <div class="form-errors"></div>
            <input type="hidden" name="xml" value="" />
            <div class="form-group" style="text-align: center">
              <div class="controls qq-upload-button-selector" style="position: relative; padding: 10px;">
                <input class="form-control" id="load_xml_plot" accept=".xml" title="" name="xml_file" type="file" style="top:0; left:0; cursor:pointer;opacity:0; width:100%; position:absolute; height: 100%;" />
                <h4>${gettext('Upload DataPlotly configuration xml file')}</h4>
                <div>
                  <i class="fa fa-upload fa-3x"  aria-hidden="true"></i>
                </div>
              </div>
              <span id="xml_plot_filename" style="display: none;"></span>
            </div>
          </form>`,
        modalSize: params['modal-size'] ?? '',
      });

      modal.data.$evoker = $item;

      // parent_click based on new or update
      $item = params.new
        ? params.parent_click.parents('tr').prev().find('[data-widget-type="qplotlyWidgetList"]')
        : $(params.parent_click.parents('table')[0]).parents('tr').prev().find('[data-widget-type="qplotlyWidgetList"]');


      // set action for confirm btn
      var form = new ga.forms.form(modal.$modal.find('form'));
      var input_xml_plot = $(form.$form[0]).find('#load_xml_plot');
      $(input_xml_plot).on('change', ga.widget._readQplotlyXmlFile);

      // Refresh tr main table layer qplotly widget list
      form.successAction = e => {
        ga.widget.qplotlyWidgetList($item.parents('table').DataTable(), $item, true);
        modal.hide();
      };

      // set error form action
      form.errorAction = (xhr, msg) => {
        var err_data = xhr.responseJSON['error'];
        var $ediv = $(form.$form[0]).find('.form-errors');
        $ediv.html('');
        $ediv.append('<h4 class="badge bg-red">' + err_data['message'] + '</h4>');

        // add field errors message:
        if (undefined !== err_data['data']['non_field_errors']) {
          for (n in err_data['data']['non_field_errors']) {
            $ediv.append('<br /><span>' + err_data['data']['non_field_errors'][n] + '</span>');
          }
        }

      };

      modal.$modal.find('.modal-button-confirm').on('click', function (e) {
        var dt = form.getData('array');

        dt.layers = [params.layer_pk];

        form.sendData(e, params.new ? 'post' : 'put', JSON.stringify(dt), 'application/json; charset=UTF-8');
      });

      modal.show();

      // populate form in update
      if (!params.new) {
        $.each(res, function (key, val) {
          modal.$modal.find('[name=' + key + ']').val(val);
        });
      }
    },

    qplotlyWidgetList: function ($datatable, $item, refresh = false) {

      try {

        const params = {
          'qplotlywidget-list-url': $item[0].getAttribute('data-qplotlywidget-list-url'),
          'qplotlywidget-layer-pk': $item[0].getAttribute('data-qplotlywidget-layer-pk'),
          'qplotlywidget-project-pk': $item[0].getAttribute('data-qplotlywidget-project-pk'),
        };

        if (undefined === params['qplotlywidget-list-url']) {
          throw new Error('Attribute data-qplotlywidget-list-url not defined');
        }

        var tr = $item.closest('tr');
        var row = $datatable.row(tr);

        var getDetail = function () {
          $.ajax({
            method: 'get',
            url: params['qplotlywidget-list-url'],
            success: function (res) {
              row.child(
                g3wadmin.widget._qplotlyWidgetTable(params['qplotlywidget-layer-pk'], params['qplotlywidget-project-pk'], res)
              ).show();
            },
            complete: function () {
              var status = arguments[1];
              if (status == 'success') {
                ga.ui.initRadioCheckbox(row.child());
              }
            },
            error: function (xhr, status, message) {
              ga.widget.showError(`<h3>${xhr.status ?? 500}</h3><p>${message || ''}</p>`);
            }
          });
        }

        if (refresh) {
          getDetail();
        } else {
          if (row.child.isShown()) {
            tr.removeClass('details');
            row.child.hide();
          } else {
            tr.addClass('details');

            // ajax call to get detail data
            getDetail();
          }
        }

      } catch (e) {
        this.showError(e.message);
      }
    }

  });

  // activate widget: append to ga.ui.before_datatable_callbacks for to cala it before DatTable init
  ga.ui.before_datatable_callbacks.push(($widget) => {
    $widget.find('[data-widget-type="qplotlyWidgetList"]').on('click', function (e) {
      ga.widget.qplotlyWidgetList($(this).parents('table').DataTable(), $(this));
    });
  });

})();
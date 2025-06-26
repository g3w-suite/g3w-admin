/**
 * @file ORIGINAL SOURCE:  g3w-admin/qplotly/static/qplotly/js/widget.js@v3.9.
 * @since g3w-admin@v3.10.0
 */

const { SITE_PREFIX_URL, FRONTEND } = SETTINGS;

// TODO: we can safely remove this when ".magic-checkbox" will be deprecated
document.head.insertAdjacentHTML('beforeend', `<style>
  .qplotly input[type="checkbox"] { accent-color: #1abc9c; width: 1.25em; aspect-ratio: 1; }
  .qplotly :is(th, td)            { padding: 8px; }
</style>`);

/**
 * [data-widget-type="qplotlyWidgetList"]
 */
export default async function qplotlyWidgetList($datatable, $item, refresh = false) {
  try {

    if (!SETTINGS.G3WADMIN_LOCAL_MORE_APPS.includes('qplotly')) {
      return;
    }

    const url = $item.attr('data-qplotlywidget-list-url');
    if (undefined === url) {
      throw new Error('data-qplotlywidget-list-url is not defined');
    }

    const tr = $item.closest('tr');
    const row = $datatable.row(tr);

    if (!(!!refresh || !row.child.isShown())) {
      row.child.hide();
      return;
    }

    const res = await (await fetch(url)).json();

    // Build plots table
    const layer_pk = $item.attr('data-qplotlywidget-layer-pk');
    const project_pk = $item.attr('data-qplotlywidget-project-pk');

    const $div = $(/* html */`
      <div class="qplotly" style="margin-left:40px;">
        <!-- add new plot -->
        <a href="#" class="btn btn-default btn-add-new-plot"><i class="fa fa-plus-circle"></i> ${gettext('New qplotly widget')}</a>
        <!-- saved plots -->
        <p class="text-muted"><small>* ${gettext('Position options is valid for children layers of a relation')}</small></p>
        <table style="width: 100%;">
          <thead>
          <tr>
            <th style="width:180px;">${gettext('Actions')}</th>
            <th>${gettext('Active on startup')}</th>
            <th>${gettext('Position')}*</th>
            <th>${gettext('Title')}</th>
            <th>${gettext('Type')}</th>
            <th>${gettext('From project')}</th>
            <th>${gettext('Linked')}</th>
          </tr>
        </thead>
        <tbody>
          ${res.results.map(v => /* html */ `
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
                  href="/${SETTINGS.CURRENT_LANGUAGE_CODE}/${SITE_PREFIX_URL}${FRONTEND ? 'admin/' : ''}qplotly/download/xml/${v.pk}/" 
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
                  onchange="fetch('/${SETTINGS.CURRENT_LANGUAGE_CODE}/${SITE_PREFIX_URL}${FRONTEND ? 'admin/' : ''}qplotly/showonstartclient/${v.pk}/' + (event.target.checked ? '' : '?show=0')).catch(g3wadmin.widget.showError)"
                />
              </td>
              <td>
                <select 
                  id       = "'qplotly-show-position-'${v.pk}"
                  class    = "form-control select2 "
                  onchange = "fetch('/${SETTINGS.CURRENT_LANGUAGE_CODE}/${SITE_PREFIX_URL}${FRONTEND ? 'admin/' : ''}qplotly/showposition/${v.pk}/', { method: 'POST',  headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ value: event.target.value }),  }).catch(g3wadmin.widget.showError)"
                >
                  <option value = "sidebarquery" ${'sidebarquery' === v.show_position ? 'selected' : ''}>Sidebar, Query</option>
                  <option value = "sidebar"      ${'sidebar'      === v.show_position ? 'selected' : ''}>Sidebar</option>
                  <option value = "query"        ${'query'        === v.show_position ? 'selected' : ''}>Query</option>
                </select>
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
                  onchange="fetch('/${SETTINGS.CURRENT_LANGUAGE_CODE}/${SITE_PREFIX_URL}${FRONTEND ? 'admin/' : ''}qplotly/layer/${layer_pk}/widgets/link/${v.pk}/' + (event.target.checked ? '' : '?unlink=unlink')).catch(g3wadmin.widget.showError)"
                />
              </td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    `);

    // attach events
    $div.on("click", ".btn-add-new-plot, [data-qplotlywidget-action-mode='update']", async function (e) {
      if ($(this).is('.btn-add-new-plot') || $(this).is('[data-qplotlywidget-action-mode="update"]')) {
        const PLOT = res.results.find(v => `${v.pk}` === $(this).attr("data-qplotlywidget-pk"));

        const modal = ga.currentModal = g3wadmin.ui._buildModal({
          modalTitle: gettext(PLOT ? 'Update widget' : 'New qplotly widget'),
          modalBody: /* html */ `
            <form action="/${SITE_PREFIX_URL}qplotly/api/widget/${PLOT?.pk ? `detail/${project_pk}/${PLOT?.pk}/` : `layer/${layer_pk}/`}" id="form-qplotlywidget-${layer_pk}">
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
        });
  
        modal.data.$evoker = $item;
  
        const form     = modal.$modal.find('form')[0];
        const g3w_form = Object.assign(new ga.forms.form($(form)), {
          successAction: e => { qplotlyWidgetList($datatable, $item, true); modal.hide(); },
          errorAction: (xhr, msg) => {
            form.querySelector('.form-errors').innerHTML = /* html */`
              <h4 class="badge bg-red">${xhr.responseJSON.error.message}</h4>
              ${(xhr.responseJSON.error.data.non_field_errors || []).map(e => `<p>${e}</p>`).join('')}
            `;
          }
        });

        $('input[name="xml"]').val(PLOT?.xml || '');
        
        // read and set input[name="xml"] value
        $(form).find('[name="xml_file"]').on('change', function (evt) {
          const reader = new FileReader();
          const file = evt.target.files[0];
          const filename = file.name;
          reader.onload = (evt) => {
            const data = evt.target.result;
            $('input[name="xml"]').val(data);
            $('#xml_plot_filename').text(filename).show();
          };
          reader.readAsText(file);
        });
      
        modal.$modal.find('.modal-button-confirm').on('click', function (e) {
          g3w_form.sendData(e, PLOT ? 'put' : 'post', JSON.stringify(Object.assign(g3w_form.getData('array'), { layers: [layer_pk] })), 'application/json; charset=UTF-8');
        });

        modal.show();

        // init form
        Object.entries(PLOT || {}).forEach(([k,v]) => modal.$modal.find('[name=' + k + ']').val(v)); // TODO: check if superflous
      }
    });

    row.child($div).show();
  } catch (e) {
    g3wadmin.widget.showError(e.message);
  }
}
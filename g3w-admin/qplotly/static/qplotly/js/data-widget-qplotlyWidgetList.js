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
            <th>${gettext('Active at startup')}</th>
            <th>${gettext('Position')}*</th>
            <th>${gettext('Title')}</th>
            <th>${gettext('Type')}</th>
            <th>${gettext('Linked')}</th>
          </tr>
        </thead>
        <tbody>
          ${res.map(v => /* html */ `
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
                <a
                  style="display:${v.rule_count > 0 ? 'none' : 'display'}"
                  href="#"
                  data-toggle="tooltip" 
                  title="${gettext('Related widgets')}"
                  data-qplotlywidget-action-mode="related"
                  data-qplotlywidget-pk="${v.pk}"
                  data-qplotlywidget-layer-id="${layer_pk}"
                >
                  <i class="fa fa-sitemap"></i>
                </a>
              </td>
              <td>
                <input
                  type="checkbox"
                  name="show_on_start_client"
                  value="1"
                  data-qplotlywidget-pk="${v.pk}"
                  ${v.show_on_start_client ? 'checked' : ''}
                  onchange="fetch('/${SETTINGS.CURRENT_LANGUAGE_CODE}/${SITE_PREFIX_URL}${FRONTEND ? 'admin/' : ''}qplotly/showonstartclient/${v.pk}/' + (event.target.checked ? '' : '?show=0')).catch(g3wadmin.widget.showError)"
                />
              </td>
              <td>
                <select 
                  id                    = "'qplotly-show-position-'${v.pk}"
                  data-qplotlywidget-pk = "${v.pk}"
                  class                 = "form-control select2 "
                  onchange = "fetch('/${SETTINGS.CURRENT_LANGUAGE_CODE}/${SITE_PREFIX_URL}${FRONTEND ? 'admin/' : ''}qplotly/showposition/${v.pk}/', { method: 'POST',  headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ value: event.target.value }),  }).catch(g3wadmin.widget.showError)"
                >
                  <option value = "sidebarquery" ${'sidebarquery' === v.show_position ? 'selected' : ''}>Sidebar, Query</option>
                  <option value = "sidebar"      ${'sidebar'      === v.show_position ? 'selected' : ''}>Sidebar</option>
                  <option value = "query"        ${'query'        === v.show_position ? 'selected' : ''}>Query</option>
                </select>
              </td>
              <td>${v.title}</td>
              <td>${v.type}</td>
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

    // shared: re-fetch free widget PKs and hide/show sitemap buttons accordingly
    const refreshButtonsVisibility = async () => {
      const notTargetPks = new Set(
        (await fetch(`/${SITE_PREFIX_URL}qplotly/api/widget/free/${project_pk}/${layer_pk}/`).then(r => r.json())).map(String)
      );
      $div.find('[data-qplotlywidget-action-mode="related"]').each(function () {
        const pk = $(this).attr('data-qplotlywidget-pk');
        const isVisible = notTargetPks.has(pk);
        $(this).toggle(isVisible);
        $div.find(`input[name="show_on_start_client"][data-qplotlywidget-pk="${pk}"]`).toggle(isVisible);
        $div.find(`select[data-qplotlywidget-pk="${pk}"]`).toggle(isVisible);
      });
    };

    $div.on("click", ".btn-add-new-plot, [data-qplotlywidget-action-mode='update']", async function (e) {
      if ($(this).is('.btn-add-new-plot') || $(this).is('[data-qplotlywidget-action-mode="update"]')) {
        const PLOT = res.find(v => `${v.pk}` === $(this).attr("data-qplotlywidget-pk"));

        const modal = ga.currentModal = g3wadmin.ui._buildModal({
          modalTitle: gettext(PLOT ? 'Update widget' : 'New qplotly widget'),
          modalBody: /* html */ `
            <form action="/${SITE_PREFIX_URL}qplotly/api/widget/${PLOT?.pk ? `detail/${project_pk}/${PLOT?.pk}/` : `layer/${layer_pk}/`}" id="form-qplotlywidget-${layer_pk}" class="qplotly-new-widget-form">
              <div class="qplotly-new-widget-shell">
                <div class="form-errors"></div>
                <input type="hidden" name="xml" value="" />

                <div class="qplotly-intro">
                  <i class="fa fa-area-chart"></i>
                  <div>
                    <strong>${gettext(PLOT ? 'Update qplotly widget' : 'New qplotly widget')}</strong>
                    <span>${gettext('Upload a DataPlotly configuration XML file to build the chart widget for this layer.')}</span>
                  </div>
                </div>

                <div class="form-group qplotly-dropzone">
                  <label class="controls qq-upload-button-selector qplotly-dropzone-inner" for="load_xml_plot">
                    <input class="form-control qplotly-dropzone-input" id="load_xml_plot" accept=".xml" title="" name="xml_file" type="file" />
                    <i class="fa fa-upload" aria-hidden="true"></i>
                    <strong>${gettext('Click to browse or drop your .xml file')}</strong>
                    <span>${gettext('Only DataPlotly XML files are accepted')}</span>
                  </label>
                  <div id="xml_plot_filename" class="qplotly-filename" style="display: none;"></div>
                </div>
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

    $div.on("click", "[data-qplotlywidget-action-mode='related']", async function (e) {
      e.preventDefault();
      const PLOT = res.find(v => `${v.pk}` === $(this).attr("data-qplotlywidget-pk"));
      const relatedReadUrl = `/${SITE_PREFIX_URL}qplotly/api/widget/related/${PLOT.pk}/${PLOT.project}/`;
      const relatedWriteUrl = `/${SITE_PREFIX_URL}qplotly/api/widget/related/${PLOT.pk}/`;

      // widgets available as targets: fetched from dedicated API endpoint
      const availableUrl = `/${SITE_PREFIX_URL}qplotly/api/widget/related/${PLOT.pk}/available/${PLOT.project}/`;
      const fetchAvailable = () => fetch(availableUrl).then(r => r.json());

      const buildTable = (relatedWidgets) => /* html */ `
        <table class="table table-bordered table-condensed" style="width:100%">
          <thead>
            <tr>
              <th style="width:20px;"></th>
              <th>${gettext('Title')}</th>
              <th>${gettext('Type')}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${relatedWidgets.length === 0
              ? /* html */`<tr><td colspan="4" class="text-center text-muted">${gettext('No related widgets')}</td></tr>`
              : relatedWidgets.map(w => /* html */`
                <tr id="related-widget-row-${w.id}" data-related-pk="${w.id}">
                  <td class="drag-handle" style="cursor:grab; color:#aaa;"><i class="fa fa-bars"></i></td>
                  <td>${w.title || '-'}</td>
                  <td>${w.type  || '-'}</td>
                  <td>
                    ${w.id !== PLOT.pk ? /* html */`
                    <a href="#" class="btn btn-xs btn-danger btn-remove-related" data-related-target-pk="${w.id}">
                      <i class="fa fa-trash"></i>
                    </a>` : ''}
                  </td>
                </tr>`).join('')
            }
          </tbody>
        </table>`;

      // fetch current related widgets and available widgets in parallel
      const [related, available] = await Promise.all([
        fetch(relatedReadUrl).then(r => r.json()),
        fetchAvailable(),
      ]);

      const buildSelect = (availableWidgets) =>
        `<option value="">${gettext('Select a widget...')}</option>` +
        availableWidgets.map(w => `<option value="${w.id}">${w.title || w.id} (${w.type || '-'})</option>`).join('');

      await refreshButtonsVisibility();

      const modal = ga.currentModal = g3wadmin.ui._buildModal({
        modalTitle: gettext('Related widgets'),
        confirmButton: false,
        modalBody: /* html */`
          <div id="related-widgets-container">
            ${buildTable(related)}
          </div>
          <hr/>
          <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
            <select class="form-control" id="related-widget-select" style="flex:1; min-width:150px;">
              ${buildSelect(available)}
            </select>
            <button class="btn btn-primary btn-sm" id="btn-add-related">
              <i class="fa fa-plus"></i> ${gettext('Add')}
            </button>
          </div>`,
      });


      const initSortable = () => {
        const $container = modal.$modal.find('#related-widgets-container tbody');
        $container.sortable({
            handle: '.drag-handle',
            axis: 'y',
            update() {
            const rows = modal.$modal.find('#related-widgets-container tbody tr[data-related-pk]');
            rows.toArray().map((tr, i) =>
                fetch(relatedWriteUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ target: parseInt($(tr).attr('data-related-pk')), project: parseInt(PLOT.project), order: i }),
                })
            )
            },
        });
        };

      const refreshSelect = async () => {
        const freshAvailable = await fetchAvailable();
        modal.$modal.find('#related-widget-select').html(buildSelect(freshAvailable));
      };

      const refreshTable = async () => {
        const updated = await (await fetch(relatedReadUrl)).json();
        modal.$modal.find('#related-widgets-container').html(buildTable(updated));
        await refreshButtonsVisibility();
        initSortable();
        await refreshSelect();
      };

      modal.$modal.on('click', '.btn-remove-related', async function (e) {
        e.preventDefault();
        const targetPk = $(this).attr('data-related-target-pk');
        try {
          await fetch(`/${SITE_PREFIX_URL}qplotly/api/widget/related/${PLOT.pk}/${targetPk}/${PLOT.project}/`, { method: 'DELETE' });
          await refreshTable();
        } catch (err) {
          g3wadmin.widget.showError(err.message);
        }
      });

      modal.$modal.on('click', '#btn-add-related', async function (e) {
        e.preventDefault();
        const targetPk = modal.$modal.find('#related-widget-select').val();
        if (!targetPk) return;
        const nextOrder = modal.$modal.find('#related-widgets-container tbody tr[data-related-pk]').length;
        try {
          await fetch(relatedWriteUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ target: parseInt(targetPk), project: parseInt(PLOT.project), order: nextOrder }),
          });
          await refreshTable();
        } catch (err) {
          g3wadmin.widget.showError(err.message);
        }
      });

      modal.$modal.on('shown.bs.modal', initSortable);
      modal.show();
    });

    row.child($div).show();

    await refreshButtonsVisibility();

  } catch (e) {
    g3wadmin.widget.showError(e.message);
  }
}
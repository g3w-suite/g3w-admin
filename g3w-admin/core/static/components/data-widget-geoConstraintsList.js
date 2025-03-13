/**
 * @file ORIGINAL SOURCE: g3w-admin/qdjango/static/qdjango/js/widget.js@v3.9.
 * @since g3w-admin@v4.0
 */

const { SITE_PREFIX_URL, G3WADMIN_LOCAL_MORE_APPS } = globalThis.SETTINGS;

/**
 * [data-widget-type="geoConstraintsList"]
 */
export async function geoConstraintsList($datatable, $item, refresh) {
  try {
    const url = $item.attr("data-geoconstraints-list-url");
    if (undefined === url) {
      throw new Error("data-geoconstraints-list-url not defined")
    }

    const tr = $item.closest("tr");
    const row = $datatable.row(tr);

    if (!(!!refresh || !row.child.isShown())) {
      row.child.hide();
      return;
    }
    

    // get saved geoconstraints
    const res = await (await fetch(url)).json();

    const $div = $(/* html */`
      <div style="margin-left:40px;">
        <!-- add new geoconstraint -->
        <a href="#" class="btn btn-default btn-add-new-geoconstraint">
          <i class="fa fa-plus-circle"></i>
          ${gettext("New geo constraint")}
        </a>
        <!-- saved geoconstraints -->
        <table style="width: 100%;">
          <thead>
            <tr>
              <th style="width:180px;">${gettext("Actions")}</th>
              <th>${gettext("Layer constraint")}</th>
              <th>${gettext("Description")}</th>
              ${G3WADMIN_LOCAL_MORE_APPS.includes("editing") ? '<th>' + gettext("For visualization") + '</th>' : ''}
              ${G3WADMIN_LOCAL_MORE_APPS.includes("editing") ? '<th>' + gettext("For editing") + '</th>'       : ''}
              <th>${gettext("Autozoom")}</th>
              <th>${gettext("Rules count")}</th>
            </tr>
          </thead>
          <tbody>
            ${res.results.map(v => /* html */`
              <tr id="constraint-item-${v.pk}">
                <td style="display: flex; flex-wrap: wrap; gap: 0 10px;">
                  <a
                    href                           = "#"
                    data-toggle                    = "tooltip"
                    data-placement                 = "top"
                    title                          = "${ gettext("Manage geo-constaints")}"
                    data-geoconstraint-action-mode = "rules"
                    data-geoconstraint-context     = "${(v.for_view ? 'v' : '') + (v.for_editing ? 'e' : '')}"
                    data-geoconstraint-pk          = "${v.pk}"
                  >
                    <i class="fa fa-lg fa-cubes" style="color:purple;"></i>
                  </a>
                  ${ v.constraint_rule_count <= 0 ? /* html */`
                    <a
                      href                           = "#"
                      data-geoconstraint-action-mode = "update"
                      data-geoconstraint-pk          = "${v.pk}"
                      data-geoconstraint-layer-id    = "${$item.attr("data-geoconstraints-layer-pk")}"
                      data-geoconstraint-context     = "${(v.for_view ? 'v' : '') + (v.for_editing ? 'e' : '')}"
                    >
                      <i class="fa fa-lg fa-pencil"></i>
                    </a>` : ''}
                  <a
                    href               = "#"
                    data-widget-type   = "deleteItem" 
                    data-delete-url    = "/${SITE_PREFIX_URL}qdjango/api/geoconstraint/detail/${v.pk}/"
                    data-item-selector = "#constraint-item-${v.pk}"
                    data-delete-method = "delete"
                  >
                    <i class="fa fa-lg fa-trash" style="color:red;"></i>
                  </a>
                </td>
                <td>${v.constraint_layer_name}</td>
                <td>${v.description}</td>
                ${G3WADMIN_LOCAL_MORE_APPS.includes("editing") ? '<td>' + (v.for_view ? '<span class="fa fa-check-circle" style="color: orange"></span>' : '') + '</td>'    : '' }
                ${G3WADMIN_LOCAL_MORE_APPS.includes("editing") ? '<td>' + (v.for_editing ? '<span class="fa fa-check-circle" style="color: orange"></span>' : '') + '</td>' : '' }
                <td>${v.autozoom ? '<span class="fa fa-check-circle" style="color: orange"></span>' : ''}</td>
                <td>${v.constraint_rule_count}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `);

    // attach events
    $div.on("click", ".btn-add-new-geoconstraint, [data-geoconstraint-action-mode='update'], [data-geoconstraint-action-mode='rules']", async function (e) {

      if ($(this).is('.btn-add-new-geoconstraint') || $(this).is('[data-geoconstraint-action-mode="update"]')) {
        const GEOCONSTRAINT_RULE = res.results.find(v => `${v.pk}` === $(this).attr("data-geoconstraint-pk"));

        // open modal to show list of add links
        const modal = g3wadmin.currentModal = g3wadmin.ui._buildModal({
          modalTitle: gettext(GEOCONSTRAINT_RULE ? "Update constraint" : "New constraint"),
          modalBody: /* html */`
            <form
              action="/${SITE_PREFIX_URL}qdjango/api/geoconstraint${GEOCONSTRAINT_RULE ? `/detail/${GEOCONSTRAINT_RULE.pk}` : ''}/"
              id="form-constraint-${$item.attr("data-geoconstraints-layer-pk")}"
            >
              <input type="hidden" name="layer" value="${$item.attr("data-geoconstraints-layer-pk")}" />
              <input type="hidden" name="active" value="${GEOCONSTRAINT_RULE?.active ?? '1' }" />
              <h4>${gettext("Select the constraint layer, only Polygon or MultiPolygon geometry")}:</h4>
              <p class="controls">
                <label>${gettext("Constraint layer")}</label>
                <select name="constraint_layer" class="select form-control">
                  ${(await (await fetch(`/${SITE_PREFIX_URL}qdjango/api/info/layer/polygon/${$item.attr("data-geoconstraints-layer-pk")}/`)).json()).results.map(val => /* html */`
                    <option value="${val.pk}" ${val.pk == GEOCONSTRAINT_RULE?.constraint_layer && ["spatialite", "postgres", "ogr", "oracle"].includes(val.layer_type) ? 'selected' : ''}>
                      ${val.name}
                    </option>
                  `).join()}
                </select>
              </p>
              <p class="controls">
                <label>${gettext("Description")}</label>
                <textarea class="form-control" name="description" style="width:100%;" rows="4">${GEOCONSTRAINT_RULE?.description || '' }</textarea>
              </p>
              <p ${G3WADMIN_LOCAL_MORE_APPS.includes("editing") ? '' : 'hidden'}>
                <label><input type="checkbox" name="for_view" ${GEOCONSTRAINT_RULE ? (GEOCONSTRAINT_RULE.for_view ? 'checked' : '') : 'checked'}> ${gettext("Active for visualization")}</label>
              </p>
              <p ${G3WADMIN_LOCAL_MORE_APPS.includes("editing") ? '' : 'hidden'}>
                <label><input type="checkbox" name="for_editing" ${GEOCONSTRAINT_RULE?.for_editing ? 'checked' : ''}> ${gettext("Active for editing")}</label>
              </p>
              <p>
                <label><input type="checkbox" name="autozoom" ${GEOCONSTRAINT_RULE?.autozoom ? 'checked' : ''}> ${gettext("Autozoom on map bootstrap")}</label>
              </p>
          </form>
          `,
        });

        modal.data.$evoker = $item

        // parent_click based on new or update
        // set action for confirm btn
        const form = Object.assign(new ga.forms.form(modal.$modal.find("form")), {
          successAction: e => { geoConstraintsList($datatable, $item, true); modal.hide(); }
        });
        modal.$modal.find('.modal-button-confirm').on('click', e => { form.sendData(e, GEOCONSTRAINT_RULE ? "put" : "post") });

        modal.show();
      }

      if ($(this).is('[data-geoconstraint-action-mode="rules"]')) {
        const SAVED_RULES = [undefined].concat((await (await fetch(`/${SITE_PREFIX_URL}qdjango/api/georule/geoconstraint/${$(this).attr("data-geoconstraint-pk")}/`)).json()).results);
        const USERS       = (await (await fetch(`/${SITE_PREFIX_URL}qdjango/api/info/layer/user/${$item.attr("data-geoconstraints-layer-pk")}/?context=${$(this).attr("data-geoconstraint-context")}`)).json()).results;
        const GROUPS      = (await (await fetch(`/${SITE_PREFIX_URL}qdjango/api/info/layer/authgroup/${$item.attr("data-geoconstraints-layer-pk")}/?context=${$(this).attr("data-geoconstraint-context")}`)).json()).results;

        // build modal
        const modal = g3wadmin.ui._buildModal({
          modalTitle: gettext("Geo Constraint Rules"),
          modalBody: /* html */ `
            <div class="rules-list">
              ${SAVED_RULES.map(res => /* html */`
                ${res ? '' : `<template>`}
                <form
                  action="/${SITE_PREFIX_URL}qdjango/api/georule${
                    res
                      ? "/detail/" + res.pk                                       /* PUT */
                      : "/geoconstraint/" + $(this).attr("data-geoconstraint-pk") /* POST */
                    }/"
                  id="#constraint-rule-${ res?.pk ?? 'new' }"
                  style="display: grid; grid-template-columns: .25fr 1fr .1fr;gap: 25px; border-top: 1px solid gray; padding-bottom: 3em;"
                >
                  <div class="form-errors" style="grid-column: 1 / -1; color: #f00;"></div>
                  <input type="hidden" name="pk" value="${ res?.pk ?? 'new' }" />
                  <input type="hidden" name="constraint" value="${ $(this).attr("data-geoconstraint-pk") }" />
                  <div>
                    <div class="controls">
                      <label>Viewer</label>
                      <select name="user" class="select form-control">
                        <option value="">---------</option>
                        ${USERS.map(v => /* html */`<option value="${v.pk}" ${ res?.user == v.pk ? 'selected' : '' }>${v.first_name} ${v.last_name}(${v.username})</option>`).join('')}
                      </select>
                    </div>
                    <div class="controls">
                      <label>User viewer group</label>
                      <select name="group" class="select form-control">
                        <option value="">---------</option>
                        ${GROUPS.map(v => /* html */`<option value="${v.pk}" ${ res?.group == v.pk ? 'selected' : '' }>${v.name}</option>`).join('')}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label>SQL</label>
                    <div class="controls ">
                      <textarea name="rule" style="width:100%;" rows="4">${res?.rule ?? ''}</textarea>
                    </div>
                  </div>
                  <div>
                    <a href="#" class="bt-rule-save" data-toggle="tooltip" data-placement="top" title="${gettext("Save")}">
                      <i class="fa fa-2x fa-save"></i>
                    </a>&nbsp;
                    <a href="#" class="bt-rule-delete" data-toggle="tooltip" data-placement="top" title="${gettext("Delete")}">
                      <i class="fa fa-2x fa-trash" style="color: red;"></i>
                    </a>
                  </div>
                </form>
                ${res ? '' : `</template>`}
              `).join('')}
            </div>
            <div class="text-center">
              <button type="button" class="btn btn-success add-rule">
                <i class="fa fa-plus"></i> ${gettext("Add")}
              </button>
            </div>
          `,
          modalSize: "modal-lg",
          confirmButton: false,
        })

        modal.$modal.on('click', async e => {
          // add new rule
          if (e.target.closest('.add-rule')) {
            modal.$modal.find('.rules-list').append(modal.$modal[0].querySelector('template').content.cloneNode(true));
          }

          if (!e.target.closest('form')) {
            return;
          }

          const form     = e.target.closest('form');
          const pk       = form.querySelector('[name="pk"]').value;
          const g3w_form = form['_g3w_form_' + pk] = form['_g3w_form_' + pk] || Object.assign(new g3wadmin.forms.form($(form)), {
            successAction: fres => {
              form.querySelector('.form-errors').innerHTML = `<h4 class="badge bg-green">${gettext("Saved")}</h4>`;
              setTimeout(() => form.querySelector('.form-errors').innerHTML = '', 1200)
              // transform in a update mode, update pk put value and action
              if ('new' === pk) {
                g3w_form.$form.attr('action', `/${SITE_PREFIX_URL}qdjango/api/georule/detail/${fres.pk}/`);
                form.querySelector('[name="pk"]').value = fres.pk;
              }
            },
            errorAction: (xhr, msg) => {
              form.querySelector('.form-errors').innerHTML = `
                <h4 class="badge bg-red">${xhr.responseJSON.error.message}</h4>
                ${(xhr.responseJSON.error.data.non_field_errors || []).map(e => `<p>${e}</p>`).join('')}
              `;
            }
          });

          // update rule
          if (e.target.closest('.bt-rule-save')) {
            g3w_form.sendData.apply(g3w_form, 'new' === pk ? undefined : [e, "put"])
          }

          // delete rule
          if (e.target.closest('.bt-rule-delete')) {
            'new' !== pk && await fetch(`/${SITE_PREFIX_URL}qdjango/api/georule/detail/${pk}/`, { method: 'DELETE' });
            form.remove();
          }
        });

        // on modal close refresh parent constraints list
        modal.$modal.on("hidden.bs.modal", () => geoConstraintsList($datatable, $item, true));

        modal.show()
      }
    });

    row.child($div).show();

  } catch (e) {
    ga.widget.showError(e.message)
  }
}
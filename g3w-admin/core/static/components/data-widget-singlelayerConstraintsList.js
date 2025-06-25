/**
 * @file ORIGINAL SOURCE: g3w-admin/qdjango/static/qdjango/js/widget.js@v3.9.
 * @since g3w-admin@v4.0
 */

const { SITE_PREFIX_URL, G3WADMIN_LOCAL_MORE_APPS } = globalThis.SETTINGS;

/**
 * [data-widget-type="singlelayerConstraintsList"]
 */
export async function singlelayerConstraintsList($datatable, $item, refresh) {
  try {
    const url = $item.attr('data-singlelayerconstraints-list-url');
    if (undefined === url) {
      throw new Error("data-singlelayerconstraints-list-url not defined")
    }

    const tr = $item.closest("tr");
    const row = $datatable.row(tr);

    if (!(!!refresh || !row.child.isShown())) {
      row.child.hide();
      return;
    }

    // get saved constraints
    const res = await (await fetch(url)).json();

    const $div = $(/* html */`
      <div style="margin-left:40px;">
        <!-- add new geoconstraint -->
        <a href="#" class="btn btn-default btn-add-single-constraint">
          <i class="fa fa-plus-circle"></i>
          ${gettext("New alphanumeric constraints")}
        </a>
        <!-- saved contraints  -->
        <table>
          <thead>
            <tr>
              <th style="width:180px;">${gettext("Actions")}</th>
              <th>${gettext("Name")}</th>
              <th>${gettext("Description")}</th>
              ${G3WADMIN_LOCAL_MORE_APPS.includes("editing") ? '<th>' + gettext("For visualization") + '</th>' : ''}
              ${G3WADMIN_LOCAL_MORE_APPS.includes("editing") ? '<th>' + gettext("For editing") + '</th>'       : ''}
              <th>${gettext("Subset rules count")}</th>
              <th>${gettext("Expression rules count")}</th>
            </tr>
          </thead>
          <tbody>
            ${res.results.map(v => /* html */`
              <tr id="singlelayerconstraint-item-${v.pk}">
                <td style="display: flex; flex-wrap: wrap; gap: 0 10px;">
                  <a
                    href="#"
                    data-toggle                            = "tooltip"
                    data-placement                         = "top"
                    title                                  = "${ gettext("Provider's language / SQL dialect Rules")}"
                    data-singlelayerconstraint-context     = "${(v.for_view ? 'v' : '') + (v.for_editing ? 'e' : '')}"
                    data-singlelayerconstraint-action-mode = "subset_rules"
                    data-singlelayerconstraint-pk          = "${v.pk}"
                  >
                    <i class="fa fa-lg fa-cubes" style="color: purple;"></i>
                  </a>
                  <a
                    href                                   = "#"
                    data-toggle                            = "tooltip"
                    data-placement                         = "top"
                    title                                  = "${ gettext("QGIS Expression Rules")}"
                    data-singlelayerconstraint-context     = "${(v.for_view ? 'v' : '') + (v.for_editing ? 'e' : '')}"
                    data-singlelayerconstraint-action-mode = "expression_rules"
                    data-singlelayerconstraint-pk          = "${v.pk}"
                  >
                    <img height="24" width="24" src="${SETTINGS.STATIC_BASE_URL}svg/mIconExpression_orange.svg" />
                  </a>
                  </span>
                  ${ v.rule_count <= 0 ? /* html */`
                    <a
                      ${v.rule_count > 0 ? 'hidden' : ''}
                      href                                   = "#"
                      data-singlelayerconstraint-action-mode = "update"
                      data-singlelayerconstraint-pk          = "${v.pk}"
                      data-singlelayerconstraint-context     = "${(v.for_view ? 'v' : '') + (v.for_editing ? 'e' : '')}"
                      data-singlelayerconstraint-layer-id    = "${$item.attr('data-singlelayerconstraints-layer-pk')}"
                    >
                      <i class="fa fa-lg fa-pencil"></i>
                    </a>` : ''}
                  <a
                    href               = "#"
                    data-widget-type   = "deleteItem"
                    data-delete-url    = "/${ SITE_PREFIX_URL }qdjango/api/constraint/detail/${v.pk}/"
                    data-item-selector = "#singlelayerconstraint-item-${v.pk}"
                    data-delete-method = "delete"
                  >
                    <i class="fa fa-lg fa-trash" style="color:red;"></i>
                  </a>
                </td>
                <td>${v.name}</td>
                <td>${v.description}</td>
                ${G3WADMIN_LOCAL_MORE_APPS.includes("editing") ? '<td>' + (v.for_view ? '<span class="fa fa-check-circle" style="color: orange"></span>' : "") + '</td>'    : ''}
                ${G3WADMIN_LOCAL_MORE_APPS.includes("editing") ? '<td>' + (v.for_editing ? '<span class="fa fa-check-circle" style="color: orange"></span>' : "") + '</td>' : ''}
                <td>${v.subset_rule_count}</td>
                <td>${v.expression_rule_count}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `);

    // attach events
    $div.on("click", ".btn-add-single-constraint, [data-singlelayerconstraint-action-mode='update'], [data-singlelayerconstraint-action-mode='subset_rules'], [data-singlelayerconstraint-action-mode='expression_rules']", async function (e) {

      if ($(this).is('.btn-add-single-constraint') || $(this).is('[data-singlelayerconstraint-action-mode="update"]')) {
        const CONSTRAINT_RULE = res.results.find(v => `${v.pk}` === $(this).attr("data-singlelayerconstraint-pk"));

        // open modal to show list of add links
        const modal = g3wadmin.currentModal = g3wadmin.ui._buildModal({
          modalTitle: gettext(CONSTRAINT_RULE ? "Update alphanumeric constraint" : "New alphanumeric constraints"),
          modalBody: /* html */`
            <form
              action="/${SITE_PREFIX_URL}qdjango/api/constraint${ CONSTRAINT_RULE ? `/detail/${CONSTRAINT_RULE.pk}`  : ""}/"
              id="form-singlelayerconstraint-${$item.attr('data-singlelayerconstraints-layer-pk')}"
            >
              <input type="hidden" name="layer" value="${$item.attr('data-singlelayerconstraints-layer-pk')}" />
              <input type="hidden" name="active" value="${CONSTRAINT_RULE?.active ?? '1' }" />
              <h4>${ gettext("Set a name and a possible description for the alphanumeric constraint")}:</h4>
              <p class="controls">
                <label>${gettext("Name")}</label>
                <input class="form-control" name="name" style="width:100%;" value="${CONSTRAINT_RULE?.name || '' }" />
              </p>
              <p class="controls">
                <label>${ gettext("Description")}</label>
                <textarea class="form-control" name="description" style="width:100%;" rows="4">${CONSTRAINT_RULE?.description || '' }</textarea>
              </p>
              <p ${G3WADMIN_LOCAL_MORE_APPS.includes("editing") ? '' : 'hidden'}>
                <label><input type="checkbox" name="for_view" ${CONSTRAINT_RULE ? (CONSTRAINT_RULE.for_view ? 'checked' : '') : 'checked'}> ${gettext("Active for visualization")}</label>
              </p>
              <p ${G3WADMIN_LOCAL_MORE_APPS.includes("editing") ? '' : 'hidden'}>
                <label><input type="checkbox" name="for_editing" ${CONSTRAINT_RULE?.for_editing ? 'checked' : ''}> ${gettext("Active for editing")}</label>
              </p>
            </form>
          `,
        })

        modal.data.$evoker = $item

        const form = Object.assign(new ga.forms.form(modal.$modal.find("form")), {
          successAction: e => { singlelayerConstraintsList($datatable, $item, true); modal.hide(); }
        })
        modal.$modal.find('.modal-button-confirm').on('click', e => { form.sendData(e, CONSTRAINT_RULE ? "put" : "post") });

        modal.show();
      }
      
      if ($(this).is('[data-singlelayerconstraint-action-mode="subset_rules"]') || $(this).is('[data-singlelayerconstraint-action-mode="expression_rules"]')) {
        const type = $(this).is('[data-singlelayerconstraint-action-mode="subset_rules"]') ? "subset" : "expression";

        const SAVED_RULES = [undefined].concat((await (await fetch(`/${SITE_PREFIX_URL}qdjango/api/${ 'subset' === type ? 'subsetstringrule' : 'expressionrule' }/constraint/${$(this).attr("data-singlelayerconstraint-pk")}/`)).json()).results);
        const USERS       = (await (await fetch(`/${SITE_PREFIX_URL}qdjango/api/info/layer/user/${$item.attr('data-singlelayerconstraints-layer-pk')}/?context=${$(this).attr("data-singlelayerconstraint-context")}`)).json()).results;
        const GROUPS      = (await (await fetch(`/${SITE_PREFIX_URL}qdjango/api/info/layer/authgroup/${$item.attr('data-singlelayerconstraints-layer-pk')}/?context=${$(this).attr("data-singlelayerconstraint-context")}`)).json()).results;

          // build moodal
        const modal = g3wadmin.ui._buildModal({
          modalTitle: gettext("subset" === type ? "Constraint Rules based on provider's language / SQL dialect" : "Constraint Rules based on QGIS Expression"),
          modalBody: /* html */ `
            <div class="intro" style="margin-bottom: 20px;">
              ${gettext("subset" === type ? "Define, for each user and/or group of users, viewing/editing rules based on the QGIS expressions." : "Define, for each user and/or group of users, viewing/editing rules based on the language or SQL dialect of the associated provider.")}
            </div>
            <div class="rules-list">
              ${SAVED_RULES.map(res => /* html */`
                ${res ? '' : `<template>`}
                <form
                  action="/${SITE_PREFIX_URL}qdjango/api/${ 'subset' === type ? 'subsetstringrule' : 'expressionrule' }${
                    res
                      ? "/detail/" + res.pk                                            /* PUT */
                      : "/constraint/" + $(this).attr("data-singlelayerconstraint-pk") /* POST */
                    }/"
                  id="#constraint-rule-${ res?.pk ?? 'new' }"
                  style="display: grid; grid-template-columns: .25fr 1fr .1fr;gap: 25px; border-top: 1px solid gray; padding-bottom: 3em;"
                >
                  <div class="form-errors" style="grid-column: 1 / -1; color: #f00;"></div>
                  <input type="hidden" name="pk" value="${res?.pk ?? 'new' }" />
                  <input type="hidden" name="constraint" value="${$(this).attr("data-singlelayerconstraint-pk")}" />
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
                    <label>${type == "subset" ? "SQL" : gettext("QGIS Expression")}</label>
                    <div class="controls">
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
                <i class="fa fa-plus"></i> ${ gettext("Add") }
              </button>
            </div>
          `,
          modalSize: "modal-lg",
          confirmButton: false,
        });

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
                g3w_form.$form.attr('action', `/${SITE_PREFIX_URL}qdjango/api/${ 'subset' === type ? 'subsetstringrule' : 'expressionrule' }/detail/${fres.pk}/`);
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
            'new' !== pk && await fetch(`/${SITE_PREFIX_URL}qdjango/api/${ 'subset' === type ? 'subsetstringrule' : 'expressionrule' }/detail/${pk}/`, { method: 'DELETE' });
            form.remove();
          }

        });

        // on modal close refresh parent constraints list
        modal.$modal.on("hidden.bs.modal", () => { singlelayerConstraintsList($datatable, $item, true) });

        modal.show()
      }

    });

    row.child($div).show();

  } catch (e) {
    ga.widget.showError(e.message)
  }
}
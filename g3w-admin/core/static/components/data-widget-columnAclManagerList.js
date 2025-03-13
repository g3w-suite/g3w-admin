/**
 * @file ORIGINAL SOURCE: g3w-admin/qdjango/static/qdjango/js/widget.js@v3.9.
 * @since g3w-admin@v4.0
 */

const { SITE_PREFIX_URL } = globalThis.SETTINGS;

/**
 * [data-widget-type="columnAclManagerList"]
 */
export async function columnAclManagerList($datatable, $item, refresh) {
  try {
    const url = $item.attr("data-column-acl-list-url");
    if (undefined === url) {
      throw new Error("data-column-acl-list-url not defined")
    }

    if (undefined === $item.attr('data-column-acl-layer-pk')) {
      throw new Error("data-column-acl-layer-pk not defined")
    }
  
    const tr = $item.closest("tr")
    const row = $datatable.row(tr)

    if (!(!!refresh || !row.child.isShown())) {
      row.child.hide();
      return;
    }

    // get saved rules
    const res = await (await fetch(url)).json();

    const $div = $(/* html */ `
      <div style="margin-left:40px;">
        <!-- add new rule -->
        <a href="#" class="btn btn-default btn-add-new-acl">
          <i class="fa fa-plus-circle"></i>
          ${gettext("Create New Column Level Constraint")}
        </a>
        <!-- saved rules -->
        <table style="width: 100%;">
          <thead>
            <tr>
              <th style="width:180px;">${gettext("Actions")}</th>
              <th>${gettext("User")}</th>
              <th>${gettext("Group")}</th>
              <th>${gettext("Restricted Fields")}</th>
            </tr>
          </thead>
          <tbody>
            ${(res.results || []).map(v => /* html */`
              <tr>
                <td style="display: flex; flex-wrap: wrap; gap: 0 10px;">
                  <a
                    href                        = "#"
                    data-toggle                 = "tooltip" data-placement="top"
                    title                       = "${gettext("Delete Column Level Constraint from the layer.")}"
                    data-column-acl-pk          = "${v.pk}"
                    data-column-acl-action-mode = "delete"
                  >
                    <i class="fa fa-lg fa-trash" style="color:red;"></i>
                  </a>
                  <a
                    href                        = "#"
                    data-column-acl-pk          = "${v.pk}"
                    data-toggle                 = "tooltip" data-placement="top"
                    title                       = "${gettext("Edit Column Level Constraint.")}"
                    data-column-acl-action-mode = "edit"
                    data-column-acl-rule        = '${JSON.stringify(v)}'
                  >
                    <i class="fa fa-lg fa-pencil"></i>
                  </a>
                </td>
                <td>${v.username}</td>
                <td>${v.groupname}</td>
                <td>${v.restricted_fields}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `);
  
    // attach events
    $div.on("click", ".btn-add-new-acl, [data-column-acl-action-mode='edit'], [data-column-acl-action-mode='delete']", async function (e) {
      try {

        if ($(this).is('[data-column-acl-action-mode="delete"]')) {
          // open modal to confirm delete
          const modal = g3wadmin.ui._buildModal({
            modalTitle: gettext("Delete Column Level Constraint"),
            modalBody: `${gettext("Are you sure to delete column constraint")} #<strong>${$(e.currentTarget).attr("data-column-acl-pk")}</strong>?`,
            closeButtonText: "No",
          })
          modal.$modal.find('.modal-button-confirm').on('click', function () {
            $.ajax({
              method: "delete",
              url: "/" + SITE_PREFIX_URL + "qdjango/api/column_acl/detail/" + $(e.currentTarget).attr("data-column-acl-pk") + "/",
              success() { columnAclManagerList($datatable, $item, true); modal.hide(); },
              error(xhr, status, message) { ga.widget.showError(`<h3>${ xhr.status ?? 500 }</h3><p>${ (xhr?.responseJSON?.error?.message) || message || '' }</p>`) },
            })
          })
          modal.show()
          return;
        }

        // false = new rule
        const ACL_RULE = $(this).hasClass('btn-add-new-acl') ? false : JSON.parse($(this).attr("data-column-acl-rule"));

        let modal = g3wadmin.currentModal = g3wadmin.ui._buildModal({
          modalTitle: ACL_RULE ? `${gettext("Edit Column Level Constraint.")}#${ACL_RULE.pk}` : gettext("Create a new Column Level Constraint."),
          modalBody: /* html */`
            <form
              action="${ACL_RULE ? `/${SITE_PREFIX_URL}qdjango/api/column_acl/detail/${ACL_RULE.pk}/` : $item.attr('data-column-acl-list-url')}"
              id="form-new-column-acl-${$item.attr('data-column-acl-layer-pk')}"
            >
              <input type="hidden" name="pk" value="${ACL_RULE ? ACL_RULE.pk : ''}">
              <input type="hidden" name="layer" value="${$item.attr('data-column-acl-layer-pk')}">
              <div class="form-errors"></div>
              <div class="info">${gettext(ACL_RULE ? "Edit Column Level Constraint." : "Define hidden columns for a user or a group.")}</div>
              <div class="form-group">
                <label>${gettext("User (required if group is not set)")}</label>
                <div class="controls ">
                  <select class="form-select" name="user" style="width:100%;">
                    <option value="">---</option>
                    ${(await (await fetch($item.attr('data-info-layer-user'))).json()).results.map(value => /* html */`<option value="${value.pk}" ${ACL_RULE?.user === value.pk ? 'selected' : ''}>${value.username}</option>`).join('')}
                  </select>
                </div>
              </div>
              <div class="form-group">
                <label>${gettext("Group (required if user is not set)")}</label>
                <div class="controls">
                  <select class="form-select" name="group" style="width:100%;">
                    <option value="">---</option>
                    ${(await (await fetch($item.attr('data-info-layer-authgroup'))).json()).results.map(value => /* html */`<option value="${value.pk}" ${ACL_RULE?.group === value.pk ? 'selected' : ''}>${value.name}</option>`).join('')}
                  </select>
                </div>
              </div>
              <div class="form-group">
                <label>${gettext("Hidden Fields (required)")}</label>
                <div class="controls ">
                  <select class="form-select" multiple placeholder="${gettext("Select the hidden fields")}" required name="restricted_fields" style="width:100%;">
                    ${(await (await fetch($item.attr('data-column-acl-fields-url'))).json()).field_names.map(value => /* html */`<option value="${value}" ${ACL_RULE?.restricted_fields?.includes(value) ? 'selected' : ''}>${value}</option>`).join('')}
                  </select>
                </div>
              </div>
            </form>
          `,
        });

        modal.data.$evoker = $div.find('.btn-add-new-acl');

        // parent_click based on new or update
        const form = new ga.forms.form(modal.$modal.find("form"))
        form.successAction = e => { columnAclManagerList($datatable, $item, true); modal.hide(); };

        modal.$modal.find('.modal-button-confirm').on('click', function (e) {
          let dt = form.getData("array")
          dt.restricted_fields = form.$form.serializeArray().filter(v => v.name === "restricted_fields").map(v => v.value);
          
          // Validate
          form.$form.find(".form-errors").html(`
            ${ dt.user == "" && dt.group == "" ? `<h4 class="badge bg-red">${gettext("You must select a 'group' or a 'user'!")}</h4>`: '' }
            ${ dt.user != "" && dt.group != "" ? `<h4 class="badge bg-red">${gettext("You cannot select both a 'group' and a 'user': they are mutually exclusive!")}</h4>`: '' }
            ${ !dt.restricted_fields.length    ? `<h4 class="badge bg-red">${gettext("Hidden Fields is required!")}</h4>` : '' }
          `);

          if (!form.$form.find(".form-errors").children().length) {
            form.sendData(e, ACL_RULE ? "patch" : "post", JSON.stringify(dt), "application/json; charset=UTF-8")
          }
        });

        modal.show();

        modal.$modal.find('[name="user"],[name="group"],[name="restricted_fields"]').select2();

      } catch (e) {
        g3wadmin.widget.showError(e);
      }
    });

    row.child($div).show();

  } catch (e) {
    ga.widget.showError(e.message)
  }
}
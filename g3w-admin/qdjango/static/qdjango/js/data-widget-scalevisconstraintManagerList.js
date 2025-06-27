/**
 * @file Display the Scale visibility layer list
 * @since g3w-admin@v3.10.0
 */
export async function scalevisconstraintManagerList($datatable, $item, refresh) {
  try {
    const url = $item.attr('data-scalevisconstraint-list-url');

    if (undefined === url) {
      throw new Error("Attribute scalevisconstraint-list-url not defined")
    }

    const tr = $item.closest("tr");
    const row = $datatable.row(tr);

    if (!(!!refresh || !row.child.isShown())) {
      row.child.hide();
      return;
    }

    // get saved styles
    const res = await (await fetch(url)).json();

    const $div = $(/* html */`
      <div style="margin-left:40px;">
        <!-- add new style -->
        <a href="#" class="btn btn-sm btn-default btn-add-constraint">
          <i class="ion ion-plus-circled"></i> ${gettext("Create New Scale Visibility Layer Constraint")}
        </a>
        <!-- saved styles -->
        <table class="table">
          <thead>
            <tr>
              <th style="width:180px;">${gettext("Actions")}</th>
              <th>${gettext("User")}</th>
              <th>${gettext("Group")}</th>
              <th>${gettext("Minscale")}</th>
              <th>${gettext("Maxscale")}</th>
            </tr>
          </thead>
          <tbody>
            ${res.results.map(v => /* html */`
              <tr>
                <td>
                  <span class="col-xs-2 icon">
                    <a
                      href                                = "#"
                      data-toggle                         = "tooltip"
                      data-placement                      = "top"
                      title                               = "${gettext("Delete Scale Visibility Layer Constraint from the layer.")}"
                      data-scalevisconstraint-pk          = "${v.pk}"
                      data-scalevisconstraint-action-mode = "delete"
                    >
                      <i class="ion ion-fa ion-trash-b"></i>
                    </a>
                  </span>
                  <span class="col-xs-2 icon">
                    <a
                      href                                = "#"
                      data-scalevisconstraint-pk          = "${v.pk}"
                      data-toggle                         = "tooltip"
                      data-placement                      = "top"
                      title                               = "${gettext("Edit Scale Visibility Layer Constraint.")}"
                      data-scalevisconstraint-action-mode = "edit"
                      data-scalevisconstraint-record      = '${JSON.stringify(v).replaceAll("'", "'")}'
                    >
                      <i class="ion ion-edit"></i>
                    </a>
                  </span>
                </td>
                <td>${v.username}</td>
                <td>${v.groupname}</td>
                <td>${v.minscale}</td>
                <td>${v.maxscale}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
    `);

    // attach events
    $div.on("click", ".btn-add-constraint, [data-scalevisconstraint-action-mode='delete'], [data-scalevisconstraint-action-mode='edit']", async function (e) {

      // ADD or EDIT constraint
      if ($(this).is('.btn-add-constraint') || $(this).is('[data-scalevisconstraint-action-mode="edit"]')) {
        const SAVED_CONSTRAINT = $(e.currentTarget).data("scalevisconstraint-record")

        const modal = (ga.currentModal = ga.ui.buildDefaultModal({
          modalTitle: SAVED_CONSTRAINT ? gettext("Edit Scale Visibility Layer Constraint.") + "#" + SAVED_CONSTRAINT.pk : gettext("Create a new Scale Visibility Layer Constraint."),
          modalBody: /* html */`
            <form
              action="${SAVED_CONSTRAINT ? `/${SITE_PREFIX_URL}qdjango/api/scalevisconstraint/detail/${SAVED_CONSTRAINT.pk}/` : $item.attr('data-scalevisconstraint-list-url')}"
              id="form-new-scalevisconstraint-${$item.attr('data-scalevisconstraint-layer-pk')}"
            >
              <input type="hidden" name="pk" value="${SAVED_CONSTRAINT?.pk}">
              <input type="hidden" name="layer" value="${$item.attr('data-scalevisconstraint-layer-pk')}">
              <div class="form-errors"></div>
              <div class="row">
                <div class="col-md-12">
                  <p class="info">${SAVED_CONSTRAINT ? gettext("Edit Scale Visibility Layer Constraint.") : gettext("Define minscale and maxscale for a user or a group.")}</p>

                  <div class="form-group">
                    <label class="control-label ">${gettext("User (required if group is not set)")}</label>
                    <div class="controls ">
                      <select class="form-select" name="user" style="width: 100%">
                        <option value="">---</option>
                        ${ (await (await fetch($item.attr('data-info-layer-user'))).json()).results.map(user => `<option value="${user.pk}" ${user.pk === SAVED_CONSTRAINT?.user ? 'selected' : ''}>${user.username}</option>`).join('') }
                      </select>
                    </div>
                  </div>

                  <div class="form-group">
                    <label class="control-label ">${gettext("Group (required if user is not set)")}</label>
                    <div class="controls">
                      <select class="form-select" name="group" style="width: 100%">
                      <option value="">---</option>
                        ${ (await (await fetch($item.attr('data-info-layer-authgroup'))).json()).results.map(group => `<option value="${group.pk}" ${group.pk === SAVED_CONSTRAINT?.group ? 'selected' : ''}>${group.name}</option>`).join('') }
                      </select>
                    </div>
                  </div>

                  <div class="form-group">
                    <label class="control-label ">${gettext("Min scale")}</label>
                    <div class="controls ">
                      <input class="form-control" type="number" value="${SAVED_CONSTRAINT?.minscale ?? ''}" required name="minscale" />
                    </div>
                  </div>

                  <div class="form-group">
                    <label class="control-label ">${gettext("Max scale")}</label>
                    <div class="controls ">
                      <input class="form-control" type="number" value="${SAVED_CONSTRAINT?.maxscale ?? ''}" required name="maxscale" />
                    </div>
                  </div>

                </div>
              </div>
            </form>`,
        }))

        modal.data.$evoker = $item;

        // set action for confirm btn
        const form = Object.assign(new ga.forms.form(modal.$modal.find("form")), {
          successAction: e => { scalevisconstraintManagerList($datatable, $item, true); modal.hide(); },
        });

        modal.$modal.find('.modal-button-confirm').on('click', function (e) {
          let dt = form.getData("array");

          // Validate
          form.$form.find(".form-errors").html(`
            ${ '' == dt.user && '' == dt.group        ? `<h4 class="badge bg-red">${gettext("You must select a 'group' or a 'user'!")}</h4>`: '' }
            ${ '' != dt.user && '' != dt.group        ? `<h4 class="badge bg-red">${gettext("You cannot select both a 'group' and a 'user': they are mutually exclusive!")}</h4>`: '' }
            ${ '' == dt.minscale || '' == dt.maxscale ? `<h4 class="badge bg-red">${gettext("The 'maxscale' and/or 'minscale' fields cannot be empty!")}</h4>` : '' }
            ${ dt.minscale < dt.maxscale ? `<h4 class="badge bg-red">${gettext("The 'maxscale' can not be less than the 'minscale'!")}</h4>` : '' }
          `);

          if (!form.$form.find(".form-errors").children().length) {
            form.sendData(e, SAVED_CONSTRAINT ? "patch" : "post", JSON.stringify(dt), "application/json; charset=UTF-8")
          }
        });

        modal.show()

        modal.$modal.find('[name="user"]').select2()
        modal.$modal.find('[name="group"]').select2()
      }

      // DELETE constraint
      if ($(this).is('[data-scalevisconstraint-action-mode="delete"]')) {
        const modal = ga.ui.buildDefaultModal({
          modalTitle: gettext("Delete Scale Visibility Layer Constraint"),
          modalBody: `${gettext("Are you sure to delete constraint")} #<strong>${$(e.currentTarget).attr("data-scalevisconstraint-pk")}</strong>?`,
          closeButtonText: "No",
        })
        modal.$modal.find('.modal-button-confirm').on('click', async function() {
          try {
            await fetch(
              `/${SITE_PREFIX_URL}qdjango/api/scalevisconstraint/detail/${$(e.currentTarget).attr("data-scalevisconstraint-pk")}/`,
              { method: 'DELETE' }
            );
            modal.hide();
            scalevisconstraintManagerList($datatable, $item, true)
          } catch (e) {
            ga.widget.showError(e.message || e);
          }
        });
        modal.show()
      }

    });

    row.child($div).show();

    ga.ui.initRadioCheckbox(row.child());
  } catch (e) {
    ga.widget.showError(e.message || e)
  }
}
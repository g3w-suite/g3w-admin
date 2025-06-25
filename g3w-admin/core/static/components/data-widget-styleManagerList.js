/**
 * @file ORIGINAL SOURCE: g3w-admin/qdjango/static/qdjango/js/widget.js@v3.9.
 * @since g3w-admin@v4.0
 */

/**
 * [data-widget-type="styleManagerList"]
 */
export async function styleManagerList($datatable, $item, refresh) {
  try {
    const url = $item.attr('data-stylemanager-list-url');
    if (undefined === url) {
      throw new Error("Attribute data-stylemanager-list-url not defined")
    }

    const tr = $item.closest("tr");
    const row = $datatable.row(tr);

    if (!(!!refresh || !row.child.isShown())) {
      row.child.hide();
      return;
    }

    // get saved styles
    const res = await (await fetch(url)).json();

    let $div = $(/* html */`
      <div style="margin-left:40px;">
        <!-- add new style -->
        <a href="#" class="btn btn-default btn-add-style">
          <i class="fa fa-plus-circle"></i>
          ${gettext("Create New Style From QML")}
        </a>
        <!-- saved styles -->
        <table class="table">
          <thead>
            <tr>
              <th style="width:180px;">${gettext("Actions")}</th>
              <th>${gettext("Name")}</th>
              <th>${gettext("Current")}</th>
            </tr>
          </thead>
          <tbody>
            ${res.styles.map(v => /* html */`
              <tr>
                <td style="display: flex; flex-wrap: wrap; gap: 0 10px;">
                  ${res.styles.length > 1  ? /* html */`
                    <a
                      href                   = "#"
                      data-toggle            = "tooltip"
                      data-placement         = "top"
                      title                  = "${gettext("Delete style from the layer.")}"
                      data-style-name        = "${v.name}"
                      data-style-action-mode = "delete"
                    >
                      <i class="fa fa-lg fa-trash" style="color:red;"></i>
                    </a>`: ''}
                  <a
                    href                   = "#"
                    data-style-name        = "${v.name}"
                    data-toggle            = "tooltip"
                    data-placement         = "top"
                    title                  = "${gettext("Edit style name or replace the style QML.")}"
                    data-style-action-mode = "edit"
                  >
                    <i class="fa fa-lg fa-pencil"></i>
                  </a>
                </td>
                <td>${v["name"]}</td>
                <td>
                  <input
                    name                   = "current"
                    data-style-action-mode = "make_current"
                    value                  = "${v.name}"
                    type                   = "radio"
                    ${v.current ? 'checked' : ''}
                  />
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
    `);

    // attach events
    $div.on("click", ".btn-add-style, [data-style-action-mode='delete'], [data-style-action-mode='edit'], [data-style-action-mode='make_current']", async function (e) {

      if ($(this).is('.btn-add-style') || $(this).is('[data-style-action-mode="edit"]')) {
        const STYLE_NAME = $(this).is('.btn-add-style') ? '' : $(e.currentTarget).attr("data-style-name");

        const modal = g3wadmin.currentModal = g3wadmin.ui._buildModal({
          modalTitle: STYLE_NAME ? (gettext("Edit Style") + " " + $(e.currentTarget).attr("data-style-name")) : gettext("New Style From QML"),
          modalBody: /* html */`
            <form
              action="${STYLE_NAME ? ($item.attr('data-stylemanager-list-url') + $(e.currentTarget).attr("data-style-name") + "/") : $item.attr('data-stylemanager-list-url')}"
              id="form-newstyle-${$item.attr('data-stylemanager-layer-pk')}"
            >
              <div class="form-errors"></div>
              <input type="hidden" name="qml" value="" />
              <p>${gettext(STYLE_NAME ? "Edit style name or replace the style from an uploaded QML file." : "Create a new style from an uploaded QML file.")}</p>
              <p>${gettext("The style defined in the uploaded QML must be compatible with the target layer.")}</p>
              <p class="controls">
                <label>${gettext("Style name (required)")}</label>
                <input class="form-control" value="${STYLE_NAME ?? ''}" placeholder="${gettext("Enter the unique name of the new style")}" required name="name" style="width:100%;">
              </p>
              <p class="controls qq-upload-button-selector" style="position: relative; padding: 10px;">
                <input
                  class="form-control"
                  id="load_qml_file"
                  accept=".qml"
                  title=""
                  name="qml_file"
                  type="file"
                  style="top:0; left:0; cursor:pointer;opacity:0; width:100%; position:absolute; height: 100%;"
                />
                <span style="font-size: 1.5em;display: block;">${gettext("Upload layer style QML file")}</span>
                <i class="fa fa-upload fa-3x"></i>
              </p>
              <p id="qml_filename" style="display:none;"></p>
            </form>
          `,
        });

        modal.data.$evoker = $item

        // set action for confirm btn
        const form = Object.assign(new ga.forms.form(modal.$modal.find("form")), {
          successAction: e => { styleManagerList($datatable, $item, true); modal.hide(); },
        });

        // read and set input[name="qml"] value
        $($(form.$form[0]).find("#load_qml_file")).on("change", e => {
          const reader = new FileReader();
          const file = e.target.files[0];
          reader.onload = evt => {
            $('input[name="qml"]').val(evt.target.result)
            $("#qml_filename").text(file.name).show()
          }
          reader.readAsText(file);
        });

        modal.$modal.find('.modal-button-confirm').on('click', function (e) {
          let dt = form.getData("array");

          // Validate
          form.$form.find(".form-errors").html(`
            ${ dt.name == ""                                                       ? `<h4 class="badge bg-red">${gettext("Style name is required!")}</h4>`: '' }
            ${ dt.qml != "" && !STYLE_NAME                                         ? `<h4 class="badge bg-red">${gettext("QML is required!")}</h4>`: '' }
            ${ !res.styles.some(s => s.name === dt.name && dt.name !== STYLE_NAME) ? `<h4 class="badge bg-red">${gettext("A style with this name already exists!")}</h4>` : '' }
          `);

          if (!form.$form.find(".form-errors").children().length) {
            form.sendData(e, STYLE_NAME ? "patch" : "post", JSON.stringify(dt), "application/json; charset=UTF-8")
          }
        })

        modal.show();
      }

      if ($(this).is('[data-style-action-mode="delete"]')) {
        const modal = g3wadmin.ui._buildModal({
          modalTitle: gettext("Delete Style"),
          modalBody: `${gettext("Are you sure to delete style")} <strong>${$(e.currentTarget).attr("data-style-name")}</strong>?`,
          closeButtonText: "No",
        });
        modal.$modal.find('.modal-button-confirm').on('click', () => {
          fetch(`${$item.attr('data-stylemanager-list-url')}${$(e.currentTarget).attr("data-style-name")}/`, { method: 'DELETE' })
            .then(() => { styleManagerList($datatable, $item, true); modal.hide(); })
            .catch(ga.widget.showError);
        });
        modal.show();
      }

      if ($(this).is('[data-style-action-mode="make_current"]')) {
        fetch(`${$item.attr('data-stylemanager-list-url')}${$(this).attr("value")}/`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ current: true })
        })
          .then(() => styleManagerList($datatable, $item, true))
          .catch(ga.widget.showError);
      }

    });
    
    row.child($div).show();

  } catch (e) {
    ga.widget.showError(e.message)
  }
}
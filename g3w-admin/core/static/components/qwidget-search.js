/**
 * @file ORIGINAL SOURCE: g3w-admin/qdjango/static/qdjango/js/widget.js@v3.9.
 * @since g3w-admin@v4.0
 */

const EDITOR = g3wadmin.Qdjango.widgetEditor;

export default function generateSearchRow(values) {

  // show stored values
  if(EDITOR.widget.body && !values) {
    generateSearchRow(EDITOR.widget.body);
    delete EDITOR.widget.body;
    return;
  }

  const div = $('.rightCol');

  // general params
  if (!div.find('.bloccoGenerale').length) {
    $(".rightCol").append(/* html */`
      <div class="bloccoGenerale">
        <h3 hidden>${ gettext("General configuration for search widget and results") }</h3>
        <p class="controls title">
          <label data-toggle="tooltip" title="${gettext("Client search title identification")}">
            ${gettext("Search title")}
            <i class="fa fa-question-circle-o"></i>
          </label>
          <input class="form-control" type="text" name="title" id="title" value="${values?.title || ""}" required>
        </p>
        <p class="controls paginate">
          <label data-toggle="tooltip" title="${gettext("Check it if you want paginate the search results")}">
            ${gettext("Paginate resutls")}
            <i class="fa fa-question-circle-o"></i>
          </label>
          <select id="paginate" class="form-control">
            <option value="1" ${values?.paginate ? 'selected' : ''}> ${gettext('Yes')}</option>
            <option value="0" ${values?.paginate ? '' : 'selected'}> ${gettext('No')}</option>
          </select>
        </p>
        ${ EDITOR.relations.length > 0 ? /* html */`
          <p class="controls cmpRelations">
            <label data-toggle="tooltip" title="${gettext("This layer is a child in a relation, if you want to excute the search on father layer of relation, select the relative relation")}">
              ${gettext("Relations")}
              <i class="fa fa-question-circle-o"></i>
            </label>
            <select class="form-control" name="relation" style="width:100%;">
              <option value="">---</option>
              ${ (EDITOR.relations || []).map(v => /* html */`<option value="${v.id}" ${EDITOR?.widget?.body?.relations == v.id ? 'selected' : ''}>${v.name}</option>`).join('') }
            </select>
          </p>`: ''}
        <p class="controls cmpPlusLayersSearch">
          <label data-toggle="tooltip" title="${gettext("Select one or more additional layers to search on")}">
            ${gettext("Other searching layers")}
            <i class="fa fa-question-circle-o"></i>
          </label>
          <select class="form-control" multiple="multiple" name="pluslayer_field" style="width:100%;">
            ${ (Object.entries(EDITOR.projectLayers) || []).map(([i,v]) => /* html */`<option value="${i}" ${EDITOR.widget?.body?.otherlayers?.includes(i) ? 'selected' : ''}>${v}</option>`).join('') }
          </select>
        </p>
      </div>`);

    const onAddAction = (btn, values) => {
      const lastRow = btn.parents(".row").first()
      const newRow = $(/* html */`
        <div class="row">
          <div class="col-md-6 fieldSelect"></div>
          <div class="col-md-5 textInput"></div>
          <div class="col-md-1" style="padding-left:0px;"></div>
        </div>`
      )
      lastRow.find(".fieldSelect").append($(/* html */`
        <select class="form-control" name="resultfield">
          ${ (EDITOR.layerColumns || []).map(v => /* html */`<option value="${v.name}" ${values?.dataIndex === v.name ? 'selected' : ''}>"${v.name}</option>`).join('') }
        </select>
      `))
      lastRow.find(".textInput").append($(/* html */`<input class="form-control" type="text" name="resultfield_text" value="${values?.header ?? ""}" >`));
      btn.parents(".resultFields").first().append(newRow);
      btn.appendTo(newRow.find(".col-md-1"));
      var remBtn = $(/* html */`<button type="button" class="btn btn-default remove"><i class="fa fa-minus"></i></button>`);
      remBtn.click(function () { $(this).parents(".row").first().remove() });
      lastRow.find(".col-md-1").append(remBtn);
    }

    div.find(".bloccoGenerale button").on('click', function () {
      onAddAction($(this))
    })

    div.find(".bloccoGenerale .fieldSelect").first().append($(/* html */`
      <select class="form-control" name="resultfield">
        ${ (EDITOR.layerColumns || []).map(v => /* html */`<option value="${v.name}" ${values?.results?.length > 0 && values.results[0].name === v.name ? "selected" : ""}>${v.name}</option>`).join('') }
      </select>
    `));

    div.find(".bloccoGenerale .textInput").first().append($(/* html */`<input class="form-control" type="text" name="resultfield_text" value="${values?.results?.[0]?.header ?? ''}">`))

    if (values?.results?.length > 1) {
      $.each(values.results, function (i, v) {
        if (i === 0) return true
        onAddAction(div.find(".bloccoGenerale button.add"), v)
      })
    }

    div.find('.cmpPlusLayersSearch select').select2();
  }

  div.find(".logic_operator").last().attr('hidden', false);

  // show stored values
  if (values?.fields) {
    values.fields.forEach((d,i) => generateSearchRow(d));
    return;
  }

  // new row
  const row = $(/* html */`
    <fieldset class="blocco">
      <legend>${values?.label || values?.name || gettext("Search field settings")}</legend>
      <button class="btn close" style="margin-top: -30px;"><i class="fa fa-trash" style="color:red;"></i></button>
      <div class="row advise" style="display: none;">
        <div class="alert alert-warning"></div>
      </div>
      <p class="controls fieldSelect">
        <label>${gettext("Field")}</label>
        <select class="form-control" name="searchfield">
          ${ (EDITOR.layerColumns || []).map(v => /* html */`<option value="${v.name}" data-type="${v.type}" ${values?.name === v.name ? 'selected' : ''}>${v.name}</option>`).join('') }
        </select>
      </p>
      <p class="controls widgetType">
        <label>${gettext("Widget")}</label>
        <select class="form-control" name="widget_type">
          ${ Object.entries({
            inputbox: "InputBox",
            selectbox: "SelectBox",
            autocompletebox: "AutoCompleteBox",
          }).map(([k,i]) => /* html */`<option value="${k}" ${k === values?.widgettype ? 'selected' : ""}>${i}</option>`).join('') }
        </select>
      </p>
      <p class="controls textInput">
        <label data-toggle="tooltip" title="${gettext("Alias field name for client search input")}">
          ${gettext("Alias")}
          <i class="fa fa-question-circle-o"></i>
        </label>
        <input class="form-control" type="text" name="searchfield_text" value="${values?.label ?? ''}" />
      </p>
      <p class="controls descriptionInput">
        <label>${gettext("Description")}</label>
        <input class="form-control" type="text" name="searchfield_description" value="${values?.blanktext ?? ''}" />
      </p>
      <p class="controls cmpNumDigAutocomplete" hidden>
        <label>${gettext("Number of digits")}</label>
        <input class="form-control" type="text" name="num_dig_autcomplete" value="${values?.input?.options?.numdigaut ?? '2'}" />
      </p>
      <p class="controls cmpOperatorSelect">
        <label>${gettext("Comparison operator")}</label>
        <select class="form-control" name="comparison_operator">
          ${Object.entries({
            eq:   `= (${gettext("equal")})`,
            gt:   `> (${gettext("greater than")})`,
            lt:   `< (${gettext("lower than")})`,
            ltgt: `<> (${gettext("not equal")})`,
            gte:  `>= (${gettext("greater than equal")})`,
            lte:  `<= (${gettext("lower than equal")})`,
            LIKE: `LIKE (${gettext("like case sensitive")})`,
            ...("spatialite" !== EDITOR.layer_type ? { ILIKE: `ILIKE (${gettext("like not case sensitive")})`} : {})
          }).map(([k,i]) => /* html */`<option value="${k}" ${k === values?.filterop ? 'selected' : ''}>${i}</option>`).join('') }
        </select>
      </p>
      <p class="controls cmpRelationReference" hidden>
        <label data-toggle="tooltip" title="${gettext("This field has a 'ReletaionReference' form widget active, do you want use if for searching?")}">
          ${gettext("Use Relation Reference")}
          <i class="fa fa-question-circle-o"></i>
        </label>
        <select class="form-control" name="use_relationreferance">
          <option value="0" ${true === values?.input?.options?.relation_reference ? '' : 'selected'}>${gettext("No")}</option>
          <option value="1" ${true !== values?.input?.options?.relation_reference ? '' : 'selected'}>${gettext("Yes")}</option>
        </select>
      </p>
      <p class="controls cmpDependanceSelect" hidden>
      <label>${gettext("Dependency")}</label>
        <select class="form-control" name="dependence_field"><option value=""> ----- </option></select>
      </p>
      <p class="controls cmpDependanceStrict" ${values?.input?.options?.dependance_strict && values?.input?.options?.dependance ? '' : 'hidden'}>
        <label>${gettext("Strictly dependent")}</label>
        <input type="checkbox" name="dependent_strict" value="1" ${values?.input?.options?.dependance_strict ? 'checked' : ''} />
      </p>
      <div class="controls logic_operator" hidden>
        <label>${gettext("Logical join")}</label>
        <select class="form-control" name="logic_operator">
          <option value="and">AND</option>\
          <option value="or">OR</option>\
        </select>
      </div>
    </fieldset>
  `);

  row.find("select[name='searchfield'], input[name='searchfield_text']").on("change input", function (e) {
    row.find('legend').html(row.find("input[name='searchfield_text']").val() || row.find("select[name='searchfield']").val() || gettext("Search field settings"));
  });

  // add control on cmpOperatorSelect for field type:
  row.find("select[name='searchfield']").on("change", function () {
    const likeopts   = row.find("select[name='comparison_operator'] option[value='LIKE']");
    const ilikeopts  = row.find("select[name='comparison_operator'] option[value='ILIKE']");

    if ("numberfield" === g3wadmin.Qdjango.widgetEditor.getType($(this).find("option:selected").attr('data-type'))) {
      // remove like and ilike option
      likeopts.remove();
      ilikeopts.remove();
    } else {
      // add like and i like if no just added
      row.find("select[name='comparison_operator']").append(`
        ${likeopts.length ? '' : /* html */`<option value="LIKE">LIKE (${gettext("like case sensitive")})</option>`}
        ${ilikeopts.length ? '' : /* html */`<option value="ILIKE">ILIKE (${gettext("like not case sensitive")})</option>`}
      `);
    }

    // Case QDATETIME (append 'DatetimBox' to widget selectbox)
    row.find("select[name='widget_type'] option[value='datetimebox']").remove();
    
    if (['DateTime'].includes(g3wadmin.Qdjango.localVars.layer_edittypes[$(this).val()].widgetv2type)) {
      row.find("select[name='widget_type']").append(/* html */`<option value="datetimebox">DatetimeBox</option>`);
    }

    // Remove `AutoCompleteBox` from widget type list
    row.find("select[name='widget_type'] option[value='autocompletebox']")['ValueRelation' === g3wadmin.Qdjango.localVars.layer_edittypes[$(this).val()].widgetv2type ? 'hide' : 'show']();

  });

  // Trigger change for fieldselect
  row.find("select[name='searchfield']").trigger('change');

  row.find(".close").click(() => row.remove());

  $(".rightCol").append(row);

  row.find("select[name='widget_type']").on("change", function () {
    const multi = ['selectbox', 'autocompletebox'].includes($(this).val());
    row.find(".cmpDependanceSelect").attr("hidden", !multi);
    row.find(".cmpRelationReference").attr("hidden", multi ? !(g3wadmin.Qdjango.localVars.layer_edittypes[row.find(".fieldSelect select").val()].widgetv2type == 'RelationReference' && $(this).val() == "selectbox") : true);
    row.find(".cmpNumDigAutocomplete").attr("hidden", multi ? "selectbox" == $(this).val() : true);

    if (multi) {
      // On select dependance change
      row.find(".cmpDependanceSelect select").on("change", function(){
        row.find(".cmpDependanceStrict").attr("hidden", $(this).val() == "");
      });

      // No current bloc fieldSelect value
      const current_f = row.find(".cmpDependanceSelect").parents(".blocco").find(".fieldSelect").find("select").val();
      $.each($(".rightCol").find(".blocco"), function (i, v) {
        if ($(v).find(".fieldSelect select").val() != current_f)
          row.find(".cmpDependanceSelect").find("select").append('<option value="' + $(v).find(".fieldSelect select").val() + '">' + $(v).find(".fieldSelect select").val() + "</option>");
      })
    } else {
      row.find(".cmpDependanceStrict").attr("hidden", true);
    }
  });

  row.find("select[name='widget_type']").trigger("change");

  if (values?.input?.options?.dependance) {
    row.find('select[name="dependence_field"]').val($("<div/>").html(values.input.options.dependance).text());
  }

  if (![undefined, null].includes(values?.logicop)) {
    row.find("select[name='logic_operator']")?.val(values.logicop);
  }

}

$(EDITOR).on('onsubmitform:search', () => {
  const obj = {
    title:          $(".rightCol").find("#title").val(), // Search title
    paginate:       $(".rightCol").find("#paginate").val(),
    query:          "simpleWmsSearch",                   // It can be removed?
    usewmsrequest:  true,                                // Always set to true
    fields:         [],
    otherlayers:    [],
    results:        [],                                  // Column to show as results, it could be removed?
    selectionlayer: g3wadmin.Qdjango.widgetEditor.layer,                  // layer to execute reserach
    selectionzoom:  0,                                   // selection of results 0, 1
    dozoomtoextent: true,                                // Zoom to results True, False
    otherlayers:    $(".rightCol").find(".cmpPlusLayersSearch").find("select").val(),
    relations:      $(".rightCol").find(".cmpRelations").find("select").val(),
  }

  $.each($(".rightCol").find(".blocco"), function (i, v) {
    v = $(v);
    const dependance = v.find(".cmpDependanceSelect").find("select").val();
    const name  = v.find(".fieldSelect").find("select").val();                                     // field name
    const type  = v.find(".fieldSelect").find("select").find("option:selected").attr('data-type'); // field type
    obj.fields.push({
      name:       v.find(".fieldSelect").find("select").val(),       // NOME DEL CAMPO DB
      label:      v.find(".textInput").find("input").val(),          // ETICHETTA DEL CAMPO DI RICERCA
      blanktext:  v.find(".descriptionInput").find("input").val(),   // TESTO INIZIALE NEL CAMPO
      filterop:   v.find(".cmpOperatorSelect").find("select").val(), // OPERATORE DI CONFRONTO (=,&lt;,&gt;,=&lt;,&gt;=,&lt;&gt;)
      widgettype: v.find(".widgetType").find("select").val(),
      logicop:    v.find("select[name='logic_operator']").val(),
      input: {
        type:     'datetimebox' === v.find(".widgetType").find("select").val() ? 'datetimefield' : g3wadmin.Qdjango.widgetEditor.getType(type), // TIPO DI CAMPO
        options: {
          numdigaut: v.find(".cmpNumDigAutocomplete").find("input").val(),
          ...(dependance ? { dependance: v.find(".cmpDependanceSelect").find("select").val() }                 : {}),
          ...(dependance ? { dependance_strict: v.find(".cmpDependanceStrict").find("input").prop("checked") } : {}),
          ...('datetimebox' === v.find(".widgetType").find("select").val() ? { format: {
            date: ['QDATETIME', 'QDATE'].includes(type),
            time: ['QDATETIME', 'QDATE'].includes(type),
            // Switch to ISO Format (DATE TIME and DATETIME), WMS FILTER paramenter only works with ISO date/time formats.
            fieldformat: ({
              QDATE:     'yyyy-MM-dd',
              QDATETIME: 'yyyy-MM-dd HH:mm:ss+t',
              QTIME:     'HH:mm:ss',
            })[type] || g3wadmin.Qdjango.localVars.layer_edittypes[name].field_format,
            displayformat: g3wadmin.Qdjango.localVars.layer_edittypes[name].display_format,
            default: null
          } } : {}),
          ...('RelationReference' === g3wadmin.Qdjango.localVars.layer_edittypes[name].widgetv2type && 'selectbox' === v.find(".widgetType").find("select").val() ? { relation_reference: '1' == v.find(".cmpRelationReference").find("select").val() } : {})
        },
      },
    })
  })

  $.each($(".rightCol").find(".bloccoGenerale").find(".resultFields").find(".row"), function (i, v) {
    if ($(v).hasClass("labels") || !g3wadmin.Qdjango.widgetEditor.isset($(v).find(".fieldSelect").find("select").val())) {
      return true;
    }
    obj.results.push({
      header: $(v).find(".textInput").find("input").val(),
      name:   $(v).find(".fieldSelect").find("select").val()
    })
  });
  $("#id_body").val(JSON.stringify(obj));
});
export default {
  errors: {
    no_layers: "Ett fel uppstod. Nivåerna kan inte redigeras.",
    some_layers: "Ett fel uppstod. Vissa nivåer kan inte redigeras."
  },
  search: "Sökning",
  editing_changes: "Editing Changes",
  editing_data: "Nivåerna redigeras",
  editing_attributes: "Attributen redigeras",
  relations: "Relationer",
  edit_relation: "Redigera relationen",
  back_to_relations: "Tillbaka till relationerna",
  no_relations_found: "Inga relationer hittades",
  relation_data: "Relationsuppgifter",
  relation_already_added: "Relationen har redan lagts till",
  list_of_relations_feature: "Lista på relationens egenskaper",
  tooltip: {
    edit_layer: "Redigera nivån"
  },
  toolbox: {
    title: 'Redigera'
  },
  table: {
    edit: "Redigera egenskap",
    copy: "Skapa en kopia",
    delete: "Ta bort egenskap"
  },
  tools: {
    copy: "Kopiera egenskaper",
    pastefeaturesfromotherlayers: "Paste features from other layer",
    addpart: "Lägg till del",
    deletepart: "Ta bort del",
    merge: "Slå samman egenskaper",
    split: "Dela upp egenskap",
    add_feature: "Lägg till egenskap",
    delete_feature: "Ta bort egenskap",
    move_feature: "Flytta egenskap",
    rotate_feature: "Rotate feature",
    update_vertex: "Uppdatera punktens egenskap",
    update_feature: "Uppdatera egenskap",
    update_multi_features: "Ändra attributen för de valda funktionerna",
    update_multi_features_relations: "Update attributes of all selected relations",
    update_multi_features_relations_from_parents : "Add/Edit relations records from one or mode parent features",
    copyfeaturefromexternallayer: "Create Feature from added layer"
  },
  toolsoftool: {
    measure: "Show measure",
    snap: "Snap layer",
    snapall: "Snap to all layers"
  },
  steps: {
    help: {
      select_elements: "Välj egenskaper",
      select_element: "Välj egenskapalitse ominaisuus",
      copy: "Skapa kopia av valda egenskaper",
      merge: "Slå samman egenskaper",
      split: "Dela upp egenskap",
      new: "Skapa ny egenskap",
      edit_table: "Ändra egenskaper i tabellen",
      draw_new_feature: "Piirrä ominaisuus kartalle",
      action_confirm: "Godkänn funktionen",
      double_click_delete: "Välj funktionen som du vill ta bort på kartan",
      edit_feature_vertex: "Ändra punkten eller lägg till punkten till den valda egenskapen",
      move: "Flytta den valda egenskapen",
      select_feature_to_relation: "Välj relation",
      show_edit_feature_form:  "Visa egenskapsformuläret för redigering av attribut",
      pick_feature: "Välj funktion på kartan för att ändras",
      insert_attributes_feature: "Lägg till egenskapens attribut"
    }
  },
  workflow: {
    steps: {
      select: 'Välj egenskap',
      draw_part: "Rita ny del",
      draw_geometry : "Rita geometri",
      merge: 'Välj egenskap att slå samman',
      selectSHIFT: 'Tryck SHIFT, om du vill välja objekt med hjälp av rektangel.',  //Tero 10.12.2020
      selectDrawBox: "Rita upp den rektangel inom vilken objekten väljs ", //Tero 10.12.2020
      selectDrawBoxAtLeast2Feature: "Rita rektangeln inom vilken minst två objekt är markerade ",
      selectPoint: "Välj egenskap",
      selectPointSHIFT: 'Tryck SHIFT, om du vill välja objekt med hjälp av rektangel, eller välj en enskild egenskap.',
      selectMultiPointSHIFT: 'Tryck SHIFT, om du vill välja objekt med hjälp av rektangel, eller välj en enskild egenskap.',
      selectMultiPointSHIFTAtLeast2Feature: 'Tryck på SKIFT för att välja minst två objekt med en rektangel eller välj en enda egenskap. ',
      copyCTRL: 'CTRL+C, du kan kopiera valda egenskaper.',  //Tero 10.12.2020
      selectStartVertex: 'Visa startpunkten för valda egenskaper.',
      selectToPaste: 'Välj punkt till vilken de valda egenskaperna ska fogas.',
      draw_split_line: "Rita en linje enligt vilken den valda egenskapen ska uppdelas."
    },
    title: {
      steps: 'Skeden',
    },
    next: "Nästa",
  },
  messages: {
    featureslockbyotheruser: "Jotkut geometriat/tietueet eivät ole muokattavissa, koska muut käyttäjät muokkaavat niitä",
    splitted: "Uppdelad",
    nosplittedfeature: "Egenskapen har inte delats upp",
    press_esc: "Tryck ESC för att gå tillbaka",
    online: "Förbindelsen har upprättats. Ändringar kan sparas i databasen.",
    offline: "Du är i offline-läge. Ändringarna sparas lokalt",
    delete_feature: "Vill du ta bort den valda egenskapen?",
    delete_feature_relations: "Om egenskapen saknar bindande relationer blir dessa relationer föräldralösa. Vi rekommenderar att du behandlar dessa relationer innan du lämnar programmet",
    unlink_relation: "Vill du ta bort relationen?",
    commit_feature: "Sammanfattning av ändringar",
    toolbox_has_relation: "detta lager är en del av en relation",
    saved: "Uppgifterna sparades",
    saved_local:"Uppgifterna sparades lokalt.",
    loading_data: "Uppgifterna laddas",
    saving: "Uppgifterna sparas. Vänta...",
    constraints: {
      enable_editing: "Zooma in för att börja använda redigeringsverktyg \nAktivering skala 1:"
    },
    pdf: "Förhandsgranskning av dokument är inte tillgänglig. Tryck här",
    commit: {
      header: "Följande lista visar alla ändringar.",
      header_relation: "Relation",
      header_add: "<b>Tillagda</b> visar antalet egenskaper som lagts till",
      header_update_delete: "<b>Redigerad</b> och <b>Borttagen</b> Visa en lista på egenskapernas id",
      add: "har lagts till",
      delete: "Borttagen",
      update: "Redigerad"
    },
    loading_table_data: "Building Data Table. Please wait ...",
    copy_and_paste_from_other_layer_mandatory_fields: "It is necessary to fill in any mandatory fields on the features pasted before saving",
    no_feature_selected: "No feature selected",
    select_min_2_features: 'Select at least 2 features'
  },
  relation: {
    table: {
      info: `<div>Välj relation för länkning till egenskap som ska redigeras.</div>`
    },
    draw_new_feature:"Draw new feature",
    draw_or_copy:"or",
    copy_feature_from_other_layer:"Copy feature from other layer"
  },
  form: {
    relations: {
      tooltips: {
        back_to_father:"Back to edit father",
        add_relation: "Skapa och länka ny relation",
        link_relation: "Foga relationen till denna egenskap",
        open_relation_tools: "Visa relationsverktyg",
        unlink_relation: "Ta bort relation"
      }
    },
    buttons: {
      save: "Infoga/Redigera",
      save_and_back: "Spara och gå tillbaka",
      save_and_back_table: "Spara och gå tillbaka",
      cancel: "Ignorera ändringar"
    }
  },
  modal: {
    tools: {
      copyfeaturefromotherlayer: {
        title: "Select layer",
        edit_attributes: "Edit attributes of pasted features in multiple mode"
      },
      copyfeaturefromprojectlayer: {
        title: "Select a feature"
      }
    }
  }
}
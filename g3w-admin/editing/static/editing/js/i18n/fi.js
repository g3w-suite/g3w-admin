export default {
  errors: {
    no_layers: "Tapahtui virhe. Tasoja ei ole mahdollista muokata.",
    some_layers: "Tapahtui virhe. Jotkin tasot eivät ole muokattavissa."
  },
  search: "Haku",
  editing_changes: "Editing Changes",
  editing_data: "Muokataan tasoja",
  editing_attributes: "Muokataan attribuutteja",
  relations: "Relaatiot",
  edit_relation: "Muokkaa relaatiota",
  back_to_relations: "Takaisin relaatioihin",
  no_relations_found: "Relaatioita ei löytynyt",
  relation_data: "Relaation tiedot",
  relation_already_added: "Relaatio on jo lisätty",
  list_of_relations_feature: "Lista relaation ominaisuuksista",
  tooltip: {
    edit_layer: "Muokkaa tasoa"
  },
  toolbox: {
    title: 'Muokkaa'
  },
  table: {
    edit: "Muokkaa ominaisuutta",
    copy: "Luo kopio",
    delete: "Poista ominaisuus"
  },
  tools: {
    copy: "Kopio ominaisuuksia",
    pastefeaturesfromotherlayers: "Paste features from other layer",
    addpart: "Lisää osa",
    deletepart: "Poista osa",
    merge: "Yhdistä ominaisuudet",
    split: "Leikkaa ominaisuus",
    add_feature: "Lisää ominaisuus",
    delete_feature: "Poista ominaisuus",
    move_feature: "Siirrä ominaisuutta",
    rotate_feature: "Kierrä ominaisuus",
    update_vertex: "Päivitä pisteen ominaisuutta",
    update_feature: "Päivitä ominaisuus",
    update_multi_features: "Muokkaa valittujen ominaisuuksien attribuutteja",
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
      select_elements: "Valitse ominaisuudet",
      select_element: "Valitse ominaisuus",
      copy: "Luo kopio valituista ominaisuuksista",
      merge: "Yhdistä ominaisuudet",
      split: "Leikkaa ominaisuus",
      new: "Luo uusi ominaisuus",
      edit_table: "Muuta taulun ominaisuuksia",
      draw_new_feature: "Piirrä ominaisuus kartalle",
      action_confirm: "Hyväksy toiminto",
      double_click_delete: "Valitse poistettava ominaisuus kartalta",
      edit_feature_vertex: "Muuta pistettä tai lisää piste valittuun ominaisuuteen",
      move: "Siirrä valittu ominaisuus",
      select_feature_to_relation: "Valitse relaatio",
      show_edit_feature_form:  "Näytä ominaisuuslomake muokataksesi attribuutteja",
      pick_feature: "Valitse muokattava ominaisuus kartalta",
      insert_attributes_feature: "Lisää ominaisuuden attribuutit"
    }
  },
  workflow: {
    steps: {
      select: 'Valitse ominaisuus',
      draw_part: "Piirrä uusi osa",
      merge: 'Valitse ominaisuus yhdistääksesi',
      draw_geometry : "Piirrä geometria",
      selectSHIFT: 'Paina SHIFT, jos haluat valita kohteita suorakulmiovalinnalla.',  //Tero 10.12.2020
      selectDrawBox: "Piirrä suorakulmio, jonka siältä kohteet valitaan ", //Tero 10.12.2020
      selectDrawBoxAtLeast2Feature: "Piirrä suorakulmio, jonka siältä kohteet vähintään 2 valitaan ",
      selectPoint: "Valitse ominaisuus",
      selectPointSHIFT: 'Paina SHIFT, jos haluat valita ominaisuuksia suorakulmiovalinnalla, tai valitse yksittäinen ominaisuus.',
      selectMultiPointSHIFT: 'Paina SHIFT, jos haluat valita ominaisuuksia suorakulmiovalinnalla, tai valitse yksittäinen ominaisuus.',
      selectMultiPointSHIFTAtLeast2Feature: 'Paina SHIFT, jos haluat valita vähintään 2 ominaisuuksia suorakulmiovalinnalla, tai valitse yksittäinen ominaisuus.',
      copyCTRL: 'CTRL+C, voit kopioida valitut ominaisuudet.',  //Tero 10.12.2020
      selectStartVertex: 'Osoita valittujen ominaisuuksien alkupiste.',
      selectToPaste: 'Valitse kohta, johon liität valitut ominaisuudet.',
      draw_split_line: "Piirrä viiva, jonka mukaan valittu ominaisuus jaetaan."
    },
    title: {
      steps: 'Vaiheet'
    },
    next: "Seuraava",
  },
  messages: {
    featureslockbyotheruser: "Some features are locked by another user",
    splitted: "Jaettu",
    nosplittedfeature: "Ominaisuutta ei jaettu",
    press_esc: "Paina ESC palataksesi",
    online: "Yhteys muodostettu. Muutokset voidaan tallentaa tietokantaan.",
    offline: "Olet offline-tilassa. Muutokset tallennetaan paikallisesti",
    delete_feature: "Haluatko poistaa valitun ominaisuuden?",
    delete_feature_relations: "Mikäli ominaisuudella on sitovia relaatioita, näistä relaatiosta tulee orpoja. Suosittelemme käsittelemään nämä relaatiot ennen poistamista",
    unlink_relation: "Haluatko poistaa relaation?",
    commit_feature: "Yhteenveto muutoksista",
    toolbox_has_relation: "tämä kerros on osa relaatiota",
    saved: "Tiedot tallennettu onnistuneesti",
    saved_local:"Tiedot on tallennettu onnistuneesti paikallisesti.",
    loading_data: "Ladataan tietoja",
    saving: "Tallentaan tietoja. Odota...",
    constraints: {
      enable_editing: "Lähennä ottaaksesi muokkaustyökalut käyttöön \nAktivointi mittakaava 1:"
    },
    pdf: "Dokumentin esikatselu ei ole saatavilla. Paina tästä ",
    commit: {
      header: "Seuraava luettelo näyttää kaikki muutokset.",
      header_relation: "Relation",
      header_add: "<b>Lisätty</b> näytä lisättyjen ominaisuuksien lukumäärä",
      header_update_delete: "<b>Muokattu</b> ja <b>Poistettu</b> Näytä listä ominaisuuksien id:stä",
      add: "Lisätty",
      delete: "Poistettu",
      update: "Muokattu"
    },
    loading_table_data: "Building Data Table. Please wait ...",
    copy_and_paste_from_other_layer_mandatory_fields: "It is necessary to fill in any mandatory fields on the features pasted before saving",
    no_feature_selected: "No feature selected",
    select_min_2_features: 'Select at least 2 features'
  },
  relation: {
    table: {
      info: `<div>Valitse relaatiota linkittääksesi ne muokattavaan ominaisuuteen.</div>`
    },
    draw_new_feature:"Draw new feature",
    draw_or_copy:"or",
    copy_feature_from_other_layer:"Copy feature from other layer"
  },
  form: {
    relations: {
      tooltips: {
        back_to_father:"Back to edit father",
        add_relation: "Luo ja linkitä uusi relaatio",
        link_relation: "Liitä relaatio tähän ominaisuuteen",
        open_relation_tools: "Näytä relaatiotyökalut",
        unlink_relation: "Poista relaatio"
      }
    },
    buttons: {
      save: "Lisää/muokkaa",
      save_and_back: "Tallenna ja palaa",
      save_and_back_table: "Tallenna ja palaa",
      cancel: "Peruuta"
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
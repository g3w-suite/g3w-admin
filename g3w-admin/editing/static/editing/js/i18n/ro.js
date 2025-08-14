export default  {
  errors: {
    no_layers: "Avem o eroare. Straturile nu sunt editabile",
    some_layers: "Avem o eroare: Anumite straturi nu se pot edita"
  },
  search: "Caută",
  editing_changes: "Modificare schimbări",
  editing_data: "Modificare straturi",
  editing_attributes: "Modificare atribute",
  relations: "Relații",
  edit_relation: "Modifică relația",
  back_to_relations: "Înapoi la Relații",
  no_relations_found: "Nu am găsit relații",
  relation_data: "Date relații",
  relation_already_added: "Relație adăugată deja",
  list_of_relations_feature: "Lista relații entitatea ",
  tooltip: {
    edit_layer: "Modifică strat"
  },
  toolbox: {
    title: 'Modifică'
  },
  table: {
    edit: "Modifică entitate",
    copy: "Creează o copie",
    delete: "Elimină entitatea"
  },
  tools: {
    copy: "Copiază entitățile",
    pastefeaturesfromotherlayers: "Paste features from other layer",
    addpart: "Adaugă o parte la multiparte",
    deletepart: "Elimină partea din multiparte",
    merge: "Dizolvare entități",
    split: "Divizare Entitate",
    add_feature: "Adaugă entitate",
    delete_feature: "Eliminare entitate",
    move_feature: "Mută entitate",
    rotate_feature: "Rotire entitate",
    update_vertex: "Actualizează vertecșii entității",
    update_feature: "Actualizează atributul entității",
    update_multi_features: "Actualizează atributele entităților selectate",
    update_multi_features_relations: "Update attributes of all selected relations",
    update_multi_features_relations_from_parents : "Adaugă/Editați înregistrările relațiilor de la una sau mai multe caracteristici părinte",
    copyfeaturefromexternallayer: "Create Feature from added layer"
  },
  toolsoftool: {
    measure: "Arată măsurătorile",
    snap: "Acroșare strat",
    snapall: "Acroșare pe toate straturile"
  },
  steps: {
    help: {
      select_elements: "Selectează entități",
      select_element: "Selectează entitate",
      copy: "Creează o nouă copie a entităților selectate",
      merge: "Dizolvă entitățile",
      split: "Divizare Entitate",
      new: "Creează o entitate",
      edit_table: "Modifică entitățile tabelare",
      draw_new_feature: "Desenează entitate pe hartă",
      action_confirm: "Confirmă acțiunea",
      double_click_delete: "Selectează entitatea de eliminat din hartă",
      edit_feature_vertex: "Modifică sau adaugă un vertex la entitatea selectată",
      move: "Mută entitatea selectată",
      select_feature_to_relation: "Selectează entitate pentru relaționare",
      show_edit_feature_form:  "Arată formularul entității pentru modificări",
      pick_feature: "Selectează entitățile de modificat din hartă",
      insert_attributes_feature: "Inserează atributele entității"
    }
  },
  workflow: {
    steps: {
      select: 'Click pe entitate pentru a o selecta',
      draw_part: "Desenează o parte nouă",
      draw_geometry : "Desenați geometria",
      merge: 'Selectează partea de dizolvat',
      selectSHIFT: 'Selectează entități prin desen triunghi apăsând SHIFT',
      selectDrawBox: "Selectează entități desenând un dreptunghi prin două puncte opuse",
      selectDrawBoxAtLeast2Feature: "Selectează cel puțin 2 entități prin desenul unui dreptunghi",
      selectPoint: "Click pe entitate pentru selectare",
      selectPointSHIFT: 'Selectează entități prin desen dreptunghi apăsând SHIFT (multientități) sau prin click pe entitate',
      selectMultiPointSHIFT: 'Selectează entități prin desen dreptunghi apăsând SHIFT sau prin click pe entitate',
      selectMultiPointSHIFTAtLeast2Feature: 'Selectează cel puțin 2 entități prin desen dreptunghi apăsând SHIFT sau prin click pe entitate',
      copyCTRL: 'Copiază entitățile selectate folosint CTRL+C',
      selectStartVertex: 'Selectează vertexul de start a entităților selectate',
      selectToPaste: 'Selectează punctul unde să lipim entitățile selectate',
      draw_split_line: "Desenează o linie pentru a diviza entitatea selectată"
    },
    title: {
      steps: 'Pași',
    },
    next: 'Următorul',
  },
  messages: {
    featureslockbyotheruser: "Unele geometrii/înregistrări nu sunt editabile deoarece sunt editate de către alt utilizator",
    splitted: "Divizat",
    nosplittedfeature: "Entitate nedivizată",
    press_esc: "ESC pentru înapoi",
    online: "Înapoi ONLINE. Acum se pot salva schimbările",
    offline: "OFFLINE. Schimbările sunt salvate local",
    delete_feature: "Șterg entitatea selectată?",
    delete_feature_relations: "Dacă entitatea are relații care trimit la ea, acele relații devin orfane. Sugerăm să vă ocupați de acele elemente înainte să eliminați această entitate.",
    unlink_relation: "Dorești să eliminați legătura cu relația?",
    commit_feature: "Rezumatul modificărilor",
    toolbox_has_relation: "acest strat face parte dintr-o relație",
    saved: "Datele sunt salvate",
    saved_local:"Datele s-au salvat local",
    loading_data: "Datele se încarcă.",
    saving: "Salvăm datele. Așteptați ...",
    constraints: {
      enable_editing: "Pentru a activa Modificare faceți zoom la \nScara de activare 1:"
    },
    pdf: "Previzualizarea documentului nu este disponibilă. Click aici ",
    commit: {
      header: "Lista cu toate modificările.",
      header_relation: "Relation",
      header_add: "<b>Adăugate</b> arată nr. de entități adăugate",
      header_update_delete: "<b>Modificate</b> și <b>Șterse</b> arată lista de id-uri de entități",
      add: "Adăugate",
      delete: "Eliminate",
      update: "Modificate"
    },
    loading_table_data: "Încărcăm tabelul de date ...",
    copy_and_paste_from_other_layer_mandatory_fields: "Înainte de a salva, este necesar să completați toate câmpurile obligatorii ale entități introduse",
    no_feature_selected: "Nicio feature selectată",
    select_min_2_features: 'Select at least 2 features'
  },
  relation: {
    table: {
      info: `<div>Selectează relațiile pentru a face legătura cu entitatea curentă.</div>`
    },
    draw_new_feature:"Desenați o nouă feature",
    draw_or_copy: "sau",
    copy_feature_from_other_layer: "Copiați feature dintr-un alt layer"
  },
  form: {
    relations: {
      tooltips: {
        back_to_father:"Înapoi la modificările entității părinte",
        add_relation: "Creează și fă legătura unei relații noi",
        link_relation: "Leagă o relație de entitate",
        open_relation_tools: "Arată instrumentele pentru relații",
        unlink_relation: "Elimină legătura la relație"
      }
    },
    buttons: {
      save: "Inserați/Editați",
      save_and_back: "Salvează și dă înapoi",
      save_and_back_table: "Salvează și dă înapoi",
      cancel: "Ignorați modificările"
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
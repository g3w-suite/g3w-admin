export default {
  '⚠️ Confirm changes (✅) on each level to close': "⚠️ Prima conferma le modifiche (✅) su ogni livello",
  '⚠️ Stop active editing tool': "⚠️ Disattiva strumento editing",
  errors: {
    no_layers: "Si è verificato un errore nel caricamento dei layers in editing.",
    some_layers: "Si è verificato un errore nel caricamento di alcuni layers in editing",
    editing_multiple_relations: 'Le modifica di relazioni multiple non è attualmente supportata',
  },
  search: "Cerca",
  editing_changes: "Modifiche Editing",
  editing_data: "Modifica dati",
  editing_attributes: "Edita attributi",
  relations: "Relazioni",
  edit_relation: "Edita relazione",
  back_to_relations: "Ritorna alle Relazioni",
  no_relations_found: "Non ci sono relazioni",
  relation_data: "Dati relativi alla relazione",
  relation_already_added : "Relazione già presente",
  list_of_relations_feature: "Elenco Relazioni della feature ",
  tooltip:{
    edit_layer: "Modifica livello",
    filter_by_relation: "Filtra i livelli per relazione",
  },
  toolbox: {
    title: 'Edita'
  },
  table: {
    edit: "Modifica",
    copy: "Crea una copia",
    delete: "Cancella"
  },
  tools: {
    copy: "Copia elementi",
    pastefeaturesfromotherlayers: "Incolla elemento da altro livello",
    addpart: "Aggiungi parte alla geometria",
    deletepart: "Cancella parte dalla geometria",
    merge: "Dissolvi elementi",
    split: "Dividi elementi",
    add_feature: "Aggiungi elemento",
    delete_feature: "Elimina elemento",
    move_feature: "Muovi elemento",
    rotate_feature: "Ruota elemento",
    update_vertex: "Aggiorna vertici elemento",
    update_feature: "Modifica attributi elemento",
    update_multi_features: "Modifica gli attributi degli elementi selezionati",
    update_multi_features_relations: "Modifica gli attributi di tutte le relazioni selezionate",
    update_multi_features_relations_from_parents : "Aggiungi/Edita i record relazionati di uno o più padri",
    copyfeaturefromexternallayer: "Crea elemento da un livello esterno"
  },
  toolsoftool: {
    measure: "Visualizza misura",
    snap: "Snap sul layer",
    snapall: "Snap su tutti i layer"
  },
  steps: {
    help: {
      select_elements: "Seleziona le geometrie",
      select_element: "Seleziona l'elemento",
      copy: "Crea una copia degli elementi selezionati",
      merge: "Dissolvi elementi",
      split: "Dvidi elemento",
      new: "Crea un nuovo elemento",
      edit_table: "Modifica gli elementi della tabella",
      draw_new_feature: "Disegna la nuova geometria",
      action_confirm: "Conferma azione",
      double_click_delete: "Seleziona la geometria sulla mappa da cancellare",
      edit_feature_vertex: "Modifica o aggiungi un vertice alla geometria selezionata",
      move: "Muovi la geometria selezionata",
      select_feature_to_relation: "Seleziona la geometria che vuoi mettere in relazione",
      show_edit_feature_form:  "Mostra il modulo per modificare gli attributi del'elemento",
      pick_feature: "Seleziona la geometria da modificare dalla mappa",
      insert_attributes_feature: "Inserisci gli attributi dell'elemento"
    }
  },

  workflow: {
    steps: {
      select: 'Seleziona una geometria',
      draw_part: "Disegna il nuovo elemento da aggiungere alla geometria",
      draw_geometry : "Disegna la geometria",
      merge: 'Seleziona la geometria su cui dissolvere',
      selectPoint: "Clicca sulla geometria per selezionarla",
      selectSHIFT: 'Seleziona le geometrie tenedo premuto il tasto SHIFT',
      selectDrawBox: "Seleziona le geometrie disegnando un rettangolo mediante la creazione dei due punti della diagonale",
      selectDrawBoxAtLeast2Feature: "Seleziona almeno 2 geometrie disegnando un rettangolo mediante la creazione dei due punti della diagonale",
      selectPointSHIFT: 'Seleziona le geometrie <br><sub><code>MAIUSC+DRAG</code> seleziona più elementi in un area</sub>',
      selectMultiPointSHIFT: 'Seleziona le geometrie <br><sub><code>SHIFT+DRAG</code> seleziona più elementi in un area</sub>',
      selectMultiPointSHIFTAtLeast2Feature: 'Seleziona almeno 2 geometrie <br><sub><code>SHIFT+DRAG</code> seleziona più elementi in un area</sub>',
      copyCTRL: 'Copia le geometrie selezionate con CTRL+C',
      selectStartVertex: 'Seleziona il vertice di partenza',
      selectToPaste: 'Seleziona il punto dove verranno incollate le geometrie',
      draw_split_line: "Disegna una linea per dividere la geometria selezionata"
    },
    title: {
      steps: 'Passi',
    },
    next: 'Avanti',
  },
  messages: {
    featureslockbyotheruser: "Ci sono alcune geometrie/records non editabili perchè in modifica da altri utenti",
    splitted: "Feature(s) splittata(e)",
    nosplittedfeature: "La(e) feature(s) non è stata splittata",
    press_esc: "Premi ESC per tornare indietro",
    online: "Ora sei di nuovo ONLINE. Puoi slavare le modifiche in modo permanente",
    offline: "Sei OFFLINE. Tutte le modifiche saranno salvate temporaneamente in locale",
    delete_feature: "Vuoi eliminare l'elemento selezionato?",
    delete_feature_relations: "Cancellando una feature con relazioni associate, tale relazioni rimarranno orfane. Si consiglia di gestire tali relazioni prima di cancellare la feature",
    unlink_relation: "Vuoi dissociare la relazione?",
    link_relations: "Vuoi associare queste relazioni?",
    commit_feature: "Riepilogo modifiche",
    toolbox_has_no_geometry: "questo livello non ha geometria",
    toolbox_has_relation: "questo livello fa parte di una relazione",
    saved: "I dati sono stati salvati correttamente",
    saved_local: "I dati sono stati salvati correttamente in locale",
    loading_data: "Caricamento dati",
    saving: "Salvataggio dati in corso. Attendere ...",
    constraints: {
      enable_editing: "Ingrandisci per modificare \nScala di attivazione 1:"
    },
    pdf: "Anteprima del documento non disponibile. Clicca qui ",
    commit: {
      header: "La lista sotto riporta tutte le modifiche che verranno salvate.",
      header_relation: "Relazione",
      header_add: "<b>Aggiunte</b> riporta il numero delle features aggiunte",
      header_update_delete: "<b>Modificate</b> e <b>Cancellate</b> riporta la lista degli id",
      add: "Aggiunte",
      delete: "Cancellate",
      update: "Aggiornate"
    },
    loading_table_data: "Costruzione tabella dati in corso. Attendere ...",
    copy_and_paste_from_other_layer_mandatory_fields: "Necessario compilare eventuali campi obbligatori sulle features incollate prima del salvataggio",
    no_feature_selected: "Nessuna feature selezionata",
    select_min_2_features: 'Seleziona come minimo due features'
  },
  relation: {
    table: {
      info: `<div>Seleziona le relazioni per associarle alla feature in editing.</div>`
    },
    draw_new_feature: "Disegna nuova geometria",
    draw_or_copy: "oppure",
    copy_feature_from_other_layer: "Copia geometria da altro layer"
  },
  form: {
    relations: {
      tooltips: {
        back_to_father:"Torna ad editare il padre",
        add_relation: "Crea ed aggiungi nuova relazione",
        link_relation: "Associa una relazione esistente a questa feature",
        open_relation_tools: "Apri strumenti relatione",
        unlink_relation: "Annulla relazione"
      }
    },
    buttons: {
      save: "Inserisci/Modifica",
      save_table: 'Modifica',
      save_and_back: "Salva e torna al padre",
      save_and_back_table: "Salva e torna indietro",
      cancel: "Ignora Modifiche"
    }
  },
  modal: {
    tools: {
      copyfeaturefromotherlayer: {
        title: "Seleziona layer",
        edit_attributes: "Edita attributi delle features in multiple mode"
      },
      copyfeaturefromprojectlayer: {
        title: "Seleziona una feature"
      }
    }
  }
}
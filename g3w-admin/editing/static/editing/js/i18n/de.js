export default {
  errors: {
    no_layers: "Es tritt ein Fehler auf. Es ist nicht möglich, Layer zu bearbeiten",
    some_layers: "Es tritt ein Fehler auf: Es ist nicht möglich, einige Layer zu bearbeiten"
  },
  search: "Suche",
  editing_changes: "Änderungen bearbeiten",
  editing_data: "Layer bearbeiten",
  editing_attributes: "Attribute bearbeiten",
  relations: "Relationen",
  edit_relation: "Relation bearbeiten",
  back_to_relations: "Zurück zu Relationen",
  no_relations_found: "Keine Relationen gefunden",
  relation_data: "Relationsdaten",
  relation_already_added: "Relation bereits hinzugefügt",
  list_of_relations_feature: "Liste der Relations-Features ",
  tooltip: {
    edit_layer: "Layer bearbeiten"
  },
  toolbox: {
    title: 'bearbeiten'
  },
  table: {
    edit: "Feature bearbeiten",
    copy: "Kopie erstellen",
    delete: "Feature löschen"
  },
  tools: {
    copy: "Features kopieren",
    pastefeaturesfromotherlayers: "Paste features from other layer",
    addpart: "Teil zu Multipart hinzufügen",
    deletepart: "Teil aus Multipart löschen",
    merge: "Feature auflösen",
    split: "Feature trennen",
    add_feature: "Feature hinzufügen",
    delete_feature: "Feature löschen",
    move_feature: "Feature verschieben",
    rotate_feature: "Feature verschieben",
    update_vertex: "Feature vertex aktualisieren",
    update_feature: "Feature-Attribut aktualisieren",
    update_multi_features: "Attribute ausgewählter Features aktualisieren",
    update_multi_features_relations: "Update attributes of all selected relations",
    update_multi_features_relations_from_parents : "Hinzufügen/Bearbeiten Sie Beziehungsdatensätze von einem oder mehreren übergeordneten features",
    copyfeaturefromexternallayer: "Create Feature from added layer"
  },
  toolsoftool: {
    measure: "Messung anzeigen",
    snap: "Snap Layer",
    snapall: "Snap auf alle Layer"
  },
  steps: {
    help: {
      select_elements: "Features auswählen",
      select_element: "Feature auswählen",
      copy: "Neue Kopie der ausgewählten Features erstellen",
      merge: "Features auflösen",
      split: "Feature trennen",
      new: "Neues Feature erstellen",
      edit_table: "Features der Tabelle bearbeiten",
      draw_new_feature: "Feature auf Karte zeichnen",
      action_confirm: "Aktion bestätigen",
      double_click_delete: "Zu löschendes Feature auf der Karte auswählen",
      edit_feature_vertex: "Ändern oder Hinzufügen eines Eckpunktes auf dem ausgewählten Feature",
      move: "Ausgewähltes Feature verschieben",
      select_feature_to_relation: "Feature auswählen, welches die Relation verknüpft",
      show_edit_feature_form:  "Feature-Formular zum Bearbeiten von Attributen anzeigen",
      pick_feature: "Zu änderndes Feature auf der Karte auswählen",
      insert_attributes_feature: "Attribute des Features einfügen"
    }
  },
  workflow: {
    steps: {
      select: 'Zum Auswählen auf ein Feature klicken',
      draw_part: "Neues Teil zeichnen",
      draw_geometry : "Geometrie zeichnen",
      merge: 'Feature zum Auflösen auswählen',
      selectSHIFT: 'Features auswählen indem ein Rechteck mit SHIFT gezeichnet wird',
      selectDrawBox: "Features auswählen, indem man ein Rechteck mit zwei gegenüberliegenden Eckpunkten zeichnet",
      selectDrawBoxAtLeast2Feature: "Mindestens Features auswählen, indem man ein Rechteck mit zwei gegenüberliegenden Eckpunkten zeichnet",
      selectPoint: "Zum Auswählen auf ein Feature klicken",
      selectPointSHIFT: 'Features auswählen, indem ein Rechteck mit SHIFT gezeichnet wird (Multifeatures) oder auf ein Feature klicken',
      selectMultiPointSHIFT: 'Features auswählen, indem man ein Rechteck zeichnet und SHIFT drückt oder auf ein Feature klickt',
      selectMultiPointSHIFTAtLeast2Feature: 'Mindestens 2 Features auswählen und mit SHIFT ein Rechteck zeichnen oder auf ein Feature klicken',
      copyCTRL: 'Kopieren ausgewählter Features mit CTRL+C',
      selectStartVertex: 'Start-Eckpunkt der ausgewählten Features auswählen',
      selectToPaste: 'Den Punkt auswählen, an dem die ausgewählten Features eingefügt werden sollen',
      draw_split_line: "Eine Linie zeichnen, um das ausgewählte Feature zu teilen"
    },
    title: {
      steps: 'Schritte',
    },
    next: 'Weiter',
  },
  messages: {
    featureslockbyotheruser: "Einige Geometrien/Datensätze können nicht bearbeitet werden, da sie von anderen Benutzern bearbeitet werden",
    splitted: "Getrennt",
    nosplittedfeature: "Feature nicht getrennt",
    press_esc: "Mit ESC zurück",
    online: "Wieder ONLINE. Jetzt kann man die Änderungen in der Datenbank speichern",
    offline: "OFFLINE. Alle Änderungen werden lokal gespeichert",
    delete_feature: "Soll das ausgewählte Feature gelöscht werden?",
    delete_feature_relations: "Wenn ein Feature Verknüpfungen beinhaltet, werden diese Relationen verwaist. Wir schlagen vor, diese Relationen zu behandeln, bevor das Feature gelöscht wird",
    unlink_relation: "Soll die Verknüpfung aufgehoben werden?",
    commit_feature: "Zusammenfassung der Änderungen",
    toolbox_has_relation: "Diese Ebene ist Teil einer Beziehung",
    saved: "Daten erfolgreich gespeichert",
    saved_local:"Daten erfolgreich lokal gespeichert",
    loading_data: "Daten laden",
    saving: "Daten werden gespeichert. Bitte warten ...",
    constraints: {
      enable_editing: "Bitte zoomen Sie hinein, um die Editier-Tools zu aktivieren \nAktivierungsskala bei 1:"
    },
    pdf: "Dokumentenvorschau nicht verfügbar. Bitte hier klicken ",
    commit: {
      header: "Die folgende Liste zeigt alle zu übernehmenden Änderungen.",
      header_relation: "Relation",
      header_add: "<b>Hinzufgefügt</b> Die Anzahl der hinzugefügten Features anzeigen",
      header_update_delete: "<b>Bearbeitet</b> und <b>Gelöscht</b> Die Liste der Feature-ID anzeigen",
      add: "Hinzugefügt",
      delete: "Gelöscht",
      update: "Bearbeitet"
    },
    loading_table_data: "Datentabelle wird erstellt. Bitte warten ...",
    copy_and_paste_from_other_layer_mandatory_fields: "Vor dem Speichern müssen alle Pflichtfelder des eingegebenen features ausgefüllt werden",
    no_feature_selected: "Keine feature ausgewählt",
    select_min_2_features: 'Select at least 2 features'
  },
  relation: {
    table: {
      info: `<div>Wählen Sie Relationen aus, um sie mit dem aktuellen Feature zu verknüpfen.</div>`
    },
    draw_new_feature:"Zeichnen Sie eine neue feature",
    draw_or_copy:"oder",
    copy_feature_from_other_layer:"Kopieren Sie feature aus einer anderen layer"
  },
  form: {
    relations: {
      tooltips: {
        back_to_father:"Zurück zur Bearbeitung des Vaters",
        add_relation: "Neue Relation erstellen und verknüpfen",
        link_relation: "Eine Relation zu diesem Feature herstellen",
        open_relation_tools: "Relationstools anzeigen",
        unlink_relation: "Relation trennen"
      }
    },
    buttons: {
      save: "Einfügung/Bearbeiten",
      save_and_back: "Speichern und zurück",
      save_and_back_table: "Speichern und zurück",
      cancel: "Änderungen ignorieren"
    }
  },
  modal: {
    tools: {
      copyfeaturefromotherlayer: {
        title: "Select layer",
        edit_attributes: "Edit attributes of pasted features in multiple mode"
      },
      copyfeaturefromprojectlayer: {
        title: "Select one feature"
      }
    }
  }
}
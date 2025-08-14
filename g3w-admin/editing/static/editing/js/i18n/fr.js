export default {
  errors: {
    no_layers: "Une erreur s'est produite lors du chargement des layers dans l'édition.",
    some_layers: "Une erreur s'est produite lors du chargement de certaines layers dans l'édition."
  },
  search: "Recherche",
  editing_changes: "Editing Changes",
  editing_data: "Modifier les donnes",
  editing_attributes: "Modifier les attributs",
  relations: "Relations",
  edit_relation: "Modifier la relation",
  back_to_relations: "Retour aux relations",
  no_relations_found: "Il n'y a pas de relations",
  relation_data: "Données sur les relations",
  relation_already_added : "Relation déjà présente",
  list_of_relations_feature: "Lister les relations de la fonctionnalité",
  tooltip:{
    edit_layer: "Modifier le layer"
  },
  toolbox: {
    title: 'Modifier'
  },
  table: {
    edit: "Modifier fonctionnalités",
    copy: "Créer une copie",
    delete: "Supprimer la fonctionnalité"
  },
  tools: {
    copy: "Copier les fonctionnalités",
    pastefeaturesfromotherlayers: "Paste features from other layer",
    addpart: "Ajouter une pièce à la géométrie",
    deletepart: "Supprimer la partie de la géométrie",
    merge: "Dissoudre les fonctionnalités",
    split: "Couper la fonctionnalité",
    add_feature: "Ajouter une fonctionnalité",
    delete_feature: "Supprimer la fonctionnalité",
    move_feature: "Déplacez la fonctionnalité",
    rotate_feature: "Fonction de rotation",
    update_vertex: "Mettre à jour les sommets des fonctionnalités",
    update_feature: "Modifier les attributs des fonctionnalités",
    update_multi_features: "Modifier les attributs des fonctionnalités sélectionnées",
    update_multi_features_relations: "Update attributes of all selected relations",
    update_multi_features_relations_from_parents : "Ajouter/Modifier les enregistrements de relation à partir d'une ou plusieurs entités parents",
    copyfeaturefromexternallayer: "Create Feature from added layer"
  },
  toolsoftool: {
    measure: "Show measure",
    snap: "Snap layer",
    snapall: "Snap to all layers"
  },
  steps: {
    help: {
      select_elements: "Sélectionner les fonctionnalités",
      select_element: "Sélectionner une fonctionnalité",
      copy: "Créer une copie des fonctionnalités sélectionnées",
      merge: "Dissoudre les fonctionnalités",
      split: "Couper la fonctionnalité",
      new: "Créer une nouvelle fonctionnalité",
      edit_table: "Modifier les fonctionnalités de la table",
      draw_new_feature: "Dessiner une fonctionnalité sur la carte",
      action_confirm: "Confirmer l'action",
      double_click_delete: "Sélectionner la fonctionnalité sur la carte à supprimer",
      edit_feature_vertex: "Modifier ou ajouter un sommet à la fonctionnalité sélectionnée",
      move: "Déplacer la fonctionnalité sélectionnée",
      select_feature_to_relation: "Sélectionner la fonctionnalité que vous souhaitez mettre en relation",
      show_edit_feature_form:  "Afficher le formulaire de la fonctionnalité permettant de modifier les attributs",
      pick_feature: "Sélectionner l'élément de la carte à modifier",
      insert_attributes_feature: "Insérer les attributs de la fonctionnalité"
    }
  },
  workflow: {
    steps: {
      select: 'Cliquer sur la fonctionnalité à sélectionner',
      draw_part: "Dessiner la nouvelle partie",
      draw_geometry : "Dessiner la géométrie",
      merge: 'Sélectionner la fonction à introduire en fondu',
      selectPoint: "Cliquer sur la fonctionnalité pour la sélectionner",
      selectSHIFT: 'Sélectionner des fonctionnalités en maintenant la touche SHIFT enfoncée',
      selectDrawBox: "Sélectionner les fonctionnalités en dessinant un rectangle par la création des deux points de la diagonale",
      selectDrawBoxAtLeast2Feature: "Sélectionner au moins 2 fonctionnalités en dessinant un rectangle par la création des deux points de la diagonale",
      selectPointSHIFT: 'Sélectionner des caractéristiques en maintenant la touche SHIFT enfoncée (multi-sélection) ou en cliquant sur une seule caractéristique',
      selectMultiPointSHIFT: 'Sélectionner des fonctionnalités en maintenant la touche SHIFT appuyée ou en cliquant sur la fonctionnalité individuelle',
      selectMultiPointSHIFTAtLeast2Feature: 'Sélectionner au moins 2 fonctionnalités en maintenant la touche SHIFT appuyée ou en cliquant sur la fonctionnalité individuelle',
      copyCTRL: 'Copier les fonctionnalités sélectionnées avec CTRL+C',
      selectStartVertex: 'Sélectionner le sommet de départ des fonctionnalités choisies',
      selectToPaste: 'Sélectionner le point où les fonctionnalités sélectionnées seront collées',
      draw_split_line: "Tracez une ligne pour couper la fonctionnalité sélectionnée"
    },
    title: {
      steps: 'Étapes'
    },
    next: 'Suivant',
  },
  messages: {
    featureslockbyotheruser: "Certaines géométries/enregistrements ne sont pas modifiables car ils ont été modifiés par un autre utilisateur",
    splitted: "Fonctionnalité(s) divisé(es)",
    nosplittedfeature: "La (les) fonctionnalité(s) n’a (n'ont) pas été divisé(es)",
    press_esc: "Appuyez sur ESC pour revenir",
    online: "Vous êtes à nouveau EN LIGNE. Vous pouvez enregistrer les modifications de façon permanente",
    offline: "Vous êtes HORS LIGNE. Toutes les modifications seront enregistrées temporairement en local",
    delete_feature: "Voulez-vous supprimer la fonctionnalité sélectionnée ?",
    delete_feature_relations: "La suppression d'une fonctionnalité avec des relations associées laissera ces relations orphelines. Il est recommandé de gérer ces relations avant de supprimer la fonctionnalité",
    unlink_relation: "Voulez-vous détacher la relation ?",
    commit_feature: "Sommaire des changements",
    toolbox_has_relation: "cette couche fait partie d'une relation",
    saved: "Les données ont été enregistrées correctement",
    saved_local: "Les données ont été correctement sauvegardées localement",
    loading_data: "Chargement des données",
    saving: "Sauvegarde des données. Veuillez patienter ...",
    constraints: {
      enable_editing: "Augmenter le niveau de zoom pour permettre l'édition \nEchelle de déclenchement 1 :"
    },
    pdf: "Aperçu du document non disponible. Cliquez ici ",
    commit: {
      header: "La liste ci-dessous montre toutes les modifications qui seront enregistrées.",
      header_relation: "Relation",
      header_add: "<b>Ajouts</b> indique le nombre de fonctionnalités ajoutées",
      header_update_delete: "<b>Modifié</b> e <b>Supprimé</b> liste les ids",
      add: "Ajouté",
      delete: "Supprimé",
      update: "Modifié"
    },
    loading_table_data: "Building Data Table. Please wait ...",
    copy_and_paste_from_other_layer_mandatory_fields: "Avant d'enregistrer, il est nécessaire de remplir tous les champs obligatoires du features saisi",
    no_feature_selected: "Aucune feature sélectionnée",
    select_min_2_features: 'Select at least 2 features'
  },
  relation: {
    table: {
      info: `<div>Sélectionner les relations pour les associer à l'élément en cours d'édition.</div>`
    },
    draw_new_feature:"Dessiner une nouvelle feature",
    draw_or_copy:"ou",
    copy_feature_from_other_layer:"Copier feature d'une autre layer"
  },
  form: {
    relations: {
      tooltips: {
        back_to_father:"Back to edit father",
        add_relation: "Créer et ajouter une nouvelle relation",
        link_relation: "Associer une relation existante à cette fonctionnalité",
        open_relation_tools: "Outils de relation ouverte",
        unlink_relation: "Annuler la relation"
      }
    },
    buttons: {
      save: "Insérer/Modifier",
      save_and_back: "Sauvegarder et retourner au parent",
      save_and_back_table: "Sauvegarder et et revenir en arrière",
      cancel: "Ignorer modifications"
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
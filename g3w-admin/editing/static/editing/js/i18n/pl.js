export default {
  errors: {
    no_layers: "An error occurs. It's no possible to edit layers",
    some_layers: "An error occurs: It's no possible to edit some layers"
  },
  search: "Search",
  editing_changes: "Editing Changes",
  editing_data: "Editing Layers",
  editing_attributes: "Editing attributes",
  relations: "Relations",
  edit_relation: "Edit relation",
  back_to_relations: "Back to Relations",
  no_relations_found: "No relations found",
  relation_data: "Relation data",
  relation_already_added: "Relation already added",
  list_of_relations_feature: "List of relations feature ",
  tooltip: {
    edit_layer: "Edit Layer"
  },
  toolbox: {
    title: 'Edit'
  },
  table: {
    edit: "Edit feature",
    copy: "Create a copy",
    delete: "Delete feature"
  },
  tools: {
    copy: "Copy features",
    pastefeaturesfromotherlayers: "Paste features from other layer",
    addpart: "Add part to multipart",
    deletepart: "Delete part from multipart",
    merge: "Dissolve features",
    split: "Split Feature",
    add_feature: "Add feature",
    delete_feature: "Delete feature",
    move_feature: "Move feature",
    rotate_feature: "Rotate feature",
    update_vertex: "Update feature vertex",
    update_feature: "Update feature attribute",
    update_multi_features: "Update attributes of selected features",
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
      select_elements: "Select features",
      select_element: "Select feature",
      copy: "Create new copy of selected features",
      merge: "Dissolve features",
      split: "Split Feature",
      new: "Create new feature",
      edit_table: "Edit table features",
      draw_new_feature: "Draw feature on map",
      action_confirm: "Confirm action",
      double_click_delete: "Select feature on map to delete",
      edit_feature_vertex: "Modify or add a vertex on selected feature",
      move: "Move selected feature",
      select_feature_to_relation: "Select feature that you bind relation",
      show_edit_feature_form:  "Show feature form to edit attributes",
      pick_feature: "Select feature on map to modify",
      insert_attributes_feature: "Insert attributes of the feature"
    }
  },
  workflow: {
    steps: {
      select: 'Click on feature to select',
      draw_part: "Draw new part",
      merge: 'Select featurewhere dissolve',
      selectSHIFT: 'Select features drawing a rectangle pressing SHIFT',
      selectDrawBox: "Select features drawing a rectangle by two point of opposite corners",
      selectDrawBoxAtLeast2Feature: "Select at least features drawing a rectangle by two point of opposite corners",
      selectPoint: "Click on feature to select",
      selectPointSHIFT: 'Select features drawing a rectangle pressing SHIFT (multifeatures) or click on one feature',
      selectMultiPointSHIFT: 'Select features drawing a rectangle pressing SHIFT or click on feature',
      selectMultiPointSHIFTAtLeast2Feature: 'Select at least 2 features drawing a rectangle pressing SHIFT or click on feature',
      copyCTRL: 'Copy selected features using CTRL+C',
      selectStartVertex: 'Select starting vertex of selected features',
      selectToPaste: 'Select the point where paste the features selected',
      draw_split_line: "Draw a line to split selected feature"
    },
    title: {
      steps: 'Steps'
    },
    next: 'Next',
  },
  messages: {
    featureslockbyotheruser: "Some geometries/records are not editable because in editing by other user",
    splitted: "Splitted",
    nosplittedfeature: "Feature not spitted",
    press_esc: "Press ESC to back",
    online: "Back ONLINE. Now you can save your changes on database",
    offline: "You are OFFLINE. All changes are saved locally",
    delete_feature: "Do you want delete selected feature ?",
    delete_feature_relations: "If feature has bindings relations, these relations become orphans. We suggest to handle these relations before detele this feature",
    unlink_relation: "Do you want unlink relation?",
    commit_feature: "Do you want to save the changes",
    toolbox_has_relation: "this layer is part of a relation",
    saved: "Data saved successfully",
    saved_local:"Data saved locally successfully",
    loading_data: "Loading data",
    saving: "Saving data. Please wait ...",
    constraints: {
      enable_editing: "Please Zoom In to enable editing tools \nActivation scale at 1:"
    },
    pdf: "Document preview not available. Please click here ",
    commit: {
      header: "The following list show all changes to commit.",
      header_add: "<b>Added</b> show the number of features added",
      header_update_delete: "<b>Modified</b> and <b>Deleted</b> show the list of features id",
      add: "Added(n. features)",
      delete: "Deleted(id)",
      update: "Modified(id)"
    },
    loading_table_data: "Building Data Table. Please wait ...",
    copy_and_paste_from_other_layer_mandatory_fields: "It is necessary to fill in any mandatory fields on the features pasted before saving",
    no_feature_selected: "No feature selected",
    select_min_2_features: 'Select at least 2 features'
  },
  relation: {
    table: {
      info: `<div>Select relations to link it to current editing feature.</div>`
    },
    draw_new_feature:"Draw new feature",
    draw_or_copy:"or",
    copy_feature_from_other_layer:"Copy feature from other layer"
  },
  form: {
    relations: {
      tooltips: {
        back_to_father:"Back to edit father",
        add_relation: "Create and link new relation",
        link_relation: "Join a relation to this feature",
        open_relation_tools: "Show relation tools",
        unlink_relation: "Unlink relation"
      }
    },
    buttons: {
      save: "Insert/Edit",
      save_and_back: "Save and Back",
      save_and_back_table: "Save and Back",
      cancel: "Ignore Changes"
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
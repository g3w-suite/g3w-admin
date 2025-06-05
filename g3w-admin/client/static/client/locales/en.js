export default {
  translation: {
    error_page: {
      error: "Connection error",
      at_moment: "At the moment is not possible show map",
      f5: "Press Ctrl+F5"
    },
    cookie_law: {
      message: "This website uses cookies to ensure you get the best experience on our website.",
      buttonText: "Got It!"
    },
    default:"default",
    sign_in: "Sign in",
    layer_selection_filter: {
      tools: {
        filter: "Enable/Disable filter",
        nofilter: "Remove Filter",
        invert: "Invert Selection",
        clear: "Clear Selection",
        show_features_on_map: "Update results when map moves",
        savefilter: "Save Filter",
        filterName: "Filter Name",
      }
    },
    warning: {
      not_supported_format: "Not supported format"
    },
    layer_position: {
      top: 'top',
      bottom: 'bottom',
      message: "Position"
    },
    sdk: {
      atlas: {
        template_dialog: {
          title: "Select Template"
        }
      },
      spatialbookmarks: {
        title: "Bookmarks",
        helptext: "Move on map extent, insert name and click Add",
        input: {
          name: "Name"
        },
        sections: {
          project:{
            title: "Project Bookmarks"
          },
          user: {
            title: "User Bookmarks"
          }
        }
      },
      search: {
        all: 'ALL',
        no_results: "No results",
        searching: "Searching ...",
        error_loading: "Error Loading Data",
        layer_not_searchable: "Layer is not searchable",
        layer_not_querable: "Layer is not querable",
        autocomplete: {
          inputshort: {
            pre: "Please enter",
            post: "or more characters"
          }
        },
        help_filter : "Search values are limited based on the active filter. Remove the filter to search all data.",
        autofilter: "Filter results",
        autofilter_tooltip: "Whether automatically filter geometries displayed within the map<br>in order to show only those related to current search results.",

},
      print: {
        no_layers: 'No Layer to print',
        template: "Template",
        labels: "Labels",
        scale: "Scale",
        format: "Format",
        rotation: "Rotation",
        download_image: "Download Image",
        fids_instruction: "Values accepted: from 1 to value of [max]. Is possible to insert a range ex. 4-6",
        fids_example: "Ex. 1,4-6 will be printed id 1,4,5,6",
        help: "Exportable layers are defined by the administrator",
        help_details: `<p>If you don't see some layer in your print file:</p>
          <ol style="padding-left: 25px">
            <li>try again by selecting a different template</li>
            <li>try changing the zoom level</li>
            <li>check the origin (eg. third-party WMS server)</li>
            <li>make sure the item is actually checked within layers list</li>
          </ol>`,
      },
      querybuilder: {
        title: 'Advanced search',
        search: {
          run: "Run",
          info: "Information",
          delete: "Delete",
          edit: "Edit"
        },
        messages: {
          changed: 'Saved',
          number_of_features: "Features found:"
        },
        panel: {
          button: {
            all: 'SEARCH A VALUE',
            save: 'SAVE',
            test: 'TEST',
            clear: 'CLEAR',
            run: 'RUN',
            manual: 'MANUAL'
          },
          layers: 'LAYERS',
          fields: 'FIELDS',
          values: 'VALUES',
          operators: 'OPERATORS',
          expression: 'EXPRESSION'
        },
        error_run: 'An error occurs. Please check the query',
        error_test: "An error occur during query execution",
        delete: 'Do you want delete it?',
        additem: 'Insert the name of the new search'
      },
      errors: {
        layers: {
          load: "Some layers are not available"
        },
        unsupported_format: 'Not supported format',
        add_external_layer: 'Load layer error'
      },
      metadata: {
        title: 'Metadata',
        groups: {
          general: {
            title: 'GENERAL',
            fields: {
              title: 'TITLE',
              name: 'NAME',
              description: "DESCRIPTION",
              abstract: "ABSTRACT",
              keywords: 'KEYWORDS',
              fees: "FEES",
              accessconstraints: "ACCESS CONSTRAINT",
              contactinformation: "CONTACTS",
              subfields: {
                contactinformation: {
                  contactelectronicmailaddress: "Email",
                  personprimary: 'References',
                  contactvoicetelephone: 'Phone',
                  contactorganization: 'Organization',
                  ContactOrganization: 'Organization',
                  contactposition: 'Position',
                  ContactPosition: 'Position',
                  contactperson: 'Person',
                  ContactPerson: 'Person'
                }
              },
              wms_url: "WMS"
            }
          },
          spatial:{
            title: 'SPATIAL',
            fields : {
              crs: 'EPSG',
              extent: 'BBOX'
            }
          },
          layers: {
            title: 'LAYERS',
            fields: {
              layers: 'LAYERS',
              subfields: {
                crs: 'EPSG',
                bbox: 'BBOX',
                title: "TITLE",
                name: 'NAME',
                geometrytype: 'GEOMETRY',
                source: 'SOURCE',
                attributes: 'ATTRIBUTES',
                abstract: 'ABSTRACT',
                attribution: 'ATTRIBUTION',
                keywords: "PAROLE CHIAVE",
                metadataurl:'METADATA URL',
                dataurl: "DATA URL"
              }
            },
            groups : {
              general: 'GENERAL',
              spatial: 'SPATIAL'
            }
          },
          credits: {
            title: 'Credits',
          }
        }
      },
      tooltips: {
        relations: {
          form_to_row: "Row View",
          row_to_form: "Form View",
          zoomtogeometry: "Zoom to Geometry",
        },
        copy_map_extent_url: 'Copy share URL',
        download_shapefile: "Download Shapefile",
        download_gpx: "Download GPX",
        download_gpkg: "Download GPKG",
        download_csv: "Download CSV",
        download_xls: "Download XLS",
        download_pdf: "Download PDF",
        show_chart: "Show Chart",
        atlas: "Print Atlas",
        editing: "Editing",
      },
      mapcontrols: {
        query: {
          tooltip: 'Query layer',
          actions: {
            add_selection: {
              hint: "Add/Remove Selection"
            },
            zoom_to_features_extent:{
              hint: "Zoom to features extent"
            },
            add_features_to_results: {
              hint: "Add/Remove features to results"
            },
            remove_feature_from_results: {
              hint: "Remove feature from results"
            },
            zoom_to_feature: {
              hint: "Zoom to feature"
            },
            relations: {
              hint: "Show Relations"
            },
            relations_charts: {
              hint: "Show relations chart"
            },
            download_features_shapefile:{
              hint: 'Download features Shapefile'
            },
            download_shapefile: {
              hint: 'Download feature Shapefile'
            },
            download_features_gpx: {
              hint: "Download feature GPX"
            },
            download_features_gpkg: {
              hint: "Download features GPKG"
            },
            download_gpx: {
              hint: "Download feature GPX"
            },
            download_gpkg: {
              hint: "Download feature GPKG"
            },
            download_features_csv: {
              hint: "Download features CSV"
            },
            download_csv: {
              hint: "Download feature CSV"
            },
            download_features_xls: {
              hint: "Download features XLS"
            },
            download_xls: {
              hint: "Download feature XLS"
            },
            download_pdf: {
              hint: "Download feature PDF"
            },
            atlas: {
              hint: "Print Atlas"
            },
            copy_zoom_to_fid_url: {
              hint: "Share via link",
              hint_change: "Copied"
            }
          }
        },
        queryby: {
          title: 'Query area',
          layer: 'Selected layer:',
          none: 'NONE',
          new: 'TEMPORARY LAYER',
          all: 'ALL',
          methods: {
            intersects: 'intersects',
            within: 'within'
          },
          querybypolygon: {
            tooltip: 'select a polygon'
          },
          querybydrawpolygon: {
            tooltip: 'draw a polygon'
          },
          querybbox: {
            tooltip: 'draw a rectangle'
          },
          querybycircle: {
            tooltip: 'draw a circle'
          }
        },
        querybypolygon: {
          download: {
            title: "Attributes download",
            choiches:{
              feature: {
                label:"Features only",
              },
              feature_polygon: {
                label:"Features+Query Polygon",
              }
            }
          },
          tooltip: 'Query By Polygon',
          no_geometry: 'No geometry on response',
          help: {
            message: "<ul><li>Select a (visible) layer.</li><li>Click on a geometry within map.</li></ul>"
          }
        },
        querybydrawpolygon: {
          tooltip: "Query by Draw Polygon ",
          help: {
            message: "<ul><li>Click on map to add a new vertex</li><li>Double click to finish and query layers</li></ul>"
          }
        },
        querybbox: {
          tooltip: 'Query BBox layer',
          nolayers_visible: 'No querable layers are visible. Please set at least one visible wfs layer to run query',
          help: {
            message: "<ul><li>Drag the mouse to draw a rectangle and query layers</li></ul>"
          }
        },
        querybycircle: {
          tooltip: "Query by Draw Circle ",
          label: 'Radius',
          help: {
            message: "<ul><li>Click on map to draw circle</li></ul>"
          },
        },
        addlayer: {
          messages: {
            csv: {
              warning: "The result in the map is partial due to the presence of the below incorrect records list:"
            }
          },
          tooltip: 'Add Layer'
        },
        geolocation: {
          tooltip: 'Geolocation'
        },
        measures: {
          title: 'Measure',
          length: {
            tooltip: "Length",
            help: "Click on map to draw the line. Press <br>CANC if you want delete last vertex",
          },
          area: {
            tooltip: "Area",
            help: "Click to draw poligon.Press <br>CANC if you want delete last vertex"
          }
        },
        screenshot: {
          title: 'Screen capture',
          screenshot: "PNG",
          geoscreenshot: "GeoTIFF",
          download: 'Generate'
        },
        scale: {
          no_valid_scale: "Invalid Scale"
        },
        scaleline: {
          units: {
            metric: 'Meters',
            nautical: 'Nautical Mile'
          }
        },
        zoomhistory: {
          zoom_last: "Zoom Last",
          zoom_next: "Zoom Next"
        },
        annotation: {
          title: 'Annotation',
          tooltip: 'Create Annotation',
          types: {
            'Point':      'Point',
            'LineString': 'Line',
            'Polygon':    'Polygon',
            'Rectangle':  'Rectangle',
            'Circle':     'Circle',
            'Text':       'Text'
          },
          inputs: {
            'radius':    'Radius',
            'length':    'Length',
            'w_length' : 'Width Length',
            'h_length' : 'Height Length',
            'rotation' : 'Rotation',
            'font_size': 'Font Size',
            'direction': 'Direction',
            'f_direction': 'Forward',
            'b_direction': 'Backward',
            'opacity':   'Opacity',
            'stroke':    'Stroke',
          },
          checkbox: {
            'show_text': 'Show Text',
            'show_info': 'Info'
          },
          actions: {
            'export': 'Export',
            'import': 'Import',
            'remove': 'Remove',
            'show_all': 'Show All,'
          }
        }
      },
      relations: {
        relation_data: 'Relation data',
        no_relations_found: 'No relations found',
        back_to_relations: 'Back to relations',
        list_of_relations_feature: 'List of relations of feature',
        error_missing_father_field: "Field is missing",
        download_with_relations: "Download with relations",
        field: "Relation key field",
      },
      form: {
        loading: 'Loading ...',
        inputs: {
          messages: {
            errors: {
              picklayer: "No feature selected. Check if layer is on editing or visible at current scale"
            }
          },
          tooltips:{
            picklayer: "Get value from ma layer",
            lonlat: "Click on map to get coordinates"
          },
          input_validation_mutually_exclusive: "Field mutually exclusive with ",
          input_validation_error: "Mandatory Field or wrong data type",
          input_validation_error_type: "Wrong data type",
          input_validation_min_field: "Value has to be more/equal to field value  ",
          input_validation_max_field: "Value has to be less/equal to field value ",
          input_validation_exclude_values: "Value has to be unique",
          integer: "integer",
          bigint: "integer",
          text: "text",
          varchar: "text",
          textarea: "text",
          string: "string",
          date: "date",
          datetime: "date",
          float: "float",
          table: "table"
        },
        footer: {
          "required_fields": "Required fields"
        },
        messages: {
          qgis_input_widget_relation: "Use relation specific form to work with relation"
        }
      },
      catalog: {
        current_map_theme_prefix: "THEME",
        choose_map_theme: "CHOOSE THEME",
        choose_map_theme_input_label: 'Name of new map theme',
        project_map_theme : 'Project Themes',
        user_map_theme: 'User Themes',
        question_delete_map_theme: "Do you want delete the theme?",
        delete_map_theme: "Theme deleted successfully",
        saved_map_theme: "Theme saved successfully",
        updated_map_theme: "Theme updated successfully",
        invalid_map_theme_name: "Invalid or exiting name",
        menu: {
          layerposition: 'Layer Position',
          setwmsopacity: "Set Opacity",
          wms: {
            title:"",
            copy: "Click here to copy url",
            copied: "Copied"
          },
          download: {
            unknow: 'Download',
            geotiff_map_extent: "GeoTiff (current view)"
          }
        }
      },
      wps: {
        list_process: "List of process",
        tooltip: 'Click on map'
      }
    },
    credits: {
      g3wSuiteFramework: "Application based on OS framework",
      g3wSuiteDescription: "Publish and manage your QGIS projects on the web",
      productOf: "Framework developed by",
    },
    toggle_color_scheme: "Toggle color scheme",
    logout: "Logout",
    no_other_projects: "No more project for this group",
    no_other_groups: "No more groups for this Macrogroup",
    yes: "Yes",
    no: "No",
    back: "Back",
    backto: "Back to ",
    changemap: "Change map",
    change_session: "Change Session",
    component: "Generic Component",
    search: "Search",
    alerts: "Alerts",
    no_results: "No results found",
    print: "Print",
    create_print: "Create Print",
    dosearch: "Search",
    catalog: "Map",
    data: "Data",
    externalwms: "WMS",
    baselayers: "Base",
    tools: "Tools",
    tree: "Layers",
    legend: "Legend",
    nobaselayer: "No basemap",
    street_search: "Find Address",
    show: "Show",
    hide: "Hide",
    copy_form_data: "Copy data",
    paste_form_data: "Paste",
    copy_form_data_from_feature: "Copy data from map",
    error_map_loading: "Error occurs loading map",
    check_internet_connection_or_server_admin: "Check internet connection or contact admin",
    could_not_load_vector_layers: "Connection error: Layers can be loaded",
    server_saver_error: "Error in server saving",
    server_error: "Server connection error",
    save: "Save",
    cancel: "Cancel",
    update: "Update",
    close: "Close",
    /** @since 3.8.0 */
    dont_show_again: "Don't show again",
    enlange_reduce: "Enlarge / Reduce",
    add: "Add",
    exitnosave: "Exit without save",
    annul: "Cancel",
    layer_is_added: "Layer with same name already added",
    sidebar: {
      wms: {
        panel: {
          title:'Add WMS Layer',
          label: {
            position: "Map Position",
            name: "Name",
            projections: 'Projection',
            layers: 'Layers'
          }
        },
        add_wms_layer: "Add WMS layer",
        delete_wms_url: "Remove",
        layer_id_already_added: "A WMS connection with this name already exists",
        url_already_added: "WMS URL/Name already added",
        layer_add_error: "WMS Layer not added. Please check all wms parameter or url"
      }
    },
    info: {
      title: "Results",
      list_of_relations: "List of Relations",
      open_link: "Open attached document",
      server_error: "An error occurred from server",
      no_results: "No results found for this query/search",
      link_button: "Open"
    },
    mapcontrols: {
      geolocation: {
        error: "Can't get your position"
      },
      geocoding: {
        choose_layer: "Choose a layer where to add this feature",
        placeholder: "Address ...",
        nolayers: "No editable point layers found on this project",
        noresults: "No results",
        notresponseserver: "No response from server"
      },
      add_layer_control: {
        header: "Add Layer",
        select_projection: "Projection",
        select_field_to_show: "field shown on map",
        select_csv_separator: "Delimiter",
        select_csv_x_field: "X field",
        select_csv_y_field: "Y field",
        select_color: "Layer Color",
        drag_layer: "Add your file here",
        persistent_data: "Persistent data",
        persistent_help: "save layer into browser storage",
      },
      query: {
        input_relation: "Click to show relations"
      },
      length: {
        tooltip: "Length"
      },
      area: {
        tooltip: "Area"
      },
      screenshot: {
        error: "Screenshot error creation",
        securityError: `  
        <p><b>Security Error</b>: an external layer is preventing map from being printed. To check, proceed as follows:</p>
        <ol>
          <li>remove any manually added external layers (eg. WMS layers)</li>
          <li>force page reload: <code>CTRL + F5</code></li>
          <li>print again the map</li>
        </ol>
        <p>For more info please contact server administrator about: <a href="https://developer.mozilla.org/en-US/docs/Web/HTML/CORS_enabled_image" style="color: #000 !important;font-weight: bold;">&#x2139;&#xFE0F; security and tainted canvases</a></p>
        `
      }
    },
    catalog_items: {
      helptext: "Open menu",
      contextmenu: {
        zoomtolayer: "Zoom to Layer",
        open_attribute_table: "Open Attribute Table",
        show_metadata: "Metadata",
        styles: 'Style',
        vector_color_menu:"Color",
        layer_opacity: "Opacity",
        filters: "Filters",
        download: 'Save as',
        ogc_services: 'OGC Services',
        edit: "Edit Layer",
      }
    },
    dataTable: {
      previous: "Previous",
      next: "Next",
      lengthMenu: "Show _MENU_ values per page",
      info: "_TOTAL_ entries",
      no_data: "No data",
      nodatafilterd: "No matching records found",
      infoFiltered: "(filtered from _MAX_ total records)"
    },
    /**@since 3.10.0 */
    no_geometry: 'This item has no geometry',
    /**@since 3.11.0 */
    query_filter: 'Filter by:',
    /**@since 3.11.0 */
    sidebar_menu: 'Sidebar menu',
    /**@since 3.11.0 */
    layer_type: 'Layer type',
    /** @since 3.11.0 */
    choose_type: 'Choose type',
    /**@since 3.11.0 */
    remote_wms_url: 'WMS (URL)',
    /**@since 3.11.0 */
    local_file: 'Local file',
    /**@since 3.11.0 */
    embed_map: 'Embed map',
    /** @since 3.11.0 */
    homepage: 'Home',
    /** @since 3.11.0 */
    wms_server: 'WMS Server',
    /** @since 3.11.0 */
    connect_to_wms: 'Connect',
    /** @since 3.11.0 */
    disconnect_from_wms: 'Disconnect',
    /** @since 3.11.0 */
    add_new_wms_url_help: 'Search through saved connections or add a new server',
    /** @since 3.11.0 */
    saved_connections: 'Saved connections:',
    /** @since 3.11.0 */
    label: "Label",
    /** @since 3.11.0 */
    no_csv_field: 'No valid fields',
    /** @since 3.11.0 */
    show_more: 'Show more',
  },
};

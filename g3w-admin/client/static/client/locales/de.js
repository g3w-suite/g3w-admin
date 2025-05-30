export default {
  translation: {
    error_page: {
      error: "Verbindungsfehler",
      at_moment: "Karte anzeigen ist im Moment nicht möglich",
      f5: "Drücken Sie Strg+F5"
    },
    cookie_law: {
      message: "Diese Website verwendet Cookies, um Ihnen die bestmögliche Erfahrung auf unserer Website zu bieten.",
      buttonText: "Verstanden!"
    },
    default:"default",
    sign_in: "Anmelden",
    layer_selection_filter: {
      tools: {
        filter: "Filter aktivieren/deaktivieren",
        nofilter: "Filter entfernen",
        invert: "Auswahl umkehren",
        clear: "Auswahl löschen",
        show_features_on_map: "Aktualisieren Sie die Ergebnisse beim Verschieben der Karte",
        savefilter: "Filter speichern",
        filterName: "Filtername",
      }
    },
    warning: {
      not_supported_format: "Nicht unterstütztes Format"
    },
    layer_position: {
      top: 'OBEN',
      bottom: 'UNTEN',
      message: "Position relativ zu den Layern im TOC"
    },
    sdk: {
      atlas: {
        template_dialog: {
          title: "Template auswählen"
        }
      },
      spatialbookmarks: {
        title: "Räumliche Lesezeichen",
        helptext: "Bewegen Sie sich auf der Kartenausdehnung, fügen Sie den Namen ein und klicken Sie auf Hinzufügen",
        input: {
          name: "Name"
        },
        sections: {
          project:{
            title: "Projekt-Lesezeichen"
          },
          user: {
            title: "Benutzer-Lesezeichen"
          }
        }
      },
      search: {
        all: 'ALLE',
        no_results: "Keine Ergebnisse",
        searching: "Suchen ...",
        error_loading: "Fehler beim Datenladen",
        layer_not_searchable: "Layer ist nicht durchsuchbar",
        layer_not_querable: "Layer ist nicht abfragbar",
        autocomplete: {
          inputshort: {
            pre: "Bitte",
            post: "oder mehrere Zeichen eingeben"
          }
        },
        help_filter : "Suchwerte werden basierend auf dem aktiven Filter begrenzt. Entfernen Sie den Filter, um nach allen Daten zu suchen.",
        autofilter: "Filtern Sie die Ergebnisse"
      },
      print: {
        no_layers: 'Kein Layer zu drucken',
        template: "Template",
        labels: "Labels",
        scale: "Skala",
        format: "Format",
        rotation: "Drehung",
        download_image: "Bild herunterladen",
        fids_instruction: "Akzeptierte Werte: von 1 bis [max]. Es ist möglich, ein Intervall einzugeben, z. B. 4-6",
        fids_example: "Bsp. 1,4-6 druckt id 1,4,5,6",
        help: "Die im Druck angezeigten Layer können die im Projekt definierten sein und nicht die auf der Karte angezeigten"
      },
      querybuilder: {
        search: {
          run: "Ausführen",
          info: "Information",
          delete: "Löschen",
          edit: "Bearbeiten"
        },
        messages: {
          changed: 'Gespeichert',
          number_of_features: "Anzahl der Features"
        },
        panel: {
          button: {
            all: 'ALLE',
            save: 'SPEICHERN',
            test: 'TEST',
            clear: 'LÖSCHEN',
            run: 'AUSFÜHREN',
            manual: 'MANUELL'
          },
          layers: 'LAYERS',
          fields: 'FELDER',
          values: 'WERTE',
          operators: 'OPERATOREN',
          expression: 'AUSDRUCK'
        },
        error_run: 'Es ist ein Fehler aufgetreten. Bitte überprüfen Sie die Abfrage',
        error_test: "Während der Ausführung der Abfrage ist ein Fehler aufgetreten",
        delete: 'Soll es gelöscht werden?',
        additem: 'Geben Sie den Namen der neuen Suche ein'
      },
      errors: {
        layers: {
          load: "Einige Layer sind nicht verfügbar"
        },
        unsupported_format: 'Nicht unterstütztes Format',
        add_external_layer: 'Fehler im Ladevorgang des Layers'
      },
      metadata: {
        title: 'Metadaten',
        groups: {
          general: {
            title: 'ALLGEMEIN',
            fields: {
              title: 'TITEL',
              name: 'NAME',
              description: "BESCHREIBUNG",
              abstract: "ABASTRACT",
              keywords: 'SCHLÜSSELWÖRTER',
              fees: "GEBÜHREN",
              accessconstraints: "ZUGRIFFSBESCHRÄNKUNG",
              contactinformation: "KONTAKTE",
              subfields: {
                contactinformation: {
                  contactelectronicmailaddress: "Email",
                  personprimary: 'Referenzen',
                  contactvoicetelephone: 'Telefon',
                  contactorganization: 'Firma',
                  ContactOrganization: 'Firma',
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
                title: "TITEL",
                name: 'NAME',
                geometrytype: 'GEOMETRIE',
                source: 'QUELLE',
                attributes: 'ATTRIBUTE',
                abstract: 'ABSTRACT',
                attribution: 'ATRIBUTION',
                keywords: "SCHLÜSSELWÖRTER",
                metadataurl:'METADATEN URL',
                dataurl: "DATEN URL"
              }
            },
            groups : {
              general: 'ALLGEMEIN',
              spatial: 'SPATIAL'
            }
          }
        }
      },
      tooltips: {
        relations: {
          form_to_row: "Zeilenansicht",
          row_to_form: "Formularansicht",
          zoomtogeometry: "Auf Geometrie zoomen",
        },
        copy_map_extent_url: 'Link zur Kartenansicht kopieren',
        download_shapefile: "Shapefile herunterladen",
        download_gpx: "DGPX herunterladen",
        download_gpkg: "GPKG herunterladen",
        download_csv: "CSV herunterladen",
        download_xls: "XLS herunterladen",
        download_pdf: "PDF herunterladen",
        show_chart: "Diagramm anzeigen",
        atlas: "Atlas drucken",
        editing: "Editing",
      },
      mapcontrols: {
        query: {
          tooltip: 'Query layer',
          actions: {
            add_selection: {
              hint: "Auswahl hinzufügen/entfernen"
            },
            zoom_to_features_extent:{
              hint: "Zoom auf Feature-Ausdehnung"
            },
            add_features_to_results: {
              hint: "Hinzufügen/Entfernen von Features zu den Ergebnissen"
            },
            remove_feature_from_results: {
              hint: "Feature aus den Ergebnissen entfernen"
            },
            zoom_to_feature: {
              hint: "Zum Feature zoomen"
            },
            relations: {
              hint: "Relationen anzeigen"
            },
            relations_charts: {
              hint: "Relationship-Diagramm anzeigen"
            },
            download_features_shapefile:{
              hint: 'Features Shapefile herunterladen'
            },
            download_shapefile: {
              hint: 'Feature Shapefile herunterladen'
            },
            download_features_gpx: {
              hint: "Feature GPX herunterladen"
            },
            download_features_gpkg: {
              hint: "Feature GPKG herunterladen"
            },
            download_gpx: {
              hint: "Feature GPX herunterladen"
            },
            download_gpkg: {
              hint: "Feature GPKG herunterladen"
            },
            download_features_csv: {
              hint: "Features CSV herunterladen"
            },
            download_csv: {
              hint: "Feature CSV herunterladen"
            },
            download_features_xls: {
              hint: "Features XLS herunterladen"
            },
            download_xls: {
              hint: "Feature XLS herunterladen"
            },
            download_pdf: {
              hint: "Feature PDF herunterladen"
            },
            atlas: {
              hint: "Atlas drucken"
            },
            copy_zoom_to_fid_url: {
              hint: "Kopieren der Karten-URL mit dieser Geometrie-Feature-Erweiterung",
              hint_change: "Kopiert"
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
            title: "Attribute herunterladen",
            choiches:{
              feature: {
                label:"Nur Features",
              },
              feature_polygon: {
                label:"Features+Query Polygon",
              }
            }
          },
          tooltip: 'Query nach Polygon',
          no_geometry: 'Keine Geometrie in der Antwort',
          help: {
            message: "<ul><li>Wählen Sie einen Polygon Layer auf TOC.</li><li>Stellen Sie sicher, dass der Layer sichtbar ist.</li><li>Klicken Sie auf ein Feature des ausgewählten Layers.</li></ul>"
          }
        },
        querybydrawpolygon: {
          tooltip: "Abfrage durch Polygon zeichnen"
        },
        querybbox: {
          tooltip: 'BBox Layer abfragen',
          nolayers_visible: 'Es sind keine abfragbaren Layer sichtbar. Bitte setzen Sie mindestens einen sichtbaren wfs Layer, um die Abfrage zu starten',
          help: {
            message: "<ul><li>Ein Quadrat auf der Karte ziehen, um unterstrichene Layer im TOC abzufragen</li></ul>"
          }
        },
        addlayer: {
          messages: {
            csv: {
              warning: "Das Ergebnis in der Karte ist unvollständig, da die unten stehende Liste fehlerhafter Einträge enthält:"
            }
          },
          tooltip: 'Layer hinzufügen'
        },
        geolocation: {
          tooltip: 'Geolokalisierung'
        },
        measures: {
          length: {
            tooltip: "Länge",
            help: "Klicken Sie auf die Karte, um die Linie zu zeichnen. Drücken Sie <br>CANC, wenn Sie den letzten Eckpunkt löschen möchten.",
          },
          area: {
            tooltip: "Fläche",
            help: "Drücken Sie <br>CANC, wenn Sie den letzten Eckpunkt löschen wollen."
          }
        },
        scale: {
          no_valid_scale: "Ungültige Skala"
        },
        scaleline: {
          units: {
            metric: 'Meter',
            nautical: 'Nautische Meile'
          }
        },
        zoomhistory: {
          zoom_last: "Zoom Vorheriger",
          zoom_next: "Zoom Nächster"
        }
      },
      relations: {
        relation_data: 'Daten zur Relation',
        no_relations_found: 'Keine Relationen gefunden',
        back_to_relations: 'Zurück zu den Relationen',
        list_of_relations_feature: 'Liste der Relationen des Features',
        error_missing_father_field: "Ein Feld fehlt",
        download_with_relations: "Download mit Beziehungen",
        field: "Relation key field",
      },
      form: {
        loading: 'Laden ...',
        inputs: {
          messages: {
            errors: {
              picklayer: "Kein Feature ausgewählt. Prüfen, ob der Layer in Bearbeitung oder im aktuellen Maßstab sichtbar ist"
            }
          },
          tooltips:{
            picklayer: "Wert aus dem Layer abrufen",
            lonlat: "Zum Abrufen der Koordinaten auf die Karte klicken"
          },
          input_validation_mutually_exclusive: "Feld schließt sich gegenseitig aus mit ",
          input_validation_error: "Obligatorisches Feld oder falscher Datentyp",
          input_validation_error_type: "Falscher Datentyp",
          input_validation_min_field: "Der Wert muss größer/gleich sein als der Feldwert  ",
          input_validation_max_field: "Der Wert muss kleiner/gleich sein als der Feldwert ",
          input_validation_exclude_values: "Wert muss einmalig sein",
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
          "required_fields": "Erforderliche Felder"
        },
        messages: {
          qgis_input_widget_relation: "Spezifisches Relations-Formular verwenden, um mit Relationen zu arbeiten"
        }
      },
      catalog: {
        current_map_theme_prefix: "THEMA",
        choose_map_theme: "THEMA AUSWÄHLEN",
        choose_map_theme_input_label: 'Name des neuen Themes',
        project_map_theme : 'Projekt Themes',
        user_map_theme: 'Benutzer Themes',
        question_delete_map_theme: "Möchten Sie das Thema löschen??",
        delete_map_theme: "Theme erfolgreich gelöscht",
        saved_map_theme: "Thema erfolgreich gespeichert",
        updated_map_theme: "Thema aktualisieren gespeichert",
        invalid_map_theme_name: "Der Name ist bereits vorhanden oder falsch",
        menu: {
          layerposition: 'Position der Ebenen',
          setwmsopacity: "Opazität einstellen",
          wms: {
            title:"",
            copy: "Klicken Sie hier, um die Url zu kopieren",
            copied: "Kopiert"
          },
          download: {
            unknow: "Herunterladen",
            shp: 'Shapefile herunterladen',
            gpx: 'GPX herunterladen',
            gpkg: 'GPKG herunterladen',
            csv: 'CSV herunterladen',
            xls: 'XLS herunterladen',
            geotiff: "GEOTIFF herunterladen",
            geotiff_map_extent: "GEOTIFF herunterladen (aktueller Ansichtsumfang)"
          }
        }
      },
      wps: {
        list_process: "Liste der Prozesse",
        tooltip: 'Karte anklicken'
      }
    },
    credits: {
      g3wSuiteFramework: "Applikation basiert auf OS-Framework",
      g3wSuiteDescription: "Veröffentlichen und verwalten Sie Ihre QGIS-Projekte im Internet",
      productOf: "Framework entwickelt von",
    },
    toggle_color_scheme: "Farbschema umschalten",
    logout: "Logout",
    no_other_projects: "Kein weiteres Projekt für diese Gruppe",
    no_other_groups: "Keine weiteren Gruppen für diese Makrogruppe",
    yes: "Ja",
    no: "No",
    back: "Zurück",
    backto: "Zurück zu ",
    changemap: "Karte ändern",
    change_session: "Sitzung ändern",
    component: "Allgemeine Komponente",
    search: "Suche",
    no_results: "Keine Ergebnisse gefunden",
    print: "Drucken",
    create_print: "Drucken erstellen",
    dosearch: "Suche",
    catalog: "Karte",
    data: "Daten",
    externalwms: "WMS",
    baselayers: "Base",
    tools: "Tools",
    tree: "Layers",
    legend: "Legende",
    nobaselayer: "Keine Basemap",
    street_search: "Adresse finden",
    show: "Anzeigen",
    hide: "Ausblenden",
    copy_form_data: "Daten kopieren",
    paste_form_data: "Einfügen",
    copy_form_data_from_feature: "Daten von der Karte kopieren",
    error_map_loading: "Fehler beim Laden der Karte",
    check_internet_connection_or_server_admin: "Internetverbindung prüfen oder Admin kontaktieren",
    could_not_load_vector_layers: "Verbindungsfehler: Layers können geladen werden",
    server_saver_error: "Fehler beim Speichern auf dem Server",
    server_error: "Server-Verbindungsfehler",
    save: "Speichern",
    cancel: "Abbrechen",
    update: "Aktualisieren",
    close: "Schließen",
    /** @since 3.8.0 */
    dont_show_again: "Diese Meldung nicht mehr anzeigen",
    enlange_reduce: "Vergrößern / Verkleinern",
    add: "Hinzufügen",
    exitnosave: "Beenden ohne Speichern",
    annul: "Abbrechen",
    layer_is_added: "Layer mit gleichem Namen bereits hinzugefügt",
    sidebar: {
      wms: {
        panel: {
          title:'WMS Layer hinzufügen',
          label: {
            position: "Kartenposition",
            name: "Name",
            projections: 'Projektion',
            layers: 'Layers'
          }
        },
        add_wms_layer: "WMS Layer hinzufügen",
        delete_wms_url: "WMS Url löschen",
        layer_id_already_added: "WMS Layer bereits hinzugefügt",
        url_already_added: "WMS URL/Name bereits hinzugefügt",
        layer_add_error: "WMS Layer nicht hinzugefügt. Bitte überprüfen Sie alle WMS-Parameter oder Url"
      }
    },
    info: {
      title: "Ergebnisse",
      list_of_relations: "List of Relations",
      open_link: "Beigefügtes Dokument öffnen",
      server_error: "Auf dem Server ist ein Fehler aufgetreten",
      no_results: "Keine Ergebnisse für diese Anfrage/Suche gefunden",
      link_button: "Öffnen"
    },
    mapcontrols: {
      geolocation: {
        error: "Position kann nicht bestimmt werden"
      },
      geocoding: {
        choose_layer: "Wählen Sie eine Ebene aus, auf der Sie diese Funktion hinzufügen möchten",
        placeholder: "Addresse ...",
        nolayers: "Für dieses Projekt wurden keine bearbeitbaren Punktebenen gefunden",
        noresults: "Keine Ergebnisse",
        notresponseserver: "Keine Antwort vom Server"
      },
      add_layer_control: {
        header: "Layer hinzufügen",
        select_projection: "Layer Projektion auswählen",
        select_field_to_show: "Feld auswählen, das auf der Karte angezeigt werden soll",
        select_csv_separator: "Begrenzer auswählen",
        select_csv_x_field: "X-Feld auswählen",
        select_csv_y_field: "Y-Feld auswählen",
        select_color: "Layer Farbe auswählen",
        drag_layer: "Layer hierher ziehen und ablegen"
      },
      query: {
        input_relation: "Klicken, um Relationen anzuzeigen"
      },
      length: {
        tooltip: "Länge"
      },
      area: {
        tooltip: "Area"
      },
      screenshot: {
        error: "Screenshot Fehlererstellung",
        securityError: `  
        <p><b>Sicherheitsfehler</b>: Eine externe Ebene verhindert, dass die Karte gedruckt wird. Gehen Sie zur Überprüfung wie folgt vor:</p>
        <ol>
          <li>Entfernen Sie alle manuell hinzugefügten externen Ebenen (z. B. WMS-Ebenen)</li>
          <li>Neuladen der Seite erzwingen: <code>STRG + F5</code></li>
          <li>Drucken Sie die Karte erneut</li>
        </ol>
        <p>Für weitere Informationen wenden Sie sich bitte an den Serveradministrator zu: <a href="https://developer.mozilla.org/en-US/docs/Web/HTML/CORS_enabled_image" style="color: #000 !important;font -weight: fett;">&#x2139;&#xFE0F; Sicherheit und befleckte Leinwände</a></p>
        `
      }
    },
    catalog_items: {
      helptext: "Klicken Sie mit der rechten Maustaste auf einen einzelnen Layer, um auf zusätzliche Funktionen zuzugreifen",
      contextmenu: {
        zoomtolayer: "Zoom auf Layer",
        open_attribute_table: "Attributtabelle öffnen",
        show_metadata: "Metadaten",
        styles: 'Stile',
        vector_color_menu:"Farbe einstellen/ändern",
        layer_opacity: "Opazität",
        filters: "Filters",
      }
    },
    dataTable: {
      previous: "Vorherige",
      next: "Weiter",
      lengthMenu: "Zeigen Sie _MENU_ Werte pro Seite an",
      info: "_TOTAL_ Ergebnissen",
      no_data: "Keine Daten",
      nodatafilterd: "Keine passenden Datensätze gefunden",
      infoFiltered: "(gefiltert aus _MAX_ Gesamtsätzen)"
    }
  },
};
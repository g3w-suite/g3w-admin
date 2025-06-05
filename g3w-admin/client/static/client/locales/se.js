export default {
  translation: {
    error_page: {
      error: "Anslutningsfel",
      at_moment: "För närvarande är det inte möjligt att visa kartan",
      f5: "Tryck på Ctrl+F5"
    },
    cookie_law: {
      message: "Denna applikation använder cookies för att den ska fungera så bra som möjligt för dig.",
      buttonText: "Jag accepterar"
    },
    default: "standard",
    sign_in:"Logga in",
    layer_selection_filter: {
      tools: {
        filter: "Aktivera/inaktivera filter",
        nofilter: "Avlägsna Filtrera",
        invert: "Invertera Urval",
        clear: "Annullera Urval",
        show_features_on_map: "Rezultatele se actualizează când harta este deplasată",
        savefilter: "Spara Filter",
        filterName: "Filternamn",
      }
    },
    warning: {
      not_supported_format: "Formatet stöds inte"
    },
    layer_position: {
      top: 'Överst',
      bottom: 'Underst',
      message: "Position relativt till lager i lagerlistan"
    },
    sdk: {
      atlas: {
        template_dialog: {
          title: "Välj Template"
        }
      },
      spatialbookmarks: {
        title: "Rumsliga bokmärken",
        helptext: "Flytta på kartans omfattning, ange namn och klicka på Lägg till",
        input: {
          name: "Namn"
        },
        sections: {
          project:{
            title: "Projektbokmärken"
          },
          user: {
            title: "Användarbokmärken"
          }
        }
      },
      search: {
        all: 'ALLA',
        no_results: "Inga resultat",
        searching: "Sökning ...",
        error_loading: "Fel vid laddning av uppgifter.",
        layer_not_searchable: "Nivån kan inte sökas.",
        layer_not_querable: "Förfrågningar kan inte göras på nivån.",
        autocomplete: {
          inputshort: {
            pre: "Mata in",
            post: "eller flera tecken"
          }
        },
        help_filter : "Sökvärdena är begränsade baserat på det aktiva filtret. Ta bort filtret för att söka på all data.",
        autofilter: "Filtrera resultaten"
      },
      print: {
        no_layers: 'Inga nivåer att skriva ut',
        template: "Template",
        labels: "Labels",
        scale: "Skala",
        format: "Format",
        rotation: "Rotation",
        download_image: "Ladda ner bild",
        fids_instruction: "Godkända värden: Från ett till värdet [max]. Mellanslag tillåts, t.ex. 4-6.",
        fids_example: "Exempelvis 1,4-6 skriver ut id 1,4,5,6.",
        help: "Nivåerna på utskriften kan vara specificerade i ett projekt inte sådana som visas på karta."
      },
      querybuilder: {
        search: {
          run: "Utför",
          info: "Information",
          delete: "Ta bort",
          edit: "Redigera"
        },
        messages: {
          changed: 'Sparat',
          number_of_features: "Antal funktione"
        },
        panel: {
          button: {
            all: 'ALLA',
            save: 'SPARA',
            test: 'TEST',
            clear: 'TÖM',
            run: 'UTFÖR',
            manual: 'MANUELL'
          },
          layers: 'NIVÅER',
          fields: 'FÄLT',
          values: 'VÄRDEN',
          operators: 'OPERATÖRER',
          expression: 'KLAUSUL'
        },
        error_run: 'Ett fel inträffade. Kontrollera förfrågan.',
        error_test: "Ett fel inträffade när förfrågan utfördes.",
        delete: 'Vill du ta bort den?',
        additem: 'Ge den nya sökningen ett namn.'
      },
      errors: {
        layers: {
          load: "Vissa nivåer är inte tillgängliga."
        },
        unsupported_format: 'Formatet stöds inte',
        add_external_layer: 'Fel vid laddning av nivån'
      },
      metadata: {
        title: 'Metadata',
        groups: {
          general: {
            title: 'ALLMÄN',
            fields: {
              title: 'RUBRIK',
              name: 'NAMN',
              description: "BESKRIVNING",
              abstract: "SAMMANDRAG",
              keywords: 'NYCKELORD',
              fees: "AVGIFTER",
              accessconstraints: "ÅTKOMSTBEGRÄNSNINGAR",
              contactinformation: "KONTAKTUPPGIFTER",
              subfields: {
                contactinformation: {
                  contactelectronicmailaddress: "E-post",
                  personprimary: 'Referenser',
                  contactvoicetelephone: 'Telefon',
                  contactorganization: 'Organisation',
                  ContactOrganization: 'Organisation',
                  contactposition: 'Ställning',
                  ContactPosition: 'Ställning',
                  contactperson: 'Kontaktperson',
                  ContactPerson: 'Kontaktperson'
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
            title: 'NIVÅER',
            fields: {
              layers: 'NIVÅER',
              subfields: {
                crs: 'EPSG',
                bbox: 'BBOX',
                title: "RUBRIK",
                name: 'NAMN',
                geometrytype: 'GEOMETRI',
                source: 'KÄLLA',
                attributes: 'ATTRIBUT',
                abstract: 'SAMMANDRAG',
                attribution: 'TILLSKRIVNING',
                keywords: "NYCKELORD",
                metadataurl:'METADATA URL',
                dataurl: "DATA URL"
              }
            },
            groups : {
              general: 'ALLMÄN',
              spatial: 'SPATIAL'
            }
          }
        }
      },
      tooltips: {
        relations: {
          form_to_row: "Radvy",
          row_to_form: "Tabellvy",
          zoomtogeometry: "Zooma till geometri",
        },
        copy_map_extent_url: 'Kopiera länk till karta',
        download_shapefile: "Ladda SHP-fil",
        download_gpx: "Ladda GPX-fil",
        download_gpkg: "Ladda GPKG-fil",
        download_csv: "Ladda CSV-fil",
        download_xls: "Ladda XLS-fil",
        download_pdf: "Ladda PDF-fil",
        show_chart: "Visa diagram", //Tero 9.12.2020
        atlas: "Skriv ut Atlas",
        editing: "Editing",
      },
      mapcontrols: {
        query: {
          tooltip: 'Förfrågningsnivå',
          actions: {
            add_selection: {
              hint: "Lägg till/Avlägsna Urval"
            },
            zoom_to_features_extent:{
              hint: "Zooma till egenskapens omfattning"
            },
            add_features_to_results: {
              hint: "Add/Remove features to results"
            },
            remove_feature_from_results: {
              hint: "Remove feature from results"
            },
            zoom_to_feature: {
              hint: "Zooma till egenskapen"
            },
            relations: {
              hint: "Visa relationerna"
            },
            relations_charts: {
              hint: "Visa relationsdiagrammet" //Tero 9.12.2020
            },			  
            download_features_shapefile:{
              hint: 'Ladda egenskapens SHP-fil'
            },
            download_shapefile: {
              hint: 'Ladda egenskapens SHP-fil'
            },
            download_features_gpx: {
              hint: "Ladda egenskapens GPX-fil"
            },
            download_features_gpkg: {
              hint: "Ladda egenskapens GPKG-fil"
            },
            download_gpx: {
              hint: "Ladda egenskapens GPX-fil"
            },
            download_gpkg: {
              hint: "Ladda egenskapens GPKG-fil"
            },
            download_features_csv: {
              hint: "Ladda egenskapens CSV-fil"
            },
            download_csv: {
              hint: "Ladda egenskapens CSV-fil"
            },
            download_features_xls: {
              hint: "Ladda egenskapens XLS-fil"
            },
            download_xls: {
              hint: "Ladda egenskapens XLS-fil"
            },
            download_pdf: {
              hint: "Ladda egenskapens PDF-fil"
            },
            atlas: {
              hint: "Skriv ut Atlas"
            },
            copy_zoom_to_fid_url: {
              hint: "Copy map URL with this geometry feature extension",
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
          tooltip: 'Förfrågan med polygon',
          no_geometry: 'No geometry on response',
          help: {
            message: "<ul><li>Välj polygonnivå i listan.</li><li>Kontrollera att nivån är synlig.</li><li>Välj egenskap på önskad nivå.</li></ul>"
          }
        },
        querybydrawpolygon: {
          tooltip: "Fråga efter ritpolygon"
        },
        querybbox: {
          tooltip: 'BBox-förfrågan som riktar sig till en nivå',
          nolayers_visible: 'Inga nivåer som förfrågningar kan riktas till. Gör minst en WFS-nivå synlig för att kunna utföra sökningen.',
          help: {
            message: "<ul><li>Rita upp en rektangel på kartan för att utföra förfrågan på de i listan understreckade nivåerna.</li></ul>"
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
          tooltip: 'Lägg till nivå'
        },
        geolocation: {
          tooltip: 'Geografiskt läge'
        },
        measures: {
          length: {
            tooltip: "Längd",
            help: "Rita upp en bruten linje på kartan. Tryck <br>CANC, om du vill ta bort föregående punkt.",
          },
          area: {
            tooltip: "Område",
            help: "Rita upp en polygon på kartan. Tryck <br>CANC, om du vill ta bort föregående punkt."
          }
        },
        scale: {
          no_valid_scale: "Fel skala"
        },
        scaleline: {
          units: {
            metric: 'Meters',
            nautical: 'Nautical Mile'
          }
        },
        zoomhistory: {
          zoom_last: "Zoom Föregående",
          zoom_next: "Zoom Nästa"
        }
      },
      relations: {
        relation_data: 'Relationsuppgifter',
        no_relations_found: 'Inga relationer hittades.',
        back_to_relations: 'Tillbaka till relationerna',
        list_of_relations_feature: 'Lista på egenskapens relationer',
        error_missing_father_field: "Fält saknas",
        download_with_relations: "Ladda ner med relationer",
        field: "Relation key field",
      },
      form: {
        loading: 'Laddning...',
        inputs: {
          messages: {
            errors: {
              picklayer: "Inga egenskaper har valts. Kontroller att nivån kan redigeras eller att den syns med nuvarande skala."
            }
          },
          tooltips:{
            picklayer: "Välj värde på kartnivå",
            lonlat: "Click on map to get coordinates"
          },
          input_validation_mutually_exclusive: "Fälten utesluter varandra.",
          input_validation_error: "Obligatoriskt fält eller fel datatyp.",
          input_validation_error_type: "Fel datatyp.",
          input_validation_min_field: "Värdet ska vara större eller lika stort som värdet i fältet.",
          input_validation_max_field: "Värdet ska vara mindre eller lika stort som värdet i fältet.",
          input_validation_exclude_values: "Värdet ska vara unikt.",
          integer: "heltal",
          bigint: "heltal",
          text: "text",
          varchar: "text",
          textarea: "text",
          string: "teckensträng",
          date: "datum",
          datetime: "datum",
          float: "flyttal",
          table: "tabell"
        },
        footer: {
          "required_fields": "Obligatoriska fält"
        },
        messages: {
          qgis_input_widget_relation: "Använd den specifika funktinen för att bestämma relationer"
        }
      },
      catalog: {
        current_map_theme_prefix: "THEME",
        choose_map_theme: "CHOOSE THEME",
        choose_map_theme_input_label: 'Namn på det nya temat',
        project_map_theme : 'Temat de proiect',
        user_map_theme: "Temat utilizator",
        question_delete_map_theme: "Vill du ta bort temat?",
        delete_map_theme: "Temat har tagits bort",
        saved_map_theme: "Temat har sparats",
        updated_map_theme: "Temat har uppdaterats",
        invalid_map_theme_name: "Namnet finns redan eller är felaktigt",
        menu: {
          layerposition: 'Lagerposition',
          setwmsopacity: "Ställ in Opacitet",
          wms: {
            title:"",
            copy: "Tryck här för att kopiera url.",
            copied: "Kopierad."
          },
          download: {
            unknow: 'Ladda',
            shp: 'Ladda SHP-fil',
            gpx: 'Ladda GPX-fil',
            gpkg: 'Ladda GPKG-fil',
            csv: 'Ladda CSV-fil',
            xls: 'Ladda XLS-fil',
            geotiff: 'Ladda GEOTIFF-fil',
            geotiff_map_extent: "Ladda GEOTIFF-fil(current view extent)"
          }
        }
      },
      wps: {
        list_process: "Lista på processer",
        tooltip: 'Välj på kartan'
      }
    },
    credits: {
      g3wSuiteFramework: "Tillämpningen baserar på OS framework",
      g3wSuiteDescription: "Publicera och hantera QGIS-projekt på nätet.",
      productOf: "Framework har utvecklats av",
    },
    toggle_color_scheme: "Toggle color scheme",
    logout: "Logga ut",
    no_other_projects: "Inga projekt för denna grupp",
    no_other_groups: "Inga fler grupper för denna makrogrupp",
    yes: "Ja",
    no: "Nej",
    back: "Gå tillbaka",
    backto: "Tillbaka ",
    changemap: "Byt karta",
    change_session: "Ändra session",
    component: "Allmän komponent",
    search: "Sök",
    no_results: "Inga sökresultat",
    print: "Skriv ut",
    create_print: "Skapa utskrift",
    dosearch: "Sök",
    catalog: "Karta",
    data: "Data",
    externalwms: "WMS",
    baselayers: "Bakgrundskarta",
    tools: "Verktyg",
    tree: "Nivåer",
    legend: "Förklaring till beteckningarna",
    nobaselayer: "Ingen bakgrundskarta",
    street_search: "Sök adress",
    show: "Visa",
    hide: "Dölj",
    copy_form_data: "Kopiera uppgifterna",
    paste_form_data: "Infoga",
    copy_form_data_from_feature: "Kopiera uppgifter från kartan",
    error_map_loading: "Fel vid laddning av kartan",
    check_internet_connection_or_server_admin: "Kontrollera internetanslutningen eller kontakta administratören.",
    could_not_load_vector_layers: "Fel i anslutningen, nivåer kan inte laddas.",
    server_saver_error: "Fel vid lagring på servern.",
    server_error: "Fel på anslutningen till servern",
    save: "Spara",
    cancel: "Ånga",
    update: "Uppdatering",
    close: "Stäng",
    /** @since 3.8.0 */
    dont_show_again: "Visa inte det här meddelandet igen",
    enlange_reduce: "Förstora / Förminska",
    add: "Lägg till",
    exitnosave: "Lämna programmet utan att spara",
    annul: "Ångra",
    layer_is_added: "Lagret med samma namn har redan lagts till.",
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
        add_wms_layer: "Aggiungi WMS layer",
        delete_wms_url: "Delete WMS url",
        layer_id_already_added: "WMS Nivån har redan lagts till.",
        url_already_added: "WMS URL/Namn har redan lagts till.",
        layer_add_error: "WMS Layer not added. Please check all wms parameter or url"
      }
    },
    info: {
      title: "Resultat",
      list_of_relations: "List of Relations",
      open_link: "Öppna filbilaga",
      server_error: "Ett fel uppstod på servern.",
      no_results: "Inga resultat för sökningen/förfrågan.",
      link_button: "Öppna"
    },
    mapcontrols: {
      geolocation: {
        error: "Du kan inte lokaliseras"
      },
      geocoding: {
        choose_layer: "Välj ett lager där du vill lägga till denna funktion",
        placeholder: "Adress ...",
        nolayers: "Inga redigerbara punktlager hittades i det här projektet",
        noresults: "Inga resultat",
        notresponseserver: "Inget svar från servern"
      },
      add_layer_control: {
        header: "Lägg till nivå",
        select_projection: "Välj projektion för nivån",
        select_field_to_show: "Select Field to show on map",
        select_csv_separator: "Select delimiter",
        select_csv_x_field: "Select X field",
        select_csv_y_field: "Select Y field",
        select_color: "Välj färg på nivån",
        drag_layer: "Dra och släpp nivån hit"
      },
      query: {
        input_relation: "Tryck för att visa relationerna"
      },
      length: {
        tooltip: "Längd"
      },
      area: {
        tooltip: "Areal"
      },
      screenshot: {
        error: "Screenshot error creation",
        securityError: `  
        <p><b>Säkerhetsfel</b>: ett externt lager hindrar kartan från att skrivas ut. Gör så här för att kontrollera:</p>
        <ol>
          <li>ta bort alla manuellt tillagda externa lager (t.ex. WMS-lager)</li>
          <li>tvinga om inläsning av sidan: <code>CTRL + F5</code></li>
          <li>skriv ut kartan igen</li>
        </ol>
        <p>För mer information kontakta serveradministratören om: <a href="https://developer.mozilla.org/en-US/docs/Web/HTML/CORS_enabled_image" style="color: #000 !important;font -vikt: fet;">&#x2139;&#xFE0F; säkerhet och nedsmutsade dukar</a></p>
        `
      }
    },
    catalog_items: {
      helptext: "Högerklicka på en enskild nivå för att komma till tilläggsegenskaperna.",
      contextmenu: {
        zoomtolayer: "Zooma till nivå",
        open_attribute_table: "Öppna attributtabellen",
        show_metadata: "Metadata",
        styles: "Stilar",
        vector_color_menu: "Ställ in/ändra färg",
        layer_opacity: "Opacitet",
        filters: "Filters",
      }
    },
    dataTable: {
      previous: "Föregående",
      next: "Nästa",
      lengthMenu: "Visa _MENU_ värden per sida",
      info: "_TOTAL_ resultat",
      no_data: "Inga uppgifter",
      nodatafilterd: "Inga motsvarande poster hittades",
      infoFiltered: "(filtered from _MAX_ total records)"
    }
  },
};

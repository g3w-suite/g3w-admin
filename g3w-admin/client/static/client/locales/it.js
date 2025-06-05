export default {
  translation: {
    error_page: {
      error: "Errore di connessione",
      at_moment: "Al momento non è possibile caricare la mappa",
      f5: "Premi Ctrl+F5"
    },
    cookie_law: {
      message: "Questo sito utilizza i cookie per garantire una buona usabilità all'utilizzatore finale.",
      buttonText: "Ho capito!"
    },
    default:"predefinito",
    sign_in: "Accedi",
    layer_selection_filter: {
      tools: {
        filter: "Attiva/Disattiva Filtro",
        nofilter: "Rimuovi filtro",
        invert: "Inverti Selezione",
        clear: "Annulla selezione",
        show_features_on_map: "Aggiorna i risultati quando si sposta la mappa",
        savefilter: "Salva Filtro",
        filterName: 'Nome Filtro',
      }
    },
    warning: {
      not_supported_format: "Formato non supportato"
    },
    layer_position: {
      top: 'in cima',
      bottom: 'in fondo',
      message: "Posizione"
    },
    sdk: {
      atlas: {
        template_dialog: {
          title: "Seleziona Template"
        }
      },
      spatialbookmarks: {
        title: "Segnalibri",
        helptext: "Posizionati all'estensione del tuo nuovo segnalibro, definisci il nome e clicca Aggiungi",
        input: {
          name: "Nome"
        },
        sections: {
          project:{
            title: "Segnalibri Progetto"
          },
          user: {
            title: "Segnalibri Utente"
          }
        }
      },
      search: {
        all: 'TUTTE',
        no_results: "Nessun valore trovato",
        searching: "Sto cercando ..",
        error_loading: "Errore nel caricamento valori",
        layer_not_searchable: "Il layer non è ricercabile",
        layer_not_querable: "Il layer non è interrogabile",
        autocomplete: {
          inputshort: {
            pre: "Digita almeno",
            post: "caratteri"
          }
        },
        help_filter : "I valori di ricerca sono limitati sulla base del filtro attivo. Rimuovere il filtro per ricercare su tutti i dati.",
        autofilter: "Filtro sui risultati",
        autofilter_tooltip: "Filtra automaticamente le geometrie visualizzate nella mappa<br>per mostrare solo quelle relative ai risultati della ricerca corrente.",
      },
      print: {
        no_layers: 'Nessun Layer visibile',
        template: "Template",
        labels: "Etichette",
        scale: "Scala",
        format: "Formato",
        rotation: "Rotazione",
        download_image: "Scarica Immagine",
        fids_instruction: "Valori accettati: da 1 al valore massimo indicato da [max]. Possibile indicare anche range di valori es. 4-6",
        fids_example: "Es. 1,4-6 verranno stampati gli id 1,4,5,6",
        help: "I livelli esportabili sono definiti dall'amministratore",
        help_details: `<p>Se non vedi qualche livello nel file di stampa:</p>
          <ol style="padding-left: 25px">
            <li>prova ancora usando un template diverso</li>
            <li>prova a cambiare lo zoom della mappa</li>
            <li>controlla l'origine (es. server WMS esterno)</li>
            <li>verifica che la sua voce sia effettivamente spuntata nella lista dei livelli</li>
          </ol>`,
      },
      querybuilder: {
        title: 'Ricerca avanzata',
        search: {
          run: "Esegui",
          info: "Informazioni",
          delete: "Rimuovi",
          edit: "Modifica"
        },
        messages: {
          changed: 'Salvato correttamente',
          number_of_features: "Elementi trovati:"
        },
        panel: {
          button: {
            all: 'TROVA UN VALORE',
            save: 'SALVA',
            test: 'VERIFICA',
            clear: 'PULISCI',
            run: 'ESEGUI',
            manual: 'MANUALE'
          },
          layers: 'LAYERS',
          fields: 'CAMPI',
          values: 'VALORI',
          operators: 'OPERATORI',
          expression: 'ESPRESSIONE'
        },
        error_run: 'Si è verificato un errore. Verificare se la query è corretta',
        error_test: "Errore nell'esecuzione della query",
        delete: 'Vuoi confermare la cancellazione?',
        additem: 'Inserisci nome della ricerca'
      },
      errors: {
        layers: {
          load: "Alcuni livelli presenti nel progetto non sono attualmente disponibili e quindi non compaiono nell'attuale visualizzazione"
        },
        unsupported_format: 'Formato non supportato',
        add_external_layer: 'Errore nel caricamento del layer'
      },
      metadata: {
        title: "Metadati",
        groups: {
          general: {
            title: 'GENERALE',
            fields: {
              title: 'TITOLO',
              name: 'NOME',
              description: "DESCRIZIONE",
              abstract: "ABSTRACT",
              keywords: 'LISTA DELLE PAROLE CHIAVE',
              fees: "CANONI",
              accessconstraints: "VINCOLI DI ACCESSO",
              contactinformation: "CONTATTI",
              subfields: {
                contactinformation: {
                  contactelectronicmailaddress: "E-mail",
                  personprimary: 'Riferimenti',
                  contactvoicetelephone: 'Telefono',
                  contactorganization: 'Organizzazione',
                  ContactOrganization: 'Organizzazione',
                  contactposition: 'Posizione',
                  ContactPosition : 'Posizione',
                  contactperson: 'Persona',
                  ContactPerson: 'Persona',
                }
              },
              wms_url: "WMS"
            }
          },
          spatial:{
            title: 'INFO SPAZIALI',
            fields : {
              crs: 'EPSG',
              extent: 'BBOX'
            }
          },
          layers: {
            title: 'STRATI',
            groups : {
              general: 'GENERALE',
              spatial: 'INFO SPAZIALI'
            },
            fields: {
              layers: 'STRATI',
              subfields: {
                crs: 'EPSG',
                bbox: 'BBOX',
                title: "TITOLO",
                name: 'NOME',
                geometrytype: 'GEOMETRIA',
                source: 'SORGENTE',
                attributes: 'ATTRIBUTI',
                abstract: 'ABSTRACT',
                attribution: 'ATTRIBUTION',
                keywords: "PAROLE CHIAVE",
                metadataurl:'METADATA URL',
                dataurl: "DATA URL"
              }
            }
          }
        }
      },
      tooltips: {
        relations: {
          form_to_row: "Visualizza riga",
          row_to_form: "Visualizza modulo",
          zoomtogeometry: "Zoom sulla geometria",
        },
        zoom_to_features_extent: "Zoom sulle features",
        copy_map_extent_url: 'Copia URL di condivisione',
        download_shapefile: "Scarica Shapefile",
        download_gpx: "Scarica GPX",
        download_gpkg: "Scarica GPKG",
        download_csv: "Scarica CSV",
        download_xls: "Scarica XLS",
        download_pdf: "Scarica PDF",
        show_chart: "Mostra Grafico",
        atlas: "Stampa Atlas",
        editing: "Modifica",
      },
      mapcontrols: {
        query: {
          tooltip: 'Interroga Layer',
          actions: {
            add_selection: {
              hint: "Aggiungi/Rimuovi Selezione"
            },
            zoom_to_features_extent:{
              hint: "Zoom sulle geometrie"
            },
            add_features_to_results: {
              hint: "Aggiungi elementi ai risultati"
            },
            remove_feature_from_results: {
              hint: "Rimuovi elemento dai risultati"
            },
            zoom_to_feature: {
              hint: "Zoom sulla geometria"
            },
            relations: {
              hint: "Visualizza Relazioni"
            },
            relations_charts: {
              hint: "Visualizza grafici relazioni"
            },
            download_features_shapefile:{
              hint: 'Scarica come Shapefile'
            },
            download_shapefile: {
              hint: 'Scarica come Shapefile'
            },
            download_features_gpx: {
              hint: "Scarica come GPX"
            },
            download_features_gpkg: {
              hint: "Scarica come GPKG"
            },
            download_gpx: {
              hint: "Scarica come GPX"
            },
            download_gpkg: {
              hint: "Scarica come GPKG"
            },
            download_features_csv: {
              hint: "Scarica come CSV"
            },
            download_csv: {
              hint: "Scarica come CSV"
            },
            download_features_xls: {
              hint: "Scarica come XLS"
            },
            download_xls: {
              hint: "Scarica come XLS"
            },
            download_pdf: {
              hint: "Scarica come PDF"
            },
            atlas: {
              hint: "Stampa Atlas"
            },
            copy_zoom_to_fid_url: {
              hint: "Condividi tramite link",
              hint_change: "URL copiato negli appunti"
            }
          }
        },
        queryby: {
          title: 'Interroga un area',
          layer: 'Livello selezionato:',
          none: 'NESSUNO',
          new: 'LIVELLO TEMPORANEO',
          all: 'TUTTI',
          methods: {
            intersects: 'interseca',
            within: 'all\'interno'
          },
          querybypolygon: {
            tooltip: 'seleziona un poligono'
          },
          querybydrawpolygon: {
            tooltip: 'disegna un poligono'
          },
          querybbox: {
            tooltip: 'disegna un rettangolo'
          },
          querybycircle: {
            tooltip: 'disegna un cerchio'
          }
        },
        querybypolygon: {
          download: {
            title: "Download attributi",
            choiches:{
              feature: {
                label: "Solo features",
              },
              feature_polygon: {
                label: "Features+Poligono Interrogazione",
              }
            }
          },
          tooltip: 'Interroga per poligono',
          no_geometry: 'Non contiene la geometria nella risposta',
          help: {
            message: "<ul><li>Seleziona un livello (visibile).</li><li>Clicca su una geometria nella mappa.</li></ul>"
          }
        },
        querybydrawpolygon: {
          tooltip: "Disegna un poligono per interrogare",
          help: {
            message: "<ul><li>Clicca sulla mappa per aggiungere un nuovo vertice</li><li>Doppio click per terminare ed interrogare i livelli</li></ul>"
          },
        },
        querybbox: {
          tooltip: 'Interroga per BBOX',
          nolayers_visible: "Nessun layer interrogabile è visibile. Assicurarsi che almeno un layer wfs sia visibile per eseguire l'interrogazione",
          help: {
            message: "<ul><li>Trascina il mouse per disegnare un rettangolo ed interrogare i livelli</li></ul>"
          },
        },
        querybycircle: {
          tooltip: "Disegna un cerchio per interrogare",
          label: 'Raggio',
          help: {
            message: "<ul><li>Clicca sulla mappa per disegnare il cerchio</li></ul>"
          },
        },
        addlayer: {
          messages: {
            csv: {
              warning: "Il risultato in mappa è parziale a causa della presenza dei seguenti records non corretti:"
            }
          },
          tooltip: 'Aggiungi livello'
        },
        geolocation: {
          tooltip: 'Mostra la mia posizione'
        },
        measures: {
          title: 'Misura',
          length: {
            tooltip: "Lunghezza",
            help: "Clicca sulla mappa per continuare a disegnare la linea.<br>CANC se si vuole cancellare l'ultimo vertice inserito",
          },
          area: {
            tooltip: "Area",
            help: "Clicca per continuare a disegnare il poligono.<br>CANC se si vuole cancellare l'ultimo vertice inserito"
          }
        },
        screenshot: {
          title: 'Cattura schermata',
          screenshot: "PNG",
          geoscreenshot: "GeoTIFF",
          download: 'Genera'
        },
        scale: {
          no_valid_scale: "Scala non valida"
        },
        scaleline: {
          units: {
            metric: 'Metri',
            nautical: 'Miglio Nautico'
          }
        },
        zoomhistory: {
          zoom_last: "Zoom Precedente",
          zoom_next: "Zoom Successivo"
        }, 
        annotation: {
          title: 'Annotazioni',
          tooltip: 'Crea Annotazioni',
          types: {
            'Point':      'Punto',
            'LineString': 'Linea',
            'Polygon':    'Poligono',
            'Rectangle':  'Rettangolo',
            'Circle':     'Cerchio',
            'Text':       'Testo',
            
          },
          inputs: {
            'radius':    'Raggio',
            'length':    'Lunghezza',
            'w_length' : 'Larghezza',
            'h_length' : 'Altezza',
            'rotation' : 'Rotazione',
            'font_size': 'Dimensione Font',
            'direction': 'Direzione',
            'f_direction': 'Avanti',
            'b_direction': 'Indietro',
            'opacity':   'Opacità',
            'stroke':    'Bordo',
          },
          checkbox: {
            'show_text': 'Mostra Testo',
            'show_info': 'Mostra Info'
          },
          actions: {
            'export': 'Esporta',
            'import': 'Importa',
            'remove': 'Rimuovi',
            'show_all': 'Mostra tutti',
          }
        }
      },
      relations: {
        relation_data: 'Dati Relazione',
        no_relations_found: 'Nessuna relazione trovata',
        back_to_relations: 'Ritorna alle relazioni',
        list_of_relations_feature: 'Lista delle relazioni della feature',
        error_missing_father_field: "Il campo relazionato non esiste",
        download_with_relations: "Scarica con relazioni",
        field: "Campo chiave relazione",
      },
      form: {
        loading: 'Caricamento ...',
        inputs: {
          messages: {
            errors: {
              picklayer: "Nessuna feature selezionata. Verificare se il layer è in editing o non visibile alla scala attuale"
            }
          },
          tooltips: {
            picklayer: "Prendi valore dalla mappa",
            lonlat: "Clicca sulla mappa per prendere le coordinate"
          },
          input_validation_mutually_exclusive: "Campo mutualmente esclusivo con ",
          input_validation_error: "Campo obbligatorio o tipo valore non corretto",
          input_validation_error_type: "Tipo valore non corretto",
          input_validation_min_field: "Valore deve essere magiore uguale a quello del camp ",
          input_validation_max_field: "Valore deve essere minore uguale a quello del campo ",
          input_validation_exclude_values: "Campo deve contenere un valore diverso",
          integer: "intero",
          bigint: "intero",
          text: "testuale",
          varchar: "testuale",
          textarea: "testuale",
          string: "stringa",
          date: "data",
          datetime: "data",
          float: "float",
          table: "table"
        },
        footer: {
          required_fields: "Campi obbligatori"
        },
        messages: {
          qgis_input_widget_relation: "Gestisci le relazioni tramite form dedicato"
        }
      },
      catalog: {
        current_map_theme_prefix: "TEMA",
        choose_map_theme: "SCEGLI TEMA",
        choose_map_theme_input_label: 'Nome del nuovo tema',
        project_map_theme : 'Temi Progetto',
        user_map_theme: 'Temi Utente',
        question_delete_map_theme: "Vuoi cancellare il tema ?",
        delete_map_theme: "Tema cancellato con successo",
        saved_map_theme: "Tema salvato con successo",
        updated_map_theme: "Tema aggiornato con successo",
        invalid_map_theme_name: "Nome già esistente o non corretto",
        menu: {
          layerposition: 'Posizione Layer',
          setwmsopacity: "Cambia opacità",
          wms: {
            title:"",
            copy: "Clicca qui per copiare url",
            copied: "Copiato"
          },
          download: {
            unknow: "Scarica",
            geotiff_map_extent: "GeoTiff (vista attuale)"
          }
        }
      },
      wps: {
        list_process: "Lista dei processi",
        tooltip: 'Clicca sulla mappa'
      }
    },
    credits: {
      g3wSuiteFramework: "Applicativo realizzato con il framework OS",
      g3wSuiteDescription: "Pubblica e gestisci i tuoi progetti QGIS sul Web",
      productOf: "Framework sviluppato da",
    },
    toggle_color_scheme: "Cambia colore",
    logout: "Esci",
    no_other_projects: "Non ci sono altri progetti in questo gruppo cartografico",
    /**
     * @since 3.8.0
     */
    no_other_groups: "Non ci sono altri gruppi in questo Macrogruppo",
    yes: "Si",
    no: "No",
    back:"Indietro",
    backto: "Torna a ",
    changemap: "Cambia mappa",
    change_session: "Cambia Sessione",
    component: "Componente Generico",
    search: "Ricerche",
    alerts: 'Avvisi',
    no_results: "Nessun risultato trovato",
    print: "Stampa",
    create_print: "Crea Stampa",
    dosearch: "Cerca",
    catalog: "Mappa",
    data: "Dati",
    externalwms: "WMS",
    baselayers: "Basi",
    tools: "Strumenti",
    tree: "Strati",
    legend: "Legenda",
    nobaselayer: "Nessuna mappa di base",
    street_search: "Cerca indirizzo",
    show: "Mostra",
    hide: "Nascondi",
    copy_form_data: "Copia i dati del modulo",
    paste_form_data: "Incolla",
    copy_form_data_from_feature: "Copia i dati dalla mappa",
    error_map_loading: "Errore di caricamento della nuova mappa",
    check_internet_connection_or_server_admin: "Controllare la connessione internet o contattare l'amministratore",
    could_not_load_vector_layers: "Errore di connessione al server: non è stato possibile caricare i vettoriali richiesti",
    server_saver_error: "Errore nel salvataggio sul server",
    server_error: "Si è verificato un errore nella richiesta al server",
    save: "Salva",
    cancel: "Cancella",
    update: "Aggiorna",
    close: "Chiudi",
    /** @since 3.8.0 */
    dont_show_again: "Non mostrare più",
    enlange_reduce: "Allarga / Riduci",
    add: "Aggiungi",
    exitnosave: "Esci senza salvare",
    annul: "Annulla",
    layer_is_added: "Esiste già un livello con lo stesso nome",
    sidebar: {
      wms: {
        panel: {
          title:'Aggiunta livello WMS',
          label: {
            position: "Posizione su Mappa",
            name: "Nome",
            projections: 'Sistema di riferimento',
            layers: 'Livelli'
          }
        },
        add_wms_layer: "Aggiungi livello WMS",
        delete_wms_url: "Rimuovi",
        layer_id_already_added: "Esiste già una connessione WMS con questo nome",
        url_already_added: "URL/Nome WMS già aggiunto",
        layer_add_error: "WMS Layer non aggiunto. Verificare i parametri o l'url"
      }
    },
    info: {
      title: "Risultati",
      list_of_relations: "Lista delle relazioni",
      open_link: "Apri documento allegato",
      server_error: "Si è verificato un errore nella richiesta al server",
      no_results: "Nessun risultato per questa interrogazione/ricerca ",
      link_button: "Apri"
    },
    mapcontrols: {
      geolocation: {
        error: "Non è possibile ottenere la tua posizione."
      },
      geocoding: {
        choose_layer: "Scegli un livello in cui aggiungere questa funzionalità",
        placeholder: "Indirizzo ...",
        nolayers: "Nessun layer di punti modificabile trovato in questo progetto",
        noresults: "Nessun risultato",
        notresponseserver: "Il server non risponde"
      },
      add_layer_control: {
        header: "Aggiungi livello",
        select_projection: "Sistema di riferimento",
        select_field_to_show: "valore mostrato sulla mappa",
        select_csv_separator: "Separatore",
        select_csv_x_field: "Campo X",
        select_csv_y_field: "Campo Y",
        select_color: "Colore",
        drag_layer: "Aggiungi qui il tuo file",
        persistent_data: "Persistenza",
        persistent_help: "salva il livello nella memoria del browser",
      },
      query: {
        input_relation: "Clicca per consultare le relazioni"
      },
      length: {
        tooltip: "Lunghezza"
      },
      area: {
        tooltip: "Area"
      },
      screenshot: {
        error: "Errore nella creazione dello screenshot",
        securityError: `  
        <p><b>Errore di sicurezza</b>: uno strato esterno impedisce la stampa della mappa. Per verificare, procedere come segue:</p>
        <ol>
          <li>rimuovi eventuali layer esterni aggiunti manualmente (es. layer WMS)</li>
          <li>forza il ricaricamento della pagina: <code>CTRL + F5</code></li>
          <li>stampa nuovamente la mappa</li>
        </ol>
        <p>Per maggiori informazioni contattare l'amministratore del server in merito a: <a href="https://developer.mozilla.org/en-US/docs/Web/HTML/CORS_enabled_image" style="color: #000 !important;font-weight: bold;">&#x2139;&#xFE0F; security and tainted canvases</a></p>
        `
      }
    },
    catalog_items: {
      helptext: "Apri menu",
      contextmenu: {
        zoomtolayer: "Zoom sul livello",
        open_attribute_table: "Apri tabella attributi",
        show_metadata: "Metadati",
        styles: "Stile",
        vector_color_menu:"Colore",
        layer_opacity: "Opacità",
        filters: "Filtri",
        download: 'Esporta come',
        ogc_services: 'Servizi OGC',
        edit: "Modifica dati",
      }
    },
    dataTable: {
      previous: "Precedente",
      next: "Successivo",
      lengthMenu: "Mostra _MENU_ valori per pagina",
      info: "_TOTAL_ elementi",
      nodatafilterd: "Nessun risultato trovato",
      infoFiltered: "(Filtrati da _MAX_ total righe)"
    },
    /**@since 3.10.0 */
    no_geometry: 'Questo elemento non ha geometria',
    /**@since 3.11.0 */
    query_filter: 'Filtra per:',
    /**@since 3.11.0 */
    sidebar_menu: 'Menu laterale',
    /**@since 3.11.0 */
    layer_type: 'Tipologia livello',
    /**@since 3.11.0 */
    choose_type: 'Scegli un tipo',
    /**@since 3.11.0 */
    remote_wms_url: 'WMS (URL)',
    /**@since 3.11.0 */
    local_file: 'File locale',
    /**@since 3.11.0 */
    embed_map: 'Incorpora mappa',
    /** @since 3.11.0 */
    homepage: 'Pagina iniziale',
    /** @since 3.11.0 */
    wms_server: 'Server WMS',
    /** @since 3.11.0 */
    connect_to_wms: 'Connetti',
    /** @since 3.11.0 */
    disconnect_from_wms: 'Disconnetti',
    /** @since 3.11.0 */
    add_new_wms_url_help: 'Cerca tra le connessioni salvate o aggiungi un nuovo server',
    /** @since 3.11.0 */
    saved_connections: 'Connessioni salvate:',
    /** @since 3.11.0 */
    label: "Etichetta",
    /** @since 3.11.0 */
    no_csv_field: 'Nessun campo valido',
    /** @since 3.11.0 */
    show_more: 'Mostra di più',
  },
};
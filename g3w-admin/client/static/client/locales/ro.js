export default {
  translation: {
    error_page: {
      error: "Eroare de conexiune",
      at_moment: "Momentan nu este posibil să afișați harta",
      f5: "Apăsați Ctrl+F5"
    },
    cookie_law: {
      message: "Acest website foloseste cookie-uri pentru a furniza vizitatorilor o experiență mult mai bună de navigare",
      buttonText: "Am înțeles!"
    },
    default:"Implicit",
    sign_in: "Logare",
    layer_selection_filter: {
      tools: {
        filter: "Activați/Dezactivați filtrul",
        nofilter: "Eliminare Filtrare",
        invert: "Inversare Selecție",
        clear: "Elimină Selecția",
        show_features_on_map: "Rezultatele se actualizează când harta este deplasată",
        savefilter: "Salvează Filtrul",
        filterName: "Nume Filtru",
      }
    },
    warning: {
      not_supported_format: "Formatul nu este acceptat"
    },
    layer_position: {
      top: 'SUS',
      bottom: 'JOS',
      message: "Poziție relativă la straturile din TOC"
    },
    sdk: {
      atlas: {
        template_dialog: {
          title: "Selectați Template"
        }
      },
      spatialbookmarks: {
        title: "Marcaje spațiale",
        helptext: "Deplasați-vă pe întinderea hărții, introduceți numele și faceți clic pe Adăugați",
        input: {
          name: "Nume"
        },
        sections: {
          project:{
            title: "Marcaje de proiect"
          },
          user: {
            title: "Marcaje utilizator"
          }
        }
      },
      search: {
        all: 'Toate',
        no_results: "Fără rezultat",
        searching: "Căutare ...",
        error_loading: "Încărcarea a eșuat",
        layer_not_searchable: "Nu se poate căuta pe strat",
        layer_not_querable: "Stratul nu se poate interoga",
        autocomplete: {
          inputshort: {
            pre: "Te rog introdu",
            post: "sau mai multe caractere"
          }
        },
        help_filter : "Valorile de căutare sunt limitate în funcție de filtrul activ. Eliminați filtrul pentru a căuta toate datele.",
        autofilter: "Filtrați rezultatele"
      },
      print: {
        no_layers: 'Nu avem straturi de print',
        template: "Șablon",
        labels: "Etichete",
        scale: "Scară",
        format: "Format",
        rotation: "Rotație",
        download_image: "Descarcă Imaginea",
        fids_instruction: "Valori acceptate: de la 1 la valoarea [max]. Este posibilă inserarea de interval, de ex. 4-6",
        fids_example: "Ex. 1,4-6 vor fi tipărite id 1,4,5,6",
        help: "Straturile prezentate în print pot fi acelea definite în proiect și nu acelea prezentate în cadrul hărții"
      },
      querybuilder: {
        search: {
          run: "Execută",
          info: "Info",
          delete: "Elimină",
          edit: "Modifică"
        },
        messages: {
          changed: 'Salvat',
          number_of_features: "Număr de entități"
        },
        panel: {
          button: {
            all: 'TOATE',
            save: 'SALVEAZĂ',
            test: 'TEST',
            clear: 'ȘTERGE',
            run: 'RUN',
            manual: 'MANUAL'
          },
          layers: 'STRATURI',
          fields: 'CÂMPURI',
          values: 'VALORI',
          operators: 'OPERATORI',
          expression: 'EXPRESII'
        },
        error_run: 'A survenit o eroare. De verificat interogarea',
        error_test: "A survenit o eroare în timp ce se executa interogarea",
        delete: 'Vrei să o ștergi?',
        additem: 'Introdu numele noii căutări'
      },
      errors: {
        layers: {
          load: "Câteva straturi nu sunt disponibile"
        },
        unsupported_format: 'Formatul nu este acceptat',
        add_external_layer: 'Eroare încărcare strat'
      },
      metadata: {
        title: 'Metadate',
        groups: {
          general: {
            title: 'GENERALITĂȚI',
            fields: {
              title: 'TITLU',
              name: 'NUME',
              description: "DESCRIERE",
              abstract: "ABSTRACT",
              keywords: 'CUVINTE CHEIE',
              fees: "TAXE",
              accessconstraints: "CONSTRÂNGERI DE ACCES",
              contactinformation: "CONTACTE",
              subfields: {
                contactinformation: {
                  contactelectronicmailaddress: "Email",
                  personprimary: 'Referințe',
                  contactvoicetelephone: 'Telefon',
                  contactorganization: 'Organizație',
                  ContactOrganization: 'Organizație',
                  contactposition: 'Poziție',
                  ContactPosition: 'Poziție',
                  contactperson: 'Persoana',
                  ContactPerson: 'Persoana'
                }
              },
              wms_url: "WMS"
            }
          },
          spatial:{
            title: 'SPAȚIAL',
            fields : {
              crs: 'EPSG',
              extent: 'BBOX'
            }
          },
          layers: {
            title: 'STRATURI',
            fields: {
              layers: 'STRATURI',
              subfields: {
                crs: 'EPSG',
                bbox: 'BBOX',
                title: "TITLU",
                name: 'NUME',
                geometrytype: 'GEOMETRIE',
                source: 'SURSA',
                attributes: 'ATRIBUTE',
                abstract: 'ABSTRACT',
                attribution: 'ATRIBUIRE',
                keywords: "CUVINTE CHEIE",
                metadataurl:'URL METADATE',
                dataurl: "URL DATE"
              }
            },
            groups : {
              general: 'GENERALITĂȚI',
              spatial: 'SPAȚIAL'
            }
          }
        }
      },
      tooltips: {
        relations: {
          form_to_row: "Vizualizare pe rânduri",
          row_to_form: "Vizualizare formular",
          zoomtogeometry: "Măriți la geometrie",
        },
        copy_map_extent_url: 'Copiază linkul de vizualizare hartă',
        download_shapefile: "Descarcă Shapefile",
        download_gpx: "Descarcă GPX",
        download_gpkg: "Descarcă GPKG",
        download_csv: "Descarcă CSV",
        download_xls: "Descarcă XLS",
        download_pdf: "Descarcă PDF",
        show_chart: "Arată Diagrama",
        atlas: "Tipărire Atlas",
        editing: "Editing",
      },
      mapcontrols: {
        query: {
          tooltip: 'Interogare strat',
          actions: {
            add_selection: {
              hint: "Adaugă/Elimină Selecția"
            },
            zoom_to_features_extent:{
              hint: "Zoom la încadrarea entităților"
            },
            add_features_to_results: {
              hint: "Adaugă/Elimină entități rezultat"
            },
            remove_feature_from_results: {
              hint: "Elimină entitate din rezultat"
            },
            zoom_to_feature: {
              hint: "Zoom la entitate"
            },
            relations: {
              hint: "Arată Relațiile"
            },
            relations_charts: {
              hint: "Arată diagrama de relații"
            },
            download_features_shapefile:{
              hint: 'Descarcă entități în Shapefile'
            },
            download_shapefile: {
              hint: 'Descarcă entitate în Shapefile'
            },
            download_features_gpx: {
              hint: "Descarcă entități în GPX"
            },
            download_features_gpkg: {
              hint: "Descarcă entități în GPKG"
            },
            download_gpx: {
              hint: "Descarcă entitate în GPX"
            },
            download_gpkg: {
              hint: "Descarcă entitate în GPKG"
            },
            download_features_csv: {
              hint: "Descarcă entități în CSV"
            },
            download_csv: {
              hint: "Descarcă entitate în CSV"
            },
            download_features_xls: {
              hint: "Descarcă entități în XLS"
            },
            download_xls: {
              hint: "Descarcă entitate în XLS"
            },
            download_pdf: {
              hint: "Descarcă entitate în PDF"
            },
            atlas: {
              hint: "Tipărire Atlas"
            },
            copy_zoom_to_fid_url: {
              hint: "Copiază URL hartă cu întinderea geometriei entității",
              hint_change: "Copiat"
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
            title: "Descărcare atribute",
            choiches:{
              feature: {
                label:"Doar entități",
              },
              feature_polygon: {
                label:"Entități+Poligon Interogare",
              }
            }
          },
          tooltip: 'Interogare După Poligon',
          no_geometry: 'Nu avem geometrii în răspuns',
          help: {
            message: "<ul><li>Selectează un strat poligon din TOC.</li><li>Asigură-te că stratul este vizibil.</li><li>Click pe o entitate a stratului selectat.</li></ul>"
          }
        },
        querybydrawpolygon: {
          tooltip: "Interogare prin poligon de desen"
        },
        querybbox: {
          tooltip: 'Interogare BBox strat',
          nolayers_visible: 'Nu este vizibil niciun strat de interogare. Trebuie setat cel puțin un strat WFS vizibil pentru a efectua interogarea',
          help: {
            message: "<ul><li>Desenează un pătrat pe hartă pentru a interoga straturile din TOC de sub </li></ul>"
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
              warning: "Rezultateul pe hartă este parțial datorită prezenței următoarei liste de rezultate incorecte:"
            }
          },
          tooltip: 'Adaugă Strat'
        },
        geolocation: {
          tooltip: 'Geolocalizare'
        },
        measures: {
          length: {
            tooltip: "Lungime",
            help: "Click pe hartă pentru a desena linia. Apasă <br>CANC dacă dorești să ștergi ultimul vertex",
          },
          area: {
            tooltip: "Aria",
            help: "Click pentru desen poligon. Apasă <br>CANC dacă dorești să ștergi ultimul vertex"
          }
        },
        scale: {
          no_valid_scale: "Scară Invalidă"
        },
        scaleline: {
          units: {
            metric: 'Metri',
            nautical: 'Mile Nautice'
          }
        },
        zoomhistory: {
          zoom_last: "Zoom Anterior",
          zoom_next: "Zoom Urmatorul"
        }
      },
      relations: {
        relation_data: 'Date Relații',
        no_relations_found: 'Nu am găsit nicio relație',
        back_to_relations: 'Înapoi la relații',
        list_of_relations_feature: 'Lista de relații a entității',
        error_missing_father_field: "Câmpul de legătură lipsește",
        download_with_relations: "Descărcați cu relații",
        field: "Relation key field",
      },
      form: {
        loading: 'Se încarcă ...',
        inputs: {
          messages: {
            errors: {
              picklayer: "Nu avem entitate selectată. Verifică dacă stratul este în editare sau vizibil la scara curentă if layer is on editing or visible at current scale"
            }
          },
          tooltips:{
            picklayer: "Ia valoare din strat",
            lonlat: "Click pe hartă pentru a prelua coordonate"
          },
          input_validation_mutually_exclusive: "Câmp ce se exclude mutual cu ",
          input_validation_error: "Câmp mandatoriu sau tip de date greșit",
          input_validation_error_type: "Tip de date greșit",
          input_validation_min_field: "Valoarea trebuie să fie mai mare/egală cu valoare câmpului ",
          input_validation_max_field: "Valoarea trebuie să fie mai mică/egală cu valoare câmpului ",
          input_validation_exclude_values: "Valoarea trebuie să fie unică",
          integer: "integer - nr. întreg",
          bigint: "integer - nr. întreg",
          text: "text",
          varchar: "text",
          textarea: "text",
          string: "string - text",
          date: "data",
          datetime: "data",
          float: "float - nr. cu zecimale",
          table: "tabelă"
        },
        footer: {
          "required_fields": "Câmpuri necesare"
        },
        messages: {
          qgis_input_widget_relation: "Folosește formular specific de relații pentru a lucra cu relația"
        }
      },
      catalog: {
        current_map_theme_prefix: "TEMA",
        choose_map_theme: "ALEGE TEMA",
        choose_map_theme_input_label: 'Numele noii tema',
        project_map_theme : 'Tema de proiect',
        user_map_theme: "Tema utilizator",
        question_delete_map_theme: "Doriți să ștergeți tema?",
        delete_map_theme: "Tema a fost ștearsă cu succes",
        saved_map_theme: "Tema a fost salvată cu succes",
        updated_map_theme: "Tema a fost actualizată cu succes",
        invalid_map_theme_name: "Numele există deja sau este incorect",
        menu: {
          layerposition: 'Poziție Strat',
          setwmsopacity: "Alege Opacitatea",
          wms: {
            title:"Titlu",
            copy: "Click pentru copiere URL",
            copied: "Copiat"
          },
          download: {
            unknow: 'Descarcă',
            shp: 'Descarcă Shapefile',
            gpx: 'Descarcă GPX',
            gpkg: 'Descarcă GPKG',
            csv: 'Descarcă CSV',
            xls: 'Descarcă XLS',
            geotiff: "Descarcă GEOTIFF",
            geotiff_map_extent: "Descarcă GEOTIFF(ce se vede în cadrul hărții)"
          }
        }
      },
      wps: {
        list_process: "Lista de procese",
        tooltip: 'Click pe hartă'
      }
    },
    credits: {
      g3wSuiteFramework: "Aplicație bazată pe frameworkul",
      g3wSuiteDescription: "Publică și administrează proiectele de QGIS pe WEB",
      productOf: "Framework dezvoltat de",
    },
    toggle_color_scheme: "Comutare schemă de culori",
    logout: "Deconectare",
    no_other_projects: "No more project for this group",
    no_other_groups: "Nu mai sunt grupuri pentru acest macrogrup",
    yes: "Da",
    no: "Nu",
    back: "Înapoi",
    backto: "Înapoi la ",
    changemap: "Schimbare Hartă",
    change_session: "Schimbați sesiunea",
    component: "Componentă Generică",
    search: "Căutare",
    no_results: "Niciun rezultat găsit",
    print: "Tipărire",
    create_print: "Tipărește",
    dosearch: "Caută",
    catalog: "Hartă",
    data: "Data",
    externalwms: "WMS",
    baselayers: "Straturi Bază",
    tools: "Instrumente",
    tree: "Straturi",
    legend: "Legendă",
    nobaselayer: "Fără strat de bază",
    street_search: "Caută Adresă",
    show: "Arată",
    hide: "Ascunde",
    copy_form_data: "Copiază data",
    paste_form_data: "Lipește",
    copy_form_data_from_feature: "Copiază data din hartă",
    error_map_loading: "Sunt erori la încărcarea hărții",
    check_internet_connection_or_server_admin: "Verificați conexiune de internet sau contactați administratorul de sistem",
    could_not_load_vector_layers: "Eroare de conexiune: Straturile nu pot fi încărcate",
    server_saver_error: "Eroare la salvarea pe server",
    server_error: "Eroare de conexiune la server",
    save: "Salvează",
    cancel: "Anulează",
    update: "Actualizați",
    close: "Închide",
    /** @since 3.8.0 */
    dont_show_again: "Nu mai afișa mesajul",
    enlange_reduce: "Mărește / Micșorează",
    add: "Adaugă",
    exitnosave: "Ieșire fără salvare",
    annul: "Anulează",
    layer_is_added: "Există un strat cu același nume deja adăugat",
    sidebar: {
      wms: {
        panel: {
          title:'Adaugă strat WMS',
          label: {
            position: "Poziție Hartă",
            name: "Nume",
            projections: 'Proiecție',
            layers: 'Straturi'
          }
        },
        add_wms_layer: "Adaugă strat WMS",
        delete_wms_url: "Șterge URL WMS",
        layer_id_already_added: "Strat WMS deja adăugat",
        url_already_added: "URL WMS/Nume deja adăugat",
        layer_add_error: "Stratul WMS nu s-a adăugat. Verificați URL-ul sau parametrii WMS"
      }
    },
    info: {
      title: "Rezultate",
      list_of_relations: "List of Relations",
      open_link: "Deschide document atașat",
      server_error: "Serverul a întâmpinat o eroare",
      no_results: "Niciun rezultat",
      link_button: "Deschide"
    },
    mapcontrols: {
      geolocation: {
        error: "Nu te-am putut localiza"
      },
      geocoding: {
        choose_layer: "Alegeți un strat unde să adăugați această caracteristică",
        placeholder: "Adresa ...",
        nolayers: "Nu s-au găsit straturi de puncte editabile în acest proiect",
        noresults: "Niciun rezultat",
        notresponseserver: "Niciun răspuns de la server"
      },
      add_layer_control: {
        header: "Adăugare Strat",
        select_projection: "Selectează proiecția strat",
        select_field_to_show: "Selectează câmpul de arătat pe hartă",
        select_csv_separator: "Selectează delimitatorul",
        select_csv_x_field: "Selectează câmpul X - Est",
        select_csv_y_field: "Selectează câmpul Y - Nord",
        select_color: "Selectează culoare strat",
        drag_layer: "Trageți stratul aici (Drag&Drop)"
      },
      query: {
        input_relation: "Click pentru a arăta relațiile"
      },
      length: {
        tooltip: "Lungime"
      },
      area: {
        tooltip: "Arie"
      },
      screenshot: {
        error: "Eroare captură ecran",
        securityError: `  
        <p><b>Eroare de securitate</b>: un strat extern împiedică imprimarea hărții. Pentru a verifica, procedați după cum urmează:</p>
        <ol>
          <li>eliminați orice straturi externe adăugate manual (de exemplu, straturi WMS)</li>
          <li>forțați reîncărcarea paginii: <code>CTRL + F5</code></li>
          <li>tipărește din nou harta</li>
        </ol>
        <p>Pentru mai multe informații, vă rugăm să contactați administratorul serverului despre: <a href="https://developer.mozilla.org/en-US/docs/Web/HTML/CORS_enabled_image" style="color: #000 !important;font -greutate: bold;">&#x2139;&#xFE0F; securitate și pânze contaminate</a></p>
        `
      }
    },
    catalog_items: {
      helptext: "Click dreapta pe strat pentru a accesa opțiuni",
      contextmenu: {
        zoomtolayer: "Zoom pe Strat",
        open_attribute_table: "Deschide Tabela Atribute",
        show_metadata: "Metadate",
        styles: 'Stiluri',
        vector_color_menu:"Setează/Schimbă Culoare",
        layer_opacity: "Opacitate",
        filters: "Filters",
      }
    },
    dataTable: {
      previous: "Anteriorul",
      next: "Următorul",
      lengthMenu: "Afișați _MENU_ valori pe pagină",
      info: "_TOTAL_ rezultate",
      no_data: "Fără date",
      nodatafilterd: "Niciun rezultat",
      infoFiltered: "(filtrat din _MAX_ de rezultate totale)"
    }
  },
};
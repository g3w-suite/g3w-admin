export default {
  translation: {
    error_page: {
      error: "Błąd połączenia",
      at_moment: "W tej chwili nie jest możliwe mapa pokazująca",
      f5: "Naciśnij Ctrl+F5"
    },
    cookie_law: {
      message: "Ta strona internetowa korzysta z plików cookie, aby uzyskać najlepsze wrażenia na naszej stronie internetowej.",
      buttonText: "Rozumiem!"
    },
    default: "domyślny",
    sign_in: "Zalogować się",
    layer_selection_filter: {
      tools: {
        filter: "Włącz/wyłącz filtr",
        nofilter: "Usuń filtr",
        invert: "Odwróć wybór",
        clear: "Jasny wybór",
        show_features_on_map: "Pokaż funkcje widoczne na mapie",
        savefilter: "Zapisz filtr",
        filterName: "Nazwa filtru"
      }
    },
    warning: {
      not_supported_format: "Nie obsługiwany format"
    },
    layer_position: {
      top: "SZCZYT",
      bottom: "SPÓD",
      message: "Pozycja względem warstw na TOC"
    },
    sdk: {
      atlas: {
        template_dialog: {
          title: "Wybierz szablon"
        }
      },
      spatialbookmarks: {
        title: "Zakładki przestrzenne",
        helptext: "Poruszaj zasięg mapy, wstaw nazwę i kliknij Dodaj",
        input: {
          name: "Nazwa"
        },
        sections: {
          project: {
            title: "Zakładki projektu"
          },
          user: {
            title: "Zakładki użytkowników"
          }
        }
      },
      search: {
        all: "WSZYSTKO",
        no_results: "Brak wyników",
        searching: "Poszukiwanie ...",
        error_loading: "Błąd Dane dotyczące ładowania",
        layer_not_searchable: "Warstwa nie można przeszukiwać",
        layer_not_querable: "Warstwa nie jest zapytana",
        autocomplete: {
          inputshort: {
            pre: "Podaj",
            post: "lub więcej znaków"
          }
        },
        help_filter : "Wartości wyszukiwania są ograniczone w zależności od aktywnego filtra. Usuń filtr, aby przeszukać wszystkie dane.",
        autofilter: "Filtruj wyniki"
      },
      print: {
        no_layers: "Brak warstwy do wydrukowania",
        template: "Szablon",
        labels: "Etykiety",
        scale: "Skala",
        format: "Format",
        rotation: "Obrót",
        download_image: "Pobierz obraz",
        fids_instruction: "Zaakceptowane wartości: od 1 do wartości [maks.]. Możliwe jest wstawienie zasięgu ex. 4-6",
        fids_example: "Były. 1,4-6 zostanie wydrukowany 1,4,5,6",
        help: "Warstwy pokazane w druku mogą być warstwy zdefiniowane w projekcie, a nie wyświetlane na mapie"
      },
      querybuilder: {
        search: {
          run: "Uruchomić",
          info: "Informacja",
          delete: "Usuwać",
          edit: "Edytować"
        },
        messages: {
          changed: "Uratowany",
          number_of_features: "Liczba funkcji"
        },
        panel: {
          button: {
            all: "WSZYSTKO",
            save: "RATOWAĆ",
            test: "TEST",
            clear: "JASNE",
            run: "URUCHOMIĆ",
            manual: "PODRĘCZNIK"
          },
          layers: "Warstwy",
          fields: "Pola",
          values: "Wartości",
          operators: "Operatorzy",
          expression: "WYRAŻENIE"
        },
        error_run: "Występuje błąd. Sprawdź zapytanie",
        error_test: "Błąd wystąpił podczas wykonywania zapytania",
        delete: "Chcesz to usunąć?",
        additem: "Włóż nazwę nowego wyszukiwania"
      },
      errors: {
        layers: {
          load: "Niektóre warstwy nie są dostępne"
        },
        unsupported_format: "Nie obsługiwany format",
        add_external_layer: "Błąd warstwy ładowania"
      },
      metadata: {
        title: "Metadane",
        groups: {
          general: {
            title: "OGÓLNY",
            fields: {
              title: "TYTUŁ",
              name: "NAZWA",
              description: "OPIS",
              abstract: "ABSTRAKCYJNY",
              keywords: "SŁOWA KLUCZOWE",
              fees: "OPŁATY",
              accessconstraints: "Ograniczenie dostępu",
              contactinformation: "ŁĄCZNOŚĆ",
              subfields: {
                contactinformation: {
                  contactelectronicmailaddress: "E-mail",
                  personprimary: "Bibliografia",
                  contactvoicetelephone: "Telefon",
                  contactorganization: "Organizacja",
                  ContactOrganization: "Organizacja",
                  contactposition: "Pozycja",
                  ContactPosition: "Pozycja",
                  contactperson: "Osoba",
                  ContactPerson: "Osoba"
                }
              },
              wms_url: "WMS"
            }
          },
          spatial: {
            title: "PRZESTRZENNY",
            fields: {
              crs: "EPSG",
              extent: "Bbox"
            }
          },
          layers: {
            title: "Warstwy",
            fields: {
              layers: "Warstwy",
              subfields: {
                crs: "EPSG",
                bbox: "Bbox",
                title: "TYTUŁ",
                name: "NAZWA",
                geometrytype: "GEOMETRIA",
                source: "ŹRÓDŁO",
                attributes: "Atrybuty",
                abstract: "ABSTRAKCYJNY",
                attribution: "ATRYBUCJA",
                keywords: "Chiave zwolnienia warunkowego",
                metadataurl: "URL METADATA",
                dataurl: "URL danych"
              }
            },
            groups: {
              general: "OGÓLNY",
              spatial: "PRZESTRZENNY"
            }
          }
        }
      },
      tooltips: {
        relations: {
          form_to_row: "Widok wiersza",
          row_to_form: "Widok formularza",
          zoomtogeometry: "Powiększ geometrię"
        },
        copy_map_extent_url: "Kopiuj link Widok Mapa",
        download_shapefile: "Pobierz ShapeFile",
        download_gpx: "Pobierz GPX",
        download_gpkg: "Pobierz GPKG",
        download_csv: "Pobierz CSV",
        download_xls: "Pobierz XLS",
        show_chart: "Wykres pokazowy",
        atlas: "Wydrukuj atlas"
      },
      mapcontrols: {
        query: {
          tooltip: "Warstwa zapytania",
          actions: {
            add_selection: {
              hint: "Dodaj/usuń wybór"
            },
            zoom_to_features_extent: {
              hint: "Zoom w zakresie funkcji"
            },
            add_features_to_results: {
              hint: "Dodaj/usuń funkcje do wyników"
            },
            remove_feature_from_results: {
              hint: "Usuń funkcję z wyników"
            },
            zoom_to_feature: {
              hint: "Zoom do funkcji"
            },
            relations: {
              hint: "Pokaż relacje"
            },
            relations_charts: {
              hint: "Pokaż wykres relacji"
            },
            download_features_shapefile: {
              hint: "Pobierz funkcje ShapeFile"
            },
            download_shapefile: {
              hint: "Pobierz funkcję kształtu plik"
            },
            download_features_gpx: {
              hint: "Pobierz funkcję GPX"
            },
            download_features_gpkg: {
              hint: "Pobierz funkcje GPKG"
            },
            download_gpx: {
              hint: "Pobierz funkcję GPX"
            },
            download_gpkg: {
              hint: "Pobierz funkcję gpkg"
            },
            download_features_csv: {
              hint: "Pobierz funkcje CSV"
            },
            download_csv: {
              hint: "Pobierz funkcję CSV"
            },
            download_features_xls: {
              hint: "Pobierz funkcje XLS"
            },
            download_xls: {
              hint: "Pobierz funkcję XLS"
            },
            atlas: {
              hint: "Wydrukuj atlas"
            },
            copy_zoom_to_fid_url: {
              hint: "Skopiuj adres URL map z tym rozszerzeniem funkcji geometrii",
              hint_change: "Skopiowane"
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
            title: "Pobieranie atrybutów",
            choiches: {
              feature: {
                label: "Tylko funkcje"
              },
              feature_polygon: {
                label: "Funkcje+Polygon zapytania"
              }
            }
          },
          tooltip: "Zapytanie według wielokąta",
          no_geometry: "Brak geometrii w odpowiedzi",
          help: {
            message: "<ul><li>Wybierz warstwę wielokąta na Toc.</li><li>upewnij się, że warstwa jest widoczna.</li><li>Kliknij funkcję wybranej warstwy.</li></ul>"
          }
        },
        querybydrawpolygon: {
          tooltip: "Zapytanie przez Polygon Draw"
        },
        querybbox: {
          tooltip: "Zapytanie warstwa Bbox",
          nolayers_visible: "Nie widać zapytaniach warstw. Ustaw co najmniej jedną widoczną warstwę WFS, aby uruchomić zapytanie",
          help: {
            message: "<ul><li>Narysuj kwadrat na mapie, aby zapytają podkreślone warstwy na Toc</li></ul>"
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
              warning: "Wynik na mapie jest częściowy ze względu na obecność poniższej listy błędnych rekordów:"
            }
          },
          tooltip: "Dodaj warstwę"
        },
        geolocation: {
          tooltip: "Geolokalizację"
        },
        measures: {
          length: {
            tooltip: "Długość",
            help: "Kliknij mapę, aby narysować linię. Naciśnij <br> Canc, jeśli chcesz usunąć ostatni wierzchołek"
          },
          area: {
            tooltip: "Obszar",
            help: "Kliknij, aby narysować Poligon.press <br> Canc Jeśli chcesz usunąć ostatni wierzchołek"
          }
        },
        scale: {
          no_valid_scale: "Nieprawidłowa skala"
        },
        scaleline: {
          units: {
            metric: "Metry",
            nautical: "Mila morska"
          }
        },
        zoomhistory: {
          zoom_last: "Zoom ostatni",
          zoom_next: "Zoom Dalej"
        }
      },
      relations: {
        relation_data: "Dane dotyczące relacji",
        no_relations_found: "Nie znaleziono żadnych relacji",
        back_to_relations: "Powrót do relacji",
        list_of_relations_feature: "Lista relacji funkcji",
        error_missing_father_field: "Brakuje pola",
        download_with_relations: "Pobierz z relacjami",
        field: "Relation key field",
      },
      form: {
        loading: "Ładowanie ...",
        inputs: {
          messages: {
            errors: {
              picklayer: "Brak wybranej funkcji. Sprawdź, czy warstwa jest w edycji lub widoczna w bieżącej skali"
            }
          },
          tooltips: {
            picklayer: "Uzyskaj wartość z warstwy MA",
            lonlat: "Kliknij mapę, aby uzyskać współrzędne"
          },
          input_validation_mutually_exclusive: "Pole wzajemnie wykluczające się z",
          input_validation_error: "Obowiązkowe pole lub niewłaściwy typ danych",
          input_validation_error_type: "Niewłaściwy typ danych",
          input_validation_min_field: "Wartość musi być większa/równa wartości pola",
          input_validation_max_field: "Wartość musi być mniej/równa wartości pola",
          input_validation_exclude_values: "Wartość musi być wyjątkowa",
          integer: "liczba całkowita",
          bigint: "liczba całkowita",
          text: "tekst",
          varchar: "tekst",
          textarea: "tekst",
          string: "strunowy",
          date: "data",
          datetime: "data",
          float: "platforma",
          table: "tabela"
        },
        footer: {
          required_fields: "Wymagane pola"
        },
        messages: {
          qgis_input_widget_relation: "Użyj relacji konkretna forma do pracy w związku z relacją"
        }
      },
      catalog: {
        current_map_theme_prefix: "TEMAT",
        choose_map_theme: "Wybierz motyw",
        menu: {
          layerposition: "Pozycja warstwy",
          setwmsopacity: "Ustaw krycie",
          wms: {
            title: "--",
            copy: "Kliknij tutaj, aby skopiować adres URL",
            copied: "Skopiowane"
          },
          download: {
            unknow: "Pobierać",
            shp: "Pobierz ShapeFile",
            gpx: "Pobierz GPX",
            gpkg: "Pobierz GPKG",
            csv: "Pobierz CSV",
            xls: "Pobierz XLS",
            geotiff: "Pobierz Geotiff",
            geotiff_map_extent: "Pobierz Geotiff (Obecny zasięg View)"
          }
        }
      },
      wps: {
        list_process: "Lista procesu",
        tooltip: "Kliknij mapę"
      }
    },
    credits: {
      g3wSuiteFramework: "Aplikacja oparta na strukturze systemu operacyjnego",
      g3wSuiteDescription: "Publikuj i zarządzaj projektami QGIS w Internecie",
      productOf: "Ramy opracowane przez"
    },
    toggle_color_scheme: "Przełącz kolorystykę",
    logout: "Wyloguj",
    no_other_projects: "Nigdy więcej projektu dla tej grupy",
    no_other_groups: "Nigdy więcej grup dla tej makrogrupy",
    yes: "Tak",
    no: "NIE",
    back: "Z powrotem",
    backto: "Wrócić do",
    changemap: "Zmień mapę",
    change_session: "Zmień sesję",
    component: "Komponent ogólny",
    search: "Szukaj",
    no_results: "Nie znaleziono wyników",
    print: "Wydrukować",
    create_print: "Utwórz druk",
    dosearch: "Szukaj",
    catalog: "Mapa",
    data: "Dane",
    externalwms: "WMS",
    baselayers: "Baza",
    tools: "Narzędzia",
    tree: "Warstwy",
    legend: "Legenda",
    nobaselayer: "Brak mapy bazowej",
    street_search: "Znajdź adres",
    show: "Pokazywać",
    hide: "Ukrywać",
    copy_form_data: "Skopiuj dane",
    paste_form_data: "Pasta",
    copy_form_data_from_feature: "Skopiuj dane z mapy",
    error_map_loading: "Występuje błąd mapy ładowania",
    check_internet_connection_or_server_admin: "Sprawdź połączenie internetowe lub skontaktuj się z administratorem",
    could_not_load_vector_layers: "Błąd połączenia: Warstwy można załadować",
    server_saver_error: "Błąd zapisywania serwera",
    server_error: "Błąd połączenia serwera",
    save: "Ratować",
    cancel: "Anulować",
    close: "Zamknąć",
    dont_show_again: "Nie pokazuj ponownie",
    enlange_reduce: "Powiększ / zmniejsz",
    add: "Dodać",
    exitnosave: "Wyjdź bez zapisu",
    annul: "Anulować",
    layer_is_added: "Warstwa o tej samej nazwie już dodanej",
    sidebar: {
      wms: {
        panel: {
          title: "Dodaj warstwę WMS",
          label: {
            position: "Pozycja mapy",
            name: "Nazwa",
            projections: "Występ",
            layers: "Warstwy"
          }
        },
        add_wms_layer: "Dodaj warstwę WMS",
        delete_wms_url: "Usuń adres URL WMS",
        layer_id_already_added: "Już dodana warstwa WMS",
        url_already_added: "WMS URL/Nazwa już dodana",
        layer_add_error: "Warstwa WMS nie dodano. Sprawdź wszystkich parametrów lub adresu URL WMS"
      }
    },
    info: {
      title: "Wyniki",
      list_of_relations: "Lista relacji",
      open_link: "Otwarty załączony dokument",
      server_error: "Wystąpił błąd z serwera",
      no_results: "Nie znaleziono wyników dla tego zapytania/wyszukiwania",
      link_button: "otwarty"
    },
    mapcontrols: {
      geolocations: {
        error: "Nie mogę zdobyć swojej pozycji"
      },
      geocoding: {
        choose_layer: "Wybierz warstwę, gdzie dodać tę funkcję",
        placeholder: "Adres ...",
        nolayers: "Brak edytowalnych warstw punktowych w tym projekcie",
        noresults: "Brak wyników",
        notresponseserver: "Brak odpowiedzi z serwera"
      },
      add_layer_control: {
        header: "Dodaj warstwę",
        select_projection: "Wybierz projekcję warstwy",
        select_field_to_show: "Wybierz pole, aby pokazać na mapie",
        select_csv_separator: "Wybierz Selimiter",
        select_csv_x_field: "Wybierz pole x",
        select_csv_y_field: "Wybierz pole Y.",
        select_color: "Wybierz kolor warstwy",
        drag_layer: "Przeciągnij i upuść warstwę tutaj"
      },
      query: {
        input_relation: "Kliknij, aby pokazać relacje"
      },
      length: {
        tooltip: "Długość"
      },
      area: {
        tooltip: "Obszar"
      },
      screenshot: {
        error: "Tworzenie błędów z ekranu",
        securityError: `  
        <p><b>Błąd bezpieczeństwa</b>: Warstwa zewnętrzna zapobiega wydrukowaniu mapy. Aby sprawdzić, postępuj w następujący sposób:</p>
        <ol>
          <li>Usuń wszelkie ręcznie dodane warstwy zewnętrzne (np. WMORY WMS)</li>
          <li>Przeładowanie strony Siły: <code> CTRL + F5</code></li>
          <li>Wydrukuj ponownie mapę</li>
        </ol>
        <p>Aby uzyskać więcej informacji, skontaktuj się z administratorem serwera o: <a href="https://developer.mozilla.org/en-US/docs/Web/HTML/CORS_enabled_image" style="color: #000 !important;font-weight: bold;">&#x2139;&#xFE0F; security and tainted canvases</a></p>
        `
      }
    },
    catalog_items: {
      helptext: "Kliknij indywidualną warstwę prawym przyciskiem myszy, aby uzyskać dostęp do dodatkowych funkcji",
      contextmenu: {
        zoomtolayer: "Zoom do warstwy",
        open_attribute_table: "Otwórz tabelę atrybutów",
        show_metadata: "Metadane",
        styles: "Style",
        vector_color_menu: "Ustaw/zmiana kolor",
        layer_opacity: "Nieprzezroczystość",
        filters: "Filtry"
      }
    },
    dataTable: {
      previous: "Poprzedni",
      next: "Następny",
      lengthMenu: "Pokaż menu_",
      info: "Pokazanie _start_ do _end_ wpisów _total_",
      no_data: "Brak danych",
      nodatafilterd: "nie znaleziono pasujacego wyniku",
      infoFiltered: "(Filtrowane z _max_ całkowitych rekordów)"
    }
  }
};
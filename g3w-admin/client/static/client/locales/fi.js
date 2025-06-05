export default {
  translation: {
    error_page: {
      error: "Yhteysvirhe",
      at_moment: "Tällä hetkellä ei ole mahdollista näyttää karttaa",
      f5: "Paina Ctrl+F5"
    },
    cookie_law: {
      message: "This website uses cookies to ensure you get the best experience on our website.",
      buttonText: "Got It!"
    },
    default:"oletuksena",
    sign_in:"Kirjaudu sisään",
    layer_selection_filter: {
      tools: {
        filter: "Ota suodatin käyttöön/poista käytöstä",
        nofilter: "Poista Suodattaa",
        invert: "Käänteinen Valinta",
        clear: "Peruuttaa Valinta",
        show_features_on_map: "Päivitä tulokset karttaa siirtäessäsi",
        savefilter: "Tallenna suodatin",
        filterName: "Suodattimen Nimi",
      }
    },
    warning: {
      not_supported_format: "Not supported format"
    },
    layer_position: {
      top: 'TOP',
      bottom: 'BOTTOM',
      message: "Position relative to layers on TOC"
    },
    sdk: {
      atlas: {
        template_dialog: {
          title: "Valitse Template"
        }
      },
      spatialbookmarks: {
        title: "Tilalliset kirjanmerkit",
        helptext: "Siirry kartan laajuuteen, lisää nimi ja napsauta Lisää",
        input: {
          name: "Nimi"
        },
        sections: {
          project:{
            title: "Projektin kirjanmerkit"
          },
          user: {
            title: "Käyttäjän kirjanmerkit"
          }
        }
      },
      search: {
        all: 'KAIKKI',
        no_results: "Ei tuloksia",
        searching: "Haetaan ...",
        error_loading: "Virhe ladattaessa tietoja.",
        layer_not_searchable: "Taso ei ole haettavissa.",
        layer_not_querable: "Tasolle ei voi suorittaa kyselyitä.",
        autocomplete: {
          inputshort: {
            pre: "Syötä",
            post: "tai useampi merkki"
          }
        },
        help_filter : "Hakuarvot ovat rajoitettuja aktiivisen suodattimen perusteella. Poista suodatin etsiäksesi kaikista tiedoista.",
        autofilter: "Suodata tulokset"
      },
      print: {
        no_layers: 'Ei tulostettavia tasoja',
        template: "Template",
        labels: "Labels",
        scale: "Mittakaava",
        format: "Formaatti",
        rotation: "Kierto",
        download_image: "Lataa kuva",
        fids_instruction: "Hyväksytyt arvot: yhdestä arvoon [max]. Salittua syöttää myös väli, esim. 4-6.",
        fids_example: "Esimerkiksi 1,4-6 tulostuu id 1,4,5,6.",
        help: "Tulosteessa esiintyvät tasot voivat olla projektissa määriteltyjä ei kartalla esiintyviä."
      },
      querybuilder: {
        search: {
          run: "Suorita",
          info: "Informaatio",
          delete: "Poista",
          edit: "Muokkaa"
        },
        messages: {
          changed: 'Tallennettu',
          number_of_features: "Ominaisuuksien lukumäärä"
        },
        panel: {
          button: {
            all: 'KAIKKI',
            save: 'TALLENNA',
            test: 'TESTI',
            clear: 'TYHJENNÄ',
            run: 'SUORITA',
            manual: 'MANUAALINEN'
          },
          layers: 'TASOT',
          fields: 'KENTÄT',
          values: 'ARVOT',
          operators: 'OPERAATTORIT',
          expression: 'LAUSEKE'
        },
        error_run: 'Tapahtui virhe. Tarkista kysely.',
        error_test: "Kyselyä suorittaessa tapahtui virhe.",
        delete: 'Haluatko poistaa sen?',
        additem: 'Anna nimi uudelle haulle.'
      },
      errors: {
        layers: {
          load: "Jotkin tasot eivät ole saatavilla."
        },
        unsupported_format: 'Ei tuettu formaatti',
        add_external_layer: 'Tason latausvirhe'
      },
      metadata: {
        title: 'Metatiedot',
        groups: {
          general: {
            title: 'YLEINEN',
            fields: {
              title: 'OTSIKKO',
              name: 'NIMI',
              description: "KUVAUS",
              abstract: "TIIVISTELMÄ",
              keywords: 'AVAINSANAT',
              fees: "MAKSUT",
              accessconstraints: "PÄÄSYRAJOITUKSET",
              contactinformation: "YHTEYSTIEDOT",
              subfields: {
                contactinformation: {
                  contactelectronicmailaddress: "Sähköposti",
                  personprimary: 'Viitteet',
                  contactvoicetelephone: 'Puhelin',
                  contactorganization: 'Organisaatio',
                  ContactOrganization: 'Organisaatio',
                  contactposition: 'Asema',
                  ContactPosition: 'Asema',
                  contactperson: 'Yhteyshenkilö',
                  ContactPerson: 'Yhteyshenkilö'
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
            title: 'TASOT',
            fields: {
              layers: 'TASOT',
              subfields: {
                crs: 'EPSG',
                bbox: 'BBOX',
                title: "OTSIKKO",
                name: 'NIMI',
                geometrytype: 'GEOMETRIA',
                source: 'LÄHDE',
                attributes: 'ATTRIBUUTIT',
                abstract: 'TIIVISTELMÄ',
                attribution: 'ATTRIBUUTIO',
                keywords: "AVAINSANAT",
                metadataurl:'METATIEDON URL',
                dataurl: "DATA URL"
              }
            },
            groups : {
              general: 'YLEINEN',
              spatial: 'SPATIAL'
            }
          }
        }
      },
      tooltips: {
        relations: {
          form_to_row: "Rivinäkymä",
          row_to_form: "Taulukkonäkymä",
          zoomtogeometry: "Zoomaa geometriaan",
        },
        copy_map_extent_url: 'Kopioi kartan katselulinkki',
        download_shapefile: "Lataa SHP-tiedosto",
        download_gpx: "Lataa GPX-tiedosto",
        download_gpkg: "Lataa GPKG-tiedosto",
        download_csv: "Lataa CSV-tiedosto",
        download_xls: "Lataa XLS-tiedosto",
        download_pdf: "Lataa PDF-tiedosto",
        show_chart: "Näytä kaavio",
        atlas: "Tulosta Atlas",
        editing: "Editing",
      },
      mapcontrols: {
        query: {
          tooltip: 'Kyselytaso',
          actions: {
            add_selection: {
              hint: 'Lisää/Poista valinta'
            },
            zoom_to_features_extent:{
              hint: "Tarkenna ominaisuuden laajuuteen"
            },
            add_features_to_results: {
              hint: "Add/Remove features to results"
            },
            remove_feature_from_results: {
              hint: "Remove feature from results"
            },
            zoom_to_feature: {
              hint: "Tarkenna ominaisuuteen"
            },
            relations: {
              hint: "Näytä relaatiot"
            },
            relations_charts: {
              hint: "Näytä relaatiokaavio"
            },			  
            download_features_shapefile:{
              hint: 'Lataa ominaisuuden SHP-tiedosto'
            },
            download_shapefile: {
              hint: 'Lataa ominaisuuden SHP-tiedosto'
            },
            download_features_gpx: {
              hint: "Lataa ominaisuuden GPX-tiedosto"
            },
            download_features_gpkg: {
              hint: "Lataa ominaisuuden GPKG-tiedosto"
            },
            download_gpx: {
              hint: "Lataa ominaisuuden GPX-tiedosto"
            },
            download_gpkg: {
              hint: "Lataa ominaisuuden GPKG-tiedosto"
            },
            download_features_csv: {
              hint: "Lataa ominaisuuden CSV-tiedosto"
            },
            download_csv: {
              hint: "Lataa ominaisuuden CSV-tiedosto"
            },
            download_features_xls: {
              hint: "Lataa ominaisuuden XLS-tiedosto"
            },
            download_xls: {
              hint: "Lataa ominaisuuden XLS-tiedosto"
            },
            download_pdf: {
              hint: "Lataa ominaisuuden PDF-tiedosto"
            },
            atlas: {
              hint: "Tulosta Atlas"
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
          tooltip: 'Kysely monikulmiolla',
          no_geometry: 'No geometry on response',
          help: {
            message: "<ul><li>Valitse monikulmiotaso luettelosta.</li><li>Tarkista, että taso on näkyvillä.</li><li>Valitse ominaisuus valitulla tasolla.</li></ul>"
          }
        },
        querybydrawpolygon: {
          tooltip: "Kysely piirtopolygonin mukaan"
        },
        querybbox: {
          tooltip: 'Tasoon kohdituva BBox-kysely',
          nolayers_visible: 'Ei kyseltäviä tasoja näkyvillä. Aseta vähintään yksi WFS-taso näkyväksi suorittaaksesi haun.',
          help: {
            message: "<ul><li>Piirrä suorakulmio kartalle suorittaaksesi kyselyn luettelossa alleviivatuille tasoille.</li></ul>"
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
          tooltip: 'Lisää taso'
        },
        geolocation: {
          tooltip: 'Maantieteellinen sijainti'
        },
        measures: {
          length: {
            tooltip: "Pituus",
            help: "Piirrä murtoviiva kartalle. Paina <br>CANC, mikäli haluat poistaa edellisen pisteen.",
          },
          area: {
            tooltip: "Alue",
            help: "Piirrä monikulmio kartalle. Paina <br>CANC, mikäli haluat poistaa edellisen pisteen."
          }
        },
        scale: {
          no_valid_scale: "Väärä mittakaava"
        },
        scaleline: {
          units: {
            metric: 'Meters',
            nautical: 'Nautical Mile'
          }
        },
        zoomhistory: {
          zoom_last: "Zoom Edellinen",
          zoom_next: "Zoom Seurata"
        }
      },
      relations: {
        relation_data: 'Relaation tiedot',
        no_relations_found: 'Relaatiota ei löytynyt.',
        back_to_relations: 'Takaisin relaatioihin',
        list_of_relations_feature: 'Lista ominaisuuden relaatioista',
        error_missing_father_field: "Kenttä puuttu",
        download_with_relations: "Lataa suhteiden kanssa",
        field: "Relation key field",
      },
      form: {
        loading: 'Ladataan...',
        inputs: {
          messages: {
            errors: {
              picklayer: "Ominaisuuksia ei valiitu. Tarkista, että taso on muokattavissa tai näkyvissä nykyisellä mittakaavalla."
            }
          },
          tooltips:{
            picklayer: "Valitse arvo karttatasolta",
            lonlat: "Click on map to get coordinates"
          },
          input_validation_mutually_exclusive: "Kenttä toisensa poissulkeva.",
          input_validation_error: "Pakollinen kenttä tai väärä tietotyyppi.",
          input_validation_error_type: "Väärä tietotyyppi.",
          input_validation_min_field: "Arvon tulee olla suurempi tai yhtäsuuri kuin kentän arvo.",
          input_validation_max_field: "Arvon tulee olla pienempi tai yhtäsuuri kuin kentän arvo.",
          input_validation_exclude_values: "Arvon tulee olla uniikki.",
          integer: "kokonaisluku",
          bigint: "kokonaisluku",
          text: "teksti",
          varchar: "teksti",
          textarea: "teksti",
          string: "merkkijono",
          date: "päiväys",
          datetime: "päiväys",
          float: "liukuluku",
          table: "taulukko"
        },
        footer: {
          "required_fields": "Vaaditut kentät"
        },
        messages: {
          qgis_input_widget_relation: "Käytä relaatioiden määrittämiseen tähän tarkoitettua toimintoa"
        }
      },
      catalog: {
        current_map_theme_prefix: "THEME",
        choose_map_theme: "CHOOSE THEME",
        choose_map_theme_input_label: 'Uuden teeman nimi',
        project_map_theme : 'Projektin Themes',
        user_map_theme: 'Käyttäjä Themes',
        question_delete_map_theme: "Haluatko poistaa teeman?",
        delete_map_theme: "Teeman poistaminen onnistui",
        saved_map_theme: "Teeman tallennus onnistui",
        updated_map_theme: "Teeman päivittää onnistui",
        invalid_map_theme_name: "Nimi on jo olemassa tai se on virheellinen",
        menu: {
          layerposition: 'Kerroksen sijainti',
          setwmsopacity: "Aseta Opacity",
          wms: {
            title:"",
            copy: "Paina tästä kopioidaksesi url:n.",
            copied: "Kopioitu."
          },
          download: {
            unknow: "Lataa",
            shp: 'Lataa SHP-tiedosto',
            gpx: 'Lataa GPX-tiedosto',
            gpkg: 'Lataa GPKG-tiedosto',
            csv: 'Lataa CSV-tiedosto',
            xls: 'Lataa XLS-tiedosto',
            geotiff: 'Lataa GEOTIFF-tiedosto',
            geotiff_map_extent: "Lataa GEOTIFF-tiedosto(current view extent)"
          }
        }
      },
      wps: {
        list_process: "Lista prosesseista",
        tooltip: 'Valitse kartalta'
      }
    },
    credits: {
      g3wSuiteFramework: "Sovellus perustuu OS framework",
      g3wSuiteDescription: "Julkaise ja hallinnoi QGIS-projekteja verkossa.",
      productOf: "Frameworkin on kehittänyt",
    },
    toggle_color_scheme: "Toggle color scheme",
    logout: "Kirjaudu ulos",
    no_other_projects: "Ei projekteja tälle ryhmälle",
    no_other_groups: "Ei enää ryhmiä tälle makroryhmälle",
    yes: "Kyllä",
    no: "Ei",
    back: "Palaa",
    backto: "Takaisin ",
    changemap: "Vaihda karttaa",
    change_session: "Vaihda istuntoa",
    component: "Yleinen komponentti",
    search: "Hae",
    no_results: "Ei hakutuloksia",
    print: "Tulosta",
    create_print: "Luo tuloste",
    dosearch: "Hae",
    catalog: "Kartta",
    data: "Data",
    externalwms: "WMS",
    baselayers: "Taustakartta",
    tools: "Työkalut",
    tree: "Tasot",
    legend: "Merkintöjen selite",
    nobaselayer: "Ei taustakarttaa",
    street_search: "Hae osoite",
    show: "Näytä",
    hide: "Piilota",
    copy_form_data: "Kopioi tiedot",
    paste_form_data: "Liitä",
    copy_form_data_from_feature: "Kopioi tiedot kartalta",
    error_map_loading: "Virhe ladattessa karttaa",
    check_internet_connection_or_server_admin: "Tarkista internetyhteys tai ota yhteyttä ylläpitäjään.",
    could_not_load_vector_layers: "Yhteysvirhe, tasoja ei voida ladata.",
    server_saver_error: "Virhe tallentaessa palvelimelle.",
    server_error: "Yhteysvirhe palvelimeen",
    save: "Tallenna",
    cancel: "Peruuta",
    update: "Päivittää",
    close: "Sulje",
    /** @since 3.8.0 */
    dont_show_again: "Älä näytä viestiä uudelleen",
    enlange_reduce: "Suurenna / Pienennä",
    add: "Lisää",
    exitnosave: "Poistu tallentamatta",
    annul: "Peruuta",
    layer_is_added: "Samanniminen taso on jo lisätty.",
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
        layer_id_already_added: "WMS Taso on jo lisätty.",
        url_already_added: "WMS URL/Nimi on jo lisätty.",
        layer_add_error: "WMS Layer not added. Please check all wms parameter or url"
      }
    },
    info: {
      title: "Tulokset",
      list_of_relations: "List of Relations",
      open_link: "Avaa liitetiedosto",
      server_error: "Palvelimella tapahtui virhe.",
      no_results: "Ei tuloksia haulle/kyselylle.",
      link_button: "Avaa"
    },
    mapcontrols: {
      geolocation: {
        error: "Sijaintiasi ei saada"
      },
      geocoding: {
        choose_layer: "Valitse kerros, johon tämä ominaisuus lisätään",
        placeholder: "Osoite ...",
        nolayers: "Tästä projektista ei löytynyt muokattavia pistetasoja",
        noresults: "Ei tuloksia",
        notresponseserver: "Ei vastausta palvelimelta"
      },
      add_layer_control: {
        header: "Lisää taso",
        select_projection: "Valitse tason projektio",
        select_field_to_show : "Select Field to show on map",
        select_csv_separator: "Select delimiter",
        select_csv_x_field: "Select X field",
        select_csv_y_field: "Select Y field",
        select_color: "Valitse tason väri",
        drag_layer: "Vedä ja pudota taso tähän"
      },
      query: {
        input_relation: "Paina näyttääksesi relaatiot"
      },
      length: {
        tooltip: "Pituus"
      },
      area: {
        tooltip: "Pinta-ala"
      },
      screenshot: {
        error: "Screenshot error creation",
        securityError: `  
        <p><b>Turvallisuusvirhe</b>: ulkoinen kerros estää karttaa tulostamasta. Tarkistaaksesi, toimi seuraavasti:</p>
        <ol>
          <li>poista manuaalisesti lisätyt ulkoiset tasot (esim. WMS-tasot)</li>
          <li>Pakota sivun uudelleenlataus: <code>CTRL + F5</code></li>
          <li>tulosta kartta uudelleen</li>
        </ol>
        <p>Saat lisätietoja palvelimen järjestelmänvalvojalta seuraavista aiheista: <a href="https://developer.mozilla.org/en-US/docs/Web/HTML/CORS_enabled_image" style="color: #000 !important;font -paino: lihavoitu;">&#x2139;&#xFE0F; turvallisuus ja likaiset kankaat</a></p>
        `
      }
    },
    catalog_items: {
      helptext: "Napsauta hiiren kakkospainikkeella yksittäistä tasoa päästäksesi lisäominaisuuksiin.",
      contextmenu: {
        zoomtolayer: "Tarkenna tasoon",
        open_attribute_table: "Avaa attribuuttitaulu",
        show_metadata: "Metatiedot",
        styles: "Tyylejä",
        vector_color_menu: "Aseta/muuta väriä",
        layer_opacity: "Peittävyys",
        filters: "Filters",
      }
    },
    dataTable: {
      previous: "Edellinen",
      next: "Seuraava",
      lengthMenu: "Näytä _MENU_ arvoa sivulla",
      info: "tulosta _TOTA_:stä",
      no_data: "Ei tietoja",
      nodatafilterd: "Vastaavia tietueita ei löytynyt",
      infoFiltered: "(filtered from _MAX_ total records)"
    }
  },
};
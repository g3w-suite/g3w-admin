export default {
  translation: {
    error_page: {
      error: "Помилка з'єднання",
      at_moment: "Неможливо відобразити мапу",
      f5: "Натисніть Ctrl+F5"
    },
    cookie_law: {
      message: "Сайт використовує cookies щоб забезпечити найкращий досвід від використання сервісу.",
      buttonText: "Зрозуміло!"
    },
    default: "за замовчанням",
    sign_in: "Вхід",
    layer_selection_filter: {
      tools: {
        filter: "Активувати/вимкнути фільтр",
        nofilter: "Видалити фільтр",
        invert: "Інвертувати виділення",
        clear: "Очистити виділення",
        show_features_on_map: "Оновлювати результати при переміщенні мапи",
        savefilter: "Зберегти фільтр",
        filterName: "Назва фільтра",
      }
    },
    warning: {
      not_supported_format: "Формат не підтримується"
    },
    layer_position: {
      top: "вгорі",
      bottom: "внизу",
      message: "Положення"
    },
    sdk: {
      atlas: {
        template_dialog: {
          title: "Виберіть шаблон"
        }
      },
      spatialbookmarks: {
        title: "Закладки",
        helptext: "Встановіть бажані межі мапи, задайте назву та натисніть Додати",
        input: {
          name: "Назва"
        },
        sections: {
          project:{
            title: "Закладки проекту"
          },
          user: {
            title: "Закладки користувача"
          }
        }
      },
      search: {
        all: "ВСЕ",
        no_results: "Не знайдено",
        searching: "Пошук…",
        error_loading: "Помилка завантаження даних",
        layer_not_searchable: "Пошук по шару неможливий",
        layer_not_querable: "Шар не підтримує запити",
        autocomplete: {
          inputshort: {
            pre: "Введіть",
            post: "або більше символів"
          }
        },
        help_filter : "Результати пошуку обмежуються фільтром. Видаліть фільтр щоб шукати по всьому шару.",
        autofilter: "Фільтрувати за результатами"
      },
      print: {
        no_layers: "Відсутні видимі шари",
        template: "Шаблон",
        labels: "Підписи",
        scale: "Масштаб",
        format: "Формат",
        rotation: "Обертання",
        download_image: "Завантажити зображення",
        fids_instruction: "Допустимі значення: від 1 до значення позначеного [max]. Підтримуються діапазони значень, наприклад, 4-6",
        fids_example: "Наприклад, 1,4-6 надрукує сторінки 1,4,5,6",
        help: "Шари, які можна експортувати, задаються адміністратором",
        help_details: `<p>Якщо у файлі відсутні деякі шари:</p>
          <ol style="padding-left: 25px">
            <li>спробуйте обрати інший шаблон</li>
            <li>спробуйте змінитиіть масштаб</li>
            <li>перевірте джерела даних (наприклад, зовнішній WMS-сервер)</li>
            <li>переконайтеся, що шар дійсно вибрано у списку шарів</li>
          </ol>`,
      },
      querybuilder: {
        title: "Розширений пошук",
        search: {
          run: "Виконати",
          info: "Інформація",
          delete: "Видалити",
          edit: "Змінити"
        },
        messages: {
          changed: "Збережено",
          number_of_features: "Знайдено об'єктів:"
        },
        panel: {
          button: {
            all: "ПОШУК ЗНАЧЕННЯ",
            save: "ЗБЕРЕГТИ",
            test: "ПЕРЕВІРИТИ",
            clear: "ОЧИСТИТИ",
            run: "ВИКОНАТИ",
            manual: "ДОВІДКА"
          },
          layers: "ШАРИ",
          fields: "ПОЛЯ",
          values: "ЗНАЧЕННЯ",
          operators: "ОПЕРАТОРИ",
          expression: "ВИРАЗ"
        },
        error_run: "Помилка. Перевірте правильність запиту",
        error_test: "Помилка виконання запиту",
        delete: "Скасувати?",
        additem: "Задайте назву запиту"
      },
      errors: {
        layers: {
          load: "Деякі шари недоступні"
        },
        unsupported_format: "Формат не підтримується",
        add_external_layer: "Помилка завантаження шару"
      },
      metadata: {
        title: "Метадані",
        groups: {
          general: {
            title: "ЗАГАЛЬНЕ",
            fields: {
              title: "НАЗВА",
              name: "ІМ'Я",
              description: "ОПИС",
              abstract: "АННОТАЦІЯ",
              keywords: "КЛЮЧОВІ СЛОВА",
              fees: "ОПЛАТА",
              accessconstraints: "ОБМЕЖЕННЯ ДОСТУПУ",
              contactinformation: "КОНТАКТИ",
              subfields: {
                contactinformation: {
                  contactelectronicmailaddress: "Email",
                  personprimary: "Посилання",
                  contactvoicetelephone: "Телефон",
                  contactorganization: "Організація",
                  ContactOrganization: "Організація",
                  contactposition: "Посада",
                  ContactPosition: "Посада",
                  contactperson: "Особа",
                  ContactPerson: "Особа"
                }
              },
              wms_url: "WMS"
            }
          },
          spatial:{
            title: "ПРОСТОРОВА ІНФОРМАЦІЯ",
            fields : {
              crs: "EPSG",
              extent: "BBOX"
            }
          },
          layers: {
            title: "ШАРИ",
            fields: {
              layers: "ШАРИ",
              subfields: {
                crs: "EPSG",
                bbox: "BBOX",
                title: "НАЗВА",
                name: "ІМ'Я",
                geometrytype: "ГЕОМЕТРІЯ",
                source: "ДЖЕРЕЛО",
                attributes: "АТРИБУТИ",
                abstract: "АННОТАЦІЯ",
                attribution: "ПОХОДЖЕННЯ",
                keywords: "КЛЮЧОВІ СЛОВА",
                metadataurl: "URL МЕТАДАНИХ",
                dataurl: "URL ДАНИХ"
              }
            },
            groups : {
              general: "ЗАГАЛЬНЕ",
              spatial: "ПРОСТОРОВА ІНФОРМАЦІЯ"
            }
          },
          credits: {
            title: 'Про проект',
          }
        }
      },
      tooltips: {
        relations: {
          form_to_row: "Таблиця",
          row_to_form: "Форма",
          zoomtogeometry: "Наблизити до об'єкта",
        },
        copy_map_extent_url: "Поділитися",
        download_shapefile: "Завантажити Shapefile",
        download_gpx: "Завантажити GPX",
        download_gpkg: "Завантажити GPKG",
        download_csv: "Завантажити CSV",
        download_xls: "Завантажити XLS",
        download_pdf: "Завантажити PDF",
        show_chart: "Показати діаграми",
        atlas: "Друкувати атлас",
        editing: "Оцифровка",
      },
      mapcontrols: {
        query: {
          tooltip: "Запит до шару",
          actions: {
            add_selection: {
              hint: "Додати до/Вилучити з вибірки"
            },
            zoom_to_features_extent:{
              hint: "Наблизити до об'єктів"
            },
            add_features_to_results: {
              hint: "Додати до/Вилучити з результатів"
            },
            remove_feature_from_results: {
              hint: "Видалити об'єкт з результатів"
            },
            zoom_to_feature: {
              hint: "Наблизити до об'єкта"
            },
            relations: {
              hint: "Показати відношення"
            },
            relations_charts: {
              hint: "Показати діаграму відношення"
            },
            download_features_shapefile:{
              hint: "Завантажити Shapefile"
            },
            download_shapefile: {
              hint: "Завантажити Shapefile"
            },
            download_features_gpx: {
              hint: "Завантажити GPX"
            },
            download_features_gpkg: {
              hint: "Завантажити GPKG"
            },
            download_gpx: {
              hint: "Завантажити GPX"
            },
            download_gpkg: {
              hint: "Завантажити GPKG"
            },
            download_features_csv: {
              hint: "Завантажити CSV"
            },
            download_csv: {
              hint: "Завантажити CSV"
            },
            download_features_xls: {
              hint: "Завантажити XLS"
            },
            download_xls: {
              hint: "Завантажити XLS"
            },
            download_pdf: {
              hint: "Завантажити PDF"
            },
            atlas: {
              hint: "Друкувати Атлас"
            },
            copy_zoom_to_fid_url: {
              hint: "Поділитися",
              hint_change: "Скопійовано до буферу обміну"
            }
          }
        },
        queryby: {
          title: "Вибрати полігоном",
          layer: "Шар:",
          none: "НІЧОГО",
          new: "ТИМЧАСОВИЙ ШАР",
          all: "ВСЕ",
          methods: {
            intersects: "intersects",
            within: "within"
          },
          querybypolygon: {
            tooltip: "вибрати полігоном"
          },
          querybydrawpolygon: {
            tooltip: "оцифрувати полігон",
            help: {
              message:"<ul><li>Клацніть по мапі щоб додати нову вершину</li><li>Закінчіть оцифровку подвійним клацанням щоб виконати запит до шарів</li></ul>"
            }
          },
          querybbox: {
            tooltip: "оцифрувати прямокутник"
          },
          querybycircle: {
            tooltip: "оцифрувати коло"
          }
        },
        querybypolygon: {
          download: {
            title: "Завантижити атрибути",
            choiches:{
              feature: {
                label: "Тільки об'єкти",
              },
              feature_polygon: {
                label: "Об'єкти та полігон",
              }
            }
          },
          tooltip: "Вибрати за об'єктом шару",
          no_geometry: "Відповідь не містить геометрії",
          help: {
            message: "<ul><li>Виберіть (видимий) шар.</li><li>Клацніть по об'єкту на мапі.</li></ul>"
          }
        },
        querybydrawpolygon: {
          tooltip: "Вибрати за полігоном",
          help: {
            message: "<ul><li>Клацніть по мапі щоб додати нову вершину</li><li>Закінчіть оцифровку подвійним клацанням щоб виконати запит до шарів, підкреслених жовтим у списку шарів</li></ul>"
          }
        },
        querybbox: {
          tooltip: "Вибрати у межах шару",
          nolayers_visible: "Відсутні видимі шари до яких можна сформувати запит. Переконайтеся, що є хоча б один видимий шар WFS",
          help: {
            message: "<ul><li>Протягніть мишкою щоб намалювати полігон та виконати запит до шарів, підкреслених жовтим у списку шарів</li></ul>"
          }
        },
        querybycircle: {
          tooltip: "Вибрати за радіусом",
          label: "Радіус",
          help: {
            message: "<ul><li>Клацніть по мапі щоб намалювати коло</li></ul>"
          },
        },
        addlayer: {
          messages: {
            csv: {
              warning: "Результати неповні через наявність наступних некоректних записів:"
            }
          },
          tooltip: "Додати шар"
        },
        geolocation: {
          tooltip: "Геолокація"
        },
        measures: {
          title: "Виміряти",
          length: {
            tooltip: "Довжина",
            help: "Клацніть по мапі щоб намалювати лінію. Натисніть <br>CANC щоб видалити останню вершину",
          },
          area: {
            tooltip: "Площа",
            help: "Клацніть по мапі щоб намалювати полігон. Натисність <br>CANC щоб видалити останню вершину"
          }
        },
        screenshot: {
          title: "Знімок екрану",
          screenshot: "PNG",
          geoscreenshot: "GeoTIFF",
          download: "Створити"
        },
        scale: {
          no_valid_scale: "Неправильний масштаб"
        },
        scaleline: {
          units: {
            metric: "Метри",
            nautical: "Морські милі"
          }
        },
        zoomhistory: {
          zoom_last: "Попередній масштаб",
          zoom_next: "Наступний масштаб"
        }
      },
      relations: {
        relation_data: "Відношення",
        no_relations_found: "Відношення відсутні",
        back_to_relations: "До відношень",
        list_of_relations_feature: "Відношення об'єкта",
        error_missing_father_field: "Відсутнє поле",
        download_with_relations: "Завантажити з відносинами",
        field: "Ключ відношення",
      },
      form: {
        loading: "Завантаження…",
        inputs: {
          messages: {
            errors: {
              picklayer: "Жодного об'єкта не вибрано. Перевірте що шар у режимі редагування та видимий за поточного масштабу"
            }
          },
          tooltips:{
            picklayer: "Отримати значення з мапи",
            lonlat: "Клацніть по мапі щоб отримати координати"
          },
          input_validation_mutually_exclusive: "Поле взаємовиключне з ",
          input_validation_error: "Обов'язкове поле або неправильний тип даних",
          input_validation_error_type: "Неправильний тип даних",
          input_validation_min_field: "Значення повинно бути більше або дорівнювати значенню поля ",
          input_validation_max_field: "Значення повинно бути менше або дорівнювати значенню поля ",
          input_validation_exclude_values: "Значення повинні бути унікальними",
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
          required_fields: "Обов'язкові поля"
        },
        messages: {
          qgis_input_widget_relation: "Керуйте відношеннями за допомогою спеціальної форми"
        }
      },
      catalog: {
        current_map_theme_prefix: "ТЕМА",
        choose_map_theme: "ВИБРАТИ ТЕМУ",
        choose_map_theme_input_label: "Назва нової теми",
        project_map_theme: "Теми проекту",
        user_map_theme: "Теми користувача",
        question_delete_map_theme: "Видалити тему?",
        delete_map_theme: "Тему видалено",
        saved_map_theme: "Тему збережено",
        updated_map_theme: "Тему оновлено",
        invalid_map_theme_name: "Неправильна назва або тема з такою назвою вже існує",
        menu: {
          layerposition: "Положення шару",
          setwmsopacity: "Встановити непрозорість",
          wms: {
            title:"",
            copy: "Скопіювати посилання",
            copied: "Скопійовано"
          },
          download: {
            unknow: "Завантажити",
            geotiff_map_extent: "GeoTiff (поточні межі)"
          }
        }
      },
      wps: {
        list_process: "Список процесів",
        tooltip: "Клацніть по мапі"
      }
    },
    credits: {
      g3wSuiteFramework: "Програма на основі фреймворку ОС",
      g3wSuiteDescription: "Публікуйте та керуйте проектами QGIS в мережі Інтернет",
      productOf: "Розроблено",
    },
    toggle_color_scheme: "Перемкнути колірну схему",
    logout: "Вихід",
    no_other_projects: "У групі карт відсутні інші проекти",
    no_other_groups: "У макрогрупі відсутні інші групи",
    yes: "Так",
    no: "Ні",
    back: "Назад",
    backto: "Повернутися до ",
    changemap: "Змінити мапу",
    change_session: "Змінити сесію",
    component: "Універсальний компонент",
    search: "Пошук",
    no_results: "Нічого не знайдено",
    print: "Друк",
    create_print: "Створити Друк",
    dosearch: "Пошук",
    catalog: "Мапа",
    data: "Дані",
    externalwms: "WMS",
    baselayers: "Базові шари",
    tools: "Інструменти",
    tree: "Шари",
    legend: "Легенда",
    nobaselayer: "Без базових шарів",
    street_search: "Знайти адресу",
    show: "Показати",
    hide: "Сховати",
    copy_form_data: "Копіювати",
    paste_form_data: "Вставити",
    copy_form_data_from_feature: "Копіювати дані з мапи",
    error_map_loading: "Помилка завантаження нової мапи",
    check_internet_connection_or_server_admin: "Перевірте мережеве з'єднання або зв'яжіться з адміністратором",
    could_not_load_vector_layers: "Помилка з'єднання з сервером: не вдалося завантажити шари",
    server_saver_error: "Помилка завантаження на сервер",
    server_error: "Помилка підключення до сервера",
    save: "Зберегти",
    cancel: "Скасувати",
    update: "Оновити",
    close: "Закрити",
    /** @since 3.8.0 */
    dont_show_again: "Більше не показувати",
    enlange_reduce: "Збільшити / Зменшити",
    add: "Додати",
    exitnosave: "Вийти без збереження",
    annul: "Скасувати",
    layer_is_added: "Шар з таким ім'ям вже існує",
    sidebar: {
      wms: {
        panel: {
          title: "Додати шар WMS",
          label: {
            position: "Розташування на мапі",
            name: "Ім'я",
            projections: "Система координат",
            layers: "Шари"
          }
        },
        add_wms_layer: "Додати шар WMS",
        delete_wms_url: "Вилучити",
        layer_id_already_added: "WMS з'єднання з таким ім'ям вже існує",
        url_already_added: "WMS з'єднання вже додане",
        layer_add_error: "WMS шар не додано. Перевірте параметри або URL сервера"
      }
    },
    info: {
      title: "Результати",
      list_of_relations: "Список відношень",
      open_link: "Відкрити вкладений документ",
      server_error: "Помилка запиту до сервера",
      no_results: "За запитом нічого не знайдено",
      link_button: "Відкрити"
    },
    mapcontrols: {
      geolocation: {
        error: "Не вдалося отримати місцезнаходження"
      },
      geocoding: {
        choose_layer: "Оберіть шар у який буде додано об'єкт",
        placeholder: "Адреса…",
        nolayers: "У проекті відсутні точкові шари, які можна редагувати",
        noresults: "Немає результатів",
        notresponseserver: "Сервер не відповідає"
      },
      add_layer_control: {
        header: "Додати шар",
        select_projection: "Система координат",
        select_field_to_show: "значення для відображення на мапі",
        select_csv_separator: "Роздільник",
        select_csv_x_field: "X",
        select_csv_y_field: "Y",
        select_color: "Колір шару",
        drag_layer: "Додати файл",
        persistent_data: "Постійні дані",
        persistent_help: "зберегти шар у сховищі браузера",
      },
      query: {
        input_relation: "Показати відношення"
      },
      length: {
        tooltip: "Довжина"
      },
      area: {
        tooltip: "Площа"
      },
      screenshot: {
        error: "Помилка створення знімка екрана",
        securityError: `  
        <p><b>Порушення безпеки</b>: зовнішній шар перешкоджає друку мапи. Щоб переконатися в цьому:</p>
        <ol>
          <li>видаліть всі зовнішні шари додані вручну (наприклад, шари WMS)</li>
          <li>оновіть сторінку: <code>CTRL + F5</code></li>
          <li>спробуйте роздрукувати мапу ще раз</li>
        </ol>
        <p>Зв'яжіться з адміністратором щоб дізнатися більше про <a href="https://developer.mozilla.org/en-US/docs/Web/HTML/CORS_enabled_image" style="color: #000 !important;font-weight: bold;">&#x2139;&#xFE0F; безпеку та зіпсовані полотна canvas</a></p>
        `
      }
    },
    catalog_items: {
      helptext: "Відкрити меню",
      contextmenu: {
        zoomtolayer: "Наблизити до шару",
        open_attribute_table: "Відкрити таблицю атрибутів",
        show_metadata: "Метадані",
        styles: "Стиль",
        vector_color_menu: "Колір",
        layer_opacity: "Непрозорість",
        filters: "Фільтри",
        download: "Зберегти як",
        ogc_services: "Сервіси OGC",
        edit: "Редагувати шар",
      }
    },
    dataTable: {
      previous: "Попередній",
      next: "Наступний",
      lengthMenu: "Показувати _MENU_ значень на сторінці",
      info: "_TOTAL_ записів",
      no_data: "No data",
      nodatafilterd: "Нічого не знайдено",
      infoFiltered: "(відфільтровано з _MAX_ записів)"
    },
    /**@since 3.10.0 */
    no_geometry: "Об'єкт не має геометрії",
    /**@since 3.11.0 */
    query_filter: "Фільтрувати за:",
    /**@since 3.11.0 */
    sidebar_menu: "Бічне меню",
    /**@since 3.11.0 */
    layer_type: "Тип шару",
    /** @since 3.11.0 */
    choose_type: "Обрати тип",
    /**@since 3.11.0 */
    remote_wms_url: "WMS (URL)",
    /**@since 3.11.0 */
    local_file: "Файл",
    /**@since 3.11.0 */
    embed_map: "Вбудувати мапу",
    /** @since 3.11.0 */
    homepage: "Домашня",
    /** @since 3.11.0 */
    wms_server: "Сервер WMS",
    /** @since 3.11.0 */
    connect_to_wms: "Під'єднатися",
    /** @since 3.11.0 */
    disconnect_from_wms: "Від'єднатися",
    /** @since 3.11.0 */
    add_new_wms_url_help: "Шукати серед наявних з'єднань або додати новий сервер",
    /** @since 3.11.0 */
    saved_connections: "Збережені з'єднання:",
    /** @since 3.11.0 */
    label: "Мітка",
    /** @since 3.11.0 */
    no_csv_field: "Поля відсутні",
    /** @since 3.11.0 */
    show_more: "Показати більше",
  },
};

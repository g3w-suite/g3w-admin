export default {
  translation: {
    error_page: {
      error: "Erro de conexão",
      at_moment: "De momento não é possível apresentar o mapa",
      f5: "Pressione Ctrl+F5"
    },
    cookie_law: {
      message: "Esta página utiliza cookies para garantir que obtenha a melhor experiência de uso.",
      buttonText: "OK!"
    },
    default:"predefinido",
    sign_in: "Aceder",
    layer_selection_filter: {
      tools: {
        filter: "Ativar/desativar filtro",
        nofilter: "Remover filtro",
        invert: "Inverter Seleção",
        clear: "Limpar Seleção",
        show_features_on_map: "Atualizar resultados ao mover o mapa",
        savefilter: "Salvar Filtro",
        filterName: "Nome do Filtro",
      }
    },
    warning: {
      not_supported_format: "Formato não suportado"
    },
    layer_position: {
      top: 'cima',
      bottom: 'baixo',
      message: "Posição"
    },
    sdk: {
      atlas: {
        template_dialog: {
          title: "Selecione o Modelo"
        }
      },
      spatialbookmarks: {
        title: "Marcadores",
        helptext: "Altere a extensão do mapa, insira um nome e clique Adicionar",
        input: {
          name: "Nome"
        },
        sections: {
          project:{
            title: "Marcadores do projeto"
          },
          user: {
            title: "Marcadores do Utilizador"
          }
        }
      },
      search: {
        all: 'Todos',
        no_results: "Sem resultados",
        searching: "A pesquisar ...",
        error_loading: "Erro ao Carregar os Dados",
        layer_not_searchable: "Camada não é pesquisável",
        layer_not_querable: "Camada não é consultável (query)",
        autocomplete: {
          inputshort: {
            pre: "Inserir",
            post: "ou mais carateres"
          }
        },
        help_filter : "Os valores de pesquisa são limitados com base no filtro ativo. Remova o filtro para pesquisar todos os dados.",
        autofilter: "Filtrar resultados"

},
      print: {
        no_layers: 'Sem camada para imprimir',
        template: "Modelo",
        labels: "Etiquetas",
        scale: "Escala",
        format: "Formato",
        rotation: "Rotação",
        download_image: "Descarregar Imagem",
        fids_instruction: "Valores permitidos: de 1 até [max]. Pode inserir um intervalo ex. 4-6",
        fids_example: "Ex. 1,4-6 irá imprimir id 1,4,5,6",
        help: "Camadas a exportar serão definidas pelo administrador",
        help_details: `<p>Se não visualizar alguma camada no ficheiro de impressão</p>
          <ol style="padding-left: 25px">
            <li>tente novamente selecionando outro modelo</li>
            <li>tente mudar o nível de zoom</li>
            <li>verifique a origem (ex. Servidor WMS externos)</li>
            <li>garanta que a camada está ativada na lista de camadas.</li>
          </ol>`,
      },
      querybuilder: {
        title: 'Pesquisa avançada',
        search: {
          run: "Executar",
          info: "Informação",
          delete: "Eliminar",
          edit: "Editar"
        },
        messages: {
          changed: 'Guardado',
          number_of_features: "Entidades encontradas:"
        },
        panel: {
          button: {
            all: 'PESQUISE UM VALOR',
            save: 'GUARDAR',
            test: 'TESTAR',
            clear: 'LIMPAR',
            run: 'EXECUTAR',
            manual: 'MANUAL'
          },
          layers: 'CAMADAS',
          fields: 'CAMPOS',
          values: 'VALORES',
          operators: 'OPERADORES',
          expression: 'EXPRESSÃO'
        },
        error_run: 'Ocorreu um erro. Verifique a consulta',
        error_test: "Oorreu um erro durante a execução da consulta",
        delete: 'Pretende eliminar?',
        additem: 'Insira o nome da nova pesquisa'
      },
      errors: {
        layers: {
          load: "Algumas camadas não estão disponíveis"
        },
        unsupported_format: 'Formato não suportado',
        add_external_layer: 'Erro de carregamento de camada'
      },
      metadata: {
        title: 'Metadados',
        groups: {
          general: {
            title: 'GERAL',
            fields: {
              title: 'TÍTULO',
              name: 'NOME',
              description: "DESCRIÇÃO",
              abstract: "RESUMO",
              keywords: 'PALAVRAS CHAVE',
              fees: "TAXAS",
              accessconstraints: "RESTRIÇÃO DE ACESSO",
              contactinformation: "CONTATOS",
              subfields: {
                contactinformation: {
                  contactelectronicmailaddress: "Email",
                  personprimary: 'Referencias',
                  contactvoicetelephone: 'Telefone',
                  contactorganization: 'Organização',
                  ContactOrganization: 'Organização',
                  contactposition: 'Cargo',
                  ContactPosition: 'Cargo',
                  contactperson: 'Pessoa',
                  ContactPerson: 'Pessoa'
                }
              },
              wms_url: "WMS"
            }
          },
          spatial:{
            title: 'ESPACIAL',
            fields : {
              crs: 'EPSG',
              extent: 'BBOX'
            }
          },
          layers: {
            title: 'CAMADAS',
            fields: {
              layers: 'LAYERS',
              subfields: {
                crs: 'EPSG',
                bbox: 'BBOX',
                title: "TÍTULO",
                name: 'NOME',
                geometrytype: 'GEOMETRIA',
                source: 'FONTE',
                attributes: 'ATRIBUTOS',
                abstract: 'RESUMO',
                attribution: 'ATRIBUIÇÃO',
                keywords: "PALAVRA CHAVE",
                metadataurl:'ENDEREÇO METADADOS',
                dataurl: "ENDEREÇO DADOS"
              }
            },
            groups : {
              general: 'GERAL',
              spatial: 'ESPACIAL'
            }
          },
          credits: {
            title: 'Créditos',
          }
        }
      },
      tooltips: {
        relations: {
          form_to_row: "Vista de tabela",
          row_to_form: "Vista de Formulário",
          zoomtogeometry: "Aproximar à Geometria",
        },
        copy_map_extent_url: 'Copiar URL partilhável',
        download_shapefile: "Descarregar Shapefile",
        download_gpx: "Descarregar GPX",
        download_gpkg: "Descarregar GPKG",
        download_csv: "Descarregar CSV",
        download_xls: "Descarregar XLS",
        download_pdf: "Descarregar PDF",
        show_chart: "Mostrar Gráfico",
        atlas: "Imprimir Atlas",
        editing: "Edição",
      },
      mapcontrols: {
        query: {
          tooltip: 'Consultar camada',
          actions: {
            add_selection: {
              hint: "Adicionar/Remover Seleção"
            },
            zoom_to_features_extent:{
              hint: "Aproximar à extensão da camada"
            },
            add_features_to_results: {
              hint: "Adicionar/Remover camadas aos resultados"
            },
            remove_feature_from_results: {
              hint: "Remover camada dos resultados"
            },
            zoom_to_feature: {
              hint: "Ampliar para a camada"
            },
            relations: {
              hint: "Mostrar Relações"
            },
            relations_charts: {
              hint: "Mostrar gráfico das relações"
            },
            download_features_shapefile:{
              hint: 'Descarregar camadas para Shapefile'
            },
            download_shapefile: {
              hint: 'Descarregar camada para Shapefile'
            },
            download_features_gpx: {
              hint: "Descarregar camadas para GPX"
            },
            download_features_gpkg: {
              hint: "Descarregar camadas para GPKG"
            },
            download_gpx: {
              hint: "Descarregar camada para GPX"
            },
            download_gpkg: {
              hint: "Descarregar camada para GPKG"
            },
            download_features_csv: {
              hint: "Descarregar camadas para CSV"
            },
            download_csv: {
              hint: "Descarregar camada para CSV"
            },
            download_features_xls: {
              hint: "Descarregar camadas para para XLS"
            },
            download_xls: {
              hint: "Descarregar camada para XLS"
            },
            download_pdf: {
              hint: "Descarregar camada para PDF"
            },
            atlas: {
              hint: "Imprimir Atlas"
            },
            copy_zoom_to_fid_url: {
              hint: "Compartilhar link",
              hint_change: "Copiado"
            }
          }
        },
        queryby: {
          title: 'Consultar área',
          layer: 'Selecionar camadas:',
          none: 'NENHUM',
          new: 'CAMADA TEMPORÁRIA',
          all: 'TODOS',
          methods: {
            intersects: 'interseção',
            within: 'dentro de'
          },
          querybypolygon: {
            tooltip: 'selecione um polígono'
          },
          querybydrawpolygon: {
            tooltip: 'desenhe um polígono'
          },
          querybbox: {
            tooltip: 'desenhe um retangulo'
          },
          querybycircle: {
            tooltip: 'desenhe um círculo'
          }
        },
        querybypolygon: {
          download: {
            title: "Descarregar atributos",
            choiches:{
              feature: {
                label:"Apenas geometrias",
              },
              feature_polygon: {
                label:"Consultar Camadas+Polígono",
              }
            }
          },
          tooltip: 'Consultar por Polígono',
          no_geometry: 'Resposta sem geometrias',
          help: {
            message: "<ul><li>Selecione uma camada (ativa).</li><li>Clique sobre uma geometria no mapa.</li></ul>"
          }
        },
        querybydrawpolygon: {
          tooltip: "Desenhe um polígono para consultar ",
          help: {
            message: "<ul><li>Clique sobre o mapa para adicionar um novo vértice </li><li>Duplo clique para finalizar e inquirir camadas (sublinhado a amarelo na legenda)</li></ul>"
          }
        },
        querybbox: {
          tooltip: 'Consultar camada com retangulo',
          nolayers_visible: 'Nenhuma camada consultável visivel. Defina pelo menos uma camada wfs visivel para executar a consulta',
          help: {
            message: "<ul><li>Arraste o rato para desenhar um retangulo e consultar as camadas. (sublinhado a amarelo na legenda)</li></ul>"
          }
        },
        querybycircle: {
          tooltip: "Consultar camada com circulo ",
          label: 'Raio',
          help: {
            message: "<ul><li>Clique no mapa para desenhar o círculo</li></ul>"
          },
        },
        addlayer: {
          messages: {
            csv: {
              warning: "O resulto no mapa é parcial, dada a presença dos seguintes registos incorretos:"
            }
          },
          tooltip: 'Adicionar camada'
        },
        geolocation: {
          tooltip: 'Geolocalização'
        },
        measures: {
          title: 'Medir',
          length: {
            tooltip: "Comprimento",
            help: "Clique no mapa  para desenhar uma linha. Prima <br>CANC se pretender eliminar o ultimo vértice",
          },
          area: {
            tooltip: "Área",
            help: "Clique para desenhar o polígono.Prima <br>CANC se pretender eliminar o ultimo vértice"
          }
        },
        screenshot: {
          title: 'Captura de ecran',
          screenshot: "PNG",
          geoscreenshot: "GeoTIFF",
          download: 'Gerar'
        },
        scale: {
          no_valid_scale: "Escala inválida"
        },
        scaleline: {
          units: {
            metric: 'Metros',
            nautical: 'Milhas náuticas'
          }
        },
        zoomhistory: {
          zoom_last: "Zoom anterior",
          zoom_next: "Zoom seguinte"
        }
      },
      relations: {
        relation_data: 'Dados da Relação',
        no_relations_found: 'Relações não encontradas',
        back_to_relations: 'Voltar para as relações',
        list_of_relations_feature: 'Lista de relações da camada',
        error_missing_father_field: "Atributo em falta",
        download_with_relations: "Download com relações",
        field: "Campo chave da relação",
      },
      form: {
        loading: 'A carregar ...',
        inputs: {
          messages: {
            errors: {
              picklayer: "Sem camadas selecionadas. Verifique se a camada está em edição ou visível na escala atual."
            }
          },
          tooltips:{
            picklayer: "Obter atributo da camada",
            lonlat: "Clique no mapa para obter as coordenadas"
          },
          input_validation_mutually_exclusive: "Atributo mutuamente exclusivo com ",
          input_validation_error: "Atributo obrigatório ou tipo de dados incorreto",
          input_validation_error_type: "Tipo de dados incorreto",
          input_validation_min_field: "Valor deve ser maior/igual ao valor do campo ",
          input_validation_max_field: "Valor deve ser menor/igual ao valor do campo ",
          input_validation_exclude_values: "Valor deverá ser unico",
          integer: "inteiro",
          bigint: "inteiro",
          text: "texto",
          varchar: "texto",
          textarea: "texto",
          string: "string",
          date: "data",
          datetime: "data",
          float: "float",
          table: "tabela"
        },
        footer: {
          "required_fields": "Atributos necessários"
        },
        messages: {
          qgis_input_widget_relation: "Utilize o formulário específico para trabalhar com relações"
        }
      },
      catalog: {
        current_map_theme_prefix: "TEMA",
        choose_map_theme: "ESCOLHA O TEMA",
        choose_map_theme_input_label: 'Nome do novo tema do mapa',
        project_map_theme : 'Tema do Projeto',
        user_map_theme: 'Temas do utilizador',
        question_delete_map_theme: "Pretende eliminar o tema?",
        delete_map_theme: "Tema apagado com sucesso",
        saved_map_theme: "Tema guardado com sucesso",
        updated_map_theme: "Tema alterado com sucesso",
        invalid_map_theme_name: "Nome inválido",
        menu: {
          layerposition: 'Posição da camada',
          setwmsopacity: "Definir transparência",
          wms: {
            title:"",
            copy: "Clique para copiar o endereço",
            copied: "Copiado"
          },
          download: {
            unknow: 'Descarregar',
            geotiff_map_extent: "GeoTiff (vista atual)"
          }
        }
      },
      wps: {
        list_process: "Listar processo",
        tooltip: 'Clique no mapa'
      }
    },
    credits: {
      g3wSuiteFramework: "Aplicativo baseado na framework OS",
      g3wSuiteDescription: "Permite publicar e gerir os seus projetos QGIS na web",
      productOf: "Framework desenvolvida por",
    },
    toggle_color_scheme: "Altere o esquema de cores",
    logout: "Sair",
    no_other_projects: "Não existem mais projetos para este grupo",
    no_other_groups: "Não existem outros Grupos para este Macrogrupo",
    yes: "Sim",
    no: "Não",
    back: "Voltar",
    backto: "Voltar para ",
    changemap: "Alterar mapa",
    change_session: "Alterar Sessão",
    component: "Componente Genérico",
    search: "Pesquisar",
    no_results: "Não foram encontrados resultados",
    print: "Imprimir",
    create_print: "Criar impressão",
    dosearch: "Pesquisar",
    catalog: "Mapa",
    data: "Dados",
    externalwms: "WMS",
    baselayers: "Base",
    tools: "Ferramentas",
    tree: "Camadas",
    legend: "Legenda",
    nobaselayer: "Sem mapa base",
    street_search: "Encontrar endereço",
    show: "Mostrar",
    hide: "Esconder",
    copy_form_data: "Copiar dados",
    paste_form_data: "Colar",
    copy_form_data_from_feature: "Copia dados do mapa",
    error_map_loading: "Ocorreu um erro ao carregar o mapa",
    check_internet_connection_or_server_admin: "Verifique a ligação internet ou contacte o administrador",
    could_not_load_vector_layers: "Erro de ligação: Camadas não podem ser carregadas",
    server_saver_error: "Erro no servidor ao guardar",
    server_error: "Erro de ligação ao servidor",
    save: "Guardar",
    cancel: "Cancelar",
    update: "Atualizar",
    close: "Fechar",
    /** @since 3.8.0 */
    dont_show_again: "Não mostrar novamente",
    enlange_reduce: "Aumentar / Reduzir",
    add: "Adicionar",
    exitnosave: "Sair sem guardar",
    annul: "Cancelar",
    layer_is_added: "Camada com o mesmo nome já adicionada",
    sidebar: {
      wms: {
        panel: {
          title:'Adicionar Camada WMS',
          label: {
            position: "Posição do Mapa",
            name: "Nome",
            projections: 'Projeção',
            layers: 'Camadas'
          }
        },
        add_wms_layer: "Adicionar camada WMS",
        delete_wms_url: "Remover",
        layer_id_already_added: "Já existe uma ligação WMS com o mesmo nome",
        url_already_added: "Endereço/Nome do WMS já adicionado",
        layer_add_error: "Camada WMS não adicionada. Verifique o parametro do endereço do wms"
      }
    },
    info: {
      title: "Resultados",
      list_of_relations: "Lista de Relações",
      open_link: "Abrir documento anexo",
      server_error: "Ocorreu um erro no servidor",
      no_results: "Não foram encontrados resultados para a consulta/pesquisa",
      link_button: "Abrir"
    },
    mapcontrols: {
      geolocation: {
        error: "Não é possivel obter a sua posição"
      },
      geocoding: {
        choose_layer: "Escolher uma camada para adicionar a entidade",
        placeholder: "Endereço ...",
        nolayers: "Sem camadas de pontos editáveis no projeto",
        noresults: "Sem resultados",
        notresponseserver: "Sem resposta do servidor"
      },
      add_layer_control: {
        header: "Adicionar camada",
        select_projection: "Projeção",
        select_field_to_show: "campo a mostrar no mapa",
        select_csv_separator: "Delimitador",
        select_csv_x_field: "Campo X",
        select_csv_y_field: "Campo Y",
        select_color: "Cor da camada",
        drag_layer: "Adicione o seu ficheiro aqui",
        persistent_data: "Dados persistentes",
        persistent_help: "guardar camada no armazenamento do navegador",
      },
      query: {
        input_relation: "Clique para mostrar as relações"
      },
      length: {
        tooltip: "Comprimento"
      },
      area: {
        tooltip: "Área"
      },
      screenshot: {
        error: "Erro na criação da captura de ecra",
        securityError: `  
        <p><b>Erro de segurança</b>: uma camada externa está a impedir a impressão do mapa. Para verificar proceda da seguinte forma:</p>
        <ol>
          <li>remova as camadas externas (ex. camadas WMS)</li>
          <li>recarregue a página: <code>CTRL + F5</code></li>
          <li>imprima o mapa de novo</li>
        </ol>
        <p>Para mais informações contacte o administrador do sistema: <a href="https://developer.mozilla.org/en-US/docs/Web/HTML/CORS_enabled_image" style="color: #000 !important;font-weight: bold;">&#x2139;&#xFE0F; security and tainted canvases</a></p>
        `
      }
    },
    catalog_items: {
      helptext: "Abrir o menu",
      contextmenu: {
        zoomtolayer: "Aproximar à Camada",
        open_attribute_table: "Abrir tabela de atributos",
        show_metadata: "Metadados",
        styles: 'Estilos',
        vector_color_menu:"Cor",
        layer_opacity: "Opacidade",
        filters: "Filtros",
        download: 'Guardar como',
        ogc_services: 'Serviços OGC',
        edit: "Editar Camada",
      }
    },
    dataTable: {
      previous: "Anterior",
      next: "Próximo",
      lengthMenu: "Mostrar valores _MENU_ por página",
      info: "_TOTAL_ entradas",
      no_data: "Sem dados",
      nodatafilterd: "Não foram encontrados registos correspondentes",
      infoFiltered: "(filtrados de _MAX_ registos totais)"
    },
    /**@since 3.10.0 */
    no_geometry: 'Elemento sem geometria',
    /**@since 3.11.0 */
    query_filter: 'Filtrar por:',
    /**@since 3.11.0 */
    sidebar_menu: 'Menu barra lateral',
    /**@since 3.11.0 */
    layer_type: 'Tipo de camada',
    /** @since 3.11.0 */
    choose_type: 'Escolha tipo',
    /**@since 3.11.0 */
    remote_wms_url: 'WMS (Endereço)',
    /**@since 3.11.0 */
    local_file: 'Ficheiro Local',
    /**@since 3.11.0 */
    embed_map: 'Incorporar Mapa',
    /** @since 3.11.0 */
    homepage: 'Início',
    /** @since 3.11.0 */
    wms_server: 'Servidor WMS',
    /** @since 3.11.0 */
    connect_to_wms: 'Conectar',
    /** @since 3.11.0 */
    disconnect_from_wms: 'Desconectar',
    /** @since 3.11.0 */
    add_new_wms_url_help: 'procurar nas ligações guardadas ou adicionar um novo servidor',
    /** @since 3.11.0 */
    saved_connections: 'Ligações guardadas:',
    /** @since 3.11.0 */
    label: "Etiqueta",
    /** @since 3.11.0 */
    no_csv_field: 'Nenhum campo válido',
    /** @since 3.11.0 */
    show_more: 'Mostrar mais',
  },
};

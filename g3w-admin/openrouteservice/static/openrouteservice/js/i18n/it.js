export default {
  isochrones: {
    title: "TEMPO DI VIAGGIO (ISOCHRONE)",
    label: {
      name            : "Nome",
      profile         : "Profilo",
      range_type      : "Modalità",
      range           : "Range",
      interval        : "Intervallo",
      stroke_width    : "Larghezza Penna",
      color           : "Colore",
      transparency    : "Trasparenza",
      mapcoordinates  : "Coordinate Mappa (EPSG:4326)",
      pointlayer      : "Layer Puntuale Progetto",
      input: {
        select: {
          time      : "Time (minutes)",
          distance  : "Distance (meters)"
        }
      }
    }
  },
  inputs: {
    label: {
      mapcoordinates: {
        lon     : "Longitudine",
        lat     : "Latitudine",
      },
      from_layer    : "Layer",
    }
  },
  outputs: {
    newlayer      : "Nuovo Layer",
    existinglayer : "Layer Esistente",
    label: {
      new_layer_name: "Nome Layer",
      connection_id: "Datasource",
      input: {
        select: {
          __shapefile__: "Nuovo Shapefile",
          __spatialite__: "Nuovo Spatialite",
          __geopackage__: "Nuovo Geopackage"
        }
      },
      existinglayer: {
        qgis_layer_id: "Existing Layer"
      }
    }
  },
  run: "Esegui"
}
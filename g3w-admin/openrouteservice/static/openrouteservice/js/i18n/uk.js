export default {
  isochrones: {
    title: "Зони доступності (ізохрони)",
    label: {
      name: "Ім'я",
      profile: "Профіль",
      range_type: "Режим",
      range: "Діапазон",
      interval: "Інтервал",
      stroke_width: "Товщина штриха",
      color: "Колір",
      transparency: "Прозорість",
      mapcoordinates  : "Координати з мапи (EPSG:4326)",
      pointlayer      : "Точка з наявного шару",
      input: {
         select: {
           time: "Час (хвилини)",
           distance: "Відстань (метри)"
         }
      }
    }
  },
  inputs: {
    label: {
      mapcoordinates: {
        lon: "Довгота",
        lat: "Широта"
      },
      from_layer: "Шар",
    }
  },
  outputs: {
    newlayer      : "Новий шар",
    existinglayer : "Наявний шар",
    label: {
      new_layer_name: "Ім'я шару",
      connection_id: "Джерело даних",
      input: {
        select: {
          __shapefile__: "Новий shape-файл",
          __spatialite__: "Нова база Spatialite",
          __geopackage__: "Новий файл Geopackage"
        }
      },
      existinglayer: {
        qgis_layer_id: "Наявний шар"
      }
    }
  },
  run: "Виконати"
}
export default {
  isochrones: {
    title: "TRAVEL TIME (ISOCHRONE)",
    label: {
      name: "Name",
      profile: "Profile",
      range_type: "Mode",
      range: "Range",
      interval: "Interval",
      stroke_width: "Pen width",
      color: "Color",
      transparency: "Transparency",
      mapcoordinates  : "Map Coordinates (EPSG:4326)",
      pointlayer      : "Existing Layer Point",
      input: {
        select: {
          time: "Time (minutes)",
          distance: "Distance (meters)"
        }
      }
    }
  },
  inputs: {
    label: {
      mapcoordinates: {
        lon: "Longitude",
        lat: "Latitude"
      },
      from_layer: "Layer",
    }
  },
  outputs: {
    newlayer      : "New Layer",
    existinglayer : "Existing Layer",
    label: {
      new_layer_name:"Layer name",
      connection_id: "Datasource",
      input: {
        select: {
          __shapefile__: "New Shapefile",
          __spatialite__: "New Spatialite",
          __geopackage__: 'New Geopackage'
        }
      },
      existinglayer: {
        qgis_layer_id:  "Existing Layer"
      }
    }
  },
  run: "Run"
}
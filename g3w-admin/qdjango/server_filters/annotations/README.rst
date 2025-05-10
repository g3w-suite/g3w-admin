
Layer GetPrint annotations
==========================


WMS GetPrint custom ANNOTATION argument: when set to a geojson body it generates temporary layers that are added to the GetPrint maps.

Supported layers are:

- Points
- Polygons
- Linestrings
- Labels (points with fully transparent symbols: only the label will be visible)

For each layer type, the features can optionally expose a "name" property that will become the label.

The following example shows how to use the ANNOTATION argument to add a point and a polygon to the map:

.. code-block:: json

    {
      "type": "FeatureCollection",
      "features": [
        {
          "type": "Feature",
          "geometry": {
            "type": "Point",
            "coordinates": [10, 10]
          },
          "properties": {
            "name": "My Point"
          }
        },
        {
          "type": "Feature",
          "geometry": {
            "type": "Polygon",
            "coordinates": [
              [
                [10, 10],
                [20, 10],
                [20, 20],
                [10, 20],
                [10, 10]
              ]
            ]
          },
          "properties": {
            "name": "My Polygon"
          }
        }
      ]
    }



Label only layer
----------------

Invisible point features are used to provide free-placement labels, that are assigned to a dedicated
"Labels" layer.

To assign a point feature to the "Labels" layer, set the "label" property to true. The point will be invisible, and only the label will be visible.

The following example shows how to use the ANNOTATION argument to add a point and a polygon to the map, with a label that is not associated with any feature:


.. code-block:: json

    {
    "type": "FeatureCollection",
    "features": [
        {
        "type": "Feature",
        "geometry": {
            "type": "Point",
            "coordinates": [10, 10]
        },
        "properties": {
            "name": "My Point",
            "label": true
        }
        }
    ]
    }


Styling
----------------

Each layer can be styled using the following properties (units are in millimeters):

Common properties
.................

- `font-size`: Font size of the label. Default: 12
- `font-color`: Font color of the label. Defaults depends on the layer type:
  - Point: #FF0000
  - Polygon: #0000FF
  - Line: #00FF00
  - Label: #FF0000
- `font-style`: Font style of the label. Default: normal (available values: normal, Italic, Bold)

Point properties
...................

- `stroke-color`: Color of the point stroke-color. Default: #FF0000
- `stroke-width`: Width of the point stroke. Default: 2
- `fill-color`: Color of the point fill. Default: #FF0000
- `size`: Size of the point. Default: 5

Polygon properties
...................

- `stroke-color`: Color of the polygon stroke. Default: #0000FF
- `stroke-width`: Width of the polygon stroke. Default: 2
- `fill-color`: Color of the polygon fill. Default: #0000FF

Line properties
...................

- `stroke-color`: Color of the line stroke. Default: #00FF00
- `stroke-width`: Width of the line stroke. Default: 2


Full example
----------------

.. code-block:: json

    {
    "type": "FeatureCollection",
    "styles": {
        "points": {
            "stroke-color": "#00FF00",
            "stroke-width": 1,
            "fill-color": "#00FFFF",
            "size": 4,
            "__comment": "text properties for the point label",
            "font-size": 20,
            "font-style": "Italic",
            "font-color": "#FF0000"
        },
        "lines": {
            "stroke-color": "#00FF00",
            "stroke-width": 2,
            "__comment": "text properties for the line label",
            "font-size": 20,
            "font-style": "Italic",
            "font-color": "#00FF00"
        },
        "polygons": {
            "stroke-color": "#0000FF",
            "stroke-width": 2,
            "fill-color": "#FFFF00",
            "__comment": "text properties for the polygon label",
            "font-size": 20,
            "font-style": "Italic",
            "font-color": "#00FF00"
        },
        "labels": {
            "__comment": "text properties for the point label",
            "font-size": 20,
            "font-style": "Bold",
            "font-color": "#00FFFF"
        }
    },
    "features": [
        {
            "__comment": "This is a label-only feature",
            "type": "Feature",
            "geometry": { "type": "Point", "coordinates": [13, 42] },
            "properties": {
                "name": "Italy",
                "label": true
            }
        },
        {
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [10, 44]
            },
            "properties": {
                "name": "Italy"
            }
        },
        {
            "type": "Feature",
            "geometry": {
                "type": "LineString",
                "coordinates": [
                    [10.5, 43],
                    [12, 42],
                    [14, 41]
                ]
            },
            "properties": {
                "name": "Italian Coastline"
            }
        },
        {
            "type": "Feature",
            "geometry": {
                "type": "Polygon",
                "coordinates": [
                    [
                    [10, 45],
                    [12, 45],
                    [12, 47],
                    [10, 47],
                    [10, 45]
                    ]
                ]
            },
            "properties": {
                "name": "Italian Region"
            }
        }
    ]
    }

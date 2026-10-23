
Layer GetPrint annotations
==========================


WMS GetPrint custom ANNOTATION argument: when set to a geojson body it generates temporary layers that are added to the GetPrint maps.

Supported layers are:

- Point
- Polygon
- LineString
- GeometryCollection (only used with empty geometry and "Circle" type)
- Text (Point with fully transparent symbols: only the label will be visible)

For each layer type, the features can optionally expose a "name" property that will become the label.

The following example shows how to use the ANNOTATION argument to add temporary layers to the map:

.. code-block:: json

    {
    "type": "FeatureCollection",
    "features": [
        {
        "type": "Feature",
        "geometry": {
            "type": "Point",
            "coordinates": [
            11.241955750563555,
            43.793789620809264
            ]
        },
        "properties": {
            "type": "Point",
            "style": {
            "color": "#f44e3b",
            "radius": 15,
            "fontsize": 15
            },
            "label": ""
        },
        "id": 9
        },
        {
        "type": "Feature",
        "geometry": {
            "type": "LineString",
            "coordinates": [
            [
                11.244558317256773,
                43.7953626109431
            ],
            [
                11.244545864784557,
                43.79305254832917
            ]
            ]
        },
        "properties": {
            "type": "LineString",
            "style": {
            "color": "#f44e3b",
            "width": 3,
            "fontsize": 15,
            "direction": "forward"
            },
            "label": "0.26 km\nLineString 9"
        },
        "id": 10
        },
        {
        "type": "Feature",
        "geometry": {
            "type": "Polygon",
            "coordinates": [
            [
                [
                11.24580356447841,
                43.79523677325611
                ],
                [
                11.245467347728566,
                43.794580615309116
                ],
                [
                11.246015256506087,
                43.793546927216
                ],
                [
                11.246899382033448,
                43.79293569454015
                ],
                [
                11.247434838338751,
                43.79313344697232
                ],
                [
                11.248480846004925,
                43.793960404598806
                ],
                [
                11.248443488588277,
                43.79493116634151
                ],
                [
                11.247609172949781,
                43.79514688903163
                ],
                [
                11.24580356447841,
                43.79523677325611
                ]
            ]
            ]
        },
        "properties": {
            "type": "Polygon",
            "style": {
            "color": "#009ce0",
            "width": 5,
            "fontsize": 15,
            "opacity": 0.7
            },
            "label": "0.04 km²\nPolygon 10"
        },
        "id": 11
        },
        {
        "type": "Feature",
        "geometry": {
            "type": "Polygon",
            "coordinates": [
            [
                [
                11.251730941253394,
                43.79435590202726
                ],
                [
                11.251730941253394,
                43.795452494842976
                ],
                [
                11.253499192308118,
                43.795452494842976
                ],
                [
                11.253499192308118,
                43.79435590202726
                ],
                [
                11.251730941253394,
                43.79435590202726
                ]
            ]
            ]
        },
        "properties": {
            "type": "Rectangle",
            "style": {
            "color": "#fcdc00",
            "width": 3,
            "fontsize": 15,
            "opacity": 0.5
            },
            "label": "0.02 km²\nRectangle 12"
        },
        "id": 13
        },
        {
        "type": "Feature",
        "geometry": {
            "type": "Point",
            "coordinates": [
            11.255080656279596,
            43.79485925860507
            ]
        },
        "properties": {
            "type": "Text",
            "style": {
            "rotation": 0.7155849933176751,
            "fontsize": 20
            },
            "label": "Text 13"
        },
        "id": 14
        },
        {
        "type": "Feature",
        "geometry": {
            "type": "GeometryCollection",
            "geometries": []
        },
        "properties": {
            "endCoordinates": [
            11.250112119865268,
            43.793690745760586
            ],
            "type": "Circle",
            "radius": 123.74529801611789,
            "center": [
            11.249863070420941,
            43.79447275303929
            ],
            "style": {
            "color": "#000000",
            "width": 3,
            "fontsize": 15,
            "opacity": 0.5
            },
            "label": "Circle 11",
            "label_radius": "0.12 km \n",
            "label_angle": "12°"
        },
        "id": 12
        }
    ]
    }

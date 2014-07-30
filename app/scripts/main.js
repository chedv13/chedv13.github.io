var map, toolbar,
    db = new PouchDB('mapDB'),
    addFile = function (form, latitude, longitude) {
        var file = _.find(form.childNodes, function (obj) {
            return obj.tagName == 'INPUT';
        }).files[0];

        if (file) {
            var reader = new FileReader();
            reader.readAsText(file, "UTF-8");

            reader.onload = function (evt) {
                var fileObject = {
                    _id: new Date().toISOString(),
                    elementId: $(form).parent().parent().prop('id'),
                    data: evt.target.result,
                    latitude: latitude,
                    longitude: longitude,
                    name: file.name,
                    objectType: 'attachment',
                    type: file.type
                };

                db.put(fileObject, function callback(err, result) {
                    if (!err) {
                        alert('Attachment successfully added!');
                    }
                });
            };

            reader.onerror = function (evt) {
                alert("Error reading file ...");
            };
        }
    },
// Трэш ...
    selectAttachments = function (latitude, longitude, elementId) {
        function map(doc) {
            if (doc.latitude && doc.longitude && doc.objectType == 'attachment' && doc.elementId) {
                emit(doc.name, {_id: doc._id, _rev: doc._rev, type: doc.type, name: doc.name, latitude: doc.latitude, longitude: doc.longitude});
            }
        }

        db.query(map, {include_docs: true}, function (err, response) {
            var rows = _.filter(response.rows, function (attachment) {
                return attachment.doc.latitude == latitude && attachment.doc.longitude == longitude && attachment.doc.elementId == elementId;
            });

            if (!_.isEmpty(rows)) {
                var list = '<h4>Attachments</h4><ul style="list-style-type: disc; padding-left: 20px;">';

                _.each(rows, function (row) {
                    list += '<li>' + row.key + '<a onclick="deleteAttachment(\'' + row.doc._id.toString() + '\', \'' + row.doc._rev.toString() + '\')" style=\"cursor: pointer; margin-left: 10px;\">Delete</a></li>'
                });

                list += '</ul>';

                $('#' + rows[0].doc.elementId + ' h4').before(list);
            }
        });
    },
    deleteAttachment = function (docId, docRev) {
        db.remove(docId, docRev, function (err, response) {
            alert('Attachment deleted!');
        });
    };

require([
    "esri/map",
    "esri/toolbars/draw",
    "esri/geometry/Point",
    "esri/dijit/Popup",
    "esri/graphic",
    "esri/symbols/SimpleMarkerSymbol",
    "esri/symbols/SimpleLineSymbol",
    "esri/symbols/SimpleFillSymbol",
    "esri/layers/FeatureLayer",
    "esri/config",
    "esri/tasks/GeometryService",
    "esri/Color",
    "dojo/dom-construct",
    "dojo/parser",
    "dijit/registry",
    "dojo/dom",
    "dijit/layout/BorderContainer",
    "dijit/layout/ContentPane",
    "dijit/form/Button",
    "dijit/WidgetSet",
    "dojo/domReady!"
], function (Map, Draw, Point, Popup, Graphic, SimpleMarkerSymbol, SimpleLineSymbol, SimpleFillSymbol, FeatureLayer, esriConfig, GeometryService, Color, domConstruct, parser, registry, dom) {
    parser.parse();

    var popupOptions = {
        markerSymbol: new SimpleMarkerSymbol("circle", 32, null,
            new Color([0, 0, 0, 0.25])),
        marginLeft: "20",
        marginTop: "20"
    };
    var popup = new Popup(popupOptions, domConstruct.create("div"));

    map = new Map("map", {
        basemap: "streets",
        center: [-122.427, 37.769],
        zoom: 17,
        infoWindow: popup
    });
    map.on("load", initMap);

    registry.forEach(function (d) {
        if (d.declaredClass === "dijit.form.Button") {
            d.on("click", activateTool);
        }
    });

    function activateTool() {
        var tool = this.label.toUpperCase().replace(/ /g, "_");
        toolbar.activate(Draw[tool]);
        map.hideZoomSlider();
    }

    function initMap() {
        toolbar = new Draw(map);
        toolbar.on("draw-end", addToMap);

        var iconPath = "M24.0,2.199C11.9595,2.199,2.199,11.9595,2.199,24.0c0.0,12.0405,9.7605,21.801,21.801,21.801c12.0405,0.0,21.801-9.7605,21.801-21.801C45.801,11.9595,36.0405,2.199,24.0,2.199zM31.0935,11.0625c1.401,0.0,2.532,2.2245,2.532,4.968S32.4915,21.0,31.0935,21.0c-1.398,0.0-2.532-2.2245-2.532-4.968S29.697,11.0625,31.0935,11.0625zM16.656,11.0625c1.398,0.0,2.532,2.2245,2.532,4.968S18.0555,21.0,16.656,21.0s-2.532-2.2245-2.532-4.968S15.258,11.0625,16.656,11.0625zM24.0315,39.0c-4.3095,0.0-8.3445-2.6355-11.8185-7.2165c3.5955,2.346,7.5315,3.654,11.661,3.654c4.3845,0.0,8.5515-1.47,12.3225-4.101C32.649,36.198,28.485,39.0,24.0315,39.0z";
        var initColor = "#ce641d";

        var attributes = {
            coordinates: [-122.427, 37.769],
            elementId: 'id_1',
            address: 'Test',
            score: 33
        };

        var graphic = new Graphic(new Point([-122.427, 37.769]), createSymbol(iconPath, initColor), attributes);

        var attributes1 = {
            coordinates: [-122.428, 37.770],
            elementId: 'id_2',
            address: 'Test1',
            score: 34
        };

        var graphic1 = new Graphic(new Point([-122.428, 37.770]), createSymbol(iconPath, initColor), attributes1);

        var layerDefinition = {
            "geometryType": "esriGeometryPolygon",
            "fields": [
                {
                    "name": "BUFF_DIST",
                    "type": "esriFieldTypeInteger",
                    "alias": "Buffer Distance"
                }
            ]
        };

        var featureCollection = {
            layerDefinition: layerDefinition,
            featureSet: null
        };

        var featureLayer = new FeatureLayer(featureCollection, {
            mode: FeatureLayer.MODE_ONDEMAND
        });

        featureLayer.add(graphic);
        featureLayer.add(graphic1);

        featureLayer.on("click", function (evt) {
            var latitude = evt.mapPoint.getLatitude().toFixed(4);
            var longitude = evt.mapPoint.getLongitude().toFixed(4);

            map.infoWindow.setTitle("Object information");
            map.infoWindow.setContent(
                    "<div id=" + evt.graphic.attributes.elementId + "> \
                    <div style=\"padding: 5px; border: 1px solid black; margin-top: 10px;\">lat/lon : " + latitude + ", " + longitude + "</div> \
                    <div style=\"padding: 5px; border: 1px solid black; margin-top: 10px;\"> \
                    <h4 style=\"margin-left: 5px;\">Add file</h4> \
                    <form onsubmit=\"addFile(this, " + latitude + ", " + longitude + "); return false\"> \
                    <input type=\"file\" id=\"te1\"/> \
                    <input type=\"submit\" value=\"Upload\" /> \
                    </form> \
                    </div> \
                    </div>"
            );

            selectAttachments(latitude, longitude, evt.graphic.attributes.elementId);

            map.infoWindow.show(evt.mapPoint, map.getInfoWindowAnchor(evt.screenPoint));
        });

        map.addLayer(featureLayer);
    }

    function createSymbol(path, color) {
        var markerSymbol = new SimpleMarkerSymbol();
        markerSymbol.setPath(path);
        markerSymbol.setColor(new dojo.Color(color));
        markerSymbol.setOutline(null);

        return markerSymbol;
    }

    function addToMap(evt) {
        var symbol;
        toolbar.deactivate();
        map.showZoomSlider();

        switch (evt.geometry.type) {
            case "point":
            case "multipoint":
                symbol = new SimpleMarkerSymbol();
                break;
            case "polyline":
                symbol = new SimpleLineSymbol();
                break;
            default:
                symbol = new SimpleFillSymbol();
                break;
        }
        var graphic = new Graphic(evt.geometry, symbol);

        map.graphics.add(graphic);
    }
});

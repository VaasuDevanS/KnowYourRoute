
/**
* Anslysis on the accidents for the generated route(s)
* @author VaasuDevan Srinivasan, University Of New Brunswick
* @date: 01/03/19
*/

dojo.require("esri.tasks.geometry");
require([
  "esri/urlUtils",
  "esri/map",
  "esri/graphic",
  "esri/geometry/Point",
  "esri/SpatialReference",
  "esri/tasks/RouteTask",
  "esri/tasks/RouteParameters",
  "esri/tasks/FeatureSet",
  "esri/symbols/SimpleMarkerSymbol",
  "esri/symbols/SimpleLineSymbol",
  "esri/dijit/HomeButton",
  "esri/dijit/BasemapGallery",
  "esri/Color",
  "esri/toolbars/draw",
  "dojo/on",
  "dojo/dom",
  "esri/tasks/locator",
  "esri/geometry/webMercatorUtils",
  "esri/dijit/BasemapToggle",
  "esri/layers/FeatureLayer",
  "dijit/registry",
  "esri/tasks/query",
  "esri/renderers/SimpleRenderer",
  "esri/symbols/Symbol",
  "esri/symbols/SimpleFillSymbol",
  "dojo/domReady!",
  "dijit/layout/BorderContainer",
  "dijit/layout/ContentPane",
  "dijit/layout/AccordionContainer",
  "dijit/form/HorizontalSlider",
  "dijit/form/HorizontalRuleLabels"
], function (
   urlUtils,
   Map,
   Graphic,
   Point,
   SpatialReference,
   RouteTask,
   RouteParameters,
   FeatureSet,
   SimpleMarkerSymbol,
   SimpleLineSymbol,
   HomeButton,
   BasemapGallery,
   Color,
   Draw,
   on,
   dom,
   Locator,
   webMercatorUtils,
   BasemapToggle,
   FeatureLayer,
   registry,
   Query
) {

    var map, home, locator, basemapGallery, routeTask, routeParams, home;
    var stopSymbol, routeSymbol, lastStop, tb;
    routes = [];
    var stops = 1;
    stopLocs = [];

    function BarChart1(divId, lbl, srs, axY, axX){
        new Chartist.Bar(divId, {
          labels: lbl,
          series: srs
        }, {
           distributeSeries: true,
           axisY: { offset: axY },
           axisX: { offset: axX }
          });
    }

    function PieChart(divId, srs, lbl) {
        new Chartist.Pie(divId, {
          series: srs,
          labels: lbl
        }, {
           donut: true,
           donutWidth: 20,
           donutSolid: true,
           showLabel: true
          });
    }

    function BarChart2(divId, lbl, srs, axX, axY) {
        new Chartist.Bar(divId, {
          labels: lbl,
          series: srs
        }, {
           axisX: { position: 'start', offset: axX },
           axisY: { position: 'end', offset: axY }
          });
    }

    BarChart1('.ct-chart4',
              [2007, 2008, 2009, 2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017],
              [893, 967, 971, 776, 869, 806, 850, 815, 878, 897, 578],
              30, 70
    )

    PieChart('.ct-chart5', [7206, 2094], ["Day- 7206", "Night- 2094"])

    BarChart2('.ct-chart6',
              ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
              [[823, 1244, 1409, 1414, 1538, 1703, 1165]],
              10, 35
          )

    urlUtils.addProxyRule({
      urlPrefix: "route.arcgis.com",
      proxyUrl: "/sproxy/"
    });

    map = new Map("map", {
      basemap: "hybrid",
      center: [-66.52, 45.9999],
      zoom: 12
    });

    basemapGallery = new BasemapGallery({
      showArcGISBasemaps: true,
      map: map
    }, "basemapGallery");
    basemapGallery.startup();

    var outline = new FeatureLayer("https://services1.arcgis.com/56dETZIzFXStwLka/arcgis/rest/services/City_Boundary/FeatureServer/0");
    map.addLayers([outline]);

    esri.config.defaults.io.proxyUrl = "/proxy/";
    esri.config.defaults.io.alwaysUseProxy = false;

    gsvc = new esri.tasks.GeometryService("https://utility.arcgisonline.com/ArcGIS/rest/services/Geometry/GeometryServer")
    var queryTask = new esri.tasks.QueryTask("https://services1.arcgis.com/56dETZIzFXStwLka/arcgis/rest/services/Traffic_Accidents_102100/FeatureServer/0")

    home = new HomeButton({
      map: map
    }, "HomeButton");
    home.startup();

    map.on("load", function () {
      //after map loads, connect to listen to mouse move & drag events
      map.on("mouse-move", showCoordinates);
      map.on("mouse-drag", showCoordinates);
    });

    $('#chooseAOI').on('click', function() {
      map.disableMapNavigation();
      initToolbar();
    });

    $('#ClearAOI').on('click', function() {
      showStatistics()
    });

    routeResults = [];

    function initToolbar() {
      tb = new Draw(map);
      tb.activate("extent");
      tb.on("draw-end", getExtent);
    }

    function getExtent(evt) {

        var query = new Query();
        query.geometry = evt.geometry;
        query.returnGeometry = false;
        query.spatialRelationship = esri.tasks.Query.SPATIAL_REL_CONTAINS;
        query.outFields = ["*"];
        queryTask.execute(query, updateStat);

        function updateStat(results) {

          year = {}; day_nig = {}; acc_type = {}; dayOfWeek = {}; sev = {1:0, 2:0, 3:0};
          resFea = results.features;
          AOIresults = []

          for (i = 0; i < resFea.length; i++) {
            year[resFea[i].attributes.Year_] = 0;
            day_nig[resFea[i].attributes.Day_Night] = 0;
            acc_type[resFea[i].attributes.Type] = [0, 0, 0];
            dayOfWeek[resFea[i].attributes.DayOfWeek] = 0;
            sev[resFea[i].attributes.Severity] = 0;
          }

          for (i = 0; i < resFea.length; i++) {
            year[resFea[i].attributes.Year_] += 1;
            day_nig[resFea[i].attributes.Day_Night] += 1;
            dayOfWeek[resFea[i].attributes.DayOfWeek] += 1;
            sev[resFea[i].attributes.Severity] += 1;
            mon = resFea[i].attributes.Month_
            if (mon>=1 && mon<=4)
              acc_type[resFea[i].attributes.Type][0] += 1;
            else if (mon>=5 && mon<=8)
              acc_type[resFea[i].attributes.Type][1] += 1
            else
              acc_type[resFea[i].attributes.Type][2] += 1;
          }

          delete dayOfWeek[" "];
          dKeys = ["Sun", "Mon", "Tue", "Wed", "Thurs", "Fri", "Sat"];
          dValues = []
          for(var i in dKeys){
              dValues.push(dayOfWeek[dKeys[i]])
          }

          AOIresults.push([results.features.length, sev[1], sev[2], sev[3]]);
          AOIresults.push([Object.keys(year), Object.values(year)]);
          AOIresults.push([Object.values(day_nig), ["Day- " + day_nig.D, "Night- " + day_nig.N]])
          AOIresults.push([dKeys, [dValues]])
          AOIresults.push([acc_type])
          showStatistics(AOIresults);

          map.setExtent(evt.geometry);
          tb.deactivate();
          map.enableMapNavigation();
        }
    }

    function showCoordinates(evt) {
      //the map is in web mercator but display coordinates in geographic (lat, long)
      var mp = webMercatorUtils.webMercatorToGeographic(evt.mapPoint);
      dom.byId("Coord_info").innerHTML = mp.x.toFixed(3) + ", " + mp.y.toFixed(3);
    }

    $('#NavButton').on('click', function() {
      var downtown = new Point(-66.647, 45.960, new SpatialReference({ wkid: 4326 }));
      map.centerAndZoom(downtown, 16);
    });

    map.on("click", addStop);
    on(dom.byId("clearAll"), "click", clearAll);

    routeTask = new RouteTask("https://utility.arcgis.com/usrsvcs/appservices/UrSqiPqnCnAKPZTb/rest/services/World/Route/NAServer/Route_World");
    locator = new Locator("https://utility.arcgis.com/usrsvcs/appservices/Ooyp9uhT7sTs88uJ/rest/services/World/GeocodeServer/reverseGeocode");

    //setup the route parameters
    routeParams = new RouteParameters();
    routeParams.stops = new FeatureSet();
    routeParams.returnDirections = true;
    routeParams.returnStops = true;
    routeParams.outSpatialReference = { "wkid": 102100 };
    routeTask.on("solve-complete", showRoute);

    // Define the symbology used to display the route and stops
    var stopLineSymbol = new SimpleLineSymbol();
    stopLineSymbol.setColor("orange");
    var stopSymbol = new SimpleMarkerSymbol();
    stopSymbol.setSize("25");
    stopSymbol.setColor("black");
    stopSymbol.setOutline(stopLineSymbol);
    stopSymbol.setPath("M16,3.5c-4.142,0-7.5,3.358-7.5,7.5c0,4.143,7.5,18.121,7.5,18.121S23.5,15.143,23.5,11C23.5,6.858,20.143,3.5,16,3.5z M16,14.584c-1.979,0-3.584-1.604-3.584-3.584S14.021,7.416,16,7.416S19.584,9.021,19.584,11S17.979,14.584,16,14.584z");
    stopSymbol.outline.setWidth(4);

    routeSymbol = new SimpleLineSymbol().setColor(new dojo.Color([0, 0, 255, 0.5])).setWidth(5);
    //Adds a graphic when the user clicks the map. If 2 or more points exist, route is solved.

    function addStop(evt) {
      var stop = map.graphics.add(new Graphic(evt.mapPoint, stopSymbol));
      routeParams.stops.features.push(stop);
      locator.locationToAddress(webMercatorUtils.webMercatorToGeographic(evt.mapPoint), 100);
      locator.on("location-to-address-complete", function (evt) {
        name = evt.address.address.Address;
        loc = evt.address.location.x + "," + evt.address.location.y;
        if (name == '') {
          name = "Geocoding error";
        }
        if (!stopLocs.includes(loc)) {
          $("#stops").append("Location" + stops + ": " + name + "<br>");
          stops += 1;
          stopLocs.push(loc);
        }
        stop.setInfoTemplate(new esri.InfoTemplate("Stop", evt.address.address.LongLabel));
      });
      if (routeParams.stops.features.length >= 2) {
        routeTask.solve(routeParams);
      }
    }

    function showRoute(evt) {
      document.getElementById("statsResultDiv").style.display = "block";
      document.getElementById("statsDiv").style.display = "none";
      for (var i = 0; i < routes.length; i++) {
        map.graphics.remove(routes[i]);
      }
      dirs = evt.result.routeResults[0].directions.features;
      $('#directions').html("<b>Directions:</b><br>")
      for (var i = 0; i < dirs.length; i++) {
        $('#directions').append((i + 1) + ".) " + dirs[i].attributes.text + "<br>")
      }
      $("#info").html(
        "Length: " + evt.result.routeResults[0].route.attributes.Total_Kilometers.toFixed(3) +
        " kms<br>Travel time: " + evt.result.routeResults[0].route.attributes.Total_TravelTime.toFixed(3) +
        " mins"
      )
      routes.push(map.graphics.add(evt.result.routeResults[0].route.setInfoTemplate(esri.InfoTemplate("Route", "No. of stops: ${StopCount}")).setSymbol(routeSymbol)));

      var params = new esri.tasks.BufferParameters();
      params.geometries = [evt.result.routeResults[0].route.geometry];
      params.distances = [20];
      params.unit = esri.tasks.GeometryService.UNIT_METER;
      params.outSpatialReference = map.spatialReference;
      gsvc.buffer(params, showBuffer);
      function showBuffer(bufferedGeometries) {
        var symbol = new esri.symbol.SimpleFillSymbol(
          esri.symbol.SimpleFillSymbol.STYLE_SOLID,
          new SimpleLineSymbol(
            SimpleLineSymbol.STYLE_SOLID,
            new Color([255, 0, 0, 0.65]), 2
          ),
          new Color([255, 0, 0, 0.35])
        );

        dojo.forEach(bufferedGeometries, function (geometry) {

          var graphic = new esri.Graphic(geometry, symbol);
          var query = new Query();
          query.geometry = geometry;
          query.returnGeometry = true;
          query.spatialRelationship = esri.tasks.Query.SPATIAL_REL_CONTAINS;
          query.outFields = ["*"];
          queryTask.execute(query, showAccidents);

          function showAccidents(results) {
            dojo.forEach(results.features, function (f) {

              // Adding info popup to points
              info = new esri.InfoTemplate("Severity Level: ${Severity}",
                "Took place on: ${Year_}/${Month_}/${Day_} <br />" +
                "Type: ${Type}<br />" +
                "Injured: ${NoInjured}<br />" +
                "Killed: ${NoKilled}<br />" +
                "Day or Night: ${Day_Night}<br />" +
                "${At_Near} ${Street}"
              );

              // Different symbology for points based on severity
              switch (f.attributes.Severity) {
                case 1: highlightSymbol = new esri.symbol.SimpleMarkerSymbol().setColor(new dojo.Color([0, 255, 0])).setSize(10); break; //green
                case 2: highlightSymbol = new esri.symbol.SimpleMarkerSymbol().setColor(new dojo.Color([0, 0, 255])).setSize(10); break; //blue
                case 3: highlightSymbol = new esri.symbol.SimpleMarkerSymbol().setColor(new dojo.Color([255, 0, 0])).setSize(5); break; //red
              }
              f.setInfoTemplate(info);
              dojo.connect(map.graphics, "onMouseMove", function (evt) {
                var g = evt.graphic;
                map.infoWindow.setContent(g.getContent());
                map.infoWindow.setTitle(g.getTitle());
                map.infoWindow.show(evt.screenPoint, map.getInfoWindowAnchor(evt.screenPoint));
              });
              dojo.connect(map.graphics, "onMouseOut", function () { map.infoWindow.hide(); });
              map.graphics.add(f.setSymbol(highlightSymbol));
            });

            year = {}; day_nig = {}; acc_type = {}; dayOfWeek = {}; sev = {3:0};
            resFea = results.features;

            for (i = 0; i < resFea.length; i++) {
              year[resFea[i].attributes.Year_] = 0;
              day_nig[resFea[i].attributes.Day_Night] = 0;
              acc_type[resFea[i].attributes.Type] = [0, 0, 0];
              dayOfWeek[resFea[i].attributes.DayOfWeek] = 0;
              sev[resFea[i].attributes.Severity] = 0;
            }

            for (i = 0; i < resFea.length; i++) {
              year[resFea[i].attributes.Year_] += 1;
              day_nig[resFea[i].attributes.Day_Night] += 1;
              dayOfWeek[resFea[i].attributes.DayOfWeek] += 1;
              sev[resFea[i].attributes.Severity] += 1;
              mon = resFea[i].attributes.Month_
              if (mon>=1 && mon<=4)
                acc_type[resFea[i].attributes.Type][0] += 1;
              else if (mon>=5 && mon<=8)
                acc_type[resFea[i].attributes.Type][1] += 1
              else
                acc_type[resFea[i].attributes.Type][2] += 1;
            }

            delete dayOfWeek[" "];
            dKeys = ["Sun", "Mon", "Tue", "Wed", "Thurs", "Fri", "Sat"];
            dValues = []
            for(var i in dKeys){
                dValues.push(dayOfWeek[dKeys[i]])
            }

            routeResults.length = 0;
            routeResults.push([results.features.length, sev[1], sev[2], sev[3]]);
            routeResults.push([Object.keys(year), Object.values(year)]);
            routeResults.push([Object.values(day_nig), ["Day- " + day_nig.D, "Night- " + day_nig.N]])
            routeResults.push([dKeys, [dValues]])
            routeResults.push([acc_type])

            showStatistics();
            }
        });
      }
    }

    function showStatistics(R=routeResults) {

        $("#statistics").html("<b>No. of Accidents:</b> " + R[0][0] +
          "<br><b>Severity-Levels</b> (high is deadly)<br>  1: " + R[0][1] + "   |    2: " + R[0][2] + "   |    3: " + R[0][3]
        );

        BarChart1('.ct-chart1', R[1][0], R[1][1], 15, 27)
        PieChart('.ct-chart2', R[2][0], R[2][1])
        BarChart2('.ct-chart3', R[3][0], R[3][1], 10, 40)

        $("#reason").html("");
        for (k in R[4][0]) {
          $("#reason").append(k + ": (" + R[4][0][k][0] + ", " + R[4][0][k][1] + ", " + R[4][0][k][2] + ")<br>")
        }
    }

    function clearAll() {
      document.getElementById("statsResultDiv").style.display = "none";
      document.getElementById("statsDiv").style.display = "block";
      map.graphics.clear();
      stops = 1;
      routes = [];
      stopLocs = [];
      routeResults.length = 0;
      routeParams.stops.features = [];
      $("#stops").html("<b>Stops:</b><br>");
      $("#info").html("<b>Info:</b>");
      $("#directions").html("<b>Directions:</b>");
      $("#statistics").html("<b> Statistics: </b>")
      $("#accidents").html('<div class="ct-chart1 ct-golden-section"></div><br>');
      $("#daynight").html('<div class="ct-chart2 ct-golden-section"></div><br>');
      $("#day").html('<div class="ct-chart3 ct-golden-section"></div><br>');
      $("#reason").html("");
    }
  });

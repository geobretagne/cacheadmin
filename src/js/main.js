var mapPanels, maptabs, projections, formSelectedCarte, styleMap, maps;

Ext.onReady(function () {
    /* parametrage de la carte */
    Proj4js.defs["EPSG:3857"] = "+proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0 +k=1.0 +units=m +nadgrids=@null +no_defs";
    Proj4js.defs["EPSG:2154"] = "+proj=lcc +lat_1=49 +lat_2=44 +lat_0=46.5 +lon_0=3 +x_0=700000 +y_0=6600000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs";
    Proj4js.defs["EPSG:4326"] = "+proj=longlat +ellps=WGS84 +datum=WGS84 +no_defs";
    Proj4js.defs["EPSG:3948"] = "+proj=lcc +lat_1=47.25 +lat_2=48.75 +lat_0=48 +lon_0=3 +x_0=1700000 +y_0=7200000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs";

    Ext.QuickTips.init();
    var prox = 'proxy/proxy.cgi?url=';
    OpenLayers.ProxyHost = 'proxy/proxyauth.cgi?url=';   

    projections = [
        ['EPSG:2154', '2154', new OpenLayers.Bounds(-357823.2365, 6037008.6939, 2146865.3059, 8541697.2363)],
        ['EPSG:3948', '3948', new OpenLayers.Bounds(1092603.2214877354, 7089742.351096519, 2100529.4892829345, 7341541.809873209)],
        ['EPSG:4326', '4326', new OpenLayers.Bounds(-180, -90, 180, 90)],
        ['EPSG:3857', '3857', new OpenLayers.Bounds(-20037508.34, -20037508.34, 20037508.34, 20037508.34)] 
    ];
    
    function getprojectionID (code) {
        for (var i=0;i < projections.length;i++) {
            if (projections[i][1] === code) {
                return i;
            }
        }
    };
    maps= [];
    mapPanels = [];
    
    styleMap = new OpenLayers.StyleMap({
        "default": new OpenLayers.Style({            
            strokeColor: "#ff0000",
            fillOpacity: 0,
            strokeWidth: 2

        }),
        "select": new OpenLayers.Style({
            fillColor: "#66ccff",
            fillOpacity: 0,
            strokeColor: "#3399ff"
        })
    });    
   
    
    var createTbarItems = function (m) {
        var actions = [];
        var boxctrl = new OpenLayers.Control();
        OpenLayers.Util.extend(boxctrl, {
            draw: function () {            
                this.box = new OpenLayers.Handler.Box(boxctrl, {
                    "done": this.notice
                });            
                this.box.activate();
            },
            notice: function (bounds) {                
                var boxlayer = this.map.getLayersByName('boxlayer')[0];
                boxlayer.removeAllFeatures();
                var ll = this.map.getLonLatFromPixel(new OpenLayers.Pixel(bounds.left, bounds.bottom));
                var ur = this.map.getLonLatFromPixel(new OpenLayers.Pixel(bounds.right, bounds.top));
                var bounds2 = new OpenLayers.Bounds();
                bounds2.extend(new OpenLayers.LonLat(ll.lon.toFixed(4), ll.lat.toFixed(4)));
                bounds2.extend(new OpenLayers.LonLat(ur.lon.toFixed(4), ur.lat.toFixed(4)));
                var feature = new OpenLayers.Feature.Vector(bounds2.toGeometry());
                feature.bounds = bounds2;
                boxlayer.addFeatures(feature);
                updateExtent(boxlayer);
            }
        });
        
        actions.push(btool = new GeoExt.Action({
            iconCls: "pan",
            map: m,
            //pressed: true,
            toggleGroup: "tools",
            tooltip: "Glisser - deplacer la carte",
            control: new OpenLayers.Control.Navigation()
        }));
        actions.push(new GeoExt.Action({
            iconCls: "zoomin",
            map: m,
            toggleGroup: "tools",            
            tooltip: "Zoom sur l'emprise",
            control: new OpenLayers.Control.ZoomBox({})
        }));
        actions.push(new GeoExt.Action({
            iconCls: "red_square",
            pressed: true,
            map: m,
            toggleGroup: "tools",            
            tooltip: "Tracer extent",
            control: boxctrl
        }));
        
        return actions;
    };
    
    for (var i=0;i < projections.length;i++) {
        var m = new OpenLayers.Map({
            projection: new OpenLayers.Projection(projections[i][0]),            
            units: 'm',
            maxExtent: projections[i][2],
            numZoomLevels: 21,
            maxResolution: 156543.0339        
        });
        var t = new OpenLayers.Layer.TMS(
            "osm:google",
            "http://osm.geobretagne.fr/gwc01/service/tms/", {
                layername: "osm:map@"+projections[i][0]+"@png",
                type: "png",
                isBaseLayer: true
            }
        );
         var l = new OpenLayers.Layer.Vector("boxlayer", {
            styleMap: styleMap
        });
        m.addLayers([t,l]);   
        maps.push(m);
        
         // create map panel    
        var mPanel = new GeoExt.MapPanel({
            title: projections[i][1],        
            map: m,        
            center: new OpenLayers.LonLat(-2.8, 48).transform(new OpenLayers.Projection("EPSG:4326"), new OpenLayers.Projection(projections[i][0])),
            zoom: 8,
            disabled:true,           
            tbar: createTbarItems(m)
        });
        mapPanels.push(mPanel);
    } 
    
    maptabs = new Ext.TabPanel({
            activeTab: 0,
            title: "Cartes",
            region: "center",
            autoHeight: false,                       
            items: mapPanels
    });
   
    var storeservices = new Ext.data.Store({
        url: 'tms.xml',
        autoLoad: true,
        reader: new Ext.data.XmlReader({
            record: 'service',
            fields: ['label', 'url', 'rest']
        })
    });
    
    var cartes = [];

    var storecartes = new Ext.data.Store({
        url: prox,
        autoLoad: false,
        reader: new Ext.data.XmlReader({
            record: 'TileMap',
            fields: [{
                name: 'title',
                mapping: '@title'
            }, {
                name: 'srs',
                mapping: '@srs'
            }, {
                name: 'href',
                mapping: '@href'
            }]
        }),
        listeners: {
        'load' :  function(store,records,options) {
            cartes = [];
            for (var i = 0; i < records.length; i++) {
                var r = records[i].data;
                var title = r.title;
                var srs = r.srs;
                var format = r.href.split('@')[2];
                var name = decodeURIComponent(r.href.split('@')[0]).split('/').reverse()[0];
                var label = name + ' | ' + srs + ' | ' +format;
                var rest = r.href.substring(0,r.href.search('service/tms'))+ 'rest/seed/';
                var url = r.href.substring(0,r.href.search('service/tms'))+ 'service/tms/';
                var idx = r.href;
                cartes.push([title, srs, format, name, label, rest, url, idx]);
            }
            console.log("data",cartes);
            storecartes2.loadData(cartes);
            cartescb.setDisabled(false);
        }
    }
    });
    
    var storecartes2 = new Ext.data.SimpleStore({
        fields: ['title', 'srs', 'format', 'name', 'label', 'rest', 'url', 'idx'],
        data: cartes,
        autoLoad: false
    });



   

    var formExtent = new GeoExt.form.FormPanel({
        title: "Zone sélectionnée :",
        hidden:true,
        bodyStyle: 'padding: 10px',
        items: [
        {
            xtype: "textfield",
            name: "projection",
            disabled:true,
            fieldLabel: "projection"
        },
        {
            xtype: "textfield",
            name: "xmin",
            disabled:true,
            fieldLabel: "xmin"
        }, {
            xtype: "textfield",
            name: "ymin",
            disabled:true,
            fieldLabel: "ymin"
        }, {
            xtype: "textfield",
            name: "xmax",
            disabled:true,
            fieldLabel: "xmax"
        }, {
            xtype: "textfield",
            name: "ymax",
            disabled:true,
            fieldLabel: "ymax"
        }, {
            xtype: "textfield",
            name: "level",
            disabled:true,
            fieldLabel: "zoom level"
        }]
    });    
    
    var cartescb = new Ext.form.ComboBox({        
        fieldLabel: "cartes",
        name: 'listecartes',
        store: storecartes2,
        displayField: "label",
        listWidth: 300,
        width: 250,
        valueField: "idx",
        typeAhead: true,
        mode: 'local',
        triggerAction: 'all',
        emptyText: 'Choisir une carte...',
        selectOnFocus: true,
        allowBlank: false,
        listeners: {
            'select': function (combo, record, index) {
                var id =  record.data.srs.split(':')[1];
                if (record.data.srs != formExtent.getForm().findField('projection').getValue()) {                
                    btnexec.setDisabled(true);
                    formExtent.getForm().reset();                    
                    var tab = maptabs.find( 'title', id )[0];
                    maptabs.getActiveTab().setDisabled(true);
                    tab.setDisabled(false);
                    maptabs.setActiveTab( tab );
                }
                var m = maps[getprojectionID(id)];
                var l = m.getLayersByClass('OpenLayers.Layer.TMS')[0];
                l.destroy();
                l = new OpenLayers.Layer.TMS(
                    record.data.name,
                    record.data.url, {
                        layername: record.data.name + '@' + record.data.srs+ '@' + record.data.format,
                        projection: record.data.srs,
                        type: record.data.format
                    }, {
                        isBaseLayer: true
                    }
                );
                m.addLayers([l]);                
            }
        }
    });    
    cartescb.setDisabled(true);
    
    var servicescb = new Ext.form.ComboBox({
        fieldLabel: "services",
        name: 'listeservices',
        store: storeservices,
        displayField: "label",
        valueField: "url",        
        typeAhead: true,
        mode: 'local',
        triggerAction: 'all',
        emptyText: 'Choisir un service...',
        selectOnFocus: true,
        allowBlank: false,
        listeners: {
            //scope: formSelectedCarte,
            'select': function (combo, record, index) {               
                cartescb.setDisabled(true);
                cartescb.setValue("");
                btnexec.setDisabled(true);
                tmsurl = record.data.url;
                storecartes.proxy.conn.url = prox + tmsurl;
                storecartes.reload();
            }
        }
    });
    
    var btnexec = new Ext.Button({
        text: 'Régénérer le cache',                
        disabled: true, 
        handler: function () {
            submitform();
        }
    });    
       

    formSelectedCarte = new GeoExt.form.FormPanel({
        title: "Carte selectionnee :",        
        bodyStyle: 'padding: 10px',        
        items: [servicescb, cartescb],
        buttons: [btnexec]
    });

    var formAdmin = new GeoExt.form.FormPanel({        
        title: "Compte geowebcache :",
        bodyStyle: 'padding: 10px',
        items: [{
                xtype: "textfield",
                name: "user",
                fieldLabel: "login",
                allowBlank: false
            }, {
                xtype: "textfield",
                name: "pwd",
                inputType: 'password',
                fieldLabel: "mot de passe",
                allowBlank: false
            }]
    });   
    
    var panExtent = new Ext.Panel({
        region: "west",
        items: [formSelectedCarte, formAdmin, formExtent],
        width: 400,
        minWidth: 175,
        maxWidth: 450,
        collapsible: true,
        animCollapse: true,
        split: true
    });

    var mainPanel = new Ext.Viewport({
        renderTo: "mainpanel",
        layout: "border",
        items: [panExtent, maptabs]
    });

    function updateExtent(boxlayer) {
        var form = formExtent.getForm();        
        if (boxlayer.features.length == 1) {
            var extent = boxlayer.features[0].bounds;
            form.findField('projection').setValue(boxlayer.projection.projCode);
            form.findField('xmin').setValue(extent.toArray()[0]);
            form.findField('ymin').setValue(extent.toArray()[1]);
            form.findField('xmax').setValue(extent.toArray()[2]);
            form.findField('ymax').setValue(extent.toArray()[3]);
            form.findField('level').setValue(boxlayer.map.getZoom()); 
            btnexec.setDisabled(false);
        }
    };

    
   

    function submitform() {        
        var v = cartescb.getValue();
        var record = cartescb.findRecord(cartescb.valueField, v);        
        var frm1 = formExtent.getForm();
        var id =  record.data.srs.split(':')[1];
        var m = maps[getprojectionID(id)];
       
        var myextent = '<bounds>' +
                '<coords>' +
                '<double>' + frm1.findField('xmin').getValue() + '</double>' +
                '<double>' + frm1.findField('ymin').getValue() + '</double>' +
                '<double>' + frm1.findField('xmax').getValue() + '</double>' +
                '<double>' + frm1.findField('ymax').getValue() + '</double>' +
                '</coords>' +
                '</bounds>';

        
        var seedrequest = '<seedRequest>' +
            '<name>' + record.data.name + '</name>' +
            myextent +
            '<gridSetId>' + record.data.srs + '</gridSetId>' +
            '<zoomStart>' + m.getZoom() + '</zoomStart>' +
            '<zoomStop>' + m.getZoom() + '</zoomStop>' +
            '<format>image/' + record.data.format + '</format>' +
            '<type>truncate</type>' +
            '<threadCount>1</threadCount>' +
            '</seedRequest>';     
            
        console.log("request",seedrequest);
        
        var request = OpenLayers.Request.issue({
            method: 'POST',
            headers: {
                "Content-Type": "text/xml"
            },
            url: record.data.rest + record.data.name +
                '.xml@' + formAdmin.getForm().findField('user').getValue() +
                '@' + formAdmin.getForm().findField('pwd').getValue(),
            data: seedrequest,
            failure: requestFailure,
            success: requestSuccess            
        });
    }

    function requestSuccess(response) {
        if (response.responseText.length == 1) {
            gettasks();
        } else {
            alert('zut :' + response.responseText);
        }

    }

    function requestFailure(response) {
        alert(response.responseText);
    }

   

    
    //hack geoext
    maps[0].zoomOut();
    maps[0].zoomIn();
});